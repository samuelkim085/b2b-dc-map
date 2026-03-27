# Flow Layer Mockup Plan

## Goal
Add a new map layer that visualizes directional supply flow using polished arrows without turning Phase 1 into a route-editing tool.

Initial story:
- Flow starts from outside the US map.
- It enters Southern California near the LA / Riverside area.
- It moves by trucking to Dallas, TX (`75238`).
- It then spreads outbound from Dallas to a small set of destination DCs or top destinations by quantity.

This is a curated strategic overlay, not a per-shipment route map.

---

## Feasibility Decision

### Verdict
The feature is feasible in the current codebase.

### Scope Adjustment
The original plan mixed two different deliverables:
- a presentable flow-layer mockup
- an interactive route-editing tool

Phase 1 should only ship the mockup layer and operational controls.
`Presentation Edit Mode` should move to Phase 1.5.

Why:
- the current app already has the right map/data foundation
- the current app does not yet have flow-specific state or drag-edit infrastructure
- draggable Bezier handles would add disproportionate complexity to the first release

### PowerPoint Reference
The PowerPoint mockup is now the primary visual reference for outbound route geometry.

The implementation should preserve that look:
- hub-and-spoke composition
- fan-style curved arrows
- outward-spreading symmetry from the hub
- slightly different curve strength per destination to avoid mechanical parallel lines
- clean, presentation-friendly geometry over strict route realism

---

## Phase 1 Scope

### In Scope
- One inbound route starting off-canvas from the Pacific side.
- One CA gateway near LA / Riverside.
- One selected origin DC, initially Dallas `75238`.
- Outbound arrows from the selected origin to:
  - a curated manual list of representative destination ZIPs, or
  - top N destination ZIPs by `pcs2025`
- UI controls for showing/hiding flows and adjusting the active flow mode.
- Professional arrow styling with curved paths and clean arrowheads.
- Origin switching using the existing origin selector.

### Out of Scope for Phase 1
- Real international source locations.
- Full shipment-by-shipment arrows.
- Time-series flow playback.
- Animation-heavy storytelling.
- Per-customer flow styling beyond a simple optional color mode.
- Draggable route handles or Bezier editing.
- Persisted custom control-point edits.

### Phase 1.5
Add presentation-focused editing after the base layer is stable:
- `Presentation Edit Mode`
- draggable control handles
- per-route custom curve offsets
- optional persisted flow geometry overrides

---

## User Experience

### Core Interaction
The user should be able to:
- Turn the flow layer on and off.
- Show `Inbound`, `Outbound`, or `Both`.
- Change the selected origin DC.
- Choose whether outbound destinations are:
  - manually selected, or
  - automatically chosen using top N by quantity
- Adjust a small set of safe appearance controls.

### Initial Flow Story
When `Both` is selected and the origin is Dallas:
1. One inbound arrow starts outside the left edge of the map.
2. It curves into Southern California.
3. A second leg runs from Southern California to Dallas.
4. Outbound arrows fan from Dallas to selected destinations.

### Why This Interaction Works
- It communicates supply flow clearly without clutter.
- It stays readable alongside choropleth and DC markers.
- It creates a solid foundation for later origin switching.

---

## Visual Design Direction

### Arrow Style
Use polished vector paths, not cartoon arrows.

Target look:
- match the PowerPoint fan-style outbound spokes as closely as practical in SVG
- prefer presentation balance over geographic literalism when choosing curvature

Recommended styling:
- Smooth bezier or spline curves.
- Small, sharp arrowheads.
- Moderate transparency.
- Slightly thicker outbound routes than inbound.
- Optional dashed style for the off-canvas inbound ocean leg.
- Clean neutral palette by default.

### Suggested Default Styles
- Inbound ocean leg:
  - color: charcoal or muted gray-blue
  - stroke: dashed
  - opacity: medium
- Inbound domestic leg CA -> TX:
  - color: dark neutral
  - stroke: solid
- Outbound:
  - color: muted accent or neutral blue
  - stroke: solid
  - slightly more prominent than inbound
- Hover:
  - increase opacity
  - add a subtle glow or thicker stroke
  - show route tooltip
- General:
  - Add a thin white or light halo around arrows to preserve contrast against all choropleth themes.

### Layer Order
Recommended rendering stack:
1. Base geographies
2. Choropleth fills
3. ZIP dots
4. Flow layer
5. DC logos / markers
6. Tooltip / overlay UI

This matches the current rendering approach and keeps arrows visible without covering logos.

### Outbound Geometry Reference
For outbound routes, use the PowerPoint mockup's `fan-style curved arrows` as the default geometry model.

That means:
- treat the selected origin as the hub
- spread outbound curves outward from that hub
- assign each route a curve direction and curve amount
- avoid letting all routes share the same generic bezier bend

The resulting map should feel like a curated hub-and-spoke presentation graphic, not a routing engine overlay.

---

## UI Plan

### Controls to Add
Add a new `Flow Layer` section in filter controls.

Recommendation:
- put operational flow controls in `FilterPanel`
- keep persistent app-wide defaults in `SettingsPage` only if needed later

#### Required Controls
- `Show Flows`
  - type: toggle
- `Flow Direction`
  - options:
    - `Inbound`
    - `Outbound`
    - `Both`
- `Destination Mode`
  - options:
    - `Manual`
    - `Top N by PCS`
- `Top N`
  - type: slider
  - range: `3` to `10`
  - active only when `Destination Mode = Top N`
- `Show Flow Labels`
  - toggle

#### Safe Appearance Controls for Phase 1
- `Arrow Style`
  - options:
    - `Clean`
    - `Bold`
    - `Presentation`
- `Flow Width`
  - slider with clamped min/max
- `Flow Opacity`
  - slider with clamped min/max

#### Deferred to Phase 1.5
- `Presentation Edit Mode`
- draggable handles
- route-specific curve editing UI

### Manual Destination Selection UX
When `Destination Mode = Manual`:
- show a checklist of representative destination ZIPs
- display each option using a friendly label, for example `Ontario, CA (91764)`

Initial recommended regions for the manual mockup:
- Southern California
- New Jersey
- Ohio
- Florida
- Oregon

After reviewing the actual dataset, convert those regions into an explicit representative ZIP list.
The rule stays the same: manual selections should be explicit representative ZIPs, not raw state codes.

---

## Data Model Changes

### Existing Repo Fit
The current map already has:
- selected origin ZIP in filter state
- destination records with lat/lon
- quantity in `pcs2025`
- known origins list

Current relevant files:
- [src/types.ts](C:/Github/b2b-dc-map/src/types.ts)
- [src/App.tsx](C:/Github/b2b-dc-map/src/App.tsx)
- [src/components/ShipmentsMap.tsx](C:/Github/b2b-dc-map/src/components/ShipmentsMap.tsx)
- [src/components/FilterPanel.tsx](C:/Github/b2b-dc-map/src/components/FilterPanel.tsx)
- [src/components/SettingsPage.tsx](C:/Github/b2b-dc-map/src/components/SettingsPage.tsx)

### Add to `Origin`
Extend `Origin` to include coordinates because origin ZIP centroids are not currently available from the destination centroid dataset.

```ts
export interface Origin {
  zip: string
  label: string
  lat: number
  lon: number
}
```

### New Flow Layer State
Add a flow-specific state model.

Suggested shape:

```ts
export interface FlowSettings {
  showFlows: boolean
  flowDirection: 'inbound' | 'outbound' | 'both'
  destinationMode: 'manual' | 'topN'
  topNDestinations: number
  manualDestinations: string[]
  arrowStyle: 'clean' | 'bold' | 'presentation'
  showFlowLabels: boolean
  flowWidthScale: number
  flowOpacity: number
}
```

### Deferred State for Phase 1.5

```ts
export interface FlowPresentationSettings {
  isPresentationEditMode: boolean
  customCurveOffsets: Record<string, { dx: number; dy: number }>
}
```

### Destination Identifier Strategy
For Phase 1, use destination ZIPs as the canonical manual identifier.

Illustrative example after ZIP selection is finalized:

```ts
manualDestinations: ['91764', '07094', '43082', '33172', '97005']
```

Reason:
- the current dataset is ZIP-centric
- map coordinates already exist at ZIP level
- state-level manual selection would still require a representative ZIP rule underneath

---

## Route Modeling Plan

### Route Types
Model flows as curated route segments, not raw CSV rows.

#### Inbound Segments
- `offCanvasWest -> gatewayCA`
- `gatewayCA -> originDC`

#### Outbound Segments
- `originDC -> destinationZip`

### New Utility
Create:
- [src/utils/flows.ts](C:/Github/b2b-dc-map/src/utils/flows.ts)

Responsibilities:
- build inbound and outbound flow objects
- aggregate records for top N destinations
- map manual ZIP selections to destination nodes
- convert nodes into projected path inputs
- produce metadata for rendering and tooltips

### Suggested Types
```ts
export interface FlowNode {
  id: string
  label: string
  lat: number
  lon: number
  kind: 'offCanvas' | 'gateway' | 'origin' | 'destination'
}

export interface FlowRoute {
  id: string
  type: 'inbound' | 'outbound'
  from: FlowNode
  to: FlowNode
  pcs: number
  count: number
  curveSide?: -1 | 1
  curveAmt?: number
  label?: string
}
```

### Special Nodes
Define fixed helper nodes:
- `offCanvasWest`
  - not a real geography point
  - start just outside the left edge of the map
- `gatewayCA`
  - near LA / Riverside
- `origin`
  - selected from `KNOWN_ORIGINS`

Suggested initial gateway:
- label: `Southern California Gateway`
- approximate point near Riverside / Ontario area

---

## Rendering Plan

### New Component
Create:
- [src/components/FlowLayer.tsx](C:/Github/b2b-dc-map/src/components/FlowLayer.tsx)

Responsibilities:
- render flow paths
- render arrowheads
- render optional labels
- handle hover styling and tooltips
- apply the fan-style curve metadata consistently

### Rendering Strategy
Use SVG paths within the existing `ComposableMap`.

#### Recommended Implementation
- define a `<defs>` block for arrowheads
- render one `<path>` per flow segment
- compute curved paths with quadratic or cubic bezier curves
- project all geographic coordinates to SVG coordinates before building path strings
- insert the flow layer between ZIP dots and DC markers

### Path Generation & Curvature Rules
Create helper functions in:
- [src/utils/flows.ts](C:/Github/b2b-dc-map/src/utils/flows.ts)
or
- [src/utils/flowPaths.ts](C:/Github/b2b-dc-map/src/utils/flowPaths.ts)

Functions:
- `projectFlowNode(...)`
- `buildCurvedPath(...)`
- `buildOffCanvasInboundPath(...)`
- `buildFanCurvePath(...)`
- `resolveCurveSide(...)`
- `resolveCurveAmount(...)`

Curvature rules:
- use a fixed control-point factor by route direction so arcs stay predictable
- do not expose per-route editing in Phase 1
- outbound paths should follow the PowerPoint fan-style algorithm below

Thickness rules:
- if scaling width by `pcs2025`, use linear or logarithmic scaling
- clamp all widths with strict `MIN_WIDTH` and `MAX_WIDTH`

### Fan-Style Curve Algorithm
Use the same geometry concept as the PowerPoint mockup, but implemented in SVG rather than OOXML.

Inputs per route:
- `startX`, `startY`: projected hub point
- `endX`, `endY`: projected destination point
- `curveSide`: `-1` or `+1`
- `curveAmt`: normalized curve strength, for example `0.08` to `0.20`

Base vector:

```ts
const dx = endX - startX
const dy = endY - startY
const len = Math.sqrt(dx * dx + dy * dy)
```

Perpendicular offset:

```ts
const perpX = (-dy / len) * len * curveAmt * curveSide
const perpY = ( dx / len) * len * curveAmt * curveSide
```

Cubic bezier control points:

```ts
const cp1X = startX + dx * 0.33 + perpX * 0.8
const cp1Y = startY + dy * 0.33 + perpY * 0.8
const cp2X = startX + dx * 0.66 + perpX
const cp2Y = startY + dy * 0.66 + perpY
```

Path output:

```ts
return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
```

Implementation notes:
- guard `len === 0` and return no path for degenerate routes
- apply a strict clamp to `curveAmt`
- keep the first control point slightly softer than the second to preserve the PowerPoint shape
- treat inbound legs separately because they are narrative connectors, not fan spokes

### Curve Direction Rules
Default outbound rule from the PowerPoint mockup:
- upper-left and upper routes: `curveSide = -1`
- right and lower-right routes: `curveSide = +1`
- lower routes: usually `curveSide = +1`

In practice:
- routes should bend outward from the hub, not inward toward each other
- if a destination lands close to the vertical split, prefer the side that preserves spacing with neighboring routes

### Curve Strength Rules
Default `curveAmt` guidance:
- short or nearby routes: `0.08` to `0.12`
- medium routes: `0.10` to `0.15`
- long routes: `0.15` to `0.20`

Rule of thumb:
- farther destinations can carry stronger curves
- adjacent routes should vary slightly so the fan does not look copied and pasted

---

## Outbound Destination Logic

### Manual Mode
For the mockup:
- use an explicit list of representative destination ZIPs
- each ZIP should have a stable label for the checklist and tooltip
- each route can optionally carry a hand-tuned `curveSide` and `curveAmt` preset

This avoids hidden state-to-ZIP mapping logic in the UI.

### Top N Mode
When enabled:
1. Filter current `dcRecords`
2. Group by destination ZIP
3. Sum `pcs2025` per ZIP
4. Sort descending by total `pcs2025`
5. Take the top N
6. Render routes from the selected origin to those ZIPs
7. assign `curveSide` and `curveAmt` using the fan-style rules

Recommended default for Phase 1:
- use `top N destination ZIPs`

Optional later expansion:
- support `top N states`

---

## Origin Switching Plan

### Initial Requirement
Start with:
- `Dallas, TX (75238)`

### Next Requirement
Support switching origin to another known DC, such as Ontario, CA.

### System Behavior
When origin changes:
- inbound domestic leg should reroute to the new origin
- outbound routes should recompute from the new origin
- top N results should recalc based on current filters and selected origin
- manual destinations remain selected, but route geometry updates

### Example
If origin changes from Dallas to Ontario:
- the `gatewayCA -> origin` leg becomes very short or may be hidden
- outbound routes fan from Ontario instead of Dallas

This should be automatic, not handled with one-off exceptions.

---

## File-Level Implementation Plan

### 1. Update shared types
Modify:
- [src/types.ts](C:/Github/b2b-dc-map/src/types.ts)

Changes:
- extend `Origin` with lat/lon
- add `FlowSettings`
- optionally add `FlowRoute` and `FlowNode` if shared typing is useful

### 2. Add origin coordinates
Modify:
- [src/types.ts](C:/Github/b2b-dc-map/src/types.ts)

Update `KNOWN_ORIGINS` to include coordinates for:
- Dallas `75238`
- Ontario `91764`
- Port Washington `11050`
- Doral `33178`
- Bolingbrook `60440`
- Lawrenceville `30043`

### 3. Add flow utilities
Create:
- [src/utils/flows.ts](C:/Github/b2b-dc-map/src/utils/flows.ts)

Responsibilities:
- build inbound routes
- build outbound routes
- select top N destinations
- map manual ZIP selections to route endpoints
- generate route metadata
- attach default fan-curve metadata for outbound routes

### 4. Add flow rendering component
Create:
- [src/components/FlowLayer.tsx](C:/Github/b2b-dc-map/src/components/FlowLayer.tsx)

Responsibilities:
- render the arrow layer
- render arrowheads
- handle route hover
- render labels when enabled

### 5. Wire into map
Modify:
- [src/components/ShipmentsMap.tsx](C:/Github/b2b-dc-map/src/components/ShipmentsMap.tsx)

Changes:
- build flow route data with `useMemo`
- render `<FlowLayer />`
- place it between ZIP dots and DC markers
- share or extend tooltip state if useful

### 6. Add controls
Modify:
- [src/components/FilterPanel.tsx](C:/Github/b2b-dc-map/src/components/FilterPanel.tsx)

Changes:
- add a `Flow Layer` section
- keep the origin selector as the shared control for both markers and flows
- add destination mode and top N / manual inputs

### 7. App state wiring
Modify:
- [src/App.tsx](C:/Github/b2b-dc-map/src/App.tsx)

Changes:
- initialize flow state
- pass flow settings to map and controls
- keep persistence optional for Phase 1

### 8. Deferred editing support
Phase 1.5 only:
- draggable handles
- pointer interaction logic
- `customCurveOffsets`
- optional persistence of route edits

---

## Testing Plan

### Unit Tests
Add tests for:
- top N destination selection
- manual destination ZIP selection behavior
- route aggregation
- origin switching behavior
- hidden or short `gatewayCA -> origin` leg when origin is already Ontario

Suggested new test file:
- [src/utils/flows.test.ts](C:/Github/b2b-dc-map/src/utils/flows.test.ts)

Minimum required tests:
- one positive case
- one edge case

Examples:
- positive:
  - top 5 destination ZIPs are selected in descending `pcs2025`
- edge:
  - no valid destination coordinates returns no outbound routes

### Visual Validation
Use the browser to confirm:
- inbound path starts off-canvas
- paths do not cover the whole UI
- arrows remain readable with choropleth on
- Dallas to selected destinations looks balanced
- origin switching updates geometry correctly

### Phase 1.5 Tests
Add only after editing mode exists:
- drag handle updates route geometry
- route edit state is applied consistently after re-render
- pointer interaction does not break marker hover

---

## Acceptance Criteria

### Phase 1 Acceptance
The feature is acceptable when:
- flow layer can be toggled on or off
- direction can switch between inbound, outbound, and both
- one inbound route starts outside the US map and enters Southern California
- one domestic inbound leg connects CA gateway to Dallas `75238`
- outbound routes render cleanly from the selected origin to selected destination ZIPs
- outbound routes follow a balanced fan-style spread similar to the PowerPoint mockup
- user can switch between manual destination selection and top N mode
- user can select between pre-defined arrow styles
- user can change the selected origin and see routes recalculate
- arrows remain readable alongside existing map layers regardless of choropleth color
- arrow lines use safe linear or logarithmic width scaling to avoid over-rendering

### Phase 1.5 Acceptance
The feature is acceptable when:
- user can toggle `Presentation Edit Mode`
- draggable handles appear for visible routes
- manual control-point edits update route curvature correctly
- optional persisted edit state restores the same presentation geometry

---

## Risks and Design Constraints

### Main Risks
- Too many arrows will overwhelm the map.
- Arrowheads can look amateurish if oversized.
- Straight-line paths will look mechanical and cheap.
- State-based destination selection will create unstable route endpoints.
- Draggable editing can easily overtake the scope of the mockup.

### Mitigations
- aggregate destinations before rendering
- default to small route counts
- use curved paths with restrained styling
- use explicit representative ZIPs for manual mode
- use route-level `curveSide` / `curveAmt` defaults to keep the fan balanced
- keep flow layer below logo markers
- use opacity and width scaling carefully
- defer editing mode until the base route model is stable

---

## Recommended Delivery Sequence

### Step 1
Implement a hardcoded visual mockup:
- off-canvas -> CA
- CA -> Dallas
- Dallas -> a small fixed ZIP list
- match the PowerPoint fan-style outbound geometry as the target look

### Step 2
Build the reusable flow utility layer:
- route objects
- projection helpers
- clamped width scaling
- tooltip metadata
- fan-style bezier control-point generation

### Step 3
Replace hardcoded outbound destinations with real filtered top N ZIP logic.

### Step 4
Add flow controls:
- show flows
- direction
- manual vs top N
- labels
- width and opacity

### Step 5
Support origin switching and adjust inbound leg behavior.

### Step 6
Refine styling and hover behavior.

### Step 7
Phase 1.5 only:
- add `Presentation Edit Mode`
- add draggable control points
- optionally persist custom route geometry

---

## Open Decisions
These should be finalized before implementation:
- What is the exact initial manual destination ZIP list?
- Should outbound width scale by total `pcs2025` or stay visually fixed in Phase 1?
- Should labels always show, show on hover, or be optional only?
- Should the CA gateway always stay fixed, or should it become configurable later?

---

## Recommendation
Build the first version as a curated presentation layer, not a raw logistics visualization and not an editing tool.

That means:
- one inbound narrative path
- limited outbound routes
- ZIP-based manual destination selection
- strong but minimal controls
- professional styling
- origin-aware recalculation

This is the lowest-risk way to get a compelling mockup quickly while leaving room for route editing later.
