# marketplace-material

## Decisions
- **BRIEF 3 says IDs in URLs, not names. Persisted sandboxes already hold notifications and activity linking to /app/discover, and renaming the path would touch about 15 files owned by other clusters (seed, owner actions, project selectors) and many test hrefs. The inner tab that was called 'Marketplace' becomes 'All listings'. Moving the path to /app/marketplace with a redirect is left as an open question.**: Rename Discover to Marketplace in every visible label (nav, page title, breadcrumbs, search palette, help, landing, empty states) but keep the URL /app/discover and the code names (features/discover, discoverView, testids such as nav-discover).
- **The landing state is: tab all, no typology, no search, no filters. Choosing a folder sets ?type= as a pushed history entry, so Back returns to the folders. Inside a folder, family chips act as sub-folders. The typology tabs stay in the sticky bar for fast switching. On a phone the folders are compact stacked rows, so the page never scrolls sideways.**: The Marketplace opens on three category folders (Structure, Envelope, Finishes), each with a mosaic of up to 3 thumbnails, a count, its families and, when a project is checked, how many arrive in time. Below them come 'New for your projects' (architects only) and then the full 'All materials' grid.
- **checkingProjectFor no longer falls back to the first project. Existing per-person stored choices are still honoured. The material page shows the fit against every one of your projects when none is chosen, so the information stays visible without a default.**: 'Checking against' defaults to No project. Only a stored choice or a ?project= link sets it. It becomes a visible strip under the header: a dashed prompt when no project is chosen, and a brand-tinted bar with colour-coded fit counts and an 'Only show what arrives in time' switch when one is.
- **New pure function availabilityPhrase(Availability). It reads only the public window, so the owner's exact date stays private. PublicListing.availability.label is unchanged, so the privacy and seed tests stay as they are. availabilityText in specSheet now returns the phrase, so the specification export reads the same way.**: Quarter labels (Q1 2027) are replaced in buyer-facing UI by an availability phrase built from the disclosed window: 'Expected January to March 2027', 'Expected November 2026' or 'Available now'. A short form ('Expected Jan to Mar 2027') is used on cards.
- **The value is stored as the existing availableBy ISO date (the last day of the chosen month, or today for 'Available now'), so BrowseFilters, filterListings and the ?by= parameter are unchanged and old quarter links still parse. Scale: at least 6 and at most 24 months, extended to include the checked project's start.**: The availability filter becomes a month slider with a histogram in the Filters popover or sheet. Positions run 'Available now', then 'By the end of <month>' for each month, then 'Any time'. A marker shows the checked project's start.
- **Clients approve and reserve, so price matters to them. This is a display decision, not a P3 privacy rule: price is a public listing field. The view-model fields price and sellerLine are set to null for those roles, so the screen cannot show them. Location and collection point stay for every role because they matter for transport.**: Architects and consultants no longer get the guide price, the price sort or seller details (seller line, seller row, the 'seller shared after reservation' line). Clients keep all three.
- **The meshes are extruded prisms of 8 to 24 vertices and up to 18 faces. three.js would add roughly 150 to 170 KB gzipped for no visible gain. SVG needs no WebGL, works in jsdom tests and screenshots, is keyboard accessible and adds about 3 KB. It is built from the same profile as the OBJ and IFC files, so what you see is what you download. Drag turns it, the arrow keys step 15 degrees, and Home resets. There is no autorotate, so reduced-motion preferences are respected.**: The spinnable 3D view is a small custom SVG renderer, not three.js: a pure orthographic projection in src/domain/engines/view3d.ts with back-face culling, painter's sort and flat shading, drawn by src/ui/ModelViewer.tsx.
- **A 7.5 m UB 457 at full length reads as a line. The close-up is 1,000 mm, and the caption says the download is the full length.**: Long members get a close-up mode: the extrusion is shortened when it is longer than 4 times the profile's largest dimension, to the next 100 mm above twice that dimension. A toggle shows the full length.
- **Revit and other BIM tools import IFC4. The file includes a spatial structure (site, building, storey) so Revit places the element, millimetre units, deterministic 22-character GlobalIds and a 'Reclaimed material' property set with public fields only (no price, seller or location). The OBJ is kept unchanged. The 'BIM family' row (a native Revit family) stays locked for version 2.**: The Revit-compatible format is IFC4 (Reference View), generated as STEP text by a new pure ifcFor(listing, today). The element class depends on the family: IfcBeam for UB and IfcColumn for UC (both IfcIShapeProfileDef), IfcPlate CURTAIN_PANEL, IfcCovering CLADDING or FLOORING, and IfcBuildingElementProxy for brick (IfcRectangleProfileDef). Timber is unavailable.
- **The generated illustration keeps its own art because it is also the card art. On the material page the default stage is the first public photo when there is one, otherwise the 3D view when geometry exists, otherwise the illustration. The availability timeline moves up into the availability block.**: Material page order: pictures and 3D, save to project, availability, sustainability, key facts, then the full specification. A simpler background: a plain white stage with no drafting grid behind the 3D view and the drawing, and sections divided by hairlines instead of nested bordered cards.
- **architect.ts keeps the newForProjects field by calling the new function, so views.test stays green and the dashboards cluster can show a count tile linking to the Marketplace instead of the row.**: 'New for your projects' moves into the Marketplace: its logic moves out of architect.ts into a reusable newForProjectsFeed(state, viewer, projectId), and it narrows to the checked project when one is chosen.
- **All new state lives in the address bar (type, family, by, sort, project) or in the existing ui.checkingProjectId through setCheckingProject. The downloads are client side, so nothing crosses sides.**: No new store world actions, no seed additions and no new names.

## Spec
# 14.x Marketplace and material pages

Covers the review notes "Marketplace and material pages" plus "rename Discover" and "move the new for your project feed into Discover". Read alongside BRIEF sections 3, 5 and 11. Everything here keeps P2 (arithmetic in `src/domain` or `src/store`), P3 (buyer side reads `toPublicListing` only), P4 (Indicative markers), P6 (copy) and P7 (one clock).

## 1. Summary of the changes

1. Discover is renamed **Marketplace** everywhere it is shown. The path stays `/app/discover`.
2. The Marketplace opens on **category folders** (Structure, Envelope, Finishes) with thumbnails. Below them come **New for your projects** (architects only) and then **All materials**, which scroll as one page.
3. **Checking against a project** becomes a visible strip with colour-coded fit counts. The default is **No project**.
4. **Quarter labels go**: availability reads as approximate dates ("Expected January to March 2027"), and a **month slider with a histogram** replaces the quarter dropdown.
5. **Architects (and consultants) no longer see the guide price, the price sort or seller details.** Clients keep them.
6. **Material page**: a simpler, plain background; a **spinnable 3D view**; an **IFC4 download** (Revit compatible) next to the kept OBJ and DXF; the order is pictures and 3D, save, availability, sustainability, specs.

## 2. Data model and type changes

No change to `src/domain/types.ts`, `src/domain/v1types.ts`, `PublicListing`, `BrowseFilters`, `DiscoverQuery` or the persisted store shape. New types live next to their functions:

```ts
// src/domain/engines/availability.ts
export type AvailabilityPhrase = {
  kind: 'now' | 'month' | 'range'
  /** "Available now", "Expected November 2026", "Expected January to March 2027" */
  text: string
  /** "Available now", "Expected Nov 2026", "Expected Jan to Mar 2027" (cards) */
  short: string
}
export type AvailabilityPosition = {
  /** ISO date used as BrowseFilters.availableBy: today for position 0, else the last day of the month. */
  value: string
  /** "Available now" or "By the end of January 2027" */
  label: string
  /** "Now", "Nov", "Jan 2027" (the year is shown on January and on the first month) */
  short: string
  /** Listings that become available in this step (window start after the previous value, on or before this one). */
  count: number
  /** Listings available by this value. */
  cumulative: number
  /** count / largest count, 0 to 1, rounded to 3 decimals (bar height). */
  share: number
}
export type AvailabilityScale = {
  today: string
  positions: AvailabilityPosition[] // index 0 is "Available now"
  /** Index of "Any time", that is positions.length. */
  anyIndex: number
  /** Windows starting after the last position (only counted under "Any time"). */
  later: number
  total: number
}

// src/domain/engines/view3d.ts
export type Vec3 = [number, number, number]
/** Faces are 0-based vertex indices, wound anticlockwise seen from outside (outward normals). Y is up. */
export type Mesh = { vertices: Vec3[]; faces: number[][] }
export type ViewAngles = { yawDeg: number; pitchDeg: number }
export type Frame = { width: number; height: number; margin: number }
export type ProjectedFace = { index: number; points: [number, number][]; depth: number; light: number }
export type MeshProjection = { faces: ProjectedFace[]; shadow: { cx: number; cy: number; rx: number; ry: number } }

// src/domain/engines/geometry.ts (additions)
export type ModelGeometry = {
  mesh: Mesh
  /** Shortened copy for long members, else null. */
  closeUp: Mesh | null
  lengthMm: number
  closeUpMm: number | null
  /** Placeholder depth note for curtain wall and raised floor, else null. */
  placeholderNote: string | null
}
```

Selector types (all in `src/store/selectors/`):

```ts
// common.ts: ListingCard gains one field
availabilityShort: string // availabilityPhrase(listing.availability).short
// availabilityText becomes availabilityPhrase(...).text through specSheet.availabilityText

// marketplace.ts (new)
export type CategoryThumb = { publicId: string; title: string; spec: Spec; photo: { id: string; src: string | null } | null }
export type CategoryFolder = {
  typology: Typology; label: string; description: string
  count: number
  families: { family: FamilyId; label: string; count: number }[]
  thumbs: CategoryThumb[] // up to 3
  /** Listings that are available now or in time (not tight, not late) for the checked project; null without one. */
  fitsCount: number | null
}
export type FitSummary = Record<Fit, number>
export type NewForProjects = ListingCard & { fitsProjects: { id: string; name: string }[] } // moved from architect.ts, re-exported there
export type AvailabilityFilterView = AvailabilityScale & { selectedIndex: number; selectedLabel: string; projectIndex: number | null; projectName: string | null }

// discover.ts: DiscoverView gains
landing: boolean
folders: CategoryFolder[]
familyChips: { family: FamilyId; label: string; count: number; active: boolean }[] | null // only when a typology is set
fitSummary: FitSummary | null // over the shown cards, only with a checked project
newForProjects: NewForProjects[] // architects on the landing view only, at most 4
sortOptions: BrowseSort[] // architect and consultant: ['newest', 'carbon']; client: ['newest', 'carbon', 'price']
availability: AvailabilityFilterView
availableByLabel: string | null // the chip label, null when no filter

// discover.ts: MaterialView changes
price: { guide: string; range: string; signal: string } | null // null unless the viewer is on the client side
sellerLine: string | null // null unless client
location: { label: string; collectionPoint: string; seller: string | null } // seller null unless client
availability: { phrase: AvailabilityPhrase; windowStart; windowEnd; fitText; storageText; byProject: ProjectFit[] }
geometry: { dxf: boolean; obj: boolean; ifc: boolean; reason: string | null }
model: ModelGeometry | null
showPurchaseNote: boolean // architects: show L40 under Save
export type ProjectFit = { projectId: string; name: string; startText: string; fit: Fit; fitLabel: string }
```

`gallery` keeps its current entries; the 3D entry is composed in the component from `model`, so the existing gallery test is unchanged.

## 3. Domain functions (pure, tested)

### 3.1 `src/domain/engines/availability.ts` (new)

```ts
export function availabilityPhrase(a: Availability): AvailabilityPhrase
```
- `kind 'now'`: text and short are `Available now`.
- A month window (`level 'month'`): text `Expected ${formatMonth(start)}`, short `Expected ${Mon} ${YYYY}`.
- A quarter window (or any window spanning more than one month): text `Expected ${Month(start)} to ${Month(end)} ${YYYY}`. If the years differ: `Expected December 2026 to February 2027`. Short form uses three-letter months.
- It reads only `windowStart` and `windowEnd`, never the lot date.

```ts
export function availabilityScale(listings: PublicListing[], today: string, opts?: { minMonths?: number /*6*/; maxMonths?: number /*24*/; includeDate?: string | null /* project start */ }): AvailabilityScale
```
- `monthsAfter(a, b) = (yb - ya) * 12 + (mb - ma)`.
- `N = clamp(max(monthsAfter(today, latestWindowStart), includeDate ? monthsAfter(today, includeDate) : 0), minMonths, maxMonths)`.
- Position 0 has value `today`. It counts `kind 'now'` listings plus windows with `windowStart <= today`. This matches `filterListings(..., availableBy: today)`.
- Position i (1 to N) has value equal to the last day of the month `i` months after today's month. It counts windows with start in `(value[i-1], value[i]]`.
- `later` counts windows after `value[N]`. `cumulative` is a running sum. `share = round3(count / maxCount)`, or 0 when maxCount is 0.

```ts
export function scalePositionOf(scale: AvailabilityScale, availableBy: string | null): number
```
Returns `anyIndex` for null, 0 when `availableBy <= today`, otherwise the first position whose value is on or after `availableBy` (an old quarter-start link lands on its month), and `anyIndex` when it is beyond the last position.

```ts
export function availableByLabel(availableBy: string | null, today: string): string
```
Returns `Any time`, `Available now`, or `By the end of January 2027` when the value is a month end, otherwise `By 15 January 2027`.

Tests (`availability.test.ts`, seed via `createSeed()` and `listingFor`, plus `fresh()` at TODAY 2026-10-08 where stated):
- L-9F4CQQ gives `Expected January to March 2027` / `Expected Jan to Mar 2027`. L-6DN4K3 gives `Expected November 2026` / `Expected Nov 2026`. L-2MAC36 gives `Available now`. A window from 2026-12-01 to 2027-02-28 gives `Expected December 2026 to February 2027`.
- No phrase for any seed lot contains any string from `lotPrivateStrings`, and none matches `/Q[1-4] /`.
- Scale over the 17 marketplace listings of `fresh()` at 2026-10-08: N = 6; counts `[11, 1, 0, 4, 0, 0, 1]`; cumulative `[11, 12, 12, 16, 16, 16, 17]`; later 0; anyIndex 7; position values `['2026-10-08', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']`; shorts `['Now', 'Nov', 'Dec', 'Jan 2027', 'Feb', 'Mar', 'Apr']`.
- With `includeDate` set to Ferrymoor Yard's start (2027-06-08), N = 8. With Merrowgate Wharf's start (2028-04-04), N = 18. With a date 40 months out, N = 24 and the windows beyond it go to `later`.
- For every position i, `filterListings(all, { ...NO_FILTERS, availableBy: positions[i].value }, today).length === positions[i].cumulative`. This ties the slider to the filter.
- `scalePositionOf`: '2027-01-31' gives 3; '2027-01-01' gives 3; null gives 7; '2026-10-01' gives 0; '2031-01-01' gives 7.
- `availableByLabel`: null gives `Any time`; '2026-10-08' gives `Available now`; '2027-01-31' gives `By the end of January 2027`.

### 3.2 `src/domain/engines/specSheet.ts` (one line)
`availabilityText(l)` returns `availabilityPhrase(l.availability).text`. This is a deliberate spec change. Update the expected values in `specSheet.test.ts` lines 28, 29 and 84 (to `Expected January to March 2027` and `Expected November 2026`) and in `views.test.ts` line 237 (`Expected April to June 2027`, confirmed by running), and record the change in this section.

### 3.3 `src/domain/engines/geometry.ts` (extend; DXF and OBJ output unchanged)
- Export the existing `profileFor` as `profileOf(l: PublicListing): Profile | { unavailable: string }` and export `type Profile`.
- `geometryFilename(l, ext: 'dxf' | 'obj' | 'ifc')`.
- `meshFor(l): ModelGeometry | { unavailable: string }`. It builds the prism exactly as `objFor` does (bottom ring 0..n-1 at z 0, top ring n..2n-1 at z = depth, side quads `[i, j, n+j, n+i]`, bottom caps reversed, top caps in order), then applies a **proper rotation** (determinant +1, so the outward winding survives) per family so that Y is up:
  - Steel: `(x, y, z) => (z, y, -x)`, so the member lies along X and the web stands up.
  - Precast and stone cladding: `(x, y, z) => (x, z, -y)`, so the panel stands 1,000 mm tall.
  - Raised floor: `(x, y, z) => (x, z, -y)`, so the panel lies flat.
  - Curtain wall and brick: identity (face in XY, depth along Z).
  - Then translate so the bounds' minimum Y is 0 and the bounds are centred in X and Z.
- Close-up: `extent = max(profileWidth, profileHeight)`. If `depthMm > 4 * extent`, then `closeUpMm = ceil(2 * extent / 100) * 100` and `closeUp` is the same mesh built with that depth. Otherwise null.
- `placeholderNote`: `Panel depth is a placeholder, not a recorded dimension.` for curtain wall and raised floor, else null.

Tests (added to `geometry.test.ts`; the existing tests stay as they are):
- L-9F4CQQ: 24 vertices, 18 faces; bounds extents X 7500, Y 453.4, Z 189.9; closeUpMm 1000 with X extent 1000; lengthMm 7500.
- L-9XXQC3: extents 1500, 3300, 150, closeUp null, placeholder note set. L-J4WX28: 1000, 1000, 150. L-6VWCWH: 600, 32, 600. L-A945G6: 215, 65, 102.5.
- The signed volume (the sum over fan triangles of `a . (b x c) / 6`) is positive for every mesh, which proves outward winding. For L-9F4CQQ it is close to `(2*189.9*12.7 + (453.4-25.4)*8.5) * 7500 = 63,460,950` mm3.
- L-CJGQP7 gives `{ unavailable: 'No recorded section size' }`.
- `geometryFilename(L('L-9F4CQQ'), 'ifc')` gives `L-9F4CQQ-UB-457x191x67.ifc`.

### 3.4 `src/domain/engines/view3d.ts` (new): the 3D projection
```ts
export const DEFAULT_ANGLES: ViewAngles = { yawDeg: -35, pitchDeg: 20 }
export const KEY_STEP_DEG = 15
export function projectMesh(mesh: Mesh, angles: ViewAngles, frame: Frame): MeshProjection
export function dragToAngles(a: ViewAngles, dxPx: number, dyPx: number, degPerPx = 0.4): ViewAngles
export function stepAngles(a: ViewAngles, key: 'left' | 'right' | 'up' | 'down'): ViewAngles
export function shadeHex(baseHex: string, light: number): string
```
Formulas:
- `c` is the centre of the bounding box. `R = max |v - c|` over the vertices, which is invariant under rotation so the model never jumps. `s = (min(width, height) / 2 - margin) / R`.
- Rotation: `q = Rx(pitch) . Ry(yaw) . (v - c)`, with `Ry(p)(x,y,z) = (x cos p + z sin p, y, -x sin p + z cos p)` and `Rx(t)(x,y,z) = (x, y cos t - z sin t, y sin t + z cos t)`. The viewer is on +z, and a positive pitch shows the top.
- Screen: `X = width/2 + s*q.x`, `Y = height/2 - s*q.y`. Coordinates are rounded to 2 decimals.
- Normal by Newell's method on the rotated face. The face is visible only if `n.z > 1e-9` (back faces are culled).
- `light = round3(0.35 + 0.65 * max(0, n̂ . L̂))` with `L = normalise(-0.4, 0.7, 0.6)`.
- `depth` is the mean `q.z`. Faces are sorted by depth ascending (far first), ties by index.
- `shadow = { cx: width/2, cy: height/2 + 0.92*s*R, rx: 0.8*s*R, ry: 0.12*s*R }`.
- `dragToAngles`: `yaw = wrap(yaw + dx*k)` into (-180, 180]; `pitch = clamp(pitch + dy*k, -85, 85)`. `stepAngles` applies plus or minus 15 degrees with the same wrap and clamp.
- `shadeHex(hex, light)` multiplies each channel by the light, rounds, clamps to 0 to 255 and returns lower-case `#rrggbb`.

Tests (`view3d.test.ts`) on a 2 by 2 by 2 cube centred on the origin, frame 200 by 200 with margin 10:
- At angles (0, 0), exactly 1 face is visible (the +z face). It is a square centred on (100, 100) with half-side `90/√3` (about 51.96).
- At (180, 0) the visible face is the -z one.
- At (45, 30), 3 faces are visible, with depths ascending.
- For yaw -180 to 180 step 15 and pitch -85 to 85 step 17, every point lies within [10, 190], and every light is within [0.35, 1].
- Projecting the L-9F4CQQ close-up at the default angles gives between 3 and 12 visible faces, and the result is deterministic (the same input gives deep-equal output).
- `dragToAngles({-35, 20}, 100, 0)` gives `{5, 20}`. A dy of 1000 clamps pitch to 85. Yaw 170 plus 40 wraps to -150.
- `shadeHex('#808080', 0.5)` gives `'#404040'`. `shadeHex('#6b7a86', 1)` gives `'#6b7a86'`.

### 3.5 `src/domain/engines/ifc.ts` (new): IFC4 export
```ts
export const IFC_MIME = 'application/x-step'
export function ifcFor(l: PublicListing, today: string): GeometryFile
export function ifcGuid(key: string): string // 22 characters of the IFC base64 alphabet, deterministic
export function stepString(s: string): string // quoted; ' doubled; \ doubled; non-ASCII as \X2\hhhh\X0\
export function stepReal(x: number): string // 3 decimals, a trailing "." on integers ("7500."), never "-0."
```
- `ifcGuid`: four 32-bit FNV-1a hashes of `${key}:${i}` (i = 0 to 3) give 128 bits. The first character carries the top 2 bits (0 to 3), then 21 characters carry 6 bits each, from the alphabet `0-9A-Za-z_$`. Keys are `${publicId}:${role}`, where the roles are project, site, building, storey, agg1, agg2, agg3, element, contain, mat, pset and defpset.
- File layout (entity numbers fixed so the tests can read them):

```
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');
FILE_NAME('<filename>','<today>T00:00:00',(''),(''),'Tallyard geometry export','Tallyard','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('<g project>',$,'<publicId> <title>','<L20>',$,$,$,(#10),#2);
#2=IFCUNITASSIGNMENT((#3,#4,#5));
#3=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#4=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);
#5=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#6=IFCCARTESIANPOINT((0.,0.,0.));
#7=IFCDIRECTION((0.,0.,1.));
#8=IFCDIRECTION((1.,0.,0.));
#9=IFCAXIS2PLACEMENT3D(#6,$,$);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#9,$);
#11=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#10,$,.MODEL_VIEW.,$);
#12=IFCLOCALPLACEMENT($,#9);
#13=IFCSITE('<g site>',$,'Site',$,$,#12,$,$,.ELEMENT.,$,$,$,$,$);
#14=IFCLOCALPLACEMENT(#12,#9);
#15=IFCBUILDING('<g building>',$,'Building',$,$,#14,$,$,.ELEMENT.,$,$,$);
#16=IFCLOCALPLACEMENT(#14,#9);
#17=IFCBUILDINGSTOREY('<g storey>',$,'Level 0',$,$,#16,$,$,.ELEMENT.,0.);
#18=IFCRELAGGREGATES('<g agg1>',$,$,$,#1,(#13));
#19=IFCRELAGGREGATES('<g agg2>',$,$,$,#13,(#15));
#20=IFCRELAGGREGATES('<g agg3>',$,$,$,#15,(#17));
#21=IFCDIRECTION((<axis>));
#22=IFCDIRECTION((<refDirection>));
#23=IFCAXIS2PLACEMENT3D(#6,#21,#22);
#24=IFCLOCALPLACEMENT(#16,#23);
#25=IFCCARTESIANPOINT((0.,<profileY>));
#26=IFCAXIS2PLACEMENT2D(#25,$);
#27=<profile>;
#28=IFCEXTRUDEDAREASOLID(#27,#9,#7,<depth>);
#29=IFCSHAPEREPRESENTATION(#11,'Body','SweptSolid',(#28));
#30=IFCPRODUCTDEFINITIONSHAPE($,$,(#29));
#31=<ELEMENT>('<g element>',$,'<title>','<L42>','Reclaimed',#24,#30,'<publicId>',<.TYPE.>);
#32=IFCRELCONTAINEDINSPATIALSTRUCTURE('<g contain>',$,$,$,(#31),#17);
#33=IFCMATERIAL('<family label>',$,'<material category>');
#34=IFCRELASSOCIATESMATERIAL('<g mat>',$,$,$,(#31),#33);
#35..#k=IFCPROPERTYSINGLEVALUE('<name>',$,<IFCIDENTIFIER|IFCLABEL|IFCTEXT>(...),$);
#k+1=IFCPROPERTYSET('<g pset>',$,'Reclaimed material',$,(#35,...,#k));
#k+2=IFCRELDEFINESBYPROPERTIES('<g defpset>',$,$,$,(#31),#k+1);
ENDSEC;
END-ISO-10303-21;
```

- Per family:

| Family | Element and type | Profile (#27) | Axis, RefDirection | profileY | Depth |
|---|---|---|---|---|---|
| steel UB | `IFCBEAM` `.BEAM.` | `IFCISHAPEPROFILEDEF(.AREA.,'<designation>',#26,b,h,tw,tf,$,$,$)` | (1,0,0), (0,1,0): along X, web vertical | 0 | length mm |
| steel UC | `IFCCOLUMN` `.COLUMN.` | same | (0,0,1), (1,0,0) | 0 | length mm |
| curtain wall | `IFCPLATE` `.CURTAIN_PANEL.` | `IFCRECTANGLEPROFILEDEF(.AREA.,'Panel',#26,w,h)` | (0,-1,0), (1,0,0): face upright | h/2 | 150 (placeholder) |
| precast, stone | `IFCCOVERING` `.CLADDING.` | rectangle 1000 by thickness | (0,0,1), (1,0,0) | 0 | 1000 |
| brick | `IFCBUILDINGELEMENTPROXY` `.ELEMENT.` | rectangle 215 by 65 | (0,-1,0), (1,0,0) | 32.5 | 102.5 |
| raised floor | `IFCCOVERING` `.FLOORING.` | rectangle w by h | (0,0,1), (1,0,0) | 0 | 32 (placeholder) |
| timber joist | unavailable: `No recorded section size` | | | | |

- Properties (public fields only): `Public ID` (IFCIDENTIFIER), `Title`, `Condition`, `Test status` (TEST_STATUS_LABELS), `Steel grade` (steel only), `Source` (`Reclaimed from deconstruction` or `Unused surplus`), all IFCLABEL. Then `Geometry note` (profile notes joined with `. `) and `Data status` (L20), as IFCTEXT. No price, no seller, no location.
- Tests (`ifc.test.ts`):
  - The header lines are exact and FILE_SCHEMA is `(('IFC4'))`.
  - Every DATA line matches `/^#\d+=IFC[A-Z0-9]+\(.*\);$/`. Ids are unique and every `#n` that is referenced is defined.
  - A splitter that respects quotes and parentheses gives the IFC4 attribute counts: IFCPROJECT 9, IFCSITE 14, IFCBUILDING 12, IFCBUILDINGSTOREY 10, IFCBEAM, IFCCOLUMN, IFCPLATE, IFCCOVERING and IFCBUILDINGELEMENTPROXY 9, IFCISHAPEPROFILEDEF 10, IFCRECTANGLEPROFILEDEF 5, IFCEXTRUDEDAREASOLID 4, IFCGEOMETRICREPRESENTATIONSUBCONTEXT 10, the rel entities 6, IFCPROPERTYSINGLEVALUE 4, IFCPROPERTYSET 5, IFCSIUNIT 4.
  - L-9F4CQQ contains `IFCBEAM(` and `IFCISHAPEPROFILEDEF(.AREA.,'UB 457x191x67',#26,189.9,453.4,8.5,12.7,$,$,$)` and `IFCEXTRUDEDAREASOLID(#27,#9,#7,7500.)`.
  - L-2MAC36 gives IFCCOLUMN with depth `4200.`. L-9XXQC3 gives `.CURTAIN_PANEL.` and `1500.,3300.` with depth `150.`. L-Q23X7N gives `.CLADDING.` and `1000.,50.`. L-6VWCWH gives `.FLOORING.`. L-A945G6 gives IFCBUILDINGELEMENTPROXY. L-CJGQP7 is unavailable.
  - The 12 GlobalIds match `/^[0-3][0-9A-Za-z_$]{21}$/`, are distinct, and are identical across two calls.
  - `stepString("Client's")` gives `"'Client''s'"`. `stepString('é')` gives `"'\\X2\\00E9\\X0\\'"`. `stepReal(7500)` gives `'7500.'`, `stepReal(-0)` gives `'0.'` and `stepReal(189.9)` gives `'189.9'`.
  - The text contains L20 and L42 and has no `£` and no `/price/i`. No seed lot's `lotPrivateStrings` appear in the text or the filename.
- Manual check, recorded in `docs/` and not in CI because it would add a dependency: open a downloaded file with IfcOpenShell (`python -m ifcopenshell.validate file.ifc`) or any IFC viewer, and import it once into Revit (Insert, Link IFC).

## 4. Store

No new world actions. The existing `setCheckingProject` (UI state) is used as today. No activity or notifications are added, because downloads and filters are private to the viewer.

## 5. Selectors (view models)

### 5.1 `src/store/selectors/arch-discover.ts`
`checkingProjectFor(state, viewer, fromAddress)`: the address wins when the viewer works on that project, then the stored choice (null means none). **With no stored choice it returns null**, with no first-project fallback. The header comment changes accordingly. `discoverQueryFromParams` and `discoverParamsFor` are unchanged.

Tests in `arch-selectors.test.ts`. These change by decision; record the change in BRIEF 14:
- "defaults to the first project the viewer works on" becomes "defaults to no project", expecting null.
- "takes a project in the address only when the viewer works on it": Isla with FERRYMOOR_ID now expects null.
- The other cases stay.

### 5.2 `src/store/selectors/marketplace.ts` (new)
```ts
export const CATEGORY_COPY: Record<Typology, { label: string; description: string }>
export function categoryFolders(state: AppData, viewer: Viewer, project: Project | null, listings: PublicListing[]): CategoryFolder[]
export function fitSummary(cards: ListingCard[]): FitSummary | null // null when no card has a fit
export function newForProjectsFeed(state: AppData, viewer: Viewer, projectId: string | null, limit = NEW_LISTING_LIMIT): NewForProjects[]
export function availabilityFilterView(listings: PublicListing[], query: DiscoverQuery, project: ProjectRef | null, today: string): AvailabilityFilterView
```
- Folders count over every marketplace listing. Families follow `FAMILY_IDS` order and include only those with a count above 0. Thumbs are sorted with photo first, then newest `listedMonth`, then publicId, and the first 3 are taken. `fitsCount` counts fits of `now` or `in_time`.
- `newForProjectsFeed` is the loop moved verbatim from `architect.ts` (30 days, not on any of the practice's lists, not late for at least one project), restricted to the given project when `projectId` is set. It returns [] for anyone who is not an architect. `NEW_LISTING_DAYS` and `NEW_LISTING_LIMIT` move here and are re-exported from `architect.ts`.
- Tests (`marketplace.test.ts`, `fresh()`):
  - Folders: `[['structure', 11, ['steel_section', 'timber_joist']], ['envelope', 5, ['clay_brick', 'curtain_wall', 'precast_cladding', 'stone_cladding']], ['finishes', 1, ['raised_floor']]]` (family order as FAMILY_IDS). Structure thumbs start with L-9F4CQQ.
  - fitsCount is null with no project. With FERRYMOOR envelope it is 4 (L-9XXQC3 is tight). With MERROWGATE structure it is 11.
  - `fitSummary` of the Merrowgate cards gives `{ now: 10, in_time: 7, tight: 0, late: 0 }`. Ferrymoor gives `{ now: 10, in_time: 6, tight: 1, late: 0 }`.
  - `newForProjectsFeed(Priya, null)[0].publicId` is `L-9F4CQQ`. With MERROWGATE_ID every card's `fitsProjects` contains Merrowgate. For Isla it is [].
  - `availabilityFilterView` with no project gives projectIndex null. With Ferrymoor it gives projectIndex 8 and projectName 'Ferrymoor Yard'.

### 5.3 `src/store/selectors/discover.ts`
`discoverView`:
- `landing = tab === 'all' && !typology && !q.trim() && activeFilterCount === 0`.
- `folders = categoryFolders(...)`, always computed.
- `familyChips` are computed when a typology is set, counting over the searched listings with all filters except family.
- `fitSummary` comes from the shown cards.
- `newForProjects = landing && role === 'architect' ? newForProjectsFeed(state, viewer, project?.id ?? null).slice(0, 4) : []`.
- `sortOptions` depend on the role. A `price` sort from a non-client falls back to `newest`. `priceSortEnabled` is `client && family !== null`.
- `availability = availabilityFilterView(all, query, project, today)` and `availableByLabel`.
- `ListingCard.availabilityShort` is added in `common.ts`.

`materialView`:
- `role = projectSide`-aware: `isClientSide = roleOfUser === 'client'`.
- `price` and `sellerLine` are null and `location.seller` is null unless the viewer is a client.
- `availability.phrase` and `byProject`: every project in `projects` (the viewer's projects that can see the lot) with `timelineFit` against its start, in order, at most 5.
- `geometry.ifc = ifcFor(listing, today).kind === 'file'`.
- `model = meshFor(listing)`, or null when unavailable.
- `showPurchaseNote = role === 'architect'`.

`geometryFile(state, viewer, publicId, kind: 'dxf' | 'obj' | 'ifc')` passes `todayOf(viewer)` to `ifcFor`.

Tests in `views.test.ts`. The Discover and material sections change by decision:
- The "sorts by price" assertions move to Isla. A new assertion says Priya's `sortOptions` is `['newest', 'carbon']` and a price query falls back to newest.
- In "shows public facts...", Priya gets `sellerLine` null, `price` null and `location.seller` null. Isla on the same lot gets `'Listed by an asset owner in Central London'` and price range `'£715 to £825 per tonne'`. `m.geometry` becomes `{ dxf: true, obj: true, ifc: true, reason: null }`. `m.availability.phrase.text` is `'Expected January to March 2027'`. With projectId null, `m.availability.byProject.map(p => [p.name, p.fit])` gives the three projects with `in_time`.
- `discoverView(Priya, Q)`: `landing` true, three folders, `fitSummary` null, `newForProjects[0].publicId` `L-9F4CQQ`. `Q` with `typology: 'envelope'` gives `landing` false and family chips summing to 5.

### 5.4 Labels in shared selectors (small edits, owned by the nav and shell clusters)
- `nav.ts`: the architect item `item('discover', 'Marketplace', '/app/discover', 'Store')`. Clients and consultants have no nav entry today, so none is added.
- `navIcons.ts`: add `Store`.
- `arch-breadcrumbs.ts`: `discover: 'Marketplace'`.
- `search.ts`: the page entry for `discover` gets keywords `'marketplace discover browse materials'`, so the test `searchEntries(priya, 'discover')` still passes.
- `project.ts:204`: `'Find materials for this project in the Marketplace'`.
- The tests that change: views.test line 344 nav titles `['Home', 'Marketplace', 'Saved']`, and the arch-selectors breadcrumb test `['Marketplace', 'UB 457x191x67, 7.5 m']`.

## 6. Routes and sidebar
- The routes are unchanged: `/app/discover` and `/app/discover/:publicId`, with the same access table. BRIEF section 3 renames the row label to Marketplace.
- Sidebar (architect): Home, **Marketplace** (Store icon), Saved, Projects.

## 7. Screens, in priority order

### 7.1 Marketplace (`features/discover/Discover.tsx`)
1. **Header**: h1 `Marketplace`, and the line `Reclaimed structure, envelope and finishes from buildings coming down across London and the South East.` Section tabs: `All listings` (count) and `Shared with you` (count and dot). The project picker leaves the header and moves into the checking strip.
2. **Checking strip** (`CheckingBar.tsx`, testid `checking-bar`, under the tabs on the All listings tab):
   - No project and the viewer has projects: a dashed-border row with a CalendarRange icon, the title `Check materials against a project`, the line `See which arrive in time for its start on site.` and the button `Choose a project`, which opens the ProjectPicker menu.
   - No projects (a new practice): `Create a project to check materials against its start on site.` with a link `New project` for architects. Hidden for other roles.
   - Project chosen: a brand-50 strip, sticky with the toolbar on md and up. It shows `Checking against {name}`, `Materials needed from {startText}` and fit chips in fit colours, non-zero only: `{n} available now`, `{n} in time`, `{n} tight`, `{n} too late`. Then the Switch `Only show what arrives in time` (fitsOnly), the button `Change project`, an IconButton X labelled `Stop checking against {name}` and the IndicativeMarker.
   - On a phone the chips wrap and the controls are 44px.
3. **Sticky toolbar** (as today): search, typology tabs, Filters, Sort. Sort lists only `sortOptions`.
4. **Landing only: `Browse by category`** (`CategoryFolders.tsx`): three cards (testid `category-{typology}`), each a button with aria-label `Open {label}, {count} materials`.
   - From sm up: a 3-column grid. Each card has a mosaic at 16/10: one thumb fills it; two split it; three are one tall left tile plus two stacked tiles. Tiles use MaterialImage, photo or illustration.
   - Below the mosaic: a FolderOpen icon, the label (text-lg semibold), `{count} materials`, the family labels joined with commas, and with a project `{fitsCount} in time for {name}` with a brand dot.
   - Below sm: stacked rows with a 64px thumb, label, count and a chevron icon.
   - A folder with count 0 is muted and disabled, with the line `Nothing listed yet`.
   - Choosing a folder pushes history (`update({ typology, family: null }, { push: true })`).
5. **Landing only, architects: `New for your projects`** (`NewForProjectsRow.tsx`, testid `new-for-projects`). The title is `New for {project}` when a project is checked. The description is `Listed in the last 30 days and in time for at least one of your projects.`, or with a project `Listed in the last 30 days and in time for its start on site.`. Up to 4 ListingTiles, each captioned `In time for {name}` or `In time for {n} of your projects`. The row is hidden when empty.
6. **Folder header** (when a typology is set and there is no search): the ghost button `All categories` (ChevronLeft icon) returns to the landing view. Then an h2 with the label and count, and family chips (`FamilyChips.tsx`, testid `family-chip-{family}` plus `family-chip-all`), with aria-pressed, toggling `family`.
7. **All materials**: the h2 `All materials` on landing. The results line `{n} materials` (`of {total}`) loses the old `Timeline checked against` sentence, which moves to the strip. Then the grid (testid `discover-grid`). Cards show `card.availabilityShort` in the facts and a fit pill only when a project is checked.
8. Empty states are unchanged in wording except `Materials appear here as asset owners publish them. Shared lots for your projects are under Shared with you.`

### 7.2 Filters (`DiscoverFilters.tsx`)
The Availability Select is replaced by `AvailabilitySlider.tsx` (testid `filter-availability`):
- Label `Available by`, with the current label on the right (`Any time`, `Available now`, `By the end of January 2027`) and `{cumulative} of {total} materials` under it.
- A histogram of `positions.length + 1` bars. Each bar's height is `share * 48px`, and the `later` share sits on the Any time bar. Bars up to the thumb are brand-600 and the rest are line-strong. A project marker line labelled `{name} start` appears when `projectIndex` is not null.
- A native `<input type="range" min=0 max=anyIndex step=1>` with `aria-valuetext` set to the label and short tick labels under it (the first, January ones and the last). On change it sets `availableBy` to `positions[i].value`, or null at anyIndex.
- The chip in ActiveFilters uses `availableByLabel`.

### 7.3 Material page (`features/material/MaterialPage.tsx`)
The page background stays the app page tone. The bordered Cards are replaced by sections separated by `border-t border-line-soft` and generous spacing. Two columns from xl (7 and 5). Order:
1. **Media stage** (left, sticky; `MaterialGallery.tsx`): a white stage (`bg-surface`, 1px ring, rounded-xl, aspect 4/3) with no grid and no grain behind the 3D view and the drawing.
   - Thumb order: photos, `3D view` (when `model`), Illustration, Dimensioned drawing.
   - Default: the first photo, else 3D, else the illustration.
   - Captions:
     - 3D: `Generated from the recorded dimensions. Drag or use the arrow keys to turn it.`
     - Close-up: `Shown {closeUpMm} mm long so the section reads. The download is the full {lengthMm} mm.`
     - When `placeholderNote` is set, it is shown after the caption.
   - `ModelViewer` controls sit in the top-right corner of the stage: `Reset view` (RotateCcw) and, when there is a close-up, the toggle `Show full length` / `Show close up` (MoveHorizontal). Both are 44px on a phone.
2. **Header**: tags, title (`material-title`), public ID. Clients only: `seller-line`.
3. **Save and download**: SaveButton (primary, lg), then a Download menu with the items 2D drawing (DXF), 3D model (OBJ), BIM model (IFC), and the locked BIM family (Version 2). Saved chips: `Saved to {name}`. Architects also get the L40 line `Approval and purchase sit with the client, not the architect.`. Reserved callout as today. The Specification link for approved items stays.
4. **Availability** (`availability` section): the large phrase (`availability-text`) and a `Check against` ProjectPicker.
   - With a chosen project: the FitPill, `fit-text` (`{fitText} for {name}, materials needed from {startText}. {storageText}.`) and the TimelineStrip, moved up here from the lower Timeline section.
   - With no project: `Against your projects` and one row per `byProject` entry (FitPill, name, `needed from {startText}`). The wrapper has testid `fit-text`.
   - IndicativeMarker in both cases.
5. **Sustainability**: content as today.
6. **Key facts**: Quantity, Mass, Condition, Test status, Location, Collection point.
7. **Clients only, `guide-price`**: as today.
8. Full width below: **Specification**, then two columns: **Location and collection** (the Seller row and the line `The seller and the exact site are shared with the client once a reservation is accepted.` for clients only) and **Geometry files** (rows DXF, OBJ, `BIM model` with `IFC4, opens in Revit and other BIM tools` and testid `download-ifc`, and BIM family locked with testid `bim-family`), with the footnote L42.
9. **Similar materials**: the link label `Browse the Marketplace`.
- The old separate Timeline section is removed (its content is in point 4).
- IFC download toast: `Downloaded {filename}`, description `BIM model, in millimetres.`

### 7.4 `src/ui/ModelViewer.tsx` (new design-system component, imported directly, so `ui/index.ts` is not edited)
- Props: `{ mesh: Mesh; family: FamilyId; title: string; size?: 'stage' | 'thumb'; angles?: ViewAngles; onAnglesChange?; testId? }`.
- An SVG with viewBox 640 by 480 (thumb 120 by 90). `role="img"` with aria-label `3D view of {title}` on the svg. The wrapper is `tabIndex=0` with `aria-roledescription="3D viewer"` and `aria-describedby` pointing to the caption.
- It renders the soft shadow ellipse (ink at 0.08), then each projected face as a polygon filled with `shadeHex(FAMILY_TONE[family], light)` and stroked with `shadeHex(..., light * 0.7)` at 0.75px.
- `FAMILY_TONE` (a const in the component): steel `#6b7a86`, curtain_wall `#9fb7c4`, precast `#b9b6ae`, stone `#d9cfbb`, brick `#a6553b`, raised floor `#8d9399`.
- Pointer drag uses `dragToAngles` with rAF throttling and pointer capture. `touch-action: pan-y` keeps vertical page scroll on phones. Arrow keys use `stepAngles` and Home resets.
- `data-yaw` and `data-pitch` attributes are set for tests. The thumb size is static (no interaction).

### 7.5 Other copy (`features/saved/Saved.tsx`)
`Browse the Marketplace`.

## 8. Copy strings
British English, sentence case, no dashes, no arrow, tick or comparison characters.
- Marketplace: `Marketplace`, `All listings`, `Shared with you`, `Browse by category`, `Structure`, `Envelope`, `Finishes`, `Steel sections, timber and the frame`, `Facades, cladding, brick and glazing`, `Floors and interior finishes`, `{n} materials`, `1 material`, `Nothing listed yet`, `{n} in time for {project}`, `All categories`, `All`, `All materials`, `New for your projects`, `New for {project}`, `In time for {project}`, `In time for {n} of your projects`.
- Checking: `Check materials against a project`, `See which arrive in time for its start on site.`, `Choose a project`, `Create a project to check materials against its start on site.`, `New project`, `Checking against {project}`, `Materials needed from {date}`, `{n} available now`, `{n} in time`, `{n} tight`, `{n} too late`, `Only show what arrives in time`, `Change project`, `Stop checking against {project}`, `Check availability against a project start`, `No project`, `Browse without a timeline check`.
- Availability: `Available now`, `Expected {Month YYYY}`, `Expected {Month} to {Month YYYY}`, `Available by`, `Any time`, `By the end of {Month YYYY}`, `{n} of {total} materials`, `{project} start`, `Against your projects`, `needed from {date}`.
- Sort: `Newest listed`, `Most carbon avoided`, `Lowest guide price` (clients only).
- Material: `3D view`, `Generated from the recorded dimensions. Drag or use the arrow keys to turn it.`, `Shown {n} mm long so the section reads. The download is the full {n} mm.`, `Show full length`, `Show close up`, `Reset view`, `3D view of {title}`, `Panel depth is a placeholder, not a recorded dimension.`, `BIM model`, `IFC4, opens in Revit and other BIM tools`, `BIM model, in millimetres.`, `Geometry files`, `Browse the Marketplace`.
- Help, Methodology (shared file): add `Availability is shown as the month or the three-month window the owner discloses, never the exact date.` and `3D views and the DXF, OBJ and IFC files are generated from the recorded dimensions, with square corners. Panel depths for curtain walls and raised floors are placeholders.`

## 9. Indicative and labels
- IndicativeMarker on: the checking strip, the material page Availability block, Sustainability, and the guide price (clients).
- The slider counts are not estimates, so they carry no marker.
- The 3D caption and every geometry file carry L42. The IFC also carries L20 (project description and property set).

## 10. Privacy (P3)
- Every new view model (folders, thumbs, feed, fit summary, scale, model meshes, IFC) is built from `listingOf`, which goes through `toPublicListing`, or from the viewer's own projects. No new projection is needed.
- In `src/test/privacy.platform.test.ts`, `buyerViews` adds `sel.geometryFile(s, v, id, 'ifc')` and `sel.discoverView(s, v, { ...DEFAULT_DISCOVER_QUERY, typology: 'structure' })`, plus `projectId: p.id` landing views per project, so folders and the feed are scanned for every buyer.
- A new assertion: `materialView` for Priya and Marcus has `price === null` and `sellerLine === null`, and its JSON has no `sellerType` outside `listing`. The IFC text for every lot contains no `lotPrivateStrings` and no `£`.

## 11. Tests to add or change
- Unit (new): `availability.test.ts`, `view3d.test.ts`, `ifc.test.ts`, `marketplace.test.ts`, and additions to `geometry.test.ts` (all as above).
- Unit (changed by decision, recorded here): `specSheet.test.ts` (3 expected strings), `arch-selectors.test.ts` (checkingProjectFor default null, Isla null, breadcrumb label), `views.test.ts` (Discover price sort for Isla, the material page seller and price by role, nav titles, line 237 availability phrase).
- Screen (`src/app/app.test.tsx`):
  - "lists the projects as folders and the marketplace as cards" now expects `category-structure`, `category-envelope` and `category-finishes` with the texts `11 materials`, `5 materials` and `1 material`, 17 cards in `discover-grid`, and `checking-bar` containing `Check materials against a project`. It no longer expects the results line to say `Timeline checked against`.
  - New: choosing `pick-{MERROWGATE}` in the strip shows `Checking against Merrowgate Wharf` and `7 in time`.
  - New: clicking `category-envelope` pushes `type=envelope` and shows 5 cards and `family-chip-clay_brick`.
  - Material page for Priya: `fit-text` contains `Merrowgate Wharf` (from byProject), there is no `seller-line` and no `guide-price`, `bim-family` is still locked, the `model-viewer` svg has at least 3 polygons, ArrowRight on the viewer changes `data-yaw` from -35 to -20, and clicking `download-ifc` creates a blob containing `FILE_SCHEMA(('IFC4'))` and `IFCBEAM(`.
  - New: Isla's material page shows `seller-line` and `guide-price`.
  - New: the Filters slider moved to position 3 sets `by=2027-01-31` in the address and shows 16 cards.
- e2e (`e2e/journeys.spec.ts`):
  - In journey 1, after `nav-discover`: expect `Marketplace` as the heading and `category-structure` visible, then choose Merrowgate Wharf in `checking-bar` before opening L-9F4CQQ.
  - On the material page: expect no `guide-price` and drag `model-viewer` (mouse down, move 120px, up) and check that `data-yaw` changed.
  - Download IFC: the file starts with `ISO-10303-21;` and contains `IFCBEAM(` and not `prototype`.
  - Later, as Isla, open `/app/discover/L-9F4CQQ` and see `guide-price`.
  - In "Discover and Capture fit a phone", add `/app/discover?type=structure` and the open Filters sheet to the no-overflow loop.

## 12. Order of work
1. Domain: `availability.ts`, `view3d.ts`, the `geometry.ts` additions, `ifc.ts`, the `specSheet.ts` line, and their tests.
2. Selectors: `marketplace.ts`, `discover.ts`, `arch-discover.ts`, `common.ts` field, and the test updates.
3. `ui/ModelViewer.tsx`.
4. Marketplace screens: CheckingBar, CategoryFolders, NewForProjectsRow, FamilyChips, AvailabilitySlider, then Discover.tsx, DiscoverFilters.tsx, ProjectPicker.tsx, ListingTile.tsx and useDiscoverQuery.ts (push option).
5. Material page and gallery.
6. Label edits in the shared files (coordinated), app.test, the privacy test, e2e.

## Files changed
src/domain/engines/geometry.ts
src/domain/engines/geometry.test.ts
src/domain/engines/specSheet.ts
src/domain/engines/specSheet.test.ts
src/store/selectors/discover.ts
src/store/selectors/arch-discover.ts
src/store/selectors/arch-selectors.test.ts
src/store/selectors/common.ts
src/store/selectors/views.test.ts
src/features/discover/Discover.tsx
src/features/discover/DiscoverFilters.tsx
src/features/discover/ProjectPicker.tsx
src/features/discover/ListingTile.tsx
src/features/discover/useDiscoverQuery.ts
src/features/material/MaterialPage.tsx
src/features/material/MaterialGallery.tsx
src/features/saved/Saved.tsx
src/app/app.test.tsx
src/test/privacy.platform.test.ts
e2e/journeys.spec.ts
src/store/selectors/nav.ts
src/app/navIcons.ts
src/store/selectors/arch-breadcrumbs.ts
src/store/selectors/search.ts
src/store/selectors/architect.ts
src/store/selectors/project.ts
src/features/home/ArchitectHome.tsx
src/features/help/Help.tsx
src/features/public/Landing.tsx

## Files new
src/domain/engines/availability.ts
src/domain/engines/availability.test.ts
src/domain/engines/view3d.ts
src/domain/engines/view3d.test.ts
src/domain/engines/ifc.ts
src/domain/engines/ifc.test.ts
src/store/selectors/marketplace.ts
src/store/selectors/marketplace.test.ts
src/ui/ModelViewer.tsx
src/features/discover/CheckingBar.tsx
src/features/discover/CategoryFolders.tsx
src/features/discover/NewForProjectsRow.tsx
src/features/discover/FamilyChips.tsx
src/features/discover/AvailabilitySlider.tsx

## Shared
src/store/selectors/common.ts (ListingCard gains availabilityShort; other clusters may also edit this file)
src/store/selectors/views.test.ts (Discover, material, nav titles and line 237 sections; dashboards, sidebar and owner clusters also edit it)
src/app/app.test.tsx (shell and Discover, and material page describe blocks only)
src/test/privacy.platform.test.ts (buyerViews additions: ifc geometry, landing and folder views; every cluster adding views edits buyerViews)
e2e/journeys.spec.ts (journey 1 Marketplace and material steps, the Isla price check, the phone loop)
src/store/selectors/nav.ts (label Marketplace, icon Store; the sidebar cluster adds project filtering here)
src/app/navIcons.ts (add Store icon)
src/store/selectors/arch-breadcrumbs.ts (section label Marketplace)
src/store/selectors/search.ts (page keywords include discover and marketplace)
src/store/selectors/architect.ts (owned by the dashboards cluster: replace the inline new-for loop with newForProjectsFeed(state, viewer, null) and re-export NEW_LISTING_DAYS and NEW_LISTING_LIMIT)
src/features/home/ArchitectHome.tsx (owned by the dashboards cluster: remove the New for your projects row and the 'Discover' labels; optionally a count link to /app/discover)
src/store/selectors/project.ts (owned by the projects cluster: next-step copy 'in the Marketplace')
src/features/help/Help.tsx (Getting started card renamed; two Methodology lines on availability wording and generated geometry)
src/features/public/Landing.tsx (owned by the overall-look cluster: Discover becomes Marketplace in the role line and the mock)
src/domain/engines/specSheet.ts (availabilityText wording also changes the specification export owned by the projects cluster)
src/ui/TimelineStrip.tsx (not edited by this cluster; the projects cluster owns it and may add an optional caption override so the window reads as the availability phrase)
BRIEF.md sections 3, 5 and 14 (lead)

## Deps


## Open questions
- Should the URL move from /app/discover to /app/marketplace now that the label is Marketplace? REC: Not in this round. Keep /app/discover. If wanted later, add /app/marketplace as the canonical path with a redirect from /app/discover/* that keeps the query and publicId, so links already stored in persisted sandboxes keep working, and switch every href builder in a single pass.
- Should consultants also lose the guide price and seller details, or only architects as the note says? REC: Hide both for consultants too. They are not buying, and fewer price figures outside the client side match decision rights. Clients keep price and seller type.
- Should the price be removed from the architect's data entirely, with a new projection without price, rather than just nulled in the view model? REC: No. Price is a public listing field, so this is a product display decision, not a P3 privacy rule. Nulling it in materialView and removing the price sort is enough and avoids retyping ListingCard across every cluster.
- Owners still choose 'quarter' or 'month' as the disclosure timing level. Should the owner-side wording change too? REC: Yes, for the owner cluster. Label the options 'Month' and 'Three-month window', and change the ListingEditor hint to 'Buyers see it as a month or a three-month window, as set in your disclosure settings.' Keep the stored TimingLevel values.
- Should the project programme timeline (projects cluster) and the seller-side blind buyer line ('needed by Q2 2028') also drop quarter labels? REC: Programme bars: yes, reuse availabilityPhrase for bar captions. Blind buyer line: change it to a month range too only if the owner cluster agrees, since toBlindBuyer is a privacy projection with its own tests. Use the same phrase function on projectRef need-by windows.
- Should IFC validity be checked automatically in CI? REC: No new dependency. Rely on the structural unit tests (header, references, IFC4 attribute counts, GUID format, placements) and record a one-off manual check with IfcOpenShell's validator and a Revit import in docs/EVIDENCE or the README.
