import { useEffect, useMemo, useState } from "react";
import * as topojson from "topojson-client";
import { geoCentroid, geoCircle, geoPath } from "d3-geo";
import { zoom as d3zoom } from "d3-zoom";
import { select } from "d3-selection";
import {
  ComposableMap as _ComposableMap,
  Geographies,
  Geography,
  Marker,
  useMapContext,
} from "react-simple-maps";
import type { ComposableMapProps } from "react-simple-maps";
import { DcMarker } from "./DcMarker";
import { FlowLayer } from "./FlowLayer";
import type {
  DcRecord,
  FilterState,
  AppSettings,
  FlowRoute,
  FlowSettings,
} from "../types";
import { KNOWN_ORIGINS } from "../types";
import {
  buildStateVolumes,
  buildColorScale,
  getStateColor,
  STATE_NAME_TO_ABBR,
  buildAllStateDetails,
} from "../utils/choropleth";
import { buildFlowRoutes } from "../utils/flows";
import { computeMarkerOffsets } from "../utils/markerLayout";
import type { LandGrid } from "../utils/markerLayout";
import { buildLandGrid } from "../utils/buildLandGrid";
import "./ShipmentsMap.css";

const ComposableMap = _ComposableMap as React.ForwardRefExoticComponent<
  ComposableMapProps & React.RefAttributes<SVGSVGElement>
>;

const GEO_URL = "/data/states-10m.json";
const COUNTRIES_GEO_URL = "/data/countries-110m.json";
const LOWER_48_PROJECTION_CONFIG = {
  center: [0, 38.7] as [number, number],
  rotate: [96, 0, 0] as [number, number, number],
  parallels: [29.5, 45.5] as [number, number],
  scale: 950,
};

interface Props {
  records: DcRecord[];
  filters: FilterState;
  flowSettings: FlowSettings;
  settings: AppSettings;
  svgRef: React.RefObject<SVGSVGElement | null>;
  dataMode: 'b2b' | 'b2c';
  b2cVolumes: Record<string, number>;
}

function OriginRadiusRing({
  fillFeature,
  strokeFeature,
  fillOpacity,
  zoomK,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
}: {
  fillFeature: GeoJSON.Feature<GeoJSON.Polygon>;
  strokeFeature: GeoJSON.Feature<GeoJSON.LineString>;
  fillOpacity: number;
  zoomK: number;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
}) {
  const { projection } = useMapContext();
  const fillD = useMemo(() => {
    const path = geoPath(projection);
    return path(fillFeature) ?? "";
  }, [fillFeature, projection]);
  const strokeD = useMemo(() => {
    const path = geoPath(projection);
    return path(strokeFeature) ?? "";
  }, [projection, strokeFeature]);

  if (!fillD || !strokeD) return null;

  return (
    <g
      className="origin-radius-ring"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      style={{ cursor: onMouseEnter ? "pointer" : "default" }}
    >
      <path
        d={fillD}
        fill={`rgba(95, 126, 166, ${fillOpacity})`}
        stroke="none"
      />
      <path
        d={strokeD}
        fill="none"
        stroke="rgba(95, 126, 166, 0.9)"
        strokeWidth={1.8 / zoomK}
        strokeDasharray="10 8"
        style={{ pointerEvents: "none" }}
      />
    </g>
  );
}

export function ShipmentsMap({
  records,
  filters,
  flowSettings,
  settings,
  svgRef,
  dataMode,
  b2cVolumes,
}: Props) {
  const [tooltip, setTooltip] = useState<DcRecord | null>(null);
  const [hoveredFlowRoute, setHoveredFlowRoute] = useState<FlowRoute | null>(
    null,
  );
  const [hoveredState, setHoveredState] = useState<{
    name: string;
    abbr: string;
  } | null>(null);
  const [hoveredRadiusRing, setHoveredRadiusRing] = useState<boolean>(false);
  const [topoData, setTopoData] = useState<object | null>(null);
  const [countriesTopoData, setCountriesTopoData] = useState<object | null>(
    null,
  );
  const [usLandFeature, setUsLandFeature] = useState<object | null>(null);
  const [landGrid, setLandGrid] = useState<LandGrid | null>(null);
  const [zoomXform, setZoomXform] = useState({ x: 0, y: 0, k: 1 });
  const selectedOrigin = useMemo(
    () =>
      KNOWN_ORIGINS.find((origin) => origin.zip === filters.originZip) ??
      KNOWN_ORIGINS[0],
    [filters.originZip],
  );
  const radiusCenterOrigin = useMemo(
    () =>
      KNOWN_ORIGINS.find((origin) => origin.zip === filters.radiusCenterZip) ??
      selectedOrigin,
    [filters.radiusCenterZip, selectedOrigin],
  );

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const feature = topojson.merge(topo, topo.objects.states.geometries);
        // All three updates batched by React 18 → single re-render
        setTopoData(topo);
        setUsLandFeature(feature);
        setLandGrid(buildLandGrid(feature));
      })
      .catch(() => {
        console.warn("[ShipmentsMap] Failed to fetch TopoJSON");
      });

    fetch(COUNTRIES_GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        setCountriesTopoData(topo);
      })
      .catch(() => {
        console.warn("[ShipmentsMap] Failed to fetch countries TopoJSON");
      });
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const svg = select(svgEl);
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .wheelDelta((event) => {
        const modeFactor =
          event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002;
        const ctrlFactor = event.ctrlKey ? 0.22 : 0.65;
        return -event.deltaY * modeFactor * ctrlFactor;
      })
      .on("zoom", (event) => {
        const { x, y, k } = event.transform;
        setZoomXform({ x, y, k });
      });
    svg.call(zoomBehavior);
    const preventScroll = (e: WheelEvent) => e.preventDefault();
    svgEl.addEventListener("wheel", preventScroll, { passive: false });
    return () => {
      svg.on(".zoom", null);
      svgEl.removeEventListener("wheel", preventScroll);
    };
  }, [svgRef]);

  const excludedRegions = useMemo(() => {
    const s = new Set<string>();
    if (!settings.showAlaska) s.add("Alaska");
    if (!settings.showHawaii) s.add("Hawaii");
    // future: if (!settings.showCanada) s.add('Canada')
    // future: if (!settings.showUK) s.add('United Kingdom')
    return s;
  }, [settings.showAlaska, settings.showHawaii]);

  const choroplethRecords = useMemo(() => {
    if (!filters.showChoropleth) return [];
    if (filters.choroplethCustomers.length === 0) return records;
    return records.filter((r) =>
      filters.choroplethCustomers.includes(r.customerKey),
    );
  }, [records, filters.showChoropleth, filters.choroplethCustomers]);

  const dcRecords = useMemo(() => {
    return records.filter((r) => {
      if (
        filters.dcCustomers.length > 0 &&
        !filters.dcCustomers.includes(r.customerKey)
      )
        return false;
      if (r.pcs2025 < filters.minVolume) return false;
      const dist = r.distances[filters.originZip];
      if (dist != null && dist > filters.maxDistance) return false;
      return true;
    });
  }, [
    records,
    filters.dcCustomers,
    filters.originZip,
    filters.minVolume,
    filters.maxDistance,
  ]);

  const stateDetailsMap = useMemo(
    () => buildAllStateDetails(dcRecords),
    [dcRecords],
  );
  const flowRoutes = useMemo(
    () => buildFlowRoutes(dcRecords, selectedOrigin, flowSettings),
    [dcRecords, selectedOrigin, flowSettings],
  );
  const originRadiusRing = useMemo(() => {
    const radiusDegrees = (filters.radiusMiles / 3958.8) * (180 / Math.PI);
    const ringPolygon = geoCircle()
      .center([radiusCenterOrigin.lon, radiusCenterOrigin.lat])
      .radius(radiusDegrees)();
    const ringCoordinates = ringPolygon.coordinates[0].slice(0, -1);

    return {
      fillFeature: {
        type: "Feature" as const,
        properties: {},
        geometry: ringPolygon,
      },
      strokeFeature: {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: ringCoordinates,
        },
      },
    };
  }, [filters.radiusMiles, radiusCenterOrigin]);
  const markerOffsets = useMemo(
    () =>
      computeMarkerOffsets(
        dcRecords,
        settings.dcLogoScale,
        settings.showZipDots ? settings.zipDotSize : 0,
        usLandFeature,
        landGrid,
      ),
    [
      dcRecords,
      settings.dcLogoScale,
      settings.showZipDots,
      settings.zipDotSize,
      usLandFeature,
      landGrid,
    ],
  );

  const stateVolumes = useMemo(() => {
    if (!filters.showChoropleth) return {};
    if (dataMode === 'b2c') return b2cVolumes;
    return buildStateVolumes(choroplethRecords);
  }, [choroplethRecords, filters.showChoropleth, dataMode, b2cVolumes]);

  const colorScale = useMemo(
    () =>
      filters.showChoropleth
        ? buildColorScale(
            Object.values(stateVolumes).reduce((max, v) => Math.max(max, v), 0),
            settings.choroplethTheme,
          )
        : null,
    [stateVolumes, filters.showChoropleth, settings.choroplethTheme],
  );

  const defaultStateFill = "var(--map-state-default, #e8edf2)";
  const defaultStateHover = "var(--map-state-hover, #d0d8e4)";
  const stateStroke = "var(--map-state-stroke, #808080)";
  const panamaFill =
    filters.showChoropleth && colorScale
      ? getStateColor("", { PA: 0 }, colorScale)
      : defaultStateFill;
  const mapProjection = settings.showPanamaExtent
    ? "geoMercator"
    : filters.showOriginRadiusRing
      ? "geoConicEqualArea"
      : "geoAlbersUsa";
  const mapProjectionConfig = settings.showPanamaExtent
    ? {
        center: [settings.mapCenterLon, settings.mapCenterLat] as [
          number,
          number,
        ],
        scale: settings.mapScale,
      }
    : filters.showOriginRadiusRing
      ? LOWER_48_PROJECTION_CONFIG
      : undefined;

  const { x: zx, y: zy, k: zk } = zoomXform;

  const radiusRingStats = useMemo(() => {
    if (!filters.showOriginRadiusRing || !dcRecords) return null;

    let totalPcs = 0;
    let ringPcs = 0;

    for (const record of dcRecords) {
      if (record.lat == null || record.lon == null) continue;

      totalPcs += record.pcs2025;

      const distance = record.distances[filters.radiusCenterZip] ?? Infinity;
      if (distance <= filters.radiusMiles) {
        ringPcs += record.pcs2025;
      }
    }

    if (totalPcs === 0) return null;

    return {
      pcs: ringPcs,
      percent: ((ringPcs / totalPcs) * 100).toFixed(1),
    };
  }, [
    filters.showOriginRadiusRing,
    filters.radiusCenterZip,
    filters.radiusMiles,
    dcRecords,
  ]);

  return (
    <div className="map-wrap">
      <ComposableMap
        ref={svgRef as React.RefObject<SVGSVGElement>}
        projection={mapProjection}
        projectionConfig={mapProjectionConfig}
        className="shipments-map-svg"
        style={{ width: "100%", height: "100%" }}
      >
        <g
          className="map-viewport"
          transform={`translate(${zx},${zy}) scale(${zk})`}
        >
          {settings.showPanamaExtent && countriesTopoData && (
            <Geographies geography={countriesTopoData}>
              {({ geographies }) =>
                geographies
                  .filter((geo) => {
                    const [lon, lat] = geoCentroid(geo);
                    return lon >= -130 && lon <= -74 && lat >= 7 && lat <= 60;
                  })
                  .map((geo) => {
                    const [lon, lat] = geoCentroid(geo);
                    const isPanama =
                      lon >= -82 && lon <= -77 && lat >= 7 && lat <= 10.5;

                    return (
                      <Geography
                        key={`country-${geo.rsmKey}`}
                        geography={geo}
                        className={
                          isPanama
                            ? "country-geography country-geography--panama"
                            : "country-geography"
                        }
                        style={{
                          default: {
                            fill: isPanama ? panamaFill : "#dce5da",
                            stroke: "#8fa39a",
                            strokeWidth: 0.45 / zk,
                            outline: "none",
                          },
                          hover: {
                            fill: isPanama ? panamaFill : "#dce5da",
                            stroke: "#8fa39a",
                            strokeWidth: 0.45 / zk,
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          )}

          {topoData && (
            <Geographies geography={topoData}>
              {({ geographies }) =>
                geographies
                  .filter(
                    (geo) =>
                      !excludedRegions.has(geo.properties.name as string),
                  )
                  .map((geo) => {
                    const abbr =
                      STATE_NAME_TO_ABBR[geo.properties.name as string];
                    const fill =
                      filters.showChoropleth && colorScale && abbr
                        ? getStateColor(abbr, stateVolumes, colorScale)
                        : defaultStateFill;
                    const hoverFill = filters.showChoropleth
                      ? fill
                      : defaultStateHover;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        className="state-geography"
                        style={{
                          default: {
                            fill,
                            stroke: stateStroke,
                            strokeWidth: 0.5 / zk,
                            outline: "none",
                          },
                          hover: {
                            fill: hoverFill,
                            stroke: stateStroke,
                            strokeWidth: 0.5 / zk,
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={() => {
                          if (abbr && stateDetailsMap[abbr])
                            setHoveredState({
                              name: geo.properties.name as string,
                              abbr,
                            });
                        }}
                        onMouseLeave={() => setHoveredState(null)}
                      />
                    );
                  })
              }
            </Geographies>
          )}

          {dataMode === 'b2b' && filters.showOriginRadiusRing && (
            <OriginRadiusRing
              fillFeature={originRadiusRing.fillFeature}
              strokeFeature={originRadiusRing.strokeFeature}
              fillOpacity={filters.radiusFillOpacity}
              zoomK={zk}
              onMouseEnter={() => setHoveredRadiusRing(true)}
              onMouseLeave={() => setHoveredRadiusRing(false)}
            />
          )}

          {dataMode === 'b2b' && settings.showZipDots &&
            dcRecords
              .filter((r) => r.lat != null && r.lon != null)
              .map((r) => (
                <Marker
                  key={`dot-${r.customerKey}-${r.zip}`}
                  coordinates={[r.lon!, r.lat!]}
                >
                  <circle
                    r={settings.zipDotSize / zk}
                    fill={settings.zipDotColor}
                    stroke="none"
                    style={{ pointerEvents: "none" }}
                  />
                </Marker>
              ))}

          {dataMode === 'b2b' && flowRoutes.length > 0 && (
            <FlowLayer
              routes={flowRoutes}
              arrowStyle={flowSettings.arrowStyle}
              flowOpacity={flowSettings.flowOpacity}
              flowWidthScale={flowSettings.flowWidthScale}
              straightInlandLines={flowSettings.straightInlandLines}
              showLabels={flowSettings.showFlowLabels}
              k={zk}
              onHover={(route) => {
                setHoveredFlowRoute(route);
                if (route) {
                  setTooltip(null);
                  setHoveredState(null);
                }
              }}
            />
          )}

          {dataMode === 'b2b' && settings.showDcMarkers &&
            dcRecords.map((r) => (
              <DcMarker
                key={`${r.customerKey}-${r.zip}`}
                record={r}
                onHover={(record) => {
                  setTooltip(record);
                  if (record) setHoveredFlowRoute(null);
                }}
                offset={markerOffsets.get(`${r.customerKey}-${r.zip}`)}
                logoScale={settings.dcLogoScale}
                logoPadding={settings.logoPadding}
                k={zk}
              />
            ))}
        </g>
      </ComposableMap>

      {hoveredFlowRoute ? (
        <div className="map-tooltip">
          <strong>
            {hoveredFlowRoute.type === "outbound"
              ? "Outbound Flow"
              : "Inbound Flow"}
          </strong>
          <span>
            {hoveredFlowRoute.label ??
              `${hoveredFlowRoute.from.label} → ${hoveredFlowRoute.to.label}`}
          </span>
          {hoveredFlowRoute.type === "outbound" ? (
            <>
              <span>{hoveredFlowRoute.pcs.toLocaleString()} pcs</span>
              <span>
                {hoveredFlowRoute.count} stop
                {hoveredFlowRoute.count !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <span>
              {hoveredFlowRoute.from.label} → {hoveredFlowRoute.to.label}
            </span>
          )}
        </div>
      ) : hoveredRadiusRing && radiusRingStats ? (
        <div className="map-tooltip">
          <strong>{filters.radiusMiles} mi Radius</strong>
          <span>Center: {radiusCenterOrigin.label}</span>
          <div className="tooltip-divider" />
          <span>{radiusRingStats.pcs.toLocaleString()} pcs</span>
          <span>{radiusRingStats.percent}% of total volume</span>
        </div>
      ) : tooltip ? (
        <div className="map-tooltip">
          <strong>{tooltip.customer}</strong>
          <span>
            {tooltip.city}, {tooltip.state}
          </span>
          <span>{tooltip.pcs2025.toLocaleString()} pcs</span>
          <span>
            {tooltip.distances[filters.originZip]?.toLocaleString() ?? "—"} mi
          </span>
        </div>
      ) : (
        hoveredState &&
        stateDetailsMap[hoveredState.abbr] &&
        (() => {
          const sd = stateDetailsMap[hoveredState.abbr];
          const customers = Object.entries(sd.byCustomer).sort(
            (a, b) => b[1].pcs - a[1].pcs,
          );
          return (
            <div className="map-tooltip">
              <strong>
                {hoveredState.name} ({hoveredState.abbr})
              </strong>
              <span>
                {sd.totalPcs.toLocaleString()} pcs · {sd.dcCount} DC
                {sd.dcCount !== 1 ? "s" : ""}
              </span>
              <div className="tooltip-divider" />
              {customers.map(([key, { name, pcs }]) => (
                <div key={key} className="tooltip-row">
                  <span>{name}</span>
                  <span>{pcs.toLocaleString()}</span>
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
