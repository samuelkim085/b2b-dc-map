import type React from "react";
import { ExportButton } from "./ExportButton";
import type { Origin } from "../types";

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>;
  selectedOrigin: Origin;
  dataMode: 'b2b' | 'b2c';
  onDataModeChange: (mode: 'b2b' | 'b2c') => void;
}

export function AppBar({ svgRef, selectedOrigin, dataMode, onDataModeChange }: Props) {
  return (
    <header className="app-bar">
      <span className="app-bar-title">DC MAP</span>
      <div className="app-bar-mode-toggle">
        <button
          type="button"
          className={`mode-btn${dataMode === 'b2b' ? ' active' : ''}`}
          onClick={() => onDataModeChange('b2b')}
        >
          B2B
        </button>
        <button
          type="button"
          className={`mode-btn${dataMode === 'b2c' ? ' active' : ''}`}
          onClick={() => onDataModeChange('b2c')}
        >
          B2C
        </button>
      </div>
      <div className="app-bar-actions">
        <ExportButton svgRef={svgRef} selectedOrigin={selectedOrigin} />
      </div>
    </header>
  );
}
