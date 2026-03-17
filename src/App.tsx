import { useRef, useState, useMemo } from 'react'
import { useShipmentsData } from './hooks/useShipmentsData'
import { ShipmentsMap } from './components/ShipmentsMap'
import { FilterPanel } from './components/FilterPanel'
import { AppBar } from './components/AppBar'
import type { FilterState } from './types'
import { KNOWN_ORIGINS } from './types'
import './index.css'

const DEFAULT_FILTERS: FilterState = {
  choroplethCustomers: [],
  showChoropleth: true,
  dcCustomers: [],
  originZip: '75238',
  minVolume: 0,
  maxDistance: 9999,
}

export default function App() {
  const { records, loading, error, allCustomers } = useShipmentsData()
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const selectedOrigin = KNOWN_ORIGINS.find(o => o.zip === filters.originZip) ?? KNOWN_ORIGINS[0]
  const maxVolume = useMemo(() => records.reduce((max, r) => Math.max(max, r.pcs2025), 0), [records])
  const maxDistance = useMemo(() => {
    const vals = records.flatMap(r => {
      const d = r.distances[filters.originZip]
      return d != null ? [d] : []
    })
    return Math.max(...vals, 2000)
  }, [records, filters.originZip])

  if (loading) return <div className="loading">Loading...</div>
  if (error) return <div className="loading" style={{ color: 'var(--bad)' }}>Error: {error}</div>

  return (
    <div className="app-shell">
      <AppBar svgRef={svgRef} selectedOrigin={selectedOrigin} />
      <div className="app-body">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          allCustomers={allCustomers}
          origins={KNOWN_ORIGINS}
          maxVolume={maxVolume}
          maxDistance={maxDistance}
        />
        <ShipmentsMap
          records={records}
          filters={filters}
          svgRef={svgRef}
        />
      </div>
    </div>
  )
}
