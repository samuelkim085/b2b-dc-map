# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # tsc -b && vite build
npm run lint         # ESLint
npm run test         # Vitest unit tests (run mode)
npm run test:ui      # Vitest interactive UI
npm run preview      # Preview production build
```

**Run a single test file:**
```bash
npx vitest src/hooks/useShipmentsData.test.ts --run
```

**E2E tests (Playwright) — requires dev server running first:**
```bash
npm run dev                                    # terminal 1
npx playwright test tests/map.spec.ts          # terminal 2
npx playwright test --headed                   # headed mode
```

## Architecture

React + TypeScript + Vite geospatial app visualizing B2B distribution center (DC) locations and shipment volumes across the US. TopoJSON-based choropleth map driven by CSV shipment data.

### Data Flow

1. `useShipmentsData` fetches `/data/shipments.csv`, parses with PapaParse, zero-pads ZIPs, looks up lat/lon from `zip-centroids.json`, maps customer names to short keys (`WM`, `TG`, `CVS`, `WG`, `Ulta`, `Sally`, `HEB`)
2. `App.tsx` holds all filter state and passes records down to `FilterPanel` (left sidebar) and `ShipmentsMap` (main view)
3. `ShipmentsMap` renders choropleth state colors + `DcMarker` components; TopoJSON fetched from local `/data/states-10m.json` at runtime; `topojson.merge()` produces the US land `MultiPolygon` passed to `computeMarkerOffsets`
4. `SettingsPage` (toggled from `AppBar`) reads/writes via `useSettings` which persists to localStorage

### CSV Schema (`public/data/shipments.csv`)

Columns consumed by `parseShipmentsCSV`:
- `delivery` — customer full name (mapped to customerKey via `CUSTOMER_MAP`)
- `delivery_address`, `dest_city`, `dest_state`, `dest_zip`, `dest_ctry`
- `pcs_*` — first column matching this prefix is used as `pcs2025`
- Any column matching `/^\d{5}$/` is treated as an origin ZIP; its value is the distance in miles (used for `maxDistance` filter)

Only rows where `dest_ctry === 'US'` are included. Customer logo images live in `public/img/{customerKey}.png`.

ZIP centroid data (`zip-centroids.json`) is **bundled** as a JSON import from `src/data/` — it is not fetched at runtime. `shipments.csv` and `states-10m.json` live in `public/data/` and are **fetched** at runtime. `states-10m.json` is the us-atlas TopoJSON (112 KB); keeping it local avoids CDN latency and eliminates the 4× duplicate fetch that react-simple-maps would cause if passed a URL string. Pass the pre-fetched topology **object** to `<Geographies>`, not the URL.

### Key Utilities

- **`markerLayout.ts`** — Force-directed physics solver prevents DC logo markers from overlapping. Priority order `['WM', 'TG', 'Sally', 'Ulta', 'CVS', 'WG', 'HEB']` keeps high-priority markers fixed; lower-priority ones are pushed radially outward. Each marker's stable ID is `${customerKey}-${zip}` (used as `Map` key and React `key`). After settling, `geoContains` against the merged US land `MultiPolygon` (derived from the same local TopoJSON, passed via `usLandFeature` prop) prevents logos from drifting off land. **`MAP_WIDTH = 800` and `MAP_SCALE = 1070` in this file must stay in sync with the `ComposableMap` projection in `ShipmentsMap.tsx`.**
- **`choropleth.ts`** — D3 sequential color scale built from aggregated state shipment volumes; also computes per-state customer detail for hover tooltips. `getStateColor` uses `volumes[abbr] ?? 0` so states with no data map to `scale(0)` = white — **do not return `var(--panel)` as a default here**, it appears black in bloomberg/dark themes. `buildColorScale` accepts a `darkBg` boolean that inverts the scale range for dark backgrounds, but this parameter is not currently wired up in `ShipmentsMap.tsx`.
- **`export.ts`** — SVG/PNG download; substitutes CSS variable values with light-mode hex equivalents (`EXPORT_LIGHT_VARS`) so exports are readable on white backgrounds. Inlines logo images as base64 data URLs; remote `http` image elements are removed entirely. PNG exports at 1600px wide, preserving viewBox aspect ratio.
- **`theme.ts`** — Sets `data-theme` attribute on document root; CSS variables in `src/styles/themes.css` do the rest.
- **`logoConfig.ts`** — Per-customer logo dimensions and aspect ratios used by the marker layout solver. `DcMarker` falls back to a colored circle + customerKey text label when the logo PNG fails to load.

### Types (`src/types.ts`)

Central definitions shared across the app: `DcRecord`, `FilterState`, `AppSettings`, `DEFAULT_SETTINGS`, `CUSTOMER_MAP`, `CUSTOMER_COLORS`, `CUSTOMER_DOMAINS`, `KNOWN_ORIGINS`.

`AppSettings` fields (persisted to localStorage via `useSettings`):
- `appTheme` — `'bloomberg' | 'dark' | 'light'`
- `choroplethTheme` — `'greens' | 'greys'`
- `showAlaska`, `showHawaii`, `showDcMarkers`, `showZipDots` — layer visibility toggles
- `dcLogoScale`, `logoPadding` — marker sizing
- `zipDotColor`, `zipDotSize` — zip dot styling
- `defaultOriginZip`, `defaultMinVolume` — initial filter values on load

### Theme System

Three themes: `bloomberg` (default), `dark`, `light`. All color tokens are CSS variables (`--panel`, `--bg`, `--text`, `--accent`, `--map-state-*`, etc.) defined in `src/styles/themes.css`. Applied by `useTheme` hook via `data-theme` attribute.

`bloomberg` theme is the default (`:root` in `bloomberg.css`, no `data-theme` attribute). `--panel` is `#0b0b0b` in bloomberg and `#1c2333` in dark — both near-black. Avoid using `var(--panel)` as a fill color for map states in the choropleth path.

### Dev Server

Port 5173 may fail with `EACCES` on Windows. Use `npx vite --port 3000 --host` as a fallback.

### Test Setup

- Vitest with `jsdom` environment, globals enabled, `@testing-library/jest-dom` in `src/test-setup.ts`
- Playwright tests live in `tests/` and are excluded from Vitest via `vite.config.ts`
- Playwright waits for `.map-wrap svg` (TopoJSON) and `circle` (CSV markers) before each test
