import { geoAlbersUsa, geoContains } from 'd3-geo'
import { getLogoHalfDims } from './logoConfig'

const PRIORITY_ORDER = ['WM', 'TG', 'Sally', 'Ulta', 'CVS', 'WG', 'HEB']

function getPriority(key: string): number {
  const i = PRIORITY_ORDER.indexOf(key)
  return i === -1 ? PRIORITY_ORDER.length : i
}

const MAP_WIDTH  = 800
const MAP_SCALE  = 1070

const DAMPING            = 0.85
const HOME_K             = 0.05
const LOGO_REPULSION     = 2.5
const DOT_REPULSION      = 4.0
const SEPARATION_PADDING = 2
const MAX_ITER           = 200
const CONVERGENCE_EPS    = 0.05

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

/**
 * Computes per-marker (dx, dy) SVG offsets using a force-directed physics loop.
 *
 * Forces per iteration:
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
  usLandFeature?: object | null,
): Map<string, [number, number]> {
  const projection = geoAlbersUsa()
    .scale(MAP_SCALE)
    .translate([MAP_WIDTH / 2, 300])

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

  particles.sort((a, b) => a.priority - b.priority)

  // Zip dot positions = deduplicated projected home coordinates of all records.
  // Deduplication prevents duplicate DCs at the same ZIP from multiplying repulsion force.
  const dotPositions = particles
    .map(p => ({ x: p.px, y: p.py }))
    .filter((d, idx, arr) => arr.findIndex(o => o.x === d.x && o.y === d.y) === idx)

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
