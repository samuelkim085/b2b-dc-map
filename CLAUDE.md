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
3. `ShipmentsMap` renders choropleth state colors + `DcMarker` components; TopoJSON fetched from CDN at runtime
4. `SettingsPage` (toggled from `AppBar`) reads/writes via `useSettings` which persists to localStorage

### Key Utilities

- **`markerLayout.ts`** — AABB collision detection prevents DC logo markers from overlapping on the map. Priority order `['WM', 'TG', 'Sally', 'Ulta', 'CVS', 'WG', 'HEB']` keeps high-priority markers fixed and pushes lower-priority ones radially outward.
- **`choropleth.ts`** — D3 sequential color scale built from aggregated state shipment volumes; also computes per-state customer detail for hover tooltips.
- **`export.ts`** — SVG/PNG download; substitutes CSS variable values with light-mode equivalents so exports are always readable.
- **`theme.ts`** — Sets `data-theme` attribute on document root; CSS variables in `src/styles/themes.css` do the rest.
- **`logoConfig.ts`** — Per-customer logo dimensions and aspect ratios used by the marker layout solver.

### Theme System

Three themes: `bloomberg` (default), `dark`, `light`. All color tokens are CSS variables (`--panel`, `--bg`, `--text`, `--accent`, `--map-state-*`, etc.) defined in `src/styles/themes.css`. Applied by `useTheme` hook via `data-theme` attribute.

### Test Setup

- Vitest with `jsdom` environment, globals enabled, `@testing-library/jest-dom` in `src/test-setup.ts`
- Playwright tests live in `tests/` and are excluded from Vitest via `vite.config.ts`
- Playwright waits for `.map-wrap svg` (TopoJSON) and `circle` (CSV markers) before each test
