import { useState } from 'react'
import { Marker } from 'react-simple-maps'
import type { DcRecord } from '../types'
import { CUSTOMER_COLORS } from '../types'
import { LOGO_SCALE, LOGO_HEIGHT_BASE, LOGO_ASPECT } from '../utils/logoConfig'

interface Props {
  record: DcRecord
  selectedOriginZip: string
  onHover: (record: DcRecord | null) => void
  offset?: [number, number]
}

export function DcMarker({ record, selectedOriginZip: _selectedOriginZip, onHover, offset = [0, 0] }: Props) {
  const [imgFailed, setImgFailed] = useState(false)

  if (record.lat == null || record.lon == null) return null

  const color = CUSTOMER_COLORS[record.customerKey] ?? '#888888'
  const logoUrl = `/img/${record.customerKey}.png`
  const h = (LOGO_HEIGHT_BASE[record.customerKey] ?? 20) * LOGO_SCALE
  const aspect = LOGO_ASPECT[record.customerKey] ?? 1.5
  const logoW = h * aspect
  const halfW = logoW / 2
  const halfH = h / 2

  return (
    <Marker coordinates={[record.lon, record.lat] as [number, number]}>
      <g
        transform={`translate(${offset[0]}, ${offset[1]})`}
        onMouseEnter={() => onHover(record)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* transparent hit area so onMouseEnter fires (image has pointerEvents:none) */}
        <rect x={-halfW - 3} y={-halfH - 3} width={logoW + 6} height={h + 6} fill="transparent" />
        {!imgFailed ? (
          <image
            href={logoUrl}
            x={-halfW}
            y={-halfH}
            width={logoW}
            height={h}
            onError={() => setImgFailed(true)}
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <>
            <circle r={halfH} fill={color} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={7}
              fontWeight="bold"
              fill="white"
              style={{ pointerEvents: 'none', fontFamily: 'IBM Plex Mono, monospace' }}
            >
              {record.customerKey}
            </text>
          </>
        )}
      </g>
    </Marker>
  )
}
