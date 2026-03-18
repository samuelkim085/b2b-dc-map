import { useRef, useState, useMemo, useEffect } from 'react'
import { useShipmentsData } from './hooks/useShipmentsData'
import { useSettings } from './hooks/useSettings'
import { applyTheme } from './hooks/useTheme'
import { ShipmentsMap } from './components/ShipmentsMap'
import { FilterPanel } from './components/FilterPanel'
import { AppBar } from './components/AppBar'
import type { FilterState } from './types'
import { KNOWN_ORIGINS } from './types'
import './index.css'

export default function App() {
  const { records, loading, error, allCustomers } = useShipmentsData()
  const { settings } = useSettings()
  const [view, setView] = useState<'map' | 'settings'>('map')
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [filters, setFilters] = useState<FilterState>(() => ({
    choroplethCustomers: [],
    showChoropleth: true,
    dcCustomers: [],
    originZip: settings.defaultOriginZip,
    minVolume: settings.defaultMinVolume,
    maxDistance: 9999,
  }))

  useEffect(() => {
    applyTheme(settings.appTheme)
  }, [settings.appTheme])

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

  if (view === 'settings') {
    return (
      <div className="app-shell">
        <div style={{ padding: '2rem', color: 'var(--text)' }}>
          Settings page coming soon...
          <button onClick={() => setView('map')} style={{ display: 'block', marginTop: '1rem' }}>← Back</button>
        </div>
      </div>
    )
  }

  // @ts-expect-error -- settings prop added in Task 5
  const shipmentsMap = <ShipmentsMap records={records} filters={filters} settings={settings} svgRef={svgRef} />

  return (
    <div className="app-shell">
      <AppBar svgRef={svgRef} selectedOrigin={selectedOrigin} onOpenSettings={() => setView('settings')} />
      <div className="app-body">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          allCustomers={allCustomers}
          origins={KNOWN_ORIGINS}
          maxVolume={maxVolume}
          maxDistance={maxDistance}
        />
        {shipmentsMap}
      </div>
    </div>
  )
}
