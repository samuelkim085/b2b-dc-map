import type {
  DcRecord,
  FlowDestinationOption,
  FlowNode,
  FlowRoute,
  FlowSettings,
  Origin,
} from "../types";
import { FLOW_MANUAL_DESTINATION_OPTIONS } from "../types";

type ProjectedPoint = { x: number; y: number };
type ProjectionFn = (coordinates: [number, number]) => [number, number] | null;

const COASTAL_CA_NODE: FlowNode = {
  id: "coastalCA",
  label: "Los Angeles Port",
  lat: 33.7361,
  lon: -118.2621,
  kind: "gateway",
};

const RIVERSIDE_CA_NODE: FlowNode = {
  id: "riversideCA",
  label: "Riverside, CA",
  lat: 33.9806,
  lon: -117.3755,
  kind: "gateway",
};

const COASTAL_NJ_NODE: FlowNode = {
  id: "coastalNJ",
  label: "NJ Port (via Panama)",
  lat: 40.6698,
  lon: -74.1169,
  kind: "gateway",
};

const OFF_CANVAS_WEST_NODE: FlowNode = {
  id: "offCanvasWest",
  label: "Pacific Inbound",
  lat: null,
  lon: null,
  kind: "offCanvas",
};

const OFF_CANVAS_EAST_NODE: FlowNode = {
  id: "offCanvasEast",
  label: "Atlantic Inbound (Panama)",
  lat: null,
  lon: null,
  kind: "offCanvas",
};

const MIN_CURVE_AMT = 0.08;
const MAX_CURVE_AMT = 0.2;
const GATEWAY_HIDE_DISTANCE_MILES = 90;

type AggregatedDestination = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  pcs: number;
  count: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function approxDistanceMiles(
  a: Pick<FlowNode, "lat" | "lon"> | Pick<Origin, "lat" | "lon">,
  b: Pick<FlowNode, "lat" | "lon"> | Pick<Origin, "lat" | "lon">,
) {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null)
    return Infinity;
  const latMiles = (b.lat - a.lat) * 69;
  const lonMiles = (b.lon - a.lon) * 54.6;
  return Math.sqrt(latMiles * latMiles + lonMiles * lonMiles);
}

function aggregateDestinations(
  records: DcRecord[],
  originZip: string,
): AggregatedDestination[] {
  const byZip = new Map<string, AggregatedDestination>();

  for (const record of records) {
    if (record.zip === originZip || record.lat == null || record.lon == null)
      continue;

    const existing = byZip.get(record.zip);
    if (existing) {
      existing.pcs += record.pcs2025;
      existing.count += 1;
      continue;
    }

    byZip.set(record.zip, {
      zip: record.zip,
      city: record.city,
      state: record.state,
      lat: record.lat,
      lon: record.lon,
      pcs: record.pcs2025,
      count: 1,
    });
  }

  return [...byZip.values()].sort((a, b) => b.pcs - a.pcs);
}

function buildDestinationNode(
  destination: AggregatedDestination,
  overrideLabel?: string,
): FlowNode {
  return {
    id: destination.zip,
    label: overrideLabel ?? `${destination.city}, ${destination.state}`,
    lat: destination.lat,
    lon: destination.lon,
    kind: "destination",
  };
}

function buildOriginNode(origin: Origin): FlowNode {
  return {
    id: origin.zip,
    label: `${origin.label} (${origin.zip})`,
    lat: origin.lat,
    lon: origin.lon,
    kind: "origin",
  };
}

function getManualPreset(zip: string): FlowDestinationOption | undefined {
  return FLOW_MANUAL_DESTINATION_OPTIONS.find((option) => option.zip === zip);
}

export function resolveCurveSide(
  from: Pick<FlowNode, "lat" | "lon"> | Pick<Origin, "lat" | "lon">,
  to: Pick<FlowNode, "lat" | "lon"> | Pick<Origin, "lat" | "lon">,
): -1 | 1 {
  if (from.lat == null || from.lon == null || to.lat == null || to.lon == null)
    return 1;

  const dx = to.lon - from.lon;
  const dy = to.lat - from.lat;

  if (dy < -0.75) return 1;
  if (dy > 0.75) return dx < 0 ? -1 : 1;
  return dx < 0 ? -1 : 1;
}

export function resolveCurveAmount(
  from: Pick<FlowNode, "lat" | "lon"> | Pick<Origin, "lat" | "lon">,
  to: Pick<FlowNode, "lat" | "lon"> | Pick<Origin, "lat" | "lon">,
  rank = 0,
): number {
  const miles = approxDistanceMiles(from, to);
  const base =
    miles > 1400 ? 0.18 : miles > 900 ? 0.14 : miles > 500 ? 0.11 : 0.09;
  const variation = ((rank % 3) - 1) * 0.015;
  return clamp(base + variation, MIN_CURVE_AMT, MAX_CURVE_AMT);
}

export function selectTopNDestinations(
  records: DcRecord[],
  originZip: string,
  topN: number,
): AggregatedDestination[] {
  return aggregateDestinations(records, originZip).slice(0, topN);
}

export function selectManualDestinations(
  records: DcRecord[],
  originZip: string,
  selectedZips: string[],
): AggregatedDestination[] {
  const byZip = new Map(
    aggregateDestinations(records, originZip).map((destination) => [
      destination.zip,
      destination,
    ]),
  );
  return selectedZips.flatMap((zip) => {
    const destination = byZip.get(zip);
    return destination ? [destination] : [];
  });
}

export function buildOutboundRoutes(
  records: DcRecord[],
  origin: Origin,
  flowSettings: FlowSettings,
): FlowRoute[] {
  const destinations =
    flowSettings.destinationMode === "manual"
      ? selectManualDestinations(
          records,
          origin.zip,
          flowSettings.manualDestinations,
        )
      : selectTopNDestinations(
          records,
          origin.zip,
          flowSettings.topNDestinations,
        );

  const originNode = buildOriginNode(origin);

  return destinations.map((destination, index) => {
    const preset = getManualPreset(destination.zip);
    const toNode = buildDestinationNode(
      destination,
      `${destination.city}, ${destination.state}`,
    );

    return {
      id: `outbound-${origin.zip}-${destination.zip}`,
      type: "outbound",
      from: originNode,
      to: toNode,
      pcs: destination.pcs,
      count: destination.count,
      curveSide: preset?.curveSide ?? resolveCurveSide(originNode, toNode),
      curveAmt:
        preset?.curveAmt ?? resolveCurveAmount(originNode, toNode, index),
      label: `${destination.city}, ${destination.state}`,
    };
  });
}

export function buildInboundRoutes(origin: Origin): FlowRoute[] {
  const originNode = buildOriginNode(origin);

  if (origin.zip === "11050") {
    const routes: FlowRoute[] = [
      {
        id: `inbound-ocean-${origin.zip}`,
        type: "inbound",
        from: OFF_CANVAS_EAST_NODE,
        to: COASTAL_NJ_NODE,
        pcs: 0,
        count: 0,
        label: "Atlantic Inbound (Panama)",
      },
    ];

    if (
      approxDistanceMiles(origin, COASTAL_NJ_NODE) > GATEWAY_HIDE_DISTANCE_MILES
    ) {
      routes.push({
        id: `inbound-domestic-${origin.zip}`,
        type: "inbound",
        from: COASTAL_NJ_NODE,
        to: originNode,
        pcs: 0,
        count: 0,
        curveSide: -1,
        curveAmt: 0.145,
        label: `${COASTAL_NJ_NODE.label} to ${origin.label}`,
      });
    }

    return routes;
  }

  const routes: FlowRoute[] = [
    {
      id: `inbound-ocean-${origin.zip}`,
      type: "inbound",
      from: OFF_CANVAS_WEST_NODE,
      to: COASTAL_CA_NODE,
      pcs: 0,
      count: 0,
      label: "Pacific Inbound",
    },
  ];

  if (
    approxDistanceMiles(origin, RIVERSIDE_CA_NODE) > GATEWAY_HIDE_DISTANCE_MILES
  ) {
    routes.push({
      id: `inbound-domestic-${origin.zip}`,
      type: "inbound",
      from: RIVERSIDE_CA_NODE,
      to: originNode,
      pcs: 0,
      count: 0,
      curveSide: 1,
      curveAmt: 0.145,
      label: `${RIVERSIDE_CA_NODE.label} to ${origin.label}`,
    });
  }

  return routes;
}

export function buildFlowRoutes(
  records: DcRecord[],
  origin: Origin,
  flowSettings: FlowSettings,
): FlowRoute[] {
  if (!flowSettings.showFlows) return [];

  const routes: FlowRoute[] = [];

  if (
    flowSettings.flowDirection === "inbound" ||
    flowSettings.flowDirection === "both"
  ) {
    routes.push(...buildInboundRoutes(origin));
  }

  if (
    flowSettings.flowDirection === "outbound" ||
    flowSettings.flowDirection === "both"
  ) {
    routes.push(...buildOutboundRoutes(records, origin, flowSettings));
  }

  return routes;
}

export function projectFlowNode(
  node: FlowNode,
  projection: ProjectionFn,
): ProjectedPoint | null {
  if (node.lat == null || node.lon == null) return null;
  const projected = projection([node.lon, node.lat]);
  if (!projected) return null;
  return { x: projected[0], y: projected[1] };
}

export function buildFanCurvePath(
  start: ProjectedPoint,
  end: ProjectedPoint,
  curveSide: -1 | 1,
  curveAmt: number,
  controlOffset = 0,
): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.001) return "";

  const clampedAmt = clamp(curveAmt, MIN_CURVE_AMT, MAX_CURVE_AMT);
  const perpX = (-dy / len) * len * clampedAmt * curveSide;
  const perpY = (dx / len) * len * clampedAmt * curveSide;
  const extraPerpX = (-dy / len) * controlOffset;
  const extraPerpY = (dx / len) * controlOffset;

  const cp1X = start.x + dx * 0.33 + perpX * 0.8 + extraPerpX * 0.7;
  const cp1Y = start.y + dy * 0.33 + perpY * 0.8 + extraPerpY * 0.7;
  const cp2X = start.x + dx * 0.66 + perpX + extraPerpX;
  const cp2Y = start.y + dy * 0.66 + perpY + extraPerpY;

  return `M ${start.x} ${start.y} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${end.x} ${end.y}`;
}

export function buildCurvedPath(
  start: ProjectedPoint,
  end: ProjectedPoint,
  curveSide = 1 as -1 | 1,
  curveAmt = 0.12,
  controlOffset = 0,
): string {
  return buildFanCurvePath(start, end, curveSide, curveAmt, controlOffset);
}

export function buildOffCanvasInboundPath(end: ProjectedPoint): string {
  const startX = Math.min(-48, end.x - 220);
  const startY = end.y + 28;
  const cp1X = startX + 110;
  const cp1Y = startY - 34;
  const cp2X = end.x - 92;
  const cp2Y = end.y - 22;

  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${end.x} ${end.y}`;
}

export function getCubicBezierPoint(
  start: ProjectedPoint,
  cp1: ProjectedPoint,
  cp2: ProjectedPoint,
  end: ProjectedPoint,
  t: number,
): ProjectedPoint {
  const mt = 1 - t;
  const x =
    mt * mt * mt * start.x +
    3 * mt * mt * t * cp1.x +
    3 * mt * t * t * cp2.x +
    t * t * t * end.x;
  const y =
    mt * mt * mt * start.y +
    3 * mt * mt * t * cp1.y +
    3 * mt * t * t * cp2.y +
    t * t * t * end.y;
  return { x, y };
}

export function getFanCurveControlPoints(
  start: ProjectedPoint,
  end: ProjectedPoint,
  curveSide: -1 | 1,
  curveAmt: number,
  controlOffset = 0,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len < 0.001) {
    return { cp1: start, cp2: end };
  }

  const clampedAmt = clamp(curveAmt, MIN_CURVE_AMT, MAX_CURVE_AMT);
  const perpX = (-dy / len) * len * clampedAmt * curveSide;
  const perpY = (dx / len) * len * clampedAmt * curveSide;
  const extraPerpX = (-dy / len) * controlOffset;
  const extraPerpY = (dx / len) * controlOffset;

  return {
    cp1: {
      x: start.x + dx * 0.33 + perpX * 0.8 + extraPerpX * 0.7,
      y: start.y + dy * 0.33 + perpY * 0.8 + extraPerpY * 0.7,
    },
    cp2: {
      x: start.x + dx * 0.66 + perpX + extraPerpX,
      y: start.y + dy * 0.66 + perpY + extraPerpY,
    },
  };
}
