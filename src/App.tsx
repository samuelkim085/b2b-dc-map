import { useRef, useState } from 'react'
import { useShipmentsData } from './hooks/useShipmentsData'
import { ShipmentsMap } from './components/ShipmentsMap'
import type { FilterState } from './types'
import './index.css'

const DEFAULT_FILTERS: FilterState = {
  customers: [],
  originZip: '75238',
  minVolume: 0,
  maxDistance: 9999,
  showChoropleth: false,
}

export default function App() {
  const { records, loading, error } = useShipmentsData()
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const svgRef = useRef<SVGSVGElement | null>(null)

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="loading" style={{ color: 'var(--bad)' }}>Error: {error}</div>

  return (
    <div className="app-shell">
      <ShipmentsMap records={records} filters={filters} svgRef={svgRef} />
    </div>
  )
}
