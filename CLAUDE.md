# ML3K — FIFA World Cup 2026 Logistics Manager

## Project Overview
Single-page web application for managing ground transport logistics for FWC26. Handles trucks, stadiums, venues, routes, and staffing across USA, Canada, and Mexico host cities.

## Architecture
- **Single file**: Everything lives in `index.html` (~12,500 lines). No build step, no bundler.
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
- `LP_TRANSIT_DEFAULTS` — `{TOR:7,VAN:7,CDMX:7,GDL:7,MTY:7,KC:1,HOU:1,NY:3}` — migration: if TOR/VAN is 5 (old default), auto-upgraded to 7
- `LP_DEST_WHS_DEFAULTS` — all destinations default to 3 days satellite warehouse processing
- `LP_customsOverrides` — `{sku: {hsCode, country, price, customsName, hsConfirmed}}` — customs data overrides per SKU

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

## HS Code Assistant
3-step wizard in LP Demand tab (🔍 button next to each HS Code cell):

### Step 0 — Siblings + AI + URL
- **Sibling SKU detection**: `_hsFindSiblings(sku)` extracts immediate parent prefix (e.g., `CTBAR-001` from `CTBAR-001-002`), finds siblings in LP demand only (not full nom file) with **confirmed** HS codes (`hsConfirmed===true`), groups by code, shows with HS description + source + product name
- **AI Classification**: URL-first — paste product URL, AI identifies actual product from retailer catalog
- **Country of origin**: AI returns `{primary, alternatives[], reasoning}` — shown as selectable buttons in accept dialog

### AI Providers
- **Claude** (Anthropic): `claude-haiku-4-5-20251001`, uses `anthropic-dangerous-direct-browser-access: true` header for browser CORS
- **ChatGPT** (OpenAI): `gpt-5-mini`, uses `max_completion_tokens` (not `max_tokens` — GPT-5 requirement)
- **Gemini** (Google): `gemini-2.0-flash`, uses `systemInstruction` for system prompt, CORS-friendly natively
- **Prompt**: `_hsBuildPrompt()` builds minimal system+user messages to save tokens. System = format spec (~30 words). User = URL + ref name + material + usage. customsName requested as SHORT (5-8 words). Country = MANUFACTURING origin (not destination).
- **Error handling**: only 401 clears API key; 429/quota shows friendly retry message with raw error detail on click

### AI Key Persistence
- **Three layers**: `localStorage` (instant) + Supabase key `hs-ai-config` (cross-browser) + startup load
- **`_hsSetAI(provider,key)`** → writes to both localStorage and Supabase
- **`_hsClearAI()`** → removes from both localStorage and Supabase
- **`_hsLoadAIConfig()`** → called on app startup (in `Promise.all` with other init), restores from Supabase to localStorage
- **`doSystemReset()`** clears `hs-ai-config` via `.neq('id','')` bulk delete

### HS Code Confirmation
- **`LP_toggleHSConfirm(sku,el)`** — toggles `LP_customsOverrides[sku].hsConfirmed`
- **UI**: ○ (unconfirmed, grey) / ✓ (confirmed, green) button next to HS code input
- **Confirmed cell**: green background (`var(--gs)`), green text, bold
- **In-place update**: does NOT call `LP_render()` — updates styles directly on the DOM element for no jumping
- **Sibling suggestions**: only show confirmed codes (`if(hs&&confirmed)`)
- **Persisted**: stored in `LP_customsOverrides` → `lp-truck-state` → Supabase

### HS Code Normalization
- `_hsNormalize(code)` → strips non-digits → formats as `XXXX.XX`
- Applied in: `LP_setCustomsOvr`, `_lpCustNom`, Excel nom import, nom update merge
- Edge cases: `""` → `""`, `"8301"` → `"8301"` (≤4 digits returned as-is), `"8301.40.0090"` → `"8301.40"`

### Customs Name
- Separate field from product name — stored in `LP_customsOverrides[sku].customsName`
- Own column in demand table (editable, purple when overridden)
- CI exports use `customsName || name` for DESCRIPTION field
- `_lpCustNom(sku)` returns `{name, customsName, unitPrice, hsCode, country}`
- AI suggests SHORT customs names (5-8 words, e.g., "Steel padlock keyed", "Polyester event banner")

### Manual Path (Steps 1-2)
- **Step 1 — 4-digit Heading**: `_hsStep1()` groups `_HS_DB` entries by heading (first 4 digits), shows headings scored by product name keywords, best matches highlighted
- **Step 2 — 6-digit Subheading**: `_hsStep2()` shows all codes under selected heading, scored by name keywords, click to accept
- `_HS_CATS[]` — 17 categories with keywords and chapter mappings
- `_HS_DB[]` — ~200 HS codes across chapters 39–96 (includes 8301.10–8301.70 for locks/padlocks)

### LP Customs Overrides (`LP_customsOverrides`)
- **Structure**: `{sku: {hsCode, country, price, customsName, hsConfirmed}}`
- **Saved in**: `lp-truck-state` via `LP_saveTruckState()` (debounced) or `LP_saveToSupabase()` (full)
- **Loaded from**: `LP_loadFromSupabase()` (both new `lp-truck-state` and legacy `lp-state` paths)
- **Undo**: included in `_undoSnap()` / `UNDO_restore()`
- **Backup**: exported as `Customs Override: SKU` rows in LP Config sheet, restored via `JSON.parse`
- **Hard reset** (`doResetLP`): clears to `{}`
- **Soft reset** (`doSoftResetLP`): **preserved** (not cleared)
- **Nom update** (`LP_updateNomPrompt`): does NOT touch overrides. Nom-level HS/country/price only updated if new file has values AND no override exists for that field
- **`goGenerate`** (initial plan from files): clears to `{}` — correct for first-time generation
- **`LP_regenerate`**: does NOT touch overrides — correct
- **Field name**: `customsOverrides` (camelCase) — consistent across all 3 save paths and both load paths
- **`LP_setCustomsOvr` cleanup**: when clearing a field, preserves the override object if `hsConfirmed` is still true

### Supabase Save Optimization
Three save functions, all write identical `lp-truck-state` payloads:
- **`LP_saveTruckState()`** — saves only `lp-truck-state` key (1 write). Has auto-retry on failure (5s delay)
- **`LP_saveTruckStateDebounced()`** — debounced by 1.5s. Used for: customs edits, holds, transit days, pallet overrides, confirms
- **`LP_saveToSupabase()`** — full 6-key save. Used for: plan generation, file upload, undo restore, backup restore
- **`LP_saveToSupabaseDebounced()`** — debounced full save. Used for: engine settings inputs
- **`beforeunload` handler** — flushes pending debounced saves via `fetch({keepalive:true})` with raw Supabase REST API
- **`_lpSavePending` flag** — tracks unsaved state; `_lpSaveRetry()` retries failed saves after 5s

## Demand Table Filters
- **Source filter**: multi-select checkbox dropdown (`#lpDemSrcDrop`, `.lp-src-chk`)
- **Destination filter**: multi-select checkbox dropdown (`#lpDemDestDrop`, `.lp-dest-chk`)
- Each row has `data-source` and `data-dests="|Houston|Kansas City|..."` attributes
- `LP_filterDemand()` checks text search + selected sources + selected destinations
- **Filter state preservation**: `_lpDemFilterState` saves search/sources/dests; `_lpDemRestoreFilters()` restores after re-render with scroll position preservation
- `_lpDemSrcAll(check)` / `_lpDemDestAll(check)` — select all / none helpers
- Click-outside handlers close dropdowns

## Hold by Source
- **Source select** + **Destination select** + Hold/Release buttons + Combined CI button
- **`_lpHoldSrcChanged()`**: when source selected, shows destination hold status badges below
- Destinations grouped by LP transit abbreviation (`LP_matchTransitAbbr`), displayed with `CITY_ABBR` names
- **Badge indicators**: ▶ green (no holds) / ⚠ yellow (partial) / ⏸ orange (all held) — shows held/total count
- Status auto-refreshes after Hold/Release via `setTimeout(_lpHoldSrcChanged,100)`

## CI Export
- `LP_exportCI_ExcelJS(truckId, items, dest, date, totalPlt, nomenclature, partyOverride)` — 7th param optional
- Rows 11 (headers) and 12–17 (party data) use merged cells: `A:D` (Shipper), `E:I` (Consignee), `J:O` (Broker)
- `LP_getCIParties(dest)` — returns `{consignee:[], broker:[]}` arrays for MEX/CAN/RIC/blank
- **All customs overrides used in CI exports**: DESCRIPTION (`customsName||name`), HS Code (`co.hsCode||nm.hsCode`), Country (`co.country||nm.country`), Unit Price (`co.price||nm.unitPrice`) — applies to both CI sheet (via `_lpCustNom`) and Packing List sheet (via `LP_customsOverrides` direct lookup)
- **CI sheet rows** use `_lpCustNom(sku)` which reads from `LP_customsOverrides` first, then `LP_STATE.nomenclature`
- **Packing List sheet rows** read `LP_customsOverrides[sku]` directly alongside `nomenclature[sku]` param

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
- [ ] Inline edits use `LP_saveTruckStateDebounced()` (1 key, debounced) — NOT `LP_saveToSupabase()` (6 keys, immediate)
- [ ] If adding fields to `lp-truck-state`, update ALL 3 save functions: `LP_saveTruckState`, `LP_saveToSupabase`, and `beforeunload` handler — payloads must match exactly
- [ ] Nom update (`LP_updateNomPrompt`) must NOT overwrite fields that have manual overrides in `LP_customsOverrides`

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
- [ ] CI exports use customs overrides for ALL fields: `co.hsCode||nm.hsCode`, `co.country||nm.country`, `co.price||nm.unitPrice`, `co.customsName||nm.name`
- [ ] Both CI sheet (via `_lpCustNom`) and Packing List sheet (via direct `LP_customsOverrides` lookup) must use overrides

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
| `doResetLP()` | LP hard | LP Supabase keys (`lp-config/nom/demand/arrivals/plan/truck-state`) + all LP JS globals (incl. excludeStaples, destWhsDays) |
| `doSoftResetLP()` | LP soft | Only file/plan keys; keeps dispatched, LSR numbers, pallet overrides, customs overrides, transit days, destWhsDays, excludeStaples, holds |

**For any new state variable, check:**
- [ ] `doSystemReset` — add JS global clear
- [ ] `doResetLM` — add to JS clear AND Supabase delete list if it's an LM-owned key
- [ ] `doSoftResetLM` — decide: clear or preserve? Add comment to the "preserved" list in code
- [ ] `doResetLP` — add to JS clear AND LP Supabase delete list if it's an LP-owned key
- [ ] `doSoftResetLP` — decide: clear or preserve? Add comment to the "preserved" list in code

**LP Supabase keys** (saved by `LP_saveToSupabase()`): `lp-config`, `lp-nom`, `lp-demand`, `lp-arrivals`, `lp-plan`, `lp-truck-state`
**`lp-truck-state` contains**: dispatched, contDateOverrides, lsrNumbers, palletOverrides, customsOverrides, excludeStaples, arrivedConts, transitDays, holds, lockedRows, stockSkus, stockReportName, destWhsDays
**`doSoftResetLP` preserves**: all LP_* globals + `lockedRows` + `customsOverrides` + manual arrivals (`_manual:true` entries in `LP_STATE.arrivals`) — both fixed 2026-03-15
**Manual arrivals**: pushed into `LP_STATE.arrivals` with `_manual:true` by `LP_addArrivalItem()`. `LP_STATE.manualArrivals` is unused/dead code.
**LM/shared Supabase keys** (saved by `saveSharedData()` + dedicated fns): `fm-nom`, `fm-rw`, `fm-vs`, `fm-excl`, `fm-excl-ovr`, `fm-stock`, `fm-lm-dispatch`, `fm-manual-items`, `fm-lm-demand-adj`, `fm-lm-nom-ovr`, `fm-cluster-ta`, `fm-lm-manual-demand`, `fm-lm-kits`, `fm-lm-stp-deliveries`, `fm-dist-overrides`, `fm-pallet-cfg`
**Other Supabase keys**: `hs-ai-config` (AI provider + API key, saved by `_hsSetAI`, loaded by `_hsLoadAIConfig` on startup)

### UI / Rendering
- [ ] New buttons/controls render correctly on both desktop and mobile widths
- [ ] Mobile LM padding is 96px (52px `#lm-bottom-nav` + 44px `#global-supp-bar`)
- [ ] `applyRole()` called after any dynamic HTML injection that contains `admin-only` elements
- [ ] `UNDO_updateBtn()` uses `querySelectorAll('.undo-btn')` — both bar and any inline buttons updated
- [ ] Toolbar/bar buttons use `.rbtn` — modal action buttons use `.mbtn` (never mix)
- [ ] Colors use CSS vars from `:root` — no hardcoded hex except border colors for colored button variants
- [ ] Module activation always via `switchMod(mod)` — never manual `classList.add("vis")`
- [ ] New scrollable module containers explicitly set `padding-bottom:44px` (shorthand `padding` will override cascade)
- [ ] Inline edits (HS confirm, customs fields) should update DOM in-place — avoid `LP_render()` for single-cell changes to prevent scroll jumping
- [ ] If `LP_render()` is unavoidable, `_lpDemRestoreFilters()` runs via `setTimeout(...,0)` to restore filter state + scroll position
- [ ] HS confirm button (`.hs-conf`) is ALWAYS rendered in DOM (with `display:none` when HS empty) — `LP_customsInput` shows it when HS code entered
- [ ] `LP_customsInput` must update: input styles (purple), confirm button visibility, and parent `<td>` background (green if confirmed)

## System Audit (2026-03-15)
Comprehensive audit with dummy data tracing. All findings fixed in commit `0d10c4d`.

### Bugs Found & Fixed
1. **`LP_destWhsDays` not persisted** (HIGH) — was missing from all 3 truck-state save payloads and both load paths. Changes lost on reload. Fixed: added to `LP_saveTruckState`, `LP_saveToSupabase`, `beforeunload`, and both `LP_loadFromSupabase` paths.
2. **`doResetLP`/`doSystemReset` incomplete** — `LP_excludeStaples` and `LP_destWhsDays` not reset. Fixed: added to all reset lines.
3. **`goGenerate` incomplete** — same missing resets. Fixed.
4. **Backup restore loses `STOCK_QTYS`** — `fm-stock` save after restore was `{skus, name}` without `qtys`. Fixed: added `qtys:STOCK_QTYS`.
5. **Backup export missing Stock qty column** — Stock Report sheet only had SKU+Name. Fixed: added Qty column and `__REPORT_NAME__` marker row.
6. **CI Packing List ignored overrides** (fixed earlier) — `nm.hsCode/country/unitPrice` used directly instead of `co.hsCode||nm.hsCode` etc.
7. **HS confirm button not in DOM for empty HS** (fixed earlier) — now always rendered with `display:none`.

## System Audit (2026-03-19)
Comprehensive automated audit across all subsystems. Fixes in commits `65f8e0d` and `2b64e3f`.

### Bugs Found & Fixed
1. **LP dirty flag missing stock hash** (CRITICAL) — `LP_settingsChanged()` didn't detect stock report changes. Plan stayed "clean" after stock upload. Fixed: added `_stockHash()` to dirty flag + snapshot.
2. **LP demand rationing non-deterministic** (HIGH) — `Object.keys(open)` iteration order depended on file row order. Different users could get different allocations. Fixed: sort destination keys alphabetically before rationing.
3. **LP leftover items exceeded truck capacity** (HIGH) — Post-processing appended all remaining demand to last truck without capacity check, creating 40+ pallet trucks. Fixed: leftovers now respect MAX_PLT, spill into new trucks.
4. **LP stock holds stale after dispatch** (HIGH) — `LP_toggleDispatch()` didn't recompute stock holds. Fixed: added `LP_recomputeStockHolds()` call.
5. **Init config loads silently swallowed errors** (MEDIUM) — 13 parallel Supabase loads all had `.catch(()=>{})`. Fixed: errors now logged with config names.
6. **Dead `_arrDateHash` duplicate** (LOW) — Two definitions, first overwritten by second. Fixed: removed first, replaced with `_stockHash()`.
7. **Dead `ppu` parameter in `_pqUomEff`** (LOW) — Parameter passed but ignored (identity function). Fixed: removed parameter.

## System Audit (2026-03-20)
LP Engine V4.5 audit (now V5). All findings verified.

### LP Engine V4.5 → V5 Changes
1. **SR deferral guard in buildOneTruck** — defers non-SR loading when future SR arrivals expected. Truck goes to pending buffer, topped up daily with SR-only items.
2. **SR-only guard in _topUpPending** — pending trucks only receive SR items while future SR arrivals exist. Non-SR allowed only when no more SR coming.
3. **trucksToday counting fixed** — deferred trucks now count toward maxTrk per day.
4. **maxTrk on emit date** — `_emitByDate` counter prevents emitting too many trucks on one date. Force-flush at end of planning bypasses limit.
5. **Dead code removed** — `floorFullPallets`, `floorSpaces`, `READY_MIN`, `destIsReady`, `destHasFuture` removed. `advBlk` unused but retained.
6. **Stale comment** — line 897 says "pieces per pallet" but pq is UoM per pallet. Cosmetic only.

### Known Acceptable Behaviors
- `_hsNormalize` truncates beyond 6 digits (e.g., `8301.40.0090` → `8301.40`) — intentional for 6-digit HS level
- Price of `$0.00` cannot be stored as override (`parseFloat('0')||0` = 0, treated as "clear") — acceptable for this domain
- `LP_saveTruckStateDebounced` timer not cancelled by `LP_saveToSupabase` — causes redundant write but no data loss
- Undo does not capture `LP_STATE.nomenclature/materialPlan/arrivals` — intentional (undo covers mutations, not file imports)
- `hs-ai-config` excluded from backup — intentional security measure (API keys)

### Destination Filter Quick-Select
- `_lpDemDestGroup(region)` — selects destinations by country: `can` (Toronto, Vancouver), `mex` (Mexico City, Guadalajara, Monterrey), `usa` (Houston, Kansas City, New York)
- Buttons with country flags in the destination dropdown: 🇨🇦 CAN, 🇲🇽 MEX, 🇺🇸 USA

## LM Engine (`build()`)

### Early Path Bin-Packing
- Items before the main bump-in start date (`biSK`) go through the early path
- Pre-computes total pallets, creates `n = ceil(totalPlt / tCap)` trucks
- Sorts items by pallet size descending, then bin-packs with best-fit
- **Oversized item splitting**: when no truck can fit the entire item, finds truck with most space, fits as many full pallets as possible, remainder goes to a new truck
- Creates new trucks dynamically via `while(rem.loadQty > 0)` loop — respects tCap per truck

### Sweep Path (Final Pool Drain)
- After all main passes (scheduled, top-up, future-pull, mop-up, no-pallet), the final sweep guarantees every pool piece is loaded
- Tries to fit remaining items on last truck with space
- **Split + multi-truck**: if item exceeds remaining space, fills current truck with as many full pallets as possible, then creates new trucks in a `while(sw.loadQty > 0)` loop — each new truck respects tCap
- Sweep items tagged with `pulledFrom:'pool-sweep'`

### Date Rules Integration
- Per-date overrides from `VS[venue].dateOverrides[dateKey]` control: `dayTCap` (truck capacity), `dayMaxT` (max trucks), `noTopUp` (skip top-up logic)
- `noTopUp` skips both the pallet-completion pass and the pool top-up sweep for that date
- Constraints inherited from overflow source date when items carry over

## Help Section
- 5 tabbed sections: Overview, Load Plan, Last Mile, Vision 2026, Operations
- `_hlpTab(btn, id)` — switches active tab, shows/hides `.hlp-sec` sections
- Visual flow diagrams, data tables, styled cards explaining each module's workflow
- Tabs styled with `.hlp-tab` class, active state `.act`

## Module Layout (viewport-locked)
All three modules use `height:100vh;overflow:hidden` — no page-level scrollbar:
- `#D` (LM): `.hd` sticky header → `.cnt` (flex:1, overflow:hidden) → sidebar + main scroll
- `#LP`: `.hd` sticky header → `.lp-body` (flex:1, overflow:hidden) → `.lp-tabs` + `.lp-main` (flex:1, overflow-y:auto, position:relative)
- `#V26`: `.hd` sticky header → `.v26-body` (flex:1, overflow-y:auto)
- LP Late tab: uses `position:absolute;inset:0` inside `.lp-main` to avoid layout reflow
- `.mod-sw` (module switcher): `flex-shrink:0`, each `.mod-btn` has `min-width:88px;text-align:center` for stable sizing

## Dev Environment Notes
- **Shell**: Claude Code uses `C:\Users\vla8529\PortableGit-new\usr\bin\bash.exe`
- **Fork limitation**: msys2 programs (ls, grep, etc.) fail to fork under Node.js. Use Read/Grep/Glob tools instead.
- **Windows executables work fine** in Bash (e.g. `git.exe`)
- **No admin rights** on this machine (FIFA corporate domain)
- **Git**: user.name=SM2ARTA, user.email=sm2arta@outlook.com, remote=https://github.com/SM2ARTA/LM-3000.git

## UoM (Unit of Measurement) System
The entire system operates in UoM (packs, boxes, rolls, etc.), not raw pieces.

### PPU (Pieces Per UoM)
- `NOM[sku].ppu` — pieces per unit (e.g., 50 for a pack of 50 hangers)
- PPU=1 means Each (1 piece = 1 UoM)
- `effQty = ceil(rawQty / ppu)` — ceiling applied per material plan line (per venue+logicalSpace+project)

### LM Module
- `_rwEnrichEffQty()` — computes `_effQty` on every RW row after NOM is loaded
- `bV()` and `build()` read `r._effQty` (UoM) — never raw `Required`
- Pallet calc: `effQty / pq * ps` — `pq` is already UoM-aligned (no PPU division)
- `_pqUomEff(pq)` — identity function, returns `pq` as-is (matches LP logic)
- `_pqUom(sku)` — returns `NOM[sku].pq` directly (no PPU division)
- Kit items stored in UoM (already ceiling'd at creation)
- Stock (`STOCK_QTYS`) is in UoM

### LP Module
- **Demand source**: `materialPlan[].requiredQty` stored in pieces (Supabase)
- **Demand effective**: `materialPlan[].effQty` = per-row ceiling, saved alongside requiredQty
- **Engine**: reads `d.effQty` (UoM), outputs `r.qty` (UoM)
- **palletQty**: manually maintained, already UoM-aligned — do NOT divide by PPU in engine
- **Stock/arrivals**: already in UoM — no conversion needed
- **unitPrice**: per UoM — `qty × unitPrice` is correct
- **`_lpEffQty()`**: identity function (returns input unchanged) — all LP quantities already UoM
- **`lp-demand-raw`**: Supabase archive of raw parsed rows (pieces, per-line) for PPU recalc
- **`engineUnit:'uom'`**: flag in lp-config, triggers one-time plan row migration from pieces to UoM

### LP Update Demand (`LP_updateDemandPrompt`)
- Parses new material plan file → raw rows (pieces)
- Archives to `lp-demand-raw` Supabase key
- `_lpAggregateDemand(rawRows)` applies per-row ceiling → effQty
- `LP_regenerate()` preserves locked trucks, replans rest
- Button in `#gsb-lp`, admin-only, visible when plan exists

### LP Update Nom (`LP_updateNomPrompt`)
- Merges new nom into existing (preserves manual overrides)
- ALWAYS re-aggregates demand from `lp-demand-raw` (handles PPU changes)
- Regenerates plan if PPU or palletQty changed
- Does NOT overwrite: customsName (manual-only), palletQty/Spc (if LP_palletOverrides exist)

### LP Dirty Flag (`LP_settingsChanged`)
Tracks plan-invalid state. Includes hashes of:
- maxPallets, maxTrucks, maxDests, turnaround, ricStartDate
- LP_contDateOverrides, LP_palletOverrides, LP_holds+LP_stockHolds
- LP_STATE.arrivals dates, LP_transitDays, demand qty
- STOCK_SKUS + STOCK_QTYS (via `_stockHash()`) — plan flagged stale after stock report change

### LP Engine V5 Architecture
Two buckets: MEX/CAN first (with consolidation + SR deferral), then USA/RIC.
Post-build: `_lpTailReconstruct` optimizes last 2 unlocked trucks per (dest,date).

**buildOneTruck** — 4-pass loading with SR deferral:
1. SR whole pallets (greedy, largest pallet space first)
2. SR partial pallets (sub-pallet quantities)
3. **Deferral guard**: if truck has SR items but isn't full, AND destination has remaining SR demand, AND future SR arrivals exist in `delta` → return `{pending:true}` instead of loading non-SR items
4. Non-SR whole pallets (only if not deferred)
5. Non-SR partial pallets

**planStream** — day-by-day planner with consolidation buffer:
- `pending[dest]` holds partial/deferred trucks
- `_topUpPending(dest, date)`: fills pending trucks with newly available stock; SR-only while future SR arrivals expected, all items when no more SR coming
- `_emitPending(dest, force)`: emits truck to plan; respects `maxTrk` per date via `_emitByDate` counter; force=true for end-of-planning flush
- `FULL_THRESH` = 90% of MAX_PLT — pending trucks emit when reaching this threshold
- Deferred trucks count toward `trucksToday` (prevents exceeding maxTrk on build day)

**Constraint enforcement**:
- `maxTrk` per day: enforced in build loop (`trucksToday`) AND emit path (`_emitByDate`)
- `maxDst` per day: enforced in scoring (`allowed` set)
- `MAX_PLT` per truck: enforced in `_loadWhole`/`_loadPartial` capacity checks
- Bucket order: MEX/CAN consumes stock first, USA gets remainder (no fPtr reset)

### LP Engine V5 Tail Reconstruction (`_lpTailReconstruct`)
- Runs after `LP_buildPlanV3` returns, before save/render
- Groups plan rows by `(destination, date)`, selects last 2 unlocked non-OOR trucks per group
- **Merge**: if combined pallets ≤ MAX_PLT, merge into one truck (lower ID survives)
- **Reconstruct**: if combined > MAX_PLT, pools both trucks' items and repacks via exhaustive search
- **Exhaustive search**: for each reconstructable SKU, tries 0..N whole pallets ± sub-pallet remainder; finds combination closest to MAX_PLT
- **Stock-readiness**: tracks per-SKU availability via waterfall (same as render). Prefers all-ready solutions at ≥90% fill over higher-fill solutions with unready items
- **Waterfall**: walks all trucks in date+id order, deducts stock consumed by earlier trucks; OOR trucks skip deduction
- **Passthrough SKUs**: items with no nom or <1 whole pallet keep original truck assignment
- **Invariants**: qty per (dest,sku), pallets per dest (±0.01), no overflow, locked/OOR fingerprints, no new dests/dates, truck count, no negative values
- **Abort**: any invariant failure → returns original plan unchanged; LSR cleanup deferred until after invariants pass
- **Protected trucks**: locked (`LP_dispatched`) and OOR (`LP_oorTrucks`) are fingerprinted before/after; never touched as candidates, donors, or receivers
- **Legacy**: `_lpTailMerge` and `_lpTailRebalance` preserved as inactive code for rollback
- **Call sites**: `LP_regenerate()` (full + partial) and `goGenerateLP()` — single `_lpTailReconstruct(plan, maxPlt)` call

### LP Engine Leftover Logic
- After both buckets, post-processing distributes remaining demand across trucks per destination
- Respects MAX_PLT (26 pallets) capacity — if adding an item would exceed capacity, a new truck is created
- Includes both no-pallet SKUs (`pallets:0`) and partial-pallet leftovers (actual pallet calc)
- Requires stock availability
- `_leftover:true` flag on plan rows (not persisted to Supabase)
- Demand rationing sorts destination keys alphabetically for deterministic allocation across browsers/sessions

### LP Engine pq (palletQty) Basis
- `pq` is in UoM units per pallet — NOT pieces per pallet
- `pq` is NOT divided by PPU in the engine — data must be UoM-aligned before input
- Engine comment at line 897 says "pieces per pallet" but this is stale — pq is UoM per pallet

### LP Stock Report Integration
- Stock report upload triggers `LP_regenerate()` — stock SKUs affect engine's inventory timeline (`readyDate=today`)
- Stock report reset also triggers `LP_regenerate()` + `LP_recomputeStockHolds()`
- `LP_toggleDispatch()` calls `LP_recomputeStockHolds()` — holds stay fresh after dispatch changes
- `LP_settingsChanged()` includes `_stockHash()` — plan flagged dirty when stock changes

### LP Demand Tab Filters
- **Chip-style** destination and source filters (same as Status tab)
- Logic-level filtering: affects KPI totals, not just row visibility
- `_lpDemDests` / `_lpDemSrcs` Sets — toggle on click, trigger full re-render
- No STAPLES checkbox — use source chips instead
- Text search still works for row filtering (DOM-level)

### LP Sync Buttons
- `syncLM()`, `syncLP()`, `syncV26()` — per-module refresh from Supabase
- Green pill button in header, visible for all roles (not admin-only)
- Spinning animation while loading

### Delivery Strategy (Kit Setup)
- `LM_STP_STRATEGY` — per country + venue type: STP (direct/kit) + FF&E (direct/kit)
- Country tabs: USA / CAN / MEX
- Auto-creates STP deliveries or kits (`_auto:true` flag)
- Manual overrides preserved
- Supabase key: `fm-stp-strategy`

### Kit System
- Kit types: FF&E (`FNKIT-002-{truckId}-NN`) / Stationery (`OSKIT-002-{truckId}-NN`)
- Kit SKUs renamed in `numberAll()` after truck IDs assigned — includes truck ID + sequential number (e.g., `OSKIT-002-LM-2-01`)
- Kit items in UoM (ceiling applied at creation)
- Kit readiness: `LM_kitReadiness(kitId)` — compares stock vs component qty (both UoM)
- Kit OOR export: formatted Excel with government template styling (`_oorSheet`)
- Truck export: two tabs — Kit (aggregated) + All (expanded components)
- **Kit list modal**: `LM_showKitList()` — click kit badge in demand view to see all kits; filter by FF&E/Stationery; click row to inspect
- **Batch OOR export**: `_klExportSelected()` — select kits via checkboxes, download as ZIP of individual OOR Excel files (uses `fflate.zipSync`)
- **ASN Inbound Form**: `_klExportASN()` — generates government-template Excel per truck with kit details (Ship from: WHS Kitting, UoM: Kit, Qty: 1)
- **Cluster demand view**: Add/Kit/STP buttons hidden when multiple venues selected (only show for single-venue view via `prefillV`)
- **Validation on demand change**: `_stpValidateVenues()` checks kit venue names still exist after file upload/sync, warns orphaned venues, removes components referencing missing SKUs from kit items

### LP Supabase Keys
`lp-config`, `lp-nom`, `lp-demand`, `lp-demand-raw`, `lp-arrivals`, `lp-plan`, `lp-truck-state`

### Multi-STP Delivery System
- **Multiple deliveries per venue** — `LM_STP_DELIVERIES[]` is an array of `{id, venue, date, rate, items?, _auto?}`
- **`LM_STP_TRUCKS`** — keyed by delivery ID (`del.id`), not venue name. Each delivery gets its own built truck object
- **Explicit `.items` field** — deliveries with `.items` array get only those specific SKU/qty pairs; used for split deliveries
- **Auto-remainder** — first delivery without `.items` receives all unallocated STP demand for that venue (remainder after explicit splits)
- **Split UI** — detail modal allows splitting items from one delivery to a new one; search + checkbox selection; new delivery gets `items:splitItems`; original reverts to auto-remainder if all items moved
- **`_stpAllocMap(venue)`** — computes allocation tracking: total STP demand vs allocated across all deliveries for that venue; returns `{sku: {total, allocated, remaining}}`
- **`_stpValidateVenues()`** — defensive validation on file upload/sync: checks venue names still exist in VN, marks orphaned deliveries `_stale=true`, removes references to missing SKUs from explicit `.items`, warns user
- **All function signatures use delivery ID** — `LM_deleteStp(delId)`, `LM_showStpDetail(delId)`, `LM_showStpSplit(delId)`, etc.
- **`_stpNextId`** — monotonic counter for delivery IDs (`STP-1`, `STP-2`, ...); persisted in undo snapshots and Supabase

### LP Matching (`LP_matchTransitAbbr`)
- **Two-pass matching** to resolve destination strings to transit abbreviations (TOR, VAN, CDMX, GDL, MTY, HOU, KC, NY)
- **Pass 1**: full city name match via `CITY_ABBR` lookup — sorted by city name length descending (longest match first). Prevents "Monterrey" matching "TOR" before "MTY"
- **Pass 2**: word-boundary abbreviation regex (`\bABBR\b`) for formats like "CAN TOR", "MEX CDMX"
- **`LP_ARRIVAL_FIFO`** — truckId coerced to `String()` for consistent sort order in FIFO waterfall

## Assembly Timeline
Appears in LM Dashboard (All Venues view + individual venue views). Shows full supply chain date chain for items requiring warehouse assembly.

### `LM_isAssembled()` — 6-path Decision Matrix
`LM_isAssembled(sku, venueType, country)` — returns `true` when SKU needs physical assembly at WHS.

| Venue Type | Base Mode | Override? | Effective | Returns | Reason |
|---|---|---|---|---|---|
| Stadium/IBC | dis (cfg.mode) | Yes (D→A) | asm | **true** | Explicit assembly override |
| Stadium/IBC | dis | No | dis | false | Default disassembled |
| Non-stadium (CAN/MEX) | asm (country default) | Yes (A→D) | dis | false | User wants disassembled |
| Non-stadium (CAN/MEX) | asm | No | asm | **true** | Default assembly |
| Non-stadium (USA) | dis | Yes (D→A) | asm | false | Cross-country artifact — skip |
| Non-stadium (USA) | dis | No | dis | false | Default disassembled |

- Requires `nm.pqA && nm.psA` (assembled pallet dimensions) to be non-zero
- Base mode: Stadiums/IBC use `LM_palletCfg[venueType].mode`; non-stadiums use `LM_COUNTRY_DEFAULTS[country]`
- Override: `LM_palletCfg[venueType].overrides.has(sku)` flips the base mode

### Supply Chain Date Chain (5 columns)
1. **Arrives Dallas** — from stock report (`in-stock`) or earliest container arrival ready date for SKU
2. **Leaves Dallas** — LP truck ship date (for LP-fed destinations) or computed backwards for non-LP
3. **Arrives Satellite** — LP arrival date (ship + transit) or computed backwards from leaves satellite
4. **Leaves Satellite** — dispatch date computed from bump-in minus outbound transit minus WHS processing
5. **Bump-in** — venue bump-in date from schedule

### LP FIFO Waterfall (LP-fed destinations)
- `LM_buildLPArrivalFifo()` — builds `LP_ARRIVAL_FIFO[abbr][sku][]` from `LP_STATE.generatedPlan`; each entry has `{date, shipDate, qty, truckId}`, sorted by date then truckId
- `LM_skuArrivalFifo(sku, lpAbbrs, neededQty)` — walks FIFO queue consuming arrivals until `neededQty` satisfied; returns `{firstArr, firstTrk, readyBy, readyTrk, firstShip, readyShip}` or null
- Dates: `firstArr` = earliest arrival, `readyBy` = date when cumulative arrivals >= neededQty

### Non-LP Date Computation
For non-LP venues (e.g., CAN/MEX regional WHS), dates computed backwards from bump-in:
- `leavesWhs` = dispatch date (BI − outbound transit − WHS processing)
- `arrivesWhs` = `leavesWhs` − WHS processing days (`gWP()`)
- `lpDeparts` = `arrivesWhs` − inbound transit days (`gLT2()`)

### Status Logic
| Status | Condition |
|---|---|
| On time | `arrivesWhs` exists and `arrivesWhs <= leavesWhs` |
| Xd late | `arrivesWhs > leavesWhs` (satellite arrival after required departure) |
| Xd late (Dallas) | `arrivesDallas > lpDeparts` (Dallas arrival after LP truck departure) |
| No LP data | LP-fed destination but FIFO returned null |
| Not in LP | SKU not found in LP plan for any matching destination abbreviation |

### WHS Name Resolution
| Venue Context | Assembly At |
|---|---|
| IBC | Dallas Warehouse |
| CAN stadium | `{city} / ... Warehouse` (from cluster name, stripping `CAN ` prefix) |
| MEX stadium | `{city} / ... Warehouse` (from cluster name, stripping `MEX ` prefix) |
| USA stadium | `{city} Satellite Warehouse` (or `Dallas Warehouse` for Dallas Stadium) |
| CAN non-stadium | `{city} Warehouse` |
| MEX non-stadium | `{city} Warehouse` |
| USA non-stadium | `{cluster} Satellite Warehouse` |
| No cluster | Dallas Warehouse |

### Excel Export (`LM_exportAsmTimeline`)
- ExcelJS workbook with all Assembly Timeline columns + styled headers
- Stored in `window._asmTimelineData` after dashboard render

## Kitting Timeline
Appears in LM Dashboard **All Venues view only** (not filtered/region/cluster).

- Iterates all trucks in `PLAN_CACHE`, finds items with kit nomenclature (`nm._kitNom`) and FNKIT/OSKIT prefix
- **Columns**: Dispatch, Truck, Destination, Type, Kit, Venue, Components, Readiness
- **Type column**: FF&E (green, `FNKIT` prefix) or Stationery (orange, `OSKIT` prefix)
- **Readiness badges**: color-coded by percentage — green (100%), orange (50-99%), red (<50%); shows `pct% (inStock/total)`
- **Component tooltips**: hover on kit name shows component list with quantities
- Sorted by dispatch date then truckId
- Stored in `window._kitTimelineData`
- **Excel export**: `LM_exportKitTimeline()` — ExcelJS workbook with all Kitting Timeline columns

## Per-Venue Constraints
Stored in `VS[venue]` (venue settings), accessed via helper functions:

### Transit & Processing Parameters
| Parameter | Function | Default | Description |
|---|---|---|---|
| Inbound transit (d) | `gLT2(v)` | `LM_DEFAULT_LT[v]` or 0 | Dallas → satellite WHS transit days. Non-LP venues only |
| WHS processing (d) | `gWP(v)` | `LM_DEFAULT_WP[v]` or 0 | Days at satellite WHS for assembly/processing. Default 3d for USA stadiums |
| Outbound transit (d) | `gLT(v)` | 0 | WHS → venue transit days (within city, typically 0) |
| Truck capacity (plt) | `gTC(v)` | Per-venue default | Pallet capacity per truck |
| Max trucks/day | `gMT(v)` | Per-venue default | Maximum trucks that can arrive per day |

### Date Rules (Per-Date Overrides)
- Stored in `VS[venue].dateOverrides[dateKey]` as `{tc?, mt?, noTopUp?}`
- **tc**: override truck capacity for that specific date
- **mt**: override max trucks/day for that date
- **noTopUp**: boolean — skip pallet-completion and pool top-up logic; load only exact scheduled quantities
- **Inheritance on overflow**: when items carry over to next day, inherited constraints (`_inheritedCap`, `_inheritedNoTopUp`) apply if no local date rule exists

### Dispatch Date Formula
- **LP-fed venues**: `dispatch = bump-in − outbound_transit − WHS_processing`
- **Non-LP venues**: `dispatch = bump-in − outbound_transit − WHS_processing − inbound_transit`
- Additional adjustments: USA cluster turnaround (`LM_clusterTurnaround`, default 5d)

## LM Dashboard KPIs
- **Pallets**: total demand pallets from VN (consistent with sidebar labels)
- **Pieces**: total venue effQty including ALL sources (STP items counted in `bV()` via `a[v].it`)
- **LM Trucks**: sum of `calMap[d].trucks` — only freight trucks, not STP/CORT
- **Dispatch Days**: counts only days with LM freight trucks (`calMap[d].trucks > 0`), excludes STP-only and CORT-only days
- **Peak/Day**: max LM freight trucks on any single day
- **CORT card**: shows when `totalCort > 0` — count + pcs
- **Staples card**: shows when venue has STP truck in `LM_STP_TRUCKS` (not just dated deliveries) — count + qty + days
- **STP in DDD**: undated STP deliveries fall back to venue's first LM dispatch date from `PLAN_CACHE`
- **Staples truck/qty counting**: iterates `LM_STP_TRUCKS` directly (not calMap) so all venues with STP trucks appear regardless of delivery date

## Editing
- File is large (~12,000 lines) — always use `offset` + `limit` when reading sections
- Use `Grep` with line numbers to locate functions before editing
- Prefer `Edit` over full rewrites
- Key IDs to preserve: `stockBtn`, `stockFileInput`, `lpExportBtn`, `v26ExportBtn`, `lm-bottom-nav`, `global-supp-bar`

## Supply Chain Presentation (`supply-chain-overview.html`)

### Overview
- **22 slides**, single HTML file, FIFA brand colors
- CSS custom properties: `--pri` (#4A148C purple), `--a3` (#304FFE blue), `--a4` (#03BFA5 teal), `--sec` (#751312 burgundy)
- Viewport: `1920×1080`, padding `72px 90px`
- Served via `_server.js` on port 8888
- Print: `@page size:20in 11.25in`
- All data sourced from ML3K Supabase + Supply Chain system screenshots

### Slide Structure
1. **Title** — 166,311 LM items, disclaimer, FIFA WORLD CUP 2026™
2. **Journey** — two-phase (LP push / LM pull), 6-step flow, timeline overlap bar (LP: Mar 9–Apr 29, LM: Apr 3–Jun 9)
3. **Suppliers** — 8 suppliers, 40 containers (Mar 9–Apr 10), 20 local deliveries
4. **Dallas Engine Room** — 192+ SKUs, ~93 LP trucks, 201 kits, 850 assembly items, arrivals chart SVG
5. **LP Routes Map** — ~93 trucks to 8 destinations (excl Staples), 57,566 UoM, SVG map with route lines
6. **Warehouse Models** — Regional (5, Space Rent) + Satellite (8, Pallet Spaces), assembly 4,258 items, 3-column layout
7. **MEX/CAN Regional** — 5 regions (CDMX 52, GDL 38, MTY 32, TOR 25, VAN 30), 177 LM trucks, 3,422 assembly items
8. **USA Last Mile** — 292 LM trucks, 166 CORT, 39 Staples, 130,840 items, satellite + CORT model
9. **Venue Assembly** — 6,658 RGS items at 10 stadiums + IBC, per-stadium table, tools per stadium (10 tools, 3 sets each), VLM tools disclaimer
10. **CORT Stadiums** — 2,128 items, What's Ours/Theirs, 37 CORT SKUs (24 rental + 13 retail), 32,627 items
11. **Staples** — USA Direct/Kits/MEX&CAN, 166 SKUs, 83 kits, 69 direct, delivery split table
12. **Kitting Operations** — "One Box, Everything Inside" — before/after visual (12 items → 1 kit SKU), CORT cross-dock context (won't pick-and-pack, only cross-dock, pre-built kits, per bump-in), FF&E kits (🔧 tools/fixtures, FNKIT, ~12 items) + Stationery kits (📎 office supplies, OSKIT, ~14 items, packed by Staples — via Dallas or direct TBC), WHS kitting process (Decide → OOR → Pack → ASN Inbound → Ship 1 kit SKU on OOR → Venue), 118 FF&E kits / 214 venues, readiness tracking (100%/67%/0%). Pure HTML/CSS.
13. **Cardboard Furniture** — Re-Board tables (900) + LOOK welcome desks (278), product images
14. **Operations Matrix** — 214 venues, full route/WHS/assembly breakdown table, MEX/CAN/USA/CORT rows
15. **Action Items** — 6 workstreams in 3×2 grid (Materials, Customs, Distribution, Warehousing, Venue Logistics, CORT)
16. **Timeline** — 94-day SVG (Mar 9–Jun 11), Phase 1 LP bars (Bucket 1/2), Phase 2 LM bars (Apr 3–Jun 9), assembly (Apr 15–Jun 29), KICKOFF star, summary chips
17. **Platform (ML3K)** — ml3000.smmarta.com, credentials view/me, LP Engine V5.1 + LM Engine details
18. **LP Engine V5.1** — Three-stage visual: Plan (two-bucket with stock pool + V5.1 stock rebuild between buckets), Build (4-pass SR-first loading), Optimize (tail reconstruction with 162B+ search). Real example flow: LP-31 Monterrey walkthrough. Constraint cards (26 plt, 4 trucks, 2 dests).
19. **LM Engine** — Three-section visual: Dispatch dates (bump-in − lead time, MEX/CAN 0d, USA 0–3d), Fill each truck (3-pass: scheduled → top-up → pool → future), Day loop & overflow (carry-over, max trucks/day, no-BI items, CORT separate)
20. **Late Engine** — "Will It Arrive on Time?" — 3 KPI cards (166K items, ~500 trucks, 3 paths), path determination logic, three-column layout: Path 1 LP-Fed (journey strip + 4 "what can go wrong" cards), Path 2 USA via Satellite (backwards computation story + chain visual), Path 3 Dallas Direct + outputs (Dashboard/Digest) + WHS processing defaults. Pure HTML/CSS (no SVG).
21. **Assembly Timeline** — Date chain logic (5-step flow diagram), LP-fed vs non-LP paths, 6-path assembly detection matrix, WHS routing, constraint parameters, status indicators
22. **Risk Register** — 7 top risks with likelihood/impact/mitigation, critical window + peak risk + monitoring callouts

### CSS Design System
- Standardized spacing: `.sub-tight` (16px), `.sub-std` (24px), default `.sub` (32px)
- Card tiers: `.cv-sm` (24px), `.cv-md` (28px), default `.cv` (36px)
- Disclaimer callouts: `callout callout-red` with `padding:10px 18px;font-size:11px` — consistent across all slides
- Badge colors: `badge-pri` (purple), `badge-a3` (blue), `badge-a4` (teal), `badge-sec` (burgundy), `badge-rd` (red)
- All slides use consistent header (`.hd`), footer (`.ft` with `.sn` page number), and content padding

### Key Data Points (as of 2026-03-24)
- LP demand (excl Staples): 57,566 UoM, ~93 trucks, 2,403 pallets
- LM MEX/CAN: 177 trucks (CDMX 52, GDL 38, MTY 32, TOR 25, VAN 30)
- LM USA: 292 trucks, 166 CORT deliveries
- Assembly at venues: 6,658 items (RGS stadiums + IBC)
- Assembly at CORT stadiums: 2,128 items
- Assembly at WHS: Regional 3,422, Satellite 836, Dallas 850
- CORT: 24 rental + 13 retail = 37 SKUs, 32,627 items
- RGS containers: 40 (Mar 9–Apr 10), 20 local deliveries
- Staples: 166 SKUs, 62 USA + 59 CAN + 45 MEX catalogs
- Timeline: LP Mar 9–Apr 29, LM Apr 3–Jun 9, Bump-in Apr 15–Jun 29, Kickoff Jun 11
- LM lead times: MEX/CAN = 0 days (regional WHS), USA = 0–3 days from Dallas
- LP Engine: 162B+ search combinations across 16 truck pairs, 126 SKUs, 8 destinations

### Editing Notes
- SVGs are inline — edit viewBox, coordinates, and text directly
- Slide boundaries: `<div class="S">` with `class="sn"` page numbers
- Product images: `Table 1.png`, `Table 4.png`, `Welcome desk.png` (committed to git)
- When updating data: check all slides that reference the same number (truck counts, pallet totals, dates appear on multiple slides)
- **Presentation CSS vars are LIMITED** — only `--pri`, `--sec`, `--a3`, `--a4`, `--rd`, `--tp`, `--ts`, `--tt`, `--bg`, `--sf`, `--bd` and their `-s`/`-b` surface/border variants. NO `--pu`, `--ps`, `--or`, `--os`, `--gn`, `--gs`, `--ac`, `--as` — those are index.html only. Use hardcoded hex in presentation: purple `#6E3FF3`/`#F0EBFE`, orange `#C4550A`/`#FEF3EB`, green `#12804A`/`#E6F5ED`

## FF&E RADAR (`sitrep.html`)

### Overview
- **Automated 72-hour situation report** — queries Supabase live, no manual input
- Dark cockpit aesthetic with radar sweep, CRT scanlines, phosphor glow
- Single-page dashboard — no scrolling, everything in viewport
- Accessed via `📡 SITREP` button in ML3K header (all 3 modules) or `http://localhost:8888/sitrep.html`
- Font: Share Tech Mono (avionics display)

### Layout (three columns)
- **Left — Instruments**: Dispatched gauge, Ready/Pending/OOR counts, 72H Window (sent + queued), Arrivals breakdown (click for detail)
- **Center — Operations**: Three radial SVG gauges (LP/LM/Overall progress), 2-column destination grid (click for truck list), Recently dispatched + dispatch queue with LSR numbers
- **Right — Alerts + Timeline**: Pulsing red alerts (overdue, not ready), amber warnings, ready-to-send count, milestone timeline with countdown badges

### Data Sources
- `lp-plan` — truck plan (rows with truckId, destination, date, sku, qty, pallets)
- `lp-truck-state` — dispatched set, OOR set, LSR numbers
- `lp-arrivals` — container arrival ready dates
- `lp-nom` — nomenclature (not directly displayed, available for drill-down)
- `fm-stock` — stock report (skus + qtys for waterfall)
- `fm-rw` — LM demand (venues, bump-in dates for LM progress gauge)

### Stock Waterfall
- Mirrors LP_renderPlan waterfall exactly
- Walks trucks in date+id order, deducts stock from pool
- Dispatched trucks deduct (they consumed stock when sent)
- OOR trucks skip deduction (stock reserved externally)
- Per-truck snapshot saved for drill-down stock display

### Interactive Elements
- **Click destination** → modal with all trucks, dates, LSR numbers, status
- **Click truck** → modal with SKU-level detail, qty, pallets, waterfall-adjusted stock per item
- **Click arrivals** → modal with all container dates and status
- **Click alert** → drills to relevant truck or ready-to-dispatch list
- **Refresh button** — re-queries all data on demand
- **Live clock** — ticks every second with T-XX kickoff countdown

### Visual Design
- Radar sweep animation (8s rotation, green gradient)
- Concentric radar rings behind content
- Instrument bezels with bolt/screw decorations (⊕)
- Column seam bolts
- Pulsing red alerts (box-shadow animation)
- Radial gauges with clock tick marks

## FF&E Daily Digest (`digest.html`)

### Overview
- **Automated daily email digest** — generates Outlook-safe HTML email with supply chain status
- Standalone page: data passed via `sessionStorage` from ML3K `generateDailyDigest()`
- Admin-only: `📧 Digest` button in ML3K header (all 3 modules)
- Generates Excel report (3 sheets), uploads to Supabase Storage bucket `digests`
- Copy to clipboard → paste into Outlook workflow

### Data Pipeline
- `generateDailyDigest()` in `index.html`:
  - Builds `PLAN_CACHE` for all venues if not yet built
  - Computes Assembly Timeline, Kitting Timeline, Late LP Arrivals fresh (not dependent on dashboard view)
  - Pre-computes LM totals with dedup (trucks, pallets, CORT, items)
  - Serializes all data to `sessionStorage._digestData`
  - Opens `digest.html` in new tab

### Email Sections
1. **Header** — FIFA branding, date, kickoff countdown
2. **Overall Project Status** — items, venues, trucks, dispatched + progress bar + legend
3. **Load Plan** — pallets, dispatched/ready/pending + progress bar
4. **Last Mile** — pallets, dispatched, CORT, Staples + progress bar
5. **This Week** — Mon–Sun grid with IN/OUT rows, today highlighted, weekend "No activities"
6. **Inbounds Forecast** — day-by-day from tomorrow, 3 active days, overdue items
7. **Outbounds Forecast** — LP READY trucks with LSR numbers, status badges, destination
8. **Risks — Late LP Arrivals** — summary by destination (items >0d late only), from LM All Venues
9. **Reports & Links** — Excel download, Product Catalog, Palletisation Guide
10. **Footer** — ML3K link, Materials Management Team

### Excel Report (6 sheets)
Tab order: FF&E Arrivals → LP Forecast → LM Forecast → Late Arrivals → Assembly Timeline → Kitting Timeline
- **FF&E Arrivals** — per-SKU container/local delivery rows, arrived rows green-highlighted
- **LP Forecast** — per-SKU LP truck plan, aggregated by truckId+sku, dispatched rows green-highlighted, with LSR/Status
- **LM Forecast** — per-SKU LM truck plan with dispatch status, dispatched rows green-highlighted
- **Late Arrivals** — items where LP arrival > bump-in date (>0d filter)
- **Assembly Timeline** — full supply chain date chain per assembled item
- **Kitting Timeline** — kit dispatch dates with all component details, all fields on every row
- All sheets: frozen header row, autoFilter enabled, header fill limited to data columns only
- Uploaded to Supabase Storage `digests` bucket with `upsert:true`
- Also available via toolbar `⬇ Excel Report` button (local blob download)

### Digest Timeline Computation
- **Kitting**: captured from EXISTING PLAN_CACHE BEFORE `numberAll()` rebuild. `numberAll()` auto-excludes Step B trucks which hides kits on individual venue trucks. Kits don't depend on LP data, so pre-rebuild data is always correct. Fallback builds from `LM_KITS` directly with cluster name lookup.
- **Assembly + Late**: computed AFTER `numberAll()` rebuild with NO `LM_excluded` filter (digest = full snapshot). These depend on LP data so fresh computation is needed.
- **`_lpNotifyLM()`**: does NOT null `window._kitTimelineData` — kits don't depend on LP data
- **LM trucks**: serialized with per-SKU `items` array + `dispatched` flag for Excel detail

### Supabase Storage
- **Bucket**: `digests` (public)
- **RLS policies**: INSERT (anon), UPDATE (anon), SELECT (anon)
- **Files**: `FF&E_Digest_YYYY-MM-DD.xlsx` (daily, overwritten), `Palletisation_Guide.pdf` (static)

### Outlook Compatibility
- All styling via inline CSS on elements (no `<style>` block for email content)
- `bgcolor` attribute for backgrounds (survives Outlook paste)
- Buttons use table-as-button pattern: `<td bgcolor><a style="color:#fff">`
- Text colors via inline `style="color:..."` (works when sent as email, may be stripped on paste)
- Stat cards: grey bg with colored left border accent
- Legend: bgcolor squares (10×10px cells) next to text
- Copy uses `navigator.clipboard.write` with raw innerHTML for best style preservation
- MSO boilerplate in `<head>`: `PixelsPerInch`, `mso-table-lspace`, `mso-line-height-rule`
- **Inter-table gap**: Outlook adds default spacing between adjacent `<table>` elements that CSS cannot remove. Fix: merge summary chips/banners into the same table as the data grid (as a first row with `colspan`) instead of using separate tables. Applied to: This Week, Inbounds Forecast, Outbounds Forecast, Late Arrivals sections.

### Late Engine V1 (Dashboard + Digest)
Checks ALL items on ALL LM trucks (not just assembled) across 3 supply chain paths:

**Path 1 — LP Fed** (MEX/CAN regionals, HOU/KC/NY/TOR/VAN/GDL/CDMX/MTY stadiums):
`Arrives Dallas → Ready Dallas → LP Ship → Satellite Arrival → WHS Processing → LM Dispatch → Bump-in`

**Path 2 — USA non-LP** (USA non-stadium venues via satellite WHS):
`Arrives Dallas → Ready Dallas → Inbound Transit → WHS Processing → Outbound Transit → LM Dispatch → Bump-in`

**Path 3 — Dallas direct** (Dallas Stadium + IBC):
`Arrives Dallas → Ready Dallas → Transit → Bump-in`

**Path determination**: `_isDallasDirect()` for Path 3, `LM_isLPFed()` for Path 1, else Path 2

**"Why Late" — identifies which supply chain leg caused the delay:**
- `Not ready in Dallas` — LP ship date > LM dispatch (item left Dallas too late)
- `Long transit` — LP shipped on time but satellite arrival > LM dispatch
- `Long processing` — arrives at WHS ok but WHS processing pushes past dispatch
- `No LP` — LP-fed venue but no LP shipment found

**WHS Processing defaults**: USA stadiums = 3d, CAN/MEX all venues = 3d, other USA = 0d

**Dashboard**: collapsible section with summary by destination + detail table
**Excel export**: `LM_exportLateArrivals()` — Summary + All Items + per-destination sheets
**Data**: `window._lateArrivalData`, `window._lateByDestData`
**Digest**: computed fresh in `generateDailyDigest()`, filtered to `daysLate > 0`

### LP Engine V5.1 — Stock Waterfall Fix
- USA/RIC bucket now respects stock arrival dates (items only available when container ready)
- After MEX/CAN bucket: snapshot total inventory, compute B1 consumption, rebuild stock for B2
- B1 overshoot (consumed from post-RIC arrivals) deducted from delta entries chronologically
- `fPtr` reset to first date >= `RIC_START` for Bucket 2
- Tail reconstruction: 500K iteration limit on exhaustive search to prevent freeze
- Safety break when no stock and no future arrivals remain

### Collapsible Dashboard Sections
- Daily Dispatch Detail, Assembly Timeline, Late Arrivals, Kitting Timeline use `<details><summary>`
- DDD and Late Arrivals open by default; Assembly and Kitting collapsed
- Excel buttons use `event.stopPropagation()` to prevent toggle on click

## System Audit (2026-03-30) — Full Architecture Audit
Comprehensive audit across init, state, persistence, engines, rendering, exports. See AUDIT.md for full report.

### Quick Wins Applied
1. **UNDO_capture() added** to `LM_saveManualDemand`, `LM_saveClusterTA`, `LM_saveStpStrategy` — all mutations now undoable
2. **Debounce timer cleared** in `LP_saveToSupabase()` — `_lpSaveTimer` now cleared alongside `_lpTruckSaveTimer` to prevent config save race
3. **LP_recomputeStockHolds() on load** — called after `_lpRehydratePlan()` in both new and legacy load paths
4. **LP_lastGenSettings reset** — cleared to `{}` in both `doResetLP()` and `doSoftResetLP()` so regeneration works after reset

### Known Open Issues (from AUDIT.md)
- **C1**: Stock waterfall computed in `LP_renderPlan()` render path (state mutation in render)
- **C2**: `_undoSnap()` does not capture NOM/RW (file data not restorable via undo)
- **C3**: `beforeunload` only flushes truck-state + config, not plan/demand/nom/arrivals
- **C4**: Kit rename in `numberAll()` mutates NOM in-place (non-atomic)

## System Audit (2026-03-27)
Comprehensive audit of all subsystems. No critical bugs found.

### Systems Verified
| System | Status | Notes |
|---|---|---|
| Undo (`_undoSnap`/`UNDO_restore`) | ✅ | All fields captured & restored |
| Backup Export/Restore | ✅ | All state included |
| Reset Functions (5) | ✅ | Hard/soft resets correct |
| Supabase Persistence (3 save paths) | ✅ | All payloads identical |
| LP Stock Waterfall V5.1 | ✅ | Overshoot deduction correct |
| Late Engine (3 paths) | ✅ | All paths detect tardiness correctly |
| Assembly Timeline | ✅ | rawArrival field propagated |
| Digest | ✅ | Field names consistent |

### WHS Processing Defaults (`gWP()`)
- USA stadiums: 3d (hardcoded in `LM_DEFAULT_WP`)
- IBC: 3d
- CAN/MEX all venues: 3d (dynamic check via `vcIsCAN`/`vcIsMEX`)
- Other USA: 0d (override via venue settings)

## KPI Card Systems

### LM Dashboard (`index.html`) — `kpi()` / `kpiRow()`
```javascript
kpi({label, value, color?, sub?, style?, labelColor?})
kpiRow(items, cls?)  // wraps in .sr flex row
```
CSS: `.sc` (card), `.sr` (row), `.sl` (label 10px), `.sv` (value 22px bold)

| Card | Label | Color | Sub | Special Style |
|---|---|---|---|---|
| Pallets | 📦 Pallets | `var(--ac)` | — | — |
| Pieces | 📋 Pieces | `#A84444` | — | — |
| LM Trucks | 🚛 LM Trucks | `var(--gn)` | — | — |
| Dispatch Days | 📅 Dispatch Days | `var(--or)` | — | — |
| Peak/Day | 📈 Peak/Day | `var(--rd)` | — | — |
| CORT | 🏷 CORT | `#E31837` | `{n} pcs` | `border:#F5C6C7;bg:#FFF8F8;labelColor:#E31837` |
| Staples | 🏪 Staples | `#EF6C00` | `{n} qty · {n} days` | `border:#FFCC80;bg:#FFF8F0;labelColor:#EF6C00` |

### LP Status Tab (`index.html`) — same `kpi()` function
| Card | Label | Color | Notes |
|---|---|---|---|
| SKUs | 📦 SKUs | `var(--tp)` | Static |
| Total Demand | 📋 Total Demand | `var(--ac)` | — |
| Shipped | 🚛 Shipped | `var(--gn)` | — |
| Remaining | 📭 Remaining | `var(--or)` or `var(--gn)` | Green when 0 |
| Progress | 📊 Progress | Dynamic | Red→Orange→Green by % |
| Complete | ✅ Complete | `var(--gn)` | `{n}/{total}` format |

### V26 Vision (`index.html`) — inline compact cards
Same data fields, smaller sizing: 8px label, 18px value, 7px sub, 6px padding, min-width 70px

### Digest Email (`digest.html`) — `_stat()`
```javascript
_stat(label, value, color, sub?)  // Outlook-safe table-based card
```
- 4 cards per row (`width:25%`), grey bg (`#F4F5F7`), 4px left border accent
- Value: 20px Courier New monospace bold

| Section | Cards (label → color) |
|---|---|
| **Overall** | items → `#00897B`, venues → `#4A148C`, trucks → `#304FFE`, dispatched → `#12804A` |
| **Load Plan** | `{n} trucks` / pallets → `#4A148C`, dispatched% → `#12804A`, ready → `#304FFE`, pending → `#C4550A` |
| **Last Mile** | `{n} trucks` / pallets → `#304FFE`, dispatched% → `#12804A`, CORT → `#C62828` (+pcs sub), Staples → `#C4550A` (+qty sub) |

### SITREP (`sitrep.html`) — Instruments + Radial Gauges
**Instruments** (`.I`): dark cockpit style, label (`.I-l` 7px), value (`.I-v` 22px glow), status (`.I-s` 8px)
| Instrument | Color | Status Text |
|---|---|---|
| DISPATCHED | `var(--gn)` | `{n}% COMPLETE` + progress bar |
| READY | `var(--cy)` | `FULL STOCK` |
| PENDING | `var(--rd)` or `var(--gn)` | `AWAITING STOCK` |
| OOR | `var(--am)` | `RESERVED` |

**Radial Gauges** (`rg(pct, clr, lbl, sub, sz)`): SVG with 24 ticks, bezel ring, progress arc, center %
| Gauge | Color | Subtitle |
|---|---|---|
| LP PROGRESS | green | `{n}/{total} TRUCKS` |
| LM PROGRESS | cyan | `{n}/{total} VENUES` |
| OVERALL | amber | `{n}% LP · {n}% LM` |

### Badge/Chip Classes (`index.html`)
| Class | Background | Color | Usage |
|---|---|---|---|
| `.bg .bg-bl` | `var(--as)` | `var(--ac)` | Default/accent |
| `.bg .bg-gn` | `var(--gs)` | `var(--gn)` | Success, stock, on-time |
| `.bg .bg-or` | `var(--os)` | `var(--or)` | Warning, pending |
| `.bg .bg-rd` | `var(--rs)` | `var(--rd)` | Danger, late, error |
| `.bg .bg-pu` | `var(--ps)` | `var(--pu)` | Purple, pallets, restore |
| `.bg .bg-gy` | `#F0F1F3` | `var(--tt)` | Neutral, muted |

### SITREP Badge Classes
| Class | Color | Usage |
|---|---|---|
| `.B .Bg` | green rgba | SENT, ARRIVED, OK |
| `.B .Ba` | amber rgba | LOW stock, pending |
| `.B .Br` | red rgba | PEND, NO STK |
| `.B .Bc` | cyan rgba | READY |
