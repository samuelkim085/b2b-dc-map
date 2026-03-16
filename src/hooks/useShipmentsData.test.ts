import { describe, it, expect } from 'vitest'
import { parseShipmentsCSV } from './useShipmentsData'

const SAMPLE_CSV = `delivery,delivery_address,dest_city,dest_state,dest_zip,dest_ctry,pcs_2025,75238,91764
Walmart,42-R Freetown Road,Raymond,NH,3077,US,"62,576","1,806",2994
Target,400 Crossroads Blvd,Logan Township,NJ,8085,US,"23,616",1445,2685
CVS,unknown address,Montreal,QC,H4T1M1,CA,"1,000",500,1000`

describe('parseShipmentsCSV', () => {
  it('parses US rows and normalizes fields', () => {
    const centroids: Record<string, { lat: number; lon: number }> = {
      '03077': { lat: 43.19, lon: -71.20 },
      '08085': { lat: 39.79, lon: -75.44 }
    }
    const records = parseShipmentsCSV(SAMPLE_CSV, centroids)
    expect(records).toHaveLength(2)                        // Canadian row excluded
    expect(records[0].customerKey).toBe('WM')
    expect(records[0].zip).toBe('03077')
    expect(records[0].pcs2025).toBe(62576)
    expect(records[0].distances['75238']).toBe(1806)
    expect(records[0].lat).toBe(43.19)
  })

  it('returns null lat/lon when ZIP not in centroids', () => {
    const records = parseShipmentsCSV(SAMPLE_CSV, {})
    expect(records[0].lat).toBeNull()
    expect(records[0].lon).toBeNull()
  })

  it('excludes non-US rows', () => {
    const records = parseShipmentsCSV(SAMPLE_CSV, {})
    expect(records.every(r => r.country === 'US')).toBe(true)
  })
})
