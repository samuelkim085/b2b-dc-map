# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev` (Vite, default `http://localhost:5173`)
- Build production bundle: `npm run build` (`tsc -b && vite build`)
- Preview production build: `npm run preview`
- Lint: `npm run lint`
- Unit tests (Vitest, run mode): `npm run test`
- Unit tests (interactive UI): `npm run test:ui`
- Run a single unit test file: `npx vitest src/hooks/useShipmentsData.test.ts --run`
- E2E tests (Playwright): run `npm run dev` in one terminal, then `npx playwright test tests/map.spec.ts` in another

Windows note: if port 5173 fails with `EACCES`, use `npx vite --port 3000 --host`.

## Project architecture (big picture)
This is a React + TypeScript + Vite map app that visualizes US DC shipments from CSV data on a TopoJSON-backed map.

### Runtime data flow
1. `src/hooks/useShipmentsData.ts` fetches `public/data/shipments.csv`, parses via PapaParse, normalizes ZIPs, maps `delivery` names to internal `customerKey`, and enriches rows with coordinates from `src/data/zip-centroids.json`.
2. `src/App.tsx` is the state coordinator: it owns filter state, loads persisted app settings from `useSettings`, applies theme, and routes between map and settings views.
3. `src/components/FilterPanel.tsx` edits filter state (customers, origin ZIP, volume, distance).
4. `src/components/ShipmentsMap.tsx` renders US geographies plus choropleth fill, zip dots, and DC markers based on current filters/settings.
5. `src/components/SettingsPage.tsx` updates persisted UI/map settings (theme, visible regions, marker behavior, defaults).

### Key modules and why they matter
- `src/utils/choropleth.ts`: aggregates state shipment volumes and builds d3 sequential color scales; hover detail data is also aggregated here.
- `src/utils/markerLayout.ts`: force-based marker offset solver to prevent logo overlap; includes optional land containment using merged US polygons.
- `src/utils/export.ts`: SVG/PNG export pipeline; converts theme CSS variables to light-mode colors and inlines local logo images before download.
- `src/types.ts`: canonical domain model (`DcRecord`, filter/settings contracts, known origins, customer mapping constants).

### Map and geography behavior
- Geographies are loaded from `https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json` in `ShipmentsMap.tsx`.
- The same TopoJSON is merged via `topojson.merge(...)` and passed to marker layout to keep displaced logos on land.
- Alaska/Hawaii visibility is controlled via settings in map rendering (not by changing the source geography file).

## Data contract details to preserve
- CSV parsing expects:
  - `dest_ctry` (only `US` rows are kept)
  - `dest_zip`, `dest_city`, `dest_state`, `delivery`, `delivery_address`
  - at least one `pcs_*` column (first match is used as shipment volume)
  - origin ZIP columns named as 5-digit headers (values become distance map)
- Marker identity is `${customerKey}-${zip}` and is used consistently for layout and React keys.

## Testing setup details
- Vitest config is in `vite.config.ts`:
  - environment: `jsdom`
  - globals: enabled
  - setup file: `src/test-setup.ts`
  - excludes Playwright tests (`tests/**`)
- Playwright config is in `playwright.config.ts` with `baseURL: http://localhost:5173` and `testDir: ./tests`.

## Existing repo-specific guidance carried from CLAUDE.md
- Do not default choropleth state fill to `var(--panel)`; dark themes make it nearly black and hard to read.
- Export paths should keep light-mode substitutions for readability on white backgrounds.
