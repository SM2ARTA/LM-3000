# Quick Wins Patch — March 30, 2026

## Summary

5 targeted fixes from the ML3K system audit. Zero refactoring, zero logic changes, zero data structure changes.

---

## Fix 1: UNDO_capture() added to LM_saveManualDemand

**Function:** `LM_saveManualDemand()` (line ~10484)
**Change:** Added `UNDO_capture();` before the Supabase upsert.
**Why safe:** `UNDO_capture()` is a pure snapshot function with no side effects. Already called by 10+ other save functions.
**What it fixes:** Manual demand edits (add/remove manual demand items) can now be undone with Ctrl+Z.
**Regression risk:** None. Additive — only adds undo capability that was missing.

## Fix 2: UNDO_capture() added to LM_saveClusterTA

**Function:** `LM_saveClusterTA()` (line ~8383)
**Change:** Added `UNDO_capture();` before the Supabase upsert.
**Why safe:** Same pattern as Fix 1. Pure snapshot.
**What it fixes:** Cluster turnaround (satellite WHS processing days) edits can now be undone.
**Regression risk:** None.

## Fix 3: UNDO_capture() added to LM_saveStpStrategy

**Function:** `LM_saveStpStrategy()` (line ~11063)
**Change:** Added `UNDO_capture();` before the Supabase upsert.
**Why safe:** Same pattern as Fix 1. Pure snapshot.
**What it fixes:** STP delivery strategy changes (kit vs direct by country/venue type) can now be undone.
**Regression risk:** None.

## Fix 4: Clear debounce timer in LP_saveToSupabase()

**Function:** `LP_saveToSupabase()` (line ~3660)
**Change:** Added `if(_lpSaveTimer){clearTimeout(_lpSaveTimer);_lpSaveTimer=null}` after the existing `_lpTruckSaveTimer` clear.
**Why safe:** `LP_saveToSupabase()` already clears `_lpTruckSaveTimer`. This applies the same pattern to `_lpSaveTimer`. The full save writes `lp-config` with complete data, making the debounced config save redundant.
**What it fixes:** Prevents race condition where debounced config save (`LP_saveToSupabaseDebounced`) fires AFTER a full save, potentially overwriting with stale data.
**Regression risk:** Very low. Worst case: one fewer redundant Supabase write.

## Fix 5: LP_recomputeStockHolds() after load

**Function:** `LP_loadFromSupabase()` — both new path (line ~3742) and legacy path (line ~3785)
**Change:** Added `LP_recomputeStockHolds();` call after plan rehydration completes.
**Why safe:** `LP_recomputeStockHolds()` is a pure derivation function — it reads `LP_STATE.materialPlan`, `STOCK_SKUS`, `STOCK_QTYS`, and `LP_holds`, then writes `LP_stockHolds`. It's already called in 7 other places (stock upload, dispatch toggle, plan render, etc.).
**What it fixes:** Stock holds were stale after page reload if stock report changed between sessions. Now they're recomputed immediately.
**Regression risk:** Very low. Only writes to `LP_stockHolds` (a derived Set).

## Fix 6: Reset LP_lastGenSettings in LP reset functions

**Functions:** `doResetLP()` (line ~15085) and `doSoftResetLP()` (line ~15118)
**Change:** Added `LP_lastGenSettings={};` after clearing LP_STATE.
**Why safe:** `LP_lastGenSettings` is only read by `LP_settingsChanged()` to detect dirty state. Setting it to `{}` means the next `LP_settingsChanged()` check will correctly detect that settings have changed (all hashes will differ), allowing regeneration.
**What it fixes:** After LP hard or soft reset, the user could not regenerate the plan even after changing settings, because the old `LP_lastGenSettings` hash still matched.
**Regression risk:** None. Clearing to `{}` is more correct than leaving stale data.

---

## What was NOT touched

- No engine logic (`LP_buildPlanV3`, `build`, `numberAll`) was modified
- No rendering logic was modified
- No data structures were changed
- No save/load payload formats were changed
- No Supabase keys were added or removed
- No UI/HTML was modified
- The stock waterfall render mutation (audit C1) was NOT addressed — that requires a larger change
- The NOM/RW undo gap (audit C2) was NOT addressed — that requires schema changes to `_undoSnap()`
- The beforeunload flush gap (audit C3) was NOT addressed — that requires `sendBeacon` integration
- The kit rename atomicity (audit C4) was NOT addressed — that requires refactoring `numberAll()`
- QW6 (loadStpStrategy in sync) was verified as already present in all paths — no change needed
