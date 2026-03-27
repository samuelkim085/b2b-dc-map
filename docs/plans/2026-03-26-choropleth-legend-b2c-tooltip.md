# Choropleth Legend + B2C Tooltip Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add a 5-step color legend (bottom-right overlay) to the choropleth map, and fix the state hover tooltip to show B2C data in B2C mode instead of B2B data.

**Architecture:** All changes are confined to `ShipmentsMap.tsx` and `ShipmentsMap.css`. The legend is an inline functional component that samples the existing `colorScale` at 5 evenly-spaced domain points. The tooltip fix branches on `dataMode` to show either `b2cVolumes[abbr]` (B2C) or the existing `stateDetailsMap` breakdown (B2B).

**Tech Stack:** React, TypeScript, D3 ScaleSequential (already imported), CSS variables from themes.css

---

### Task 1: Fix B2C hover trigger

**Files:**
- Modify: `src/components/ShipmentsMap.tsx:456-462`

Currently the `onMouseEnter` guard on Geography reads:
```tsx
if (abbr && stateDetailsMap[abbr])
```
This means states with no B2B data never trigger hover in B2C mode.

**Step 1: Update the condition**

Change the guard so it triggers in either mode:

```tsx
onMouseEnter={() => {
  const hasData = dataMode === 'b2c'
    ? b2cVolumes[abbr] != null
    : !!stateDetailsMap[abbr];
  if (abbr && hasData)
    setHoveredState({
      name: geo.properties.name as string,
      abbr,
    });
}}
```

**Step 2: Run existing tests to verify no regression**

```bash
npm run test
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add src/components/ShipmentsMap.tsx
git commit -m "fix: trigger state hover for B2C mode using b2cVolumes"
```

---

### Task 2: Fix B2C tooltip content

**Files:**
- Modify: `src/components/ShipmentsMap.tsx:580-606`

Currently the state hover tooltip always renders `stateDetailsMap[hoveredState.abbr]` (B2B data). In B2C mode it should show `b2cVolumes` instead.

**Step 1: Replace the tooltip block**

The current block (lines 580-606) starts with:
```tsx
) : (
  hoveredState &&
  stateDetailsMap[hoveredState.abbr] &&
  (() => {
    const sd = stateDetailsMap[hoveredState.abbr];
    ...
  })()
```

Replace with a dataMode branch:

```tsx
) : (
  hoveredState && (() => {
    if (dataMode === 'b2c') {
      const pcs = b2cVolumes[hoveredState.abbr];
      if (pcs == null) return null;
      return (
        <div className="map-tooltip">
          <strong>
            {hoveredState.name} ({hoveredState.abbr})
          </strong>
          <div className="tooltip-divider" />
          <span>{pcs.toLocaleString()} pcs</span>
        </div>
      );
    }
    // B2B mode: existing customer breakdown
    const sd = stateDetailsMap[hoveredState.abbr];
    if (!sd) return null;
    const customers = Object.entries(sd.byCustomer).sort(
      (a, b) => b[1].pcs - a[1].pcs,
    );
    return (
      <div className="map-tooltip">
        <strong>
          {hoveredState.name} ({hoveredState.abbr})
        </strong>
        <span>
          {sd.totalPcs.toLocaleString()} pcs · {sd.dcCount} DC
          {sd.dcCount !== 1 ? "s" : ""}
        </span>
        <div className="tooltip-divider" />
        {customers.map(([key, { name, pcs }]) => (
          <div key={key} className="tooltip-row">
            <span>{name}</span>
            <span>{pcs.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  })()
)}
```

**Step 2: Run tests**

```bash
npm run test
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add src/components/ShipmentsMap.tsx
git commit -m "fix: B2C mode state tooltip shows b2cVolumes, B2B shows customer breakdown"
```

---

### Task 3: Add ChoroplethLegend component

**Files:**
- Modify: `src/components/ShipmentsMap.tsx` — add inline component before `ShipmentsMap`, render it inside `.map-wrap`
- Modify: `src/components/ShipmentsMap.css` — add `.choropleth-legend` styles

**Step 1: Add the inline component**

Add this function before the `ShipmentsMap` export (after the `OriginRadiusRing` function):

```tsx
function ChoroplethLegend({
  colorScale,
}: {
  colorScale: import('d3-scale').ScaleSequential<string>;
}) {
  const domainMax = colorScale.domain()[1];
  const steps = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const value = Math.round(domainMax * t);
    return { value, color: colorScale(value) };
  });

  function fmtLabel(v: number, isLast: boolean): string {
    const s = v >= 1000 ? `${Math.round(v / 1000)}K` : String(v);
    return isLast ? `${s}+` : s;
  }

  return (
    <div className="choropleth-legend">
      <div className="choropleth-legend-title">pcs volume</div>
      {steps.map(({ value, color }, i) => (
        <div key={i} className="choropleth-legend-row">
          <span
            className="choropleth-legend-swatch"
            style={{ background: color }}
          />
          <span className="choropleth-legend-label">
            {fmtLabel(value, i === steps.length - 1)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Render the legend inside the map**

In the `ShipmentsMap` return, inside `.map-wrap` and after `</ComposableMap>` (but before the tooltip divs), add:

```tsx
{filters.showChoropleth && colorScale && (
  <ChoroplethLegend colorScale={colorScale} />
)}
```

**Step 3: Add CSS to ShipmentsMap.css**

```css
.choropleth-legend {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: var(--panel);
    border: 1px solid var(--line);
    padding: 8px 10px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 4px;
    pointer-events: none;
    z-index: 5;
}

.choropleth-legend-title {
    font-size: 9px;
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
}

.choropleth-legend-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.choropleth-legend-swatch {
    display: inline-block;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    border: 1px solid rgba(128,128,128,0.3);
}

.choropleth-legend-label {
    min-width: 32px;
}
```

**Step 4: Run tests**

```bash
npm run test
```
Expected: all tests pass (no unit tests for this pure UI component).

**Step 5: Commit**

```bash
git add src/components/ShipmentsMap.tsx src/components/ShipmentsMap.css
git commit -m "feat: add choropleth legend (5-step color scale, bottom-right overlay)"
```

---

### Task 4: Manual smoke test

**Step 1: Start dev server**

```bash
npm run dev
```
Open `http://localhost:5173` (or port 3000 if 5173 fails).

**Step 2: Verify legend**
- Legend appears bottom-right of the map when choropleth is on
- 5 color swatches match the state fill colors
- Labels show "0", "Xk", "Xk", "Xk", "Xk+"
- Legend disappears when choropleth is toggled off

**Step 3: Verify B2B tooltip (unchanged)**
- Switch to B2B mode
- Hover a state → shows total pcs + customer breakdown as before

**Step 4: Verify B2C tooltip**
- Switch to B2C mode
- Hover a state → shows only state name + pcs (no customer breakdown)
- States with no B2C data show no tooltip
