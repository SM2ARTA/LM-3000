# ML3K Architecture Recovery Document

> Reverse-engineered from production codebase (`index.html` ~17,700 lines + supporting files).
> Generated 2026-04-04. Source of truth: running code behavior, not assumptions.

---

## SECTION 1 — SYSTEM PURPOSE

### What ML3K Is For

ML3K (Materials Logistics 3000) is the ground transport logistics planning system for FIFA World Cup 2026. It manages the physical movement of ~166,000 items (furniture, fixtures, equipment, signage, stationery) from a central Dallas warehouse to 214 venues across USA, Canada, and Mexico.

### The Planning Problem It Solves

The system solves a **two-phase supply chain problem**:

**Phase 1 — Load Plan (LP):** Dallas warehouse dispatches ~93 trucks to 8 regional/satellite warehouses (Toronto, Vancouver, Mexico City, Guadalajara, Monterrey, Houston, Kansas City, New York). The engine must:
- Respect container arrival timelines (40 containers arriving Mar 9–Apr 10)
- Allocate scarce inventory across competing destinations proportionally
- Pack trucks efficiently (26-pallet capacity)
- Prioritize MEX/CAN destinations (longer transit) before USA
- Defer partially-filled trucks when more stock is expected
- Optimize tail trucks via exhaustive bin-packing search

**Phase 2 — Last Mile (LM):** Regional/satellite warehouses dispatch ~292 trucks + 166 CORT deliveries + 39 Staples deliveries to individual venues. The engine must:
- Schedule trucks backwards from bump-in dates (venue readiness dates)
- Respect per-venue capacity constraints (truck size, max trucks/day)
- Top up partial pallets from a shared pool
- Handle assembly/disassembly mode per venue type and country
- Manage kit creation (FF&E and Stationery kits)
- Support locked truck immutability for dispatched shipments

### Main User Goals
1. Generate feasible truck plans for both LP and LM phases
2. Track dispatch status (locked/dispatched/ready/pending)
3. Monitor stock availability and late arrivals
4. Export customs documentation (Commercial Invoices, Packing Lists)
5. Manage holds, overrides, and manual adjustments
6. Share planning state across team members via Supabase

### Main Planning Objects
| Object | Description |
|--------|-------------|
| **SKU** | A distinct material item (e.g., chair, banner, padlock) |
| **Truck** | A capacity-constrained vehicle (LP: 26 pallets, LM: 12-26 pallets) |
| **Venue** | A destination requiring materials by a bump-in date |
| **Container** | An inbound shipment arriving at Dallas with a ready date |
| **Kit** | A pre-assembled package of multiple SKUs shipped as one unit |
| **Pallet** | The unit of truck capacity measurement |

### Main Outputs Users Rely On
1. **LP Truck Plan** — which SKUs go on which truck to which destination on what date
2. **LM Truck Plan** — same for last-mile delivery, per venue
3. **Stock Waterfall** — real-time stock availability per truck in date order
4. **Late Arrivals Analysis** — which items won't arrive on time, via 3 supply chain paths
5. **Assembly Timeline** — 5-column date chain for warehouse assembly items
6. **Commercial Invoice Exports** — customs documentation per truck
7. **Daily Digest** — email-ready status report with Excel attachment
8. **SITREP Dashboard** — radar-style operational readiness view

### What Decisions the Engine Is Making

**LP Engine decides:**
- Which destination gets scarce stock (proportional rationing, deterministic)
- When to ship (earliest date stock is available)
- Whether to defer a truck (SR deferral guard when future stock expected)
- How to consolidate partial trucks (pending buffer, 90% fill threshold)
- How to optimize last trucks (exhaustive tail reconstruction, 500K iteration cap)

**LM Engine decides:**
- What dispatch date each venue needs (bump-in minus lead time minus processing)
- How to bin-pack items into trucks per day
- Whether to top up partial pallets from the shared pool
- Whether to pull items from future dates to fill today's truck
- How to handle overflow when daily capacity is exceeded

---

## SECTION 2 — DOMAIN ENTITIES

### 2.1 SKU (Stock Keeping Unit)

**Purpose:** The atomic unit of material identity. Every item in the system is identified by SKU.

**Key Fields:**
| Field | Type | Meaning |
|-------|------|---------|
| `sku` | string | Unique identifier (e.g., `FEMHE-001-002`) |
| `nm/name` | string | Human-readable description |
| `src/source` | string | Supplier/source (RGS, STP USA, STP CAN, STP MEX, CT RNT, CT RTL, FA) |
| `uom` | string | Unit of measure (pc, kit, ea) |
| `ppu` | number | Pieces per UoM (pack size; 1 = each) |
| `pq` | number | Disassembled: units per pallet |
| `ps` | number | Disassembled: pallet spaces per loading unit |
| `pqA` | number | Assembled: units per pallet |
| `psA` | number | Assembled: pallet spaces per loading unit |

**Source data:** Uploaded via Nomenclature spreadsheet. Stored in `NOM{}` (LM) and `LP_STATE.nomenclature{}` (LP).

**Who creates it:** User file upload (NOM spreadsheet).

**Who mutates it:** `LM_applyNomOverrides()` applies pallet dimension overrides. `LP_applyPalletOverrides()` for LP. Kit injection creates synthetic NOM entries (`_kitNom: true`).

**What depends on it:** Everything. Pallet calculations, truck packing, assembly detection, export formatting.

---

### 2.2 Demand Row (Material Plan)

**Purpose:** A single requirement: "venue X needs qty Y of SKU Z by date D."

**LM variant — `RW[]` (Requirements Workbook):**
| Field | Type | Meaning |
|-------|------|---------|
| `Venue` | string | Destination venue name |
| `Nomenclature` | string | SKU code |
| `Required` | number | Raw quantity (pieces) |
| `Estimated bump-in date` | string | When venue needs items (YYYY-MM-DD) |
| `Venue cluster` | string | Cluster grouping (e.g., "USA / DAL") |
| `_effQty` | number | **Derived**: `ceil(Required / ppu)` — UoM quantity |

**LP variant — `LP_STATE.materialPlan[]`:**
| Field | Type | Meaning |
|-------|------|---------|
| `destination` | string | LP destination (e.g., "CAN TOR", "MEX CDMX") |
| `sku` | string | SKU code |
| `requiredQty` | number | Raw pieces (sum of file rows) |
| `effQty` | number | **Derived**: per-row ceiling sum after PPU division |

**Source data:** Uploaded via Material Plan spreadsheet.

**Who creates:** User file upload → `LP_parseMaterialPlan()` or `pPl()`.

**Who mutates:** `_lpAggregateDemand()` aggregates raw rows. `LM_demandAdj` scales quantities. Kit allocation deducts component demand. Holds exclude items.

**What depends on it:** Engine input. Truck building, rationing, KPI computation.

---

### 2.3 Arrival (Container/Shipment)

**Purpose:** An inbound shipment arriving at Dallas warehouse with inventory.

**Key Fields:**
| Field | Type | Meaning |
|-------|------|---------|
| `sku` | string | SKU being delivered |
| `container` | string | Container/shipment identifier |
| `arrivalDate` | string | Physical arrival date |
| `readyDate` | string | **Derived**: arrivalDate + turnaround days (first workday) |
| `qty` | number | Units in shipment |
| `_localName` | string | User-defined group name (optional) |
| `_manual` | boolean | True if manually added (not from file) |
| `_origArrDate` | string | Original date before user override |

**Source data:** Uploaded via Arrivals spreadsheet or manually added.

**Who creates:** File upload → `LP_parseArrivals()`. Manual add → `LP_addArrivalItem()`.

**Who mutates:** `LP_contDateOverrides` changes arrival dates. `LP_recalcReadyDates()` recomputes ready dates.

**What depends on it:** LP engine inventory timeline. Stock availability determination. Late arrival analysis.

---

### 2.4 Truck (Generated Plan Row)

**Purpose:** A load assignment: "truck T carries qty Q of SKU S to destination D on date D."

**LP variant — `LP_STATE.generatedPlan[]`:**
| Field | Type | Meaning |
|-------|------|---------|
| `truckId` | number | Truck identifier (LP-1, LP-2, ...) |
| `date` | string | Ship date (YYYY-MM-DD) |
| `destination` | string | LP destination |
| `sku` | string | SKU loaded |
| `qty` | number | Units loaded (UoM) |
| `pallets` | number | Pallet spaces consumed |
| `name` | string | Item name |
| `truckTotal` | string | Total pallets on this truck |

**LM variant — items within `PLAN_CACHE[venue].allT[]`:**
| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Global truck ID (LM-1, LM-2, ...) |
| `items[]` | array | Line items with loadQty, loadPlt, pq, ps, biK, origBiK |
| `pallets` | number | Total pallets on truck |
| `pcs` | number | Total pieces |
| `dd` | string | Dispatch date (YYYY-MM-DD) |
| `biK` | string | Bump-in date |
| `destLabel` | string | Venue/cluster name |
| `_locked` | boolean | Whether truck is dispatched/locked |
| `_isStepB` | boolean | Individual venue truck within cluster (auto-excluded) |

**Source:** Generated by `LP_buildPlanV3()` or `build()`.

**Who creates:** Engine. Never manually created.

**Who mutates:** `LP_changeDate()` changes date. `LP_toggleDispatch()` locks. Returns reduce effective qty. Tail reconstruction repacks.

**What depends on it:** Rendering, exports, stock waterfall, late analysis, dispatch tracking.

**Derived:** Yes — fully recomputable from demand + arrivals + settings. EXCEPT locked trucks, which are snapshots.

---

### 2.5 Locked Truck (Snapshot)

**Purpose:** An immutable record of a truck that has been dispatched. Must never be rebuilt by the engine.

**LP:** `LP_dispatched` (Set of truckIds). Rows preserved during `LP_regenerate()`.

**LM:** `LM_lockedSnapshots[fingerprint]` — deep copy of truck at lock time.

**Key LM Snapshot Fields:**
| Field | Type | Meaning |
|-------|------|---------|
| `items[]` | array | Frozen line items with `_pq`, `_ps`, `_kitId`, `_kitNom` |
| `dd` | string | Dispatch date |
| `biK` | string | Bump-in date |
| `pallets` | number | Total pallets |
| `_returned` | object | `{sku: returnedQty}` — items sent back to demand pool |
| `destLabel` | string | Venue/cluster identifier |
| `_locked` | boolean | Always true |

**Source data:** Created at dispatch-lock time from live truck data.

**Who creates:** `LM_toggleDispatchTruck()`, `LM_changeDate()`.

**Who mutates:** Only `_returned` map (via `LM_returnItem()`). Items/pallets are immutable.

**What depends on it:** `numberAll()` injects snapshots after build. Demand deduction uses snapshot quantities. Fingerprint stability across rebuilds.

**CRITICAL:** Fingerprint uses `KIT:{kitId}` for kit items (not volatile SKU names) to survive kit renaming.

---

### 2.6 Stock Report

**Purpose:** Current inventory on hand at Dallas warehouse.

**Key Fields:**
| Variable | Type | Meaning |
|----------|------|---------|
| `STOCK_SKUS` | Set | Which SKUs are currently in stock |
| `STOCK_QTYS` | object | `{sku: qty}` — available quantity per SKU |
| `STOCK_REPORT_NAME` | string | Uploaded filename |

**Source data:** Uploaded Excel inventory report.

**Who creates:** `stockReportParse()`.

**Who mutates:** Upload replaces entirely. Resets clear to empty.

**What depends on it:** LP engine treats stock SKUs as ready-today (bypasses arrival timeline). Stock waterfall uses STOCK_QTYS for truck readiness. LP dirty flag includes stock hash.

---

### 2.7 Hold

**Purpose:** Exclude a specific SKU-destination combination from planning.

**LP:** `LP_holds` = Set of `"destination|sku"` strings. Manual. `LP_stockHolds` = auto-computed where stock < demand.

**LM:** `LM_holds` = Set of `"venue|sku"` strings. `LM_holdReleased` = `{key: releaseDate}` — scheduling floor.

**Source:** User action (manual hold) or computed (stock hold).

**Effect:** Held items excluded from engine demand aggregation.

---

### 2.8 Customs Override

**Purpose:** Manual corrections to HS codes, country of origin, prices for customs documentation.

**Structure:** `LP_customsOverrides[sku]`
| Field | Type | Meaning |
|-------|------|---------|
| `hsCode` | string | HS tariff code (normalized XXXX.XX) |
| `country` | string | Country of origin |
| `price` | number | Unit price for customs |
| `customsName` | string | Short customs description (5-8 words) |
| `hsConfirmed` | boolean | Whether HS code is verified |
| `mxDesc` | string | Mexico-specific description |
| `mxHsCode` | string | Mexico HS code (8-digit) |
| `mxPrice` | number | Mexico unit price |

**Source:** Manual entry, AI classification, or sibling SKU suggestion.

**Persisted:** In `lp-truck-state` Supabase key. Survives soft reset.

---

### 2.9 Venue Settings

**Purpose:** Per-venue constraint overrides for the LM engine.

**Structure:** `VS[venue]`
| Field | Type | Meaning |
|-------|------|---------|
| `tc` | number | Truck capacity (pallets) |
| `mt` | number | Max trucks per day |
| `lt` | number | Outbound transit days |
| `lt2` | number | Inbound transit days (Dallas → satellite) |
| `wp` | number | WHS processing days |
| `dateOverrides` | object | `{dateKey: {tc?, mt?, noTopUp?}}` — per-date rules |

**Source:** Manual settings or defaults per venue type/country.

**Who mutates:** Settings UI, backup restore.

---

### 2.10 Kit

**Purpose:** A pre-assembled package of multiple component SKUs shipped as one unit.

**Structure:** `LM_KITS[]`
| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Kit ID (KIT-1, KIT-2, ...) |
| `sku` | string | Generated kit SKU (FNKIT-002-{truckId}-NN or OSKIT-002-{truckId}-NN) |
| `name` | string | Kit display name |
| `venue` | string | Destination venue |
| `items[]` | array | Component items: `{sku, qty}` |

**Source:** Manual creation or auto-generation from STP strategy.

**Effect:** Kit injection creates NOM entry + RW row. Component demand is deducted. Kit SKU is renamed per truck in `numberAll()`.

---

### 2.11 STP Delivery

**Purpose:** Staples (office supplies) delivery scheduled directly to a venue.

**Structure:** `LM_STP_DELIVERIES[]`
| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Delivery ID (STP-1, STP-2, ...) |
| `venue` | string | Destination venue |
| `date` | string | Delivery date |
| `rate` | number | Delivery cost (USD) |
| `items[]` | array | Optional explicit items `{sku, qty}` |
| `_auto` | boolean | Auto-generated from strategy |

**Effect:** STP items at STP venues are excluded from main engine; go to dedicated STP trucks.

---

### 2.12 FA (Functional Area) Group

**Purpose:** Externally-planned delivery group (furniture, fixtures) that reserves capacity on LP/LM trucks.

**Structure:** `LP_FA_GROUPS[]` (loaded from fa-goods.html via Supabase)

**Key Fields:** id, venue, biDate, fa, sku, pallets, items[], linkedLP, linkedLM

**Effect:** Injected as 1-unit demand rows into LP engine. Pallets computed from mixed/unmixed rules.

---

## SECTION 3 — STATE CLASSIFICATION

### A. Source State (Must Never Be Silently Recomputed)

| Variable | Storage | Description | Dangerous? |
|----------|---------|-------------|------------|
| `NOM{}` | Supabase `fm-nom` | Master nomenclature | Safe — loaded from file, persisted |
| `RW[]` | Supabase `fm-rw` | Material plan rows (raw demand) | Safe — loaded from file |
| `LP_STATE.nomenclature` | Supabase `lp-nom` | LP item master | Safe |
| `LP_STATE.arrivals[]` | Supabase `lp-arrivals` | Container arrivals | **Caution**: `_manual` entries mixed with file data |
| Raw demand archive | Supabase `lp-demand-raw` | Per-row demand before aggregation | Safe — write-once archive |
| `STOCK_SKUS` / `STOCK_QTYS` | Supabase `fm-stock` | Stock report | Safe |
| `LP_customsOverrides` | Supabase `lp-truck-state` | Customs data overrides | Safe |
| `LP_palletOverrides` | Supabase `lp-truck-state` | Pallet dimension overrides | **Caution**: applied via mutation of nomenclature in-place |
| `LM_lockedSnapshots` | Supabase `fm-lm-dispatch` | Frozen truck data | **Critical**: snapshots ARE source truth for locked trucks |
| `LM_KITS[]` | Supabase `fm-lm-kits` | Kit definitions | Safe |
| `LM_STP_DELIVERIES[]` | Supabase `fm-lm-stp-deliveries` | STP deliveries | Safe |
| `VS{}` | Supabase `fm-vs` | Venue settings overrides | Safe |
| `LP_holds` | Supabase `lp-truck-state` | Manual holds | Safe |
| `LP_dispatched` | Supabase `lp-truck-state` | Locked LP truck IDs | Safe |
| `LM_dispatched` | Supabase `fm-lm-dispatch` | Locked LM truck FPs | Safe |
| `LP_returned` | Supabase `lp-truck-state` | Return quantities | Safe |
| `LP_contDateOverrides` | Supabase `lp-truck-state` | Container date overrides | Safe |
| `LP_transitDays` | Supabase `lp-truck-state` | Transit day overrides | Safe |
| `LP_destWhsDays` | Supabase `lp-truck-state` | WHS processing overrides | Safe |
| `LM_demandAdj` | Supabase `fm-lm-demand-adj` | Demand qty adjustments | Safe |
| `LM_nomOverrides` | Supabase `fm-lm-nom-ovr` | Pallet dim overrides | Safe |
| `LM_palletCfg` | Supabase `fm-pallet-cfg` | Assembly mode config | Safe |
| `LM_holds` / `LM_holdReleased` | Supabase `fm-lm-dispatch` | LM holds | Safe |
| `LM_dateOverrides` | Supabase `fm-lm-dispatch` | Manual date changes | Safe |
| `LM_lsrNumbers` (LP & LM) | Supabase various | LSR numbers | Safe |
| `MANUAL_ITEMS` | Supabase `fm-manual-items` | Manually added items | Safe |
| `LM_MANUAL_DEMAND` | Supabase `fm-lm-manual-demand` | Manual demand rows | Safe |
| `DIST_OVERRIDES` | Supabase `fm-dist-overrides` | Rate overrides | Safe |
| `LM_STP_STRATEGY` | Supabase `fm-stp-strategy` | STP allocation strategy | Safe |
| `LM_clusterTurnaround` | Supabase `fm-cluster-ta` | Cluster turnaround days | Safe |
| HS AI config | Supabase `hs-ai-config` | AI provider + API key | Safe (excluded from backup) |

### B. Derived State (Should Be Recomputable from Source)

| Variable | Derived From | Current Location | Dangerous? |
|----------|-------------|-----------------|------------|
| `LP_STATE.materialPlan[]` | `lp-demand-raw` + NOM (PPU) | Supabase `lp-demand` | **Caution**: persisted, but should be recomputable |
| `LP_STATE.generatedPlan[]` | demand + arrivals + settings | Supabase `lp-plan` | Safe — engine output, fully recomputable |
| `PLAN_CACHE{}` | RW + NOM + settings | In-memory only | Safe — rebuilt on every `numberAll()` |
| `CORT_CACHE{}` | RW + NOM | In-memory only | Safe |
| `VN[]` | RW | In-memory only | Safe — rebuilt by `bV()` |
| `CLUSTERS{}` | RW | In-memory only | Safe |
| `LP_stockHolds` | demand + stock | In-memory only | **Dangerous**: recomputed in render path |
| `LP_ARRIVAL_FIFO` | LP plan | In-memory only | Safe |
| `LP_ARRIVAL_MAP` | LP plan | In-memory only | Safe |
| `RW[]._effQty` | RW.Required + NOM.ppu | In-place mutation of source | **Dangerous**: enrichment mutates source array |
| `window._lpStockStatus` | plan + stock + dispatched | In-memory only | Safe — precomputed before render |
| `window._asmTimelineData` | PLAN_CACHE + LP data | In-memory only | Safe |
| `window._kitTimelineData` | PLAN_CACHE + kits | In-memory only | Safe |
| `window._lateArrivalData` | PLAN_CACHE + LP + arrivals | In-memory only | Safe |
| `LP_lastGenSettings` | Current settings snapshot | Supabase `lp-config` | Safe |
| `LM_STP_TRUCKS{}` | STP deliveries + NOM + RW | In-memory only | Safe — rebuilt by `numberAll()` |

### C. View/UI State (Should Not Affect Business Truth)

| Variable | Purpose | Danger |
|----------|---------|--------|
| `curMod` | Active module (lm/lp/v26) | Safe |
| `LP_TAB` | Active LP tab | Safe |
| `cv` | LM current view | Safe |
| `sel` / `selCluster` | Selected venue/cluster | Safe |
| `vCat` | Country filter | Safe |
| `_lpDemFilterState` | Demand tab filter preservation | Safe |
| `_lpDemDests` / `_lpDemSrcs` | Demand filter sets | Safe |
| `_LP_EXCL_ABBRS` | Late tab exclusion set | Safe |
| `LM_excluded` | Auto-excluded Step B trucks | **Borderline**: affects V26 display but not engine |
| `LM_excludeUserOvr` | User exclusion overrides | **Borderline**: same |
| `expCl` | Expanded clusters in UI | Safe |

### D. Persisted Collaboration State

| Key | Contents | Readers |
|-----|----------|---------|
| `fm-nom` | NOM (full) | index.html, fa-goods.html |
| `fm-rw` | RW (full) | index.html, fa-goods.html, sitrep.html |
| `fm-vs` | VS (venue settings) | index.html, fa-goods.html |
| `fm-stock` | Stock report | index.html, sitrep.html |
| `fm-lm-dispatch` | LM dispatch state + snapshots | index.html, fa-goods.html |
| `lp-plan` | LP generated plan (slim) | index.html, fa-goods.html, sitrep.html |
| `lp-truck-state` | All LP truck-level state | index.html, sitrep.html |
| `lp-config` | LP engine settings | index.html, fa-goods.html |
| `lp-nom` | LP nomenclature | index.html, sitrep.html |
| `lp-arrivals` | LP arrivals | index.html, sitrep.html |
| `lp-demand` | LP aggregated demand | index.html |
| `lp-demand-raw` | LP raw demand archive | index.html |
| `fa-nom/demand/groups` | FA goods data | fa-goods.html (owner), index.html (reader) |
| `fa-assignments` | FA group assignments | index.html (writer), fa-goods.html (reader) |
| `hs-ai-config` | AI provider config | index.html only |
| `digests` bucket | Excel reports | digest.html (writer), digest.html (reader) |

---

## SECTION 4 — ENGINE PIPELINE

### 4.1 LP Engine Pipeline

```
User uploads 3 files (Nom, Material Plan, Arrivals)
         │
         ▼
┌─────────────────────────┐
│  goGenerateLP()         │  Parse files, aggregate demand, inject FA
│  Line 17325             │
└────────────┬────────────┘
             │
             ▼
��─────────────────────────┐
│  LP_buildPlanV3()       │  CORE ENGINE (quasi-pure function)
│  Line 1122              │
│                         │
│  ┌───────────────────┐  │
│  │ 1. Preprocess      │  │  Normalize NOM, build inventory timeline
│  │                    │  │  delta[readyDate][sku] = cumulative qty
│  │ 2. Demand Ration   │  │  If supply < demand: proportional split
│  │    (deterministic) │  │  Sort dests alphabetically for stability
│  │                    │  │
│  │ 3. Bucket 1:       │  │  MEX/CAN destinations
│  │    MEX/CAN         │  │  Consolidation mode (pending buffer)
│  │    planStream()    │  │  SR deferral guard
│  │                    │  │
│  │ 4. Stock Rebuild   │  │  Snapshot pre-RIC inventory
│  │    for Bucket 2    │  │  Deduct B1 overshoot from post-RIC delta
│  │                    │  │
│  │ 5. Bucket 2:       │  │  USA/RIC destinations
│  │    USA/RIC         │  │  No consolidation, arrival-dependent
│  │    planStream()    │  │
│  │                    │  │
│  │ 6. Leftover        │  │  Distribute remaining demand
│  │    Distribution    │  │  Respect MAX_PLT per truck
│  └───────────────────┘  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  _lpTailReconstruct()   │  Optimize last 2 unlocked trucks per (dest,date)
│  Line 1537              │  Strategy: merge if combined ≤ MAX_PLT
│                         │  Otherwise: exhaustive search (500K cap)
│                         │  Stock-aware: prefers ready solutions at ≥90%
│                         │  9 invariant checks; abort on any violation
└──���─────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  LP_updateStockWaterfall │  Walk trucks in date+ID order
│  Line 5111              │  Deduct stock from pool per truck
│                         │  OOR trucks exempt from deduction
│                         │  Output: ready/pending status per truck
└────���───────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  LP_saveToSupabase()    │  Persist 6 keys to Supabase
│  LP_render()            │  Render UI
└─────────────────────────┘
```

**LP_regenerate() (partial rebuild):**
When locked trucks exist, the pipeline changes:
1. Snapshot locked rows
2. Compute consumed demand/stock (accounting for returns)
3. Reduce demand and arrivals by consumption
4. Run `LP_buildPlanV3()` on remainder with `startTruckId = max(locked) + 1`
5. Concatenate: `[locked rows] + [new rows]`
6. Run `_lpTailReconstruct()` on new rows only

**Key Sub-Functions:**

| Function | Line | Purpose | Pure? |
|----------|------|---------|-------|
| `_lpAggregateDemand()` | 1060 | Per-row PPU ceiling, sum by dest+sku | Yes |
| `buildOneTruck()` | 1203 | 4-pass SR loading + deferral guard | Yes (local state) |
| `planStream()` | 1269 | Day-by-day planner with pending buffer | Yes (local state) |
| `_topUpPending()` | 1287 | Fill pending trucks with new stock | Yes (local state) |
| `_emitPending()` | 1276 | Emit truck when ≥90% full | Yes (local state) |
| `_lpTailReconstruct()` | 1537 | Exhaustive tail optimization | Yes |
| `LP_computeStockWaterfall()` | 5111 | Stock deduction waterfall | Yes (output to window global) |

### 4.2 LM Engine Pipeline

```
User uploads 2 files (Nomenclature, Material Plan)
         │
         ▼
┌─────────────────────────┐
│  pNm() + pPl()          │  Parse files into NOM{} and RW[]
│  _rwEnrichEffQty()      │  Add _effQty to all RW rows
└────────────┬────────────┘
             │
             ▼
��─────────────────────────┐
│  LM_injectKits()        │  Create NOM entries for kits
│  LM_injectManualDemand()│  Add manual demand rows to RW
│  LM_applyNomOverrides() │  Apply pallet dimension overrides
└───���────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  bV()                   │  Build venue/cluster maps
│  Line 10540             │  Output: VN[], CLUSTERS{}, LM_vtMap
└────────────┬────────────┘
             │
             ▼
��─────────────────────────┐
│  numberAll()            │  MASTER ORCHESTRATOR
│  Line 10616             │
│                         │
│  ┌───────────────────┐  │
│  │ 1. Compute locked  │  │  Demand deductions from LM_lockedSnapshots
│  │    demand          │  │  _lockedDemandByLabel, _lockedDemandByDate
│  │                    │  │
���  │ 2. Step A: Cluster │  │  build(cluster, [venues]) for grouped venues
│  │    builds          │  │  STA/IBC get individual build within cluster
│  │                    │  │
��  │ 3. Step B: Per-    │  │  build(venue, null, skipNoBi=true)
│  │    venue builds    │  │  Trucks marked _isStepB, auto-excluded
│  │                    │  │
│  │ 4. Step C: Stand-  │  │  build(venue) for unclustered venues
│  │    alone venues    │  │
│  │                    │  │
│  │ 5. Inject locked   │  │  Deep copy snapshots into PLAN_CACHE
│  ���    snapshots       │  │  Recalc pallets if returns exist
│  │                    │  │
│  ��� 6. Global number   │  │  LM-1, LM-2, ... by dispatch date
│  │    + FP migration  │  │  C-1, C-2, ... for CORT
│  │                    ��  │
│  │ 7. STP trucks      │  │  _stpBuildTruck() per delivery
│  │                    │  │
│  │ 8. Date overrides  │  │  LM_applyDateOverrides()
│  │    + save          │  │
│  └───────────────────┘  ��
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Rendering              │  rT(), rVL(), rMain()
│  Dashboard KPIs         │  Calendar, trucks, dispatch
└────────────��────────────┘
```

**build(venue) Sub-Pipeline:**

```
Phase 0: Demand Aggregation
  - Filter RW by venue(s)
  - Apply holds, demand adjustments, kit allocations
  - Deduct locked truck demand (per-date and global)
  - Separate CORT items
  - Build pool{} with remaining demand
        │
        ▼
Phase 1: Early Path (pre-BI items)
  - No top-ups, exact pallet-aligned qty
  - Bin-pack by largest-first into trucks
        │
        ▼
Phase 2: Main Scheduling (per date)
  Pass 1: Scheduled + carry-over → bin-pack
  Pass 2: Fill-up (if !noTopUp)
    - Sub 1: Full pallets from pool
    - Sub 2: Partial remainders
    - Sub 3: Future-pull from upcoming dates
  Overflow → carry to next working day
        │
        ▼
Phase 3: Mop-Up (remaining pool)
  - Cluster: append to first truck
  - Individual: new trucks
        ��
        ▼
Phase 4: No-Pallet Items
  - Attach to matching-date or first truck
```

### 4.3 Late Engine Pipeline

```
LP_computeLateArrivals()
         │
         ▼
For each LP truck item:
  ┌──────────────────┐
  │ Determine Path:  │
  │ 1. Dallas Direct │  _isDallasDirect(venue)
  │ 2. LP-Fed        │  LM_isLPFed(venue)
  │ 3. USA non-LP    │  Everything else
  └───────┬──────────┘
          │
          ▼
  Compute required dates backwards from bump-in:
  BI ← outbound transit ← WHS processing ← LP arrival ← LP ship ← Dallas ready
          │
          ▼
  Compare actual vs required at each step
  Identify "why late" (which leg caused delay)
          │
          ▼
  Output: window._LP_ALL_LATE_ITEMS, window._LP_DEST_BI
```

### 4.4 Assembly Timeline Pipeline

```
For each assembled item (LM_isAssembled = true):
  1. Arrives Dallas: from stock or earliest container arrival
  2. Leaves Dallas: LP truck ship date (LP-fed) or computed backwards
  3. Arrives Satellite: LP arrival date or computed
  4. Leaves Satellite: dispatch date (BI - outbound - WHS processing)
  5. Bump-in: venue schedule date

Output: window._asmTimelineData
```

---

## SECTION 5 — INVARIANTS / NON-NEGOTIABLE RULES

### Confirmed Invariants (High Confidence)

| # | Invariant | Meaning | Where Enforced | Consequence if Broken |
|---|-----------|---------|----------------|----------------------|
| I1 | **Locked trucks are immutable** | Items, quantities, pallets on a locked/dispatched truck must never change | LP: `LP_regenerate()` snapshots locked rows, rebuilds only remainder. LM: `LM_lockedSnapshots` injected AFTER build, never passed to build() | Double-counting demand, phantom trucks, data loss |
| I2 | **Demand rationing is deterministic** | Given same inputs, same browser gets same allocation | LP: destination keys sorted alphabetically before rationing (line ~1166) | Different users see different plans from same data |
| I3 | **No truck exceeds MAX_PLT** | Every truck must fit within pallet capacity | LP: enforced in `_loadWhole`/`_loadPartial`, leftover distribution, tail reconstruction invariant check | Physical impossibility — truck can't carry more |
| I4 | **Fingerprint stability** | Locked truck FPs must survive kit renaming and rebuilds | LM: `LM_fp()` uses `KIT:{kitId}` not volatile SKU names. Migration in `numberAll()` | Orphaned snapshots, lost lock state, demand double-count |
| I5 | **OOR trucks don't deduct stock** | Trucks with OOR submitted are stock-reserved but not consumed | LP: stock waterfall skips deduction for OOR trucks | Incorrect ready/pending status for subsequent trucks |
| I6 | **Per-row PPU ceiling** | PPU division applies per material plan row, not after aggregation | `_lpAggregateDemand()`: `effQty += ceil(raw / ppu)` per row | Quantity errors (e.g., 4 UoM instead of 3) |
| I7 | **Returns re-enter demand pool** | Returned items from locked trucks become available for replanning | LP: `LP_regenerate()` subtracts returns from consumed demand. LM: `numberAll()` uses effective qty for global deduction | Returned items vanish from system |
| I8 | **Save/load roundtrip preserves truth** | All 3 LP save paths produce identical payloads | `LP_saveTruckState`, `LP_saveToSupabase`, `beforeunload` handler | Data loss or corruption on reload |
| I9 | **CORT items skip pallet engine** | CT RNT/CT RTL source items are collected separately, never loaded onto freight trucks | `build()`: `if(ct) { cortDated[bk].push(); continue; }` | CORT items consume freight truck capacity |
| I10 | **Soft reset preserves overrides** | `doSoftResetLP`/`doSoftResetLM` must preserve all manual user work | Explicitly listed preserved variables in each soft reset | User loses hours of customs/hold/transit work |
| I11 | **Stock waterfall is ordered** | Trucks processed in date+ID order; earlier trucks consume stock first | `LP_computeStockWaterfall()`: sort by date then truckId | Wrong trucks shown as ready |
| I12 | **Kit demand deduction** | Kit component quantities are subtracted from individual SKU demand | `build()`: `q = max(0, q - kitAllocMap[venue|sku])` | Double-counting kit components |
| I13 | **Date rule inheritance** | When items overflow to next day, capacity constraints carry over | `build()`: `_inheritedCap`, `_inheritedNoTopUp` passed to next day | Overflow day uses wrong truck capacity |

### Suspected Invariants (Require Validation)

| # | Invariant | Confidence | Why Uncertain |
|---|-----------|------------|---------------|
| S1 | **Tail reconstruction qty invariant** | Medium | 9 invariant checks exist but I8 (no negative values) could mask precision issues |
| S2 | **STP exclusion consistency** | Medium | STP items excluded from main engine AND from LP — but edge case: what if STP venue changes? |
| S3 | **Undo captures all mutations** | Medium | 46+ fields captured but CLAUDE.md notes NOM/RW not restorable via undo |
| S4 | **Manual arrivals survive soft reset** | Medium | Code filters `_manual: true` entries — but migration from old format unclear |
| S5 | **beforeunload flushes all pending** | Low | Only flushes truck-state + config, not plan/demand/nom/arrivals |

---

## SECTION 6 — MUTATION MAP

### 6.1 LP_STATE.generatedPlan

| Operation | Function | Type | Safe? |
|-----------|----------|------|-------|
| **Create** | `LP_buildPlanV3()` | Full replacement | Yes — engine output |
| **Create** | `LP_regenerate()` | Concat locked + rebuilt | Yes |
| **Mutate** | `LP_changeDate()` | Direct row.date mutation | **Dangerous** — mutates plan in-place |
| **Mutate** | `_lpTailReconstruct()` | Repacks tail trucks | Yes — returns new array |
| **Read** | `LP_renderPlan()` | Render truck cards | Yes |
| **Read** | `LP_computeStockWaterfall()` | Stock deduction walk | Yes |
| **Read** | `LP_computeLateArrivals()` | Late analysis | Yes |
| **Read** | All export functions | Excel generation | Yes |
| **Persist** | `LP_saveToSupabase()` | Slim rows to Supabase | Yes |
| **Restore** | `LP_loadFromSupabase()` | Full replacement from Supabase | Yes |
| **Restore** | `UNDO_restore()` | Full replacement from snapshot | Yes |

### 6.2 NOM{} (Nomenclature)

| Operation | Function | Type | Safe? |
|-----------|----------|------|-------|
| **Create** | `pNm()` file parse | Full replacement | Yes |
| **Mutate** | `LM_applyNomOverrides()` | In-place field overwrite | **Dangerous** — modifies source |
| **Mutate** | `LP_applyPalletOverrides()` | In-place with `_origPalletQty` backup | **Dangerous** |
| **Mutate** | `LM_injectKits()` | Adds synthetic entries (`_kitNom: true`) | **Dangerous** — pollutes source with derived |
| **Mutate** | `numberAll()` | Creates compat NOM for locked kit items | **Dangerous** |
| **Read** | `build()`, `bV()` | Pallet calculations | Yes |
| **Read** | All renderers and exports | Display | Yes |

### 6.3 PLAN_CACHE{}

| Operation | Function | Type | Safe? |
|-----------|----------|------|-------|
| **Create** | `numberAll()` → `build()` | Full rebuild | Yes |
| **Mutate** | `numberAll()` | Inject locked snapshots, apply date overrides, number trucks | Yes (post-build) |
| **Mutate** | `LM_applyDateOverrides()` | Changes `.dd` on trucks | Yes (cosmetic) |
| **Read** | All LM renderers | Display | Yes |
| **Read** | `generateDailyDigest()` | Digest snapshot | **Dangerous** — forces `numberAll()` rebuild |
| **Read** | `LP_computeLateArrivals()` | Late analysis | **Dangerous** — may rebuild PLAN_CACHE |
| **Never persisted** | — | Always rebuilt from source | — |

### 6.4 LP_dispatched (Set)

| Operation | Function | Type | Safe? |
|-----------|----------|------|-------|
| **Add** | `LP_toggleDispatch()` | Lock truck | Yes |
| **Add** | `LP_changeDate()` | Auto-lock on date change | Yes |
| **Remove** | `LP_toggleDispatch()` | Unlock → triggers `LP_regenerate()` | Yes |
| **Clear** | `goGenerateLP()` | Fresh plan resets all locks | Yes |
| **Clear** | `doResetLP()` | Hard reset | Yes |
| **Persist** | `LP_saveTruckState()` | As array in lp-truck-state | Yes |
| **Restore** | `LP_loadFromSupabase()` | From array | Yes |

### 6.5 LM_lockedSnapshots{}

| Operation | Function | Type | Safe? |
|-----------|----------|------|-------|
| **Create** | `LM_toggleDispatchTruck()` | Deep copy of truck at lock | Yes |
| **Create** | `LM_changeDate()` | Snapshot if none exists | Yes |
| **Mutate** | `LM_returnItem()` | Only `_returned` map | Yes (minimal mutation) |
| **Delete** | `LM_toggleDispatchTruck()` unlock | Remove snapshot | Yes → triggers `numberAll()` |
| **Read** | `numberAll()` | Demand deduction + injection | Yes |
| **Persist** | `LM_saveDateOverrides()` | JSON in `fm-lm-dispatch` | Yes |

### 6.6 Hidden/Dangerous Mutation Patterns

| Pattern | Where | Why Dangerous |
|---------|-------|---------------|
| **Render-time stock hold recomputation** | `LP_renderPlan()`, `LP_renderDemand()` call `LP_recomputeStockHolds()` | Business state mutated during display |
| **NOM pollution by kit injection** | `LM_injectKits()` adds entries to NOM with `_kitNom: true` | Source data contains derived entries |
| **NOM mutation by pallet overrides** | `LP_applyPalletOverrides()` writes directly to `LP_STATE.nomenclature[sku]` | Override and source entangled |
| **RW enrichment in-place** | `_rwEnrichEffQty()` adds `_effQty` to source RW rows | Derived field on source array |
| **PLAN_CACHE rebuild from render/export** | `generateDailyDigest()` calls `numberAll()` to ensure fresh data | Export triggers full engine run |
| **Late engine rebuilds PLAN_CACHE** | `LP_computeLateArrivals()` may rebuild PLAN_CACHE for LM data | Cross-module rebuild triggered by analysis view |
| **LP_changeDate() in-place mutation** | Mutates plan row dates directly | No rebuild, just direct field change |

---

## SECTION 7 — GLOBALS / COUPLING / FRAGILITY

### F1: Giant Global State
**Description:** ~60 state variables + ~50 derived/UI variables as top-level `let`/`const`. No encapsulation, no modules.
**Code areas:** Lines 8749+ for declarations.
**Why fragile:** Any function can read/write any global. No compile-time protection. Typos in variable names silently create new globals.
**Failure mode:** Silent data corruption, stale state after missed updates.
**Severity:** HIGH

### F2: DOM-Coupled Compute
**Description:** Stock hold computation (`LP_recomputeStockHolds()`) called from render functions `LP_renderPlan()` and `LP_renderDemand()`.
**Code areas:** Lines 5157, 4729.
**Why fragile:** Render order affects business state. Skipping render skips hold computation.
**Failure mode:** Stale holds if render doesn't fire.
**Severity:** HIGH

### F3: Render-Time Business Logic
**Description:** `generateDailyDigest()` forces `PLAN_CACHE={}; numberAll()` — full engine rebuild during export. `LP_computeLateArrivals()` may rebuild PLAN_CACHE.
**Code areas:** Lines 13363-13603, 6046-6219.
**Why fragile:** Export and analysis views trigger engine execution. Side effects from "read-only" operations.
**Failure mode:** Unexpected plan changes during export, performance degradation.
**Severity:** MEDIUM

### F4: Order-Dependent Initialization
**Description:** App initialization loads 13+ Supabase keys in 2 waves. `_rwEnrichEffQty()` must run after NOM load. `LP_recomputeStockHolds()` must run after plan rehydration.
**Code areas:** `loadSharedData()` lines 9035-9080.
**Why fragile:** Reordering init steps breaks derived state. Error swallowing (`.catch(()=>{})`) masks failures.
**Failure mode:** Missing enrichments, stale holds, blank renders.
**Severity:** MEDIUM

### F5: Implicit Cache Key Assumptions
**Description:** PLAN_CACHE keyed by venue/cluster label string. Locked snapshot keyed by fingerprint string. No validation that keys match.
**Code areas:** `numberAll()`, `LM_fp()`.
**Why fragile:** If venue renames or cluster restructures, keys become orphaned.
**Failure mode:** Lost snapshots, phantom trucks, demand miscounting.
**Severity:** MEDIUM

### F6: Save/Load Asymmetry
**Description:** 3 different save functions (`LP_saveTruckState`, `LP_saveToSupabase`, `beforeunload`) must produce identical payloads. Manual maintenance — no single source of truth for payload shape.
**Code areas:** Lines 3840-3900, 3914-3947.
**Why fragile:** Adding a new field requires updating all 3 save paths AND both load paths. `beforeunload` uses raw REST API (different code path than Supabase client).
**Failure mode:** New state variable lost on reload or page close.
**Severity:** HIGH

### F7: NOM Entanglement
**Description:** NOM is simultaneously source data AND runtime mutation target. Kit injection, pallet overrides, and locked truck compat entries all write to NOM.
**Code areas:** `LM_injectKits()`, `LP_applyPalletOverrides()`, `numberAll()` compat entries.
**Why fragile:** Impossible to distinguish source NOM from derived NOM without checking flags.
**Failure mode:** Override removal fails to restore original, kit entries persist after kit deletion.
**Severity:** HIGH

### F8: Undo Does Not Capture File Data Fully
**Description:** `_undoSnap()` captures NOM and RW as JSON, but CLAUDE.md notes "undo does not capture LP_STATE.nomenclature/materialPlan/arrivals" — undo covers mutations, not file imports.
**Code areas:** Lines 832-883.
**Why fragile:** Undoing past a file import cannot restore the previous file state.
**Failure mode:** Undo after file upload leaves system in hybrid state.
**Severity:** MEDIUM

### F9: Debounce Timer Races
**Description:** `LP_saveTruckStateDebounced` (1.5s) can race with `LP_saveToSupabase` (immediate). Timer not always cleared.
**Code areas:** Lines 3864-3868.
**Why fragile:** Debounced save can overwrite immediate save with stale data.
**Failure mode:** Redundant write (usually harmless) or stale data overwrite (rare but possible).
**Severity:** LOW

### F10: Concurrent Multi-User Edits
**Description:** No merge strategy — last write wins. Two users editing simultaneously overwrite each other.
**Code areas:** All Supabase upsert calls.
**Why fragile:** No conflict detection, no operational transform, no locking.
**Failure mode:** Data loss in collaborative scenarios.
**Severity:** MEDIUM (mitigated by typically single active admin)

### F11: Stock Waterfall Computed in Render
**Description:** CLAUDE.md audit notes "Stock waterfall computed in LP_renderPlan() render path (state mutation in render)." Now pre-computed via `LP_updateStockWaterfall()` but `LP_recomputeStockHolds()` still called from render.
**Code areas:** Lines 5157, 5111-5148.
**Why fragile:** Render dependency for business truth.
**Failure mode:** Stale waterfall if render skipped.
**Severity:** MEDIUM

---

## SECTION 8 — USER ACTIONS TO DOMAIN COMMANDS

### 8.1 Upload Demand (LP)

| Aspect | Detail |
|--------|--------|
| **User thinks** | "I'm uploading my material plan spreadsheet" |
| **Functions called** | `lpHF()` → `goGenerateLP()` → `LP_parseMaterialPlan()` → `_lpSaveRawDemand()` → `_lpAggregateDemand()` → `LP_buildPlanV3()` → `_lpTailReconstruct()` |
| **Data touched** | `LP_STATE` (full reset), `LP_dispatched` (cleared), all LP overrides (cleared) |
| **Business meaning** | Replace entire LP plan. All previous dispatch state lost. |
| **Hidden side effects** | Archives raw demand to `lp-demand-raw`. Injects FA goods. Clears returns. Notifies LM via `_lpNotifyLM()`. |
| **Cleanly separable?** | No — file parsing, demand aggregation, engine execution, persistence, and UI render all in one function |

### 8.2 Upload Stock Report

| Aspect | Detail |
|--------|--------|
| **User thinks** | "I'm updating what's in the warehouse" |
| **Functions called** | `stockReportParse()` → `stockReportSave()` → `LP_updateStockWaterfall()` → `LP_recomputeStockHolds()` |
| **Data touched** | `STOCK_SKUS`, `STOCK_QTYS`, `LP_stockHolds` |
| **Business meaning** | Update available inventory. Triggers plan dirty flag. |
| **Hidden side effects** | If LP plan exists, triggers `LP_regenerate()`. Saves to `fm-stock` Supabase key. |
| **Cleanly separable?** | Mostly — stock parsing is separate from hold recomputation |

### 8.3 Lock/Dispatch Truck (LP)

| Aspect | Detail |
|--------|--------|
| **User thinks** | "This truck is confirmed, don't change it" |
| **Functions called** | `LP_toggleDispatch(truckId, true)` → `LP_dispatched.add()` → `LP_recomputeStockHolds()` → `LP_saveTruckStateDebounced()` → `LP_render()` |
| **Data touched** | `LP_dispatched` Set, `LP_stockHolds` |
| **Business meaning** | Lock truck items as committed. Stock consumed. |
| **Hidden side effects** | Stock holds recomputed. |
| **Cleanly separable?** | Yes — dispatch is a clean state transition |

### 8.4 Unlock Truck (LP)

| Aspect | Detail |
|--------|--------|
| **User thinks** | "Cancel this truck, redistribute its items" |
| **Functions called** | `LP_toggleDispatch(truckId, false)` → `LP_dispatched.delete()` → `delete LP_returned[truckId]` → `LP_regenerate()` |
| **Data touched** | `LP_dispatched`, `LP_returned`, `LP_STATE.generatedPlan` (full rebuild) |
| **Business meaning** | Release all items back to demand pool. Full plan regeneration. |
| **Hidden side effects** | Returns for this truck are deleted. Full engine rebuild including tail reconstruction. |
| **Cleanly separable?** | No — unlock triggers full rebuild |

### 8.5 Lock/Dispatch Truck (LM)

| Aspect | Detail |
|--------|--------|
| **User thinks** | "This truck is shipping, freeze it" |
| **Functions called** | `LM_toggleDispatchTruck(idx, true)` → snapshot creation → `LM_dispatched.add(fp)` → `LM_saveDateOverrides()` → `rMain()` |
| **Data touched** | `LM_dispatched`, `LM_lockedSnapshots` |
| **Business meaning** | Deep copy truck. Future rebuilds deduct this demand and inject snapshot unchanged. |
| **Hidden side effects** | Snapshot includes frozen `_pq`, `_ps`, `_kitId`, `_kitItems` for NOM reconstruction. Does NOT call `numberAll()` — only re-renders. |
| **Cleanly separable?** | Mostly — snapshot creation is clean, but NOM compat entry creation is entangled |

### 8.6 Unlock Truck (LM)

| Aspect | Detail |
|--------|--------|
| **Functions called** | `LM_toggleDispatchTruck(idx, false)` → `LM_dispatched.delete(fp)` → `delete LM_lockedSnapshots[fp]` → `numberAll()` |
| **Business meaning** | Items return to pool. Full LM rebuild. |
| **Hidden side effects** | Full `numberAll()` rebuild including all venues. |

### 8.7 Return Items from Locked Truck

| Aspect | Detail |
|--------|--------|
| **Functions called** | LP: `LP_returnItem()` → `LP_returned[truckId][sku] += qty` → `LP_regenerate()`. LM: `LM_returnItem()` → `snap._returned[sku] += qty` → `numberAll()` |
| **Business meaning** | Partial items from a locked truck are sent back to demand pool |
| **Hidden side effects** | Full engine rebuild. Effective qty on truck reduced. |

### 8.8 Apply Hold

| Aspect | Detail |
|--------|--------|
| **Functions called** | LP: `LP_toggleHold()` → `LP_holds.add/delete("dest|sku")`. LM: `LM_toggleHold()` |
| **Business meaning** | Exclude SKU-destination pair from engine planning |
| **Hidden side effects** | Triggers save and re-render. LP plan becomes dirty (needs regeneration). |

### 8.9 Sync (Reload from Supabase)

| Aspect | Detail |
|--------|--------|
| **Functions called** | `syncLM()` / `syncLP()` / `syncV26()` |
| **Business meaning** | Refresh local state from shared Supabase data |
| **Hidden side effects** | Full rebuild of venues/plans. May override local unsaved changes. |

### 8.10 Backup Export / Restore

| Aspect | Detail |
|--------|--------|
| **Functions called** | `masterBackupExport()` (21 Excel sheets) / `masterBackupRestorePrompt()` → `masterBackupRestore()` |
| **Business meaning** | Full state snapshot to/from Excel file |
| **Hidden side effects** | Restore calls ALL 13+ save functions, full engine rebuild, full render |

### 8.11 Generate Daily Digest

| Aspect | Detail |
|--------|--------|
| **Functions called** | `generateDailyDigest()` |
| **Business meaning** | Create email-ready status report + Excel attachment |
| **Hidden side effects** | **Forces `PLAN_CACHE={}; numberAll()` rebuild**. Computes assembly/kitting/late timelines. Serializes to sessionStorage. Opens digest.html in new tab. |
| **Cleanly separable?** | No — digest generation requires full engine rebuild |

---

## SECTION 9 — INPUTS / OUTPUTS / INTERFACES

### 9.1 Inputs

#### Uploaded Files

| File | Module | Parser | Expected Format | Validation |
|------|--------|--------|-----------------|------------|
| LM Nomenclature | LM | `pNm()` | Excel: SKU, Name, Source, UOM, PPU, Dis Qty/Spc, Asm Qty/Spc | Column header matching |
| LM Material Plan | LM | `pPl()` | Excel: Venue, Cluster, SKU, Item, Required, BI Date | Column header matching |
| LP Nomenclature | LP | `LP_parseNomenclature()` | Excel: SKU, Name, Source, palletQty, palletSpc, price, hsCode, country | Auto-detect by headers |
| LP Material Plan | LP | `LP_parseMaterialPlan()` | Excel: Destination, SKU, Qty | Auto-detect |
| LP Arrivals | LP | `LP_parseArrivals()` | Excel: SKU, Container, ArrivalDate, Qty | Auto-detect |
| Stock Report | Shared | `stockReportParse()` | Excel: SKU/Code column + Available/Qty column | Heuristic column detection |

#### Manual Edits (Source Overrides)
- Customs overrides (HS code, country, price, customs name, Mexico fields)
- Pallet dimension overrides (palletQty, palletSpc)
- Container date overrides
- Transit day overrides
- WHS processing day overrides
- Demand quantity adjustments
- Manual arrival entries
- Manual demand entries
- Kit definitions
- STP delivery definitions
- Hold/release actions
- Pallet assembly mode configuration

### 9.2 Outputs

#### Truck Plans
- **LP Plan**: Trucks with date, destination, SKU, qty, pallets. Persisted to `lp-plan`.
- **LM Plan**: Trucks in PLAN_CACHE per venue. NOT persisted (rebuilt each session).

#### Excel Exports
| Export | Function | Sheets | Key Data |
|--------|----------|--------|----------|
| LP Commercial Invoice | `LP_exportCI_ExcelJS()` | CI + Packing List | Party data, customs fields, line totals |
| LP Combined CI | `LP_exportCombinedCI()` | Multi-truck CI | All trucks for selected destinations |
| LM Assembly Timeline | `LM_exportAsmTimeline()` | 1 sheet | 5-column date chain |
| LM Kitting Timeline | `LM_exportKitTimeline()` | 1 sheet | Kit dispatch + components |
| LM Late Arrivals | `LM_exportLateArrivals()` | Summary + per-dest | Late items with "why" |
| Full Backup | `masterBackupExport()` | 21 sheets | Complete system state |
| Daily Digest | digest.html | 6 sheets | Arrivals, LP/LM forecast, late, assembly, kitting |

#### Dashboards
- LP Status tab: KPIs (trucks, pallets, progress)
- LP Plan tab: Truck cards with stock waterfall status
- LM Dashboard: KPIs, calendar, truck cards, dispatch tracking
- V26 Vision: Unified command view
- SITREP: Radar-style operational readiness
- Digest email: Outlook-compatible HTML status report

### 9.3 Inter-Module Interfaces

| From | To | Mechanism | Data |
|------|----|-----------|------|
| index.html | fa-goods.html | Supabase shared keys | NOM, RW, LP plan, LM dispatch, venue settings |
| fa-goods.html | index.html | Supabase `fa-groups`, `fa-assignments` | FA delivery groups, truck assignments |
| index.html | sitrep.html | Supabase shared keys | LP plan, truck state, arrivals, NOM, stock, RW |
| index.html | digest.html | sessionStorage `_digestData` | Serialized full state snapshot |
| digest.html | Supabase Storage | `digests` bucket | Excel report upload |
| index.html | LP engine | Function call | demand, arrivals, config → plan |
| index.html | LM engine | Function call | RW, NOM, settings → PLAN_CACHE |

---

## SECTION 10 — EDGE CASES / SPECIAL LOGIC

### 10.1 Low-Fill Deferral (LP)
**How it works:** When building a truck for a destination, if the truck has SR (stock report) items loaded but isn't full, AND the destination still needs SR items, AND future SR arrivals are expected — the truck is deferred (returned as `{pending: true}`). It enters the pending buffer and is topped up daily as new SR stock arrives. This prevents wasting truck space on non-SR items when SR items are coming soon.

**Threshold:** Truck emits when ≥90% full (`FULL_THRESH = ceil(MAX_PLT * 0.9)`).

### 10.2 Pending Flush (LP)
**How it works:** At end of `planStream()`, all remaining pending trucks are force-emitted regardless of fill level. The `force=true` parameter bypasses the per-date max truck limit.

### 10.3 Stock-First vs Forecast (LP)
**How it works:** The LP engine uses a day-by-day approach. Stock is only available for loading when its `readyDate` has been reached (controlled by `fPtr` pointer through `futDates[]`). Stock report items get `readyDate = today` (immediately available). This creates a natural "stock-first" behavior.

### 10.4 Rationing Under Shortage (LP)
**How it works:** When total demand for a SKU exceeds available inventory:
1. Compute ratio = inventory / totalDemand
2. For each destination (sorted alphabetically): `alloc = floor(demand * ratio / pq) * pq` (whole pallets)
3. Greedy fill of remaining pallets to first destinations that qualify
**Determinism:** Alphabetical sort ensures same allocation across browsers/sessions.

### 10.5 Per-Destination Constraints
**LP:** `maxDests` (max destinations per day), `maxTrucks` (max trucks per day). Both configurable.
**LM:** `gTC(venue)` (truck capacity), `gMT(venue)` (max trucks/day). Per-date overrides via `dateOverrides`.

### 10.6 Last-Truck Leftovers (LP)
**How it works:** After both buckets complete, remaining demand items are distributed. Each leftover item goes to the last truck for its destination. If adding it would exceed MAX_PLT, a new truck is created. This ensures every demanded item is allocated somewhere.

### 10.7 Mixed Pallet Handling (FA Goods)
**How it works:** FA items marked `_mixed` share pallets (sum raw → ceil at group level). Unmixed items get individual ceilings. This allows small items to share pallet space.

### 10.8 Locked Truck Exceptions
- Locked trucks are NEVER passed to `build()` or `LP_buildPlanV3()`
- Their demand is deducted BEFORE engine runs
- They are injected AFTER engine completes
- Kit SKU names on locked trucks are frozen (not renamed)
- Fingerprint migration handles old-format FPs

### 10.9 Returns (Actuals Lower Than Planned)
- `LP_returned[truckId][sku] = returnedQty` — additive
- Effective qty = original - returned
- Returned items re-enter demand pool on next regeneration
- LM: `snap._returned[sku]` in locked snapshot, triggers `numberAll()` rebuild
- Pallet recalculation uses effective qty

### 10.10 Cluster vs Venue Builds (LM)
**Step A:** Cluster build groups venues. STA/IBC venues build individually within cluster.
**Step B:** Individual venue builds within cluster (marked `_isStepB`, auto-excluded by default).
**Step C:** Standalone venues without cluster.
**Why both:** Cluster build handles shared trucks; individual builds allow venue-specific truck views.

### 10.11 Hold Behavior
- LP: Held items excluded from demand aggregation in engine. Plan becomes dirty.
- LM: Held items skipped in `build()` aggregation. `holdReleased` acts as scheduling floor: `planBiK = max(origBiK, releaseDate, today)`.

### 10.12 Override Precedence
- Customs: `LP_customsOverrides[sku]` > `LP_STATE.nomenclature[sku]`
- Pallets: `LP_palletOverrides[sku]` > `LP_STATE.nomenclature[sku]`
- NOM (LM): `LM_nomOverrides[sku]` > base `NOM[sku]`
- Assembly: `LM_palletCfg[venueType].overrides` flips base mode
- Dates: `LP_contDateOverrides[container]` > file arrivalDate
- Transit: `LP_transitDays[abbr]` > `LP_TRANSIT_DEFAULTS[abbr]`

### 10.13 Undo/Restore Gaps
- NOM/RW captured as JSON in undo snapshots, but noted as "not restorable via undo" for file imports
- LP nomenclature/materialPlan/arrivals NOT in undo (file data)
- Undo stack is in-memory only (max 15), lost on page close
- Undo restore calls ALL 13+ save functions (heavy Supabase write)

---

## SECTION 11 — ACCEPTANCE SCENARIOS

### S01: Locked Truck Survives Rebuild
**Setup:** Generate LP plan. Lock truck LP-5. Change a transit day setting.
**Expected:** `LP_regenerate()` runs. LP-5 rows preserved exactly. New trucks start from ID > max(locked). Demand consumed by LP-5 not duplicated.
**Invariants:** I1 (immutability), I7 (returns), I8 (save roundtrip).
**Why matters:** Core locked truck contract.

### S02: Demand Rationing Is Deterministic
**Setup:** 2 destinations need 100 each of SKU-X. Only 120 available.
**Expected:** Same allocation on every run. Alphabetically-first destination gets proportional floor, remainder fills greedily.
**Invariants:** I2 (determinism).
**Why matters:** Multi-user consistency.

### S03: Stock Waterfall Order
**Setup:** 3 trucks: LP-1 (Apr 10), LP-2 (Apr 10), LP-3 (Apr 12). Stock = 50 of SKU-A. LP-1 needs 30, LP-2 needs 30, LP-3 needs 20.
**Expected:** LP-1 gets 30 (pool=20). LP-2 gets 20 (pool=0, marked not ready). LP-3 gets 0 (not ready). Trucks processed by date+ID order.
**Invariants:** I11 (waterfall order).
**Why matters:** Ready/pending status accuracy.

### S04: Return to Demand Works
**Setup:** Lock LP-3 with 100 of SKU-A. Return 30.
**Expected:** `LP_returned[LP-3][SKU-A] = 30`. On regeneration, 30 units re-enter demand pool. LP-3 effective qty = 70. Pallets recalculated.
**Invariants:** I7 (returns re-enter pool).
**Why matters:** Partial shipment handling.

### S05: OOR Trucks Don't Consume Stock
**Setup:** Mark LP-4 as OOR. LP-4 has 50 of SKU-B.
**Expected:** Stock waterfall skips LP-4 deduction. LP-4 shown as "ready" (OOR submitted). Subsequent trucks see full stock of SKU-B.
**Invariants:** I5 (OOR exempt).
**Why matters:** OOR trucks have stock reserved externally.

### S06: Kit Fingerprint Stability
**Setup:** Lock LM truck with kit FNKIT-002-LM-5-01. Trigger `numberAll()` (kit SKU renames to FNKIT-002-LM-7-01 due to renumbering).
**Expected:** Fingerprint uses `KIT:{kitId}`, not SKU name. Locked snapshot found by old FP. NOM compat entry created for old SKU name.
**Invariants:** I4 (FP stability), I12 (kit demand deduction).
**Why matters:** Prevents locked truck orphaning.

### S07: Save/Load Roundtrip
**Setup:** Generate plan. Lock some trucks. Set overrides. Reload page.
**Expected:** All state restored from Supabase. Plan, locks, overrides, settings all identical. `LP_settingsChanged()` returns false.
**Invariants:** I8 (roundtrip), I10 (soft reset preserves).
**Why matters:** Data persistence reliability.

### S08: Per-Row PPU Ceiling
**Setup:** SKU with PPU=2. Two demand rows: 3 pieces and 3 pieces.
**Expected:** effQty = ceil(3/2) + ceil(3/2) = 2 + 2 = 4. NOT ceil(6/2) = 3.
**Invariants:** I6 (per-row ceiling).
**Why matters:** Quantity accuracy for pack-size items.

### S09: CORT Items Don't Load on Freight Trucks
**Setup:** Venue has mix of RGS and CT RNT items.
**Expected:** CT RNT items collected in `cortDated{}`, skip pallet engine entirely. Appear in `cortDeliveries[]`. Not on any LM freight truck.
**Invariants:** I9 (CORT separation).
**Why matters:** CORT has separate delivery logistics.

### S10: Date Rule Inheritance on Overflow
**Setup:** Date 2026-05-04 has `dateOverrides: {tc: 10, noTopUp: true}`. Demand exceeds capacity. Items overflow to 2026-05-05 (no date rule).
**Expected:** 2026-05-05 inherits `tc: 10` and `noTopUp: true` from overflow source. Next date without overflow uses default constraints.
**Invariants:** I13 (inheritance).
**Why matters:** Prevents overflow date from using larger default capacity.

### S11: Soft Reset Preserves User Work
**Setup:** Set customs overrides, transit days, holds, dispatched trucks. Run `doSoftResetLP()`.
**Expected:** All overrides, holds, dispatched trucks preserved. Plan data cleared. Settings preserved.
**Invariants:** I10 (soft reset).
**Why matters:** Users shouldn't lose hours of manual work on data refresh.

### S12: Tail Reconstruction Invariants
**Setup:** Generate plan with eligible tail truck pairs.
**Expected:** After reconstruction: (a) qty per (dest,sku) unchanged, (b) pallets per dest unchanged (±0.01), (c) no truck > MAX_PLT, (d) locked/OOR trucks identical, (e) no new dests/dates, (f) truck count = initial - merges.
**Invariants:** All 9 tail reconstruction invariant checks pass.
**Why matters:** Optimization must not break plan correctness.

---

## SECTION 12 — FUTURE ARCHITECTURE IMPLICATIONS

### Natural Domain Boundaries

Based on recovered system truth, the following boundaries emerge:

**1. Planning Engines (Pure Compute)**
- LP engine: `LP_buildPlanV3()`, `_lpTailReconstruct()`, `_lpAggregateDemand()`
- LM engine: `build()`, bin-packing, pool management
- Late engine: 3-path date chain computation
- Assembly timeline: date chain computation
- Stock waterfall: ordered deduction walk

These should be **pure functions** with explicit inputs and outputs. No global state reads. No side effects. No DOM interaction.

**2. Domain State Layer (Application Services)**
- Demand management: aggregation, holds, adjustments, returns
- Inventory management: stock, arrivals, container overrides
- Dispatch management: lock/unlock, snapshots, fingerprints
- Configuration management: venue settings, transit days, pallet config
- Kit management: creation, allocation, renaming
- Customs management: overrides, HS codes, AI classification

These should be **stateful services** that own their data structures and expose commands. Engines receive data from services, not from globals.

**3. Persistence/Integration Layer**
- Supabase read/write (single source of truth)
- File parsing (NOM, demand, arrivals, stock)
- Backup/restore
- Undo/redo stack
- Inter-module sync (LP↔LM notification)
- FA goods integration

This layer should **own serialization format** and guarantee save/load roundtrip invariants.

**4. UI/Presentation Layer**
- Module switching
- Tab rendering
- Filter state
- KPI computation (from engine output, not from raw data)
- Export formatting (Excel generation)
- Dashboard visualization

This layer should be **read-only** with respect to business state. No `LP_recomputeStockHolds()` calls from render functions.

### Key Separation Principles

1. **Engines must be pure.** No global reads. Input → Output. Testable in isolation.
2. **State must be owned.** Each variable has exactly one owner service. No cross-service mutation.
3. **NOM must not be polluted.** Kit entries, overrides, and compat entries need a separate derived NOM layer.
4. **Render must not compute.** Stock holds, waterfall, late analysis must be computed before render, not during.
5. **Save payloads must be generated, not hand-maintained.** One payload definition, multiple save paths.
6. **Locked trucks are a first-class concept.** Snapshot, demand deduction, injection, and fingerprint management should be a cohesive subsystem.
7. **File parsing should produce typed domain objects.** Not raw spreadsheet rows with string field access.

### What Must Be Preserved in Any Rebuild

1. All confirmed invariants (Section 5)
2. The two-bucket LP architecture with stock reconstruction between buckets
3. The SR deferral guard and pending buffer mechanism
4. The 4-pass truck loading (SR whole, SR partial, non-SR whole, non-SR partial)
5. The LM multi-step build (early path, main scheduling, fill-up, mop-up, sweep)
6. The locked truck snapshot system with fingerprint stability
7. The per-row PPU ceiling semantics
8. The deterministic rationing algorithm
9. The tail reconstruction with its 9 invariant checks
10. The 3-path late engine (Dallas direct, LP-fed, USA non-LP)
11. The 6-path assembly detection matrix
12. The date rule inheritance on overflow
13. The kit demand deduction from component demand
14. The stock waterfall ordering (date+ID, OOR exempt)
15. The complete save/load roundtrip for all 30+ Supabase keys
16. The 5-level reset hierarchy (system, LM hard/soft, LP hard/soft)
17. The FA goods mixed/unmixed palletization rules
18. The CORT item separation from freight trucks
19. The STP delivery exclusion from main engine

---

*End of Architecture Recovery Document*
*Source: ML3K v1 codebase, index.html (~17,700 lines) + supporting files*
*Generated: 2026-04-04*
