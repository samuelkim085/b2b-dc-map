// CSS variable → light-mode hex replacements applied to all exports.
// The live app uses a dark bloomberg theme, but exported maps should always
// be light so they are legible on white backgrounds (print, slides, email).
const EXPORT_LIGHT_VARS: Record<string, string> = {
  'var(--panel)':      '#eef0f4',   // state fill — light gray
  'var(--panel-soft)': '#e0e4eb',   // state hover fill — slightly darker
  'var(--line)':       '#a8b4be',   // state borders — medium gray
  'var(--bg)':         '#ffffff',   // map background
  'var(--text)':       '#1a1a2e',   // any text elements
  'var(--muted)':      '#6b7280',
  'var(--accent)':     '#e07b00',   // keep accent readable on white
}

function applyLightMode(svgStr: string): string {
  let out = svgStr
  for (const [varRef, hex] of Object.entries(EXPORT_LIGHT_VARS)) {
    out = out.split(varRef).join(hex)
  }
  return out
}

function cloneForExport(svgEl: SVGSVGElement): SVGSVGElement {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  // Remove external <image> elements (Clearbit logos) to avoid tainted canvas
  clone.querySelectorAll('image').forEach(img => {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href') || ''
    if (href.startsWith('http')) img.remove()
  })
  return clone
}

export function buildFilename(originLabel: string, date: string): string {
  const slug = originLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `b2b-dc-map-${slug}-${date}`
}

export function downloadSvg(svgEl: SVGSVGElement, filename: string): void {
  const serializer = new XMLSerializer()
  const svgStr = applyLightMode(serializer.serializeToString(cloneForExport(svgEl)))
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${filename}.svg`)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadPng(svgEl: SVGSVGElement, filename: string): void {
  const serializer = new XMLSerializer()
  const svgStr = applyLightMode(serializer.serializeToString(cloneForExport(svgEl)))
  const { width, height } = svgEl.getBoundingClientRect()
  // Scale up to 2x while preserving the exact aspect ratio of the rendered map
  const scale = Math.max(2, 1600 / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    try {
      triggerDownload(canvas.toDataURL('image/png'), `${filename}.png`)
    } catch (e) {
      console.error('PNG export failed:', e)
    }
  }
  img.onerror = () => console.error('PNG export: failed to load SVG as image')
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
