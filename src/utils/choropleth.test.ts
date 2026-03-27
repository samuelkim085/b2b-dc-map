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

  it('returns scale(0) hex for state with no volume data', () => {
    const scale = buildColorScale(100)
    const color = getStateColor('AK', {}, scale)
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns scale(0) hex for empty stateAbbr', () => {
    const scale = buildColorScale(100)
    expect(getStateColor('', { '': 100 }, scale)).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('returns scale(0) hex for state missing from volumes', () => {
    const scale = buildColorScale(200000)
    const color = getStateColor('MT', { TX: 100 }, scale)
    expect(color).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('buildColorScale', () => {
  it('light mode: scale(0) returns near-white color', () => {
    const scale = buildColorScale(100000, 'greys', false)
    const color = scale(0)
    // greys interpolator at t=0 → white = rgb(255,255,255)
    expect(color).toMatch(/^rgb\(255/)
  })

  it('darkBg mode: scale(0) is mid-grey (NOT white)', () => {
    const scale = buildColorScale(100000, 'greys', true)
    const color = scale(0)
    // darkBg: base(0.7 * (1 - 0)) = base(0.7) ≈ mid-grey, not white
    expect(color).not.toMatch(/^rgb\(255/)
  })

  it('darkBg mode: scale(maxVol) is lighter than scale(0) (most prominent)', () => {
    const scale = buildColorScale(100000, 'greys', true)
    const colorAtZero = scale(0)
    const colorAtMax = scale(100000)
    // darkBg inverts: high volume → lighter (more prominent on dark bg)
    // Extract the first RGB channel to compare brightness
    const rAtZero = parseInt(colorAtZero.match(/\d+/)![0], 10)
    const rAtMax = parseInt(colorAtMax.match(/\d+/)![0], 10)
    expect(rAtMax).toBeGreaterThan(rAtZero)
  })
})
