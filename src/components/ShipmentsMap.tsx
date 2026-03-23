import { useEffect, useMemo, useState } from "react";
import * as topojson from "topojson-client";
import { zoom as d3zoom } from 'd3-zoom'
import { select } from 'd3-selection'
import {
  ComposableMap as _ComposableMap,
  Geographies,
  Geography,
  Marker,
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

interface Props {
  records: DcRecord[];
  filters: FilterState;
  flowSettings: FlowSettings;
  settings: AppSettings;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function ShipmentsMap({
  records,
  filters,
  flowSettings,
  settings,
  svgRef,
}: Props) {
  const [tooltip, setTooltip] = useState<DcRecord | null>(null);
  const [hoveredFlowRoute, setHoveredFlowRoute] = useState<FlowRoute | null>(
    null,
  );
  const [hoveredState, setHoveredState] = useState<{
    name: string;
    abbr: string;
  } | null>(null);
  const [topoData, setTopoData] = useState<object | null>(null);
  const [usLandFeature, setUsLandFeature] = useState<object | null>(null);
  const [landGrid, setLandGrid] = useState<LandGrid | null>(null);
  const [zoomXform, setZoomXform] = useState({ x: 0, y: 0, k: 1 })
  const selectedOrigin = useMemo(
    () =>
      KNOWN_ORIGINS.find((origin) => origin.zip === filters.originZip) ??
      KNOWN_ORIGINS[0],
    [filters.originZip],
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
  }, []);

  useEffect(() => {
    if (!svgRef.current) return
    const svgEl = svgRef.current
    const svg = select(svgEl)
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        const { x, y, k } = event.transform
        setZoomXform({ x, y, k })
      })
    svg.call(zoomBehavior)
    const preventScroll = (e: WheelEvent) => e.preventDefault()
    svgEl.addEventListener('wheel', preventScroll, { passive: false })
    return () => {
      svg.on('.zoom', null)
      svgEl.removeEventListener('wheel', preventScroll)
    }
  }, [svgRef])

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

  const stateVolumes = useMemo(
    () => (filters.showChoropleth ? buildStateVolumes(choroplethRecords) : {}),
    [choroplethRecords, filters.showChoropleth],
  );

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

  const { x: zx, y: zy, k: zk } = zoomXform;

  return (
    <div className="map-wrap">
      <ComposableMap
        ref={svgRef as React.RefObject<SVGSVGElement>}
        projection="geoAlbersUsa"
        style={{ width: "100%", height: "100%" }}
      >
        <g transform={`translate(${zx},${zy}) scale(${zk})`}>
          {topoData && (
            <Geographies geography={topoData}>
              {({ geographies }) =>
                geographies
                  .filter(
                    (geo) => !excludedRegions.has(geo.properties.name as string),
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

          {settings.showZipDots &&
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

          {flowRoutes.length > 0 && (
            <FlowLayer
              routes={flowRoutes}
              arrowStyle={flowSettings.arrowStyle}
              flowOpacity={flowSettings.flowOpacity}
              flowWidthScale={flowSettings.flowWidthScale}
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

          {settings.showDcMarkers &&
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
