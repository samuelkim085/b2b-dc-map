# B2C State Data Editor — Design

**Date:** 2026-03-26
**Status:** Approved

## Summary

Add an in-app editor for `public/data/b2c_qty_by_state_2025.csv`. A button in the AppBar opens a dedicated editor page where users can modify per-state shipment quantities and save them back to the CSV file.

## Architecture

### Vite Dev Plugin (`vite.config.ts`)

- Add a dev-only Vite plugin that registers `POST /api/save-b2c` middleware
- Request body: raw CSV text (`Content-Type: text/plain`)
- Handler: `fs.writeFileSync('public/data/b2c_qty_by_state_2025.csv', body)`
- Only active when `mode === 'development'`

### AppBar Button

- Add "Edit B2C Data" button next to the settings gear icon
- Only rendered when `dataMode === 'b2c'`
- On click: sets `App.tsx` view state to `'b2cEditor'`

### `B2cEditorPage.tsx` (new component)

- On mount: `fetch('/data/b2c_qty_by_state_2025.csv')` to load current data
- Renders a table with columns: **State** | **Qty**
- Each Qty cell is an `<input type="number">` — inline editing
- Validation: red border if value is not a valid positive integer
- **Save button**: serializes table back to CSV, `POST /api/save-b2c`, on success increments `b2cRefreshKey` in App and navigates back to map
- **Cancel button**: navigates back to map without saving

### Data Refresh Flow

- `App.tsx`: add `b2cRefreshKey: number` state (starts at 0)
- Pass `b2cRefreshKey` down to `useB2cData` as a parameter
- `useB2cData`: add `refreshKey` to `useEffect` dependency array so it refetches when key changes
- After successful save, `B2cEditorPage` calls `onSaveSuccess()` callback → App increments key and sets view back to `'map'`

## Components & Files Changed

| File | Change |
|------|--------|
| `vite.config.ts` | Add dev plugin with POST endpoint |
| `src/App.tsx` | Add `b2cEditor` view state, `b2cRefreshKey`, render `B2cEditorPage` |
| `src/components/AppBar.tsx` | Add "Edit B2C Data" button |
| `src/hooks/useB2cData.ts` | Accept `refreshKey` parameter |
| `src/components/B2cEditorPage.tsx` | New component — editor UI |

## Out of Scope

- Production deployment (dev only)
- B2B data editing
- Row add/delete (only value editing)
- Undo/redo
