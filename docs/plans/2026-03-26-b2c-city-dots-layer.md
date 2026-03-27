# B2C Top 100 Cities Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add a B2C Top 100 Cities black-dot map layer with a toggle switch in a new "B2C Layers" section of the FilterPanel.

**Architecture:** Convert `b2c_top100_city_qty.csv` to JSON via a Node script, place in `public/data/`, fetch in `ShipmentsMap`, add `showB2cCityDots` to `AppSettings`, and render black dots only when `dataMode === 'b2c'` and the toggle is on. FilterPanel gets a new `"b2cLayers"` section visible only in B2C mode.

**Tech Stack:** React, TypeScript, Node.js (csv → json conversion script)

---

### Task 1: Convert CSV to JSON

**Files:**
- Create: `public/data/b2c_top100_city_qty.json`

**Step 1: Run conversion script**

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('C:/Github/uc_analysis/output/b2c_top100_city_qty.csv', 'utf8').trim().split('\n');
const headers = lines[0].replace(/\"/g, '').split(',');
const rows = lines.slice(1).map(line => {
  const vals = line.replace(/\"/g, '').split(',');
  return {
    city: vals[0],
    state: vals[1],
    qty: Number(vals[2]),
    zip: vals[3]
  };
});
fs.writeFileSync('public/data/b2c_top100_city_qty.json', JSON.stringify(rows, null, 2));
console.log('wrote', rows.length, 'rows');
"
```

Expected output: `wrote 100 rows`

**Step 2: Verify file**

```bash
head -20 public/data/b2c_top100_city_qty.json
```

Expected: JSON array with `city`, `state`, `qty`, `zip` fields.

**Step 3: Commit**

```bash
git add public/data/b2c_top100_city_qty.json
git commit -m "data: add b2c_top100_city_qty.json converted from CSV"
```

---

### Task 2: Add `showB2cCityDots` to AppSettings

**Files:**
- Modify: `src/types.ts`

**Step 1: Add field to AppSettings interface**

In `src/types.ts`, add `showB2cCityDots: boolean;` after the `showZipDots` line in the `AppSettings` interface:

```typescript
showZipDots: boolean;
showB2cCityDots: boolean;   // ← add this line
```

**Step 2: Add default value to DEFAULT_SETTINGS**

In `src/types.ts`, add `showB2cCityDots: true,` after `showZipDots: false,` in `DEFAULT_SETTINGS`:

```typescript
showZipDots: false,
showB2cCityDots: true,   // ← add this line
```

**Step 3: Run tests to verify no breakage**

```bash
npm run test
```

Expected: all pass (types change is additive)

**Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: add showB2cCityDots to AppSettings"
```

---

### Task 3: Fetch and render city dots in ShipmentsMap

**Files:**
- Modify: `src/components/ShipmentsMap.tsx`

**Step 1: Add constant for the JSON URL**

Near the top of the file (after `B2C_ZIP_DOTS_URL`):

```typescript
const B2C_CITY_DOTS_URL = "/data/b2c_top100_city_qty.json";
```

**Step 2: Add state for city dots**

After the `b2cZipDots` state (around line 142):

```typescript
const [b2cCityDots, setB2cCityDots] = useState<Array<{ city: string; state: string; qty: number; zip: string; lat: number; lon: number }>>([]);
```

**Step 3: Fetch city dots in useEffect**

Inside the existing `useEffect(() => { ... }, [])` block (where B2C_ZIP_DOTS_URL is fetched), add a new fetch after it:

```typescript
fetch(B2C_CITY_DOTS_URL)
  .then((r) => r.json())
  .then((data: Array<{ city: string; state: string; qty: number; zip: string }>) => {
    const dots = data.flatMap((entry) => {
      const centroid = zipCentroids[entry.zip];
      if (!centroid) return [];
      return [{ ...entry, lat: centroid.lat, lon: centroid.lon }];
    });
    setB2cCityDots(dots);
  })
  .catch(() => {
    console.warn("[ShipmentsMap] Failed to fetch B2C city dots");
  });
```

**Step 4: Render city dots layer**

After the existing `dataMode === 'b2c' && b2cZipDots.map(...)` block (around line 518), add:

```tsx
{dataMode === 'b2c' && settings.showB2cCityDots && b2cCityDots.map((dot) => (
  <Marker key={`b2c-city-${dot.zip}`} coordinates={[dot.lon, dot.lat]}>
    <circle
      r={4 / zk}
      fill="#000000"
      stroke="none"
      style={{ pointerEvents: "none" }}
    />
  </Marker>
))}
```

**Step 5: Run dev server and visually verify dots appear**

```bash
npm run dev
```

Check: black dots appear on map in B2C mode

**Step 6: Commit**

```bash
git add src/components/ShipmentsMap.tsx
git commit -m "feat: fetch and render b2c top-100 city dots on map"
```

---

### Task 4: Add "B2C Layers" section to FilterPanel

**Files:**
- Modify: `src/components/FilterPanel.tsx`

**Step 1: Add `b2cLayers` to SectionKey type**

In `FilterPanel.tsx`, add `"b2cLayers"` to the `SectionKey` union type:

```typescript
type SectionKey =
  | "qtyByState"
  | "dcLocations"
  | "radiusRing"
  | "flowLayer"
  | "b2cLayers"      // ← add this
  | "appearance"
  | "mapView"
  | "markerStyle"
  | "defaults";
```

**Step 2: Add default section state**

In `DEFAULT_SECTION_STATE`, add `b2cLayers: true`:

```typescript
const DEFAULT_SECTION_STATE: SectionState = {
  qtyByState: true,
  dcLocations: true,
  radiusRing: false,
  flowLayer: true,
  b2cLayers: true,   // ← add this
  appearance: false,
  mapView: false,
  markerStyle: false,
  defaults: false,
};
```

**Step 3: Add B2C Layers section in JSX**

After the `{dataMode === 'b2b' && <PanelSection title="DC Locations" ...>` block (and its closing tag), add:

```tsx
{dataMode === 'b2c' && (
  <PanelSection
    title="B2C Layers"
    sectionKey="b2cLayers"
    isOpen={sectionState.b2cLayers}
    onToggle={toggleSection}
  >
    <div className="filter-group">
      <label className="filter-row">
        <span className="filter-label">TOP 100 CITIES</span>
        <input
          type="checkbox"
          className="filter-toggle"
          checked={settings.showB2cCityDots}
          onChange={(e) => setApp("showB2cCityDots", e.target.checked)}
        />
      </label>
    </div>
  </PanelSection>
)}
```

**Step 4: Run dev server and verify toggle**

```bash
npm run dev
```

Check:
- In B2C mode: "B2C Layers" section appears in FilterPanel
- Toggle off → city dots disappear from map
- Toggle on → city dots reappear
- In B2B mode: section is hidden

**Step 5: Run tests**

```bash
npm run test
```

Expected: all pass

**Step 6: Commit**

```bash
git add src/components/FilterPanel.tsx
git commit -m "feat: add B2C Layers panel section with Top 100 Cities toggle"
```
