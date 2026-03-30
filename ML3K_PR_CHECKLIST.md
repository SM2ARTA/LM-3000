# ML3K PR Review Checklist

Every change to `index.html` must be reviewed against this checklist. Claude must verify each applicable item before committing.

---

## 1. Source-of-Truth Impact

- [ ] List every source-of-truth global read or written by this change
- [ ] If a new global is added: confirm it appears in `_undoSnap()`, `UNDO_restore()`, all relevant reset functions, save/load paths, and backup export/restore
- [ ] If an existing global is modified: confirm the modification path ends with a save call

## 2. Derived-State Rebuild Impact

- [ ] If source state changes: confirm derived state is rebuilt (e.g., `VN` after `RW` change, `PLAN_CACHE` after `numberAll()`)
- [ ] If LP plan changes: confirm `LP_updateStockWaterfall()` and `LP_invalidateLate()` are called
- [ ] If LM data changes: confirm `LM_buildLPArrivalMap()` / `LM_buildLPArrivalFifo()` run (via `numberAll()`)
- [ ] If stock changes: confirm `LP_recomputeStockHolds()` is called

## 3. Render Purity

- [ ] Render functions (`LP_renderPlan`, `LP_renderLate`, `rMain`, `V26_render`) do NOT write to any source-of-truth or derived global
- [ ] Render functions read from precomputed caches (`window._lpStockStatus`, `window._LP_ALL_LATE_ITEMS`, etc.)
- [ ] No business logic computation inside HTML template strings
- [ ] Calling the render function twice produces identical output

## 4. Save / Load Symmetry

- [ ] Every field saved is loaded, and every field loaded is saved
- [ ] If adding a field to `lp-truck-state`: updated in ALL 3 save functions (`LP_saveTruckState`, `LP_saveToSupabase`, `beforeunload`) and both load paths (new + legacy)
- [ ] If adding a Supabase key: added to the appropriate reset function delete lists
- [ ] `saveSharedData(true)` path includes the field if it's LM-owned

## 5. Undo Coverage

- [ ] `_undoSnap()` captures any new source-of-truth field
- [ ] `UNDO_restore()` restores it with backward-compat guard (`if(snap.newField)`)
- [ ] Save functions that mutate state call `UNDO_capture()` before saving
- [ ] `_rwEnrichEffQty()` called after restoring `RW` (if NOM/RW affected)

## 6. Reset Coverage

Verify against the CLAUDE.md reset table:

- [ ] `doSystemReset()` — clears the new field
- [ ] `doResetLM()` — clears if LM-owned; add to Supabase delete list
- [ ] `doSoftResetLM()` — decide: clear or preserve
- [ ] `doResetLP()` — clears if LP-owned; add to Supabase delete list
- [ ] `doSoftResetLP()` — decide: clear or preserve

## 7. Backup / Export Impact

- [ ] `masterBackupExport()` includes the new field/state
- [ ] `masterBackupRestore()` handles the new field (with fallback for old backups missing it)
- [ ] Restore validation catches malformed values for the new field
- [ ] Backup sheet names are NOT changed (would break restore)

## 8. Locked / Dispatched Safety

- [ ] LP dispatched trucks (`LP_dispatched`) are NOT modified by automated processes
- [ ] LM dispatched trucks (`LM_dispatched`) are NOT modified by automated processes
- [ ] `_lpTailReconstruct` fingerprints locked trucks before/after (no changes)
- [ ] Engine functions check `LP_dispatched.has(truckId)` before modifying truck contents

## 9. Persistence / Debounce Race Safety

- [ ] `LP_saveToSupabase()` still cancels `_lpSaveTimer` and `_lpTruckSaveTimer`
- [ ] `saveSharedData()` still cancels `_lmSaveTimer`
- [ ] No new `Promise.all()` for logically related Supabase keys
- [ ] New debounced save functions coordinate with their full-save counterpart

## 10. Error Handling

- [ ] No new `.catch(()=>{})` on critical async operations (use `.catch(e=>{console.warn(...)})` minimum)
- [ ] User-facing operations show error state if save/load fails
- [ ] No silent swallowing of errors that affect data integrity

## 11. Determinism (Engine changes only)

- [ ] All `Object.keys()` iterations that affect allocation are sorted
- [ ] Sort functions have tertiary tiebreakers for deterministic ordering
- [ ] Float rounding is explicit (`Math.round(x*100)/100`)
- [ ] Same inputs produce same outputs across runs

## 12. Regression Testing

- [ ] Identified which regression tests from ML3K_REGRESSION_TEST_PACK.md apply to this change
- [ ] Listed specific manual tests for the change
- [ ] If high-risk: full regression test pack required
