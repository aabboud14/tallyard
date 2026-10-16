# Tallyard platform: product brief

The platform for reclaimed structural and facade materials. Asset owners list what their buildings hold; architects find, shortlist and specify it; clients approve and reserve; surveyors capture; sustainability consultants prove it. Working name Tallyard, held in one constant (`PRODUCT_NAME`), to be renamed.

This replaces the guided demo with a product people sign in to and work in. It keeps what the partner liked (capture, grades, priority with routes, listings and privacy, visual browse, avoided carbon, the compliance outputs) and the decisions from the two calls of 7 October 2026 (`../brief/09-V1-PRODUCT.md` sections 1 to 3 and 13 hold them; read those sections for the reasoning).

## 1. Principles

1. **A product, not a demo.** Sign in, land on your own home, work project by project. No narration, no presenter controls.
2. **One interface per role.** The organisation's type decides the workspace. Navigation is folders: projects for architects, clients and consultants; clients and buildings for surveyors; buildings for owners.
3. **Decision rights.** Architects choose on function, aesthetics and environmental performance; they never price, negotiate or buy. Clients approve and reserve. Owners decide what is visible, to whom and from when.
4. **Visual first for architects.** Discover feels like a curated showroom: large images, calm type, fast filters.
5. **Timing is a first-class fact.** Every material shows when it is available and whether that fits the project.
6. **Private by default.** Owners control visibility: private, shared with selected projects, or published. Nothing private crosses before a reservation is accepted.
7. **AI behind the scenes.** Smart defaults (capture assist, ranking, matching) are just how the product works. No chat box, no "AI" branding.

## 2. Accounts, organisations and the sandbox

- **Sandbox.** All data lives in the visitor's browser (Zustand persisted under keys prefixed `tallyard-platform-v1`, photos in IndexedDB `tallyard-platform-v1-photos`). On first visit the sandbox is seeded from `src/domain/seed/world.ts`, with every date shifted so the sample programme sits in the same place relative to today as it does to 7 October 2026 in the seed (shift `YYYY-MM-DD` strings by whole days and `YYYY-MM` strings by whole months; `src/sandbox/shift.ts`, tested). Settings, Sandbox can reset it.
- **Sample accounts** (password `sandbox` for all), shown as one-click cards on the sign-in page:

| Person | Organisation | Role in the product | Email |
|---|---|---|---|
| Priya Nair | Studio Oriel | Architect | priya.nair@studiooriel.example |
| Isla Brennan | Lantern Quay Developments | Client (developer) | isla.brennan@lanternquay.example |
| Tom Ashby | Ostlea Estates | Asset owner | tom.ashby@ostlea.example |
| Dana Kowalski | Tarnbrook Deconstruction | Site surveyor | dana.kowalski@tarnbrook.example |
| Marcus Lindqvist | Halewick Sustainability | Sustainability consultant | marcus.lindqvist@halewick.example |

- **Auth (sandbox).** Email and password sign-in (passwords stored as SHA-256 via WebCrypto, never plain), sign-up (name, email, password, then organisation name and type: architecture practice, developer or client, asset owner, surveying firm, sustainability consultancy), forgot password (in the sandbox the reset happens on the page, and it says so), sign out, remember me. A user maps to a persona in the world (`world.personas`) and an organisation (`world.orgs`) so the existing access rules work. New organisations start empty with a short onboarding: architects create their first project; owners add their first building; surveyors are told they will see buildings when a client appoints them.
- **Team.** Settings, Team lists members and pending invites. Invite by email creates a pending invite with a copyable link (`/invite/:token`); opening it signs up straight into that organisation.
- **Sandbox account switcher.** In the avatar menu, "Switch account" lists the sample accounts (sandbox only), so a tester can follow an item from owner to architect to client without retyping passwords.

## 3. Information architecture and routes

Browser routes (Vercel rewrites everything to `index.html`). IDs in URLs, never names.

Public: `/` landing (hero, one line per role, sign-in and get-started), `/signin`, `/signup`, `/forgot-password`, `/invite/:token`.

App (signed in only; otherwise redirect to `/signin?next=`): `/app` redirects to `/app/home`.

| Route | Architect | Client | Owner | Surveyor | Consultant |
|---|---|---|---|---|---|
| `/app/home` | dashboard | dashboard | dashboard | dashboard | dashboard |
| `/app/discover`, `/app/discover/:publicId` | yes | yes (read) | | | yes (read) |
| `/app/saved` | yes | | | | |
| `/app/projects`, `/app/projects/new` | yes | yes (list) | | | yes (list) |
| `/app/projects/:projectId` (overview) | yes | yes | | | yes |
| `.../shortlist` | yes | | | | |
| `.../specification` | yes | yes (read) | | | |
| `.../approvals` | | yes | | | |
| `.../reservations` | | yes | | | |
| `.../carbon` | yes (read) | yes (read) | | | yes |
| `.../compliance` | | | | | yes |
| `.../team`, `.../activity` | yes | yes | | | yes |
| `.../matching` (version 2, locked) | yes | | | | |
| `/app/buildings`, `/app/buildings/:buildingId` | | | yes | yes | |
| `.../inventory`, `.../inventory/:itemId` | | | yes | yes | |
| `.../capture` | | | yes | yes | |
| `.../priorities`, `.../listings`, `.../sharing` | | | yes | | |
| `/app/requests` | | | yes | | |
| `/app/engagements/:engagementId/waste` | | | | | yes |
| `/app/notifications`, `/app/settings/*`, `/app/help/*` | all | all | all | all | all |

A route the signed-in user cannot access renders a calm "You do not have access to this" page with a link home, never data.

## 4. App shell

- **Sidebar** (240 px, collapsible to icons; a drawer below 1024 px): organisation switcher at the top (name, type, avatar; one organisation per user in the sandbox), then role sections. Architect: Home, Discover, Saved, Projects (each project as a folder, expandable to Overview, Shortlist, Specification, Carbon, Team; Matching shown with a "Soon" pill), New project. Client: Home, Projects (Overview, Approvals with a count badge, Reservations, Specification, Carbon). Owner: Home, Buildings (each as a folder: Overview, Inventory, Priorities, Listings, Sharing), Requests (count badge). Surveyor: Home, Clients (each client folder with its buildings: Capture, Inventory). Consultant: Home, Projects (Overview, Carbon, Compliance), Engagements. Bottom: Help, Settings.
- **Top bar** (56 px): breadcrumb, global search (Cmd or Ctrl K opens a command palette over materials, projects, buildings and pages), notifications bell with unread count and a popover inbox, the Sandbox badge, avatar menu (profile, settings, switch account, sign out).
- **Notifications** are generated by actions and addressed to organisations: owner shared lots with a project; architect sent items to the client; client approved or declined; client requested a reservation; owner accepted or declined; surveyor submitted a survey; new published material that fits one of your projects. Each has a title, one line, a link, a time ("2 hours ago" from the clock) and read state. `/app/notifications` lists them with filters.
- **Activity** per project and building: who did what, when.
- **Toasts** confirm actions ("Saved to Merrowgate Wharf", with Undo where it is cheap).

## 5. Architect (the deepest workspace)

- **Home.** Greeting with the date; three stat tiles (active projects, items shortlisted, avoided carbon on approved items, indicative); "Your projects" cards (type, client, materials needed from, shortlist progress bar by status); "New for your projects" row of materials that fit a project's start date, listed in the last 30 days; "Waiting on your client" list; recent activity.
- **Discover.** Search box (text over title, family, material, location), typology tabs (All, Structure, Envelope, Finishes) with counts, a Filters popover (family, condition, availability by quarter, location, sustainability band, fits the selected project), sort (newest, most carbon avoided, lowest guide price), a "Checking against" project picker that adds a fit pill to every card, and a "Shared with you" tab for lots owners shared privately with one of your projects (behind the confidentiality terms, accepted once per project). Grid of large cards: image (first public photo, else the generated material illustration), title, typology and family, quantity, available from, location, fit pill, band; a Save button on hover and always on touch. Empty and no-results states with clear filters.
- **Material page.** Breadcrumb; image gallery (photos, illustration with the line "Illustration generated from the survey record", and the dimensioned drawing); title and tags; key facts; availability with a timeline strip against the selected project; sustainability panel (avoided carbon, percent of new, band, Indicative with a methodology link); specification table (all public fields); location and collection point; guide price (secondary); "Listed by an asset owner in Central London" (public fields only); actions: Save to project (menu of projects and Saved), Download 2D (DXF), Download 3D (OBJ), BIM family (locked, "Coming in version 2"), Add to specification (for approved items). "Similar materials" row.
- **Saved.** A general list for materials with no project yet; move to a project.
- **Projects.** List as cards or table (name, client, type, RIBA stage, materials needed from, shortlist counts, last activity). New project dialog: name, client (existing client or new), type (office, hotel, residential, other), local authority and region, RIBA stage, materials needed on site from.
- **Project workspace.** Header (name, client, type, stage, location, start date, team avatars) and tabs:
  - **Overview:** programme timeline (today, each shortlisted item's availability window, the start date), counts by status, carbon secured versus shortlisted, next steps.
  - **Shortlist:** board with columns Shortlisted, Sent to client, Approved, Declined; cards with image, title, quantity, fit pill, band, note; select several and "Send to client" with a message; a declined card shows the client's note and can be reopened; approved cards cannot be removed by the architect. A list view toggle.
  - **Specification:** the architect-owned specification schedule built from approved items (draft mode includes shortlisted ones): one clause per item from public fields, with an editable architect's note per clause and project header; caveats; Export spreadsheet (ExcelJS) and Print to PDF (print stylesheet, A4).
  - **Carbon:** avoided carbon and mass by status, by typology, with methodology.
  - **Team:** client, consultant and practice members; invite.
  - **Activity.**
  - **Matching:** locked, version 2: "Upload a BIM model or a steel schedule and match it against the whole marketplace."

## 6. Client (developer)

Home (projects, approvals waiting, reservations in progress). **Approvals:** items the architect sent, as cards with image, key facts, fit, carbon, band and guide price range; Approve or Decline with an optional note; history. **Reservations:** approved items with an indicative package (storage, testing, transport, from the package engine) and "Request reservation"; the seller sees a blind request; status pending, accepted or declined; after acceptance both sides see each other's organisation and contact. Read access to the specification and carbon.

## 7. Asset owner

Home (portfolio stats: buildings, items surveyed, listed, shared, reserved; potential avoided carbon; requests awaiting you; activity). **Buildings** list and building workspace: Overview (address and programme, private; survey status; inventory by typology), Inventory (table with photo, tag, material, quantity, condition, recoverability, expected availability, visibility; a side panel per item to edit availability and visibility), Priorities (ranked list with the UK decision tree route, legend, score breakdown), Listings (per item: Private, Shared with selected projects, Published; disclosure settings with the disclosure score and a live preview of what buyers see), Sharing (projects that may see shared items, as blind lines; grant or revoke). **Requests:** reservation requests as blind lines; Accept or Decline; accepted ones show the buyer organisation and contact.

## 8. Site surveyor

Home (appointments by client with progress). Clients, then buildings. **Capture** (phone-first): describe the item and the fields fill from the text (capture assist), family, dimensions, quantity, condition A to C, recoverability A to C, location in the building, expected availability (month), photos (upload, stored in IndexedDB), notes; Save and capture another. **Inventory** of the building. **Submit survey to client** notifies the owner.

## 9. Sustainability consultant

Home (projects, carbon summary). Project Carbon (shortlisted and approved items by status), Compliance (reused content by value, avoided carbon, export workbook, print), Engagements, Waste (import the sample demolition bill, review rows, export).

## 10. Settings and help

Settings: Profile (name, title, email, avatar colour), Organisation (name, type, address), Team (members, invites), Notifications (which events, in-app only), Sandbox (reset data, list of sample accounts). Help: Getting started per role, Methodology (every factor and price with source and status, the rule-based steps, what Indicative means), Version 2 (BIM matching, BIM families, real accounts and shared data, integrations with a life cycle assessment database and product declarations).

## 11. Design system

Calm, precise, premium; the quality of a well-made B2B product (think the restraint of Linear, the clarity of Stripe's dashboard, the visual browsing of a good image board). Light theme.

- **Type:** Inter variable (`@fontsource-variable/inter`), 14 px base in the app, 15 px on public pages; tabular numbers for figures; weights 400, 500, 600.
- **Colour tokens** (Tailwind `@theme`): neutrals from near-white `#FAFAF9` page, white surfaces, borders `#E7E5E4`, text `#1C1917` and `#57534E`, muted `#78716C`; brand forest green (`brand-600 #1F6B53`, `brand-700 #175541`, `brand-50 #EEF6F2`, `brand-100 #D5EBE1`); info blue `#2563EB`; warning amber `#B45309` on `#FEF3C7`; danger `#B91C1C` on `#FEE2E2`; band colours from brand tints. Status colours: Shortlisted neutral, Sent blue, Approved green, Declined red; fit: in time green, tight amber, late red, now neutral.
- **Shape and depth:** 8 px radius on cards and inputs, 6 px on buttons, 1 px borders, `shadow-sm` on raised cards, a soft shadow on popovers. 4 px spacing grid; generous whitespace on Discover and material pages; denser tables for owners and consultants.
- **Components** (`src/ui/`): Button (primary, secondary, ghost, danger; sm, md; icon), Input, Textarea, Select, Checkbox, Switch, Badge and Pill, Avatar, Card, Stat, Tabs, Table, Dialog, Sheet or Drawer, DropdownMenu, Popover, Tooltip, Toast, CommandPalette, EmptyState, Skeleton, Breadcrumbs, PageHeader, Kbd, ProgressBar, Timeline strip, MaterialImage (photo or illustration), SustainabilityBand, FitPill. Built on `radix-ui` primitives and `lucide-react` icons. Every interactive element has a visible focus ring.
- **Logo:** a simple geometric mark (stacked beams) in brand green with the wordmark.

## 12. Code layout and contracts

```
src/domain/     pure logic (engines, privacy, reference, seed), copied from the demo; tests stay green
src/sandbox/    clock.ts, shift.ts, accounts.ts (sample accounts, password hashing), seed.ts (first-run world)
src/store/      app.ts (the persisted store), session.ts, notifications.ts, actions/*.ts, selectors/*.ts
src/ui/         the design system
src/app/        router.tsx, layouts (PublicLayout, AuthLayout, AppShell), nav.ts, guards
src/features/   auth, onboarding, home, discover, material, saved, projects, shortlist, specification,
                approvals, reservations, buildings, inventory, capture, priorities, listings, sharing,
                requests, carbon, compliance, waste, notifications, settings, help
```

Contracts every feature uses:

- `useApp` (Zustand, persisted) holds `{ world, users, invites, notifications, activity, ui }`. `apply(fn: (w: World) => World)` runs a pure world update. Actions are pure functions `(state, ...) => state` in `src/store/actions/`, tested, and record activity and notifications.
- `useSession()` gives `{ user, persona, org, role, signIn, signUp, signOut, switchAccount }`; `role` is `'architect' | 'client' | 'owner' | 'surveyor' | 'consultant'`.
- Selectors in `src/store/selectors/` give every screen its view model from the world and the session, built only from the privacy projections for anything the other side owns.
- `today()` from `src/sandbox/clock.ts` is the only clock.

## 13. Acceptance

- A first-time visitor lands on `/`, signs in as Priya with one click, and within a minute has: browsed Discover, opened a material, saved it to Merrowgate Wharf, seen its fit, sent it to the client, downloaded its DXF and exported the specification.
- Switching to Isla, she sees the notification, approves, requests a reservation; Tom sees a blind request and accepts; both then see each other's organisation.
- Dana captures an item on a phone-width screen with a photo; Tom sees it in Inventory and the notification.
- Marcus opens the project's Carbon and Compliance and exports the workbook.
- A new visitor can sign up as an architecture practice, create a project and start saving materials.
- `npm run check` passes; Playwright covers the journeys above at 1440 px and the capture and discover screens at 390 px; no horizontal scroll; privacy tests prove the architect and client never receive seller-private strings and the owner never receives buyer-private strings before acceptance.

## 14. Round 2: changes from the review of 14 October 2026

The partner's notes are in `feedback/2026-10-14-review.md`. The detailed designs, one per area, are in `feedback/r2-design/` and are part of this spec: `shell-dashboards.md`, `marketplace-material.md`, `projects-timeline.md`, `owner-surveyor.md`, `client-consultant.md`, `visual-qa.md`. Where this section and a design differ, this section wins. Where two designs differ, the resolution below wins.

### 14.1 Decisions on each note

Overall look and dashboards
- Graphics: a technical drawing style (ink hairlines, flat material fills, no glows, gradients or blur), generated axonometric thumbnails for projects and buildings, colour-coded metric tiles with donuts, rings, bars and target meters. The landing page keeps its structure and gains a drawing of a building coming down beside one going up, a facts band and a product shot of the new dashboard. See `shell-dashboards.md` B and E7, refined by `visual-qa.md`.
- Every role's home becomes a dashboard with four metric tiles, thumbnails and a collapsible Recent activity panel (collapsed by default).
- Discover is renamed Marketplace in every label. Its address moves to `/app/marketplace` and `/app/marketplace/:publicId`; `/app/discover...` redirects there, keeping the query string, so stored links keep working. Code identifiers keep the old name.
- "Waiting on your client" becomes "Waiting for approval" on every architect surface.
- The architect's "New for your projects" feed moves into the Marketplace; the home keeps a per-project "{n} new materials fit" link.
- Sidebar projects sort by name A to Z by default, with a menu for client grouping, recent activity and a client filter, kept per person.

Marketplace and material pages
- The Marketplace opens on three category folders (Structure, Envelope, Finishes) with thumbnail mosaics, then New for your projects (architects), then All materials. Inner tabs: "All listings" and "Shared with you".
- "Checking against" defaults to no project and becomes a visible strip with fit counts and an "Only show what arrives in time" switch. A project named in a link (?project=) applies to that visit only; only a choice made in the strip or on the material page is remembered.
- Quarter labels go: availability reads "Expected January to March 2027", "Expected November 2026" or "Available now", from the disclosed window only. The availability filter becomes a month slider with a histogram.
- Architects and consultants no longer see the guide price, the price sort or seller details. Clients keep them. The architect's specification (on screen, in print and in the spreadsheet) has no Price section and no market signal caveat; the client's keeps both.
- Material page order: pictures and 3D, save to project and downloads, availability, sustainability, key facts, specification. A plain white stage, sections divided by hairlines.
- Spinnable 3D view: a custom SVG renderer (`view3d.ts`, `ModelViewer.tsx`), not three.js. Revit-compatible download: IFC4 generated as text (`ifc.ts`). OBJ and DXF stay.

Project setup and timeline
- Each project stores RIBA stage 0 to 4 start dates, site start and practical completion; stages 5 to 7 derive from them. New projects get suggested dates (marked Suggested and Indicative) that the architect confirms or edits.
- The overview leads with a full-width programme chart: stage bands, milestones, a today line labelled with the planned stage, and each shortlisted material's availability coloured by fit. An Indicative pill compares the planned stage with the declared one.
- Region and local authority are dropdowns (all 33 London authorities by product region, short lists elsewhere, plus "Another local authority"). They pull planning and sustainability requirements from one dataset (`reference/requirements.ts`) to select; optional for architects, with statutory items pre-ticked.
- Thirteen project types plus "Other" with an optional description that never reaches sellers.
- New projects show a setup checklist. Draggable availability bars are listed under Help, Version 2.
- Client linking needs the client organisation's acceptance. Until then the client cannot see the project, the architect sees only the client organisation's name, and nothing can be sent for approval. Clients answer on `/app/projects/requests`.

Donor buildings and surveyors
- The owner role reads "Donor building owner"; building kinds read "Donor building" and "New project"; "Priorities" becomes "Recovery plan" (the route stays `/priorities`). The stored organisation type stays `Asset owner`.
- A "New project" is a Project on which the owner organisation is the client and developer, so it gets approvals and reservations. Owners may appoint an architecture practice to it directly.
- Surveyors get a standalone Capture page (`/app/capture`) with a building picker, and can add a building before any appointment; it links to its owner through a claim addressed to the owner's email, which the owner accepts or declines. Submitting a survey waits for the link.
- Testing companies are reference data; a testing request records status and results and notifies the other side. Owners or surveyors appoint a deconstruction contractor per building, who sets expected availability dates; the owner applies them to private lots.
- Share links: an owner creates a revocable link to chosen shared lots of one building; anyone signed in who accepts the confidentiality terms sees them as public listings. The owner sees only how many organisations opened it and their types.
- Building structure is a list of elements (frame, floor slabs, roof, stability, foundations, facade), each with a material and a system from a fixed table.

Developer and consultant
- See `client-consultant.md`: client dashboard with cost, savings, carbon, reuse share and certification tracking, a parallel programme timeline across projects and a to-do list; financial metrics on Approvals and Reservations and a carbon summary on Reservations; requirement tracking per project from the shared dataset; a consultant Goals and targets tab with overridable targets, an auto-written circular economy statement, a Sustainability tab in place of Carbon, and an interactive certification map.

### 14.2 Resolutions between designs
- Route: `/app/marketplace` with redirects (`shell-dashboards.md` A), not the unchanged path in `marketplace-material.md`.
- New for your projects: one feed function `newForProjectsFeed` in `store/selectors/marketplace.ts`; the row lives in the Marketplace (`marketplace-material.md`); the architect home shows per-project counts (`shell-dashboards.md`).
- Collapsible panels: one component, `ui/CollapsiblePanel.tsx` with `usePersistentToggle` (browser storage, wrapped in try and catch). The project overview uses it with the id `project-activity`. No `UiState.panels`.
- One state version bump: `STATE_VERSION` 2 for all of round 2. Stored version 1 sandboxes reseed.
- Owner organisations can be a project's client only through their own New project. An architect's client picker still lists only client organisations and new names; owners are never found by name.
- `CollapsibleCard` in `projects-timeline.md` H8 is replaced by `CollapsiblePanel`.
- Colour: the validated data-vis tokens in `visual-qa.md` win over the typology colours in `shell-dashboards.md`: categorical `viz-1` to `viz-6`, the first three slots for Structure, Envelope and Finishes, every chart with a text legend. Metric tiles are coloured by state against a target (good, warning, critical, neutral, each with an icon and a word), from a pure function, not by metric kind.
- Thumbnails: the axonometric massing drawings of `shell-dashboards.md` B3, drawn in the line and fill rules of `visual-qa.md`. Steel material illustrations become axonometric drawings of the member at its recorded length.
- Ownership of shared components: the design system stream builds every `src/ui` component named in any design (charts, thumbnails, illustrations, `CollapsiblePanel`, `ModelViewer`, `ProgrammeChart`, the portfolio timeline used by the client home) with its tests, plus the landing and sign-in surfaces. Feature streams compose them.
- Sustainability tab: `/app/projects/:id/sustainability` for every side, with `/carbon` redirecting there (`client-consultant.md`). The consultant alone gets Goals and targets, Certification, Circular economy and Compliance; Requirements is shared. `effectiveTargets(state, projectId)` is the one source of project targets for every dashboard.
- Requirements: the architect chooses which apply (`projects-timeline.md`); clients and consultants track status and evidence on the Requirements tab (`client-consultant.md`). The architect reads the tracking.
- The second Lantern Quay project, Kilnworth Place by Tessaly Architects, is seeded so the client's parallel timeline has more than one row. It carries the round 2 project fields (programme, accepted client link, requirements).
- The circular economy statement exports to Word through `jszip`, declared as a direct dependency at the version already in the lockfile.

### 14.3 Spec changes that change existing tests (P8)
These assertions change because the partner changed the product, not to make code pass. Each changed assertion is listed with its reason in `feedback/r2-test-changes-*.md`:
- The client notification on project creation becomes a link request ("Studio Oriel asked to add you as client on ..."), and the project stays out of the client's workspace until accepted.
- `checkingProjectFor` defaults to no project.
- Availability text in the specification export reads "Expected January to March 2027" instead of a quarter.
- The architect's material view has no price or seller line; the price sort is for clients.
- The sidebar orders projects by name.
- Labels "Discover" and "Waiting on" become "Marketplace" and "Waiting for approval"; "Priorities" becomes "Recovery plan".
- Quarter labels go on every surface, the seller side included: the blind buyer line "needed by Q2 2028" becomes "needed April to June 2028". It is the same three-month window, so `toBlindBuyer` discloses nothing more; its tests change to the new wording.
- The category folders' fit count uses the same words as the checking strip, so the two read alike.

### 14.5 Follow-up from the recording audit (16 October 2026)
The recording audit found gaps between the round 2 build and the review. Seven packages closed them; each package's notes, decisions and changed assertions are in `feedback/r2f-<package>.md`, and the merge's own in `feedback/r2f-merge.md`.

Owner, surveyor and contractor (`feedback/r2f-owner.md`)
- A surveyor moves what she captured early into the building an owner later appointed her to (`mergeSurveyBuilding`), from a prompt on her home, Appointments and the building's Overview; an owner asked to confirm a building he already has confirms it into his own record.
- A testing request carries its message, preferred date and a request sheet (`testingRequestText`) that both sides can view, copy and download; the toast keeps Undo.
- Harrowden Court is seeded with Tarnbrook as contractor. Changing or removing a contractor clears its dates (Undo restores them). Contractors can be invited by email; an invite waits on the building until a firm with that email joins, and reveals nothing about other organisations.
- Every owner gets the Marketplace with the client view (prices, no save) and never sees its own lots; the owner home shows recoverable value (Indicative) and, once it has a New project, the developer figures.
- Add new project opens on New project; the last Priority labels read Recovery plan; a link this browser never saw says so instead of looking revoked; buildings get an activity page.

Client and consultant (`feedback/r2f-client_consultant.md`)
- A consultancy is asked only after the client accepts and sees the project only once it accepts too (`Project.consultantLink`); until then it is named as waiting to accept or declined, never as setting targets.
- A new client contact email issues a project invite; signing up with that email joins the client organisation, and the open sign-up page names no organisation or project.
- The consultant gets his own Overview section and Projects list, home meters read the Goals and targets rows (secured carbon), and Targets met counts every goal with a target.
- The circular economy statement is rewritten, bulleted on screen and in Word, and frozen on send; later edits keep the sent copy with the client and offer "Send the updated statement".
- Developer tracking shows every scheme cell with a rating state from one pure rule (`goalState`).

Requirements (`feedback/r2f-requirements.md`)
- An unreviewed project tracks the suggested requirements, and every screen says so; a move adds the new place's suggestions on saving.
- London regions follow the ONS inner and outer split; the other English regions, Wales and Scotland are added with hub distances labelled as Tallyard estimates and "Not yet summarised" placeholders.
- The local authority dropdown lists every authority grouped by region and sets the region; a listed authority is valid only in its own region, in project forms and donor building forms alike.
- Donor buildings get requirements before demolition, tracked by the owner and the surveyor (a contractor alone and buyers cannot open them), with at-risk badges and lines on both homes.

Marketplace and material pages (`feedback/r2f-market.md`)
- The home link lands on the New for {project} row, also from a pasted or reloaded address, and Back returns to it (`scrollPlan`).
- A project named in a link applies to that visit only; the material page keeps it on the way back.
- The client waiting pill reads "Client to accept" with a neutral envelope icon; the sidebar menu names the current order.
- The material page stage draws technical drawings on plain white; UC columns stand upright. Quarter helpers are fenced by a guard test.

Look and first runs (`feedback/r2f-look.md`)
- A project draws the same for every role (`projectVisual`), with the facade typical of its use where nothing shortlisted shows one, labelled as typical.
- Marketplace steel cards lead with the cut end of the member at one common scale; the material page keeps the axonometric.
- New projects lead the architect home with their setup and next step; Active projects counts only accepted projects; each card splits its new materials by fit and by likeness to its shortlist.
- New architects, clients, consultancies, owners and surveying firms open on a first run with next steps instead of zero tiles. The landing product shot runs the real seed and lists the six frameworks.

Programme (`feedback/r2f-programme.md`)
- The programme card leads every overview, with Keep these dates and Edit programme on the card only; the setup checklist follows as one strip leading with the next required step.
- Stage bands name themselves when they fit, today's stage always, with a key, keyboard focus and a tap panel; the whole programme ends 120 days after practical completion.
- The axis labels months, never quarters, thinned by width so labels never collide and a year is always named.
- The client may set the programme of their own new project until an architect is appointed; those dates then read as the client's until the architect confirms them.

Returning visitors (`feedback/r2f-upgrade.md`)
- The state key is versioned (`tallyard-platform-v2-state`), so a tab of an older build can no longer reseed the new one.
- A replaced version 1 sandbox, or a version 2 sandbox carried over from the earlier round 2 build, shows a closable notice on every home with "See what changed" (Help, Updated on 16 October).
- Sign-in after the update explains that earlier accounts need creating again, except for a likely typo, and sign-up starts with the typed email; open tabs offer Reload when a newer build is deployed.
