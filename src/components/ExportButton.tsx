import { downloadSvg, downloadPng, buildFilename } from '../utils/export'
import type { Origin } from '../types'

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>
  selectedOrigin: Origin
}

export function ExportButton({ svgRef, selectedOrigin }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const filename = buildFilename(selectedOrigin.label, today)

  return (
    <div className="export-group">
      <button
        className="export-btn"
        onClick={() => svgRef.current && downloadSvg(svgRef.current, filename)}
      >
        SVG
      </button>
      <button
        className="export-btn"
        onClick={() => svgRef.current && downloadPng(svgRef.current, filename)}
      >
        PNG
      </button>
    </div>
  )
}
