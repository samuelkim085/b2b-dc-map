import { useMemo, useState } from 'react'
import { ComposableMap as _ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { ComposableMapProps } from 'react-simple-maps'
import { DcMarker } from './DcMarker'
import type { DcRecord, FilterState } from '../types'
import { buildStateVolumes, buildColorScale, getStateColor, STATE_NAME_TO_ABBR, buildAllStateDetails } from '../utils/choropleth'
import { computeMarkerOffsets } from '../utils/markerLayout'
import './ShipmentsMap.css'

// ComposableMap is a forwardRef component at runtime but @types doesn't declare it —
// cast to accept ref so we can hand the SVGSVGElement to the export utilities.
const ComposableMap = _ComposableMap as React.ForwardRefExoticComponent<
  ComposableMapProps & React.RefAttributes<SVGSVGElement>
>

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface Props {
  records: DcRecord[]
  filters: FilterState
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ShipmentsMap({ records, filters, svgRef }: Props) {
  const [tooltip, setTooltip] = useState<DcRecord | null>(null)
  const [hoveredState, setHoveredState] = useState<{ name: string; abbr: string } | null>(null)

  // Records for choropleth coloring — filtered only by choroplethCustomers
  const choroplethRecords = useMemo(() => {
    if (!filters.showChoropleth) return []
    if (filters.choroplethCustomers.length === 0) return records
    return records.filter(r => filters.choroplethCustomers.includes(r.customerKey))
  }, [records, filters.showChoropleth, filters.choroplethCustomers])

  // Records for DC location markers — filtered by dcCustomers + location filters
  const dcRecords = useMemo(() => {
    return records.filter(r => {
      if (filters.dcCustomers.length > 0 && !filters.dcCustomers.includes(r.customerKey)) return false
      if (r.pcs2025 < filters.minVolume) return false
      const dist = r.distances[filters.originZip]
      if (dist != null && dist > filters.maxDistance) return false
      return true
    })
  }, [records, filters.dcCustomers, filters.originZip, filters.minVolume, filters.maxDistance])

  const stateDetailsMap = useMemo(() => buildAllStateDetails(dcRecords), [dcRecords])

  const markerOffsets = useMemo(() => computeMarkerOffsets(dcRecords), [dcRecords])

  const stateVolumes = useMemo(
    () => filters.showChoropleth ? buildStateVolumes(choroplethRecords) : {},
    [choroplethRecords, filters.showChoropleth]
  )

  const colorScale = useMemo(
    () => filters.showChoropleth ? buildColorScale(
      Object.values(stateVolumes).reduce((max, v) => Math.max(max, v), 0)
    ) : null,
    [stateVolumes, filters.showChoropleth]
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
            geographies.map(geo => {
              const abbr = STATE_NAME_TO_ABBR[geo.properties.name as string]
              const fill = (filters.showChoropleth && colorScale && abbr)
                ? getStateColor(abbr, stateVolumes, colorScale)
                : '#e8edf2'
              const hoverFill = filters.showChoropleth ? fill : '#d0d8e4'
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill, stroke: '#808080', strokeWidth: 0.5, outline: 'none' },
                    hover:   { fill: hoverFill, stroke: '#808080', strokeWidth: 0.5, outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                  onMouseEnter={() => {
                    if (abbr && stateDetailsMap[abbr]) setHoveredState({ name: geo.properties.name as string, abbr })
                  }}
                  onMouseLeave={() => setHoveredState(null)}
                />
              )
            })
          }
        </Geographies>
        {dcRecords.map((r) => (
          <DcMarker
            key={`${r.customerKey}-${r.zip}`}
            record={r}
            selectedOriginZip={filters.originZip}
            onHover={setTooltip}
            offset={markerOffsets.get(`${r.customerKey}-${r.zip}`)}
          />
        ))}
      </ComposableMap>

      {tooltip ? (
        <div className="map-tooltip">
          <strong>{tooltip.customer}</strong>
          <span>{tooltip.city}, {tooltip.state}</span>
          <span>{tooltip.pcs2025.toLocaleString()} pcs</span>
          <span>{tooltip.distances[filters.originZip]?.toLocaleString() ?? '—'} mi</span>
        </div>
      ) : hoveredState && stateDetailsMap[hoveredState.abbr] && (() => {
        const sd = stateDetailsMap[hoveredState.abbr]
        const customers = Object.entries(sd.byCustomer).sort((a, b) => b[1].pcs - a[1].pcs)
        return (
          <div className="map-tooltip">
            <strong>{hoveredState.name} ({hoveredState.abbr})</strong>
            <span>{sd.totalPcs.toLocaleString()} pcs · {sd.dcCount} DC{sd.dcCount !== 1 ? 's' : ''}</span>
            <div className="tooltip-divider" />
            {customers.map(([key, { name, pcs }]) => (
              <div key={key} className="tooltip-row">
                <span>{name}</span>
                <span>{pcs.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
