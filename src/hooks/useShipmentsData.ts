import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import type { DcRecord, Origin } from '../types'
import { CUSTOMER_MAP, KNOWN_ORIGINS } from '../types'
import zipCentroidsRaw from '../data/zip-centroids.json'

type Centroids = Record<string, { lat: number; lon: number }>
const zipCentroids = zipCentroidsRaw as Centroids

export function parseShipmentsCSV(csvText: string, centroids: Centroids): DcRecord[] {
  const { data } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  })

  if (!data.length) return []

  const allKeys = Object.keys(data[0])
  const originCols = allKeys.filter(k => /^\d{5}$/.test(k))
  const pcsKey = allKeys.find(k => k.startsWith('pcs_')) ?? 'pcs_2025'

  return data
    .filter(row => row['dest_ctry'] === 'US')
    .map(row => {
      const zip = String(row['dest_zip']).padStart(5, '0')
      const centroid = centroids[zip] ?? null
      const distances: Record<string, number> = {}
      for (const col of originCols) {
        const val = Number(String(row[col]).replace(/,/g, ''))
        if (!isNaN(val) && val > 0) distances[col] = val
      }
      return {
        customer: row['delivery'],
        customerKey: CUSTOMER_MAP[row['delivery']] ?? row['delivery'],
        deliveryAddress: row['delivery_address'],
        city: row['dest_city'],
        state: row['dest_state'],
        zip,
        country: row['dest_ctry'],
        pcs2025: (() => {
          const v = Number(String(row[pcsKey] ?? '').replace(/,/g, ''))
          return isNaN(v) ? 0 : v
        })(),
        distances,
        lat: centroid?.lat ?? null,
        lon: centroid?.lon ?? null,
      }
    })
}

export function useShipmentsData() {
  const [records, setRecords] = useState<DcRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/shipments.csv', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load CSV: ${r.status}`)
        return r.text()
      })
      .then(text => {
        setRecords(parseShipmentsCSV(text, zipCentroids))
        setLoading(false)
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return
        setError(String(err))
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const origins: Origin[] = KNOWN_ORIGINS
  const allCustomers = [...new Set(records.map(r => r.customerKey))].sort()

  return { records, loading, error, origins, allCustomers }
}
