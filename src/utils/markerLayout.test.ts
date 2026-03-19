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
    const dist = Math.sqrt((adx - bdx) ** 2 + (ady - bdy) ** 2)
    expect(dist).toBeGreaterThan(10)
  })

  it('high-priority logo (WM) stays closer to home than low-priority (TG)', () => {
    const result = computeMarkerOffsets([A, B], 1.0, 0)
    const [adx, ady] = result.get('WM-75238')!
    const [bdx, bdy] = result.get('TG-75001')!
    const distA = Math.sqrt(adx ** 2 + ady ** 2)
    const distB = Math.sqrt(bdx ** 2 + bdy ** 2)
    expect(distA).toBeLessThanOrEqual(distB)
  })

  it('priority ordering holds regardless of input order (TG before WM)', () => {
    const result = computeMarkerOffsets([B, A], 1.0, 0)
    const [adx, ady] = result.get('WM-75238')!
    const [bdx, bdy] = result.get('TG-75001')!
    const distA = Math.sqrt(adx ** 2 + ady ** 2)
    const distB = Math.sqrt(bdx ** 2 + bdy ** 2)
    expect(distA).toBeLessThanOrEqual(distB)
  })

  it('with zipDotSize > 0, logos move away from dot positions', () => {
    const result = computeMarkerOffsets([A], 1.0, 5)
    const [dx, dy] = result.get('WM-75238')!
    const dist = Math.sqrt(dx ** 2 + dy ** 2)
    expect(dist).toBeGreaterThan(0.5)
  })

  it('logos stay on land (offsets are not wildly large)', () => {
    const result = computeMarkerOffsets([A, B, C], 1.0, 5)
    for (const [, [dx, dy]] of result) {
      const dist = Math.sqrt(dx ** 2 + dy ** 2)
      expect(dist).toBeLessThan(200)
    }
  })

  it('records with null lat/lon are skipped', () => {
    const bad = { customerKey: 'WM', lat: null, lon: null, zip: '00000' }
    const result = computeMarkerOffsets([bad], 1.0, 0)
    expect(result.has('WM-00000')).toBe(false)
  })

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
    // (a 1° box ≈ ~80px wide in AlbersUSA at scale 1070)
    for (const [, [dx, dy]] of result) {
      expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThan(80)
    }
  })
})
