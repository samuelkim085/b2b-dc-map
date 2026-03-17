// Single source of truth for logo rendering constants.
// Keep in sync with any visual changes in DcMarker.tsx.

export const LOGO_SCALE = 0.5;

export const LOGO_HEIGHT_BASE: Record<string, number> = {
  WM: 43,
  TG: 13,
  Sally: 20,
  CVS: 35,
  WG: 13,
  Ulta: 25,
  HEB: 30,
};

export const LOGO_ASPECT: Record<string, number> = {
  WM: 300 / 168,
  TG: 1000 / 228,
  Sally: 257 / 148,
  CVS: 169 / 148,
  WG: 820 / 170,
  Ulta: 350 / 200,
  HEB: 270 / 148,
};

/** Returns [halfWidth, halfHeight] for a logo in SVG pixel space. */
export function getLogoHalfDims(customerKey: string): [number, number] {
  const h = (LOGO_HEIGHT_BASE[customerKey] ?? 20) * LOGO_SCALE;
  const w = h * (LOGO_ASPECT[customerKey] ?? 1.5);
  return [w / 2, h / 2];
}
