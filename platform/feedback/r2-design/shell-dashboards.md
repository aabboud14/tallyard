# shell-dashboards

## Decisions
- **The name and the address agree, and old links still work: notifications and activity already stored in a visitor's sandbox, bookmarks, and the seeded hrefs. routeAccess treats 'discover' exactly like 'marketplace' so the redirect is reached before the access gate can refuse it.**: Discover is renamed Marketplace everywhere a person reads it, and its address moves to /app/marketplace and /app/marketplace/:publicId. /app/discover and /app/discover/:publicId stay as redirects that keep the query string.
- **This is the smallest rename. Renaming folders and types would touch every file the marketplace cluster is also rewriting and would cause merge conflicts for no gain to users.**: Code identifiers keep the old name: features/discover/*, discoverView, DiscoverQuery, useDiscoverQuery, the discover-grid and discover-search test ids. Only user-facing strings, routes, the nav item id (so nav-discover becomes nav-marketplace) and the search palette key change.
- **Otherwise the page title and its own tab would have the same name.**: Inside the Marketplace page, the first tab used to be called 'Marketplace'. It is now 'All materials'. The test id tab-all does not change.
- **This follows the partner's note and keeps a pointer on the home. The row appears only on the unfiltered landing of the All materials tab, after the category folders that the marketplace cluster is adding.**: The architect home no longer shows the 'New for your projects' feed. The feed becomes a row in the Marketplace (NewForProjectsRow, fed by the newForProjectsView selector). In its place, each project card on the home shows a link such as '3 new materials fit', which opens the Marketplace checked against that project.
- **Read literally from the note, and the vocabulary stays the same on every architect surface.**: Everywhere the architect sees it, 'Waiting on your client' becomes 'Waiting for approval': the home section, the sent hint on the shortlist column, and the progress legend ('with client' becomes 'waiting for approval'). The client's own wording 'Waiting for your decision' does not change.
- **This answers 'filterable alphabetically or by client'. It is UI state, like checkingProjectId, so no activity or notification is recorded. The default changes the order the existing nav test expects; that is an intentional change to the spec, not a weaker test.**: Projects in the sidebar are sorted by name, A to Z, by default. A small menu next to the Projects title offers three orders (Name A to Z, Client grouped under client subheadings, Recent activity) and a client filter. The choice is kept per person in the persisted store under ui.navProjects. The arranging is a pure, tested function, arrangeNavProjects.
- **The partner said the dashboards were text-heavy. A per-viewer convenience belongs in browser storage, as with the sidebar's open folders. Every read and write is wrapped in try and catch.**: Recent activity is collapsible on every dashboard through one shared CollapsiblePanel and an ActivityPanel wrapper. It starts collapsed and shows a one-line summary (the count and the latest entry). Whether a panel is open is remembered per panel id in localStorage, under the key tallyard-platform-v1-panels.
- **There are no real photos, and photos must not be faked. A technical drawing style (ink hairlines, flat material fills, hatching, no glow) reads as architecture rather than as AI art, and it tells the product's story of buildings coming down feeding buildings going up. Thumbnails always use the generated material illustration, never IndexedDB photos, so the dashboards render synchronously.**: Project and building thumbnails are generated axonometric line drawings built from data: the building's use, its storeys when recorded, its frame, and the facade materials from the families on the shortlist or in the inventory. Projects are drawn going up, with a crane and an exposed top frame. Donor buildings are drawn standing, with scaffold on one face. Three material swatches sit along the bottom edge.
- **Run through the dataviz validator. The status palette (approved against declined, protan ΔE 7.2) sits in the floor band, so status charts always have 2 px gaps and a labelled legend.**: Typology colours are structure #2f6aa3 (steel blue), envelope #c0603a (brick) and finishes #d2a73c (ochre). They pass the palette validator across all pairs: deutan ΔE 15.4 and normal-vision ΔE 18.2. Ochre is below 3:1 contrast against white, so every typology chart carries a text legend with values.
- **The seed has no honest week-by-week series: all captures fall on one day and few items are dated. A trend line would invent a story.**: There are no sparklines. The metric tiles use donuts, progress rings, segmented bars and target meters.
- **The owner, surveyor and consultant clusters are rewriting those three files, so building on top of them avoids conflicts. The old selectors stay, are still used and are still tested.**: The owner, surveyor and consultant dashboards are new selectors in new files (home-owner.ts, home-surveyor.ts, home-consultant.ts). Each extends the existing ownerHome, surveyorHome and consultantHome results instead of editing owner.ts, surveyor.ts or consultant.ts. architectHome in architect.ts is changed in place.
- **The partner liked the homepage structure and found the graphics 'a bit AI-ish'. OneClickLCA could not be fetched (DNS failure), so the visual cues come from what is known of it: real product UI with charts at the front, confident colour-coded figures, a credibility band and architectural subject matter. No real company is named in the UI.**: The landing page keeps its structure (hero, product, who it is for, how it works, principles, call to action). It drops the radial glows, the masked grid and dot backgrounds, the blurred halo and the floating overlay cards. It gains a two-column hero with an architectural drawing of a building coming down beside one going up, a band of true product facts, a product shot of the new architect dashboard, and How it works panels styled as drawing sheets with title blocks.
- **The cards get a sense of programme without depending on the project cluster's stage dates. If that cluster adds a currentStage derived from dates, the strip takes that value instead.**: Each project card and the consultant's rows show a compact strip of RIBA stages 0 to 7 built from the existing project.ribaStage. The 'Your projects' section carries one Indicative marker that covers the timeline checks and carbon figures.

## Spec
# 14.1 Look, shell and dashboards (cluster: shell-dashboards)

Answers the review notes under "Overall look and architect dashboard", and the dashboard parts of every role's notes. The client home layout is designed by the client cluster; this section gives it the shared components.

## A. Rename map: Discover becomes Marketplace

### A1. Routes
| Before | After |
|---|---|
| `/app/discover` | `/app/marketplace` (same lazy `Discover` page) |
| `/app/discover/:publicId` | `/app/marketplace/:publicId` (same `MaterialPage`) |
| `/app/discover...` (legacy) | `<LegacyMarketplaceRedirect/>` in `src/app/redirects.tsx`: `<Navigate to={marketplacePathFor(pathname) + search + hash} replace />` |

New module `src/store/paths.ts` (pure, tested). Every href in the store, seed, selectors and features is built through it:
```ts
export const MARKETPLACE_PATH = '/app/marketplace'
export function marketplaceHref(projectId: string | null = null, extra: Record<string, string> = {}): string
// '/app/marketplace', '/app/marketplace?project=prj_x', with extra params in insertion order
export function materialHref(publicId: string, projectId: string | null = null): string
// '/app/marketplace/L-9F4CQQ' or '/app/marketplace/L-9F4CQQ?project=prj_x'
export function sharedWithProjectHref(projectId: string): string   // '/app/marketplace?tab=shared&project=prj_x'
export function marketplacePathFor(legacyPath: string): string
// '/app/discover' gives '/app/marketplace'; '/app/discover/L-1' gives '/app/marketplace/L-1'; anything else unchanged
```
`src/features/discover/links.ts`: `listingHref` delegates to `materialHref`. `discoverHref` is renamed `marketplaceHref`, re-exported from store/paths, and every caller is updated.

`routeAccess` (nav.ts): `if (section === 'marketplace' || section === 'discover') { ...existing discover rules... }`.
`pageLocation` SECTION_LABELS: add `marketplace: 'Marketplace'` and set `discover: 'Marketplace'`. The material crumb branch matches both sections.

### A2. Strings (every user-visible occurrence)
| File | Before | After |
|---|---|---|
| store/selectors/nav.ts | `item('discover','Discover','/app/discover','Compass')` | `item('marketplace','Marketplace',MARKETPLACE_PATH,'Store')`; add `'Store'` to NavIcon and to NAV_ICONS (lucide `Store`) |
| app/SearchPalette.tsx | `'page:discover': Compass` | `'page:marketplace': Store` |
| store/selectors/search.ts | page keywords = label | add `PAGE_KEYWORDS = { marketplace: 'marketplace discover browse materials' }` so typing 'discover' still finds it |
| features/discover/Discover.tsx (marketplace cluster's file) | h1 `Discover`; tab label `Marketplace` | h1 `Marketplace`; tab label `All materials` |
| features/material/MaterialPage.tsx (marketplace cluster) | back link to `/app/discover` | `MARKETPLACE_PATH`, text `Back to the Marketplace` |
| features/home/ArchitectHome.tsx | `Discover materials`, `Find materials in Discover`, `Browse materials first`, `Waiting on your client` | `Marketplace`, `Find materials in the Marketplace`, `Browse the Marketplace`, `Waiting for approval` |
| features/projects/NewProjectDialog.tsx | `Find materials for it in Discover.` | `Find materials for it in the Marketplace.` |
| features/projects/Shortlist.tsx | empty text `...from Discover.`; `sent: (client) => Waiting on ${client}` | `...from the Marketplace.`; `sent: (client) => Waiting for approval from ${client}` |
| features/projects/ProjectParts.tsx | PROGRESS sent `label 'with client', name 'With client'` | `'waiting for approval'`, `'Waiting for approval'` |
| features/saved/Saved.tsx | `save it here from Discover`, `Browse Discover` | `save it here from the Marketplace`, `Browse the Marketplace` |
| features/help/Help.tsx | `Browse Discover`, `Open Discover`, href | `Browse the Marketplace`, `Open the Marketplace`, `MARKETPLACE_PATH` |
| store/selectors/project.ts nextSteps | `Find materials for this project in Discover` | `Find materials for this project in the Marketplace`, href `marketplaceHref(projectId)` |
| store/actions/owner.ts | body `They are in Discover, under Shared with you.`; hrefs | `They are in the Marketplace, under Shared with you.`; `materialHref`, `sharedWithProjectHref` |
| store/actions/projects.ts | terms href | `sharedWithProjectHref(projectId)` |
| sandbox/seed.ts | 3 hrefs | `sharedWithProjectHref`, `materialHref` |
| store/selectors/search.ts | material href | `materialHref(publicId)` |
| features/public/Landing.tsx | tools `Discover`; mock nav and title `Discover` | `Marketplace` (the mock is replaced, see E) |
| ui/Gallery.tsx | `Discover` samples, `Browse Discover` | `Marketplace`, `Browse the Marketplace` |

### A3. Tests and selectors affected
- views.test.ts nav titles: `['Home','Marketplace','Saved']`. Route access expects `/app/marketplace/L-9F4CQQ` ok and `/app/marketplace/L-DAXNV3` forbidden; keep the `/app/discover/...` lines as legacy checks (the same answers). `searchEntries(priya,'discover')[0]` has href `/app/marketplace`; material hrefs are `/app/marketplace/...`.
- arch-selectors.test.ts: crumbs `['Marketplace', 'UB 457x191x67, 7.5 m']` for both `/app/marketplace/L-9F4CQQ` and `/app/discover/L-9F4CQQ`; search href `/app/marketplace/L-Q23X7N`.
- app.test.tsx: open `/app/marketplace` and `/app/marketplace?tab=shared`; `isActive('/app/marketplace/L-9F4CQQ','/app/marketplace',null)` is true; new test: opening `/app/discover/L-9F4CQQ?project=prj_hp23zk` lands on pathname `/app/marketplace/L-9F4CQQ` with search `?project=prj_hp23zk`.
- owner.test.ts: `n.href` is `/app/marketplace/${lot.publicId}`.
- e2e/journeys.spec.ts: `nav-discover` becomes `nav-marketplace`; `**/app/marketplace/L-9F4CQQ**`; the new practice opens `/app/marketplace`; the phone test paths become `/app/marketplace`, `/app/marketplace?tab=shared`, `/app/marketplace/L-9F4CQQ`; rename the test to 'Marketplace and Capture fit a phone'.

## B. Design system uplift

### B1. Tokens (`src/styles.css` @theme, append)
```
--color-chart-structure: #2f6aa3;  --color-chart-envelope: #c0603a;  --color-chart-finishes: #d2a73c;
--color-chart-neutral: #cdc8c4;  --color-chart-brand: #2d8064;  --color-chart-info: #4f7fe8;
--color-chart-warning: #d08a2c;  --color-chart-danger: #c94a43;  --color-chart-track: #efeeed;
```
`src/ui/charts/tones.ts`:
```ts
export const TONE_FILL: Record<Tone, string>  // the five chart colours above; Progress.tsx imports it instead of its local `fills`
export const TONE_CHIP: Record<Tone, string>  // 'bg-brand-50 text-brand-700 ring-brand-100' etc, the same set as the pills
export const TYPOLOGY_FILL: Record<Typology, string> = { structure: '#2f6aa3', envelope: '#c0603a', finishes: '#d2a73c' }
export const CHART_TRACK = '#efeeed'
export const CHART_GAP = 2
```
Rules: colour follows the entity, never its rank. Status colours are used only for status, always with a word. Every chart with two or more series has a legend with values. Marks are thin: rings 6 to 8 px, bars 6 px with 4 px rounded data ends, 2 px surface gaps between segments.

### B2. New components (`src/ui/charts/*`, all exported from `src/ui/index.ts`)
All of these draw only; any figure comes in as a prop. SVG coordinates are the only arithmetic (P2).
```ts
MetricGrid({ children, className })   // grid-cols-2, xl:grid-cols-4, gap-3 sm:gap-4
MetricTile({ label: string; value: ReactNode; unit?: ReactNode; sub?: ReactNode; tone?: Tone; icon?: LucideIcon;
  chart?: ReactNode; indicative?: boolean; href?: string; status?: { label: string; icon: LucideIcon; tone: Tone } | null;
  testId?: string; className?: string })
```
MetricTile layout: a Card at padding 16/20 with a `[minmax(0,1fr)_auto]` grid. Left column: a 28 px icon chip in `TONE_CHIP[tone]`, the label (text-sm ink-soft), the value (text-3xl semibold tabular, ink, never the tone colour), the unit (muted), the sub (text-sm muted), and the IndicativeMarker when `indicative`. Right column: `chart`, vertically centred, hidden below 640 px. When `status` is set (warning or danger only), the border becomes `border-warning-line` or `border-danger-line` and a Pill with icon and word sits under the value. When `href` is set, the whole tile is a link (after:inset-0), with a focus ring through has-[a:focus-visible].
```ts
Donut({ segments: { key: string; label: string; value: number; colour: string }[]; label: string; size?: 48 | 56 | 72; thickness?: number; centre?: ReactNode })
// role="img", aria-label "<label>: Shortlisted 6, Waiting for approval 3, Approved 4". All zero: a full ring in CHART_TRACK.
// Each segment is an arc stroke with a CHART_GAP surface gap.
ProgressRing({ value: number; max: number; label: string; valueText: string; tone?: Tone; size?: 48 | 56 | 72; thickness?: number; centre?: ReactNode })
// role="img", aria-label "<label>: <valueText>". max 0 draws the track only.
BarList({ caption: string; scaleMax: number; rows: { key: string; label: ReactNode; href?: string; value: number; valueText: string;
  secondary?: { value: number; valueText: string } | null; colour?: string }[]; legend?: { label: string; colour: string }[] })
// A <table> (visually hidden caption), one row per entry: label, a 6 px bar (aria-hidden) with the secondary value as a lighter
// track behind the primary, and valueText right-aligned. The text carries the meaning; the bars are decoration.
TargetMeter({ label: string; share: number; actualText: string; targetText: string | null;
  status: 'met' | 'below' | 'no_target' | 'no_data'; statusText: string })
// A label row (label left, "actualText of targetText" right), a 6 px bar filled to share (0 to 1) with a 1 px ink target tick at
// the end of the track, and a Pill: met brand (CircleCheck), below warning (TriangleAlert), no_target or no_data neutral (Minus).
Legend({ items: { label: string; colour: string; valueText?: string }[]; className?: string })
RibaStageStrip({ stage: number; labels: readonly string[]; showLabel?: boolean; size?: 'sm' | 'md' })
// 8 cells for stages 0 to 7 with 2 px gaps: done brand-200, current brand-600, ahead subtle with a line-soft ring.
// role="img", aria-label "RIBA stage 2 of 7, Concept Design". showLabel prints "Stage 2, Concept Design".
```
`src/ui/CollapsiblePanel.tsx`:
```ts
CollapsiblePanel({ id: string; title: string; summary?: ReactNode; defaultOpen?: boolean; actions?: ReactNode; children: ReactNode; testId?: string })
```
The header is a full-width button, 44 px tall on phones, with `aria-expanded` and `aria-controls`; a ChevronDown rotates 180 degrees when open; the summary shows only while collapsed. The body has `id={`${id}-body`}` and the `hidden` attribute when closed. The open state comes from `usePersistentToggle(id, defaultOpen)` in `src/ui/usePersistentToggle.ts`, which reads and writes a JSON map in localStorage under `tallyard-platform-v1-panels`, wrapped in try and catch; with blocked storage it falls back to in-memory state.

### B3. Illustrations (`src/ui/illustration/*`)
`src/domain/sketch.ts` (pure, tested) holds what to draw:
```ts
export type FacadeKind = 'brick' | 'stone' | 'glass' | 'precast' | 'timber'
export type SketchUse = 'office' | 'hotel' | 'residential' | 'industrial' | 'other'
export type BuildingSketch = { seed: string; use: SketchUse; storeys: number | null; frame: 'steel' | 'concrete' | 'timber' | 'masonry' | 'unknown';
  facades: FacadeKind[]; state: 'existing' | 'proposed'; label: string }
export function facadeOf(family: FamilyId): FacadeKind | null
// clay_brick brick; stone_cladding stone; curtain_wall glass; precast_cladding precast; timber_joist timber; steel_section null; raised_floor null
export function frameFromText(structureType: string): BuildingSketch['frame']
// /steel/i steel; /concrete|precast|reinforced/i concrete; /timber|glulam|clt/i timber; /brick|masonry|load-bearing/i masonry; else unknown (first match in that order)
export function sketchUse(projectType: string): SketchUse   // office, hotel, residential map to themselves; /industr|warehouse|logistic/ industrial; anything else other
export function rankFamilies(families: FamilyId[]): FamilyId[]  // distinct, by count descending, ties in FAMILY_IDS order
export function projectSketch(p: { id: string; name: string; projectType: string }, families: FamilyId[]): BuildingSketch
// state 'proposed', storeys null, frame steel if steel_section is present, timber if timber_joist, else unknown;
// facades = up to 3 from rankFamilies mapped through facadeOf.
// label: 'Illustration of an office project, drawn from its shortlisted materials', or without a shortlist 'Illustration of an office project'
export function buildingSketch(b: { id: string; storeys: number | null; structureType: string }, families: FamilyId[]): BuildingSketch
// state 'existing', storeys = b.storeys, frame = frameFromText; label 'Illustration of a 7 storey building, drawn from its survey'
// ('Illustration of a building, drawn from its survey' when storeys is null)
```
`src/ui/illustration/massing.ts` (drawing geometry only, tested for determinism and bounds):
```ts
export const SKETCH_BOARD = { width: 320, height: 200 } as const
export function axo(x: number, y: number, z: number): [number, number]   // 30 degree axonometric: sx = (x - y) * 0.866, sy = (x + y) * 0.5 - z, then offset to the board
export type Massing = { storeys: number; blocks: { x: number; y: number; w: number; d: number; h: number; storeyH: number; facade: FacadeKind | 'plain' }[]; bays: number; crane: boolean; scaffold: boolean }
export function massingFor(s: BuildingSketch): Massing
```
Drawn storeys are `clamp(s.storeys, 2, 12)` when recorded. Otherwise they are drawn from `rngFor(s.seed)` within the use's range: office 6 to 9, hotel 7 to 10, residential 4 to 6, industrial 2 to 3, other 3 to 5. These numbers are drawing variation only and are never shown. Office gets one block; hotel a tall block on a two-storey podium; residential two blocks offset; industrial one wide low block. Facades cycle through the storeys in bands (none gives plain). `crane = state === 'proposed'`; `scaffold = state === 'existing'`.

`BuildingIllustration({ sketch, className, decorative = false })`: an SVG with viewBox 320 by 200, `role="img"` and `aria-label={sketch.label}` (or `aria-hidden` when decorative).
- Style: ground `#f2efea` with a 0.75 px kerb line and three stroked tree circles. Ink `#292524` at 0.75 px for outlines and 0.5 px for joints. Faces are flat fills: the left face is the facade colour, the right face multiplies it to 85 percent, and the roof is `#f7f5f1`.
- Facade fills: brick `#b5654a` with coursing every 3 px at 0.15 opacity; stone `#e6ddc8` with storey and vertical joints; glass `#9db7c9` with mullions per bay and one pale diagonal reflection; precast `#cfcbc3` with panel reveals; timber `#c49a6c` with vertical boards; plain `#e7e5e4`.
- A steel frame adds ink columns at the corners and the bay lines. A proposed building leaves its top storey as frame only and has a 1 px tower crane. An existing building has a scaffold grid at 0.4 opacity on its right face.
- No gradients, glows or blur.

`src/ui/Thumbnails.tsx`:
```ts
type ThumbMaterial = { publicId: string; spec: Spec }
ProjectThumbnail({ sketch, materials = [], aspect = '16/10', rounded = 'none', className })
BuildingThumbnail({ sketch, aspect = '16/10', rounded = 'none', className })
```
Both frame the drawing (`bg-[#f2efea]`, `ring-1 ring-inset ring-black/[0.06]`). ProjectThumbnail adds up to 3 swatches at bottom-left, 28 px squares of `MaterialIllustration` with a 2 px white ring, inside an `aria-hidden` wrapper, so the thumbnail has one accessible name: the sketch label.

`src/ui/illustration/spots.tsx`: `SpotIllustration({ kind: 'project' | 'building' | 'materials' | 'inbox' | 'targets' | 'search' | 'activity'; className })` draws 120 by 88 line spots with 1.25 px ink-soft strokes and one flat accent (brand-100 or a material colour), always `aria-hidden`. They are, in order: a site plan with a dashed plot, an axonometric outline, stacked I beams, a pallet tray, a section with target ticks, a lens over swatches, and a dotted timeline. `EmptyState` gains `illustration?: SpotKind`. For the page and card variants it replaces the icon and the concentric rounded frames; the inline variant is unchanged.

Gallery (`/__ui`) gains three sections: "Data" (every chart component with sample figures), "Thumbnails" (all five uses in both states, and every facade) and "Empty states" (every spot).

## C. Shell: sidebar project filter

`src/store/types.ts`:
```ts
export type NavProjectOrder = 'name' | 'client' | 'recent'
export type NavProjectView = { order: NavProjectOrder; clientOrgId: string | null }
export const DEFAULT_NAV_PROJECT_VIEW: NavProjectView = { order: 'name', clientOrgId: null }
// UiState gains: navProjects?: Record<string, NavProjectView>   (per user id); DEFAULT_UI gets navProjects: {}
```
`src/store/app.ts`:
- Add `setNavProjectView: (patch: Partial<NavProjectView>) => void`, which merges the patch into `ui.navProjects[sessionUserId]` (with DEFAULT_NAV_PROJECT_VIEW as the base) and does nothing when signed out.
- The persist `merge` becomes `{ ...current, ...dataOf(p), ui: { ...DEFAULT_UI, ...p.ui } }` so older stored states get the new field.

`src/store/selectors/nav-projects.ts` (pure):
```ts
export type NavProjectInput = { id: string; name: string; clientOrgId: string; clientName: string; lastActivityAt: string | null }
export type NavProjectGroup = { label: string | null; clientOrgId: string | null; ids: string[] }
export type ArrangedProjects = { groups: NavProjectGroup[]; clients: { orgId: string; name: string; count: number }[]; effective: NavProjectView; shown: number; hidden: number }
export function arrangeNavProjects(projects: NavProjectInput[], view: NavProjectView): ArrangedProjects
```
Rules:
- Names compare with `localeCompare(b, 'en-GB', { sensitivity: 'base', numeric: true })`.
- `clients` are the distinct clients, sorted by name.
- An unknown `clientOrgId` is treated as null, and `effective` reports what was actually applied.
- The client filter is applied first.
- `name`: one group with a null label, sorted by name.
- `recent`: one group, by `lastActivityAt` descending, nulls last, ties by name.
- `client`: one group per client, sorted by client name, labelled with the client's name, projects by name inside each.
- `hidden` = total minus shown.

`navModel` changes:
- `NavItem` gains `groupLabel: string | null`, and `item()` defaults it to null.
- `NavSection` gains `tools: { kind: 'projects'; view: NavProjectView; clients: ArrangedProjects['clients']; hidden: number; total: number } | null`.
- The project sections for architects, clients and consultants use arrangeNavProjects, with the view from `state.ui.navProjects?.[viewer.userId] ?? DEFAULT_NAV_PROJECT_VIEW` and lastActivityAt from the newest activity the viewer's organisation can read for that project.
- 'New project' stays last.

Sidebar UI:
- `src/app/sidebar/ProjectsMenu.tsx` puts an icon button (lucide ListFilter, 24 px, or 36 px below lg) to the right of the Projects title link, labelled `Sort and filter projects`, with test id `nav-projects-menu`. It shows only when the section has 2 or more projects.
- The menu has a label `Order` and a radio group: `Name, A to Z` (`nav-order-name`), `Client` (`nav-order-client`), `Recent activity` (`nav-order-recent`).
- When there are 2 or more clients, the menu also has a label `Client` and a radio group: `All clients` (`nav-client-all`), then each client with its count (`nav-client-<orgId>`).
- With a client filter on, a chip row sits under the title: the client name, an X button labelled `Show all clients` (`nav-client-filter-clear`), and the muted text `{n} more hidden`.
- In client order, a 20 px subheading (text-[11px] muted, `nav-group-<orgId>`) comes before each group's first item. The collapsed rail ignores groups.

## D. Dashboards: shared view helpers

`src/store/selectors/dashboard.ts` (pure, tested):
```ts
export type MetricTone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger'
export const STALE_SENT_DAYS = 7
export function waitingTone(count: number, oldestDays: number | null): MetricTone
// 0 neutral; oldestDays >= 7 warning; else info
export function fitCounts(fits: (Fit | null)[]): Record<Fit, number>   // nulls ignored
export function fitTone(c: Record<Fit, number>): MetricTone   // late > 0 danger; tight > 0 warning; in_time + now > 0 brand; else neutral
export function earliestStart<T extends { name: string; startDate: string }>(projects: T[], today: string): T | null
// earliest startDate on or after today, ties by name; null when none
export function typologyCounts(families: FamilyId[]): Record<Typology, number>
export type TargetProgress = { status: 'met' | 'below' | 'no_target' | 'no_data'; share: number }
export function targetProgress(actual: number | null, target: number): TargetProgress
// target <= 0 no_target share 0; actual null no_data share 0; share = min(1, actual / target); status actual >= target ? met : below
export type ActivitySummary = { count: number; latest: ActivityRow | null }
export function activitySummary(rows: ActivityRow[]): ActivitySummary
export type ThumbMaterial = { publicId: string; spec: Spec; title: string }
export function thumbsOf(rows: ShortlistRow[], limit = 3): ThumbMaterial[]
// from row.card.listing (public): approved first, then sent, then pending; declined left out
```
Shared feature pieces:
- `src/features/home/ActivityPanel.tsx`: `ActivityPanel({ panelId, rows, summary, emptyText, testId = 'activity-panel' })`. It wraps CollapsiblePanel with the title `Recent activity` around the kit's compact `ActivityFeed`. The collapsed summary reads `{n} updates. Latest, {timeAgo}: {actor} {text}` (one line, truncated), or `No activity yet`. The toggle's test id is `activity-toggle`. Panel ids are `home-activity-<role>`; the project cluster uses `project-activity`.
- The client cluster uses MetricGrid, MetricTile, Donut, ProgressRing, BarList, TargetMeter, Legend, RibaStageStrip, ProjectThumbnail and ActivityPanel, with `panelId 'home-activity-client'`.

## E. Screens, in priority order

### E1. Architect home (`ArchitectHome.tsx`, `store/selectors/architect.ts`)
View model (replaces the current one):
```ts
export type ProjectCardView = ProjectRef & { counts: Record<WishStatus, number>; total: number; href: string;
  fits: Record<Fit, number>; fitTone: MetricTone; sketch: BuildingSketch; materials: ThumbMaterial[];
  approvedT: number; liveT: number; newFits: number; marketplaceHref: string }
export type WaitingItem = { projectId; projectName; clientName; itemId; publicId; title; sentOn; daysWaiting; href;
  card: ListingCard }   // for MaterialPicture
export type ArchitectHome = {
  greeting: string; dateText: string
  stats: { activeProjects: number; shortlisted: number; avoidedApprovedT: number }   // unchanged
  metrics: { nextStart: { projectName: string; dateText: string } | null; byStatus: Record<WishStatus, number>;
    waiting: { count: number; oldestDays: number | null; tone: MetricTone };
    carbon: { approvedT: number; liveT: number; share: number; percentText: string } }
  projects: ProjectCardView[]            // order unchanged (projectsOfUser)
  carbonByProject: { id: string; name: string; href: string; approvedT: number; liveT: number }[]; carbonScaleMax: number
  waitingForApproval: WaitingItem[]      // renamed from waitingOnClient, oldest first
  activity: ActivityRow[]; activitySummary: ActivitySummary
}
```
Field rules:
- `fits` comes from `fitCounts` over the live rows' `card.fit`.
- `liveT` is `totals.all.avoidedT - totals.declined.avoidedT`.
- `newFits` counts `newListingsFor(...)` entries that fit this project.
- `share` is approvedT over the summed liveT, or 0. `percentText` is `f.percent(share)`.
- `carbonScaleMax` is the largest liveT, or 1.

Layout:
1. PageHeader: greeting, the date, then actions `Marketplace` (Store icon, secondary) and `New project` (primary, `home-new-project`).
2. MetricGrid, with test id `home-stats` (`home-stats-compact` goes; the grid is two-up on phones):
   - `Active projects`, FolderKanban, brand. Sub: `Next start on site {date}, {project}` or `No start dates ahead`.
   - `Materials shortlisted`, Layers, info. Donut of pending, sent and approved labelled Shortlisted, Waiting for approval and Approved, with a Legend below on sm and up. Sub: `Shortlisted, waiting or approved`.
   - `Waiting for approval`, Hourglass, `tone = metrics.waiting.tone`. Sub: `Oldest sent {n} days ago`, `Sent today` or `Nothing waiting`. When the tone is warning, status `{ label: 'Over a week', icon: Clock, tone: 'warning' }`. The href goes to the first waiting item's shortlist.
   - `Carbon avoided`, Leaf, brand, unit tCO2e, indicative. ProgressRing with valueText `{approved} of {live} tCO2e` and the centre showing percentText. Sub: `Approved, of {live} tCO2e on live shortlists`.
   - Test ids: `metric-projects`, `metric-shortlisted`, `metric-waiting`, `metric-carbon`.
3. Section `Your projects`. Actions: IndicativeMarker (it covers timeline checks and carbon) and the link `All projects`. Cards go 1, 2 (md) or 3 (xl) across, with test id `home-project-{id}`:
   - Top: ProjectThumbnail, 16/10, rounded top.
   - Then the name as an h3 link, `{client}, {type}`, `RibaStageStrip showLabel`, and `Materials needed from {date}`.
   - A row of fit pills, non-zero only, each with an icon and words from FIT: `{n} in time`, `{n} tight`, `{n} late`, `{n} available now`.
   - ProjectProgress.
   - Footer, when newFits > 0: the link `{n} new {material|materials} fit` (`home-new-fits-{id}`) to `marketplaceHref(id)`.
4. Two columns at xl (`1fr 380px`):
   - Left: Card `Waiting for approval` (Hourglass, test id `waiting-for-approval`). Each row: a 40 px MaterialPicture, the title, `{project}, {client}`, and the sent text (warning colour when 7 days or more). Empty: `Nothing is waiting. Materials you send for approval appear here until your client decides.`
   - Right: Card `Carbon by project`, described as `Approved and on live shortlists`, with an IndicativeMarker. A BarList: primary approvedT (brand), secondary liveT (brand-200), legend `Approved`, `On live shortlists`, valueText `f.carbon`. Empty: `Shortlist materials to see their avoided carbon here.`
   - Below it, `ActivityPanel panelId='home-activity-architect'`.
5. First run (no projects): instead of 2 to 4, a Welcome card. The left column has a `SpotIllustration kind='project'` (the Sparkle tile goes), the title `Welcome to your workspace`, the existing text, and the buttons `Create a project` and `Browse the Marketplace`. The steps are: `Create your first project` / `Name it, add the client and the date materials are needed on site.`; `Find materials in the Marketplace` / `Every material is checked against your start date.`; `Send your shortlist for approval` / `Your client approves; you export the specification.`

### E2. New for your projects in the Marketplace
`src/store/selectors/arch-new.ts`:
```ts
export const NEW_LISTING_DAYS = 30; export const NEW_LISTING_LIMIT = 6     // moved from architect.ts
export function newListingsFor(state: AppData, viewer: Viewer): { listing: PublicListing; fits: Project[] }[]
// The existing rules: listedMonth >= monthKey(today - 30); not on any of the practice's lists; not late for at least one
// architect project; newest month first, then publicId.
export type NewForProjectsView = { cards: (ListingCard & { fitsProjects: { id: string; name: string }[]; caption: string })[]; total: number; projectName: string | null }
export function newForProjectsView(state: AppData, viewer: Viewer, checkingProjectId: string | null): NewForProjectsView | null
// null unless the viewer is an architect. With a checking project the viewer works on, keep only listings that fit it, and
// check cards against it; otherwise check each card against its first fitting project. caption: 'In time for {project}' or
// 'In time for {n} of your projects'. cards are limited to NEW_LISTING_LIMIT; total counts all of them.
```
`src/features/discover/NewForProjectsRow.tsx`: `NewForProjectsRow({ projectId })`. It renders nothing when the view is null or has no cards. Otherwise a section with test id `new-for-projects`:
- The title `New for your projects`, described as `Listed in the last 30 days and in time for at least one of your projects.`, or with a project `Listed in the last 30 days and in time for {project}.`
- The first 3 cards as `ListingTile` in a 1, 2 or 3 column grid, each with its caption.
- When total is more than 3, a button `Show all {n}` or `Show fewer` (`new-for-projects-more`).

The marketplace cluster mounts it in Discover.tsx when `view.tab === 'all' && !query.q && query.typology === null && view.activeFilterCount === 0`, after the category folders and before the all-materials grid.

### E3. Owner home (`OwnerHome.tsx`, new `store/selectors/home-owner.ts`)
```ts
export type OwnerDashboard = OwnerHome & {
  metrics: { byTypology: Record<Typology, number>; listed: number; requestTone: MetricTone }
  buildingCards: (BuildingCard & { sketch: BuildingSketch; byTypology: Record<Typology, number>; programmeText: string })[]
  requestThumbs: Record<string, ThumbMaterial>     // the owner's own item: spec, lot publicId, title
  activitySummary: ActivitySummary
}
export function ownerDashboard(state: AppData, viewer: Viewer): OwnerDashboard | null   // null when ownerHome is null
```
`programmeText` is `Dismantling starts {date}` or `Programme not set`. If the owner cluster adds a building purpose, it shows as a Pill on the card.

Layout:
1. Header with `Add building`.
2. MetricGrid:
   - `Items surveyed`, info, Donut by typology with TYPOLOGY_FILL and a Legend. Sub: `Across {n} buildings`.
   - `Listed`, brand, the value published plus shared, Donut published, shared and private (brand, info, neutral). Sub: `{p} published, {s} shared, {r} reserved`.
   - `Requests awaiting you`, Inbox, requestTone (warning when more than 0, else neutral), status `Needs a decision`, href `/app/requests`.
   - `Avoidable carbon`, Leaf, brand, tCO2e, indicative. Sub: `If recovered as ranked`.
   - Test ids: `metric-items`, `metric-listed`, `metric-requests`, `metric-carbon`.
3. Requests awaiting you: the current list, with a 40 px MaterialIllustration of the owner's item before the tag. The buyer stays blind (EyeOff and the blind text).
4. Buildings, 1 or 2 (sm) across: BuildingThumbnail (16/10), the name, the address, the survey Pill, `programmeText`, the visibility SegmentedBar, and a typology Legend with counts. The empty state uses `illustration='building'`.
5. `ActivityPanel panelId='home-activity-owner'` in the aside.

### E4. Surveyor home (`SurveyorHome.tsx`, new `store/selectors/home-surveyor.ts`)
```ts
export type SurveyorDashboard = SurveyorHome & {
  metrics: { byStatus: Record<SurveyStatus, number>; lastCaptureText: string | null; openTone: MetricTone }
  extras: Record<string, { sketch: BuildingSketch; byTypology: Record<Typology, number> }>   // by building id
  activitySummary: ActivitySummary
}
```
Layout:
1. Header. If the surveyor cluster ships a standalone capture route, add the primary action `Capture` with Camera to it.
2. MetricGrid:
   - `Clients`.
   - `Buildings`, Donut by survey status labelled Not started, In progress and Submitted, in SURVEY_TONE fills.
   - `Items captured`. Sub: `Last on {date}`.
   - `Surveys open`, openTone (warning when more than 0), status `In progress`.
3. Appointments: client cards as now. Each building row adds a 112 by 70 BuildingThumbnail on the left (sm and up), restyles the three-step stepper with brand and amber dots and words, and adds a typology SegmentedBar (legend off, with the text `{n} structure, {n} envelope, {n} finishes`). The Inventory and Capture buttons stay. The empty state uses `illustration='building'`.
4. `ActivityPanel panelId='home-activity-surveyor'`.

### E5. Consultant home (`ConsultantHome.tsx`, new `store/selectors/home-consultant.ts`)
```ts
export type TargetRowView = TargetProgress & { actualText: string; targetText: string | null; statusText: string }
export type ConsultantDashboard = ConsultantHome & {
  metrics: { withTargets: number; carbonTargetT: number; carbonShare: number; carbonValueText: string; targetsMet: number; targetsSet: number; billsReviewed: number }
  rows: { id: string; name: string; clientName: string; stage: number; href: string; sketch: BuildingSketch;
    links: { id: string; label: string; href: string }[]; content: TargetRowView; carbon: TargetRowView }[]
  activitySummary: ActivitySummary
}
```
- `content` is targetProgress(contentPercent, targets.contentByValue); actualText uses `f.percent`.
- `carbon` is targetProgress(avoidedApprovedT, targets.avoidedCarbonT).
- Targets are read through `effectiveTargets(state, projectId)` if the consultant cluster exports it, otherwise from `p.targets`.
- `links` come from `projectTabs(state,'consultant',p)` minus overview, team and activity, so a renamed Sustainability tab follows automatically.
- statusText: `Target met`, `Below target`, `No target set`, `No bill of materials yet`.

Layout:
1. Header.
2. MetricGrid:
   - `Projects`. Sub: `{n} with targets set`.
   - `Avoided carbon, approved`, indicative, ProgressRing against carbonTargetT. Sub: `Of {t} tCO2e targeted` or `No carbon targets set`.
   - `Targets met`, the value `{met} of {set}`, Donut met against below (brand, warning), tone warning when any are below.
   - `Waste engagements`. Sub: `{n} bills reviewed`.
3. Section `Projects against targets`, described as `Reused content by value and avoided carbon against the targets set at inception.`, with an IndicativeMarker. One card per project (`consultant-project-{id}`): a 120 by 75 thumbnail, the name, `{client}`, a RibaStageStrip, two TargetMeters (`Reused content by value`, `Avoided carbon, approved`), then the links. The table on md and up is replaced by these cards.
4. Waste engagements, as now, with a SpotIllustration on the empty state.
5. `ActivityPanel panelId='home-activity-consultant'`.

### E6. Home skeleton
`Home.tsx` HomeSkeleton becomes four 112 px tiles in MetricGrid and three 260 px card blocks.

### E7. Landing (`Landing.tsx`, new `LandingScene.tsx` and `landingContent.ts`)
1. Header: unchanged.
2. Hero: at lg, two columns (5 and 7 of 12); on phones, stacked with the drawing under the buttons.
   - Remove the grid mask and the radial glow.
   - The Sandbox link pill stays, as flat surface and border only.
   - The h1 and paragraph stay as they are.
   - Right: `LandingScene`, an SVG with viewBox 720 by 420, `role="img"` and the aria-label `Drawing of a building coming down and a building going up, sharing steel, stone and brick`. It is built from massing primitives: an existing building with scaffold on the left, a proposed building with a crane on the right, and between them a yard of stacked beams, stone and brick pallets on the ground plane, joined by a dashed 1 px route line with no arrowheads.
3. Facts band (new), a four-column row with hairline dividers (2 by 2 on phones), from `LANDING_FACTS`:
   - `5 workspaces`, `One for each role on a project`
   - `7 material families`, `Steel, stone, brick, curtain wall, precast, raised floors and timber`
   - `3 typologies`, `Structure, envelope and finishes`
   - `Every figure indicative`, `With each factor and its source in the methodology`
4. Product shot: an inert, aria-hidden mock of the new architect home. The sidebar shows Home (active), Marketplace and Saved, then Projects. The main area shows the greeting, four MetricTiles (Donut, ring, warning tile) and two project cards with ProjectThumbnail. Sample figures come from `ui/samples.ts` `SAMPLE_DASHBOARD`, and the carbon tile shows its Indicative marker. The blurred halo and both floating cards go.
5. Who it is for: the cards stay; the dotted panel becomes `bg-subtle` with a line-soft border. The owner visual is a BuildingThumbnail with the three visibility pills; the consultant visual is a ProgressRing plus a TargetMeter. The architect tools become `['Marketplace', 'Shortlist', 'Specification']`. The owner role title and line follow the owner cluster's term.
6. How it works: each Step frame is a drawing sheet, a white plate with a 1 px border and a 28 px title block strip at the bottom (`01  Capture and decide`, in text-xs uppercase tracking with muted numbers). The dot mask goes.
7. Principles: the grid mask goes; thin white/15 rules divide the three columns.
8. Call to action and footer: unchanged.

## F. Seed and names
- No seed data changes and no new names. Thumbnails, metrics and charts come from existing records. The only seed edits are the hrefs moved onto `store/paths.ts`.
- Landing mock data uses existing fictional names: Studio Oriel, Priya Nair, Merrowgate Wharf, Sallow Court and Ferrymoor Yard.

## G. Privacy
- Architect, client and consultant view models (thumbnails, sketch families, swatches, waiting rows, new rows) read seller data only through `listingCard`, `listingOf` and `toPublicListing`.
- `projectSketch` receives families taken from public cards only.
- Owner and surveyor dashboards read only the viewer's own or appointed buildings. Buyers stay blind through the existing `requestRows`.
- Add to `test/privacy.platform.test.ts`:
  - `buyerViews` gets `newForProjectsView(s, v, null)`, `newForProjectsView(s, v, MERROWGATE_ID)` and `consultantDashboard(s, v)`.
  - The seller views get `ownerDashboard(s, v)`.
  - The surveyor list gets `surveyorDashboard(s, v)`.
  - All must pass the existing private-string checks.

## H. Tests
Unit:
- `store/paths.test.ts`: the outputs of marketplaceHref, materialHref and sharedWithProjectHref; `marketplacePathFor('/app/discover')` gives `/app/marketplace`; `/app/discover/L-1` gives `/app/marketplace/L-1`; `/app/projects/x` is unchanged.
- `store/selectors/nav-projects.test.ts`, with inputs Beta (client Zed, 2026-10-01), alpha (Ann, null) and Gamma (Ann, 2026-10-05):
  - `name` gives alpha, Beta, Gamma.
  - `recent` gives Gamma, Beta, alpha.
  - `client` gives groups Ann (alpha, Gamma) and Zed (Beta).
  - The filter Ann gives alpha and Gamma, with hidden 1.
  - An unknown client gives all three, with `effective.clientOrgId` null.
  - With seed Priya's defaults, the nav is `['Ferrymoor Yard','Merrowgate Wharf','Sallow Court','New project']`.
- `store/selectors/dashboard.test.ts`:
  - waitingTone: (0,null) neutral, (2,3) info, (1,7) warning, (1,null) info.
  - fitTone: late wins, then tight, then brand, then neutral.
  - earliestStart for the seed on 2026-10-08 is Ferrymoor Yard.
  - targetProgress: (0.1,0.25) below with share 0.4; (0.3,0.25) met with share 1; (null,0.25) no_data; (5,0) no_target; (0,150) below with share 0.
  - typologyCounts maps all 7 families.
  - activitySummary of [] is { count 0, latest null }.
  - thumbsOf orders approved, sent, then pending, drops declined and stops at 3.
- `domain/sketch.test.ts`:
  - facadeOf covers every family.
  - frameFromText('Steel frame with composite slabs, stone and precast cladding') is steel; 'Load-bearing brick' is masonry; '' is unknown.
  - sketchUse('education') is other.
  - The seed Merrowgate sketch has frame steel and up to 3 facades; Tiverne's building sketch has storeys 7 and frame steel.
  - No label matches /photo/i.
- `ui/illustration/massing.test.ts`: the same sketch gives the same massing; storeys 30 draws 12 and 1 draws 2; every projected point lies inside the 320 by 200 board for each use and state; crane only for proposed and scaffold only for existing.
- `views.test.ts`, architect home:
  - Keep the existing greeting, date, stats and projects-order assertions.
  - `waitingForApproval` projects are `['Ferrymoor Yard','Merrowgate Wharf']`.
  - The byStatus values sum to the live shortlist plus declined.
  - `metrics.nextStart.projectName` is 'Ferrymoor Yard'.
  - Every project card's `materials.length <= 3`; Isla gets null.
  - The newForProjects assertions move to the arch-new test unchanged.
- `store/selectors/arch-new.test.ts`:
  - For Priya with no checking project, `cards[0].publicId` is 'L-9F4CQQ', there are at most 6 cards, and every card's savedIn is empty.
  - With the Sallow Court project id, every card fits Sallow Court and the caption is 'In time for Sallow Court'.
  - Isla gets null.
- `store/selectors/homes.test.ts`:
  - ownerDashboard(Tom): the byTypology sum equals itemsSurveyed; Dana gets null.
  - surveyorDashboard(Dana): byStatus has one submitted and one in progress, and each extras sketch has state existing.
  - consultantDashboard(Marcus): the Merrowgate content target is 0.25 and its status is met or below; Sallow Court is no_target; targetsSet is 2.
- `ui.test.tsx`:
  - Donut aria-label lists its segments, and all zero draws the track.
  - ProgressRing aria-label.
  - MetricTile with href is a link named by its label, and its status pill shows its word.
  - CollapsiblePanel toggles aria-expanded and hidden, and remembers its state across a remount (localStorage).
  - RibaStageStrip names the stage.
  - BuildingIllustration markup is identical for the same sketch and labelled 'Illustration of'.
  - EmptyState with an illustration renders an aria-hidden svg.
  - The Gallery stays free of forbidden characters.

Screen (`features/home/home.test.tsx`, jsdom through the real router):
- For each sample account, `/app/home` renders the four `metric-*` tiles, every thumbnail is `role=img` with an 'Illustration of' name, and no text matches FORBIDDEN.
- `activity-panel` starts collapsed with a summary; clicking `activity-toggle` shows the feed.
- The architect home has `waiting-for-approval`, has no `new-for-projects`, and has no text 'Waiting on'.
- Priya on `/app/marketplace` sees `new-for-projects`, which disappears after typing in the search.

Sidebar (`app/app.test.tsx`):
- Open `nav-projects-menu`, choose `nav-order-client`: `nav-group-*` labels appear in client-name order.
- Choose a client: only that project's folder remains, and the chip clears the filter.
- The choice survives a re-render (store ui).

E2E (`e2e/journeys.spec.ts`):
- The renames from A3.
- New test `every dashboard fits phone, laptop and desktop`: for each sample account, at 390, 1024 and 1440 px, `/app/home` shows `activity-panel` and no horizontal overflow.
- New test `old Discover links still work`: `/app/discover/L-9F4CQQ` ends at `/app/marketplace/L-9F4CQQ`.

## I. Files
New:
- `src/store/paths.ts`
- `src/store/selectors/nav-projects.ts`
- `src/store/selectors/dashboard.ts`
- `src/store/selectors/arch-new.ts`
- `src/store/selectors/home-owner.ts`, `home-surveyor.ts`, `home-consultant.ts`
- `src/domain/sketch.ts`
- `src/ui/charts/tones.ts`, `MetricTile.tsx`, `Donut.tsx`, `ProgressRing.tsx`, `BarList.tsx`, `TargetMeter.tsx`, `Legend.tsx`, `RibaStageStrip.tsx`
- `src/ui/CollapsiblePanel.tsx`, `src/ui/usePersistentToggle.ts`, `src/ui/Thumbnails.tsx`
- `src/ui/illustration/massing.ts`, `BuildingIllustration.tsx`, `spots.tsx`
- `src/features/home/ActivityPanel.tsx`
- `src/features/discover/NewForProjectsRow.tsx`
- `src/features/public/LandingScene.tsx`, `landingContent.ts`
- `src/app/sidebar/ProjectsMenu.tsx`
- Tests: `paths.test.ts`, `nav-projects.test.ts`, `dashboard.test.ts`, `arch-new.test.ts`, `homes.test.ts`, `sketch.test.ts`, `massing.test.ts`, `features/home/home.test.tsx`

Changed by this cluster:
- `ui/index.ts`, `ui/Progress.tsx`, `ui/EmptyState.tsx`, `ui/Gallery.tsx`, `ui/ui.test.tsx`, `ui/samples.ts`, `styles.css`
- `features/home/ArchitectHome.tsx`, `OwnerHome.tsx`, `SurveyorHome.tsx`, `ConsultantHome.tsx`, `Home.tsx`
- `store/selectors/architect.ts`, `nav.ts`, `search.ts`, `arch-breadcrumbs.ts`, `index.ts`
- `app/Sidebar.tsx`, `navIcons.ts`, `router.tsx`, `redirects.tsx`, `SearchPalette.tsx`, `app.test.tsx`
- `features/public/Landing.tsx`, `features/discover/links.ts`
- `views.test.ts`, `arch-selectors.test.ts`, `privacy.platform.test.ts`, `e2e/journeys.spec.ts`

One-line rename edits in other clusters' files (do these in the foundation pass, before the feature packages):
- `Discover.tsx` (also mounts NewForProjectsRow), `MaterialPage.tsx`, `Shortlist.tsx`, `ProjectParts.tsx`, `NewProjectDialog.tsx`, `Saved.tsx`, `Help.tsx`
- `store/actions/owner.ts`, `store/actions/projects.ts`, `store/actions/owner.test.ts`, `store/selectors/project.ts`, `sandbox/seed.ts`
- `store/types.ts` (UiState), `store/app.ts` (setNavProjectView, merge)

## Files changed
/home/user/tallyard/platform/src/ui/index.ts
/home/user/tallyard/platform/src/ui/Progress.tsx
/home/user/tallyard/platform/src/ui/EmptyState.tsx
/home/user/tallyard/platform/src/ui/Gallery.tsx
/home/user/tallyard/platform/src/ui/ui.test.tsx
/home/user/tallyard/platform/src/ui/samples.ts
/home/user/tallyard/platform/src/styles.css
/home/user/tallyard/platform/src/features/home/ArchitectHome.tsx
/home/user/tallyard/platform/src/features/home/OwnerHome.tsx
/home/user/tallyard/platform/src/features/home/SurveyorHome.tsx
/home/user/tallyard/platform/src/features/home/ConsultantHome.tsx
/home/user/tallyard/platform/src/features/home/Home.tsx
/home/user/tallyard/platform/src/store/selectors/architect.ts
/home/user/tallyard/platform/src/store/selectors/nav.ts
/home/user/tallyard/platform/src/store/selectors/search.ts
/home/user/tallyard/platform/src/store/selectors/arch-breadcrumbs.ts
/home/user/tallyard/platform/src/store/selectors/index.ts
/home/user/tallyard/platform/src/app/Sidebar.tsx
/home/user/tallyard/platform/src/app/navIcons.ts
/home/user/tallyard/platform/src/app/router.tsx
/home/user/tallyard/platform/src/app/redirects.tsx
/home/user/tallyard/platform/src/app/SearchPalette.tsx
/home/user/tallyard/platform/src/app/app.test.tsx
/home/user/tallyard/platform/src/features/public/Landing.tsx
/home/user/tallyard/platform/src/features/discover/links.ts
/home/user/tallyard/platform/src/store/selectors/views.test.ts
/home/user/tallyard/platform/src/store/selectors/arch-selectors.test.ts
/home/user/tallyard/platform/src/test/privacy.platform.test.ts
/home/user/tallyard/platform/e2e/journeys.spec.ts
/home/user/tallyard/platform/src/store/types.ts
/home/user/tallyard/platform/src/store/app.ts
/home/user/tallyard/platform/src/features/discover/Discover.tsx
/home/user/tallyard/platform/src/features/material/MaterialPage.tsx
/home/user/tallyard/platform/src/features/projects/Shortlist.tsx
/home/user/tallyard/platform/src/features/projects/ProjectParts.tsx
/home/user/tallyard/platform/src/features/projects/NewProjectDialog.tsx
/home/user/tallyard/platform/src/features/saved/Saved.tsx
/home/user/tallyard/platform/src/features/help/Help.tsx
/home/user/tallyard/platform/src/store/actions/owner.ts
/home/user/tallyard/platform/src/store/actions/owner.test.ts
/home/user/tallyard/platform/src/store/actions/projects.ts
/home/user/tallyard/platform/src/store/selectors/project.ts
/home/user/tallyard/platform/src/sandbox/seed.ts

## Files new
/home/user/tallyard/platform/src/store/paths.ts
/home/user/tallyard/platform/src/store/paths.test.ts
/home/user/tallyard/platform/src/store/selectors/nav-projects.ts
/home/user/tallyard/platform/src/store/selectors/nav-projects.test.ts
/home/user/tallyard/platform/src/store/selectors/dashboard.ts
/home/user/tallyard/platform/src/store/selectors/dashboard.test.ts
/home/user/tallyard/platform/src/store/selectors/arch-new.ts
/home/user/tallyard/platform/src/store/selectors/arch-new.test.ts
/home/user/tallyard/platform/src/store/selectors/home-owner.ts
/home/user/tallyard/platform/src/store/selectors/home-surveyor.ts
/home/user/tallyard/platform/src/store/selectors/home-consultant.ts
/home/user/tallyard/platform/src/store/selectors/homes.test.ts
/home/user/tallyard/platform/src/domain/sketch.ts
/home/user/tallyard/platform/src/domain/sketch.test.ts
/home/user/tallyard/platform/src/ui/charts/tones.ts
/home/user/tallyard/platform/src/ui/charts/MetricTile.tsx
/home/user/tallyard/platform/src/ui/charts/Donut.tsx
/home/user/tallyard/platform/src/ui/charts/ProgressRing.tsx
/home/user/tallyard/platform/src/ui/charts/BarList.tsx
/home/user/tallyard/platform/src/ui/charts/TargetMeter.tsx
/home/user/tallyard/platform/src/ui/charts/Legend.tsx
/home/user/tallyard/platform/src/ui/charts/RibaStageStrip.tsx
/home/user/tallyard/platform/src/ui/CollapsiblePanel.tsx
/home/user/tallyard/platform/src/ui/usePersistentToggle.ts
/home/user/tallyard/platform/src/ui/Thumbnails.tsx
/home/user/tallyard/platform/src/ui/illustration/massing.ts
/home/user/tallyard/platform/src/ui/illustration/massing.test.ts
/home/user/tallyard/platform/src/ui/illustration/BuildingIllustration.tsx
/home/user/tallyard/platform/src/ui/illustration/spots.tsx
/home/user/tallyard/platform/src/features/home/ActivityPanel.tsx
/home/user/tallyard/platform/src/features/home/home.test.tsx
/home/user/tallyard/platform/src/features/discover/NewForProjectsRow.tsx
/home/user/tallyard/platform/src/features/public/LandingScene.tsx
/home/user/tallyard/platform/src/features/public/landingContent.ts
/home/user/tallyard/platform/src/app/sidebar/ProjectsMenu.tsx

## Shared
/home/user/tallyard/platform/src/store/types.ts (UiState.navProjects, NavProjectView, DEFAULT_UI)
/home/user/tallyard/platform/src/store/app.ts (setNavProjectView, ui merge on rehydrate)
/home/user/tallyard/platform/src/app/router.tsx (marketplace routes, legacy redirects; other clusters add routes)
/home/user/tallyard/platform/src/store/selectors/nav.ts (Marketplace item, project arranging, routeAccess; other clusters add nav items)
/home/user/tallyard/platform/src/app/Sidebar.tsx (projects menu, group labels)
/home/user/tallyard/platform/src/app/navIcons.ts (Store icon; others may add icons)
/home/user/tallyard/platform/src/store/selectors/index.ts (export new selector modules)
/home/user/tallyard/platform/src/ui/index.ts (exports for charts, thumbnails, CollapsiblePanel, spots)
/home/user/tallyard/platform/src/styles.css (chart tokens)
/home/user/tallyard/platform/src/store/selectors/arch-breadcrumbs.ts (Marketplace labels)
/home/user/tallyard/platform/src/store/selectors/search.ts (marketplace hrefs and keywords)
/home/user/tallyard/platform/src/sandbox/seed.ts (hrefs only)
/home/user/tallyard/platform/src/store/actions/owner.ts (hrefs and one body string; owner cluster owns the file)
/home/user/tallyard/platform/src/store/actions/projects.ts (one href; project cluster owns the file)
/home/user/tallyard/platform/src/store/selectors/project.ts (next step copy and href; project cluster owns the file)
/home/user/tallyard/platform/src/features/discover/Discover.tsx (title, tab label, mount NewForProjectsRow; marketplace cluster owns the file)
/home/user/tallyard/platform/src/features/material/MaterialPage.tsx (back link; marketplace cluster owns the file)
/home/user/tallyard/platform/src/features/projects/Shortlist.tsx (sent hint copy)
/home/user/tallyard/platform/src/features/projects/ProjectParts.tsx (progress legend copy; project cluster may make its feed collapsible)
/home/user/tallyard/platform/src/features/help/Help.tsx (copy and href; sustainability clusters edit Methodology)
/home/user/tallyard/platform/src/test/privacy.platform.test.ts (new views added by several clusters)
/home/user/tallyard/platform/src/store/selectors/views.test.ts
/home/user/tallyard/platform/e2e/journeys.spec.ts
/home/user/tallyard/platform/src/features/public/Landing.tsx (owner role term from the owner cluster)
/home/user/tallyard/platform/src/domain/reference/names.ts (no change from this cluster; WELL and UK Net Zero Carbon Buildings Standard would be added by the sustainability cluster if the landing frameworks row is adopted)

## Deps


## Open questions
- What does the owner workspace call itself after the 'donor building' rename? This affects the landing role card title and line, and any owner dashboard copy. REC: Follow the term the owner cluster settles on. Keep it in one constant (for example ROLE_TITLES in common.ts) so Landing.tsx and the dashboards read it from one place. Until then the owner dashboard says 'Buildings' and avoids the term.
- Should the landing page show a 'Maps to the frameworks you report against' row (RIBA Plan of Work, London Plan, BREEAM, LEED, WELL, UK Net Zero Carbon Buildings Standard)? REC: Only once the sustainability and location clusters ship the reference module that actually maps these frameworks. Then render the row from that module, captioned 'Indicative summaries to check. Not affiliated with or endorsed by these bodies.', and add WELL and UK Net Zero Carbon Buildings Standard to ALLOWED_SOURCES in names.ts. Leave it out if the mapping is not built.
- What is the surveyor cluster's standalone Capture route, and does it have a section for surveys started before a client invite? REC: The surveyor home adds a primary 'Capture' header action pointing to that route, shown only when routeAccess allows it. If the cluster exports a section component (for example SurveyorDraftsSection), it mounts below Your appointments, and SurveyorHome.tsx stays owned by this cluster.
- Where do the overridable consultant targets live? REC: The consultant cluster exports effectiveTargets(state, projectId): { contentByValue: number; avoidedCarbonT: number } from its own selector file. home-consultant.ts imports it, and reads p.targets until it exists. Any further target kinds (BREEAM credits and so on) belong on the goals and targets tab, not on the home.
- Which goes first on the Marketplace landing: the category folders or the 'New for your projects' row? REC: Folders first, because the partner asked for it to open on them, then 'New for your projects', then all materials. The marketplace cluster owns Discover.tsx and makes the final call; the row's visibility rule is fixed in E2.
- The project cluster is expanding project types and allowing typed-in types. How should thumbnails draw a type they do not know? REC: sketchUse maps office, hotel and residential to themselves, matches industrial, warehouse and logistics words to industrial, and draws anything else as 'other'. If the expanded list includes school, health or mixed use, add a massing for each in massing.ts later. Nothing breaks in the meantime.
- Should the project cards on the architect home be ordered by soonest start on site rather than creation order? REC: Keep the current order in this round so existing assertions stay as they are. The Active projects tile already names the next start on site. Reconsider once the RIBA programme lands.
