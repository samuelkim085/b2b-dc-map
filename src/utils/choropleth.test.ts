import { describe, it, expect } from 'vitest'
import { buildStateVolumes, buildColorScale, getStateColor } from './choropleth'
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

  it('handles single-record input', () => {
    const vol = buildStateVolumes([{ state: 'TX', pcs2025: 5000 } as DcRecord])
    expect(vol['TX']).toBe(5000)
  })
})

describe('getStateColor', () => {
  it('returns a valid hex color for a known state with volume', () => {
    const scale = buildColorScale(200000)
    const color = getStateColor('TX', { TX: 150000 }, scale)
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns CSS var fallback for unknown state', () => {
    const scale = buildColorScale(100)
    expect(getStateColor('AK', {}, scale)).toBe('var(--panel)')
  })

  it('returns CSS var fallback for empty stateAbbr', () => {
    const scale = buildColorScale(100)
    expect(getStateColor('', { '': 100 }, scale)).toBe('var(--panel)')
  })

  it('returns CSS var fallback when vol is null/missing', () => {
    const scale = buildColorScale(200000)
    expect(getStateColor('MT', { TX: 100 }, scale)).toBe('var(--panel)')
  })
})
