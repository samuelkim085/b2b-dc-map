# GeoContains Land Constraint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Replace the approximate `projection.invert() != null` land check in `computeMarkerOffsets` with a proper `geoContains()` check against the actual US state polygons so logos cannot be pushed into the ocean.

**Architecture:** ShipmentsMap fetches the same TopoJSON it already uses for rendering, merges all state geometries into one MultiPolygon using `topojson-client`, then passes it to `computeMarkerOffsets` as an optional 4th argument. Inside the solver, `geoContains(usLandFeature, [lon, lat])` replaces the current `projection.invert() != null` check — if a new position is outside the US landmass, motion along that axis is cancelled and velocity zeroed. Both `topojson-client` and `d3-geo` are already in `node_modules` as transitive deps of `react-simple-maps`.

**Tech Stack:** TypeScript, d3-geo (`geoContains`, `geoAlbersUsa`), topojson-client (`merge`), React (`useState`, `useEffect`).

---

### Task 1: Write failing tests for geoContains land constraint

**Files:**
- Modify: `src/utils/markerLayout.test.ts`

**Step 1: Add two new tests at the bottom of the describe block**

```ts
// Add these after the existing 7 tests

it('accepts optional 4th usLandFeature argument without error', () => {
  const feature = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[-110, 20], [-70, 20], [-70, 50], [-110, 50], [-110, 20]]],
    },
    properties: {},
  }
  // Broad box covering all test coords — result should be same as without feature
  const result = computeMarkerOffsets([A, B], 1.0, 0, feature)
  expect(result.size).toBe(2)
})

it('with restrictive usLandFeature, logos cannot escape the boundary', () => {
  // Tiny 1-degree box around Dallas — logos have almost no room to move
  const tinyBox = {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [-97.2, 32.4], [-96.2, 32.4], [-96.2, 33.4], [-97.2, 33.4], [-97.2, 32.4],
      ]],
    },
    properties: {},
  }
  // Large zipDotSize forces heavy repulsion — without land constraint logos would escape
  const result = computeMarkerOffsets([A, B, C], 1.0, 15, tinyBox)
  // With proper land constraint, all offsets must be small
  // (a 1° box ≈ ~80px wide in AlbersUSA at scale 1070 — logos can't go far)
  for (const [, [dx, dy]] of result) {
    expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThan(80)
  }
})
```

**Step 2: Update the function call signature in the test file**

The current `computeMarkerOffsets` only has 3 params. Adding a 4th will cause a TypeScript error (or just be silently ignored). Run to confirm:

```bash
npx vitest src/utils/markerLayout.test.ts --run
```

Expected: the two new tests FAIL (4th arg is silently ignored, restrictive test may pass by luck or fail). Note the failure mode — it informs Task 2.

**Step 3: Commit**

```bash
git add src/utils/markerLayout.test.ts
git commit -m "test(markerLayout): add failing tests for geoContains land constraint"
```

---

### Task 2: Add `usLandFeature` param and `geoContains` check to solver

**Files:**
- Modify: `src/utils/markerLayout.ts`

**Step 1: Add `geoContains` to the import**

```ts
import { geoAlbersUsa, geoContains } from 'd3-geo'
```

**Step 2: Add 4th optional parameter to function signature**

```ts
export function computeMarkerOffsets(
  records: Array<{ customerKey: string; lat: number | null; lon: number | null; zip: string }>,
  logoScale = 1.0,
  zipDotSize = 0,
  usLandFeature?: object | null,
): Map<string, [number, number]>
```

**Step 3: Add a helper function (after the constants, before `computeMarkerOffsets`)**

```ts
function isOnLand(
  x: number,
  y: number,
  projection: ReturnType<typeof geoAlbersUsa>,
  usLandFeature?: object | null,
): boolean {
  const coord = projection.invert?.([x, y])
  if (!coord) return false
  if (usLandFeature) return geoContains(usLandFeature as Parameters<typeof geoContains>[0], coord)
  return true
}
```

**Step 4: Replace the land constraint block in the integrate step**

Find the current land constraint block (inside the iteration loop, step 4):

```ts
// OLD — replace this entire block:
const bothOk = projection.invert?.([newX, newY]) != null
if (bothOk) {
  p.x = newX
  p.y = newY
} else {
  const xOk = projection.invert?.([newX, p.y]) != null
  const yOk = projection.invert?.([p.x, newY]) != null
  if (xOk) p.x = newX; else p.vx = 0
  if (yOk) p.y = newY; else p.vy = 0
}
```

Replace with:

```ts
// NEW — uses isOnLand helper
const bothOk = isOnLand(newX, newY, projection, usLandFeature)
if (bothOk) {
  p.x = newX
  p.y = newY
} else {
  const xOk = isOnLand(newX, p.y, projection, usLandFeature)
  const yOk = isOnLand(p.x, newY, projection, usLandFeature)
  if (xOk) p.x = newX; else p.vx = 0
  if (yOk) p.y = newY; else p.vy = 0
}
```

**Step 5: Run tests**

```bash
npx vitest src/utils/markerLayout.test.ts --run
```

Expected: **9/9 pass** (including the two new land constraint tests).

**Step 6: Run full suite**

```bash
npm run test
```

Expected: All pass (2 pre-existing choropleth failures are unrelated).

**Step 7: Commit**

```bash
git add src/utils/markerLayout.ts
git commit -m "feat(markerLayout): replace projection.invert check with geoContains land constraint"
```

---

### Task 3: Fetch TopoJSON in ShipmentsMap and pass to solver

**Files:**
- Modify: `src/components/ShipmentsMap.tsx`

**Step 1: Add imports at the top of the file**

```ts
import { useEffect, useMemo, useState } from 'react'
import * as topojson from 'topojson-client'
```

(Note: `useMemo` and `useState` are already imported — just add `useEffect` and the topojson import.)

**Step 2: Add state for the merged US landmass feature**

Inside `ShipmentsMap`, after the existing `useState` calls:

```ts
const [usLandFeature, setUsLandFeature] = useState<object | null>(null)

useEffect(() => {
  fetch(GEO_URL)
    .then(r => r.json())
    .then((topo) => {
      // Merge all state geometries into one MultiPolygon
      const merged = topojson.merge(topo, topo.objects.states.geometries)
      setUsLandFeature(merged)
    })
    .catch(() => {
      // If fetch fails, land constraint gracefully degrades to projection.invert() check
      console.warn('[ShipmentsMap] Failed to fetch TopoJSON for land constraint')
    })
}, [])  // fetch once on mount
```

**Step 3: Pass `usLandFeature` to `computeMarkerOffsets`**

Find the existing markerOffsets useMemo:

```ts
const markerOffsets = useMemo(
  () => computeMarkerOffsets(
    dcRecords,
    settings.dcLogoScale,
    settings.showZipDots ? settings.zipDotSize : 0,
  ),
  [dcRecords, settings.dcLogoScale, settings.showZipDots, settings.zipDotSize]
)
```

Replace with:

```ts
const markerOffsets = useMemo(
  () => computeMarkerOffsets(
    dcRecords,
    settings.dcLogoScale,
    settings.showZipDots ? settings.zipDotSize : 0,
    usLandFeature,
  ),
  [dcRecords, settings.dcLogoScale, settings.showZipDots, settings.zipDotSize, usLandFeature]
)
```

**Step 4: Build check**

```bash
npm run build
```

Expected: No TypeScript errors. (topojson-client types may need `@types/topojson-client` — if there's an error, install it: `npm i -D @types/topojson-client`)

**Step 5: Run full test suite**

```bash
npm run test
```

Expected: All pass.

**Step 6: Commit**

```bash
git add src/components/ShipmentsMap.tsx
git commit -m "feat(map): fetch TopoJSON and pass US landmass to solver for geoContains constraint"
```

---

### Task 4: Manual smoke test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: In browser (localhost:5173 or :3000)**

1. Enable Settings → Map Layers → "Show zip dots"
2. Observe logos on the map — none should be offshore
3. Try coastal states: California, Florida, New England coast
4. Set Zip dot size to 8 or 10 — logos should still stay on land even with heavy repulsion
5. Verify logos render within state boundaries

**Step 3: Push**

```bash
git push
```
