import { Marker } from 'react-simple-maps'
import type { DcRecord } from '../types'
import { CUSTOMER_COLORS, CUSTOMER_DOMAINS } from '../types'

interface Props {
  record: DcRecord
  /** TODO: use for distance circle scaling or arc visualization in future */
  selectedOriginZip: string
  onHover: (record: DcRecord | null) => void
  failedDomains: Set<string>
  onDomainError: (domain: string) => void
}

const LOGO_SIZE = 20

export function DcMarker({ record, selectedOriginZip: _selectedOriginZip, onHover, failedDomains, onDomainError }: Props) {
  if (record.lat == null || record.lon == null) return null

  const color = CUSTOMER_COLORS[record.customerKey] ?? '#888888'
  const domain = CUSTOMER_DOMAINS[record.customerKey]
  const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null
  const imgFailed = domain ? failedDomains.has(domain) : true
  const half = LOGO_SIZE / 2

  return (
    <Marker coordinates={[record.lon, record.lat] as [number, number]}>
      <g
        onMouseEnter={() => onHover(record)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: 'pointer' }}
      >
        {/* white background circle */}
        <circle r={half + 2} fill="white" stroke={color} strokeWidth={1.5} />

        {logoUrl && !imgFailed ? (
          <image
            href={logoUrl}
            x={-half}
            y={-half}
            width={LOGO_SIZE}
            height={LOGO_SIZE}
            onError={() => domain && onDomainError(domain)}
          />
        ) : (
          <>
            <circle r={half} fill={color} />
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
