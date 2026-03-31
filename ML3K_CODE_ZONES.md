# ML3K Code Zones

Logical zone map for `index.html` (~15,700 lines). All code lives in one file. These zones are not enforced by the runtime — they exist as developer-facing boundaries.

---

## Zone 1: CSS / HTML Structure (lines 14–557)

**Purpose:** Visual styling and DOM skeleton.

**Contains:** CSS custom properties (`:root`), component styles, responsive media queries, HTML structure for modules `#D`, `#LP`, `#V26`, login/upload screens.

**Key elements:** `.rbtn`, `.mbtn`, `.dtb`, `.bg`, `.sc`, `.sr` class families. Module containers toggled via `.vis` class.

**Allowed:** Style changes, new CSS classes, HTML structure for new UI sections.

**Forbidden:** JavaScript logic. Inline `onclick` handlers are acceptable but must call named functions only — no inline business logic.

**Anti-patterns:** Hardcoded hex colors instead of CSS variables. Adding `<script>` tags inside the HTML section.

---

## Zone 2: LP Source State (lines 767–2143)

**Purpose:** LP module state declarations and constants.

**Contains:** `LP_STATE`, `LP_dispatched`, `LP_oorTrucks`, `LP_holds`, `LP_stockHolds`, `LP_arrivedConts`, `LP_transitDays`, `LP_destWhsDays`, `LP_contDateOverrides`, `LP_lsrNumbers`, `LP_palletOverrides`, `LP_customsOverrides`, `LP_excludeStaples`, `LP_lastGenSettings`. Constants: `LP_DEFAULT_MAX_PALLETS`, `LP_TRANSIT_DEFAULTS`, `LP_DEST_WHS_DEFAULTS`.

**Key functions:** `LP_matchTransitAbbr()`, `LP_getArrivalDate()`, `LP_addDays()`, `LP_parseLocalDate()`, `_lpCustNom()`, `_lpPPU()`.

**Allowed:** New LP state variables (with mandatory undo/reset/save/load coverage). New LP helper functions that are pure (no side effects).

**Forbidden:** DOM manipulation. Render logic. Direct Supabase calls.

**Anti-patterns:** Adding derived state that should be computed. Adding a global without updating `_undoSnap`, reset functions, and save/load paths.

---

## Zone 3: Undo / Reset (lines 609–765, 14923–15230)

**Purpose:** State snapshots, undo stack, and reset functions.

**Contains:** `_undoSnap()`, `UNDO_capture()`, `UNDO_restore()`, `UNDO_updateBtn()`. Reset functions: `doSystemReset()`, `doResetLM()`, `doSoftResetLM()`, `doResetLP()`, `doSoftResetLP()`.

**Key invariants:**
- `_undoSnap()` must capture ALL source-of-truth globals (currently 44 fields including `nom` and `rw`)
- `UNDO_restore()` must restore all captured fields, rebuild derived state, and save to Supabase
- Reset functions must clear all relevant state and Supabase keys per the CLAUDE.md reset table

**Allowed:** Adding new fields to snapshot/restore (with backward-compat guards). Adding new reset functions.

**Forbidden:** Changing restore order without verifying dependencies. Removing fields from snapshot. Calling render functions before state is fully restored.

**Anti-patterns:** Adding a source-of-truth global without adding it to `_undoSnap()`. Forgetting to add `UNDO_capture()` to a new save function.

---

## Zone 4: LP Compute / Engine (lines 893–2025, 3934–3969, 4838–4884)

**Purpose:** Plan generation, tail reconstruction, stock waterfall, regeneration.

**Contains:** `LP_buildPlanV3()`, `_lpTailReconstruct()`, `LP_regenerate()`, `LP_computeStockWaterfall()`, `LP_updateStockWaterfall()`, `LP_recomputeStockHolds()`, `LP_computeLateArrivals()`, `LP_invalidateLate()`.

**Key invariants:**
- Engine must be deterministic (same inputs → same output)
- Locked trucks (`LP_dispatched`) are never modified by the engine
- `MAX_PLT` capacity must not be exceeded
- Stock waterfall is a derived computation — must not be called from render

**Allowed:** Bug fixes in allocation logic. New constraint parameters (with full save/load/undo coverage).

**Forbidden:** DOM access. Render calls. Direct global writes except to `LP_STATE.generatedPlan` and derived caches (`window._lpStockStatus`, `window._LP_ALL_LATE_ITEMS`, etc.).

**Anti-patterns:** Non-deterministic iteration (`Object.keys()` without sort). Float accumulation without rounding. Modifying locked truck contents.

---

## Zone 5: LP Render (lines 3822–5707)

**Purpose:** Build HTML for LP tabs from precomputed state.

**Contains:** `LP_render()` (router), `LP_renderPlan()`, `LP_renderDemand()`, `LP_renderArrivals()`, `LP_renderLate()`, `LP_renderLateMain()`, `LP_renderStatus()`.

**Key invariants:**
- Render functions must be pure projections — NO business state mutation
- `LP_renderPlan()` reads from `window._lpStockStatus` (precomputed)
- `LP_renderLate()` reads from `window._LP_ALL_LATE_ITEMS` (precomputed, staleness-guarded)
- Repeated renders must produce identical output

**Allowed:** HTML template changes. New display elements. Reading from globals and derived caches.

**Forbidden:** Writing to `LP_STATE`, `LP_dispatched`, or any source-of-truth global. Calling `LP_buildPlanV3()`, `LP_computeStockWaterfall()`, or `LP_computeLateArrivals()` unconditionally. Calling Supabase directly.

**Anti-patterns:** Computing business logic inside template strings. Setting `t.stockReady` on truck objects. Calling `LM_buildLPArrivalMap()` from render.

---

## Zone 6: LP Persistence (lines 3579–3810)

**Purpose:** Save/load LP state to/from Supabase.

**Contains:** `LP_saveToSupabase()`, `LP_saveTruckState()`, `LP_saveToSupabaseDebounced()`, `LP_saveTruckStateDebounced()`, `LP_loadFromSupabase()`, `beforeunload` handler.

**Key invariants:**
- All 3 save functions must produce identical `lp-truck-state` payloads
- Full save (`LP_saveToSupabase`) must cancel all pending debounced saves
- Load must restore ALL persisted fields and call `LP_recomputeStockHolds()` + `LP_updateStockWaterfall()`
- Viewer role must not save

**Allowed:** Adding fields to save/load payloads (must update ALL 3 save functions + both load paths + `beforeunload`).

**Forbidden:** Changing key names without migration logic. Adding parallel saves for related keys. Calling render from save functions.

**Anti-patterns:** Adding a field to one save function but not the others. Using `Promise.all()` for related keys.

---

## Zone 7: LP Exports (lines 5950–6765)

**Purpose:** Excel exports for CI, shipping orders, plan downloads.

**Contains:** `LP_exportCI_ExcelJS()`, `LP_exportCombinedCI()`, `LP_exportPlan()`, `LP_exportShippingOrder()`, `_oorSheet()`.

**Key invariants:**
- Exports are read-only projections — no state mutation
- CI export uses live `LP_customsOverrides` + `LP_STATE.nomenclature` (intentional — see CLAUDE.md Known Acceptable Behaviors)
- Plan row `name` is the fallback if SKU missing from nomenclature

**Allowed:** New export formats. Additional columns. New sheet types.

**Forbidden:** Modifying `LP_STATE` or any global during export. Triggering saves or renders.

**Anti-patterns:** Duplicating business logic that already exists in a helper (use `_lpCustNom()`).

---

## Zone 8: LM Source State (lines ~8131, 10496–10604, 11298–11300)

**Purpose:** LM module state declarations.

**Contains:** `NOM`, `RW`, `VN`, `VS`, `CLUSTERS`, `STOCK_SKUS`, `STOCK_QTYS`, `STOCK_REPORT_NAME`, `LM_excluded`, `LM_dispatched`, `LM_dateOverrides`, `LM_demandAdj`, `LM_nomOverrides`, `LM_palletCfg`, `LM_clusterTurnaround`, `LM_MANUAL_DEMAND`, `LM_KITS`, `LM_STP_DELIVERIES`, `LM_STP_TRUCKS`, `LM_STP_STRATEGY`, `MANUAL_ITEMS`, `DIST_OVERRIDES`.

**Allowed / Forbidden / Anti-patterns:** Same rules as Zone 2 (LP Source State).

---

## Zone 9: LM Compute / Engine (lines 8937–10360, 2199–2251)

**Purpose:** Venue builds, truck numbering, arrival data, derived cache construction.

**Contains:** `build()`, `numberAll()`, `bV()`, `LM_injectAll()`, `LM_injectKits()`, `LM_injectManualDemand()`, `LM_applyNomOverrides()`, `LM_applyDateOverrides()`, `LM_buildLPArrivalMap()`, `LM_buildLPArrivalFifo()`, `LM_isAssembled()`.

**Key invariants:**
- `numberAll()` is the central rebuild — all LM-affecting changes must flow through it
- Kit SKU renaming happens in `numberAll()` and mutates `NOM` in-place (known risk — see AUDIT.md C4)
- `LM_buildLPArrivalMap/Fifo` now called from `numberAll()`, not from render
- Fingerprint migration runs in `numberAll()` after truck numbering — converts old-style FPs (raw kit SKUs) to stable format (kit IDs). Any new FP-keyed map must be added to the migration block
- Locked truck data (`LM_dispatched`, `LM_dateOverrides`, `LM_lsrNumbers`) must survive `numberAll()` rebuilds via stable fingerprints

**Allowed / Forbidden / Anti-patterns:** Same rules as Zone 4 (LP Compute).

---

## Zone 10: LM Render (lines 10361–10491, 11907+, 13004–13322, 13323+)

**Purpose:** Build HTML for LM views from precomputed state.

**Contains:** `rMain()`, `rT()`, `rVL()`, `LM_renderDemand()`, `LM_renderAnalysis()`, `showM()` (truck modal).

**Key invariants:**
- `rMain()` is now a pure read-only projection — no business logic calls
- Assembly timeline, kitting timeline, late arrivals, and daily dispatch detail are computed from `PLAN_CACHE` (precomputed by `numberAll()`)

**Allowed / Forbidden / Anti-patterns:** Same rules as Zone 5 (LP Render).

---

## Zone 11: LM Persistence (lines 8306–8475, 10538–10651, 11161–11378, 11891–11901)

**Purpose:** Save/load LM state to/from Supabase.

**Contains:** `saveSharedData()`, `saveSharedDataDebounced()`, `loadSharedData()`, `syncLM()`, plus ~15 individual `LM_save*/LM_load*` function pairs.

**Key invariants:**
- `saveSharedData()` saves sequentially (not parallel) and cancels pending debounce
- Full save (`saveSharedData(true)`) includes `NOM` + `RW`
- Each save function must call `UNDO_capture()` before writing

**Allowed / Forbidden / Anti-patterns:** Same rules as Zone 6 (LP Persistence).

---

## Zone 12: Backup / Restore (lines 7541–8130)

**Purpose:** Full system backup to Excel and restore from backup file.

**Contains:** `masterBackupExport()`, `masterBackupRestorePrompt()`, `masterBackupRestore()`.

**Key invariants:**
- Export includes LP Demand Raw sheet (for faithful effQty restore)
- Restore validates cross-references before rebuild (orphan truck IDs, malformed rows filtered)
- Restore calls `saveSharedData(true)` + `LP_saveToSupabase()` to persist restored state
- Old backups without newer sheets still restore via fallback paths

**Allowed:** New sheets in backup. New validation rules in restore.

**Forbidden:** Changing existing sheet names (breaks restore compatibility). Removing sheets. Skipping validation.

**Anti-patterns:** Restoring state without validating cross-references. Not calling `LP_updateStockWaterfall()` + `LP_invalidateLate()` after restore.

---

## Zone 13: Kit / STP System (lines 10589–10651, 11157–11500)

**Purpose:** Kit creation/management, STP delivery strategy and truck building.

**Contains:** `LM_createKit()`, `LM_deleteKit()`, `LM_injectKits()`, `LM_kitReadiness()`, `_stpBuildTruck()`, `_stpValidateVenues()`, `LM_STP_STRATEGY`.

**Coupling:** Deeply integrated into `numberAll()` (kit renaming, STP truck building).

---

## Zone 14: HS Code System (lines 2045–2122, 2814–3406)

**Purpose:** HS code classification wizard with AI providers.

**Contains:** `_hsAILookup()`, `_hsBuildPrompt()`, `_hsStep0/1/2()`, `_hsNormalize()`, `_HS_DB[]`, `_HS_CATS[]`.

**Coupling:** Isolated subsystem. Only interacts with `LP_customsOverrides` and `LP_STATE.nomenclature`.

---

## Zone 15: V26 Module (lines 6767–7520)

**Purpose:** Vision 2026 unified command view.

**Contains:** `V26_render()`, V26 KPI computation, truck gathering from LP + LM + STP + CORT.

**Coupling:** Reads from both LP and LM state. Does not write to either.

---

## Zone 16: Init / Boot (lines 8235–8320, 15592+)

**Purpose:** Authentication, data loading, initial render.

**Contains:** `autoLogin()`, `enterApp()`, Supabase client creation, parallel config loading.

**Key invariants:** All 13+ config loads must complete before `numberAll()` runs. Errors must be logged (not silently swallowed).

---

## Zone 17: UI Navigation (lines 8137–8179, 3813–3819, 14259–14265)

**Purpose:** Module switching, tab routing, venue selection.

**Contains:** `switchMod()`, `LP_switchTab()`, `sV()`, `selV()`, `selAll()`, `selCl()`, `selClOv()`, `selRegion()`.

---

## Zone 18: Stock Report (lines 15445–15596)

**Purpose:** Stock file upload, parsing, persistence.

**Contains:** `stockReportParse()`, `stockReportSave()`, `stockReportLoad()`, `stockReportReset()`, `stockUpdateBadge()`.

**Coupling:** Triggers `LP_recomputeStockHolds()`, `LP_updateStockWaterfall()`, `LP_invalidateLate()`, and optionally `LP_regenerate()`.

---

## Zone 19: Shared Helpers (scattered)

**Purpose:** Pure utility functions used across zones.

**Contains:** `LP_addDays()`, `LP_parseLocalDate()`, `LP_fmtDate()`, `fS()`, `clDisp()`, `fmtUSD()`, `filterBySearch()`, `LP_aggregateTruck()`.

**Rule:** Helpers must be pure functions with no side effects and no global writes.
