import type React from 'react'
import { ExportButton } from './ExportButton'
import type { Origin } from '../types'

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>
  selectedOrigin: Origin
  onOpenSettings: () => void
}

export function AppBar({ svgRef, selectedOrigin, onOpenSettings }: Props) {
  return (
    <header className="app-bar">
      <span className="app-bar-title">B2B DC MAP</span>
      <div className="app-bar-actions">
        <ExportButton svgRef={svgRef} selectedOrigin={selectedOrigin} />
        <button className="app-bar-icon-btn" onClick={onOpenSettings} title="Settings" aria-label="Open settings">
          ⚙
        </button>
      </div>
    </header>
  )
}
