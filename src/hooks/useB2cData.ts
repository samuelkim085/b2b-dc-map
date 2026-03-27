import { useState, useEffect } from 'react'
import Papa from 'papaparse'

export function useB2cData(): {
  volumes: Record<string, number>
  loading: boolean
  error: string | null
} {
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/b2c_qty_by_state_2025.csv', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load B2C CSV: ${r.status}`)
        return r.text()
      })
      .then(text => {
        const { data } = Papa.parse<{ ship_to_state: string; total_qty: string }>(text, {
          header: true,
          skipEmptyLines: true,
        })
        const result: Record<string, number> = {}
        for (const row of data) {
          const qty = Number(String(row.total_qty).replace(/,/g, ''))
          if (row.ship_to_state && !isNaN(qty)) {
            result[row.ship_to_state] = qty
          }
        }
        setVolumes(result)
        setLoading(false)
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return
        setError(String(err))
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return { volumes, loading, error }
}
