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
