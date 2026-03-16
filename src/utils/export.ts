export function buildFilename(originLabel: string, date: string): string {
  const slug = originLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')
  return `b2b-dc-map-${slug}-${date}`
}

export function downloadSvg(svgEl: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  triggerDownload(URL.createObjectURL(blob), `${filename}.svg`)
}

export async function downloadPng(svgEl: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)
  const { width, height } = svgEl.getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.width = width * 2   // 2x for retina
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')!
  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    triggerDownload(canvas.toDataURL('image/png'), `${filename}.png`)
  }
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}
