import { useState, useEffect } from 'react'
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

/** Text input that shows a draft while typing, commits on Enter or blur. */
function NumberInput({
  value, min, max, step, disabled, ariaLabel, unit,
  onCommit,
}: {
  value: number
  min: number
  max: number
  step: number
  disabled?: boolean
  ariaLabel: string
  unit: string
  onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState(String(value))

  // Keep draft in sync when the slider (or external change) updates the value
  useEffect(() => { setDraft(String(value)) }, [value])

  const commit = () => {
    const n = Number(draft)
    if (!isNaN(n)) {
      onCommit(Math.max(min, Math.min(max, n)))
    } else {
      setDraft(String(value))  // revert invalid input
    }
  }

  return (
    <div className="number-input-wrap">
      <input
        type="number"
        className="filter-number"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() } }}
      />
      <span className="number-unit">{unit}</span>
    </div>
  )
}

export function FilterPanel({ filters, onChange, allCustomers, origins, maxVolume, maxDistance }: Props) {
  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val })

  const clampedDistance = Math.min(filters.maxDistance, maxDistance)

  return (
    <aside className="filter-panel">
      <h2 className="panel-title">FILTERS</h2>

      {/* ── Choropleth Section ── */}
      <div className="filter-section-header">QTY BY STATE</div>

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

      <CustomerDropdown
        allCustomers={allCustomers}
        selected={filters.choroplethCustomers}
        onChange={v => set('choroplethCustomers', v)}
        label="QTY CUSTOMER"
      />

      {/* ── DC Locations Section ── */}
      <div className="filter-section-header">DC LOCATIONS</div>

      <CustomerDropdown
        allCustomers={allCustomers}
        selected={filters.dcCustomers}
        onChange={v => set('dcCustomers', v)}
        label="DC CUSTOMER"
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
        <label className="filter-label" htmlFor="volume-slider">MIN VOLUME</label>
        <input
          id="volume-slider"
          type="range"
          className="filter-slider"
          min={0}
          max={maxVolume}
          step={1000}
          value={filters.minVolume}
          disabled={maxVolume === 0}
          onChange={e => { if (maxVolume > 0) set('minVolume', Number(e.target.value)) }}
        />
        <NumberInput
          value={filters.minVolume}
          min={0}
          max={maxVolume}
          step={1000}
          disabled={maxVolume === 0}
          ariaLabel="Minimum volume in pieces"
          unit="pcs"
          onCommit={v => set('minVolume', v)}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label" htmlFor="distance-slider">MAX DISTANCE</label>
        <input
          id="distance-slider"
          type="range"
          className="filter-slider"
          min={0}
          max={maxDistance}
          step={50}
          value={clampedDistance}
          onChange={e => set('maxDistance', Number(e.target.value))}
        />
        <NumberInput
          value={clampedDistance}
          min={0}
          max={maxDistance}
          step={50}
          ariaLabel="Maximum distance in miles"
          unit={clampedDistance >= maxDistance ? 'mi (all)' : 'mi'}
          onCommit={v => set('maxDistance', v)}
        />
      </div>
    </aside>
  )
}
