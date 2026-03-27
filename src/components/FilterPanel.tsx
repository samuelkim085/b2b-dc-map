import { useEffect, useState } from "react";
import { CustomerDropdown } from "./CustomerDropdown";
import type {
  AppSettings,
  FilterState,
  FlowDestinationOption,
  FlowSettings,
  Origin,
} from "../types";
import "./FilterPanel.css";

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  flowSettings: FlowSettings;
  onFlowChange: (settings: FlowSettings) => void;
  settings: AppSettings;
  onSettingsChange: (update: Partial<AppSettings>) => void;
  allCustomers: string[];
  origins: Origin[];
  flowDestinationOptions: FlowDestinationOption[];
  maxVolume: number;
  maxDistance: number;
  panelWidth: number;
  dataMode: 'b2b' | 'b2c';
}

type SectionKey =
  | "qtyByState"
  | "dcLocations"
  | "radiusRing"
  | "flowLayer"
  | "b2cLayers"
  | "appearance"
  | "mapView"
  | "markerStyle"
  | "defaults";

type SectionState = Record<SectionKey, boolean>;

const SECTION_STORAGE_KEY = "b2b-dc-map-panel-sections";

const DEFAULT_SECTION_STATE: SectionState = {
  qtyByState: true,
  dcLocations: true,
  radiusRing: false,
  flowLayer: true,
  b2cLayers: true,
  appearance: false,
  mapView: false,
  markerStyle: false,
  defaults: false,
};

const THEMES: {
  value: AppSettings["appTheme"];
  label: string;
  desc: string;
}[] = [
  { value: "bloomberg", label: "Bloomberg", desc: "Amber on black" },
  { value: "dark", label: "Dark", desc: "Navy dark, blue accent" },
  { value: "light", label: "Light", desc: "Clean white" },
];

const CHOROPLETH_THEMES: {
  value: AppSettings["choroplethTheme"];
  label: string;
}[] = [
  { value: "greys", label: "Grey" },
  { value: "greens", label: "Green" },
];

function loadSectionState(): SectionState {
  try {
    const raw = localStorage.getItem(SECTION_STORAGE_KEY);
    if (!raw) return DEFAULT_SECTION_STATE;
    return { ...DEFAULT_SECTION_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SECTION_STATE;
  }
}

function NumberInput({
  value,
  min,
  max,
  step,
  disabled,
  ariaLabel,
  unit,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  ariaLabel: string;
  unit: string;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!isNaN(n)) {
      onCommit(Math.max(min, Math.min(max, n)));
    } else {
      setDraft(String(value));
    }
  };

  return (
    <div className="number-input-wrap">
      <input
        type="number"
        className="filter-number"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      <span className="number-unit">{unit}</span>
    </div>
  );
}

function PanelSection({
  title,
  sectionKey,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  sectionKey: SectionKey;
  isOpen: boolean;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel-section${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="panel-section-toggle"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={isOpen}
      >
        <span className="panel-section-title">{title}</span>
        <span
          className={`panel-section-chevron${isOpen ? " is-open" : ""}`}
          aria-hidden="true"
        >
          &gt;
        </span>
      </button>
      {isOpen && <div className="panel-section-body">{children}</div>}
    </section>
  );
}

export function FilterPanel({
  filters,
  onChange,
  flowSettings,
  onFlowChange,
  settings,
  onSettingsChange,
  allCustomers,
  origins,
  flowDestinationOptions,
  maxVolume,
  maxDistance,
  panelWidth,
  dataMode,
}: Props) {
  const [sectionState, setSectionState] = useState<SectionState>(loadSectionState);

  useEffect(() => {
    try {
      localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(sectionState));
    } catch {
      console.warn("[FilterPanel] Failed to persist panel sections");
    }
  }, [sectionState]);

  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val });
  const setFlow = <K extends keyof FlowSettings>(
    key: K,
    val: FlowSettings[K],
  ) => onFlowChange({ ...flowSettings, [key]: val });
  const setApp = <K extends keyof AppSettings>(
    key: K,
    val: AppSettings[K],
  ) => onSettingsChange({ [key]: val });

  const toggleSection = (key: SectionKey) => {
    setSectionState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clampedDistance = Math.min(filters.maxDistance, maxDistance);
  const toggleManualDestination = (zip: string) => {
    const manualDestinations = flowSettings.manualDestinations.includes(zip)
      ? flowSettings.manualDestinations.filter(
          (selectedZip) => selectedZip !== zip,
        )
      : [...flowSettings.manualDestinations, zip];
    setFlow("manualDestinations", manualDestinations);
  };

  return (
    <aside className="filter-panel" style={{ width: `${panelWidth}px` }}>
      <h2 className="panel-title">CONTROLS</h2>

      <PanelSection
        title="Qty By State"
        sectionKey="qtyByState"
        isOpen={sectionState.qtyByState}
        onToggle={toggleSection}
      >
        <div className="filter-group">
          <span className="filter-label">MAP STYLE</span>
          <div className="radio-group" role="radiogroup" aria-label="Map style">
            {(["Plain", "Choropleth"] as const).map((style) => (
              <label key={style} className="radio-label">
                <input
                  type="radio"
                  name="mapStyle"
                  value={style}
                  checked={filters.showChoropleth === (style === "Choropleth")}
                  onChange={() =>
                    set("showChoropleth", style === "Choropleth")
                  }
                />
                {style}
              </label>
            ))}
          </div>
        </div>

        {dataMode === 'b2b' && (
          <CustomerDropdown
            allCustomers={allCustomers}
            selected={filters.choroplethCustomers}
            onChange={(v) => set("choroplethCustomers", v)}
            label="QTY CUSTOMER"
          />
        )}
      </PanelSection>

      {dataMode === 'b2b' && <PanelSection
        title="DC Locations"
        sectionKey="dcLocations"
        isOpen={sectionState.dcLocations}
        onToggle={toggleSection}
      >
        <CustomerDropdown
          allCustomers={allCustomers}
          selected={filters.dcCustomers}
          onChange={(v) => set("dcCustomers", v)}
          label="DC CUSTOMER"
        />

        <div className="filter-group">
          <label className="filter-label" htmlFor="origin-select">
            ORIGIN
          </label>
          <select
            id="origin-select"
            className="filter-select"
            value={filters.originZip}
            onChange={(e) => set("originZip", e.target.value)}
          >
            {origins.map((o) => (
              <option key={o.zip} value={o.zip}>
                {o.label} ({o.zip})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="volume-slider">
            MIN VOLUME
          </label>
          <input
            id="volume-slider"
            type="range"
            className="filter-slider"
            min={0}
            max={maxVolume}
            step={1000}
            value={filters.minVolume}
            disabled={maxVolume === 0}
            onChange={(e) => {
              if (maxVolume > 0) set("minVolume", Number(e.target.value));
            }}
          />
          <NumberInput
            value={filters.minVolume}
            min={0}
            max={maxVolume}
            step={1000}
            disabled={maxVolume === 0}
            ariaLabel="Minimum volume in pieces"
            unit="pcs"
            onCommit={(v) => set("minVolume", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="distance-slider">
            MAX DISTANCE
          </label>
          <input
            id="distance-slider"
            type="range"
            className="filter-slider"
            min={0}
            max={maxDistance}
            step={50}
            value={clampedDistance}
            onChange={(e) => set("maxDistance", Number(e.target.value))}
          />
          <NumberInput
            value={clampedDistance}
            min={0}
            max={maxDistance}
            step={50}
            ariaLabel="Maximum distance in miles"
            unit={clampedDistance >= maxDistance ? "mi (all)" : "mi"}
            onCommit={(v) => set("maxDistance", v)}
          />
        </div>
      </PanelSection>}

      {dataMode === 'b2b' && <PanelSection
        title="Radius Ring"
        sectionKey="radiusRing"
        isOpen={sectionState.radiusRing}
        onToggle={toggleSection}
      >
        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showOriginRadiusRing}
              onChange={(e) => set("showOriginRadiusRing", e.target.checked)}
            />
            <span>Show radius ring</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="radius-center-select">
            RING CENTER
          </label>
          <select
            id="radius-center-select"
            className="filter-select"
            value={filters.radiusCenterZip}
            disabled={!filters.showOriginRadiusRing}
            onChange={(e) => set("radiusCenterZip", e.target.value)}
          >
            {origins.map((o) => (
              <option key={`radius-${o.zip}`} value={o.zip}>
                {o.label} ({o.zip})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="radius-miles-slider">
            RING RADIUS
          </label>
          <input
            id="radius-miles-slider"
            type="range"
            className="filter-slider"
            min={100}
            max={2500}
            step={50}
            value={filters.radiusMiles}
            disabled={!filters.showOriginRadiusRing}
            onChange={(e) => set("radiusMiles", Number(e.target.value))}
          />
          <NumberInput
            value={filters.radiusMiles}
            min={100}
            max={2500}
            step={50}
            disabled={!filters.showOriginRadiusRing}
            ariaLabel="Origin radius miles"
            unit="mi"
            onCommit={(v) => set("radiusMiles", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="radius-fill-opacity-slider">
            RING FILL OPACITY
          </label>
          <input
            id="radius-fill-opacity-slider"
            type="range"
            className="filter-slider"
            min={0}
            max={0.3}
            step={0.01}
            value={filters.radiusFillOpacity}
            disabled={!filters.showOriginRadiusRing}
            onChange={(e) => set("radiusFillOpacity", Number(e.target.value))}
          />
          <NumberInput
            value={filters.radiusFillOpacity}
            min={0}
            max={0.3}
            step={0.01}
            disabled={!filters.showOriginRadiusRing}
            ariaLabel="Radius fill opacity"
            unit=""
            onCommit={(v) => set("radiusFillOpacity", v)}
          />
        </div>
      </PanelSection>}

      {dataMode === 'b2b' && <PanelSection
        title="Flow Layer"
        sectionKey="flowLayer"
        isOpen={sectionState.flowLayer}
        onToggle={toggleSection}
      >
        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={flowSettings.showFlows}
              onChange={(e) => setFlow("showFlows", e.target.checked)}
            />
            <span>Show flows</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="flow-direction">
            FLOW DIRECTION
          </label>
          <select
            id="flow-direction"
            className="filter-select"
            value={flowSettings.flowDirection}
            disabled={!flowSettings.showFlows}
            onChange={(e) =>
              setFlow(
                "flowDirection",
                e.target.value as FlowSettings["flowDirection"],
              )
            }
          >
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={flowSettings.straightInlandLines}
              disabled={!flowSettings.showFlows}
              onChange={(e) =>
                setFlow("straightInlandLines", e.target.checked)
              }
            />
            <span>Straight inland lines</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="destination-mode">
            DESTINATION MODE
          </label>
          <select
            id="destination-mode"
            className="filter-select"
            value={flowSettings.destinationMode}
            disabled={!flowSettings.showFlows}
            onChange={(e) =>
              setFlow(
                "destinationMode",
                e.target.value as FlowSettings["destinationMode"],
              )
            }
          >
            <option value="manual">Manual</option>
            <option value="topN">Top N by PCS</option>
          </select>
        </div>

        {flowSettings.destinationMode === "topN" ? (
          <div className="filter-group">
            <label className="filter-label" htmlFor="flow-topn-slider">
              TOP N DESTINATIONS
            </label>
            <input
              id="flow-topn-slider"
              type="range"
              className="filter-slider"
              min={3}
              max={10}
              step={1}
              value={flowSettings.topNDestinations}
              disabled={!flowSettings.showFlows}
              onChange={(e) =>
                setFlow("topNDestinations", Number(e.target.value))
              }
            />
            <NumberInput
              value={flowSettings.topNDestinations}
              min={3}
              max={10}
              step={1}
              disabled={!flowSettings.showFlows}
              ariaLabel="Top N flow destinations"
              unit="routes"
              onCommit={(v) => setFlow("topNDestinations", v)}
            />
          </div>
        ) : (
          <div className="filter-group">
            <span className="filter-label">MANUAL DESTINATIONS</span>
            <div className="flow-destination-list">
              {flowDestinationOptions.map((option) => (
                <label
                  key={option.zip}
                  className="filter-checkbox flow-destination-item"
                >
                  <input
                    type="checkbox"
                    checked={flowSettings.manualDestinations.includes(option.zip)}
                    disabled={!flowSettings.showFlows}
                    onChange={() => toggleManualDestination(option.zip)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label" htmlFor="arrow-style">
            ARROW STYLE
          </label>
          <select
            id="arrow-style"
            className="filter-select"
            value={flowSettings.arrowStyle}
            disabled={!flowSettings.showFlows}
            onChange={(e) =>
              setFlow(
                "arrowStyle",
                e.target.value as FlowSettings["arrowStyle"],
              )
            }
          >
            <option value="clean">Clean</option>
            <option value="bold">Bold</option>
            <option value="presentation">Presentation</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={flowSettings.showFlowLabels}
              disabled={!flowSettings.showFlows}
              onChange={(e) => setFlow("showFlowLabels", e.target.checked)}
            />
            <span>Show flow labels</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="flow-width-slider">
            FLOW WIDTH
          </label>
          <input
            id="flow-width-slider"
            type="range"
            className="filter-slider"
            min={0.6}
            max={1.5}
            step={0.1}
            value={flowSettings.flowWidthScale}
            disabled={!flowSettings.showFlows}
            onChange={(e) => setFlow("flowWidthScale", Number(e.target.value))}
          />
          <NumberInput
            value={flowSettings.flowWidthScale}
            min={0.6}
            max={1.5}
            step={0.1}
            disabled={!flowSettings.showFlows}
            ariaLabel="Flow width scale"
            unit="x"
            onCommit={(v) => setFlow("flowWidthScale", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="flow-opacity-slider">
            FLOW OPACITY
          </label>
          <input
            id="flow-opacity-slider"
            type="range"
            className="filter-slider"
            min={0.35}
            max={1}
            step={0.05}
            value={flowSettings.flowOpacity}
            disabled={!flowSettings.showFlows}
            onChange={(e) => setFlow("flowOpacity", Number(e.target.value))}
          />
          <NumberInput
            value={flowSettings.flowOpacity}
            min={0.35}
            max={1}
            step={0.05}
            disabled={!flowSettings.showFlows}
            ariaLabel="Flow opacity"
            unit=""
            onCommit={(v) => setFlow("flowOpacity", v)}
          />
        </div>
      </PanelSection>}

      {dataMode === 'b2c' && (
        <PanelSection
          title="B2C Layers"
          sectionKey="b2cLayers"
          isOpen={sectionState.b2cLayers}
          onToggle={toggleSection}
        >
          <div className="filter-group">
            <label className="filter-row">
              <span className="filter-label">TOP 100 CITIES</span>
              <input
                type="checkbox"
                className="filter-toggle"
                checked={settings.showB2cCityDots}
                onChange={(e) => setApp("showB2cCityDots", e.target.checked)}
              />
            </label>
          </div>
          <div className="filter-group">
            <label className="filter-row">
              <span className="filter-label">TOP 100 ZIP CODES</span>
              <input
                type="checkbox"
                className="filter-toggle"
                checked={settings.showB2cZipDots}
                onChange={(e) => setApp("showB2cZipDots", e.target.checked)}
              />
            </label>
          </div>
        </PanelSection>
      )}

      <PanelSection
        title="Appearance"
        sectionKey="appearance"
        isOpen={sectionState.appearance}
        onToggle={toggleSection}
      >
        <div className="settings-theme-cards">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              className={`settings-theme-card${settings.appTheme === theme.value ? " active" : ""}`}
              onClick={() => setApp("appTheme", theme.value)}
            >
              <span className="theme-card-label">{theme.label}</span>
              <span className="theme-card-desc">{theme.desc}</span>
            </button>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Map View"
        sectionKey="mapView"
        isOpen={sectionState.mapView}
        onToggle={toggleSection}
      >
        <div className="filter-group">
          <label className="filter-label">CHOROPLETH COLOR</label>
          <div className="settings-segmented">
            {CHOROPLETH_THEMES.map((theme) => (
              <button
                key={theme.value}
                type="button"
                className={`seg-btn${settings.choroplethTheme === theme.value ? " active" : ""}`}
                onClick={() => setApp("choroplethTheme", theme.value)}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={settings.showAlaska}
              onChange={(e) => setApp("showAlaska", e.target.checked)}
            />
            <span>Show Alaska</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={settings.showHawaii}
              onChange={(e) => setApp("showHawaii", e.target.checked)}
            />
            <span>Show Hawaii</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={settings.showPanamaExtent}
              onChange={(e) => setApp("showPanamaExtent", e.target.checked)}
            />
            <span>Extend map to Panama</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="projection-center-lon">
            PROJECTION CENTER LONGITUDE
          </label>
          <input
            id="projection-center-lon"
            type="range"
            className="filter-slider"
            min={-110}
            max={-75}
            step={1}
            value={settings.mapCenterLon}
            disabled={!settings.showPanamaExtent}
            onChange={(e) => setApp("mapCenterLon", Number(e.target.value))}
          />
          <NumberInput
            value={settings.mapCenterLon}
            min={-110}
            max={-75}
            step={1}
            disabled={!settings.showPanamaExtent}
            ariaLabel="Projection center longitude"
            unit=""
            onCommit={(v) => setApp("mapCenterLon", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="projection-center-lat">
            PROJECTION CENTER LATITUDE
          </label>
          <input
            id="projection-center-lat"
            type="range"
            className="filter-slider"
            min={8}
            max={40}
            step={1}
            value={settings.mapCenterLat}
            disabled={!settings.showPanamaExtent}
            onChange={(e) => setApp("mapCenterLat", Number(e.target.value))}
          />
          <NumberInput
            value={settings.mapCenterLat}
            min={8}
            max={40}
            step={1}
            disabled={!settings.showPanamaExtent}
            ariaLabel="Projection center latitude"
            unit=""
            onCommit={(v) => setApp("mapCenterLat", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="projection-scale">
            PROJECTION SCALE
          </label>
          <input
            id="projection-scale"
            type="range"
            className="filter-slider"
            min={260}
            max={700}
            step={10}
            value={settings.mapScale}
            disabled={!settings.showPanamaExtent}
            onChange={(e) => setApp("mapScale", Number(e.target.value))}
          />
          <NumberInput
            value={settings.mapScale}
            min={260}
            max={700}
            step={10}
            disabled={!settings.showPanamaExtent}
            ariaLabel="Projection scale"
            unit=""
            onCommit={(v) => setApp("mapScale", v)}
          />
        </div>
      </PanelSection>

      {dataMode === 'b2b' && <PanelSection
        title="Marker Style"
        sectionKey="markerStyle"
        isOpen={sectionState.markerStyle}
        onToggle={toggleSection}
      >
        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={settings.showDcMarkers}
              onChange={(e) => setApp("showDcMarkers", e.target.checked)}
            />
            <span>Show DC markers</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={settings.showZipDots}
              onChange={(e) => setApp("showZipDots", e.target.checked)}
            />
            <span>Show zip dots</span>
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="dc-logo-scale">
            DC LOGO SCALE
          </label>
          <input
            id="dc-logo-scale"
            type="range"
            className="filter-slider"
            min={0.5}
            max={2}
            step={0.1}
            value={settings.dcLogoScale}
            onChange={(e) => setApp("dcLogoScale", Number(e.target.value))}
          />
          <NumberInput
            value={settings.dcLogoScale}
            min={0.5}
            max={2}
            step={0.1}
            ariaLabel="DC logo scale"
            unit="x"
            onCommit={(v) => setApp("dcLogoScale", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="logo-padding">
            LOGO PADDING
          </label>
          <input
            id="logo-padding"
            type="range"
            className="filter-slider"
            min={0}
            max={12}
            step={1}
            value={settings.logoPadding}
            onChange={(e) => setApp("logoPadding", Number(e.target.value))}
          />
          <NumberInput
            value={settings.logoPadding}
            min={0}
            max={12}
            step={1}
            ariaLabel="Logo padding"
            unit="px"
            onCommit={(v) => setApp("logoPadding", v)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="zip-dot-color">
            ZIP DOT COLOR
          </label>
          <input
            id="zip-dot-color"
            type="color"
            value={settings.zipDotColor}
            onChange={(e) => setApp("zipDotColor", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="zip-dot-size">
            ZIP DOT SIZE
          </label>
          <input
            id="zip-dot-size"
            type="range"
            className="filter-slider"
            min={1}
            max={10}
            step={1}
            value={settings.zipDotSize}
            onChange={(e) => setApp("zipDotSize", Number(e.target.value))}
          />
          <NumberInput
            value={settings.zipDotSize}
            min={1}
            max={10}
            step={1}
            ariaLabel="Zip dot size"
            unit="px"
            onCommit={(v) => setApp("zipDotSize", v)}
          />
        </div>
      </PanelSection>}

      <PanelSection
        title="Defaults"
        sectionKey="defaults"
        isOpen={sectionState.defaults}
        onToggle={toggleSection}
      >
        <div className="filter-group">
          <label className="filter-label" htmlFor="default-origin-zip">
            DEFAULT ORIGIN ZIP
          </label>
          <input
            id="default-origin-zip"
            className="filter-text-input"
            type="text"
            maxLength={5}
            value={settings.defaultOriginZip}
            onChange={(e) => setApp("defaultOriginZip", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label" htmlFor="default-min-volume">
            DEFAULT MIN VOLUME
          </label>
          <input
            id="default-min-volume"
            className="filter-text-input"
            type="number"
            min={0}
            step={100}
            value={settings.defaultMinVolume}
            onChange={(e) =>
              setApp("defaultMinVolume", parseInt(e.target.value, 10) || 0)
            }
          />
        </div>

        <div className="panel-section-note">
          Changes take effect on next page load.
        </div>
      </PanelSection>
    </aside>
  );
}
