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

### LP Supabase Keys
`lp-config`, `lp-nom`, `lp-demand`, `lp-demand-raw`, `lp-arrivals`, `lp-plan`, `lp-truck-state`

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
- **18 slides**, single HTML file, FIFA brand colors
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
12. **Cardboard Furniture** — Re-Board tables (900) + LOOK welcome desks (278), product images
13. **Operations Matrix** — 214 venues, full route/WHS/assembly breakdown table, MEX/CAN/USA/CORT rows
14. **Action Items** — 6 workstreams in 3×2 grid (Materials, Customs, Distribution, Warehousing, Venue Logistics, CORT)
15. **Timeline** — 94-day SVG (Mar 9–Jun 11), Phase 1 LP bars (Bucket 1/2), Phase 2 LM bars (Apr 3–Jun 9), assembly (Apr 15–Jun 29), KICKOFF star, summary chips
16. **Platform (ML3K)** — ml3000.smmarta.com, credentials view/me, LP Engine V5 + LM Engine details
17. **LP Engine V5** — Three-stage visual: Plan (two-bucket with stock pool), Build (4-pass SR-first loading), Optimize (tail reconstruction with 162B+ search). Real example flow: LP-31 Monterrey walkthrough. Constraint cards (26 plt, 4 trucks, 2 dests).
18. **LM Engine** — Three-section visual: Dispatch dates (bump-in − lead time, MEX/CAN 0d, USA 0–3d), Fill each truck (3-pass: scheduled → top-up → pool → future), Day loop & overflow (carry-over, max trucks/day, no-BI items, CORT separate)

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
