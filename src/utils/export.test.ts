import { buildFilename } from './export'

test('buildFilename includes origin label and date', () => {
  const name = buildFilename('Dallas, TX', '2026-03-16')
  expect(name).toBe('b2b-dc-map-dallas-tx-2026-03-16')
})

test('buildFilename handles special characters', () => {
  const name = buildFilename('Port Washington, NY', '2026-03-16')
  expect(name).toBe('b2b-dc-map-port-washington-ny-2026-03-16')
})
