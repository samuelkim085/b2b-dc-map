export interface DcRecord {
  customer: string; // "Walmart" | "Target" | etc.
  customerKey: string; // "WM" | "TG" | "Sally" | "CVS" | "WG" | "Ulta"
  deliveryAddress: string;
  city: string;
  state: string; // 2-letter abbreviation
  zip: string; // zero-padded 5-digit
  country: string; // "US" | "CA"
  pcs2025: number;
  distances: Record<string, number>; // originZip → miles
  lat: number | null;
  lon: number | null;
}

export interface Origin {
  zip: string;
  label: string;
  lat: number;
  lon: number;
}

export interface FilterState {
  // Choropleth layer (qty by state)
  choroplethCustomers: string[]; // empty = all customers
  showChoropleth: boolean; // default true

  // DC Location layer (logo markers)
  dcCustomers: string[]; // empty = all customers
  originZip: string;
  minVolume: number;
  maxDistance: number;
  showOriginRadiusRing: boolean;
  radiusCenterZip: string;
  radiusMiles: number;
  radiusFillOpacity: number;
}

export interface FlowSettings {
  showFlows: boolean;
  flowDirection: "inbound" | "outbound" | "both";
  straightInlandLines: boolean;
  destinationMode: "manual" | "topN";
  topNDestinations: number;
  manualDestinations: string[];
  arrowStyle: "clean" | "bold" | "presentation";
  showFlowLabels: boolean;
  flowWidthScale: number;
  flowOpacity: number;
}

export interface FlowNode {
  id: string;
  label: string;
  lat: number | null;
  lon: number | null;
  kind: "offCanvas" | "gateway" | "origin" | "destination";
}

export interface FlowRoute {
  id: string;
  type: "inbound" | "outbound";
  from: FlowNode;
  to: FlowNode;
  pcs: number;
  count: number;
  curveSide?: -1 | 1;
  curveAmt?: number;
  label?: string;
}

export interface FlowDestinationOption {
  zip: string;
  label: string;
  curveSide?: -1 | 1;
  curveAmt?: number;
}

export const CUSTOMER_MAP: Record<string, string> = {
  Walmart: "WM",
  Target: "TG",
  Sally: "Sally",
  CVS: "CVS",
  Walgreens: "WG",
  Ulta: "Ulta",
  "H-E-B": "HEB",
};

export const CUSTOMER_COLORS: Record<string, string> = {
  WM: "#0071CE",
  TG: "#E8192C", // Target red (distinct from CVS #CC0000)
  Sally: "#6B2D8B",
  CVS: "#CC0000",
  WG: "#E31837",
  Ulta: "#F05A22",
  HEB: "#e31837", // H-E-B red
};

export const CUSTOMER_DOMAINS: Record<string, string> = {
  WM: "walmart.com",
  TG: "target.com",
  Sally: "sallybeauty.com",
  CVS: "cvs.com",
  WG: "walgreens.com",
  Ulta: "ulta.com",
  HEB: "heb.com",
};

export const KNOWN_ORIGINS: Origin[] = [
  { zip: "75238", label: "Dallas, TX", lat: 32.8887, lon: -96.7073 },
  { zip: "91764", label: "Ontario, CA", lat: 34.0722, lon: -117.5867 },
  { zip: "11050", label: "Port Washington, NY", lat: 40.8348, lon: -73.7007 },
  { zip: "33178", label: "Doral, FL", lat: 25.8306, lon: -80.3676 },
  { zip: "60440", label: "Bolingbrook, IL", lat: 41.6948, lon: -88.0917 },
  { zip: "30043", label: "Lawrenceville, GA", lat: 33.9806, lon: -84.0083 },
];

export const FLOW_MANUAL_DESTINATION_OPTIONS: FlowDestinationOption[] = [
  {
    zip: "93257",
    label: "Porterville, CA (93257)",
    curveSide: -1,
    curveAmt: 0.14,
  },
  {
    zip: "08036",
    label: "Hainesport, NJ (08036)",
    curveSide: 1,
    curveAmt: 0.16,
  },
  { zip: "43228", label: "Columbus, OH (43228)", curveSide: 1, curveAmt: 0.09 },
  {
    zip: "32218",
    label: "Jacksonville, FL (32218)",
    curveSide: 1,
    curveAmt: 0.18,
  },
  { zip: "97321", label: "Albany, OR (97321)", curveSide: -1, curveAmt: 0.12 },
];

export interface AppSettings {
  appTheme: "bloomberg" | "dark" | "light";
  choroplethTheme: "greens" | "greys";
  filterPanelWidth: number;
  showAlaska: boolean;
  showHawaii: boolean;
  showPanamaExtent: boolean;
  mapCenterLon: number;
  mapCenterLat: number;
  mapScale: number;
  showDcMarkers: boolean;
  showZipDots: boolean;
  showB2cCityDots: boolean;
  dcLogoScale: number;
  logoPadding: number;
  zipDotColor: string;
  zipDotSize: number;
  defaultOriginZip: string;
  defaultMinVolume: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  appTheme: "bloomberg",
  choroplethTheme: "greys",
  filterPanelWidth: 360,
  showAlaska: false,
  showHawaii: false,
  showPanamaExtent: true,
  mapCenterLon: -92,
  mapCenterLat: 28,
  mapScale: 420,
  showDcMarkers: true,
  showZipDots: false,
  showB2cCityDots: true,
  dcLogoScale: 1.0,
  logoPadding: 2,
  zipDotColor: "#ffffff",
  zipDotSize: 3,
  defaultOriginZip: "75238",
  defaultMinVolume: 0,
};

export const DEFAULT_FLOW_SETTINGS: FlowSettings = {
  showFlows: true,
  flowDirection: "both",
  straightInlandLines: true,
  destinationMode: "manual",
  topNDestinations: 5,
  manualDestinations: FLOW_MANUAL_DESTINATION_OPTIONS.map(
    (option) => option.zip,
  ),
  arrowStyle: "presentation",
  showFlowLabels: false,
  flowWidthScale: 0.9,
  flowOpacity: 0.68,
};
