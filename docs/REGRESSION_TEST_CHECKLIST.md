# Regression Test Checklist — Quick Wins Patch

## Pre-requisites
- Admin role logged in
- LP plan generated with stock report uploaded
- LM data loaded with at least one kit and STP delivery

---

## Test 1: Undo Manual Demand (Fix 1)

1. Go to LM → select a venue → Demand tab
2. Add a manual demand item (click + Add)
3. Verify it appears in the demand list
4. Press Ctrl+Z (or click Undo button)
5. **Expected:** Manual demand item is removed. Previous state restored.
6. **Before fix:** Undo had no effect on manual demand changes.

## Test 2: Undo Cluster Turnaround (Fix 2)

1. Go to LM → sidebar → select any USA cluster
2. Change "Inbound transit (d)" or the cluster turnaround value in settings
3. Note the old value
4. Press Ctrl+Z
5. **Expected:** Value reverts to previous. Trucks rebuild.
6. **Before fix:** Undo had no effect on turnaround changes.

## Test 3: Undo STP Strategy (Fix 3)

1. Go to LM → open Delivery Strategy modal (via kit/STP settings)
2. Change a delivery strategy (e.g., toggle USA stadiums STP from "direct" to "kit")
3. Press Ctrl+Z
4. **Expected:** Strategy reverts. STP trucks rebuild accordingly.
5. **Before fix:** Undo had no effect on strategy changes.

## Test 4: Debounce Timer Clear (Fix 4)

1. Go to LP → change engine settings rapidly (e.g., toggle maxPallets up/down 3 times within 2 seconds)
2. Immediately click "Generate Plan" (which triggers `LP_saveToSupabase()`)
3. Wait 5 seconds
4. Reload the page
5. **Expected:** Settings match what was shown at generation time. No revert to intermediate values.
6. **Before fix:** The debounced config save could fire AFTER the full save, overwriting with stale intermediate settings.

## Test 5: Stock Holds Fresh After Reload (Fix 5)

1. Go to LP → generate plan → note which items show "held" status
2. Upload a new stock report with different quantities
3. Reload the page (F5)
4. Go to LP → Plan tab
5. **Expected:** Stock holds reflect the NEW stock quantities, not the old ones.
6. **Before fix:** Stock holds were stale after reload — they reflected the stock state from the previous session.

## Test 6: LP Reset Allows Regeneration (Fix 6a — Hard Reset)

1. Go to LP → generate a plan
2. Go to Help → Reset → "Reset Load Plan" (hard reset)
3. Upload new files
4. Change any engine setting (e.g., maxPallets)
5. Click "Generate Plan"
6. **Expected:** Plan generates successfully.
7. **Before fix:** `LP_settingsChanged()` could return false (settings hash matched stale `LP_lastGenSettings`), blocking regeneration.

## Test 7: LP Soft Reset Allows Regeneration (Fix 6b — Soft Reset)

1. Go to LP → generate a plan
2. Go to Help → Reset → "Update Files" (soft reset)
3. Upload new material plan file
4. Click "Generate Plan"
5. **Expected:** Plan generates successfully with new data.
6. **Before fix:** Same as Test 6.

---

## Smoke Tests (verify nothing broke)

### LP Module
- [ ] Generate a new LP plan from scratch → plan renders correctly
- [ ] Dispatch a truck → status updates, stock waterfall adjusts
- [ ] Edit customs override → saves, persists after reload
- [ ] Export CI → Excel file generates correctly
- [ ] Switch between LP tabs (Plan, Demand, Arrivals, Late, Status) → no errors

### LM Module
- [ ] View All Venues dashboard → KPIs, timeline sections render
- [ ] View individual venue → truck cards show correctly
- [ ] Create/delete a kit → saves, undo works
- [ ] Add/remove STP delivery → saves, undo works
- [ ] Export kit timeline → Excel generates correctly

### V26 Module
- [ ] Switch to V26 → renders without errors
- [ ] Filter by country → correct data shown

### Cross-Module
- [ ] Undo button → works across all modules
- [ ] Backup export → generates complete Excel
- [ ] Sync (green pill) → reloads data correctly
- [ ] Viewer role → can view, cannot edit

---

## Known Limitations (not addressed by this patch)

- Stock waterfall is still computed inside `LP_renderPlan()` (audit C1)
- NOM/RW are still not captured in undo snapshots (audit C2)
- `beforeunload` still only flushes truck-state + config (audit C3)
- Kit rename in `numberAll()` still mutates NOM in-place (audit C4)
