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
