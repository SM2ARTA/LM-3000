# ML3K Regression Test Pack

Standard manual regression suite. Run applicable sections after every change per the PR checklist.

---

## Group A: LP Plan Generation

### A1: Fresh Plan Generation
1. Upload nom + material plan + arrivals files
2. Click Generate
3. **Expect:** Plan renders with truck cards, READY badges, pallet bars. No console errors.

### A2: Regeneration (Full)
1. With existing plan, change an engine setting (e.g., maxPallets)
2. Click Generate
3. **Expect:** Plan rebuilt. Old truck IDs replaced. Locked trucks preserved if any.

### A3: Regeneration (Partial — with locked trucks)
1. Lock (dispatch) 2-3 trucks
2. Change a setting
3. Click Generate
4. **Expect:** Locked trucks unchanged. Remaining trucks rebuilt. New truck IDs start after highest locked ID.

### A4: Plan Determinism
1. Generate plan
2. Note truck count and first 5 truck IDs
3. Generate again with same settings
4. **Expect:** Identical truck count and IDs.

---

## Group B: Stock Waterfall

### B1: Stock Upload
1. Upload stock report
2. Switch to Plan tab
3. **Expect:** READY badges appear on trucks with sufficient stock. Green dots on items.

### B2: Stock Reset
1. Click stock reset
2. **Expect:** All READY badges disappear. Grey dots. No console errors.

### B3: Stock Waterfall After Reload
1. Upload stock → note READY trucks
2. Reload page (F5)
3. **Expect:** Same READY trucks after reload (waterfall recomputed on load).

### B4: Repeated Render
1. Switch Plan→Demand→Plan→Demand→Plan
2. **Expect:** Same READY badges every time. No state drift.

---

## Group C: Dispatch / OOR

### C1: Dispatch Toggle
1. Click lock checkbox on a truck
2. **Expect:** Truck shows locked icon. LSR field appears. Truck persists after reload.

### C2: Dispatch Unlock
1. Uncheck lock on a dispatched truck
2. **Expect:** Truck unlocked. LSR field removed. Truck available for regeneration.

### C3: OOR Submit
1. Check OOR on a truck
2. **Expect:** Blue OOR badge + READY badge. Truck skips stock deduction in waterfall.

### C4: OOR Remove
1. Uncheck OOR
2. **Expect:** OOR badge removed. Truck reverts to stock-based READY status.

---

## Group D: LM Dashboard

### D1: All Venues Dashboard
1. Click All Venues in sidebar
2. **Expect:** KPIs (Pallets, Pieces, Trucks, Dispatch Days, Peak/Day) render. Calendar shows. Timelines load (Assembly, Kitting, Late if data exists).

### D2: Venue Selection
1. Click a specific venue in sidebar
2. **Expect:** Truck cards render. CORT/STP sections show if applicable.

### D3: Cluster Selection
1. Click a cluster (e.g., New York) in sidebar
2. **Expect:** Cluster-level view with all venues. Kitting timeline shows if kits exist for cluster venues.

### D4: Demand Tab
1. Select a venue → click Demand tab
2. **Expect:** Demand table renders with SKUs, quantities, adjustments. No console errors. STP items highlighted if applicable.

### D5: Tab Switching
1. Rapidly switch Dashboard→Demand→Trucks→Analysis→Dashboard
2. **Expect:** Each view renders correctly. No stale data. No console errors.

---

## Group E: Late Tab

### E1: Late Tab Initial View
1. Switch to LP → Late tab
2. **Expect:** Left panel shows destinations with dots. Right panel shows late items or "all on time."

### E2: Late Tab After Plan Change
1. Regenerate LP plan
2. Switch to Late tab
3. **Expect:** Late data reflects new plan (not cached from old plan).

### E3: Late Tab Repeated Views
1. Switch Late→Plan→Late→Plan→Late
2. **Expect:** Same late items every time (staleness flag prevents unnecessary recomputation).

### E4: Transit Day Change
1. Change transit days for a destination
2. Switch to Late tab
3. **Expect:** Late analysis reflects new transit days.

### E5: LM Date Change
1. Change an LM dispatch date
2. **Expect:** If Late tab is active, it refreshes automatically via `LP_refreshLate()`.

---

## Group F: Undo / Restore

### F1: Basic Undo
1. Change a setting (e.g., LP maxPallets)
2. Press Ctrl+Z
3. **Expect:** Setting reverts to previous value.

### F2: Multi-Step Undo
1. Make 3 changes (e.g., change maxPallets, add a hold, change transit days)
2. Press Ctrl+Z three times
3. **Expect:** Each undo reverts one change. State matches initial.

### F3: Undo After Stock Change
1. Upload stock report
2. Press Ctrl+Z
3. **Expect:** Stock report reverted (old STOCK_SKUS/STOCK_QTYS restored).

### F4: Undo After Kit Edit
1. Create a kit
2. Press Ctrl+Z
3. **Expect:** Kit removed.

### F5: Undo NOM/RW Changes
1. Upload new LM files (changes NOM and RW)
2. Press Ctrl+Z
3. **Expect:** NOM and RW revert to previous state. Dashboard rebuilds with old data.

---

## Group G: Backup Export / Restore

### G1: Backup Export
1. Click Backup button
2. **Expect:** Excel file downloads with sheets: LM Nomenclature, LM Material Plan, LM Venue Settings, LP Nomenclature, LP Material Plan, LP Demand Raw, LP Arrivals, LP Generated Plan, LP Config, Stock Report, etc.

### G2: Backup Restore (Valid)
1. Restore from a valid backup
2. **Expect:** All state restored. Dashboard renders. "Backup Restored" dialog shows. No validation warnings.

### G3: Backup Restore (Old Format)
1. Restore from a backup that lacks "LP Demand Raw" sheet
2. **Expect:** Restore uses "LP Material Plan" fallback. Log shows "aggregated, no raw."

### G4: Backup Restore (Corrupted)
1. Edit backup Excel: add a Locked=Yes row with a nonexistent truck ID
2. Restore
3. **Expect:** Warning logged: "LP_dispatched references truck LP-XX not in plan." Orphan ID removed. Rest of restore succeeds.

### G5: Backup Restore (Malformed Plan Row)
1. Edit backup Excel: clear the Date cell on a plan row
2. Restore
3. **Expect:** Warning: "Removed 1 plan row(s) missing truckId/date/destination." Rest of plan intact.

---

## Group H: Reset Paths

### H1: LP Hard Reset
1. Go to Help → Reset → Reset Load Plan
2. **Expect:** All LP data cleared. Upload screen shown. LP settings reset to defaults.

### H2: LP Soft Reset
1. Go to Help → Reset → Update Files (soft)
2. **Expect:** Plan cleared. Settings preserved. Dispatched/locked trucks preserved. Upload screen shown.

### H3: LM Hard Reset
1. Go to Help → Reset → Reset Last Mile
2. **Expect:** All LM data cleared. Stock cleared. Upload screen shown.

### H4: System Reset
1. Go to Help → Reset → System Reset
2. **Expect:** Everything cleared. Login screen shown.

### H5: Regeneration After Reset
1. Do LP Hard Reset → upload new files → Generate
2. **Expect:** Plan generates successfully. No "settings unchanged" block.

---

## Group I: Sync / Reload

### I1: Page Reload
1. Make changes → reload page (F5)
2. **Expect:** All saved state restored. Same view as before reload.

### I2: Sync Button
1. Click green Sync pill on any module
2. **Expect:** Data refreshed from Supabase. Views re-render.

### I3: Cross-Tab Sync
1. Open ML3K in two tabs
2. Make changes in tab 1
3. Click Sync in tab 2
4. **Expect:** Tab 2 reflects tab 1's changes.

---

## Group J: Persistence Integrity

### J1: Debounce vs Full Save
1. Rapidly change LP settings (triggers debounce)
2. Immediately click Generate (triggers full save)
3. Reload
4. **Expect:** Settings match state at generation time, not intermediate debounced state.

### J2: LM Debounce vs Full Save
1. Rapidly switch between LM venues (triggers `saveSharedDataDebounced`)
2. Click Backup (triggers `saveSharedData(true)`)
3. Reload
4. **Expect:** State matches backup-time state.

### J3: Save Failure Visibility
1. If testable: disconnect network → make a change
2. **Expect:** "Save failed" visible in status bar. No silent data loss.

---

## Quick Reference: Which Tests to Run

| Change Type | Required Test Groups |
|-------------|---------------------|
| CSS/HTML only | D1 (smoke) |
| LP render changes | A1, B1, B4, C1, E1 |
| LP engine changes | A1–A4, B1, C1–C4 |
| LP persistence changes | A1, B3, I1, J1 |
| LM render changes | D1–D5 |
| LM engine changes | D1–D5, E1 |
| LM persistence changes | D1, I1, J2 |
| Undo/reset changes | F1–F5, H1–H5 |
| Backup changes | G1–G5 |
| Stock changes | B1–B3, E1 |
| New global added | F1, G1–G2, H1–H4, I1 |
| High-risk / multi-zone | ALL groups |
