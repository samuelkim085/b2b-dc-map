# Zoom / Pan — Design

**Date:** 2026-03-22
**Status:** Approved

## Summary

Add wheel-zoom and drag-pan to the map using `d3-zoom`, which is already present in the dep tree via `react-simple-maps`.

## Architecture

- Attach `d3.zoom()` to the existing `svgRef` in `ShipmentsMap.tsx`.
- Store the current transform as `{ x, y, k }` in React state.
- Wrap all SVG content (Geographies, zip dots, FlowLayer, DC markers) in one `<g transform="translate(x,y) scale(k)">`.

## Inverse scaling

DC logos and zip dots must stay the same visual size regardless of zoom level `k`.

- **`DcMarker`** receives `k` and applies `transform="translate(offset[0]/k, offset[1]/k) scale(1/k)"` to its inner `<g>`. Dividing the solver offset by `k` keeps the screen-space distance from the zip dot constant.
- **Zip dots** use `r={zipDotSize / k}` so the rendered radius is always `zipDotSize` pixels on screen.
- **`strokeWidth`** on Geography elements uses `0.5 / k` so state borders stay hairline at all zoom levels.
- **FlowLayer** lines/arrows may need `strokeWidth / k` — handled inside `FlowLayer`.

## Controls & UX

- Scroll wheel: zoom centred on cursor.
- Drag: pan.
- Double-click: zoom in 2×.
- Zoom limits: min `1` (full US), max `8` (city level).
- Cursor: `grab` at rest, `grabbing` while dragging.

## Dependencies

Add `d3-zoom` and `@types/d3-zoom` as direct deps (already transitive via react-simple-maps).

## Files changed

| File | Change |
|------|--------|
| `package.json` | add `d3-zoom`, `@types/d3-zoom` |
| `src/components/ShipmentsMap.tsx` | attach zoom, wrap content in `<g>`, thread `k` to children |
| `src/components/DcMarker.tsx` | accept `k` prop, apply inverse scale |
| `src/components/ShipmentsMap.css` | grab/grabbing cursor |
| `src/components/FlowLayer.tsx` | scale-invariant stroke widths |
