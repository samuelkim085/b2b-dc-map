import { useRef, useState, useMemo, useEffect } from "react";
import { useShipmentsData } from "./hooks/useShipmentsData";
import { useSettings } from "./hooks/useSettings";
import { useB2cData } from "./hooks/useB2cData";
import { applyTheme } from "./utils/theme";
import { ShipmentsMap } from "./components/ShipmentsMap";
import { FilterPanel } from "./components/FilterPanel";
import { AppBar } from "./components/AppBar";
import type { FilterState, FlowSettings } from "./types";
import {
  DEFAULT_FLOW_SETTINGS,
  FLOW_MANUAL_DESTINATION_OPTIONS,
  KNOWN_ORIGINS,
} from "./types";
import "./index.css";

export default function App() {
  const { records, loading, error, allCustomers } = useShipmentsData();
  const { settings, setSettings } = useSettings();
  const [dataMode, setDataMode] = useState<'b2b' | 'b2c'>('b2b');
  const { volumes: b2cVolumes, error: b2cError } = useB2cData();
  const [useDefaultDcCustomers, setUseDefaultDcCustomers] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  const [filters, setFilters] = useState<FilterState>(() => ({
    choroplethCustomers: [],
    showChoropleth: true,
    dcCustomers: [],
    originZip: settings.defaultOriginZip,
    minVolume: settings.defaultMinVolume,
    maxDistance: 9999,
    showOriginRadiusRing: false,
    radiusCenterZip: settings.defaultOriginZip,
    radiusMiles: 1000,
    radiusFillOpacity: 0.08,
  }));
  const [flowSettings, setFlowSettings] = useState<FlowSettings>(
    DEFAULT_FLOW_SETTINGS,
  );

  useEffect(() => {
    applyTheme(settings.appTheme);
  }, [settings.appTheme]);

  useEffect(() => {
    if (b2cError) {
      console.warn('[App] Failed to load B2C data:', b2cError);
    }
  }, [b2cError]);

  const defaultDcCustomers = useMemo(
    () =>
      allCustomers.includes("HEB")
        ? allCustomers.filter((customerKey) => customerKey !== "HEB")
        : allCustomers,
    [allCustomers],
  );

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      dcCustomers: useDefaultDcCustomers
        ? defaultDcCustomers
        : filters.dcCustomers,
    }),
    [defaultDcCustomers, filters, useDefaultDcCustomers],
  );

  const handleFiltersChange = (next: FilterState) => {
    if (next.dcCustomers !== effectiveFilters.dcCustomers) {
      setUseDefaultDcCustomers(false);
    }
    setFilters(next);
  };

  const handlePanelResizeStart = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    dragStateRef.current = {
      startX: event.clientX,
      startWidth: settings.filterPanelWidth,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const nextWidth = Math.max(
        180,
        Math.min(
          420,
          dragState.startWidth + (moveEvent.clientX - dragState.startX),
        ),
      );
      setSettings({ filterPanelWidth: nextWidth });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const selectedOrigin =
    KNOWN_ORIGINS.find((o) => o.zip === effectiveFilters.originZip) ??
    KNOWN_ORIGINS[0];
  const maxVolume = useMemo(
    () => records.reduce((max, r) => Math.max(max, r.pcs2025), 0),
    [records],
  );
  const maxDistance = useMemo(() => {
    const vals = records.flatMap((r) => {
      const d = r.distances[effectiveFilters.originZip];
      return d != null ? [d] : [];
    });
    return Math.max(...vals, 2000);
  }, [records, effectiveFilters.originZip]);

  if (loading) return <div className="loading">Loading...</div>;
  if (error)
    return (
      <div className="loading" style={{ color: "var(--bad)" }}>
        Error: {error}
      </div>
    );

  return (
    <div className="app-shell">
      <AppBar
          svgRef={svgRef}
          selectedOrigin={selectedOrigin}
          dataMode={dataMode}
          onDataModeChange={setDataMode}
        />
      <div className="app-body">
        <FilterPanel
          filters={effectiveFilters}
          onChange={handleFiltersChange}
          flowSettings={flowSettings}
          onFlowChange={setFlowSettings}
          settings={settings}
          onSettingsChange={setSettings}
          allCustomers={allCustomers}
          origins={KNOWN_ORIGINS}
          flowDestinationOptions={FLOW_MANUAL_DESTINATION_OPTIONS}
          maxVolume={maxVolume}
          maxDistance={maxDistance}
          panelWidth={settings.filterPanelWidth}
          dataMode={dataMode}
        />
        <div
          className="panel-resizer"
          role="separator"
          aria-label="Resize filter panel"
          aria-orientation="vertical"
          onPointerDown={handlePanelResizeStart}
        />
        <ShipmentsMap
          records={records}
          filters={effectiveFilters}
          flowSettings={flowSettings}
          settings={settings}
          svgRef={svgRef}
          dataMode={dataMode}
          b2cVolumes={b2cVolumes}
        />
      </div>
    </div>
  );
}
