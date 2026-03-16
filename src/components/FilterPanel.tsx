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

  return (
    <aside className="filter-panel">
      <h2 className="panel-title">FILTERS</h2>

      <CustomerDropdown
        allCustomers={allCustomers}
        selected={filters.customers}
        onChange={v => set('customers', v)}
      />

      <div className="filter-group">
        <label className="filter-label">ORIGIN</label>
        <select
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
        <label className="filter-label">
          MIN VOLUME — {filters.minVolume.toLocaleString()} pcs
        </label>
        <input
          type="range" className="filter-slider"
          min={0} max={maxVolume} step={1000}
          value={filters.minVolume}
          onChange={e => set('minVolume', Number(e.target.value))}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">
          MAX DISTANCE — {filters.maxDistance >= maxDistance ? 'All' : `${filters.maxDistance.toLocaleString()} mi`}
        </label>
        <input
          type="range" className="filter-slider"
          min={0} max={maxDistance} step={50}
          value={filters.maxDistance}
          onChange={e => set('maxDistance', Number(e.target.value))}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">MAP STYLE</label>
        <div className="radio-group">
          {(['Plain', 'Choropleth'] as const).map(style => (
            <label key={style} className="radio-label">
              <input
                type="radio"
                name="mapStyle"
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
