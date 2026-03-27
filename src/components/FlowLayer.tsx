import { useMemo } from "react";
import { useMapContext } from "react-simple-maps";
import type { FlowRoute, FlowSettings } from "../types";
import {
  buildCurvedPath,
  getCubicBezierPoint,
  getFanCurveControlPoints,
  projectFlowNode,
} from "../utils/flows";

interface Props {
  routes: FlowRoute[];
  arrowStyle: FlowSettings["arrowStyle"];
  flowOpacity: number;
  flowWidthScale: number;
  straightInlandLines: boolean;
  showLabels: boolean;
  onHover: (route: FlowRoute | null) => void;
  k?: number;
}

type RouteGeometry = {
  route: FlowRoute;
  kind: "line" | "cubic";
  start: { x: number; y: number };
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
  arrowFrom: { x: number; y: number };
  arrowTip: { x: number; y: number };
  labelX?: number;
  labelY?: number;
};

type ProjectedRoute = {
  route: FlowRoute;
  rawTo: { x: number; y: number };
  rawFrom?: { x: number; y: number };
};

type HubPoint = {
  x: number;
  y: number;
};

const STYLE_PRESETS = {
  clean: {
    outboundColor: "#6481a2",
    inboundColor: "#7f90a3",
    minWidth: 1.2,
    maxWidth: 2.9,
    arrowScale: 0.8,
  },
  bold: {
    outboundColor: "#58779b",
    inboundColor: "#77889b",
    minWidth: 1.45,
    maxWidth: 3.45,
    arrowScale: 0.9,
  },
  presentation: {
    outboundColor: "#5f7ea6",
    inboundColor: "#73879d",
    minWidth: 1.35,
    maxWidth: 3.2,
    arrowScale: 0.84,
  },
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function withAlpha(hex: string, alpha: number) {
  const normalized = clamp(alpha, 0, 1);
  const value = hex.replace("#", "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : value;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${normalized})`;
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

function getOffCanvasCurve(
  end: { x: number; y: number },
  isEast: boolean = false,
  projection?: any,
) {
  if (isEast) {
    let panamaX = end.x;
    let panamaY = end.y + 300;

    if (projection) {
      const p = projection([-79.92, 9.14]);
      if (p) {
        panamaX = p[0];
        panamaY = p[1];
      }
    }

    const start = {
      x: -50,
      y: panamaY - 50,
    };
    const cp1 = {
      x: panamaX - 80,
      y: panamaY + 250,
    };
    const cp2 = {
      x: panamaX + 180,
      y: panamaY + 100,
    };

    return {
      start,
      cp1,
      cp2,
    };
  }

  const start = {
    x: Math.min(-48, end.x - 220),
    y: end.y + 28,
  };
  const cp1 = {
    x: start.x + 110,
    y: start.y - 34,
  };
  const cp2 = {
    x: end.x - 92,
    y: end.y - 22,
  };

  return {
    start,
    cp1,
    cp2,
  };
}

function buildArrowPolygonPoints(
  from: { x: number; y: number },
  tip: { x: number; y: number },
  headLength: number,
  headWidth: number,
) {
  const { ux, uy, nx, ny } = getUnitVector(from, tip);
  const baseCenter = {
    x: tip.x - ux * headLength,
    y: tip.y - uy * headLength,
  };
  const left = {
    x: baseCenter.x + nx * (headWidth / 2),
    y: baseCenter.y + ny * (headWidth / 2),
  };
  const right = {
    x: baseCenter.x - nx * (headWidth / 2),
    y: baseCenter.y - ny * (headWidth / 2),
  };

  return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`;
}

function getArrowBaseCenter(
  from: { x: number; y: number },
  tip: { x: number; y: number },
  headLength: number,
) {
  const { ux, uy } = getUnitVector(from, tip);
  return {
    x: tip.x - ux * headLength,
    y: tip.y - uy * headLength,
  };
}

function buildStrokePath(
  geometry: RouteGeometry,
  shaftTip: { x: number; y: number },
) {
  if (geometry.kind === "line") {
    return `M ${geometry.start.x} ${geometry.start.y} L ${shaftTip.x} ${shaftTip.y}`;
  }

  return `M ${geometry.start.x} ${geometry.start.y} C ${geometry.cp1!.x} ${geometry.cp1!.y}, ${geometry.cp2!.x} ${geometry.cp2!.y}, ${shaftTip.x} ${shaftTip.y}`;
}

export function FlowLayer({
  routes,
  arrowStyle,
  flowOpacity,
  flowWidthScale,
  straightInlandLines,
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
        const isEast = route.from.id === "offCanvasEast";
        const { start, cp1, cp2 } = getOffCanvasCurve(
          rawTo,
          isEast,
          projection,
        );

        let labelX = rawTo.x - 52;
        let labelY = rawTo.y - 18;

        if (isEast) {
          const p = projection([-79.92, 9.14]);
          labelX = p ? p[0] + 20 : rawTo.x + 20;
          labelY = p ? p[1] + 20 : rawTo.y + 20;
        }

        return [
          {
            route,
            kind: "cubic",
            start,
            cp1,
            cp2,
            arrowFrom: cp2,
            arrowTip: rawTo,
            labelX,
            labelY,
          },
        ];
      }

      const rawFrom = item.rawFrom;
      if (!rawFrom) return [];

      const lane = outboundLaneById.get(route.id) ?? 0;
      const controlOffset = route.type === "outbound" ? lane * 10 : 0;
      const { ux, uy } = getUnitVector(rawFrom, rawTo);
      const startPad = route.type === "outbound" ? 0 : 0;
      const endPad = route.type === "outbound" ? 24 : 0;

      const from = {
        x: rawFrom.x + ux * startPad,
        y: rawFrom.y + uy * startPad,
      };
      const to = {
        x: rawTo.x - ux * endPad,
        y: rawTo.y - uy * endPad,
      };
      const isStraightInland = straightInlandLines;

      if (isStraightInland) {
        const labelPoint = {
          x: from.x + (to.x - from.x) * 0.55,
          y: from.y + (to.y - from.y) * 0.55,
        };

        return [
          {
            route,
            kind: "line",
            start: from,
            arrowFrom: from,
            arrowTip: to,
            labelX: labelPoint.x,
            labelY: labelPoint.y,
          },
        ];
      }

      const curveSide = route.curveSide ?? 1;
      const baseCurveAmt = route.curveAmt ?? 0.12;
      const curveAmt =
        route.type === "outbound"
          ? clamp(baseCurveAmt + Math.abs(lane) * 0.014, 0.08, 0.22)
          : baseCurveAmt;
      const d = buildCurvedPath(from, to, curveSide, curveAmt, controlOffset);
      if (!d) return [];

      const { cp1, cp2 } = getFanCurveControlPoints(
        from,
        to,
        curveSide,
        curveAmt,
        controlOffset,
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
          kind: "cubic",
          start: from,
          cp1,
          cp2,
          arrowFrom: cp2,
          arrowTip: to,
          labelX: labelPoint.x,
          labelY: labelPoint.y,
        },
      ];
    });
  }, [projection, routes, straightInlandLines]);

  const hubPoint = useMemo<HubPoint | null>(() => {
    for (const route of routes) {
      if (route.from.kind === "origin") {
        const projected = projectFlowNode(route.from, projection);
        if (projected) return projected;
      }
      if (route.to.kind === "origin") {
        const projected = projectFlowNode(route.to, projection);
        if (projected) return projected;
      }
    }
    return null;
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
      return clamp(5.4 * flowWidthScale, 1, 6.5);
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
    return stylePreset.inboundColor;
  };

  const outboundOpacity = flowOpacity * 0.88;
  const inboundOpacity = flowOpacity * 0.72;

  return (
    <g className="flow-layer">
      {geometries.map((geometry) => {
        const { route, arrowFrom, arrowTip, labelX, labelY } = geometry;
        const strokeWidth = getStrokeWidth(route);
        const opacity =
          route.type === "outbound" ? outboundOpacity : inboundOpacity;
        const strokeColor = getStrokeColor(route);
        const routePaint = withAlpha(strokeColor, opacity);
        const headLength =
          ((route.type === "outbound" ? 18 : 30) * stylePreset.arrowScale) / k;
        const headWidth =
          ((route.type === "outbound" ? 14 : 22) * stylePreset.arrowScale) / k;
        const arrowPoints = buildArrowPolygonPoints(
          arrowFrom,
          arrowTip,
          headLength,
          headWidth,
        );
        const shaftTip = getArrowBaseCenter(
          arrowFrom,
          arrowTip,
          headLength - 0.25 / k,
        );
        const strokeD = buildStrokePath(geometry, shaftTip);

        return (
          <g
            key={route.id}
            className={`flow-route flow-route--${route.type}`}
            data-route-id={route.id}
            data-route-type={route.type}
          >
            <path
              d={strokeD}
              fill="none"
              stroke={routePaint}
              strokeWidth={strokeWidth / k}
              strokeLinecap="butt"
              strokeLinejoin="round"
              strokeDasharray={route.type === "inbound" ? "12 8" : undefined}
              className="flow-path"
              onMouseEnter={() => onHover(route)}
              onMouseLeave={() => onHover(null)}
            />
            <polygon
              points={arrowPoints}
              fill={routePaint}
              stroke={routePaint}
              strokeWidth={0.4 / k}
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
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
      {hubPoint && (
        <g className="flow-hub-marker" style={{ pointerEvents: "none" }}>
          <circle
            cx={hubPoint.x}
            cy={hubPoint.y}
            r={6 / k}
            fill={stylePreset.outboundColor}
            stroke="rgba(255,255,255,0.98)"
            strokeWidth={1.5 / k}
          />
        </g>
      )}
    </g>
  );
}
