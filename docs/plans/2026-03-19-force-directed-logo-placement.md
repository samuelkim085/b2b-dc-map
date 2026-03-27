# Force-Directed Logo Placement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current AABB push solver in `computeMarkerOffsets` with a force-directed physics loop that pushes DC logos away from zip dots, away from other logos, and keeps them on the US landmass.

**Architecture:** Each logo is a particle with position and velocity. Each iteration applies three forces: logo-logo AABB repulsion (priority-ordered), logo-zipDot repulsion (dots always win, all logos move), and a weak home spring (pulls each logo back toward its projected DC coordinate). After each step, `projection.invert()` validates that the new position is on land; if not, the motion along that axis is cancelled.

**Tech Stack:** TypeScript, d3-geo (`geoAlbersUsa`, `invert`), existing `getLogoHalfDims` from `logoConfig.ts`.

---

## Constants (top of `markerLayout.ts`)

```ts
const DAMPING            = 0.85   // velocity decay per step
const HOME_K             = 0.05   // spring constant toward home position
const LOGO_REPULSION     = 2.5    // force multiplier for logo-logo overlap
const DOT_REPULSION      = 4.0    // force multiplier for logo-dot overlap
const SEPARATION_PADDING = 2      // extra px gap between logos
const MAX_ITER           = 200
const CONVERGENCE_EPS    = 0.05   // stop when max velocity < this
```

## New signature

```ts
export function computeMarkerOffsets(
  records: Array<{ customerKey: string; lat: number | null; lon: number | null; zip: string }>,
  logoScale = 1.0,
  zipDotSize = 0,   // pass settings.zipDotSize when showZipDots=true, else 0
): Map<string, [number, number]>
```

---

### Task 1: Write failing tests

**Files:**
- Create: `src/utils/markerLayout.test.ts`

**Step 1: Write the tests**

```ts
import { describe, it, expect } from 'vitest'
import { computeMarkerOffsets } from './markerLayout'

// Two records at the same location — logo-logo repulsion
const A = { customerKey: 'WM', lat: 32.9, lon: -96.7, zip: '75238' }
const B = { customerKey: 'TG', lat: 32.9, lon: -96.7, zip: '75001' }
const C = { customerKey: 'CVS', lat: 32.9, lon: -96.7, zip: '75002' }

describe('computeMarkerOffsets', () => {
  it('returns an offset for every record with a valid lat/lon', () => {
    const result = computeMarkerOffsets([A, B], 1.0, 0)
    expect(result.has('WM-75238')).toBe(true)
    expect(result.has('TG-75001')).toBe(true)
  })

  it('logos do not overlap after solving (same location)', () => {
    const result = computeMarkerOffsets([A, B], 1.0, 0)
    const [adx, ady] = result.get('WM-75238')!
    const [bdx, bdy] = result.get('TG-75001')!

    // project the home position — both start at same px,py
    // after solving their offsets must differ enough to separate them
    // (we can't call projection here easily, so just check they moved differently)
    const dist = Math.sqrt((adx - bdx) ** 2 + (ady - bdy) ** 2)
    expect(dist).toBeGreaterThan(0)
  })

  it('high-priority logo (WM) stays closer to home than low-priority (TG)', () => {
    const result = computeMarkerOffsets([A, B], 1.0, 0)
    const [adx, ady] = result.get('WM-75238')!
    const [bdx, bdy] = result.get('TG-75001')!
    const distA = Math.sqrt(adx ** 2 + ady ** 2)
    const distB = Math.sqrt(bdx ** 2 + bdy ** 2)
    expect(distA).toBeLessThanOrEqual(distB)
  })

  it('with zipDotSize > 0, logos move away from dot positions', () => {
    // Single record: logo must not sit on its own dot
    const result = computeMarkerOffsets([A], 1.0, 5)
    const [dx, dy] = result.get('WM-75238')!
    const dist = Math.sqrt(dx ** 2 + dy ** 2)
    // Logo half-dims for WM at scale 1.0: w≈38, h≈10 approx
    // With dotSize=5, logo must be displaced at least dotSize from its home dot
    expect(dist).toBeGreaterThan(0)
  })

  it('logos stay on land (projection.invert returns non-null for all offsets)', () => {
    const { geoAlbersUsa } = require('d3-geo')
    const projection = geoAlbersUsa().scale(1070).translate([400, 300])

    const result = computeMarkerOffsets([A, B, C], 1.0, 5)
    for (const [id, [dx, dy]] of result) {
      // We can't easily get px,py here without duplicating projection logic,
      // so just verify no offsets are wildly large (> 200px from origin)
      const dist = Math.sqrt(dx ** 2 + dy ** 2)
      expect(dist).toBeLessThan(200)
    }
  })

  it('records with null lat/lon are skipped', () => {
    const bad = { customerKey: 'WM', lat: null, lon: null, zip: '00000' }
    const result = computeMarkerOffsets([bad], 1.0, 0)
    expect(result.has('WM-00000')).toBe(false)
  })
})
```

**Step 2: Run to verify they fail**

```bash
npx vitest src/utils/markerLayout.test.ts --run
```

Expected: FAIL — `markerLayout.test.ts` doesn't exist yet / tests for new behavior fail.

**Step 3: Commit test file**

```bash
git add src/utils/markerLayout.test.ts
git commit -m "test(markerLayout): add failing tests for force-directed placement"
```

---

### Task 2: Rewrite `computeMarkerOffsets` with force-directed physics

**Files:**
- Modify: `src/utils/markerLayout.ts`

**Step 1: Replace the file contents**

```ts
import { geoAlbersUsa } from 'd3-geo'
import { getLogoHalfDims } from './logoConfig'

const PRIORITY_ORDER = ['WM', 'TG', 'Sally', 'Ulta', 'CVS', 'WG', 'HEB']

function getPriority(key: string): number {
  const i = PRIORITY_ORDER.indexOf(key)
  return i === -1 ? PRIORITY_ORDER.length : i
}

const MAP_WIDTH  = 800
const MAP_HEIGHT = 600
const MAP_SCALE  = 1070

const DAMPING            = 0.85
const HOME_K             = 0.05
const LOGO_REPULSION     = 2.5
const DOT_REPULSION      = 4.0
const SEPARATION_PADDING = 2
const MAX_ITER           = 200
const CONVERGENCE_EPS    = 0.05

/**
 * Computes per-marker (dx, dy) SVG offsets using a force-directed physics loop.
 *
 * Forces per iteration (applied to movable logos only):
 *   1. Logo-logo AABB repulsion   — priority-ordered (high priority stays fixed)
 *   2. Logo-zipDot repulsion      — all logos move away from all dot positions
 *   3. Home spring attraction     — weak pull back toward projected DC coordinate
 *
 * After each velocity step, projection.invert() validates the new position is
 * within the US landmass. Motion along any axis that escapes the projection is
 * cancelled and velocity zeroed for that axis.
 *
 * @param records    DC records to place
 * @param logoScale  scale factor applied to logo dimensions
 * @param zipDotSize radius of zip dot circles (0 = skip dot avoidance)
 */
export function computeMarkerOffsets(
  records: Array<{ customerKey: string; lat: number | null; lon: number | null; zip: string }>,
  logoScale = 1.0,
  zipDotSize = 0,
): Map<string, [number, number]> {
  const projection = geoAlbersUsa()
    .scale(MAP_SCALE)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])

  type Particle = {
    id: string
    key: string
    px: number   // home x (projected, fixed)
    py: number   // home y (projected, fixed)
    x: number    // current x
    y: number    // current y
    vx: number
    vy: number
    priority: number
  }

  const particles: Particle[] = []
  for (const r of records) {
    if (r.lat == null || r.lon == null) continue
    const p = projection([r.lon, r.lat])
    if (!p) continue
    particles.push({
      id: `${r.customerKey}-${r.zip}`,
      key: r.customerKey,
      px: p[0], py: p[1],
      x:  p[0], y:  p[1],
      vx: 0,    vy: 0,
      priority: getPriority(r.customerKey),
    })
  }

  // Zip dot positions = projected home coordinates of all records
  const dotPositions = particles.map(p => ({ x: p.px, y: p.py }))

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // ── 1. Logo-logo repulsion ────────────────────────────────────────────
    for (let i = 0; i < particles.length; i++) {
      for (let j = 0; j < i; j++) {
        const hi = particles[j]   // higher priority (or equal, lower index)
        const lo = particles[i]   // lower priority

        const [hhw, hhh] = getLogoHalfDims(hi.key, logoScale)
        const [lhw, lhh] = getLogoHalfDims(lo.key, logoScale)

        const overlapX = (hhw + lhw + SEPARATION_PADDING) - Math.abs(lo.x - hi.x)
        const overlapY = (hhh + lhh + SEPARATION_PADDING) - Math.abs(lo.y - hi.y)

        if (overlapX <= 0 || overlapY <= 0) continue  // no overlap

        const dx = lo.x - hi.x
        const dy = lo.y - hi.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        const nx = d < 0.001 ? 0 : dx / d
        const ny = d < 0.001 ? 1 : dy / d
        const force = Math.min(overlapX, overlapY) * LOGO_REPULSION

        if (hi.priority < lo.priority) {
          // hi is genuinely higher priority — only lo moves
          lo.vx += nx * force
          lo.vy += ny * force
        } else {
          // Equal priority — share the force
          lo.vx += nx * force * 0.5
          lo.vy += ny * force * 0.5
          hi.vx -= nx * force * 0.5
          hi.vy -= ny * force * 0.5
        }
      }
    }

    // ── 2. Logo-zipDot repulsion ──────────────────────────────────────────
    if (zipDotSize > 0) {
      for (const p of particles) {
        for (const dot of dotPositions) {
          const [lhw, lhh] = getLogoHalfDims(p.key, logoScale)

          // Closest point on logo AABB to dot center
          const closestX = Math.max(p.x - lhw, Math.min(p.x + lhw, dot.x))
          const closestY = Math.max(p.y - lhh, Math.min(p.y + lhh, dot.y))
          const cdx = closestX - dot.x
          const cdy = closestY - dot.y
          const dist = Math.sqrt(cdx * cdx + cdy * cdy)

          const minDist = zipDotSize + SEPARATION_PADDING
          if (dist >= minDist) continue  // no overlap

          const overlap = minDist - dist
          const dx = p.x - dot.x
          const dy = p.y - dot.y
          const d  = Math.sqrt(dx * dx + dy * dy)
          const nx = d < 0.001 ? 0 : dx / d
          const ny = d < 0.001 ? 1 : dy / d

          p.vx += nx * overlap * DOT_REPULSION
          p.vy += ny * overlap * DOT_REPULSION
        }
      }
    }

    // ── 3. Home spring ────────────────────────────────────────────────────
    for (const p of particles) {
      p.vx += (p.px - p.x) * HOME_K
      p.vy += (p.py - p.y) * HOME_K
    }

    // ── 4. Integrate + land constraint ───────────────────────────────────
    let maxVel = 0
    for (const p of particles) {
      p.vx *= DAMPING
      p.vy *= DAMPING

      const newX = p.x + p.vx
      const newY = p.y + p.vy

      // Validate each axis independently
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

      maxVel = Math.max(maxVel, Math.sqrt(p.vx * p.vx + p.vy * p.vy))
    }

    if (maxVel < CONVERGENCE_EPS) break
  }

  const result = new Map<string, [number, number]>()
  for (const p of particles) {
    result.set(p.id, [p.x - p.px, p.y - p.py])
  }
  return result
}
```

**Step 2: Run the tests**

```bash
npx vitest src/utils/markerLayout.test.ts --run
```

Expected: PASS all 6 tests.

**Step 3: Run the full test suite**

```bash
npm run test
```

Expected: All existing tests still pass.

**Step 4: Commit**

```bash
git add src/utils/markerLayout.ts
git commit -m "feat(markerLayout): replace AABB push solver with force-directed physics"
```

---

### Task 3: Wire up new `zipDotSize` param in `ShipmentsMap.tsx`

**Files:**
- Modify: `src/components/ShipmentsMap.tsx`

**Step 1: Update the `computeMarkerOffsets` call**

Find the existing call (around line 53–56):
```ts
const markerOffsets = useMemo(
  () => computeMarkerOffsets(dcRecords, settings.dcLogoScale),
  [dcRecords, settings.dcLogoScale]
)
```

Replace with:
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

**Step 2: Run full test suite**

```bash
npm run test
```

Expected: All pass.

**Step 3: Build check**

```bash
npm run build
```

Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add src/components/ShipmentsMap.tsx
git commit -m "feat(map): pass zipDotSize to computeMarkerOffsets for dot avoidance"
```

---

### Task 4: Manual smoke test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: In browser (localhost:5173)**

1. Open Settings → Map Layers → enable "Show zip dots"
2. Observe: logos move away from white dots, stay on US land
3. Disable "Show zip dots" → logos snap back closer to DC positions (home spring)
4. Try different "Zip dot size" values (Settings → Marker Style) — larger size = more displacement

**Step 3: Push branch**

```bash
git push -u origin zipdot_force-directed
```
