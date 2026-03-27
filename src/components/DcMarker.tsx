import { useState } from "react";
import { Marker } from "react-simple-maps";
import type { DcRecord } from "../types";
import { CUSTOMER_COLORS } from "../types";
import { LOGO_SCALE, LOGO_HEIGHT_BASE, LOGO_ASPECT } from "../utils/logoConfig";

interface Props {
  record: DcRecord;
  onHover: (record: DcRecord | null) => void;
  offset?: [number, number];
  logoScale?: number; // multiplier on top of LOGO_SCALE constant, default 1.0
  logoPadding?: number; // px padding on each side of the hit area rect, default 2
  k?: number;
}

export function DcMarker({
  record,
  onHover,
  offset = [0, 0],
  logoScale = 1.0,
  logoPadding = 2,
  k = 1,
}: Props) {
  const [imgFailed, setImgFailed] = useState(false);

  if (record.lat == null || record.lon == null) return null;

  const color = CUSTOMER_COLORS[record.customerKey] ?? "#888888";
  const logoUrl = `/img/${record.customerKey}.png`;
  const h =
    (LOGO_HEIGHT_BASE[record.customerKey] ?? 20) * LOGO_SCALE * logoScale;
  const aspect = LOGO_ASPECT[record.customerKey] ?? 1.5;
  const logoW = h * aspect;
  const halfW = logoW / 2;
  const halfH = h / 2;

  return (
    <Marker coordinates={[record.lon, record.lat] as [number, number]}>
      <g
        className="dc-marker"
        data-customer-key={record.customerKey}
        data-zip={record.zip}
        transform={`translate(${offset[0] / k}, ${offset[1] / k}) scale(${1 / k})`}
        onMouseEnter={() => onHover(record)}
        onMouseLeave={() => onHover(null)}
        style={{ cursor: "pointer" }}
      >
        {/* transparent hit area so onMouseEnter fires (image has pointerEvents:none) */}
        <rect
          x={-halfW - logoPadding}
          y={-halfH - logoPadding}
          width={logoW + logoPadding * 2}
          height={h + logoPadding * 2}
          fill="transparent"
        />
        {!imgFailed ? (
          <image
            href={logoUrl}
            x={-halfW}
            y={-halfH}
            width={logoW}
            height={h}
            onError={() => setImgFailed(true)}
            style={{ pointerEvents: "none" }}
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
              style={{
                pointerEvents: "none",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            >
              {record.customerKey}
            </text>
          </>
        )}
      </g>
    </Marker>
  );
}
