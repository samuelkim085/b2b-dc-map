import { geoAlbersUsa, geoPath } from 'd3-geo'
import type { LandGrid } from './markerLayout'
import { MAP_WIDTH, MAP_SCALE, MAP_HEIGHT } from './markerLayout'

/**
 * Rasterizes the US land MultiPolygon onto a MAP_WIDTH × MAP_HEIGHT boolean grid
 * using an offscreen canvas. O(pixels) — runs in ~1ms vs thousands of geoContains
 * calls in the force-directed solver.
 */
export function buildLandGrid(usLandFeature: object): LandGrid {
  const canvas = document.createElement('canvas')
  canvas.width  = MAP_WIDTH
  canvas.height = MAP_HEIGHT
  const ctx = canvas.getContext('2d')!

  const projection = geoAlbersUsa()
    .scale(MAP_SCALE)
    .translate([MAP_WIDTH / 2, 300])

  const pathGen = geoPath(projection as Parameters<typeof geoPath>[0], ctx)
  ctx.fillStyle = '#000'
  ctx.beginPath()
  pathGen(usLandFeature as Parameters<typeof pathGen>[0])
  ctx.fill()

  const imageData = ctx.getImageData(0, 0, MAP_WIDTH, MAP_HEIGHT)
  const pixels = new Uint8Array(MAP_WIDTH * MAP_HEIGHT)
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = imageData.data[i * 4 + 3] > 0 ? 1 : 0
  }

  return { pixels, width: MAP_WIDTH, height: MAP_HEIGHT }
}
