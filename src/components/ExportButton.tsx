import { downloadSvg, downloadPng, buildFilename } from '../utils/export'
import type { Origin } from '../types'

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>
  selectedOrigin: Origin
}

export function ExportButton({ svgRef, selectedOrigin }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const filename = buildFilename(selectedOrigin.label, today)

  const handleSvg = () => {
    if (svgRef.current) downloadSvg(svgRef.current, filename)
  }

  const handlePng = () => {
    if (svgRef.current) downloadPng(svgRef.current, filename)
  }

  return (
    <div className="export-group">
      <button className="export-btn" onClick={handleSvg} title="Download as SVG">
        SVG
      </button>
      <button className="export-btn" onClick={handlePng} title="Download as PNG">
        PNG
      </button>
    </div>
  )
}
