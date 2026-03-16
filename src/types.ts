export interface DcRecord {
  customer: string          // "Walmart" | "Target" | etc.
  customerKey: string       // "WM" | "TG" | "Sally" | "CVS" | "WG" | "Ulta"
  deliveryAddress: string
  city: string
  state: string             // 2-letter abbreviation
  zip: string               // zero-padded 5-digit
  country: string           // "US" | "CA"
  pcs2025: number
  distances: Record<string, number>  // originZip → miles
  lat: number | null
  lon: number | null
}

export interface Origin {
  zip: string
  label: string
}

export interface FilterState {
  customers: string[]       // customerKey values (empty = all)
  originZip: string
  minVolume: number
  maxDistance: number
  showChoropleth: boolean
}

export const CUSTOMER_MAP: Record<string, string> = {
  'Walmart': 'WM',
  'Target': 'TG',
  'Sally': 'Sally',
  'CVS': 'CVS',
  'Walgreens': 'WG',
  'Ulta': 'Ulta',
}

export const CUSTOMER_COLORS: Record<string, string> = {
  WM: '#0071CE',
  TG: '#E8192C',  // Target red (distinct from CVS #CC0000)
  Sally: '#6B2D8B',
  CVS: '#CC0000',
  WG: '#E31837',
  Ulta: '#F05A22',
}

export const CUSTOMER_DOMAINS: Record<string, string> = {
  WM: 'walmart.com',
  TG: 'target.com',
  Sally: 'sallybeauty.com',
  CVS: 'cvs.com',
  WG: 'walgreens.com',
  Ulta: 'ulta.com',
}

export const KNOWN_ORIGINS: Origin[] = [
  { zip: '75238', label: 'Dallas, TX' },
  { zip: '91764', label: 'Ontario, CA' },
  { zip: '11050', label: 'Port Washington, NY' },
  { zip: '33178', label: 'Doral, FL' },
  { zip: '60440', label: 'Bolingbrook, IL' },
  { zip: '30043', label: 'Lawrenceville, GA' },
]
