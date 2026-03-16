import { ExportButton } from './ExportButton'
import type { Origin } from '../types'

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>
  selectedOrigin: Origin
}

export function AppBar({ svgRef, selectedOrigin }: Props) {
  return (
    <header className="app-bar">
      <span className="app-bar-title">B2B DC MAP</span>
      <ExportButton svgRef={svgRef} selectedOrigin={selectedOrigin} />
    </header>
  )
}
