import { describe, it, expect } from 'vitest'
import { buildFilename } from './export'

describe('buildFilename', () => {
  it('slugifies origin label and appends date', () => {
    expect(buildFilename('Dallas, TX', '2026-03-16')).toBe('b2b-dc-map-dallas-tx-2026-03-16')
  })

  it('handles multi-word labels', () => {
    expect(buildFilename('Port Washington, NY', '2026-03-16')).toBe('b2b-dc-map-port-washington-ny-2026-03-16')
  })

  it('removes trailing hyphens from slug', () => {
    expect(buildFilename('Doral, FL', '2026-03-16')).toBe('b2b-dc-map-doral-fl-2026-03-16')
  })
})
