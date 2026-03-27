# Split Choropleth & DC Location Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Separate the choropleth (qty by state) and DC location (logo markers) layers into two independent filter systems so both can be viewed simultaneously with different customer selections.

**Architecture:** Split `FilterState` into choropleth-scoped fields (`choroplethCustomers`, `showChoropleth`) and DC-scoped fields (`dcCustomers`, `originZip`, `minVolume`, `maxDistance`). `ShipmentsMap` computes two separate filtered record sets — one for choropleth coloring, one for marker rendering. `FilterPanel` shows two distinct sections. Choropleth defaults to ON.

**Tech Stack:** React, TypeScript, react-simple-maps, d3-scale/d3-scale-chromatic

---

### Task 1: Update FilterState type in types.ts

**Files:**
- Modify: `src/types.ts`

**Step 1: Replace `FilterState`**

```ts
export interface FilterState {
  // Choropleth layer (qty by state)
  choroplethCustomers: string[]  // empty = all customers
  showChoropleth: boolean        // default true

  // DC Location layer (logo markers)
  dcCustomers: string[]          // empty = all customers
  originZip: string
  minVolume: number
  maxDistance: number
}
```

Remove the old `customers: string[]` field and the old `showChoropleth` (replace it, keep the name).

**Step 2: Verify TypeScript errors appear in other files** (expected — will fix in next tasks)

Run: `npx tsc --noEmit 2>&1 | head -30`

---

### Task 2: Update DEFAULT_FILTERS and App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Update DEFAULT_FILTERS**

```ts
const DEFAULT_FILTERS: FilterState = {
  choroplethCustomers: [],
  showChoropleth: true,        // ON by default
  dcCustomers: [],
  originZip: '75238',
  minVolume: 0,
  maxDistance: 9999,
}
```

No other changes needed in App.tsx — it passes `filters` and `setFilters` generically.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep App`
Expected: no errors in App.tsx

---

### Task 3: Update ShipmentsMap to use two separate filtered sets

**Files:**
- Modify: `src/components/ShipmentsMap.tsx`

**Step 1: Replace single `visibleRecords` with two filtered sets**

```ts
// Records for choropleth coloring — filtered only by choroplethCustomers
const choroplethRecords = useMemo(() => {
  if (!filters.showChoropleth) return []
  if (filters.choroplethCustomers.length === 0) return records
  return records.filter(r => filters.choroplethCustomers.includes(r.customerKey))
}, [records, filters.showChoropleth, filters.choroplethCustomers])

// Records for DC location markers — filtered by dcCustomers + location filters
const dcRecords = useMemo(() => {
  return records.filter(r => {
    if (filters.dcCustomers.length > 0 && !filters.dcCustomers.includes(r.customerKey)) return false
    if (r.pcs2025 < filters.minVolume) return false
    const dist = r.distances[filters.originZip]
    if (dist != null && dist > filters.maxDistance) return false
    return true
  })
}, [records, filters.dcCustomers, filters.originZip, filters.minVolume, filters.maxDistance])
```

**Step 2: Update downstream usages**

- `stateVolumes`: use `choroplethRecords` instead of `visibleRecords`
- `stateDetailsMap`: use `choroplethRecords`
- `markerOffsets`: use `dcRecords`
- The `{visibleRecords.map(...)}` marker render loop: use `dcRecords`

Remove the old `visibleRecords` useMemo entirely.

**Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep ShipmentsMap`
Expected: no errors

---

### Task 4: Update FilterPanel — split into two sections

**Files:**
- Modify: `src/components/FilterPanel.tsx`

**Step 1: Update Props interface**

The `FilterState` shape change is already reflected via the type import — no manual prop changes needed. The `set` helper still works.

**Step 2: Restructure the panel JSX**

Replace the current single-customer dropdown + map style radio with two labeled sections:

```tsx
<aside className="filter-panel">
  <h2 className="panel-title">FILTERS</h2>

  {/* ── Choropleth Section ── */}
  <div className="filter-section-header">QTY BY STATE</div>

  <div className="filter-group">
    <span className="filter-label">MAP STYLE</span>
    <div className="radio-group" role="radiogroup" aria-label="Map style">
      {(['Plain', 'Choropleth'] as const).map(style => (
        <label key={style} className="radio-label">
          <input
            type="radio"
            name="mapStyle"
            value={style}
            checked={filters.showChoropleth === (style === 'Choropleth')}
            onChange={() => set('showChoropleth', style === 'Choropleth')}
          />
          {style}
        </label>
      ))}
    </div>
  </div>

  <CustomerDropdown
    allCustomers={allCustomers}
    selected={filters.choroplethCustomers}
    onChange={v => set('choroplethCustomers', v)}
    label="QTY CUSTOMER"
  />

  {/* ── DC Locations Section ── */}
  <div className="filter-section-header">DC LOCATIONS</div>

  <CustomerDropdown
    allCustomers={allCustomers}
    selected={filters.dcCustomers}
    onChange={v => set('dcCustomers', v)}
    label="DC CUSTOMER"
  />

  <div className="filter-group">
    <label className="filter-label" htmlFor="origin-select">ORIGIN</label>
    <select ...>...</select>
  </div>

  <div className="filter-group">MIN VOLUME slider + input</div>
  <div className="filter-group">MAX DISTANCE slider + input</div>
</aside>
```

**Step 3: Add `label` prop to CustomerDropdown**

`CustomerDropdown` currently has a hardcoded label. Add an optional `label?: string` prop defaulting to `'CUSTOMER'`.

Modify `src/components/CustomerDropdown.tsx` — find the hardcoded label text and replace with `{label ?? 'CUSTOMER'}`.

**Step 4: Add section header CSS to FilterPanel.css**

```css
.filter-section-header {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted, #888);
  padding: 10px 0 4px;
  border-top: 1px solid var(--border, #ddd);
  margin-top: 6px;
}
```

**Step 5: Verify full compile**

Run: `npx tsc --noEmit 2>&1`
Expected: no errors

---

### Task 5: Final smoke test & commit

**Step 1: Run dev server and verify**

- Choropleth shows by default (green states)
- Changing QTY CUSTOMER filter updates choropleth colors independently
- DC logo toggles (DC CUSTOMER) show/hide logos independently
- Origin / min volume / max distance only affect DC logos, not choropleth
- Both layers can show different customers simultaneously

**Step 2: Commit**

```bash
git add src/types.ts src/App.tsx src/components/ShipmentsMap.tsx src/components/FilterPanel.tsx src/components/CustomerDropdown.tsx
git commit -m "feat: split choropleth and DC location into independent filter layers"
```
