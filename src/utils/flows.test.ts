import { describe, expect, it } from "vitest";
import type { DcRecord, FlowSettings, Origin } from "../types";
import { DEFAULT_FLOW_SETTINGS } from "../types";
import {
  buildFanCurvePath,
  buildFlowRoutes,
  buildInboundRoutes,
  resolveCurveSide,
  selectManualDestinations,
  selectTopNDestinations,
} from "./flows";

const DALLAS: Origin = {
  zip: "75238",
  label: "Dallas, TX",
  lat: 32.8887,
  lon: -96.7073,
};
const ONTARIO: Origin = {
  zip: "91764",
  label: "Ontario, CA",
  lat: 34.0722,
  lon: -117.5867,
};

function makeRecord(
  zip: string,
  city: string,
  state: string,
  pcs2025: number,
  lat: number,
  lon: number,
): DcRecord {
  return {
    customer: "Walmart",
    customerKey: "WM",
    deliveryAddress: "123 Test St",
    city,
    state,
    zip,
    country: "US",
    pcs2025,
    distances: {},
    lat,
    lon,
  };
}

const RECORDS: DcRecord[] = [
  makeRecord("92377", "Rialto", "CA", 75336, 34.1064, -117.3703),
  makeRecord("08036", "Hainesport", "NJ", 61224, 39.9768, -74.8229),
  makeRecord("43228", "Columbus", "OH", 1018096, 39.9609, -83.1375),
  makeRecord("32218", "Jacksonville", "FL", 827706, 30.4784, -81.7165),
  makeRecord("97321", "Albany", "OR", 94152, 44.6225, -123.0951),
  makeRecord("92377", "Rialto", "CA", 1000, 34.1064, -117.3703),
];

describe("flow utilities", () => {
  it("selects top N destination ZIPs by descending pcs", () => {
    const top = selectTopNDestinations(RECORDS, DALLAS.zip, 3);
    expect(top.map((destination) => destination.zip)).toEqual([
      "43228",
      "32218",
      "97321",
    ]);
  });

  it("preserves manual ZIP selection order and skips missing ZIPs", () => {
    const selected = selectManualDestinations(RECORDS, DALLAS.zip, [
      "97321",
      "99999",
      "92377",
    ]);
    expect(selected.map((destination) => destination.zip)).toEqual([
      "97321",
      "92377",
    ]);
  });

  it("builds outbound routes with curve metadata", () => {
    const flowSettings: FlowSettings = {
      ...DEFAULT_FLOW_SETTINGS,
      flowDirection: "outbound",
      destinationMode: "manual",
      manualDestinations: ["92377", "08036"],
    };
    const routes = buildFlowRoutes(RECORDS, DALLAS, flowSettings);
    expect(routes).toHaveLength(2);
    expect(routes.every((route) => route.type === "outbound")).toBe(true);
    expect(routes.every((route) => route.curveSide != null)).toBe(true);
    expect(routes.every((route) => route.curveAmt != null)).toBe(true);
  });

  it("hides the domestic inbound leg when the selected origin is already Ontario", () => {
    const routes = buildInboundRoutes(ONTARIO);
    expect(routes.map((route) => route.id)).toEqual(["inbound-ocean-91764"]);
  });

  it("splits inbound into a coastal touchdown and a Riverside inland leg", () => {
    const routes = buildInboundRoutes(DALLAS);
    expect(routes[0].to.label).toBe("Los Angeles Port");
    expect(routes[1].from.label).toBe("Riverside, CA");
  });

  it("recomputes outbound origins when origin changes", () => {
    const flowSettings: FlowSettings = {
      ...DEFAULT_FLOW_SETTINGS,
      flowDirection: "outbound",
      destinationMode: "topN",
      topNDestinations: 1,
    };
    const fromDallas = buildFlowRoutes(RECORDS, DALLAS, flowSettings);
    const fromOntario = buildFlowRoutes(RECORDS, ONTARIO, flowSettings);
    expect(fromDallas[0].from.id).toBe("75238");
    expect(fromOntario[0].from.id).toBe("91764");
  });

  it("returns an empty path for degenerate fan curves", () => {
    const path = buildFanCurvePath(
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      1,
      0.12,
    );
    expect(path).toBe("");
  });

  it("uses outbound-friendly curve side defaults", () => {
    expect(resolveCurveSide(DALLAS, { lat: 39.9609, lon: -83.1375 })).toBe(1);
    expect(resolveCurveSide(DALLAS, { lat: 34.1064, lon: -117.3703 })).toBe(-1);
  });
});
