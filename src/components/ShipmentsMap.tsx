import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { DcRecord, FilterState } from '../types'
import { buildStateVolumes, getStateColor, STATE_NAME_TO_ABBR } from '../utils/choropleth'
import './ShipmentsMap.css'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface Props {
  records: DcRecord[]
  filters: FilterState
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ShipmentsMap({ records, filters, svgRef }: Props) {
  const [tooltip, setTooltip] = useState<DcRecord | null>(null)

  const visibleRecords = useMemo(() => {
    return records.filter(r => {
      if (filters.customers.length > 0 && !filters.customers.includes(r.customerKey)) return false
      if (r.pcs2025 < filters.minVolume) return false
      const dist = r.distances[filters.originZip]
      if (dist != null && dist > filters.maxDistance) return false
      return true
    })
  }, [records, filters])

  const stateVolumes = useMemo(
    () => buildStateVolumes(visibleRecords),
    [visibleRecords]
  )
  const maxVol = useMemo(
    () => Object.values(stateVolumes).reduce((max, v) => Math.max(max, v), 0),
    [stateVolumes]
  )

  return (
    <div className="map-wrap">
      <ComposableMap
        ref={svgRef as React.RefObject<SVGSVGElement>}
        projection="geoAlbersUsa"
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: {
                    fill: filters.showChoropleth
                      ? getStateColor(STATE_NAME_TO_ABBR[geo.properties.name as string] ?? '', stateVolumes, maxVol)
                      : 'var(--panel)',
                    stroke: 'var(--line)',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                  hover: {
                    fill: filters.showChoropleth
                      ? getStateColor(STATE_NAME_TO_ABBR[geo.properties.name as string] ?? '', stateVolumes, maxVol)
                      : 'var(--panel-soft)',
                    stroke: 'var(--line)',
                    strokeWidth: 0.5,
                    outline: 'none',
                  },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>

      {tooltip && (
        <div className="map-tooltip">
          <strong>{tooltip.customer}</strong>
          <span>{tooltip.city}, {tooltip.state}</span>
          <span>{tooltip.pcs2025.toLocaleString()} pcs</span>
          <span>{tooltip.distances[filters.originZip]?.toLocaleString() ?? '—'} mi</span>
        </div>
      )}
    </div>
  )
}
