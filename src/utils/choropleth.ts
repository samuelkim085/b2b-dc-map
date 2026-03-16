import { scaleSequential, type ScaleSequential } from 'd3-scale'
import { interpolateBlues } from 'd3-scale-chromatic'
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

export function buildStateVolumes(records: DcRecord[]): Record<string, number> {
  return records.reduce<Record<string, number>>((acc, r) => {
    acc[r.state] = (acc[r.state] ?? 0) + r.pcs2025
    return acc
  }, {})
}

export function buildColorScale(maxVol: number): ScaleSequential<string> {
  return scaleSequential(interpolateBlues).domain([0, maxVol])
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
  if (!stateAbbr) return 'var(--panel)'
  const vol = volumes[stateAbbr]
  if (vol == null) return 'var(--panel)'
  return rgbToHex(scale(vol))
}
