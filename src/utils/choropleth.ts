import { scaleSequential, type ScaleSequential } from 'd3-scale'
import { interpolateGreens, interpolateGreys } from 'd3-scale-chromatic'
import type { DcRecord } from '../types'

// Full-name → abbreviation lookup for react-simple-maps TopoJSON state names
export const STATE_NAME_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
  'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
}

export interface StateDetail {
  totalPcs: number
  dcCount: number
  byCustomer: Record<string, { name: string; pcs: number }>
}

export function buildAllStateDetails(records: DcRecord[]): Record<string, StateDetail> {
  const result: Record<string, StateDetail> = {}
  for (const r of records) {
    if (!result[r.state]) result[r.state] = { totalPcs: 0, dcCount: 0, byCustomer: {} }
    const sd = result[r.state]
    sd.totalPcs += r.pcs2025
    sd.dcCount++
    if (!sd.byCustomer[r.customerKey]) sd.byCustomer[r.customerKey] = { name: r.customer, pcs: 0 }
    sd.byCustomer[r.customerKey].pcs += r.pcs2025
  }
  return result
}

export function buildStateVolumes(records: DcRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, r) => {
    acc[r.state] = (acc[r.state] ?? 0) + r.pcs2025
    return acc
  }, {})
}

export function buildColorScale(
  maxVol: number,
  theme: 'greens' | 'greys' = 'greys',
  darkBg = false,
): ScaleSequential<string> {
  const base = theme === 'greens' ? interpolateGreens : interpolateGreys
  // On dark backgrounds: clamp to 0.7→0.0 range so that
  //   t=0 (no data) → ~dark grey (~#4a4a4a), visible against black
  //   t=1 (max vol) → white/near-white, most prominent
  // On light backgrounds: full 0→1 range (white → dark grey, standard)
  const interpolator = darkBg
    ? (t: number) => base(0.7 * (1 - t))
    : base
  return scaleSequential(interpolator).domain([0, Math.max(maxVol * 1.2, 1)])
}

/** Convert "rgb(r, g, b)" string to "#rrggbb" hex string */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g)
  if (!m || m.length < 3) return rgb
  return (
    '#' +
    m.slice(0, 3)
      .map(n => parseInt(n, 10).toString(16).padStart(2, '0'))
      .join('')
  )
}

export function getStateColor(
  stateAbbr: string,
  volumes: Record<string, number>,
  scale: ScaleSequential<string>
): string {
  if (!stateAbbr) return rgbToHex(scale(0))
  const vol = volumes[stateAbbr] ?? 0
  return rgbToHex(scale(vol))
}
