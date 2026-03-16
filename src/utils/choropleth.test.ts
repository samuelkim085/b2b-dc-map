import { describe, it, expect } from 'vitest'
import { buildStateVolumes, getStateColor } from './choropleth'
import type { DcRecord } from '../types'

const records = [
  { state: 'TX', pcs2025: 100000 } as DcRecord,
  { state: 'TX', pcs2025: 50000 } as DcRecord,
  { state: 'CA', pcs2025: 200000 } as DcRecord,
]

describe('buildStateVolumes', () => {
  it('sums pcs2025 by state', () => {
    const vol = buildStateVolumes(records)
    expect(vol['TX']).toBe(150000)
    expect(vol['CA']).toBe(200000)
  })

  it('returns empty object for empty records', () => {
    expect(buildStateVolumes([])).toEqual({})
  })
})

describe('getStateColor', () => {
  it('returns a hex color string for a known state', () => {
    const vol = { TX: 150000, CA: 200000 }
    const color = getStateColor('TX', vol, 200000)
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns CSS var fallback for unknown state', () => {
    expect(getStateColor('AK', {}, 100)).toBe('var(--panel)')
  })

  it('returns CSS var fallback when maxVol is 0', () => {
    expect(getStateColor('TX', { TX: 100 }, 0)).toBe('var(--panel)')
  })
})
