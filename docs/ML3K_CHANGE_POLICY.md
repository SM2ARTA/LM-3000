# ML3K Change Policy

Classification of changes by risk level. Claude must assess every change against this policy before implementation.

---

## Safe Changes (proceed normally)

Changes that affect only one zone with no cross-zone coupling.

| Category | Examples | Why safe |
|----------|---------|----------|
| CSS-only styling | Color changes, spacing, font sizes | No JS logic affected |
| HTML template text | Label changes, tooltip text, badge text | No state affected |
| New display column in existing table | Add column to demand table, truck modal | Read-only projection |
| New KPI card in existing dashboard | Add card to LP Status, LM Dashboard, V26 | Pure computation from existing state |
| Export format changes | New column in CI sheet, new sheet in backup export | Read-only — does not modify state |
| HS Code database entries | Adding HS codes to `_HS_DB[]` | Isolated data, no coupling |
| Presentation files | `supply-chain-overview.html`, `sitrep.html`, `digest.html` | Separate files, no coupling |

---

## Medium-Risk Changes (proceed with caution, verify checklist)

Changes that touch state management, persistence, or cross-zone boundaries.

| Category | Examples | Risk |
|----------|---------|------|
| New source-of-truth global | New LP/LM override, new setting | Must update: `_undoSnap`, `UNDO_restore`, save/load, reset functions, backup export/restore |
| New Supabase key | New persistence endpoint | Must update: reset delete lists, load paths, backup |
| Render function changes | Modifying `LP_renderPlan()`, `rMain()` | Must verify: no state mutation, no business logic in render |
| Save/load payload changes | Adding field to `lp-truck-state` | Must update ALL 3 save functions + both load paths + `beforeunload` |
| Engine parameter changes | New constraint in `LP_buildPlanV3()` | Must verify: determinism, locked truck safety, capacity enforcement |
| Kit/STP system changes | New kit field, STP delivery logic | Coupled to `numberAll()`, backup, undo |
| Stock report changes | New stock field, new parsing logic | Triggers: `LP_recomputeStockHolds()`, `LP_updateStockWaterfall()`, `LP_invalidateLate()` |
| Cross-module notification | Changes to `_lpNotifyLM()` | Affects LM rebuild cascade, PLAN_CACHE, arrival data |

---

## High-Risk Changes (requires explicit approval + full regression test)

Changes that affect critical invariants or multiple zones simultaneously.

| Category | Examples | Why high-risk |
|----------|---------|--------------|
| Engine logic changes | Modifying allocation algorithm, deferral guards, capacity checks | Can produce different plans for all users |
| Undo/reset system changes | Modifying `_undoSnap()`, `UNDO_restore()`, any reset function | Can lose user data or corrupt state |
| Persistence format changes | Changing Supabase key names, payload structure | Can break load for existing users |
| `numberAll()` changes | Modifying truck numbering, kit renaming, exclusion logic | Central rebuild — affects everything downstream |
| Backup format changes | Changing sheet names or column names in backup Excel | Can break restore from existing backups |
| Init/boot order changes | Reordering load sequence in `enterApp()` | Can cause race conditions or missing data |
| `switchMod()` changes | Modifying module activation logic | Can break all three modules |

---

## Forbidden Without Explicit Request

| Category | Why |
|----------|-----|
| Framework introduction (React, Vue, etc.) | Destabilizes working system |
| File splitting into modules | Deep coupling makes safe splitting very difficult |
| TypeScript migration | Cost exceeds benefit for single-file app |
| State management library | 44 globals are manageable with discipline |
| Supabase key renaming | Breaks all existing user data |
| Removing backward-compat guards in undo/restore | Old snapshots would crash |

---

## Decision Matrix

Before ANY change, Claude must answer:

1. **Which zone(s) does this change touch?** (See ML3K_CODE_ZONES.md)
2. **Does it modify source-of-truth state?** → Medium risk minimum
3. **Does it modify persistence payloads?** → Medium risk minimum, check all save/load paths
4. **Does it modify engine logic?** → High risk
5. **Does it modify render functions?** → Verify no state mutation
6. **Does it add a new global?** → Must update undo, reset, save/load, backup
7. **Can it affect locked/dispatched trucks?** → High risk, verify immutability
8. **Does it change code in `numberAll()`?** → High risk, full LM rebuild affected
