# ML3K System Audit — March 2026

## Deliverable 1 — Executive Summary

ML3K is a monolithic single-file web application (~12,500 lines of HTML/CSS/JS) managing ground transport logistics for FIFA World Cup 2026 across three modules: Load Plan (LP), Last Mile (LM), and Vision 2026 (V26). It uses Supabase for persistence and operates with ~40 global mutable state variables, 17+ Supabase keys, and two independent planning engines.

**Current State:** The app is functional and actively used in production. The single-file architecture enables rapid development and zero-build deployment. However, the intertwining of business logic, state management, rendering, and persistence creates fragility at scale.

**Key Findings:**
- **8 CRITICAL issues** across persistence, rendering, and export systems
- **12 HIGH issues** in engine logic, state management, and rendering
- **15+ MEDIUM issues** in determinism, validation, and maintainability
- The most dangerous pattern: **business state mutation inside render functions** (stock waterfall in `LP_renderPlan`)
- Second most dangerous: **inconsistent save/load cycles** where fields can be saved but not loaded (or vice versa)
- The undo system captures 40+ fields but **omits NOM and RW** (core data)

**Risk Level:** HIGH for data integrity, MEDIUM for availability.

**Recommendation:** Stabilize before adding features. Address the 8 critical issues within the next sprint. The architecture does not need a rewrite — it needs guardrails.

---

## Deliverable 2 — System Reconstruction

### Module Map

| Module | Responsibility | Key Functions | Risk Level |
|--------|---------------|---------------|------------|
| **Boot/Init** | Load Supabase, authenticate, restore state | `autoLogin()`, `enterApp()`, `loadBoth()` | HIGH — 13 parallel loads with `.catch(()=>{})` |
| **LP Engine V5** | Build truck plan from demand, stock, arrivals | `LP_buildPlanV3()`, `buildOneTruck()`, `planStream()` | HIGH — complex 2-bucket architecture |
| **LP Tail Reconstruct** | Optimize last 2 trucks per (dest,date) | `_lpTailReconstruct()` | MEDIUM — exhaustive search with 500K limit |
| **LM Engine** | Build venue trucks from demand | `build()`, `numberAll()` | HIGH — multi-step with kit renaming |
| **Late Engine** | Detect late arrivals across 3 supply chain paths | `LP_renderLate()`, inline in `rMain()` | MEDIUM — computed in render |
| **Assembly Timeline** | Trace supply chain dates for assembled items | `LM_isAssembled()`, inline in `rMain()` | LOW — read-only computation |
| **State Management** | ~40 globals, source-of-truth and derived | All `LP_*`, `LM_*`, `STOCK_*` globals | CRITICAL — no state container |
| **Persistence** | Save/load to Supabase (17+ keys) | `saveSharedData()`, `LP_saveTruckState()`, `LP_saveToSupabase()` | CRITICAL — race conditions, incomplete saves |
| **Undo System** | Snapshot/restore 40+ fields | `_undoSnap()`, `UNDO_restore()` | HIGH — missing NOM/RW |
| **Rendering** | Build HTML from state | `LP_render()`, `LP_renderPlan()`, `rMain()`, `V26_render()` | CRITICAL — mutations in render |
| **Export/Backup** | Excel exports, CI, backup/restore | `LP_exportCI_ExcelJS()`, `masterBackupExport()`, `generateDailyDigest()` | HIGH — stale data, incomplete backup |
| **Reset** | 5 reset functions (system, LM hard/soft, LP hard/soft) | `doSystemReset()`, `doResetLM()`, etc. | MEDIUM — some fields missing |
| **Kit System** | Create/manage venue kits | `LM_createKit()`, `LM_injectKits()`, `numberAll()` kit renaming | HIGH — kit rename mutates NOM |
| **STP System** | Staples delivery strategy and truck building | `_stpBuildTruck()`, `LM_STP_STRATEGY` | MEDIUM |
| **HS Code Assistant** | AI-powered HS classification | `_hsAILookup()`, 3 providers | LOW — isolated subsystem |
| **UI/Navigation** | Module switching, sidebar, modals | `switchMod()`, `showM()`, various modals | LOW |

### Data Flow

```
Raw Input (Excel files, stock reports)
  → Parse & Normalize (RW, NOM, LP_STATE.materialPlan)
  → Store as Source-of-Truth (globals + Supabase)
  → Inject Derived Data (LM_injectKits, LM_injectManualDemand, bV → VN)
  → Engine Computation (LP_buildPlanV3, build, numberAll)
  → Cache Results (PLAN_CACHE, CORT_CACHE, LP_STATE.generatedPlan)
  → Render (LP_render, rMain, V26_render) ← WARNING: mutations happen here
  → Export (Excel, CI, Digest, Backup)
```

### Source-of-Truth vs Derived State

**Source-of-Truth (persisted):**
`NOM`, `RW`, `VS`, `LP_STATE.*`, `LP_dispatched`, `LP_oorTrucks`, `LP_lsrNumbers`, `LP_palletOverrides`, `LP_customsOverrides`, `LP_transitDays`, `LP_destWhsDays`, `LP_contDateOverrides`, `LP_holds`, `LP_excludeStaples`, `LP_arrivedConts`, `STOCK_SKUS`, `STOCK_QTYS`, `LM_excluded`, `LM_dispatched`, `LM_dateOverrides`, `LM_demandAdj`, `LM_nomOverrides`, `LM_KITS`, `LM_STP_DELIVERIES`, `LM_STP_STRATEGY`, `LM_palletCfg`, `LM_clusterTurnaround`, `MANUAL_ITEMS`, `DIST_OVERRIDES`

**Derived (rebuilt from source):**
`VN`, `CLUSTERS`, `PLAN_CACHE`, `CORT_CACHE`, `LM_STP_TRUCKS`, `LP_stockHolds`, `LM_vtMap`, `LM_vtSkuMap`, `window._kitTimelineData`, `window._asmTimelineData`, `window._lateArrivalData`

**Dangerous: Mutated-in-render (neither source nor properly derived):**
`t.stockReady`, `t.oorSubmitted` on LP plan truck objects — set inside `LP_renderPlan()` stock waterfall

---

## Deliverable 3 — Risk Register

### CRITICAL (P0) — Must fix before next production release

| # | Title | Area | Why It Matters | Symptoms | Recommendation |
|---|-------|------|---------------|----------|----------------|
| C1 | Stock waterfall computed in render, not pre-computed | LP Rendering | `LP_renderPlan()` mutates `t.stockReady` on truck objects during render. Renders are not idempotent. | Stale "Ready" badges after stock changes without plan regeneration | Pre-compute in `LP_regenerate()`, store in plan rows |
| C2 | NOM/RW not captured in undo snapshot | Undo System | If user uploads file, edits settings, clicks undo — file data is NOT restored | User clicks undo expecting file revert, only settings restored | Add `nom`/`rw` to `_undoSnap()` |
| C3 | LP plan data lost on browser close if debounce pending | Persistence | `beforeunload` only saves truck-state + config, not plan/demand/nom/arrivals | User generates plan, closes tab within 1.5s — plan lost on reload | Flush full save in `beforeunload` or save immediately after generation |
| C4 | Kit rename mutates NOM in-place during numberAll() | LM Engine | If `numberAll()` fails mid-rename, NOM has both old and new SKU entries | Corrupted nomenclature, duplicate SKUs, export failures | Build rename map first, apply atomically |
| C5 | LP_lastGenSettings stale after load | LP Persistence | Load creates fresh snapshot if missing — blocks `LP_regenerate()` | User can't regenerate plan after reload even with changed settings | Don't auto-create snapshot on load |
| C6 | Legacy migration race condition | LP Persistence | If admin migrates from `lp-state` and delete succeeds but save fails, data gone | Data loss for admins upgrading from legacy format | Save first, verify, then delete |
| C7 | Backup doesn't export LP Demand Raw | Export | Backup Excel has aggregated demand, not per-line ceiling data | Restore produces different effQty than original | Export `lp-demand-raw` sheet |
| C8 | Backup restore doesn't validate data consistency | Export | No check that truck IDs in `LP_dispatched` exist in plan, or SKUs in overrides exist in NOM | Restore into corrupted state, app crashes | Add validation layer before rebuild |

### HIGH (P1) — Fix within next 2 sprints

| # | Title | Area | Why It Matters | Recommendation |
|---|-------|------|---------------|----------------|
| H1 | Parallel save race in `saveSharedData()` | Persistence | Network hiccup on one key = inconsistent state | Save sequentially, not `Promise.all()` |
| H2 | Config save conflicts between debounce and full save | Persistence | Both write `lp-config`, last-write-wins race | Clear debounce timer when full save fires |
| H3 | `LP_recomputeStockHolds()` not called on load | LP Load | Stock holds stale after reload | Call after `LP_loadFromSupabase()` |
| H4 | `rMain()` calls business logic in render path | LM Rendering | `LM_buildLPArrivalMap/Fifo` called on every dashboard render | Move to `numberAll()` or `switchMod()` |
| H5 | Input handlers recursively call `LP_render()` | LP Rendering | Rapid setting changes cause render thrashing | Throttle render calls |
| H6 | Missing `UNDO_capture()` in 5 save functions | Undo | `LM_saveManualDemand`, `LM_saveClusterTA`, `LM_saveStpStrategy` mutations not undoable | Add `UNDO_capture()` to all save functions |
| H7 | PLAN_CACHE cleared atomically, old references persist | LM Engine | Backup export during rebuild reads empty cache | Replace entries individually, don't clear |
| H8 | Step B trucks auto-excluded on every `numberAll()` | LM Engine | User's manual un-exclude overridden silently | Only auto-exclude on first build |
| H9 | CI export uses live nomenclature for old plan | LP Export | Prices don't match what was planned | Snapshot nomenclature per plan |
| H10 | Float rounding accumulation in pallet math | LP Engine | Aggregated pallets don't match truck totals by ±0.1 | Use integer math (×100) |
| H11 | Late arrival detection recomputed in render | LP Rendering | UI freezes on Late tab switch | Pre-compute in `LP_regenerate()` |
| H12 | `loadSharedData()` missing `LM_loadStpStrategy()` | LM Load | Viewers don't see STP strategy updates until page refresh | Add to load sequence |

### MEDIUM (P2) — Fix when touching related code

| # | Title | Area |
|---|-------|------|
| M1 | `LP_lastGenSettings` not reset on hard/soft LP reset | LP Reset |
| M2 | Soft reset manual arrivals race condition | LP Reset |
| M3 | `beforeunload` config save logic inverted | Persistence |
| M4 | All LM load errors silently swallowed | LM Load |
| M5 | SKUs with missing nomenclature silently skipped in engine | LP Engine |
| M6 | Late detection doesn't distinguish transit delay vs schedule change | Late Engine |
| M7 | STP trucks rebuilt from config on restore, not exported directly | Backup |
| M8 | Deferral guard incomplete for multi-destination SR arrivals | LP Engine |
| M9 | Leftover distribution can exceed MAX_PLT | LP Engine |
| M10 | V26_render() doesn't validate data before display | V26 Rendering |

### LOW (P3) — Style and minor determinism

| # | Title | Area |
|---|-------|------|
| L1 | MEX/CAN sort tiebreaker unstable | LP Engine |
| L2 | Workday generation loop hardcoded to 365 | LP Engine |
| L3 | Dead `_arrDateHash` duplicate (already fixed per CLAUDE.md) | Cleanup |

---

## Deliverable 4 — Core Development Principles

### Principle 1: State Before Render
**Rule:** All business state mutations must complete before any render function is called.
**Why:** `LP_renderPlan()` currently mutates `t.stockReady` during render — the most dangerous pattern in the app.
**Violation:** Computing stock waterfall inside `LP_renderPlan()`.
**Enforcement:** Render functions must be pure projections of state. Add `Object.freeze()` to plan objects before passing to render in debug mode.

### Principle 2: One Write Path Per Key
**Rule:** Each Supabase key must have exactly one function that writes to it.
**Why:** `lp-config` is written by both `LP_saveToSupabase()` and `LP_saveToSupabaseDebounced()` — race condition.
**Violation:** Multiple save functions writing the same key with different payloads.
**Enforcement:** Each key gets a dedicated `save_[key]()` function. All callers go through it.

### Principle 3: Save and Load Are Symmetric
**Rule:** Every field that is saved must be loaded, and every field that is loaded must be saved, using the same structure.
**Why:** `LP_destWhsDays` was missing from save payloads until the March 2026 audit.
**Violation:** Adding a field to the save payload but forgetting the load path (or vice versa).
**Enforcement:** Use the CLAUDE.md Post-Implementation Checklist. Grep for all save/load functions when adding a field.

### Principle 4: Derived State Is Never Persisted
**Rule:** Values that can be recomputed from source-of-truth must not be saved to Supabase.
**Why:** Persisting derived state creates sync bugs when the derivation logic changes.
**Violation:** Saving `VN` or `PLAN_CACHE` to Supabase (currently not done — maintain this).
**Enforcement:** Document which globals are source vs derived in CLAUDE.md. Review on every PR.

### Principle 5: Undo Must Capture All Source-of-Truth State
**Rule:** `_undoSnap()` must capture every global that is source-of-truth.
**Why:** Currently missing `NOM` and `RW` — file upload changes can't be undone.
**Violation:** Adding a new source-of-truth global without adding it to `_undoSnap()`.
**Enforcement:** CLAUDE.md checklist: "New state variable included in `_undoSnap()`?"

### Principle 6: Resets Must Be Exhaustive
**Rule:** Each reset function must clear every relevant state variable. The CLAUDE.md reset table must be updated for every new variable.
**Why:** `LP_lastGenSettings` is missing from hard/soft LP resets.
**Violation:** Adding a global but not adding it to reset functions.
**Enforcement:** CLAUDE.md reset table is the canonical reference. Audit quarterly.

### Principle 7: Engines Must Be Deterministic
**Rule:** Given the same inputs, the engine must produce the same output on every run.
**Why:** `Object.keys()` iteration order and unstable sorts can produce different plans.
**Violation:** Using unsorted `Object.keys()` for allocation decisions.
**Enforcement:** Sort all iteration keys alphabetically. Add tertiary sort keys to break ties.

### Principle 8: No Business Logic in Templates
**Rule:** HTML template strings must not contain calculations, conditionals beyond display, or state mutations.
**Why:** `rMain()` calls `LM_buildLPArrivalMap()` and `LM_buildLPArrivalFifo()` during render.
**Violation:** Computing assembly timeline, late arrivals, or kit readiness inside render functions.
**Enforcement:** Pre-compute all display data before building HTML. Render reads, never writes.

### Principle 9: Exports Are Read-Only Projections
**Rule:** Export functions must never modify application state. They read from cached/computed data only.
**Why:** If an export function modifies state as a side effect, the app behaves differently after export.
**Violation:** An export function that clears a cache or modifies a global.
**Enforcement:** Code review: grep export functions for assignments to globals.

### Principle 10: Locked Records Are Immutable
**Rule:** Dispatched/locked trucks (`LP_dispatched`, `LM_dispatched`) must never have their items, quantities, or dates modified by any automated process.
**Why:** Once a truck is dispatched, it represents a real-world shipment. Changing it creates a mismatch with physical reality.
**Violation:** `_lpTailReconstruct` or `LP_regenerate` modifying locked truck contents.
**Enforcement:** All mutation functions must check `LP_dispatched.has(truckId)` before modifying. The tail reconstruction fingerprints locked trucks and aborts if they change.

### Principle 11: Errors Must Be Visible
**Rule:** No `.catch(()=>{})` on critical data operations. Errors must be logged with context and, for user-facing operations, displayed.
**Why:** 13 init loads silently swallow errors. If stock data fails to load, the user has no idea.
**Violation:** `await SB.from(...).catch(()=>{})` pattern.
**Enforcement:** Replace with `.catch(e=>{console.warn('Load [key] failed:',e)})` at minimum. For user-triggered operations, show toast.

### Principle 12: Debounce Coordination
**Rule:** When multiple debounced save functions can write to the same key, the full save must cancel any pending debounced save.
**Why:** `LP_saveToSupabase()` and `LP_saveToSupabaseDebounced()` both write `lp-config`.
**Violation:** Not clearing `_lpSaveTimer` when `LP_saveToSupabase()` fires.
**Enforcement:** Full save functions clear all related debounce timers.

### Principle 13: Atomic Multi-Key Operations
**Rule:** When multiple Supabase keys must be consistent (e.g., plan + config), save them in order with error handling, not in parallel.
**Why:** `saveSharedData()` uses `Promise.all()` — partial failure = inconsistent state.
**Violation:** Using `Promise.all()` for related keys.
**Enforcement:** Sequential saves with rollback on failure.

### Principle 14: Validate After Restore
**Rule:** After loading state from backup or Supabase, validate that all cross-references are intact before rebuilding.
**Why:** A truck ID in `LP_dispatched` might not exist in the plan.
**Violation:** `masterBackupRestore()` rebuilds immediately without validation.
**Enforcement:** Add validation step: check that all referenced IDs, SKUs, and venues exist.

---

## Deliverable 5 — Future Development Guidelines

### 1. Change Safety Rules

Before editing ANY function, check:

- [ ] What source-of-truth does this function read?
- [ ] What source-of-truth does this function write?
- [ ] What derived state must be rebuilt after this change?
- [ ] What render functions must be called?
- [ ] Is this function called during render? If so, does it mutate state?
- [ ] Is the save payload affected? Check all 3 LP save functions + `beforeunload`.
- [ ] Is the load path affected? Check `LP_loadFromSupabase()` + legacy path.
- [ ] Is the undo snapshot affected? Check `_undoSnap()` and `UNDO_restore()`.
- [ ] Is the backup export/restore affected?
- [ ] Which reset functions need updating?

### 2. Function-Level Rules

- **Max 50 lines per function** for new code. Extract helpers for readability.
- **No side effects in functions named `render*`, `display*`, `show*`**.
- **No DOM reads inside business calculations** — pass data as parameters.
- **No direct mutation of arrays/objects from other modules** — clone if needed.
- **Constants in UPPER_CASE** at file top, not inline magic numbers.
- **Validation at entry points** — functions that accept user input validate first.
- **Clone before mutate** when source data shouldn't change: `const copy = JSON.parse(JSON.stringify(obj))`.

### 3. State Management Rules

| State Type | Can Mutate? | Persist? | Rebuild? | Example |
|-----------|------------|---------|----------|---------|
| Source-of-truth | Yes (via setter) | Yes | No | `LP_dispatched`, `NOM` |
| Derived | No (rebuild only) | No | Yes (from source) | `VN`, `PLAN_CACHE` |
| UI state | Yes (any) | No | No | `sel`, `cv`, `LP_TAB` |
| Temporary | Yes (local scope) | No | No | Loop variables, render HTML |

**Rules:**
- Never persist derived state.
- Never manually edit derived state — always rebuild from source.
- Source-of-truth mutations must trigger: save → rebuild derived → re-render.
- UI state changes trigger: re-render only.

### 4. Rendering Rules

- Render functions receive data, return HTML. No side effects.
- Pre-compute all display values before building template strings.
- Never call `LP_render()` from inside `LP_render()` (or any render from inside itself).
- Use `requestAnimationFrame` or throttle for rapid re-renders.
- After any state mutation, call the appropriate render function explicitly.

### 5. Save/Load Rules

- When adding a field to `lp-truck-state`, update ALL 3 save functions and BOTH load paths.
- When adding a new Supabase key, add it to the reset function delete lists.
- When changing save format, add migration logic in the load path.
- Never persist display-only values.
- Test: save → reload → verify all state matches.

### 6. Audit Checklist for Every Change

- [ ] No render function mutates business state
- [ ] All source-of-truth changes trigger save
- [ ] All save payloads match load paths
- [ ] Undo snapshot captures new fields
- [ ] Reset functions clear new fields
- [ ] Backup export includes new fields
- [ ] Backup restore handles new fields
- [ ] Locked/dispatched records not modified
- [ ] No `.catch(()=>{})` on new async operations
- [ ] Deterministic: same input → same output

---

## Deliverable 6 — Quick Wins

### QW1: Pre-compute Stock Waterfall (CRITICAL → NOW)
**Problem:** `LP_renderPlan()` mutates `t.stockReady` during render.
**Fix:** Move waterfall to `LP_regenerate()`. Store `stockReady` in plan rows. Render reads only.
**Risk:** Low — waterfall logic stays the same, just moves.
**Benefit:** Eliminates the most dangerous pattern in the app.

### QW2: Add UNDO_capture() to Missing Save Functions (HIGH → NOW)
**Problem:** 5 save functions don't call `UNDO_capture()`.
**Fix:** Add `UNDO_capture()` to `LM_saveManualDemand`, `LM_saveClusterTA`, `LM_saveStpStrategy`.
**Risk:** Very low — one line each.
**Benefit:** All mutations become undoable.

### QW3: Clear Debounce Timer on Full Save (HIGH → NOW)
**Problem:** `LP_saveToSupabase()` and `LP_saveToSupabaseDebounced()` can race.
**Fix:** In `LP_saveToSupabase()`, add `clearTimeout(_lpSaveTimer);_lpSaveTimer=null;clearTimeout(_lpTruckSaveTimer);_lpTruckSaveTimer=null;`.
**Risk:** Very low — prevents redundant saves.
**Benefit:** Eliminates config save race condition.

### QW4: Call LP_recomputeStockHolds() After Load (HIGH → NOW)
**Problem:** Stock holds stale after reload.
**Fix:** Add `LP_recomputeStockHolds()` call after `LP_loadFromSupabase()` line 3735.
**Risk:** Very low — adds one function call.
**Benefit:** Stock holds always fresh on load.

### QW5: Reset LP_lastGenSettings in Reset Functions (MEDIUM → NOW)
**Problem:** Old settings hash blocks regeneration after reset.
**Fix:** Add `LP_lastGenSettings=null;` to `doResetLP()` and `doSoftResetLP()`.
**Risk:** Very low — one line each.
**Benefit:** Regeneration always available after reset.

### QW6: Add loadStpStrategy() to loadSharedData() (HIGH → NOW)
**Problem:** Viewers don't see STP strategy updates.
**Fix:** Add `LM_loadStpStrategy()` and `LM_loadClusterTA()` to the second wave of loads in `loadSharedData()`.
**Risk:** Low — additional async call.
**Benefit:** Sync refreshes STP strategy for all users.

### QW7: Log Skipped SKUs in Engine (MEDIUM → NEXT SPRINT)
**Problem:** SKUs with missing nomenclature silently skipped.
**Fix:** Collect skipped SKUs in `LP_STATE.planWarnings=[]`. Display warning banner after plan generation.
**Risk:** Low — additive, no logic change.
**Benefit:** Users know which SKUs were excluded from the plan.

### QW8: Sequential Saves in saveSharedData() (HIGH → NEXT SPRINT)
**Problem:** `Promise.all()` can leave inconsistent state on partial failure.
**Fix:** Replace `await Promise.all(saves)` with sequential `for...of` loop.
**Risk:** Low — slightly slower saves, but consistent.
**Benefit:** No more partial state on network hiccup.

### QW9: Add Sort Tiebreaker for Determinism (LOW → NEXT SPRINT)
**Problem:** Equal-priority sort results can vary.
**Fix:** Add `.localeCompare()` tiebreakers to all sort functions in the engine.
**Risk:** Very low — additive sort criteria.
**Benefit:** Same input always produces same plan.

### QW10: Flush Full Save on beforeunload (CRITICAL → NEXT SPRINT)
**Problem:** Plan lost if user closes tab during debounce window.
**Fix:** In `beforeunload`, use `navigator.sendBeacon()` to send plan data alongside truck/config.
**Risk:** Medium — `sendBeacon` has payload size limits. May need to compress.
**Benefit:** Eliminates plan data loss on tab close.

---

## Deliverable 7 — Safe Next-Step Plan

### Phase 1: Immediate (This Week)
1. Apply QW2 (UNDO_capture) — 3 one-line changes
2. Apply QW3 (clear debounce timers) — 2 lines
3. Apply QW4 (recompute stock holds on load) — 1 line
4. Apply QW5 (reset LP_lastGenSettings) — 2 lines
5. Apply QW6 (load STP strategy in sync) — 2 lines

### Phase 2: Short-Term Hardening (Next 2 Sprints)
6. Apply QW1 (pre-compute stock waterfall) — largest change, most impactful
7. Apply QW8 (sequential saves)
8. Apply QW10 (flush on beforeunload)
9. Apply QW7 (log skipped SKUs)
10. Fix C4 (kit rename atomicity)
11. Fix C7 (backup exports LP Demand Raw)
12. Fix H4 (move business logic out of rMain)

### Phase 3: Future Optional Improvements
13. Fix floating-point precision (integer pallet math)
14. Add validation layer to backup restore
15. Add plan timestamps for stale data detection
16. Add nomenclature snapshots per plan generation
17. Consider splitting into 3–5 files (engines, persistence, rendering) if and only if the single-file pattern becomes the primary development bottleneck

### Things NOT To Do Yet
- **Do NOT rewrite in a framework** — the single-file architecture works and is deployed
- **Do NOT split into modules** — the coupling is too deep for safe splitting without extensive testing
- **Do NOT add TypeScript** — the migration effort exceeds the benefit for a single-file app
- **Do NOT add a state management library** — the 40 globals are manageable with discipline
- **Do NOT refactor the engines** — they work correctly; optimize only with regression tests
- **Do NOT change Supabase key structure** — migration risk outweighs benefit

---

*Audit completed March 2026. This document should be reviewed quarterly and updated after each significant feature addition.*
