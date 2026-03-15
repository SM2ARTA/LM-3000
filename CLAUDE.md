# ML3K — FIFA World Cup 2026 Logistics Manager

## Project Overview
Single-page web application for managing ground transport logistics for FWC26. Handles trucks, stadiums, venues, routes, and staffing across USA, Canada, and Mexico host cities.

## Architecture
- **Single file**: Everything lives in `index.html` (~9,800 lines). No build step, no bundler.
- **Backend**: Supabase (URL and anon key near the bottom of `index.html`, search for `supabase.createClient`)
- **External libs** (CDN): `@supabase/supabase-js@2`, `xlsx@0.18.5`, `exceljs@4.4.0`, Google Fonts
- **No framework** — vanilla JS and CSS with CSS custom properties (design tokens in `:root`)

## Supabase
- Project URL: `https://stwopndhnxcjyomkufii.supabase.co`
- Key is the public anon key — safe to keep in source
- Client initialised at bottom of file: `SB = supabase.createClient(...)`
- Key table: `shared_state`

## Three Modules
- `#D` — **Last Mile (LM)**: venue delivery planning. `curMod='lm'`
- `#LP` — **Load Plan (LP)**: warehouse dispatch to MEX/CAN/RIC. `curMod='lp'`
- `#V26` — **Vision 2026**: unified command view. `curMod='v26'`
- Switching: `switchMod(mod)` — shows/hides module divs via `.vis` class, also toggles `#gsb-lm/gsb-lp/gsb-v26` in the bottom support bar

## Brand & UI Rules

### Design Tokens (`:root`)
| Token | Value | Usage |
|---|---|---|
| `--ac` | `#CF5D5D` | Accent / primary red |
| `--as` | `#FDF0F0` | Accent surface (light red bg) |
| `--ab` | `#E8A5A5` | Accent border |
| `--gn` | `#12804A` | Green (success, stock, arrivals) |
| `--gs` | `#E6F5ED` | Green surface |
| `--or` | `#C4550A` | Orange (backup, warnings) |
| `--os` | `#FEF3EB` | Orange surface |
| `--rd` | `#C62A2F` | Red (danger, delete) |
| `--rs` | `#FDEBED` | Red surface |
| `--pu` | `#6E3FF3` | Purple (pallets, restore, combined CI) |
| `--ps` | `#F0EBFE` | Purple surface |
| `--tp` | `#111318` | Text primary |
| `--ts` | `#60646C` | Text secondary |
| `--tt` | `#9CA0AA` | Text tertiary / muted |
| `--sf` | `#FFF` | Surface (card bg) |
| `--bg` | `#F4F5F7` | Page background |
| `--bd` | `#E2E4E9` | Border |
| `--r` | `10px` | Border radius |
| `--fd` | DM Sans | UI font |
| `--fm` | IBM Plex Mono | Data/code font |

### Button Classes
Two button families — never mix them:

**`.rbtn`** — toolbar, support bar, inline action buttons
`padding:5px 12px; font-size:11px; border-radius:6px; border:1px solid var(--bd)`
Color variants via inline `style="background:VAR;color:VAR;border-color:HEX"`:
- Default (neutral): no extra style
- Export/accent: `background:var(--as);color:var(--ac);border-color:var(--ab)`
- Stock/green: `background:var(--gs);color:var(--gn);border-color:#B8DFCA`
- Pallets/purple: `background:var(--ps);color:var(--pu);border-color:#D4C5FE`
- Backup/orange: `background:var(--os);color:var(--or);border-color:#F5D6B8`
- Restore/purple: `background:var(--ps);color:var(--pu);border-color:#D4C5FE`

**`.mbtn`** — modal action buttons only
`padding:9px 22px; font-size:12px; font-weight:700; border-radius:8px`
Modifiers:
- `.mbtn` alone — neutral (Cancel)
- `.mbtn .mbtn-primary` — accent red (OK, Confirm)
- `.mbtn .mbtn-danger` — red (Delete, Reset)
- `.mbtn-wide` — `width:100%` (full-width modal button)
- Custom semantic color: `.mbtn` + inline `background`/`color`/`border-color` (Create Kit = `#43A047`, Create STP = `#EF6C00`)

### Module Activation
- **Always use `switchMod(mod)`** to activate a module — never manually toggle `.vis` or set `curMod`
- `switchMod` handles: `.vis` class, `curMod`, `#gsb-*` bar sections, role badge, render call
- Exception: only internal module re-renders (not switching) can call render functions directly

### Content Padding for Bottom Bar Clearance
Every scrollable module container must have explicit `padding-bottom` that accounts for `#global-supp-bar` (44px):
- `#D .cnt` — `padding-bottom:44px` (desktop), `96px` (mobile, also clears `#lm-bottom-nav`)
- `.lp-main` — `padding-bottom:44px`
- `.v26-body` — `padding-bottom:44px` — **must be set on the element itself** (shorthand `padding` overrides cascade)
- Any new scrollable module container: set `padding-bottom:44px` directly on the element

### Copyright / Footer
- No `<footer>` elements in module divs — they were removed
- Copyright lives in `#global-supp-bar` as a compact `<span>` after the Help button
- Format: `©2026 Vladislav Abramov | <span style="font-weight:600">SM²ARTA™</span>`

## Key Globals & Conventions
- CSS variables: `--ac` (accent), `--tp` (text primary), `--ts` (text secondary), `--sf` (surface), `--bg` (background)
- Font families: `--fd` = DM Sans, `--fm` = IBM Plex Mono
- `ROLE` — `'admin'` or `'viewer'`. Admin-only elements use class `admin-only` (toggled by `applyRole()`)
- `LP_TAB` — current LP tab: `'arrivals'`, `'demand'`, `'plan'`, `'late'`
- `LP_STATE.generatedPlan` — LP truck rows; `LP_STATE.materialPlan` — demand rows
- `PLAN_CACHE[venue]` — LM plan cache per venue; `LM_dateOverrides` — manual truck date overrides

## Bottom Support Bar (`#global-supp-bar`)
Fixed bar at `bottom:0`, `z-index:65`, `height:44px`. Always visible on desktop.
- `#gsb-lm` — LM-specific: Venues toggle, Export, Stock Report, Pallets
- `#gsb-lp` — LP-specific: Export (hidden when no plan generated)
- `#gsb-v26` — V26-specific: Export
- Shared (right side): Backup, Restore, Undo (`.undo-btn`), Help
- On mobile: `#lm-bottom-nav` (z-index:80) sits on top and covers the bar for LM
- Content padding: `#D .cnt, .lp-main, .v26-body { padding-bottom: 44px }`
- Mobile LM: `#D .cnt { padding-bottom: 96px }` (52px nav + 44px bar)

## LP Late Tab
- `LP_renderLate(el, opts)` — full render; computes `window._LP_DEST_BI` from LM truck dispatch dates (via `PLAN_CACHE`)
- `LP_renderLateMain()` — right panel only; uses cached `window._LP_ALL_LATE_ITEMS`, `window._LP_DEST_BI`
- `LP_refreshLate()` — re-renders if Late tab active; called from `LM_changeDate`, `LM_toggleDispatchTruck`, `saveLMVenueSettings`
- `window._LP_EXCL_ABBRS` — excluded destinations Set; preserved across programmatic refreshes via `opts.keepExcl`

## Combined CI Export
- Button "📄 Combined CI" in Demand tab Hold-by-source bar (far right)
- `LP_showCombinedCIModal()` — shows modal with 8 fixed LP destinations (abbrs: TOR/VAN/GDL/CDMX/MTY/NY/KC/HOU)
- `LP_updateCCISources()` — auto-filters sources based on selected destinations (fires on change)
- `_cciAggregateItems(selDestAbbrs, selSrcs)` — filters `materialPlan` by `LP_matchTransitAbbr()`, sums qty
- `LP_exportCombinedCI()` — calls `LP_exportCI_ExcelJS(..., partyOverride)`
- Party logic: all GDL/CDMX/MTY → Mexico; all TOR/VAN → Canada; mixed → blank

## CI Export
- `LP_exportCI_ExcelJS(truckId, items, dest, date, totalPlt, nomenclature, partyOverride)` — 7th param optional
- Rows 11 (headers) and 12–17 (party data) use merged cells: `A:D` (Shipper), `E:I` (Consignee), `J:O` (Broker)
- `LP_getCIParties(dest)` — returns `{consignee:[], broker:[]}` arrays for MEX/CAN/RIC/blank

## Stock Report Persistence (`STOCK_QTYS`)
- **Global state**: `STOCK_SKUS` (Set), `STOCK_QTYS` (obj: sku→qty), `STOCK_REPORT_NAME` (string)
- **Primary save**: `stockReportSave()` → Supabase key `fm-stock` with `{skus, qtys, name}` ✓
- **Primary load**: `stockReportLoad()` → restores full `STOCK_QTYS` from `fm-stock` ✓
- **`saveSharedData()`** → also writes `fm-stock` with `{skus, qtys, name}` — must include `qtys` or it overwrites stockReportSave data (fixed 2026-03-15)
- **Undo snapshot** (`_undoSnap`): includes `lm_stockSkus`, `lm_stockQtys`, `lm_stockName` (fixed 2026-03-15)
- **Undo restore** (`UNDO_restore`): restores all three fields including `STOCK_QTYS` (fixed 2026-03-15)
- **Fallback loads** in `stockReportLoad()`: `lp-truck-state` and `lp-state` keys have SKUs only (no qtys) — legacy path

## Post-Implementation Checklist
After any feature or function change, verify the following:

### Supabase Persistence
- [ ] New state variables saved in `saveSharedData()` (lightweight) or their own dedicated save function
- [ ] New state variables loaded in `loadSharedData()` or their dedicated load function
- [ ] If saving to `fm-stock`, include `qtys` — never save `{skus, name}` only
- [ ] New Supabase keys added to the full-reset delete list in the reset/clear functions (~line 9410)
- [ ] Viewer role check: all save functions guard with `if(ROLE==="viewer")return`

### Undo (`_undoSnap` / `UNDO_restore`)
- [ ] New state variables included in `_undoSnap()` snapshot object
- [ ] Matching restore logic in `UNDO_restore()` for every field added to snapshot
- [ ] `UNDO_updateBtn()` called after any state change that makes undo relevant
- [ ] `UNDO_capture()` called before destructive operations

### Admin/Viewer Role
- [ ] Admin-only buttons/controls have class `admin-only` (hidden for viewers by `applyRole()`)
- [ ] All save/mutate functions guard with `if(ROLE==="viewer")return`
- [ ] Viewer can still view, export read-only data, and use Help/Backup

### Excel Exports
- [ ] All merged cell ranges explicitly set with `mg()` for every row that needs them (not just header row)
- [ ] Party rows 12–17 in CI export maintain merges: `A:D`, `E:I`, `J:O`
- [ ] `partyOverride` param passed through when calling `LP_exportCI_ExcelJS` for Combined CI
- [ ] ExcelJS async functions awaited; errors caught and surfaced to user

### Bottom Support Bar (`#global-supp-bar`)
- [ ] New module-specific buttons placed inside `#gsb-lm`, `#gsb-lp`, or `#gsb-v26` — not in module headers
- [ ] New admin-only bar buttons have class `admin-only`
- [ ] `switchMod()` correctly shows/hides the right `#gsb-*` section
- [ ] Key IDs preserved: `stockBtn`, `stockFileInput`, `lpExportBtn`, `v26ExportBtn`

### Backup / Restore (`masterBackupExport` / `masterBackupRestorePrompt`)
- [ ] New state variables included in backup export payload
- [ ] Matching restore logic reads and applies the new fields from backup JSON

### Reset Functions
Four reset functions exist — any new state must be added to all that apply:

| Function | Scope | What it clears |
|---|---|---|
| `doSystemReset()` | Full app | All Supabase (`.neq('id','')`) + all JS globals |
| `doResetLM()` | LM hard | LM Supabase keys + all LM/stock JS globals |
| `doSoftResetLM()` | LM soft | Only `fm-nom`, `fm-rw` from Supabase; keeps overrides/settings |
| `doResetLP()` | LP hard | LP Supabase keys (`lp-config/nom/demand/arrivals/plan/truck-state`) + all LP JS globals |
| `doSoftResetLP()` | LP soft | Only file/plan keys; keeps dispatched, LSR numbers, pallet overrides, transit days |

**For any new state variable, check:**
- [ ] `doSystemReset` — add JS global clear
- [ ] `doResetLM` — add to JS clear AND Supabase delete list if it's an LM-owned key
- [ ] `doSoftResetLM` — decide: clear or preserve? Add comment to the "preserved" list in code
- [ ] `doResetLP` — add to JS clear AND LP Supabase delete list if it's an LP-owned key
- [ ] `doSoftResetLP` — decide: clear or preserve? Add comment to the "preserved" list in code

**LP Supabase keys** (saved by `LP_saveToSupabase()`): `lp-config`, `lp-nom`, `lp-demand`, `lp-arrivals`, `lp-plan`, `lp-truck-state`
**`lp-truck-state` contains**: dispatched, contDateOverrides, lsrNumbers, palletOverrides, customsOverrides, excludeStaples, arrivedConts, transitDays, holds, lockedRows (added 2026-03-15), stockSkus, stockReportName
**`doSoftResetLP` preserves**: all LP_* globals + `lockedRows` + manual arrivals (`_manual:true` entries in `LP_STATE.arrivals`) — both fixed 2026-03-15
**Manual arrivals**: pushed into `LP_STATE.arrivals` with `_manual:true` by `LP_addArrivalItem()`. `LP_STATE.manualArrivals` is unused/dead code.
**LM/shared Supabase keys** (saved by `saveSharedData()` + dedicated fns): `fm-nom`, `fm-rw`, `fm-vs`, `fm-excl`, `fm-excl-ovr`, `fm-stock`, `fm-lm-dispatch`, `fm-manual-items`, `fm-lm-demand-adj`, `fm-lm-nom-ovr`, `fm-cluster-ta`, `fm-lm-manual-demand`, `fm-lm-kits`, `fm-lm-stp-deliveries`, `fm-dist-overrides`, `fm-pallet-cfg`

### UI / Rendering
- [ ] New buttons/controls render correctly on both desktop and mobile widths
- [ ] Mobile LM padding is 96px (52px `#lm-bottom-nav` + 44px `#global-supp-bar`)
- [ ] `applyRole()` called after any dynamic HTML injection that contains `admin-only` elements
- [ ] `UNDO_updateBtn()` uses `querySelectorAll('.undo-btn')` — both bar and any inline buttons updated
- [ ] Toolbar/bar buttons use `.rbtn` — modal action buttons use `.mbtn` (never mix)
- [ ] Colors use CSS vars from `:root` — no hardcoded hex except border colors for colored button variants
- [ ] Module activation always via `switchMod(mod)` — never manual `classList.add("vis")`
- [ ] New scrollable module containers explicitly set `padding-bottom:44px` (shorthand `padding` will override cascade)

## Dev Environment Notes
- **Shell**: Claude Code uses `C:\Users\vla8529\PortableGit-new\usr\bin\bash.exe`
- **Fork limitation**: msys2 programs (ls, grep, etc.) fail to fork under Node.js. Use Read/Grep/Glob tools instead.
- **Windows executables work fine** in Bash (e.g. `git.exe`)
- **No admin rights** on this machine (FIFA corporate domain)
- **Git**: user.name=SM2ARTA, user.email=sm2arta@outlook.com, remote=https://github.com/SM2ARTA/LM-3000.git

## Editing
- File is large (~9,800 lines) — always use `offset` + `limit` when reading sections
- Use `Grep` with line numbers to locate functions before editing
- Prefer `Edit` over full rewrites
- Key IDs to preserve: `stockBtn`, `stockFileInput`, `lpExportBtn`, `v26ExportBtn`, `lm-bottom-nav`, `global-supp-bar`
