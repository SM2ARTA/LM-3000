# ML3K — FIFA World Cup 2026 Logistics Manager

## Project Overview
Single-page web application for managing ground transport logistics for FWC26. Handles trucks, stadiums, venues, routes, and staffing across USA, Canada, and Mexico host cities.

## Architecture
- **Single file**: Everything lives in `index.html` (~11,000 lines). No build step, no bundler.
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

## Editing
- File is large (~11,000 lines) — always use `offset` + `limit` when reading sections
- Use `Grep` with line numbers to locate functions before editing
- Prefer `Edit` over full rewrites
- Key IDs to preserve: `stockBtn`, `stockFileInput`, `lpExportBtn`, `v26ExportBtn`, `lm-bottom-nav`, `global-supp-bar`
