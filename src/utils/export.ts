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
  const svgStr = serializer.serializeToString(svgEl)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${filename}.svg`)
  // Revoke after a short delay to ensure browser has initiated the download
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadPng(svgEl: SVGSVGElement, filename: string): void {
  // Clone the SVG and replace all external <image> elements with nothing
  // (removes logo markers) to avoid tainted canvas SecurityError
  const clone = svgEl.cloneNode(true) as SVGSVGElement

  // Remove all <image> elements that have external hrefs (Clearbit logos)
  const images = clone.querySelectorAll('image')
  images.forEach(img => {
    const href = img.getAttribute('href') || img.getAttribute('xlink:href') || ''
    if (href.startsWith('http')) {
      img.remove()
    }
  })

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(clone)
  const { width, height } = svgEl.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width * 2, 800)
  canvas.height = Math.max(height * 2, 500)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    ctx.fillStyle = '#0a0a0a'
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
