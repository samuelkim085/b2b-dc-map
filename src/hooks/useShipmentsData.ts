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
        if (!isNaN(val)) distances[col] = val
      }
      return {
        customer: row['delivery'],
        customerKey: CUSTOMER_MAP[row['delivery']] ?? row['delivery'],
        deliveryAddress: row['delivery_address'],
        city: row['dest_city'],
        state: row['dest_state'],
        zip,
        country: row['dest_ctry'],
        pcs2025: Number(String(row[pcsKey]).replace(/,/g, '')),
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
    fetch('/data/shipments.csv')
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load CSV: ${r.status}`)
        return r.text()
      })
      .then(text => {
        setRecords(parseShipmentsCSV(text, zipCentroids))
        setLoading(false)
      })
      .catch(err => {
        setError(String(err))
        setLoading(false)
      })
  }, [])

  const origins: Origin[] = KNOWN_ORIGINS
  const maxVolume = records.length ? Math.max(...records.map(r => r.pcs2025)) : 0
  const allCustomers = [...new Set(records.map(r => r.customerKey))].sort()

  return { records, loading, error, origins, maxVolume, allCustomers }
}
