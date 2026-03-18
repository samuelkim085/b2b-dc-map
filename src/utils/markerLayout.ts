import { geoAlbersUsa } from 'd3-geo'
import { getLogoHalfDims } from './logoConfig'

// Hierarchy: index 0 = highest priority (never moves), higher index = moves first.
const PRIORITY_ORDER = ['WM', 'TG', 'Sally', 'Ulta', 'CVS', 'WG', 'HEB']

function getPriority(key: string): number {
  const i = PRIORITY_ORDER.indexOf(key)
  return i === -1 ? PRIORITY_ORDER.length : i
}

function aabbOverlaps(
  ax: number, ay: number, ahw: number, ahh: number,
  bx: number, by: number, bhw: number, bhh: number,
): boolean {
  return Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh
}

// react-simple-maps defaults for geoAlbersUsa
const MAP_WIDTH = 800
const MAP_HEIGHT = 600
const MAP_SCALE = 1070

// Extra gap (in SVG px) added between logos after they stop overlapping.
// Increase to space them out more, decrease (min 0) to pack tighter.
const SEPARATION_PADDING = 1

/**
 * Computes per-marker (dx, dy) SVG offsets so that no two markers overlap.
 * Higher-priority markers (WM > TG > … > HEB) stay fixed; lower-priority
 * ones are pushed radially outward. Chain reactions are resolved iteratively.
 *
 * Returns a Map keyed by `${customerKey}-${zip}`.
 */
export function computeMarkerOffsets(
  records: Array<{ customerKey: string; lat: number | null; lon: number | null; zip: string }>,
  logoScale = 1.0,
): Map<string, [number, number]> {
  const projection = geoAlbersUsa()
    .scale(MAP_SCALE)
    .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])

  type Item = {
    id: string
    key: string
    px: number   // projected x (fixed)
    py: number   // projected y (fixed)
    dx: number   // accumulated offset
    dy: number
    priority: number
  }

  const items: Item[] = []
  for (const r of records) {
    if (r.lat == null || r.lon == null) continue
    const p = projection([r.lon, r.lat])
    if (!p) continue
    items.push({
      id: `${r.customerKey}-${r.zip}`,
      key: r.customerKey,
      px: p[0], py: p[1],
      dx: 0, dy: 0,
      priority: getPriority(r.customerKey),
    })
  }

  // Highest priority first → they never get pushed
  items.sort((a, b) => a.priority - b.priority)

  // Bounding box of all projected marker positions.
  // Pushed markers are clamped to this box so they can't be displaced into
  // the ocean or outside the continental US footprint.
  let bboxMinX = Infinity, bboxMaxX = -Infinity
  let bboxMinY = Infinity, bboxMaxY = -Infinity
  for (const item of items) {
    if (item.px < bboxMinX) bboxMinX = item.px
    if (item.px > bboxMaxX) bboxMaxX = item.px
    if (item.py < bboxMinY) bboxMinY = item.py
    if (item.py > bboxMaxY) bboxMaxY = item.py
  }

  const MAX_PASSES = 40

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false

    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < i; j++) {
        const hi = items[j]   // higher (or equal) priority — stays put
        const lo = items[i]   // lower priority — gets pushed

        const hx = hi.px + hi.dx, hy = hi.py + hi.dy
        const lx = lo.px + lo.dx, ly = lo.py + lo.dy

        const [hhw, hhh] = getLogoHalfDims(hi.key, logoScale)
        const [lhw, lhh] = getLogoHalfDims(lo.key, logoScale)

        if (!aabbOverlaps(hx, hy, hhw, hhh, lx, ly, lhw, lhh)) continue

        // Direction: radially outward from hi → lo
        let dirX = lx - hx
        let dirY = ly - hy
        const d = Math.sqrt(dirX * dirX + dirY * dirY)

        if (d < 0.001) {
          // Exactly same point — push downward by default
          dirX = 0; dirY = 1
        } else {
          dirX /= d; dirY /= d
        }

        // Minimum center-to-center distance for AABB separation along this direction.
        // Two AABBs separate when |Δx| ≥ sumHW  OR  |Δy| ≥ sumHH.
        // Moving along (dirX, dirY) achieves separation at:
        //   dSep = min(sumHW / |dirX|, sumHH / |dirY|)
        const sumHW = hhw + lhw
        const sumHH = hhh + lhh
        const cosA = Math.abs(dirX)
        const sinA = Math.abs(dirY)

        let dSep: number
        if (cosA < 0.001)      dSep = sumHH / sinA
        else if (sinA < 0.001) dSep = sumHW / cosA
        else                   dSep = Math.min(sumHW / cosA, sumHH / sinA)

        const push = dSep - d + SEPARATION_PADDING
        if (push <= 0) continue

        // Clamp the new position so no marker is pushed off the US landmass.
        //
        // Two-layer guard:
        // 1. Global data bbox — keeps every marker within the bounding box of
        //    all markers (all DC positions are on US land, so this box is safe).
        // 2. Coastal direction guard — markers near the western coast (x < 150)
        //    cannot move further west than their original projection; markers
        //    near the southern coast (y > 460) cannot move further south; and
        //    markers near the eastern coast (x > 640) cannot move further east.
        //    This prevents chain-reaction pushes from displacing coastal DCs
        //    into the ocean.
        const rawX = lx + push * dirX
        const rawY = ly + push * dirY
        const coastMinX = lo.px < 150 ? lo.px : bboxMinX
        const coastMaxX = lo.px > 640 ? lo.px : bboxMaxX
        const coastMaxY = lo.py > 460 ? lo.py : bboxMaxY
        const newX = Math.max(coastMinX, Math.min(coastMaxX, rawX))
        const newY = Math.max(bboxMinY, Math.min(coastMaxY, rawY))
        lo.dx = newX - lo.px
        lo.dy = newY - lo.py
        changed = true
      }
    }

    if (!changed) break
  }

  const result = new Map<string, [number, number]>()
  for (const item of items) {
    result.set(item.id, [item.dx, item.dy])
  }
  return result
}
