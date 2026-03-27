# Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Add a Chrome-style Settings page (gear icon in AppBar) with persistent localStorage settings for app theme, choropleth color, region visibility, map layers, marker style, and default filters.

**Architecture:** Settings are stored in a single `AppSettings` object in `localStorage`. A `useSettings` hook manages reads/writes. A `useTheme` hook applies `data-theme` attribute to `<html>` (matching divalink dashboard pattern). App.tsx holds a `view` state that switches between `'map'` and `'settings'` views. All settings flow down as props.

**Tech Stack:** React 18, TypeScript, D3 (d3-scale, d3-scale-chromatic), react-simple-maps, CSS variables (`data-theme` pattern), localStorage

---

## Settings Shape Reference

```ts
interface AppSettings {
  appTheme: 'bloomberg' | 'dark' | 'light'      // default: 'bloomberg'
  choroplethTheme: 'greens' | 'greys'            // default: 'greys'
  showAlaska: boolean                             // default: false
  showHawaii: boolean                             // default: false
  showDcMarkers: boolean                          // default: true
  showZipDots: boolean                            // default: false
  dcLogoScale: number                             // default: 1.0  (range 0.5–2.0)
  logoPadding: number                             // default: 2    (px, range 0–12)
  zipDotColor: string                             // default: '#000000'
  zipDotSize: number                              // default: 3    (px radius, range 1–10)
  defaultOriginZip: string                        // default: '75238'
  defaultMinVolume: number                        // default: 0
}
```

---

### Task 1: Add AppSettings type and useSettings hook

**Files:**
- Modify: `src/types.ts`
- Create: `src/hooks/useSettings.ts`

**Step 1: Add AppSettings interface to types.ts**

At the bottom of `src/types.ts` add:

```ts
export interface AppSettings {
  appTheme: 'bloomberg' | 'dark' | 'light'
  choroplethTheme: 'greens' | 'greys'
  showAlaska: boolean
  showHawaii: boolean
  showDcMarkers: boolean
  showZipDots: boolean
  dcLogoScale: number
  logoPadding: number
  zipDotColor: string
  zipDotSize: number
  defaultOriginZip: string
  defaultMinVolume: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  appTheme: 'bloomberg',
  choroplethTheme: 'greys',
  showAlaska: false,
  showHawaii: false,
  showDcMarkers: true,
  showZipDots: false,
  dcLogoScale: 1.0,
  logoPadding: 2,
  zipDotColor: '#000000',
  zipDotSize: 3,
  defaultOriginZip: '75238',
  defaultMinVolume: 0,
}
```

**Step 2: Create useSettings hook**

Create `src/hooks/useSettings.ts`:

```ts
import { useState, useCallback } from 'react'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const STORAGE_KEY = 'b2b-dc-map-settings'

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings)

  const setSettings = useCallback((update: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...update }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { settings, setSettings }
}
```

**Step 3: Commit**

```bash
git add src/types.ts src/hooks/useSettings.ts
git commit -m "feat: add AppSettings type and useSettings hook"
```

---

### Task 2: Add useTheme hook and themes.css

**Files:**
- Create: `src/hooks/useTheme.ts`
- Create: `src/styles/themes.css`
- Modify: `src/styles/bloomberg.css`

**Step 1: Create useTheme hook**

Create `src/hooks/useTheme.ts`:

```ts
export function applyTheme(theme: 'bloomberg' | 'dark' | 'light') {
  if (theme === 'bloomberg') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
```

**Step 2: Add map-specific CSS vars to bloomberg.css**

Append to `src/styles/bloomberg.css` (after existing `:root` block — do not replace it):

```css
:root {
  /* Map-specific vars (bloomberg default) */
  --map-state-default: #1a1a1a;
  --map-state-hover: #2a2a2a;
  --map-state-stroke: #444444;
  --map-bg: #000000;
}
```

**Step 3: Create themes.css with dark and light overrides**

Create `src/styles/themes.css`:

```css
[data-theme="dark"] {
  --bg: #0f1117;
  --bg-soft: #161b26;
  --panel: #1c2333;
  --panel-soft: #202d3d;
  --line: #2d3a4f;
  --line-strong: #4a5d73;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --accent: #60a5fa;
  --accent-soft: rgba(96, 165, 250, 0.13);
  --good: #34d399;
  --bad: #f87171;
  --warn: #fbbf24;
  --btn-bg: #1c2333;
  --btn-bg-hover: #2d3a4f;

  /* Map-specific */
  --map-state-default: #1c2333;
  --map-state-hover: #2d3a4f;
  --map-state-stroke: #4a5d73;
  --map-bg: #0f1117;
}

[data-theme="light"] {
  --bg: #ffffff;
  --bg-soft: #f5f5f5;
  --panel: #f5f5f5;
  --panel-soft: #fafafa;
  --line: #e0e0e0;
  --line-strong: #cccccc;
  --text: #1e1e1e;
  --muted: #616161;
  --accent: #1e1e1e;
  --accent-soft: rgba(0, 0, 0, 0.05);
  --good: #16a34a;
  --bad: #dc2626;
  --warn: #b45309;
  --btn-bg: #f5f5f5;
  --btn-bg-hover: #e8e8e8;

  /* Map-specific */
  --map-state-default: #e8edf2;
  --map-state-hover: #d0d8e4;
  --map-state-stroke: #808080;
  --map-bg: #ffffff;
}
```

**Step 4: Import themes.css in main.tsx**

In `src/main.tsx`, add after existing imports:
```ts
import './styles/themes.css'
```

**Step 5: Commit**

```bash
git add src/hooks/useTheme.ts src/styles/themes.css src/styles/bloomberg.css src/main.tsx
git commit -m "feat: add useTheme hook and dark/light CSS theme variables"
```

---

### Task 3: Wire settings and view state into App.tsx + AppBar.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppBar.tsx`

**Step 1: Update AppBar to accept onSettings callback and show gear icon**

Replace `src/components/AppBar.tsx` with:

```tsx
import { ExportButton } from './ExportButton'
import type { Origin } from '../types'

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>
  selectedOrigin: Origin
  onOpenSettings: () => void
}

export function AppBar({ svgRef, selectedOrigin, onOpenSettings }: Props) {
  return (
    <header className="app-bar">
      <span className="app-bar-title">B2B DC MAP</span>
      <div className="app-bar-actions">
        <ExportButton svgRef={svgRef} selectedOrigin={selectedOrigin} />
        <button className="app-bar-icon-btn" onClick={onOpenSettings} title="Settings" aria-label="Open settings">
          ⚙
        </button>
      </div>
    </header>
  )
}
```

**Step 2: Add gear button styles to bloomberg.css**

Append to `src/styles/bloomberg.css`:

```css
.app-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-bar-icon-btn {
  background: none;
  border: 1px solid var(--line);
  color: var(--muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
  line-height: 1;
  transition: color 0.15s, border-color 0.15s;
}

.app-bar-icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
```

**Step 3: Update App.tsx to hold view state and settings**

Replace `src/App.tsx` with:

```tsx
import { useRef, useState, useMemo, useEffect } from 'react'
import { useShipmentsData } from './hooks/useShipmentsData'
import { useSettings } from './hooks/useSettings'
import { applyTheme } from './hooks/useTheme'
import { ShipmentsMap } from './components/ShipmentsMap'
import { FilterPanel } from './components/FilterPanel'
import { AppBar } from './components/AppBar'
import { SettingsPage } from './components/SettingsPage'
import type { FilterState } from './types'
import { KNOWN_ORIGINS } from './types'
import './index.css'

export default function App() {
  const { records, loading, error, allCustomers } = useShipmentsData()
  const { settings, setSettings } = useSettings()
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

  // Apply theme on settings change
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
        <SettingsPage settings={settings} onChange={setSettings} onBack={() => setView('map')} />
      </div>
    )
  }

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
        <ShipmentsMap
          records={records}
          filters={filters}
          settings={settings}
          svgRef={svgRef}
        />
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/App.tsx src/components/AppBar.tsx src/styles/bloomberg.css
git commit -m "feat: wire view state and settings into App, add gear icon to AppBar"
```

---

### Task 4: Update choropleth.ts to accept theme parameter

**Files:**
- Modify: `src/utils/choropleth.ts`

**Step 1: Update buildColorScale to accept theme**

In `src/utils/choropleth.ts`, change the import line:
```ts
// Before:
import { interpolateGreens } from 'd3-scale-chromatic'

// After:
import { interpolateGreens, interpolateGreys } from 'd3-scale-chromatic'
```

Change `buildColorScale`:
```ts
// Before:
export function buildColorScale(maxVol: number): ScaleSequential<string> {
  return scaleSequential(interpolateGreens).domain([0, maxVol])
}

// After:
export function buildColorScale(maxVol: number, theme: 'greens' | 'greys' = 'greys'): ScaleSequential<string> {
  const interpolator = theme === 'greens' ? interpolateGreens : interpolateGreys
  return scaleSequential(interpolator).domain([0, maxVol * 1.2])
}
```

Note: domain is `maxVol * 1.2` to avoid the darkest grey being pure black.

**Step 2: Commit**

```bash
git add src/utils/choropleth.ts
git commit -m "feat: buildColorScale accepts theme parameter (greens|greys)"
```

---

### Task 5: Update ShipmentsMap to consume settings

**Files:**
- Modify: `src/components/ShipmentsMap.tsx`

**Step 1: Add settings prop and update ShipmentsMap**

Replace `src/components/ShipmentsMap.tsx` with:

```tsx
import { useMemo, useState } from 'react'
import { ComposableMap as _ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'
import type { ComposableMapProps } from 'react-simple-maps'
import { DcMarker } from './DcMarker'
import type { DcRecord, FilterState, AppSettings } from '../types'
import { buildStateVolumes, buildColorScale, getStateColor, STATE_NAME_TO_ABBR, buildAllStateDetails } from '../utils/choropleth'
import { computeMarkerOffsets } from '../utils/markerLayout'
import './ShipmentsMap.css'

const ComposableMap = _ComposableMap as React.ForwardRefExoticComponent<
  ComposableMapProps & React.RefAttributes<SVGSVGElement>
>

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

interface Props {
  records: DcRecord[]
  filters: FilterState
  settings: AppSettings
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function ShipmentsMap({ records, filters, settings, svgRef }: Props) {
  const [tooltip, setTooltip] = useState<DcRecord | null>(null)
  const [hoveredState, setHoveredState] = useState<{ name: string; abbr: string } | null>(null)

  const excludedRegions = useMemo(() => {
    const s = new Set<string>()
    if (!settings.showAlaska) s.add('Alaska')
    if (!settings.showHawaii) s.add('Hawaii')
    // future: if (!settings.showCanada) s.add('Canada')
    // future: if (!settings.showUK) s.add('United Kingdom')
    return s
  }, [settings.showAlaska, settings.showHawaii])

  const choroplethRecords = useMemo(() => {
    if (!filters.showChoropleth) return []
    if (filters.choroplethCustomers.length === 0) return records
    return records.filter(r => filters.choroplethCustomers.includes(r.customerKey))
  }, [records, filters.showChoropleth, filters.choroplethCustomers])

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
      Object.values(stateVolumes).reduce((max, v) => Math.max(max, v), 0),
      settings.choroplethTheme
    ) : null,
    [stateVolumes, filters.showChoropleth, settings.choroplethTheme]
  )

  const defaultStateFill = 'var(--map-state-default, #e8edf2)'
  const defaultStateHover = 'var(--map-state-hover, #d0d8e4)'
  const stateStroke = 'var(--map-state-stroke, #808080)'

  return (
    <div className="map-wrap">
      <ComposableMap
        ref={svgRef as React.RefObject<SVGSVGElement>}
        projection="geoAlbersUsa"
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter(geo => !excludedRegions.has(geo.properties.name as string))
              .map(geo => {
                const abbr = STATE_NAME_TO_ABBR[geo.properties.name as string]
                const fill = (filters.showChoropleth && colorScale && abbr)
                  ? getStateColor(abbr, stateVolumes, colorScale)
                  : defaultStateFill
                const hoverFill = filters.showChoropleth ? fill : defaultStateHover
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: { fill, stroke: stateStroke, strokeWidth: 0.5, outline: 'none' },
                      hover:   { fill: hoverFill, stroke: stateStroke, strokeWidth: 0.5, outline: 'none' },
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

        {/* Zip dot layer */}
        {settings.showZipDots && dcRecords
          .filter(r => r.lat != null && r.lon != null)
          .map(r => (
            <Marker key={`dot-${r.customerKey}-${r.zip}`} coordinates={[r.lon!, r.lat!]}>
              <circle
                r={settings.zipDotSize}
                fill={settings.zipDotColor}
                stroke="none"
                style={{ pointerEvents: 'none' }}
              />
            </Marker>
          ))
        }

        {/* DC marker layer */}
        {settings.showDcMarkers && dcRecords.map((r) => (
          <DcMarker
            key={`${r.customerKey}-${r.zip}`}
            record={r}
            selectedOriginZip={filters.originZip}
            onHover={setTooltip}
            offset={markerOffsets.get(`${r.customerKey}-${r.zip}`)}
            logoScale={settings.dcLogoScale}
            logoPadding={settings.logoPadding}
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
```

**Step 2: Commit**

```bash
git add src/components/ShipmentsMap.tsx
git commit -m "feat: ShipmentsMap consumes settings (regions, layers, marker style, choropleth theme)"
```

---

### Task 6: Update DcMarker to accept logoScale and logoPadding props

**Files:**
- Modify: `src/components/DcMarker.tsx`

**Step 1: Read the current DcMarker.tsx first, then add logoScale and logoPadding props**

The DcMarker component receives `logoScale` (multiplier, default 1.0) and `logoPadding` (px added to padding, default 2).

Find the existing size/padding constants in DcMarker.tsx (e.g. `const SIZE = 24` or similar) and multiply by `logoScale`. Add `logoPadding` to any existing padding value.

The props interface should become:
```ts
interface Props {
  record: DcRecord
  selectedOriginZip: string
  onHover: (r: DcRecord | null) => void
  offset?: { x: number; y: number }
  logoScale?: number    // default 1.0
  logoPadding?: number  // default 2
}
```

Apply `logoScale` to base dimensions and `logoPadding` to padding. Use default values if not provided.

**Step 2: Commit**

```bash
git add src/components/DcMarker.tsx
git commit -m "feat: DcMarker accepts logoScale and logoPadding props"
```

---

### Task 7: Build SettingsPage component

**Files:**
- Create: `src/components/SettingsPage.tsx`
- Create: `src/components/SettingsPage.css`

**Step 1: Create SettingsPage.tsx**

Create `src/components/SettingsPage.tsx`:

```tsx
import type { AppSettings } from '../types'
import './SettingsPage.css'

interface Props {
  settings: AppSettings
  onChange: (update: Partial<AppSettings>) => void
  onBack: () => void
}

const THEMES = [
  { value: 'bloomberg' as const, label: 'Bloomberg', desc: 'Amber on black' },
  { value: 'dark' as const,      label: 'Dark',      desc: 'Navy dark, blue accent' },
  { value: 'light' as const,     label: 'Light',     desc: 'Clean white' },
]

const CHOROPLETH_THEMES = [
  { value: 'greys' as const,  label: 'Grey' },
  { value: 'greens' as const, label: 'Green' },
]

export function SettingsPage({ settings, onChange, onBack }: Props) {
  return (
    <div className="settings-root">
      <header className="settings-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="Back to map">
          ← Back
        </button>
        <span className="settings-title">Settings</span>
      </header>

      <div className="settings-body">

        {/* Appearance */}
        <section className="settings-section">
          <h2 className="settings-section-title">Appearance</h2>
          <div className="settings-theme-cards">
            {THEMES.map(t => (
              <button
                key={t.value}
                className={`settings-theme-card ${settings.appTheme === t.value ? 'active' : ''}`}
                onClick={() => onChange({ appTheme: t.value })}
              >
                <span className="theme-card-label">{t.label}</span>
                <span className="theme-card-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="settings-divider" />

        {/* Map Style */}
        <section className="settings-section">
          <h2 className="settings-section-title">Map Style</h2>
          <div className="settings-row">
            <label className="settings-label">Choropleth color</label>
            <div className="settings-segmented">
              {CHOROPLETH_THEMES.map(t => (
                <button
                  key={t.value}
                  className={`seg-btn ${settings.choroplethTheme === t.value ? 'active' : ''}`}
                  onClick={() => onChange({ choroplethTheme: t.value })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="settings-divider" />

        {/* Visible Regions */}
        <section className="settings-section">
          <h2 className="settings-section-title">Visible Regions</h2>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showAlaska} onChange={e => onChange({ showAlaska: e.target.checked })} />
              Alaska
            </label>
          </div>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showHawaii} onChange={e => onChange({ showHawaii: e.target.checked })} />
              Hawaii
            </label>
          </div>
          <div className="settings-row settings-muted">Canada — coming soon</div>
          <div className="settings-row settings-muted">United Kingdom — coming soon</div>
        </section>

        <div className="settings-divider" />

        {/* Map Layers */}
        <section className="settings-section">
          <h2 className="settings-section-title">Map Layers</h2>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showDcMarkers} onChange={e => onChange({ showDcMarkers: e.target.checked })} />
              Show DC markers
            </label>
          </div>
          <div className="settings-row">
            <label className="settings-checkbox-label">
              <input type="checkbox" checked={settings.showZipDots} onChange={e => onChange({ showZipDots: e.target.checked })} />
              Show zip dots
            </label>
          </div>
        </section>

        <div className="settings-divider" />

        {/* Marker Style */}
        <section className="settings-section">
          <h2 className="settings-section-title">Marker Style</h2>
          <div className="settings-row">
            <label className="settings-label">DC logo scale</label>
            <div className="settings-slider-row">
              <input type="range" min={0.5} max={2} step={0.1} value={settings.dcLogoScale}
                onChange={e => onChange({ dcLogoScale: parseFloat(e.target.value) })} />
              <span className="settings-value">{settings.dcLogoScale.toFixed(1)}×</span>
            </div>
          </div>
          <div className="settings-row">
            <label className="settings-label">Logo padding</label>
            <div className="settings-slider-row">
              <input type="range" min={0} max={12} step={1} value={settings.logoPadding}
                onChange={e => onChange({ logoPadding: parseInt(e.target.value) })} />
              <span className="settings-value">{settings.logoPadding}px</span>
            </div>
          </div>
          <div className="settings-row">
            <label className="settings-label">Zip dot color</label>
            <input type="color" value={settings.zipDotColor}
              onChange={e => onChange({ zipDotColor: e.target.value })} />
          </div>
          <div className="settings-row">
            <label className="settings-label">Zip dot size</label>
            <div className="settings-slider-row">
              <input type="range" min={1} max={10} step={1} value={settings.zipDotSize}
                onChange={e => onChange({ zipDotSize: parseInt(e.target.value) })} />
              <span className="settings-value">{settings.zipDotSize}px</span>
            </div>
          </div>
        </section>

        <div className="settings-divider" />

        {/* Defaults */}
        <section className="settings-section">
          <h2 className="settings-section-title">Defaults</h2>
          <div className="settings-row">
            <label className="settings-label">Default origin zip</label>
            <input
              className="settings-text-input"
              type="text"
              maxLength={5}
              value={settings.defaultOriginZip}
              onChange={e => onChange({ defaultOriginZip: e.target.value })}
            />
          </div>
          <div className="settings-row">
            <label className="settings-label">Default min volume</label>
            <input
              className="settings-text-input"
              type="number"
              min={0}
              step={100}
              value={settings.defaultMinVolume}
              onChange={e => onChange({ defaultMinVolume: parseInt(e.target.value) || 0 })}
            />
          </div>
        </section>

      </div>
    </div>
  )
}
```

**Step 2: Create SettingsPage.css**

Create `src/components/SettingsPage.css`:

```css
.settings-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'IBM Plex Mono', monospace;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  height: 48px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  flex-shrink: 0;
}

.settings-back-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  padding: 4px 0;
}

.settings-back-btn:hover {
  opacity: 0.8;
}

.settings-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 640px;
}

.settings-section {
  padding: 16px 0;
}

.settings-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 12px 0;
}

.settings-divider {
  height: 1px;
  background: var(--line);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  gap: 16px;
}

.settings-label {
  color: var(--text);
  min-width: 160px;
}

.settings-muted {
  color: var(--muted);
  font-size: 12px;
  justify-content: flex-start;
}

.settings-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
}

.settings-checkbox-label input[type="checkbox"] {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
}

/* Theme cards */
.settings-theme-cards {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.settings-theme-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
  min-width: 120px;
}

.settings-theme-card:hover {
  border-color: var(--line-strong);
}

.settings-theme-card.active {
  border-color: var(--accent);
}

.theme-card-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.theme-card-desc {
  font-size: 11px;
  color: var(--muted);
}

/* Segmented control */
.settings-segmented {
  display: flex;
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}

.seg-btn {
  background: var(--panel);
  border: none;
  border-right: 1px solid var(--line);
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 5px 12px;
  transition: background 0.15s, color 0.15s;
}

.seg-btn:last-child {
  border-right: none;
}

.seg-btn:hover {
  background: var(--btn-bg-hover);
  color: var(--text);
}

.seg-btn.active {
  background: var(--accent-soft);
  color: var(--accent);
}

/* Slider */
.settings-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.settings-slider-row input[type="range"] {
  accent-color: var(--accent);
  width: 140px;
}

.settings-value {
  font-size: 12px;
  color: var(--muted);
  min-width: 36px;
  text-align: right;
}

/* Text/number inputs */
.settings-text-input {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text);
  font: inherit;
  font-size: 13px;
  padding: 5px 10px;
  width: 120px;
  text-align: right;
}

.settings-text-input:focus {
  outline: none;
  border-color: var(--accent);
}

/* Color input */
input[type="color"] {
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  height: 30px;
  padding: 2px;
  width: 48px;
  background: var(--panel);
}
```

**Step 3: Commit**

```bash
git add src/components/SettingsPage.tsx src/components/SettingsPage.css
git commit -m "feat: add SettingsPage with theme, regions, layers, marker style, defaults"
```

---

### Task 8: Verify the full flow and fix any TypeScript errors

**Step 1: Run the dev server**

```bash
npm run dev
```

Expected: no TypeScript errors, app loads with Bloomberg theme, gear icon visible in AppBar.

**Step 2: Run type-check**

```bash
npm run build
```

Expected: clean build, no type errors.

**Step 3: Manual smoke test checklist**

- [ ] Gear icon opens Settings page
- [ ] Back button returns to map
- [ ] Switching theme (Bloomberg/Dark/Light) immediately changes colors
- [ ] Grey/Green choropleth toggle works
- [ ] Alaska/Hawaii checkboxes toggle those states on the map
- [ ] DC markers toggle hides/shows logos
- [ ] Zip dots toggle shows black dots at exact coordinates (only for records with lat/lon)
- [ ] Logo scale slider changes marker sizes
- [ ] Zip dot color picker changes dot color
- [ ] Settings persist after page refresh
- [ ] Default origin zip pre-fills the filter panel on fresh load

**Step 4: Commit any fixes found during testing**

```bash
git add -p
git commit -m "fix: address TypeScript errors and smoke test issues"
```
