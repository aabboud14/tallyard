# Build brief, file 9: version 1.0, the product by role, architect first

Source: two follow-up calls on 7 October 2026 between the founder and a London architect (the domain partner), plus the founder's written summary of the same calls. The three records overlap; this file de-duplicates them. Where this file and files 01 to 08 disagree, this file wins. The rules R2 to R7 in `CLAUDE.md` still hold in full. R1 and R8 are re-read in section 11.

## 0. The one-paragraph version

Version 0.5 was a demo of a concept. Version 1.0 is a tool that one person in one role can use for real work on sample data, and that the partner can put in front of colleagues and clients. The first role is the architect. The product is a marketplace and a workflow tool, not an AI product: AI stays behind the scenes and nothing on screen asks anyone to prompt anything. Each role gets its own interface, navigated project by project. Decision rights are fixed: the architect chooses on function, aesthetics and environmental specification; the asset owner approves, buys and controls what is visible. The architect never makes a deal.

## 1. Principles agreed on the calls

1. **A marketplace and workflow tool, not an AI tool.** Selling "another AI tool" puts people off. Keep the rule-based stand-ins and their labels, but keep them quiet (footnotes and small tags, not banners) and never ask the user to "prompt".
2. **One interface per role, project by project.** "You create a project, and based on your role within the project you see different things." The left rail lists the person's projects (or clients and buildings) as folders; the marketplace sits above the projects.
3. **Decision rights are fixed.** The asset owner (umbrella term for owner, asset manager, investor, developer) decides what is listed, how visible it is, when it is available, and what is bought. The architect browses, saves to a wish list, checks timing, compiles the specification and downloads geometry. "The deal tab makes no sense for the architect." Remove it.
4. **Visual first for architects.** "A mix between Pinterest and eBay." Pictures lead; the surveyor's photo features prominently; a material is browsed by typology (structure, envelope, finishes) and opened for its sizes, availability and quantities.
5. **The timeline is a first-class fact.** Demolition, storage and construction dates rarely line up. Expected availability is captured at the survey, decided by the owner, and checked against the architect's project start date. "This matches your schedule. This is tight. This will not be available in time."
6. **Privacy by construction stays.** The owner chooses private, shared privately with a selected architect (a private link), or published. Nothing crosses sides before a deal is confirmed (R3). A client sees only their own buildings; a surveyor sees only the clients they are appointed to.
7. **Keep what worked.** Capture with Assist, family, condition and recoverability grades; the priority ranking with its route column; the listings and privacy page; browse with quantity, mass and location; avoided carbon; the compliance outputs. "The bones of the tool are pretty good."
8. **Say what is version 2.** Matching an uploaded BIM model or steel schedule against the whole marketplace is a version 2 feature. It appears, greyed out and labelled, so people see where it is going.

## 2. Roles in version 1.0

| Role | Persona (fictional) | Organisation | What they do in the tool |
|---|---|---|---|
| Site surveyor | Dana Kowalski | Tarnbrook Deconstruction | Captures materials, photos, condition, recoverability and expected availability, per client and building |
| Asset owner, selling side | Tom Ashby | Ostlea Estates | Reviews the inventory, decides what to recover, sets visibility and availability, shares privately with selected projects, approves offers and deals |
| Architect | Priya Nair | Studio Oriel | Browses, filters, saves to wish lists per project, checks the timeline, compiles and exports spec sheets, downloads geometry; sends the wish list to the client |
| Asset owner, buying side | Isla Fenwick (new) | Lantern Quay Developments | Approves or declines the architect's wish list, runs the reuse plan, negotiation, deals and logistics for the project |
| Sustainability consultant | Marcus Lindqvist | Halewick Sustainability | Reads the wish list for its carbon, runs the compliance and waste outputs. To be refined with the partner on the next call |
| Platform operator | Platform operator | Tallyard | Unchanged |

Removed from version 1.0: the contractor persona (Ruth Adeyemi, Wrenlow Build), the bid pack placeholder, the design-team summary placeholder, and the two untested helpers behind them (`opportunity.ts`, `bidPack.ts`). Git history keeps them.

The product name stays `Tallyard` in the one constant `PRODUCT_NAME`. The partner said the name is already taken and will propose another; rename then.

## 3. What to keep, remove and add, by role

### 3.1 Site surveyor

Keep: capture with Assist, photo input, family, spec fields, condition, recoverability, location, notes; the inventory table; the item detail.

Add:
- **Clients and buildings as folders.** The surveyor works for several clients. The left rail lists Clients, each with its buildings. Capture and inventory are per building. Seed: Ostlea Estates with Tiverne House (existing), and Pellory Estates with Harrowden Court (new, three private items).
- **Expected availability** on capture: a month the surveyor expects the material to be free, defaulting from the building's dismantling programme. Stored on the item. Shown in the inventory. The owner decides the final date (3.2).
- The building and client named at the top of capture, and the client's name on the inventory.

Remove: nothing.

### 3.2 Asset owner, selling side

Keep: inventory, item detail, the priority ranking, listings and privacy with the disclosure score and market preview, offers and deals.

Add:
- **Buildings as folders**: Ostlea Estates sees Tiverne House only. Harrowden Court (Pellory Estates) must not appear to Ostlea anywhere, including by URL.
- **Three visibility options, in the owner's words**: Private; Shared privately with selected projects (the private link to the architect you work with); Published to the marketplace. The second is the existing `matched_only` mechanism, relabelled. The owner picks which projects may see shared lots from a list of blind projects (organisation type, project type, region, need-by quarter from `toBlindBuyer`) and can revoke.
- **Availability decided by the owner**: a date per lot, pre-filled from the surveyor's expected month, set when publishing or sharing. The listing shows it at the building's timing level (quarter or month) as now.
- **The route column as the UK decision tree**: reuse, upcycle, downcycle, recycle, scrap, with a legend. The ranking engine and its tests are unchanged; a separate display rule maps its two routes to the five-step tree (section 5.3).

Remove: nothing. Negotiation and deals stay with the owner, where they belong.

### 3.3 Architect

Keep: browse cards with quantity, mass, location and availability; the listing detail with its spec rows, guide price and signal (secondary), avoided carbon with "How this is calculated"; the confidentiality terms for privately shared lots.

Add:
- **Visual browse**: a large visual per card (public photos when there are any, otherwise an illustration generated from the record, section 6.2), the title, typology and family tags, the sustainability band, availability, and a Save control.
- **Filters**: typology (structure, envelope, finishes), family, availability (now, or by a quarter), condition, region, sustainability band, and, when a project is selected, "fits the project start date". Sort by newest listed, most carbon avoided, lowest guide price. Filters are chips above the grid plus a collapsible rail at 1024 px and wider.
- **Shared with you**: lots that owners shared privately with one of the architect's projects, behind the confidentiality terms (L6, L7), tagged "Shared in confidence". The terms dialog moves here from the schedule matcher.
- **Projects as folders** in the left rail, each with its wish list. A project has a name, a client, a type (office, hotel, residential, other), a location and a construction start date. The architect can create a project. Seed: Merrowgate Wharf (office, Lantern Quay Developments, existing), Sallow Court (hotel, Pellory Estates), Ferrymoor Yard (residential, Meridale Partners).
- **Saved**: a general wish list with no project, for "that is nice but I have no project for it yet". Items can be moved to a project later.
- **Wish list per project** with the states pending, sent to client, approved, declined. Each row shows the visual, the title, quantity, availability, the timeline fit against the project start date (section 5.4), the sustainability band, and avoided carbon. Actions: send the pending items to the client; remove; move to another project; download geometry; open the listing. Totals: items, mass, avoided carbon, by state. The approved list is what the architect specifies from.
- **Timeline check**: for each item, "available in time", "tight", "not available in time" or "available now, storage until the start", with the months of storage implied. Computed by a pure function from the public availability window and the project start date; thresholds in the assumptions.
- **Spec sheet export**: a specification schedule for the project's approved items (or a draft for pending ones) as a spreadsheet (ExcelJS) and as a printable page (PDF through the print stylesheet). Public fields only: identity, typology and family, material and dimensions, quantity and mass, condition, test status and grade, availability and region, collection point, avoided carbon, guide price range, and the caveats (section 7). The partner will send the office's template; the column set is a first cut to be replaced.
- **Download geometry**: a DXF file of the 2D profile generated from the recorded dimensions (steel sections from the section table; panels, bricks and floor panels as dimensioned rectangles). Timber joists have no recorded dimensions in this version; the control says so. **BIM family (Revit, IFC)** is shown greyed with the version 2 label.
- **Sustainability band**: a simple three-segment indicator, "High", "Medium", "Low", or "Not claimed" for unused surplus, from the avoided carbon share by a fixed rule (section 5.5). The partner will send the office's diagram; this is the placeholder.
- **Match schedule** stays in the project folder, greyed, with the version 2 label and a short panel: "Upload a BIM model or a steel schedule and match it against the whole marketplace. Version 2." It does nothing else for the architect.

Remove: Deals, Reuse plan, the working schedule matcher, every price negotiation and approval control, "Approve for Lantern Quay Developments". The architect never sees a mandate, an offer, a package cost or a deal.

### 3.4 Asset owner, buying side (new persona)

This is the client who pays. In the demo the architect did this; that was the biggest mistake the partner found.

- **Projects as folders**: Merrowgate Wharf.
- **Approvals**: the wish list items the architect sent, with the visual, specification summary, quantity, availability, timeline fit, avoided carbon and guide price range. Approve or decline each, with a note. Approved items show "Add to the reuse plan" when the seller is simulated and the project's steel schedule holds a line for that designation; otherwise the existing limits apply (L24, L25).
- **Reuse plan**, **Deals** and the working **Match schedule** (labelled "Advanced") move here unchanged in behaviour: package, negotiation agent, buyer approval, logistics agent, custody. The confidentiality terms, once accepted by the architect or by the owner, count for the project.

### 3.5 Sustainability consultant

Keep: project compliance with the two exports and print, the waste dashboard with the bill import.

Add: **Wish list review** per project: the architect's list by state with avoided carbon and mass totals against the project's inception targets (sample, placeholder). Read only. The partner will refine this role on the next call; do not build further.

Remove: the Tiverne House inventory and capture tabs (a buyer-side consultant must not see the seller's private record).

### 3.6 Operator and shared

Unchanged: ledger, model comparison, assumptions (add the new parameters), about (update the lists of what is real, simulated and version 2). The landing page groups the role cards with one line each on what that role does here. The demo script panel stays for presenters, re-homed to the new routes and personas.

## 4. Information architecture and routes

Hash routes. IDs in routes are opaque (`prj_`, `bld_`, `L-`), never names.

```
/                                  landing, pick a role
/market                            browse (architect; others may open it)
/market/:publicId                  listing detail
/saved                             the architect's general wish list
/projects/new                      new project (architect)
/projects/:projectId               project home: wish list (architect) or approvals (buying owner) or compliance (consultant)
/projects/:projectId/wishlist      architect
/projects/:projectId/spec          spec sheet preview and exports (architect)
/projects/:projectId/match         architect: version 2 panel. Buying owner: the working matcher
/projects/:projectId/approvals     buying owner
/projects/:projectId/plan          buying owner, and /plan/:planItemId
/projects/:projectId/deals         buying owner
/projects/:projectId/compliance    consultant
/projects/:projectId/review        consultant, wish list review
/buildings/:buildingId/inventory   surveyor and selling owner, and /inventory/:itemId
/buildings/:buildingId/capture     surveyor (and owner)
/buildings/:buildingId/priority    selling owner
/buildings/:buildingId/listings    selling owner
/offers                            selling owner: offers and deals
/engagements/:engagementId/waste   consultant
/operator/ledger, /operator/models, /assumptions, /about
```

The left rail is built from the world and the persona, not from a static table:

- Surveyor: "Clients" then each client as a folder with its buildings; a building opens Inventory and Capture.
- Selling owner: "Buildings" with Inventory, Priority, Listings and visibility per building; then "Offers and deals".
- Architect: "Marketplace" with Browse and Saved; "Projects" with each project as a folder holding Wish list, Spec sheet, Match schedule (version 2); "New project".
- Buying owner: "Projects" with Approvals, Reuse plan, Deals, Match schedule (advanced).
- Consultant: "Projects" with Compliance and Wish list review; "Engagements" with the waste dashboard.
- Operator: unchanged.

A screen that resolves a building or project from the URL checks `canAccess(persona, building | project)` from `src/domain/access.ts` and shows "Not available to this role" when it fails. Tested.

## 5. Data model and engines (domain, pure, tested first)

### 5.1 Types

- `Org`: add `kind` values as needed; add Meridale Partners as a developer.
- `Persona`: add Isla Fenwick, Lantern Quay Developments, development manager, active.
- `SourceBuilding`: add `surveyorOrgId: string | null`.
- `InventoryItem`: add `expectedAvailableFrom: string | null` (ISO date, the first of the expected month).
- `Lot`: unchanged. `availableFrom` is the owner's decision. `visibility` keeps its three values; labels change (section 7).
- `Project`: add `clientOrgId` (the paying client, equals `developerOrgId`), `architectOrgId`, `projectType: 'office' | 'hotel' | 'residential' | 'other'`, `startDate` (construction start, ISO), `createdBy: string | null`. Merrowgate: `startDate` consistent with its key dates (steel need-by is 2028-04-03; construction start 2027-10-04). Remove `contractorOrgId` or leave null; keep `targets`.
- `WishlistItem`: `{ id, publicId, addedOn, addedByPersonaId, note, status: 'pending' | 'sent' | 'approved' | 'declined', decidedOn: string | null, decisionNote: string | null }`.
- `Wishlist`: `{ id, orgId (architect practice), projectId: string | null, items: WishlistItem[] }`. `World.wishlists: Record<string, Wishlist>`. One per project, plus one general per architect org.
- `FAMILIES[*].typology: 'structure' | 'envelope' | 'finishes'`: steel section and timber joist are structure; curtain wall, precast, stone and brick are envelope; raised floor is finishes.
- Remove the contractor persona, Wrenlow Build, Ruth Adeyemi from the seed and from `names.ts`; add Isla Fenwick, Harrowden Court, Sallow Court, Ferrymoor Yard to the allowed names.

### 5.2 Access (`src/domain/access.ts`)

- `buildingsFor(world, persona)`: the owner's buildings (`ownerOrgId`), or the surveyor's (`surveyorOrgId`).
- `projectsFor(world, persona)`: projects where the persona's org is the architect, the client or the consultant.
- `canAccess(world, persona, { buildingId } | { projectId })`.
- Tests: Tom cannot access Harrowden Court; Dana can access both buildings; Priya cannot access any building; Isla can access Merrowgate Wharf and not Sallow Court; Marcus can access Merrowgate Wharf and Durnley House.

### 5.3 Decision tree route (`src/domain/engines/route.ts`)

`decisionTreeRoute(row)` maps the priority engine's `recover | recycle` to the five-step tree: `recover` becomes `reuse`; `recycle` becomes `recycle` for steel sections and curtain wall, and `downcycle` for stone, precast, brick, raised floor and timber (crushed, chipped or broken for a lower use). `upcycle` and `scrap` are in the type and the legend but not assigned by this rule; the label says so (L41). The priority engine and its tests are untouched.

### 5.4 Timeline fit (`src/domain/engines/timeline.ts`)

`timelineFit(availability: Availability, startDate: string, a: Assumptions)`:

- `now`: the lot is in stock. `fit = 'now'`, `storageMonths = ceil(daysBetween(DEMO_TODAY, startDate) / 30)` floored at 0.
- A window whose end is on or before `startDate` minus `a.timeline.tightDays` (60): `fit = 'in_time'`, `storageMonths = ceil(daysBetween(windowEnd, startDate) / 30)`.
- A window whose start is on or before `startDate` but whose end is inside the tight band or after the start: `fit = 'tight'`, storage from the window end, floored at 0.
- A window that starts after `startDate`: `fit = 'late'`, `storageMonths = null`.

Returns `{ fit, storageMonths, text }`, where `text` is one of the four phrases in section 7. Tests cover each branch with dates on both sides of each boundary, under `TZ=UTC` and `TZ=Pacific/Auckland`.

### 5.5 Sustainability band (`src/domain/engines/band.ts`)

`sustainabilityBand(carbon: PublicCarbon)`: `null` gives `{ band: 'none', segments: 0 }`; `percent >= a.band.high` (0.8) gives `high`, 3 segments; `>= a.band.medium` (0.5) gives `medium`, 2; otherwise `low`, 1. Thresholds in the assumptions as placeholders. The avoided-carbon figure itself is unchanged (F2).

### 5.6 Spec sheet (`src/domain/engines/specSheet.ts`)

`specSheetRows(listing: PublicListing, fit: TimelineFit | null)` returns ordered `{ section, label, value }` rows from the public listing only. `specSheet(project, listings, fits)` returns the document: a title, the project line (name, type, start date), the caveat lines (L20, L39), and one block per item. The spreadsheet export (`src/features/.../specExport.ts`) writes one sheet per state (approved, pending) with a header row and one row per item; the print view renders the same rows. A privacy test (P10) re-opens the workbook and checks it holds none of `lotPrivateStrings` or `projectPrivateStrings`, as P6 does for the compliance workbook.

### 5.7 Geometry (`src/domain/engines/geometry.ts`)

`dxfFor(spec: Spec): { filename: string; text: string } | { unavailable: string }`. DXF R12 text (HEADER, ENTITIES, LWPOLYLINE or POLYLINE with closed flag, units mm). Steel: the I profile from h, b, tw, tf in the section table, square corners (no root radius) with a comment line saying so. Curtain wall and precast and stone: a rectangle width by height (panel) or 1 m by 1 m by thickness for area-based families, stated in the comment. Brick: 215 by 102.5 by 65 mm face. Raised floor: 600 by 600. Timber: unavailable, "No recorded section size". Tests: the steel polyline has 12 vertices and the stated extents; the file parses as pairs of group codes and values.

### 5.8 Wish list rules (`src/domain/engines/wishlist.ts`)

- Adding the same public ID twice to one list is a no-op.
- `sendToClient(list)` moves `pending` to `sent`; `decide(list, itemId, 'approved' | 'declined', note)` moves `sent` to the decision and stamps `decidedOn = DEMO_TODAY`.
- `wishlistTotals(items, listings)`: counts, mass and avoided carbon by state, summed from the listings' public figures.
- A declined item can be re-sent after the architect edits the note. An approved item cannot be removed by the architect.

### 5.9 Assumptions

Add `timeline: { tightDays: 60 }`, `band: { high: 0.8, medium: 0.5 }` with status placeholder and the source "founder and partner, 7 October 2026 call". They appear on the Assumptions screen.

## 6. Design

### 6.1 Direction

The same tokens and type (docs/DESIGN.md) with one shift: the marketplace is a showroom. More white, bigger visuals, fewer rules. Tables stay for the owner and the consultant, where the ledger feel is right.

### 6.2 Material visuals

When a lot has public photos, the first photo is the card image. Otherwise a `MaterialSwatch` SVG generated from the record at 4:3: brick (stretcher bond in a clay or London stock tint with mortar joints), stone (pale Portland ground with faint veining), curtain wall (a glazed grid of panels with mullions and a sky gradient), precast (grey ground with an aggregate dot field), raised floor (a 600 grid of tiles), timber (grain lines), steel (the existing section drawing centred on a mill-grey ground). Deterministic from the public ID so the same lot always looks the same. The detail page carries L36 under the visual. No swatch may be described as a photo.

### 6.3 Components to build

- `MaterialSwatch`, `SustainabilityBand` (three segments, teal fills, the word beside), `TimelineStrip` (today, the availability window, the project start on one horizontal scale; teal, survey yellow or oxide by fit), `FolderNav` (the left rail with sections, folders and nested items; the active project highlighted; a version 2 item rendered greyed with the tag "V2"), `SaveToWishlist` (a popover with the projects and Saved; one click adds; a second click on the same row removes), `FilterChips` and `FilterRail`.
- Card: visual, title in display type, two tag rows (typology, family; band), facts in two columns (quantity, availability, location, mass), Save at the bottom right. Hover lifts the card by a hairline shadow; focus ring as now.
- Listing detail: visual left (photos as a strip, swatch as fallback), facts right; a "Timeline" panel with the strip when a project is selected in the page's project picker; actions as a button row (Save, Spec sheet, Geometry, BIM family greyed).
- Phone (390 px): the browse grid is one column; filters collapse to a "Filter" button that opens a sheet; capture as before. Touch targets 44 px.

### 6.4 Copy

Sentence case, plain words, British English, no dashes, no arrows, ticks or comparison signs (R7). Role names in the product: "Site surveyor", "Asset owner", "Architect", "Sustainability consultant". The buying-side owner is shown as "Asset owner, client of Merrowgate Wharf".

## 7. Labels (fixed strings; add to `labels.ts`, test in the required-labels test)

| ID | Text | Where |
|---|---|---|
| L35 | Version 2. Not in this release. | Greyed match schedule, BIM family control |
| L36 | Illustration generated from the survey record, not a photograph. | Listing detail under a swatch |
| L37 | Indicative sustainability band, rule-based. Stands in for a reviewed assessment. | Beside the band on the listing and the wish list |
| L38 | Timeline check against the project start date. Indicative. | Wish list, listing timeline panel |
| L39 | Compiled from the public listing. Confirm with the seller, the engineer and testing before specifying. | Spec sheet page and both exports |
| L40 | Approval and purchase sit with the client, not the architect. | Wish list header |
| L41 | The UK decision tree has five steps: reuse, upcycle, downcycle, recycle, scrap. The rule in this version assigns reuse, downcycle and recycle. | Priority legend |
| L42 | Geometry generated from the recorded dimensions. 2D profile only. | Geometry control |
| L43 | Expected by the surveyor. The owner sets the date when listing. | Capture and inventory |

Timeline phrases: "Available in time", "Tight: available close to the start date", "Not available in time", "Available now: storage until the start". Visibility labels: "Private", "Shared privately with selected projects", "Published to the marketplace". Band words: "High", "Medium", "Low", "Not claimed".

## 8. Seed additions (`world.ts`)

- Persona `per_isla`: Isla Fenwick, Lantern Quay Developments, Development manager.
- Org Meridale Partners (Developer). Remove Wrenlow Build.
- Building Harrowden Court: owner Pellory Estates, surveyor Tarnbrook Deconstruction, Outer London West, 1991, 5 storeys, programme from 2027-07-05, three private items (HC-01 steel UB 356x171x51 6.0 m, 40 pieces, condition B, recoverability B; HC-02 clay brick facing cement mortar 12,000 pieces, B, C; HC-03 raised floor 600 by 600, 1,800 pieces, B, A), expected availability August 2027.
- Expected availability on every Tiverne item: the month of the seeded `availableFrom`.
- Projects: Sallow Court (hotel, Pellory Estates, Studio Oriel, Camden, Central London, start 2028-01-10, RIBA stage 1, GIA 9,800) and Ferrymoor Yard (residential, Meridale Partners, Studio Oriel, Southwark, Inner London South, start 2027-06-07, RIBA stage 3, GIA 12,400). Empty bills, requirements and plans. Sallow Court's wish list holds two pending items seeded from open lots (one stone, one brick) so the folder is not empty. Ferrymoor Yard's holds one sent item.
- Merrowgate Wharf: `startDate 2027-10-04`, `clientOrgId` Lantern Quay, `architectOrgId` Studio Oriel, wish list empty.
- Studio Oriel's general list: one saved item (the pitch pine joists, L-CJGQP7).
- Distances: Harrowden Court to the hubs; Sallow Court and Ferrymoor Yard `hubDistancesKm` placeholders.

Every value on screen still comes from a domain function over the seed (R9).

## 9. Journeys (the acceptance for version 1.0; the end-to-end suite follows these)

1. **Survey.** Dana opens Clients, Ostlea Estates, Tiverne House, Capture (390 px): types the step 1 description, Assist fills the fields, she sets the expected availability to March 2027, adds a photo and saves TH-12. The inventory shows TH-12 with "Expected March 2027" and L43. She opens Pellory Estates, Harrowden Court: three items, none from Tiverne House.
2. **Decide and list.** Tom opens Tiverne House, Priority: the route column reads reuse, recycle or downcycle with the legend L41. Listings and visibility: he sets TH-01 to Published, keeps the availability date, watches the disclosure score, resets to defaults and publishes (the step 3 values). He sees Merrowgate Wharf's blind line in "Shared privately with" and that Harrowden Court is nowhere in his rail or by URL.
3. **Browse.** Priya opens Browse: the grid shows L-9F4CQQ with its swatch and band. She filters Structure, sorts by most carbon avoided, picks Merrowgate Wharf in the project picker and sees the fit tag on each card. She opens L-9F4CQQ: quantity 48 pieces, mass and avoided carbon as in step 4, band "High", the timeline strip, guide price as a secondary line. She accepts the confidentiality terms from "Shared with you" and sees the six shared Tiverne lots tagged "Shared in confidence".
4. **Wish list.** She saves L-9F4CQQ to Merrowgate Wharf. The project's wish list shows it pending, "Available in time" with the storage months, band and carbon. She downloads the geometry (a DXF with 12 vertices) and the draft spec sheet (a workbook; the test re-opens it and finds no private string). She sends the list to the client. Match schedule is greyed with L35; there is no Deals or Reuse plan entry in her rail, no mandate, offer or approve control anywhere in her screens (P11, a rendered check).
5. **Approve.** Isla opens Merrowgate Wharf, Approvals: approves L-9F4CQQ. Then the existing steps 5 to 7 (load the sample schedule, run the matcher, add the allocation, read the package, negotiate with the suggested mandate, approve) run in her workspace with the step values. Tom approves the blind offer (step 8). Isla arranges delivery and approves the booking (step 9).
6. **Prove.** Marcus reads the compliance dashboard (step 10), the wish list review (one approved item, its carbon), and ingests the bill (step 11).
7. **Run.** The operator reads the ledger and models (step 12).

Privacy checks on rendered text: P3, P4, P5b and P7 as before on the new routes; P10 on the spec workbook; P11 above. The required-labels test covers L35 to L43.

## 10. Ways of working for this file

- Tests first for every function in section 5. The worked examples of files 03 and 07 and the replay test of file 02 keep passing unchanged at store level; only the persona on steps 5 to 7 and 9 changes to Isla.
- Build order: domain, then store and shell with every route resolving to at least a titled placeholder, then the role screens, then the end-to-end journeys, then screenshots looked at and fixed.
- Keep `PLAN.md`, `docs/DECISIONS.md` and `docs/HANDOFF.md` current. Record the new allowed names and the re-reading of R1 and R8 in `docs/DECISIONS.md`.
- Nothing goes to `main`. The working branch only.

## 11. How R1 and R8 read for version 1.0

- R1. The twelve-step replay stays as the store-level test. The end-to-end acceptance is section 9. Steps 10 and 11 are still never cut.
- R8. Build what this file asks for and nothing more. Version 2 items appear only as the greyed entries named here.

## 12. Open with the partner (do not build; list on the About screen under "Open questions")

- The product name.
- The office's specification template, screenshots of tools in use, the sustainability diagram, and the list of UK and London frameworks and the decision tree. Each replaces a placeholder named in this file.
- The sustainability consultant's workflow (next call).
- Whether the engineer or testing partner gets a role in the spec sheet's growth through the stages.
- One Click LCA and EPD data as the carbon source (an integration, version 2 or later).

## 13. Resolutions after review (these override sections 1 to 12 where they differ)

An independent review against the call transcripts, the rules and the code raised 140 points. These are the decisions. Where a point is not listed here, apply the reviewer's fix if it is in your area and does not contradict this section (the full list is in the session scratchpad, `critique.md`).

### 13.1 Names, organisations and regions

- Ferrymoor Yard's client is **Quillon Homes** (developer), not Meridale Partners: Meridale is a Tiverne House tenant and a lot private string.
- Harrowden Court is owned by **Brackwater Estates** (asset owner), not Pellory Estates. Pellory Estates stays the owner of Durnley House and becomes the client of Sallow Court. No organisation is both a lot seller and a buying client.
- The buying-side owner persona is **Isla Brennan**, Lantern Quay Developments, Development manager (not Isla Fenwick).
- Allowed names to add to `names.ts`: Isla Brennan, Quillon Homes, Brackwater Estates, Harrowden Court, Sallow Court, Ferrymoor Yard. Remove Wrenlow Build and Ruth Adeyemi.
- Regions: use only regions already in the seed (Central London, Inner London East, Inner London West, Outer London East, Outer London West, East of England, South East). Ferrymoor Yard is in Hackney, Inner London East. Sallow Court is in Camden, Central London. Harrowden Court is in Ealing, Outer London West.
- No real vendor appears anywhere (section 12's "One Click LCA" becomes "a life cycle assessment database and Environmental Product Declarations").

### 13.2 Labels and the replay

- Keep `VISIBILITY_LABELS`, L6 and L7 text unchanged (the replay and the required-labels test read them). Add `OWNER_VISIBILITY_LABELS = { private: 'Private', matched_only: 'Shared privately with selected projects', open: 'Published to the marketplace' }` for the owner's new screens.
- L21 becomes "Approve as Lantern Quay Developments" (the client presses it herself now).
- At deal confirmation the buyer contact exchanged to the seller is the buying owner (Isla Brennan), not the architect. Update the replay test's expected buyer contact and record it in `docs/DECISIONS.md`. Every other acceptance value is unchanged.
- The persist `version` in `store.ts` goes to 2, so a browser holding a 0.5 world re-seeds instead of crashing. The storage prefix stays `tallyard-v05`.

### 13.3 Dates

- **Project start.** `Project.startDate` is labelled "Materials needed on site from". Merrowgate Wharf's is 2028-04-03, the same as its steel need-by, so the wish list and the reuse plan count storage to the same date. Sallow Court 2028-01-10, Ferrymoor Yard 2027-06-07.
- **Expected availability.** `InventoryItem.expectedAvailableFrom` is an ISO date, defaulting at capture to the building's dismantling start (2027-01-25 for Tiverne House), shown as a month. A captured item's lot takes it as `availableFrom`. Seeded Tiverne items take their existing `availableFrom`; no seeded date changes, so every acceptance value holds. Journey 1 leaves the default.
- The owner may edit `availableFrom` only for a lot that is still private; the demo never does.
- Add project start dates, expected availability dates and the new names to `lotPrivateStrings` and `projectPrivateStrings` as appropriate.

### 13.4 Sharing, terms and visibility on the architect side

- "Shared with you" is a route, `/market/shared`, and a rail entry under Marketplace. It is grouped by project; each group says "Shared with this project by the owner, in confidence" and carries the terms dialog for that project. Terms are per project, as now.
- A shared lot can be saved only to a project that can see it (`lotsVisibleToProject`). It cannot go to Saved or be moved to another project.
- A wish list row whose lot the project can no longer see, or whose status is "No longer available", shows the title and "No longer shared with this project" or "No longer available", no figures, and is left out of totals, the spec sheet and the client's approvals.
- The owner's sharing list stays blind (organisation type, project type, region, need-by quarter from `toBlindBuyer`). The About screen lists "Should the owner see which practice a shared project's architect is?" under open questions.

### 13.5 Wish list

- Transitions: pending to sent (send to client); sent to approved or declined (client); declined to pending (architect edits the note, then sends again). The client's decision note shows on the architect's row. An approved item cannot be removed by the architect.
- Totals sum only rows whose lot is visible and available.
- Approvals never add to the reuse plan directly. The client's Approvals screen links to the project's Match schedule (advanced), where `addToPlan` works as now. The plan, package, negotiation and logistics stay on the client's side only because steps 5 to 9 of the replay (R1) run through them; the partner said the architect does not need the reuse plan.

### 13.6 Architect-created projects

`createProject({ name, clientName, projectType, localAuthority, region, startDate })` builds a full `Project`: client organisation looked up or created as a developer, `blind { orgType: 'Design team', projectType: '<type> project' }`, `giaM2 0`, `ribaStage 1`, empty bill, requirements, plan and seeded deals, `termsAccepted false`, `approvedByOwnerOrgIds []`, `hubDistancesKm` from a fixed per-region table in the v1 assumptions, `consultantOrgId` Halewick Sustainability, `keyDates { planningSubmission: startDate, steelNeedBy: startDate }`, `frameMassT 0`, `targets { contentByValue: 0, avoidedCarbonT: 0 }`. Tested.

### 13.7 Sustainability band

Thresholds (placeholders): High at 90% or more of new avoided, Medium at 80%, Low below, "Not claimed" when no carbon is claimed. Steel and curtain wall read High, Portland stone Medium, raised floor Low on the seed.

### 13.8 Geometry

- **2D: DXF** of the profile (as section 5.7).
- **3D: OBJ** mesh, the same profile extruded along the length for steel, a box for a panel, brick or floor panel. Timber has no recorded section: unavailable.
- **BIM family (IFC or Revit)**: greyed, L35.
- File names from public fields only: `<publicId>-<designation or family>.dxf` or `.obj`, spaces as hyphens. Each file opens with comment lines carrying L20 and L42.

### 13.9 Browse

Filters and sorts are a pure, tested domain function (`src/domain/engines/browse.ts`). One filter surface: a chip row (typology) and a "More filters" panel (family, availability quarter, condition, region, band, fits the project start). On a phone the panel is a sheet. The left rail never holds filters.

### 13.10 Listing detail for the architect

A public photo, when there is one, is shown beside the dimensioned drawing, never instead of it. The architect's listing never shows reserve copy ("To reserve steel..." and L25 are for the client's view). Guide price stays, as a secondary line.

### 13.11 Layout

At phone width the folder rail collapses into a "Projects" button that opens a drawer; wish list rows become cards. Browse, listing, wish list and capture must work at 390 px; every other screen from 1024 px.

### 13.12 Consultant

Wish list review is read only: items by state with mass and avoided carbon totals. No comparison with targets.

### 13.13 Access

`WasteEngagement` gains `consultantOrgId`. `canAccess` covers buildings, projects and engagements.

### 13.14 Tests and housekeeping

- P10: the spec workbook and both geometry files hold none of the `lotPrivateStrings` of any lot. Project strings are allowed in the architect's own spec sheet.
- P11: on every architect route, no element with a test id containing `negotiat`, `mandate`, `buyer-approve`, `offer` or `deal`, and no text "Negotiation", "Mandate" or "Deals".
- The end-to-end journeys run as separate tests, each from a fresh seed, so the architect accepting terms does not disturb the replay's before-acceptance values.
- Update `src/test/boundaries.test.ts` for the new feature folders, `CLAUDE.md` to read this file, and `scripts/scan.mjs` only through `names.ts`.
