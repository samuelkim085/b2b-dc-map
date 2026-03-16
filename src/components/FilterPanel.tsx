import { CustomerDropdown } from './CustomerDropdown'
import type { FilterState, Origin } from '../types'
import './FilterPanel.css'

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
  allCustomers: string[]
  origins: Origin[]
  maxVolume: number
  maxDistance: number
}

export function FilterPanel({ filters, onChange, allCustomers, origins, maxVolume, maxDistance }: Props) {
  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val })

  const clampedDistance = Math.min(filters.maxDistance, maxDistance)
  const distanceLabel = clampedDistance >= maxDistance
    ? 'All'
    : `${clampedDistance.toLocaleString()} mi`

  return (
    <aside className="filter-panel">
      <h2 className="panel-title">FILTERS</h2>

      <CustomerDropdown
        allCustomers={allCustomers}
        selected={filters.customers}
        onChange={v => set('customers', v)}
      />

      <div className="filter-group">
        <label className="filter-label" htmlFor="origin-select">ORIGIN</label>
        <select
          id="origin-select"
          className="filter-select"
          value={filters.originZip}
          onChange={e => set('originZip', e.target.value)}
        >
          {origins.map(o => (
            <option key={o.zip} value={o.zip}>{o.label} ({o.zip})</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="volume-slider">
          MIN VOLUME — {filters.minVolume.toLocaleString()} pcs
        </label>
        <input
          id="volume-slider"
          type="range"
          className="filter-slider"
          min={0}
          max={maxVolume}
          step={1000}
          value={filters.minVolume}
          disabled={maxVolume === 0}
          onChange={e => {
            if (maxVolume > 0) set('minVolume', Number(e.target.value))
          }}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="distance-slider">
          MAX DISTANCE — {distanceLabel}
        </label>
        <input
          id="distance-slider"
          type="range"
          className="filter-slider"
          min={0}
          max={maxDistance}
          step={50}
          value={Math.min(filters.maxDistance, maxDistance)}
          onChange={e => set('maxDistance', Number(e.target.value))}
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">MAP STYLE</span>
        <div className="radio-group" role="radiogroup" aria-label="Map style">
          {(['Plain', 'Choropleth'] as const).map(style => (
            <label key={style} className="radio-label">
              <input
                type="radio"
                name="mapStyle"
                value={style}
                checked={filters.showChoropleth === (style === 'Choropleth')}
                onChange={() => set('showChoropleth', style === 'Choropleth')}
              />
              {style}
            </label>
          ))}
        </div>
      </div>
    </aside>
  )
}
