import { useMemo } from "react";
import { useMapContext } from "react-simple-maps";
import type { FlowRoute, FlowSettings } from "../types";
import {
  buildCurvedPath,
  buildOffCanvasInboundPath,
  getCubicBezierPoint,
  getFanCurveControlPoints,
  projectFlowNode,
} from "../utils/flows";

interface Props {
  routes: FlowRoute[];
  arrowStyle: FlowSettings["arrowStyle"];
  flowOpacity: number;
  flowWidthScale: number;
  showLabels: boolean;
  onHover: (route: FlowRoute | null) => void;
  k?: number;
}

type RouteGeometry = {
  route: FlowRoute;
  d: string;
  labelX?: number;
  labelY?: number;
};

type ProjectedRoute = {
  route: FlowRoute;
  rawTo: { x: number; y: number };
  rawFrom?: { x: number; y: number };
};

const STYLE_PRESETS = {
  clean: {
    outboundColor: "#6481a2",
    inboundColor: "#5b6876",
    oceanColor: "#95a1ae",
    minWidth: 1.2,
    maxWidth: 2.9,
    arrowScale: 0.8,
  },
  bold: {
    outboundColor: "#58779b",
    inboundColor: "#44576d",
    oceanColor: "#8693a0",
    minWidth: 1.45,
    maxWidth: 3.45,
    arrowScale: 0.9,
  },
  presentation: {
    outboundColor: "#5f7ea6",
    inboundColor: "#4b5d71",
    oceanColor: "#9ba6b2",
    minWidth: 1.35,
    maxWidth: 3.2,
    arrowScale: 0.84,
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getUnitVector(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return { ux: 0, uy: 0, nx: 0, ny: 0 };
  const ux = dx / len;
  const uy = dy / len;
  return { ux, uy, nx: -uy, ny: ux };
}

export function FlowLayer({
  routes,
  arrowStyle,
  flowOpacity,
  flowWidthScale,
  showLabels,
  onHover,
  k = 1,
}: Props) {
  const { projection } = useMapContext();
  const stylePreset = STYLE_PRESETS[arrowStyle];

  const geometries = useMemo(() => {
    const projected = routes.flatMap<ProjectedRoute>((route) => {
      const rawTo = projectFlowNode(route.to, projection);
      if (!rawTo) return [];

      if (route.from.kind === "offCanvas") {
        return [
          {
            route,
            rawTo,
          },
        ];
      }

      const rawFrom = projectFlowNode(route.from, projection);
      if (!rawFrom) return [];

      return [{ route, rawFrom, rawTo }];
    });

    const outboundSorted = projected
      .filter(
        (item) => item.route.type === "outbound" && item.rawFrom && item.rawTo,
      )
      .sort((a, b) => {
        const ay = a.rawTo!.y - a.rawFrom!.y;
        const by = b.rawTo!.y - b.rawFrom!.y;
        return ay - by;
      });

    const outboundLaneById = new Map<string, number>();
    const centerIndex = (outboundSorted.length - 1) / 2;
    outboundSorted.forEach((item, index) => {
      outboundLaneById.set(item.route.id, index - centerIndex);
    });

    return projected.flatMap<RouteGeometry>((item) => {
      const { route, rawTo } = item;

      if (route.from.kind === "offCanvas") {
        return [
          {
            route,
            d: buildOffCanvasInboundPath(rawTo),
            labelX: rawTo.x - 52,
            labelY: rawTo.y - 18,
          },
        ];
      }

      const rawFrom = item.rawFrom;
      if (!rawFrom) return [];

      const lane = outboundLaneById.get(route.id) ?? 0;
      const laneSpread = route.type === "outbound" ? lane * 7.5 : 0;
      const { ux, uy, nx, ny } = getUnitVector(rawFrom, rawTo);
      const startPad = route.type === "outbound" ? 10 : 8;
      const endPad = route.type === "outbound" ? 24 : 14;

      const from = {
        x: rawFrom.x + ux * startPad + nx * laneSpread,
        y: rawFrom.y + uy * startPad + ny * laneSpread,
      };
      const to = {
        x: rawTo.x - ux * endPad + nx * laneSpread * 0.18,
        y: rawTo.y - uy * endPad + ny * laneSpread * 0.18,
      };

      const curveSide = route.curveSide ?? 1;
      const baseCurveAmt = route.curveAmt ?? 0.12;
      const curveAmt =
        route.type === "outbound"
          ? clamp(baseCurveAmt + Math.abs(lane) * 0.014, 0.08, 0.22)
          : baseCurveAmt;
      const d = buildCurvedPath(from, to, curveSide, curveAmt);
      if (!d) return [];

      const { cp1, cp2 } = getFanCurveControlPoints(
        from,
        to,
        curveSide,
        curveAmt,
      );
      const labelPoint = getCubicBezierPoint(
        from,
        cp1,
        cp2,
        to,
        route.type === "outbound" ? 0.58 : 0.55,
      );

      return [
        {
          route,
          d,
          labelX: labelPoint.x,
          labelY: labelPoint.y,
        },
      ];
    });
  }, [projection, routes]);

  const maxOutboundPcs = useMemo(
    () =>
      Math.max(
        ...routes
          .filter((route) => route.type === "outbound")
          .map((route) => route.pcs),
        0,
      ),
    [routes],
  );

  const getStrokeWidth = (route: FlowRoute) => {
    if (route.type === "inbound") {
      const inboundBase = route.from.kind === "offCanvas" ? 1.35 : 1.7;
      return clamp(inboundBase * flowWidthScale, 1, 3.8);
    }

    const normalized =
      maxOutboundPcs > 0
        ? Math.log1p(route.pcs) / Math.log1p(maxOutboundPcs)
        : 0.5;
    const width =
      stylePreset.minWidth +
      (stylePreset.maxWidth - stylePreset.minWidth) * normalized;

    return clamp(width * flowWidthScale, 1.1, 4.8);
  };

  const getStrokeColor = (route: FlowRoute) => {
    if (route.type === "outbound") return stylePreset.outboundColor;
    return route.from.kind === "offCanvas"
      ? stylePreset.oceanColor
      : stylePreset.inboundColor;
  };

  const outboundMarkerId = `flow-arrow-outbound-${arrowStyle}`;
  const inboundMarkerId = `flow-arrow-inbound-${arrowStyle}`;

  return (
    <g className="flow-layer">
      <defs>
        <marker
          id={outboundMarkerId}
          markerWidth={9 * stylePreset.arrowScale}
          markerHeight={7 * stylePreset.arrowScale}
          refX={8 * stylePreset.arrowScale}
          refY={3.5 * stylePreset.arrowScale}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 9 3.5 L 0 7 z" fill={stylePreset.outboundColor} />
        </marker>
        <marker
          id={inboundMarkerId}
          markerWidth={7 * stylePreset.arrowScale}
          markerHeight={5 * stylePreset.arrowScale}
          refX={6.1 * stylePreset.arrowScale}
          refY={2.5 * stylePreset.arrowScale}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M 0 0 L 7 2.5 L 0 5 z" fill={stylePreset.inboundColor} />
        </marker>
      </defs>

      {geometries.map(({ route, d, labelX, labelY }) => {
        const strokeWidth = getStrokeWidth(route);
        const markerId =
          route.type === "outbound" ? outboundMarkerId : inboundMarkerId;
        const opacity =
          route.type === "outbound"
            ? flowOpacity * 0.88
            : route.from.kind === "offCanvas"
              ? flowOpacity * 0.5
              : flowOpacity * 0.62;

        return (
          <g key={route.id}>
            <path
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.82)"
              strokeWidth={(strokeWidth + 1.1) / k}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
            <path
              d={d}
              fill="none"
              stroke={getStrokeColor(route)}
              strokeWidth={strokeWidth / k}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={
                route.from.kind === "offCanvas" ? "7 6" : undefined
              }
              markerEnd={
                route.from.kind === "offCanvas"
                  ? undefined
                  : `url(#${markerId})`
              }
              opacity={opacity}
              className="flow-path"
              onMouseEnter={() => onHover(route)}
              onMouseLeave={() => onHover(null)}
            />
            {showLabels &&
              route.label &&
              labelX != null &&
              labelY != null &&
              route.type === "outbound" && (
                <text
                  x={labelX}
                  y={labelY}
                  className="flow-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9 / k}
                  style={{ pointerEvents: "none" }}
                >
                  {route.label}
                </text>
              )}
          </g>
        );
      })}
    </g>
  );
}
