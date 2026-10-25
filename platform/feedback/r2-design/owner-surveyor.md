# owner-surveyor

## Decisions
- **Satisfies 'capture without first navigating into a building' with no new capture logic: the form is extracted from Capture.tsx and reused by both the building tab and the standalone page. Switching building keeps what was typed.**: Standalone capture is a new page /app/capture for surveyors (and owners), with a building picker at the top of the existing capture form; the last building is remembered per person in ui.captureBuildingId.
- **Addressing by email avoids listing every donor building owner to surveyors (privacy by construction) and gives the owner the approval the note asks for. Lots of an unlinked building stay private: only an owner can share or publish. Submitting the survey is refused until the building is linked.**: A surveyor can add a building before any client appointment. It is a SourceBuilding with ownerOrgId null, surveyorOrgId and createdByOrgId set to the surveyor's firm. It is linked to its owner by a BuildingClaim addressed to the owner's email; only an owner organisation with a member using that email can accept or decline.
- **No new role: in the sandbox no outside firm signs in, and the notes only ask to notify one. Recording results updates each item's test status and steel grade; on shared or published lots only the owner may record them, mirroring the existing lock on listing fields.**: Testing companies are reference data (three fictional firms in src/domain/reference/testing.ts), not organisations with users. A TestingRequest record (AppData.testingRequests) carries status Sent, Visit booked, Results recorded or Cancelled; the requester records the booking and the results, and the other side is notified.
- **Same organisation type as surveyors, so no new role; the sign-up label becomes 'Surveying or deconstruction firm'. The contractor's date is kept apart from the surveyor's estimate so the owner sees both. Owner control is preserved: lot.availableFrom still changes only through the owner and only while the lot is private.**: The deconstruction contractor is an organisation of type 'Deconstruction contractor' (the surveyor workspace), appointed per building in SourceBuilding.contractorOrgId by the owner or the surveyor. It gets a new building side 'contractor' with Overview and a new Availability tab, and writes InventoryItem.contractorAvailableFrom. The owner applies those dates to private lots; nothing a contractor does reaches buyers.
- **Simplest coherent reading: a building that needs materials is demand, which the platform already models as a Project with approvals and reservations. A flag on SourceBuilding would duplicate the record and give the owner no way to approve or reserve. Requires projectSide to treat an owner whose organisation is the project's client as the client side (one line in src/store/access.ts).**: A 'new project' is not a SourceBuilding flag but a Project on which the owner organisation is the client and developer. The owner flags the kind when adding a building (Donor building or New project); new projects then appear in the owner's portfolio, sidebar and home next to donor buildings.
- **The approval concern in the notes is an architect claiming a client without consent. When the client-linking cluster's approval flow targets an owner organisation, the request lands on the owner's Requests page and approving it makes the project one of the owner's New projects.**: Owners may appoint an architecture practice to their new project immediately (like appointing a surveyor); no approval step for owner-initiated appointments.
- **'Donor building' names the building, so the organisation is its owner; owners can also build, so the organisation label cannot be 'Donor building' alone. Keeping the stored value avoids a data migration and keeps domain access and privacy tests stable.**: Rename: role label, sample account card, account menu and sign-up type become 'Donor building owner'; building kind pills read 'Donor building' and 'New project'; the owner sidebar sections read 'Donor buildings' and 'New projects'; the landing role card reads 'Donor buildings'; public seller wording reads 'a donor building owner'. The stored organisation type value stays 'Asset owner'.
- **The page ranks what to recover first and assigns the decision tree route, which is a plan. Keeping the path keeps persisted notification links valid.**: 'Priorities' becomes 'Recovery plan' in every label; the route stays /priorities.
- **projectCanSee and lotsVisibleToProject keep their signatures, so shortlists, reservations and Discover follow automatically. The owner sees only how many organisations opened the link and their types, never names (blind, like toBlindBuyer). The owner's label is never shown to openers.**: Share links live in the world (World.shareLinks) so the existing domain visibility function can honour them without changing any caller's signature. A link holds chosen Shared lots of one building; anyone signed in who accepts the link's confidentiality terms sees those lots as public listings; the opener's projects can shortlist them; revoking removes them everywhere.
- **Fixed choices make the record comparable and searchable; a summary line is generated by a pure, tested function. Both owner and surveyor may edit it, since the surveyor usually knows the structure best.**: Granular structure is a list of StructuralElement rows (frame, floor slabs, roof structure, stability system, foundations, facade), each with a material and a system from a fixed table, plus a note. The free-text structureType field remains as 'Other notes on the structure'.
- **Seeding an owner-client project would put Ostlea Estates into allProjectStrings and break the existing seller privacy tests by definition, not by a leak. The new-project path is covered by unit, privacy and e2e tests instead.**: No new owner project is seeded; the sandbox seeds a contractor (Fennick Dismantling) with dates on Tiverne House, a booked testing request, an unused share link and a surveyor-added building (Ambrey House) waiting for Tom's confirmation.
- **The persisted store re-seeds on any other version, so no migration code is needed.**: STATE_VERSION goes from 1 to 2 once for round 2 (shared with other clusters), adding AppData.buildingClaims and AppData.testingRequests and UiState.captureBuildingId.

## Spec
# 14.4 Surveyor and donor building owner flows (cluster owner-surveyor)

Source: review of 14 October 2026, section "Surveyor and asset owner flows". Every carbon, price or timeline figure keeps its existing Indicative marker; this section adds no new figure of those kinds. All copy below is British English, sentence case, no em or en dashes, no arrow, tick or comparison characters in UI text.

## 14.4.0 What each note becomes

| Note | Decision |
|---|---|
| Standalone Capture | New page `/app/capture` (sidebar item for surveyors) with a building picker above the existing capture form. |
| Surveyors create projects before a client invite | Surveyors add buildings themselves. Each is linked to its owner by a claim addressed to the owner's email; the owner accepts or declines on Requests, Buildings tab. |
| Notify a testing company | Testing tab on the building: a testing request to one of three fictional testing companies, with status, booking, results and notifications. No new role. |
| Invite the deconstruction company to set availability dates | Owner or surveyor appoints a deconstruction contractor per building. The contractor sets expected months on an Availability tab; the owner applies them to private lots. |
| Client linking by architects needs approval | Designed by the client-linking cluster. Owner-side impact only: see 14.4.8. |
| Owners donate and build | Add building asks: Donor building or New project. A new project is a Project with the owner organisation as client. |
| Rename asset owner, rename Priorities | "Donor building owner" for the organisation and role, "Donor building" and "New project" for building kinds, "Recovery plan" for Priorities. |
| Link-based sharing, revocable | Share links on the Sharing tab; `/app/links/:linkId` for anyone signed in; revoke at any time. Links live in this browser. |
| Granular structure | Structure card with rows for frame, floor slabs, roof structure, stability system, foundations, facade, each with a material and a system. |

## 14.4.1 Naming (exact label changes)

| Where | Was | Becomes |
|---|---|---|
| `ROLE_LABELS.owner` (src/sandbox/accounts.ts): sign-in sample card, account menu, team lists | Asset owner | Donor building owner |
| `ORG_TYPES` label for value `Asset owner` (sign-up) | Asset owner | Donor building owner |
| `ORG_TYPES` label for value `Deconstruction contractor` (sign-up) | Surveying firm | Surveying or deconstruction firm |
| Sign-up description (src/features/auth/constants.ts `PRESENTATION.owner`) | List what your buildings hold | List what your buildings hold, and source for new ones |
| Sign-up description `PRESENTATION.surveyor` | Capture materials on site | Survey buildings and plan when materials come out |
| `ROLE_TITLES.owner` (src/store/selectors/common.ts) | Asset owner | Donor building owner |
| Landing role card (src/features/public/Landing.tsx `ROLES`) | role 'Asset owners', tools Inventory, Priorities, Sharing | role 'Donor buildings', line 'Know what your buildings hold, decide what is visible, to whom and from when, and source materials for your new projects.', tools Inventory, Recovery plan, Sharing |
| Landing sign-in line | an asset owner | a donor building owner |
| Owner sidebar section | Buildings | Donor buildings (and a second section New projects when any) |
| Building tab label | Priorities | Recovery plan |
| Priorities page heading (Priorities.tsx) | Priorities | Recovery plan |
| Help, owner section title (Help.tsx) | Asset owners | Donor building owners; step 2 text 'The recovery plan ranks items by net value, avoided carbon, demand and ease, with their route on the UK decision tree.' |
| Notification and toast bodies (owner.ts, seed.ts) | shared in confidence by an asset owner | shared in confidence by a donor building owner |
| `NOTIFICATION_KIND_INFO.lots_shared.description` | An asset owner shares lots | A donor building owner shares lots |
| Sharing.tsx callout, ListingEditor.tsx preview line | listed by an asset owner | listed by a donor building owner |
| `sellerPhrase` (common.ts) for sellerType 'Asset owner' | an asset owner | a donor building owner (via a label map `SELLER_TYPE_LABELS = { 'Asset owner': 'donor building owner' }`; the data value is unchanged) |
| Discover empty states (marketplace cluster's file) | asset owners | donor building owners |
| Building kind pills | (none) | Donor building, New project |

Unchanged on purpose: the stored organisation type value 'Asset owner', `PublicListing.sellerType` values, the route `/app/buildings/:id/priorities`, `ROLE_LABELS.surveyor` ('Site surveyor').

## 14.4.2 Data model

### Domain types (src/domain/types.ts, shared)

```ts
export type StructuralElementKind = 'frame' | 'floors' | 'roof' | 'stability' | 'foundations' | 'facade'
export type StructuralMaterial = 'steel' | 'concrete_in_situ' | 'concrete_precast' | 'composite' | 'timber' | 'masonry' | 'aluminium_glass' | 'stone' | 'other'
export type StructuralElement = { kind: StructuralElementKind; material: StructuralMaterial | null; systemId: string | null; note: string }

export type SourceBuilding = {
  // ...existing fields
  /** Free text: other notes on the structure. Shown as 'Other notes'. */
  structureType: string
  /** Version 2 review: the structure element by element. Empty for market stock. */
  structure: StructuralElement[]
  /** The organisation that created the record: the owner, or a surveying firm before its owner confirmed it. Null for market stock. */
  createdByOrgId: string | null
  /** The deconstruction contractor invited to set availability dates, if any. Private. */
  contractorOrgId: string | null
}

export type InventoryItem = {
  // ...existing fields
  /** When the deconstruction contractor expects it to come out (ISO date, shown as a month). Private; the owner decides the lot date. */
  contractorAvailableFrom: string | null
  /** The day the contractor last set it. */
  contractorDatedOn: string | null
}

/** A revocable link to some of an owner's shared lots. The id is the token in the address. */
export type ShareLink = {
  id: string                 // 'lnk_' + 6 characters, minted
  ownerOrgId: string
  buildingId: string
  lotIds: string[]
  /** The owner's own name for it. Never shown to people who open the link. */
  label: string
  createdAt: string          // ISO timestamp
  createdByPersonaId: string
  revokedAt: string | null
  /** Organisations that accepted the link's terms, first open only. */
  opens: { orgId: string; at: string }[]
}

export type World = { /* ...existing */ shareLinks: Record<string, ShareLink> }
```

Defaults: `createSeed()` returns `shareLinks: {}`; every seeded SourceBuilding gets `structure` (see seed), `createdByOrgId` (Tiverne: Ostlea, Harrowden: Brackwater, market stock: null), `contractorOrgId: null`; every item gets `contractorAvailableFrom: null, contractorDatedOn: null`. `addCapturedItem` (src/store/worldOps.ts) sets both to null. `shiftWorld` needs no change (it moves every YYYY-MM-DD string; timestamps are not matched).

### Store types (src/store/types.ts, shared)

```ts
export const NOTIFICATION_KINDS = [ ...existing, 'building_claim', 'testing', 'availability_set', 'link_opened' ] as const

export type BuildingClaimStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn'
export type BuildingClaim = {
  id: string                 // 'clm_' minted
  buildingId: string
  surveyorOrgId: string
  requestedByUserId: string
  requestedAt: string
  /** Normalised email of the owner the surveyor named. Only an owner organisation with a member using it may decide. */
  ownerEmail: string
  ownerName: string
  message: string
  status: BuildingClaimStatus
  decidedAt: string | null
  decidedByUserId: string | null
  decisionNote: string | null
}

export type TestService = import('../domain/reference/testing').TestService
export type TestingStatus = 'requested' | 'booked' | 'results' | 'cancelled'
export type TestResult = { itemId: string; testStatus: 'inspected' | 'tested'; grade: SteelGrade | null; note: string }
export type TestingRequest = {
  id: string                 // 'tst_' minted
  buildingId: string
  itemIds: string[]
  companyId: string
  services: TestService[]
  preferredFrom: string | null   // ISO date
  message: string
  status: TestingStatus
  requestedByUserId: string
  requestedByOrgId: string
  requestedAt: string
  bookedFor: string | null       // ISO date of the site visit
  results: TestResult[]
  history: { at: string; status: TestingStatus; byUserId: string; note: string }[]
}

export type AppData = { /* ...existing */ buildingClaims: Record<string, BuildingClaim>; testingRequests: Record<string, TestingRequest> }
export type UiState = { /* ...existing */ captureBuildingId: Record<string, string | null> }
export const DEFAULT_UI = { ...existing, captureBuildingId: {} }
```

src/store/app.ts: `STATE_VERSION = 2` (one bump for all of round 2), `DATA_KEYS` adds `buildingClaims`, `testingRequests`; `looksValid` also requires both; new store method `setCaptureBuilding(buildingId: string | null)` writing `ui.captureBuildingId[sessionUserId]` (same pattern as `setCheckingProject`).

`BuildingSide` (src/store/access.ts) becomes `'owner' | 'surveyor' | 'contractor'`.

## 14.4.3 Reference data (new files)

### src/domain/reference/structure.ts

```ts
export const ELEMENT_ORDER: StructuralElementKind[] = ['frame', 'floors', 'roof', 'stability', 'foundations', 'facade']
export const ELEMENT_LABELS = { frame: 'Frame', floors: 'Floor slabs', roof: 'Roof structure', stability: 'Stability system', foundations: 'Foundations', facade: 'Facade' }
/** Lower case nouns for the summary when no system is chosen. */
export const ELEMENT_NOUNS = { frame: 'frame', floors: 'floor slabs', roof: 'roof', stability: 'stability system', foundations: 'foundations', facade: 'facade' }
export const MATERIAL_LABELS = { steel: 'Steel', concrete_in_situ: 'In situ concrete', concrete_precast: 'Precast concrete', composite: 'Steel and concrete composite', timber: 'Timber', masonry: 'Masonry', aluminium_glass: 'Aluminium and glass', stone: 'Stone', other: 'Other' }
export type StructureSystem = { id: string; kind: StructuralElementKind; material: StructuralMaterial; label: string; short: string }
export const STRUCTURE_SYSTEMS: StructureSystem[] = [
  { id: 'frame_steel_bolted', kind: 'frame', material: 'steel', label: 'Steel beams and columns, bolted connections', short: 'bolted steel frame' },
  { id: 'frame_steel_welded', kind: 'frame', material: 'steel', label: 'Steel beams and columns, welded connections', short: 'welded steel frame' },
  { id: 'frame_steel_portal', kind: 'frame', material: 'steel', label: 'Steel portal frame', short: 'steel portal frame' },
  { id: 'frame_rc_beam', kind: 'frame', material: 'concrete_in_situ', label: 'In situ concrete beams and columns', short: 'in situ concrete frame' },
  { id: 'frame_rc_flat', kind: 'frame', material: 'concrete_in_situ', label: 'In situ flat slab and columns', short: 'flat slab concrete frame' },
  { id: 'frame_precast', kind: 'frame', material: 'concrete_precast', label: 'Precast concrete beams and columns', short: 'precast concrete frame' },
  { id: 'frame_glulam', kind: 'frame', material: 'timber', label: 'Glulam posts and beams', short: 'glulam frame' },
  { id: 'frame_masonry', kind: 'frame', material: 'masonry', label: 'Loadbearing masonry walls', short: 'loadbearing masonry' },
  { id: 'floors_composite', kind: 'floors', material: 'composite', label: 'Composite slab on profiled metal deck', short: 'composite slabs on metal deck' },
  { id: 'floors_hollowcore', kind: 'floors', material: 'concrete_precast', label: 'Precast hollowcore planks', short: 'hollowcore planks' },
  { id: 'floors_rc_flat', kind: 'floors', material: 'concrete_in_situ', label: 'In situ flat slab', short: 'in situ flat slabs' },
  { id: 'floors_rc_beam', kind: 'floors', material: 'concrete_in_situ', label: 'In situ beam and slab', short: 'in situ beam and slab floors' },
  { id: 'floors_clt', kind: 'floors', material: 'timber', label: 'Cross-laminated timber panels', short: 'CLT floor panels' },
  { id: 'floors_joists', kind: 'floors', material: 'timber', label: 'Timber joists and boards', short: 'timber joist floors' },
  { id: 'roof_steel_deck', kind: 'roof', material: 'steel', label: 'Steel beams with metal deck', short: 'steel roof with metal deck' },
  { id: 'roof_steel_truss', kind: 'roof', material: 'steel', label: 'Steel trusses and purlins', short: 'steel roof trusses' },
  { id: 'roof_rc', kind: 'roof', material: 'concrete_in_situ', label: 'Concrete roof slab', short: 'concrete roof slab' },
  { id: 'roof_timber', kind: 'roof', material: 'timber', label: 'Timber rafters or trusses', short: 'timber roof' },
  { id: 'stab_cores', kind: 'stability', material: 'concrete_in_situ', label: 'Concrete cores', short: 'concrete cores' },
  { id: 'stab_bracing', kind: 'stability', material: 'steel', label: 'Steel cross bracing', short: 'steel bracing' },
  { id: 'stab_moment', kind: 'stability', material: 'steel', label: 'Moment-resisting frame', short: 'moment frames' },
  { id: 'stab_masonry', kind: 'stability', material: 'masonry', label: 'Masonry shear walls', short: 'masonry shear walls' },
  { id: 'fdn_piles', kind: 'foundations', material: 'concrete_in_situ', label: 'Piles with pile caps', short: 'piled foundations' },
  { id: 'fdn_pads', kind: 'foundations', material: 'concrete_in_situ', label: 'Pad footings', short: 'pad footings' },
  { id: 'fdn_raft', kind: 'foundations', material: 'concrete_in_situ', label: 'Raft', short: 'raft foundation' },
  { id: 'fdn_strip', kind: 'foundations', material: 'concrete_in_situ', label: 'Strip footings', short: 'strip footings' },
  { id: 'fac_unitised', kind: 'facade', material: 'aluminium_glass', label: 'Unitised curtain wall', short: 'unitised curtain wall' },
  { id: 'fac_stick', kind: 'facade', material: 'aluminium_glass', label: 'Stick curtain wall', short: 'stick curtain wall' },
  { id: 'fac_stone', kind: 'facade', material: 'stone', label: 'Stone cladding on fixings', short: 'stone cladding' },
  { id: 'fac_precast', kind: 'facade', material: 'concrete_precast', label: 'Precast concrete panels', short: 'precast concrete panels' },
  { id: 'fac_brick', kind: 'facade', material: 'masonry', label: 'Brick outer leaf', short: 'brick outer leaf' },
  { id: 'fac_rainscreen', kind: 'facade', material: 'other', label: 'Rainscreen cladding', short: 'rainscreen cladding' },
]
export const MAX_STRUCTURE_ELEMENTS = 12
```

### src/domain/reference/testing.ts

```ts
export type TestService = 'visual_dimensional' | 'steel_coupon' | 'steel_hardness' | 'masonry' | 'fixings_pullout' | 'glazing_seal' | 'timber_grading' | 'floor_load'
export const TEST_SERVICE_ORDER: TestService[] = ['visual_dimensional', 'steel_coupon', 'steel_hardness', 'masonry', 'fixings_pullout', 'glazing_seal', 'timber_grading', 'floor_load']
export const TEST_SERVICES: Record<TestService, { label: string; description: string; families: FamilyId[]; grades: boolean }> = {
  visual_dimensional: { label: 'Visual and dimensional survey', description: 'Condition, sizes and markings, item by item.', families: [all seven], grades: false },
  steel_coupon: { label: 'Steel coupon tests', description: 'Samples cut and tested for grade and chemistry.', families: ['steel_section'], grades: true },
  steel_hardness: { label: 'Steel hardness tests', description: 'Non-destructive tests that indicate the grade.', families: ['steel_section'], grades: true },
  masonry: { label: 'Brick and mortar tests', description: 'Strength, absorption and mortar type.', families: ['clay_brick'], grades: false },
  fixings_pullout: { label: 'Fixing pull-out tests', description: 'Capacity of the cladding fixings.', families: ['stone_cladding', 'precast_cladding', 'curtain_wall'], grades: false },
  glazing_seal: { label: 'Glazing seal check', description: 'Seals and units of each panel.', families: ['curtain_wall'], grades: false },
  timber_grading: { label: 'Timber strength grading', description: 'Visual strength grading of each member.', families: ['timber_joist'], grades: false },
  floor_load: { label: 'Floor panel load test', description: 'Load test on sample panels.', families: ['raised_floor'], grades: false },
}
export type TestingCompany = { id: string; name: string; email: string; services: TestService[]; regions: string[] }
export const TESTING_COMPANIES: TestingCompany[] = [
  { id: 'tco_brindmoor', name: 'Brindmoor Testing', email: 'bookings@brindmoor.example', services: ['visual_dimensional', 'steel_coupon', 'steel_hardness', 'fixings_pullout'], regions: [...REGIONS] },
  { id: 'tco_quenby', name: 'Quenby Materials Lab', email: 'lab@quenby.example', services: ['visual_dimensional', 'masonry', 'glazing_seal', 'timber_grading', 'floor_load'], regions: [...REGIONS] },
  { id: 'tco_calverd', name: 'Calverd Inspection', email: 'enquiries@calverd.example', services: ['visual_dimensional', 'steel_hardness', 'fixings_pullout', 'glazing_seal'], regions: ['Central London', 'Inner London East', 'Inner London West', 'Outer London East', 'Outer London West'] },
]
```

### src/domain/reference/names.ts (shared)

- `ALLOWED_ORGANISATIONS` add 'Fennick Dismantling'.
- `ALLOWED_PARTNERS` add 'Brindmoor Testing', 'Quenby Materials Lab', 'Calverd Inspection'.
- `ALLOWED_PLACES` add 'Ambrey House', '6 Quarrel Lane'.
- No new test-only names: e2e uses existing 'Corbel Yard', 'Wexcombe House', 'Shaw Surveys', 'Lee Shaw'.

## 14.4.4 Pure domain functions with formulas and tests

### src/domain/engines/structure.ts (new) and structure.test.ts

```ts
export function materialsFor(kind: StructuralElementKind): StructuralMaterial[]
// Unique materials of STRUCTURE_SYSTEMS for the kind, in table order, then 'other' if not already present.
export function systemsFor(kind: StructuralElementKind, material: StructuralMaterial | null): StructureSystem[]
// Systems of the kind with that material; all systems of the kind when material is null.
export function normaliseStructure(elements: StructuralElement[]): { elements: StructuralElement[]; error: string | null }
// Trims notes to 200 characters; drops rows with no material, no system and an empty note;
// error 'A building can have up to 12 structural elements.' above MAX_STRUCTURE_ELEMENTS;
// error 'Choose a system that matches the element and material.' when systemId is set and the system's kind or material differs;
// a row with systemId and material null takes the system's material.
// Output sorted by ELEMENT_ORDER, stable within a kind.
export function structureSummary(elements: StructuralElement[]): string
// Rows in ELEMENT_ORDER; each row renders as its system's `short`, else `${MATERIAL_LABELS[material].toLowerCase()} ${ELEMENT_NOUNS[kind]}`, else nothing;
// joined with ', '; first character upper case. '' when nothing renders.
```

Tests:
- `structureSummary([])` is ''.
- Tiverne seed elements give 'Bolted steel frame, composite slabs on metal deck, concrete cores, stone cladding, precast concrete panels, unitised curtain wall'.
- `[{ kind: 'roof', material: 'timber', systemId: null, note: '' }]` gives 'Timber roof'.
- Input order facade then frame renders frame first.
- `normaliseStructure` refuses `{ kind: 'floors', systemId: 'frame_steel_bolted' }` and `{ kind: 'frame', material: 'timber', systemId: 'frame_steel_bolted' }`; fills the material from the system; refuses 13 rows; trims a 300 character note to 200; drops an all-empty row.
- `materialsFor('stability')` is ['concrete_in_situ', 'steel', 'masonry', 'other']; `systemsFor('frame', 'steel')` has three ids.

### src/domain/engines/testing.ts (new) and testing.test.ts

```ts
export function servicesForFamilies(families: FamilyId[]): TestService[]
// Services (in TEST_SERVICE_ORDER) whose families include at least one given family. [] for [].
export function companiesFor(services: TestService[], region: string): TestingCompany[]
// Companies offering every service and covering the region, sorted by name. [] when services is empty.
export function resultStatusesFor(services: TestService[]): ('inspected' | 'tested')[]
// ['inspected'] when the only service is visual_dimensional; otherwise ['inspected', 'tested'].
export function recordsGrade(services: TestService[]): boolean
// True when any chosen service has grades: true.
```

Tests:
- `servicesForFamilies(['steel_section'])` is ['visual_dimensional', 'steel_coupon', 'steel_hardness'].
- `servicesForFamilies(['steel_section', 'clay_brick'])` is ['visual_dimensional', 'steel_coupon', 'steel_hardness', 'masonry'].
- `companiesFor(['steel_coupon'], 'Central London')` is [Brindmoor Testing].
- `companiesFor(['visual_dimensional'], 'South East')` is [Brindmoor Testing, Quenby Materials Lab].
- `companiesFor(['steel_hardness', 'fixings_pullout'], 'Inner London East')` is [Brindmoor Testing, Calverd Inspection].
- `companiesFor(['masonry', 'steel_coupon'], 'Central London')` is [].
- `resultStatusesFor(['visual_dimensional'])` is ['inspected']; `recordsGrade(['steel_hardness'])` is true; `recordsGrade(['masonry'])` is false.

### src/domain/visibility.ts (shared): share links

```ts
/** The link's lots still shared or published, from the link owner's own buildings. Empty when revoked. */
export function activeLinkLots(world: World, link: ShareLink): string[]
// link.revokedAt === null; lot exists; lot.visibility !== 'private'; owner of the lot's building === link.ownerOrgId; order of link.lotIds.
/** Lots an organisation reaches through links it has opened. */
export function lotsSharedByLinkWithOrg(world: World, orgId: string): string[]
// Union of activeLinkLots over links with opens containing orgId; '' gives [].
export function lotsVisibleToProject(world: World, project: Project): string[]
// Existing rule, plus: a matched_only lot is visible when it is in lotsSharedByLinkWithOrg(project.architectOrgId)
// or lotsSharedByLinkWithOrg(project.clientOrgId). The project's own termsAccepted is not needed for link lots (the link has its own terms).
```

Tests (new src/domain/visibility.links.test.ts):
- A link of TH-02 and TH-03 opened by Studio Oriel makes both visible to Sallow Court (terms not accepted) and Ferrymoor Yard; not to a project with neither Oriel nor its client.
- Not opened: not visible. Revoked: not visible. TH-03 made private: only TH-02 visible.
- A link whose lotIds include an OS lot (another seller's) does not expose it beyond its own visibility.
- A link opened only by Halewick Sustainability (consultant) exposes nothing to Merrowgate Wharf through the link.
- `browseListings` is unchanged by any link.

### src/domain/privacy/privateStrings.ts (shared)

- Building strings (name, street, postcode district, local authority when not public, programme dates) are pushed when `building.ownerOrgId || building.createdByOrgId`; the owner organisation and its personas only when `ownerOrgId`; add the creator organisation's name, the contractor organisation's name and its personas when set.
- Add `dateFormats(item.contractorAvailableFrom)` when set.
- `projectPrivateStrings` reads organisation names with `world.orgs[id]?.name` and filters blanks, so a project with no architect yet (architectOrgId '') works.

## 14.4.5 Access (shared files)

src/domain/access.ts: `buildingsFor` also returns buildings where `b.contractorOrgId === orgId`. `clientsFor` unchanged (it skips buildings with no owner).

src/store/access.ts:

```ts
export type BuildingSide = 'owner' | 'surveyor' | 'contractor'
// buildingSide: owner when role owner and ownerOrgId matches; surveyor when role surveyor and surveyorOrgId matches;
// contractor when role surveyor and contractorOrgId matches (and surveyorOrgId does not); null otherwise.
export function isBuildingContractor(state, userId, buildingId): boolean // role surveyor and contractorOrgId === org, whatever the side
export function buildingOrgIds(b): string[] // owner, surveyor, contractor, without blanks or repeats
// projectSide: return 'client' when (role === 'client' || role === 'owner') && p.clientOrgId === u.orgId
export function canCaptureIn(state, userId, buildingId): boolean // side owner or surveyor
```

`captureItem`, `updateItem`, `addPhoto`, `removePhoto` require `canCaptureIn` (a contractor-only side may not capture or edit records). `submitSurvey` additionally refuses an unlinked building.

## 14.4.6 Store actions

All are pure `(state, actor, ...) => ActionResult`, record activity with `log` and notify with `notify`, and are registered in src/store/act.ts (shared).

### src/store/actions/owner.ts (extended)

```ts
export type BuildingDetailsInput = { name; address; postcodeDistrict; localAuthority; region; yearBuilt: number | null; storeys: number | null; giaM2: number | null; structureType: string; structure: StructuralElement[]; stripOutStart: string | null; dismantlingStart: string | null; clearBy: string | null }
export type NewBuildingInput = BuildingDetailsInput & { surveyorOrgId: string | null }
export function checkBuildingDetails(input: BuildingDetailsInput, today: string): string | null // existing checks plus normaliseStructure error
export function buildingRecord(id: string, input: BuildingDetailsInput, orgs: { ownerOrgId: string | null; surveyorOrgId: string | null; createdByOrgId: string }): SourceBuilding
```

- `createBuilding` uses both; sets `createdByOrgId` to the owner organisation and `structure` from normaliseStructure.
- `setBuildingStructure(state, actor, buildingId, input: { elements: StructuralElement[]; notes: string }): ActionResult`. Side owner or surveyor. Errors from normaliseStructure. Unchanged input returns the same state. Logs 'updated the structure' to buildingOrgIds.
- `updateBuilding` patch also accepts `postcodeDistrict`, `localAuthority`, `region` (needed now that surveyors create records that owners correct).

New project (owner as client):

```ts
export type OwnerProjectInput = Omit<NewProjectInput, 'client' | 'consultantOrgId'> & { architectOrgId: string | null }
export function createOwnerProject(state, actor, input: OwnerProjectInput): ActionResult<string>
```

- Role owner. Validated with `validateNewProject({ ...input, client: { orgId: a.org.id } }, today)` from projects.ts. Duplicate name among projects with `clientOrgId === org` refused with PROJECT_ERRORS.duplicateName. `architectOrgId`, when set, must have role architect, else OWNER_ERRORS.architect 'Choose an architecture practice.'
- Project: `clientOrgId = developerOrgId = owner org`, `architectOrgId = input.architectOrgId ?? ''`, `consultantOrgId = ''`, `teamOrgIds = [owner org, architect?]`, `teamPersonaIds = [persona]`, `createdBy = persona`, `blind = { orgType: 'Design team', projectType: '<type> project' }`, other fields as in createProject. Built through the projects cluster's shared builder `projectRecord(...)` exported from src/store/actions/projects.ts (dependency, see open questions), so new Project fields from that cluster are filled in one place.
- When an architect is set: creates the architect's wish list (`listIdFor(architectOrgId, id)`), notifies the architect organisation kind 'team': title '{owner org} added you as architect on {project}', body '{project} is now in your projects. Your client is {owner org}.', href '/app/projects/{id}'.
- Logs 'created the project' to projectOrgIds.

```ts
export function appointProjectArchitect(state, actor, projectId: string, architectOrgId: string): ActionResult
```

Owner who is the project's client; only while `architectOrgId === ''` (else OWNER_ERRORS.hasArchitect 'This project already has an architect.'). Same wish list, notification and log as above.

Copy changes in setLotVisibility and setProjectAccess bodies: 'shared in confidence by a donor building owner'.

### src/store/actions/claims.ts (new)

```ts
export const CLAIM_ERRORS = {
  notCreator: 'Only the firm that added this building can ask its owner.',
  linked: 'This building is already linked to its owner.',
  email: 'Enter the owner’s email address.' /* write with a plain apostrophe */,
  pending: 'A request is already waiting for the owner. Withdraw it first.',
  noClaim: 'That request could not be found.',
  notPending: 'That request is no longer waiting.',
  notAddressed: 'This request is addressed to someone else.',
  deleteLinked: 'A building linked to its owner cannot be deleted here.',
}
export type SurveyBuildingInput = BuildingDetailsInput & { owner: { email: string; name: string; message: string } | null }
export function claimAddressedTo(state: AppData, claim: BuildingClaim, orgId: string): boolean
// roleOfOrg(orgId) === 'owner' && usersOfOrg(orgId).some(u => normaliseEmail(u.email) === claim.ownerEmail)
export function createSurveyBuilding(state, actor, input: SurveyBuildingInput): ActionResult<string>
export function requestBuildingClaim(state, actor, buildingId, input: { email: string; name: string; message: string }): ActionResult<string>
export function withdrawBuildingClaim(state, actor, claimId): ActionResult
export function decideBuildingClaim(state, actor, claimId, decision: 'accepted' | 'declined', note: string): ActionResult
export function deleteSurveyBuilding(state, actor, buildingId): ActionResult
```

- createSurveyBuilding: role surveyor; `checkBuildingDetails`; `buildingRecord(id, input, { ownerOrgId: null, surveyorOrgId: org, createdByOrgId: org })`; survey record `{ status: 'not_started', appointedAt: null }`; log '[actor] added {name} to survey' to [org]; when `owner` is given, runs requestBuildingClaim in the same step. Returns the building id.
- requestBuildingClaim: side surveyor, `createdByOrgId === org`, `ownerOrgId === null`, no pending claim, valid email. New claim pending, email normalised, name and message cleaned (120, 600). Log 'asked {email} to confirm {name}' to [org]. For each owner organisation the claim is addressed to: notify kind 'building_claim', title '{surveyor org} surveyed a building for you', body '{building}, {address}. Confirm it is yours to see what it holds.', href '/app/requests?tab=buildings'. No match: no notification; the request waits and shows when someone with that email signs up as a donor building owner (selectors match lazily).
- withdrawBuildingClaim: requester's organisation, pending only; status 'withdrawn'.
- decideBuildingClaim: role owner; pending; `claimAddressedTo(state, claim, org)` else notAddressed. Accepted: `buildings[id].ownerOrgId = org`, survey `appointedAt = now` (status kept), claim accepted; log '{owner person} confirmed {name} as their building' to owner and surveyor; notify surveyor kind 'building_claim' title '{owner org} confirmed {building}', body 'It is in their portfolio now. You stay appointed as its surveyor.', href '/app/buildings/{id}'. Declined: claim declined with note; notify surveyor title '{building} was not confirmed', body = note or 'The owner did not recognise this building. Check the email address and ask again.', href '/app/buildings/{id}'. The surveyor never sees which organisation declined.
- deleteSurveyBuilding: side surveyor, created by the org, `ownerOrgId === null` else deleteLinked. Removes the building, its items and lots, its survey record and testing requests; pending claims become withdrawn. Log to [org].

src/store/actions/surveyor.ts: `SURVEY_ERRORS.unlinked = 'Link the building to its owner before submitting the survey.'`; `submitSurvey` refuses when `ownerOrgId === null`; `captureItem` notifies the owner only when one exists (already true).

### src/store/actions/contractor.ts (new)

```ts
export const CONTRACTOR_ERRORS = { contractor: 'Choose a deconstruction contractor.', notContractor: 'Only the appointed contractor can set these dates.', badMonth: 'Choose a valid month.', unknownItem: 'That item is not in this building.' }
export function isoForMonth(dismantlingStart: string | null, monthKey: string): string
// The dismantling start when it falls in that month, else `${monthKey}-01` (same rule as expectedFromMonth).
export function appointContractor(state, actor, buildingId, contractorOrgId: string | null): ActionResult
export function setContractorDates(state, actor, buildingId, entries: { itemId: string; month: string | null }[]): ActionResult<number>
export function applyContractorDates(state, actor, buildingId): ActionResult<{ applied: number; skipped: number }>
```

- appointContractor: side owner or surveyor; organisation role surveyor; unchanged returns same state. Notify the contractor kind 'appointed': title '{actor org} invited you to set availability dates at {building}', body 'Say when each item is expected to come out. The owner decides what buyers see.', href '/app/buildings/{id}/availability'. When the surveyor appoints and an owner exists, notify the owner kind 'availability_set': title '{surveyor org} invited {contractor} to {building}', body 'They will set expected dates for each item. You can remove them in Overview.' Removal logs only.
- setContractorDates: `isBuildingContractor`; each itemId in the building; month null clears; month must match /^\d{4}-(0[1-9]|1[0-2])$/. Sets `contractorAvailableFrom = isoForMonth(...)`, `contractorDatedOn = today` for changed entries; returns the number changed. Notify the owner kind 'availability_set', folded per building per contractor per day (key `dates:{buildingId}:{orgId}`): title '{contractor} set dates for {n} items at {building}', body 'Review them in the inventory and apply the ones you agree with.', href '/app/buildings/{id}/inventory'. Log to buildingOrgIds.
- applyContractorDates: owner side. For every item with a contractor date: if its lot is private and not reserved and `availableFrom` differs, set `lot.availableFrom = contractorAvailableFrom` (applied); a non-private lot with a different date counts as skipped. Log 'applied the contractor's dates to {n} lots' to [owner].

Tests (contractor.test.ts): Tom appoints a contractor; Dana appoints on Harrowden and Brackwater is notified; a non-contractor cannot set dates; month '2027-13' refused; '2027-01' on Tiverne stores '2027-01-25' (the dismantling start); applying on seeded Tiverne gives `{ applied: 5, skipped: 0 }` and leaves shared TH-02 alone; after sharing TH-07, applying gives skipped 1; contractor dates never appear in `listingOf` for any lot.

### src/store/actions/testing.ts (new)

```ts
export const TESTING_ERRORS = { items: 'Choose at least one item.', services: 'Choose at least one test.', company: 'Choose a testing company.', companyServices: 'This company does not offer every test you chose.', badDate: 'Enter a valid date.', pastDate: 'The date must be today or later.', noRequest: 'That testing request could not be found.', status: 'This request cannot change now.', results: 'Record a result for every item.', locked: 'Some items are shared or published. The owner records results for those.', reserved: 'A reserved lot cannot change.' }
export function requestTesting(state, actor, input: { buildingId; itemIds: string[]; services: TestService[]; companyId: string; preferredFrom: string | null; message: string }): ActionResult<string>
export function recordTestingBooked(state, actor, requestId, input: { date: string; note: string }): ActionResult
export function recordTestResults(state, actor, requestId, results: TestResult[]): ActionResult
export function cancelTesting(state, actor, requestId, note: string): ActionResult
```

- Who: `canCaptureIn` (owner or surveyor of the building).
- requestTesting: items non-empty and in the building; services non-empty and a subset of `servicesForFamilies(families of the items)`; company in `companiesFor(services, building.region)` else companyServices; preferredFrom valid and on or after today. Status 'requested', history entry. Log '{actor} asked {company} to test {n} items' to buildingOrgIds. Notify the other side (owner when the surveyor asks, surveyor when the owner asks) kind 'testing', title '{actor} asked {company} to test {n} items at {building}', body 'Tests: {service labels joined}. Nothing is sent in the sandbox; the request is recorded here.', href '/app/buildings/{id}/testing'.
- recordTestingBooked: status requested or booked; valid date on or after today; status 'booked', bookedFor; notify the other side title 'Testing visit booked at {building}', body '{company} on {date}.'.
- recordTestResults: status booked; one result per itemId; testStatus in `resultStatusesFor(services)`; grade set only when `recordsGrade(services)` and the item is steel, otherwise must be null; refused with reserved when a lot has an accepted reservation; refused with locked when the actor is the surveyor and any lot is not private. Writes `item.testStatus` and, when grade is not null, `item.grade`; status 'results'. Notify the other side title 'Test results recorded at {building}', body '{n} items updated. Test status now shows on any listing.'.
- cancelTesting: status requested or booked.

Tests (testing.test.ts): request for TH-02 to TH-06 steel with steel_coupon to Brindmoor succeeds and notifies Ostlea; a masonry test on steel refused (services); Calverd for steel_coupon refused (companyServices); Dana recording results on shared TH-02 refused (locked); Tom recording results sets TH-02 testStatus 'tested' and grade 'S355', and `listingOf` now shows testStatus 'tested' and grade 'S355'; visual only allows 'inspected' only; cancelling a results request refused.

### src/store/actions/links.ts (new)

```ts
export const LINK_ERRORS = { lots: 'Choose at least one shared lot.', notShared: 'Only shared lots can go in a link. Share them in Listings first.', reserved: 'A reserved lot cannot be shared by link.', noLink: 'This link is no longer active.' }
export function createShareLink(state, actor, input: { buildingId: string; lotIds: string[]; label: string }): ActionResult<string>
export function openShareLink(state, actor, linkId: string): ActionResult
export function revokeShareLink(state, actor, linkId: string): ActionResult
```

- createShareLink: owner side of the building; lots non-empty, each in the building, visibility 'matched_only', no accepted reservation. Label cleaned to 80 characters; blank gives '{n} lots from {building}'. Mint 'lnk'. Log 'created a share link for {n} lots' to [owner].
- openShareLink: any signed-in person. Revoked or unknown: noLink. The link owner's own organisation: ok, no change (preview). Already opened by the organisation: ok, no change. Otherwise appends `{ orgId, at: now }`; notifies the owner kind 'link_opened', folded per link per day (key `link:{id}`): title 'Your share link was opened', body '{article} {org type label, lower case} opened {label}.' (fold: '{count} organisations opened {label}.'); no actor name, no organisation name.
- revokeShareLink: owner organisation; sets revokedAt. Notifies the opener organisations kind 'lots_shared': title 'A shared link was withdrawn', body 'Lots shared with you by link are no longer available. Any you saved show as no longer shared.', href '/app/home'.

Tests (links.test.ts): Tom links TH-02 and TH-03; Priya opens; Sallow Court can now save TH-03 (saveToProject succeeds); Tom revokes; the Sallow shortlist item reads as revoked and saveToProject refuses; Dana and Marcus may open and see cards but no project gains anything from Marcus's open; private TH-07 refused at creation; the notification to Ostlea contains 'architecture practice' and not 'Studio Oriel' or 'Priya'.

## 14.4.7 Selectors (view models)

All new view models are built from the projections: buyer-facing parts only through `listingOf` (toPublicListing), seller-facing buyer parts only through `toBlindBuyer` or organisation type labels.

src/store/selectors/surveyor.ts (extended):

```ts
export type CaptureTarget = { id: string; name: string; address: string; group: string; itemCount: number; statusLabel: string }
export type CaptureTargets = { targets: CaptureTarget[]; groups: { label: string; ids: string[] }[]; selectedId: string | null; canAdd: boolean; empty: boolean }
export function captureTargets(state, viewer): CaptureTargets | null
// Buildings where canCaptureIn; group = owner org name, or 'Not yet linked'; selectedId = ui.captureBuildingId[user] when still a target,
// else the target with the latest item capturedOn, else the first; canAdd for owner and surveyor roles.
export type ClaimState = { status: 'linked' | 'not_linked' | 'pending' | 'declined'; label: string; email: string | null; note: string | null; claimId: string | null }
// Labels: Linked to its owner, Not linked yet, Waiting for the owner, Not confirmed.
AppointmentBuilding gains { role: 'surveyor' | 'contractor'; roleLabel: 'Surveyor' | 'Contractor'; datedCount: number }
SurveyorHome gains { unlinked: (AppointmentBuilding & { claim: ClaimState })[]; quickCapture: { href: '/app/capture'; buildingName: string | null }; stats.unlinked: number }
```

src/store/selectors/owner.ts (extended):

- `buildingTabs(side, id, opts: { contractor: boolean })`: owner: Overview, Inventory, Recovery plan (id 'priorities'), Listings, Sharing, Testing. Surveyor: Overview, Capture, Inventory, Testing, plus Availability when also contractor. Contractor: Overview, Availability.
- `BuildingRef` gains `claim: ClaimState | null` (surveyor side only), `contractorName: string`, `isContractor: boolean`, `kindLabel: 'Donor building'`.
- `buildingOverview` gains `structure: { rows: { kind; label; materialLabel; systemLabel; note }[]; summary: string; notes: string; canEdit: boolean; options: { kind; label; materials: { value; label; systems: { id; label }[] }[] }[] }`, `contractor: { orgId; name; datedCount; itemCount } | null`, `contractorOptions` (role surveyor organisations, owner and surveyor sides), `testing: { open: number; href }`. Facts row 'Structure' uses `structureSummary`, falling back to structureType.
- `inventoryView` rows gain `contractorText` ('Not set' or month) and `contractorDiffers: boolean`; view gains `contractorName`, `canApplyContractorDates` (owner, any private lot differs), `applyCount`.
- `itemDetail.owner` gains `dates: { surveyorText; contractorText; contractorDatedOn; buyersSeeText; canUseContractor }`.
- `buildingsList` gains `canAdd` true for surveyors, `projects: OwnerProjectRow[]` (owner), `unlinked` grouping for surveyors.
- `OwnerProjectRow = { id; name; typeLabel; architectName: string | null; stageText; startText; waitingApprovals; approved; href }` from projects where the owner organisation is client.
- `ownerHome` gains `claims: ClaimRow[]` (pending, addressed to the org), `newProjects: OwnerProjectRow[]`, stats `donorBuildings`, `newProjects`, `claimsAwaiting`.
- `newBuildingOptions` returns for owners `{ regions, surveyors, architects, projectTypes, stages, structure }` and for surveyors `{ regions, structure }`.

src/store/selectors/claims.ts (new):

```ts
export type ClaimRow = { id; buildingId; buildingName; address; region; localAuthority; surveyorName; requestedByName; requestedAt; timeAgo; message; itemCount; surveyStatusLabel; status: BuildingClaimStatus; statusLabel; decisionNote: string | null; canDecide: boolean }
export function claimRowsForOwner(state, viewer): ClaimRow[]
export function claimStateOf(state, viewer, buildingId): ClaimState | null
```

src/store/selectors/contractor.ts (new):

```ts
export type AvailabilityRow = { itemId; tag; title; quantityText; location; typologyLabel; surveyorText: string; month: string | null; datedOn: string | null }
export type AvailabilityView = { header: BuildingRef; rows: AvailabilityRow[]; programme: { label; text }[]; defaultMonth: string; yearOptions: number[]; canEdit: boolean; datedCount: number; empty: boolean }
export function availabilityView(state, viewer, buildingId): AvailabilityView | null // isBuildingContractor only. No lot, price, visibility or request field.
```

src/store/selectors/testing.ts (new):

```ts
export type TestingRow = { id; companyName; companyEmail; status; statusLabel; statusTone; services: string[]; items: { itemId; tag; title }[]; requestedByName; requestedText; bookedText: string | null; results: { tag; statusLabel; gradeText; note }[]; canBook; canRecord; canCancel; recordLocked: boolean }
export type TestingView = { header: BuildingRef; rows: TestingRow[]; open: number; empty: boolean }
export function testingView(state, viewer, buildingId): TestingView | null
export function testingDraftOptions(state, viewer, buildingId, draft: { itemIds: string[]; services: TestService[] }): { items: { itemId; tag; title; family; locked: boolean }[]; services: { id; label; description }[]; companies: { id; name; email; services: string[] }[]; noCompanyText: string | null } | null
```

Status labels: requested 'Sent', booked 'Visit booked', results 'Results recorded', cancelled 'Cancelled'.

src/store/selectors/links.ts (new):

```ts
export type ShareLinkRow = { id; label; href; lotCount; activeLotCount; createdText; createdByName; status: 'active' | 'revoked'; statusLabel; revokedText: string | null; openedText: string; canRevoke: boolean }
export function openedText(typeLabels: string[]): string
// [] gives 'Not opened yet'; otherwise 'Opened by {n} organisation(s) ({counts by type, descending, then by label})',
// for example 'Opened by 3 organisations (2 architecture practices, 1 developer or client)'. Type labels from orgTypeLabel, lower case.
export type ShareLinksView = { rows: ShareLinkRow[]; eligible: { lotId; tag; title; quantityText; reserved: boolean }[]; canCreate: boolean }
export function shareLinksView(state, viewer, buildingId): ShareLinksView | null // owner side
export type LinkView =
  | { state: 'inactive' }
  | { state: 'preview'; count: number; cards: ListingCard[] }
  | { state: 'terms'; count: number }
  | { state: 'open'; count: number; cards: ListingCard[]; materialLinks: boolean }
export function linkView(state, viewer, linkId): LinkView
// cards: listingCard(state, listingOf(lot), null, today, savedOrg) for activeLinkLots that are isLotAvailable(state, lot, null).
// materialLinks: role architect, client, consultant, or owner with a client-side project.
```

Tests for `openedText`: [] gives 'Not opened yet'; ['architecture practice'] gives 'Opened by 1 organisation (architecture practice)'; ['architecture practice', 'developer or client', 'architecture practice'] gives 'Opened by 3 organisations (2 architecture practices, 1 developer or client)'.

Shared selector edits:
- common.ts: `BUILDING_TABS_OF` owner adds 'testing'; surveyor adds 'testing', 'availability'; contractor ['availability']. `hrefForReader` lets 'links' and 'capture' through. `sellerPhrase` via `SELLER_TYPE_LABELS`. `ROLE_TITLES.owner`.
- discover.ts (marketplace cluster's file, small edits): `visibleLot` also allows a non-private lot in `lotsSharedByLinkWithOrg(world, viewerOrg)`; `materialView` role gate also admits an owner with a client-side project; `sharedGroups` shows link lots for a project even before that project's terms (they passed the link's terms).
- notifications.ts: kind info for the four new kinds; `sent_to_client` and `reservation_decided` roles add 'owner'; `appointed` label becomes 'Appointments' with description 'An owner or surveyor appoints you to survey a building or set its dates.'

New kind info: building_claim { label: 'Building confirmations', description: 'A surveyor asks you to confirm a building, or an owner answers.', roles: ['owner', 'surveyor'] }; testing { label: 'Testing', description: 'Testing is requested, booked or has results.', roles: ['owner', 'surveyor'] }; availability_set { label: 'Availability dates', description: 'A deconstruction contractor is invited or sets expected dates.', roles: ['owner'] }; link_opened { label: 'Share links', description: 'Someone opens a link you shared.', roles: ['owner'] }.

## 14.4.8 Routes and sidebar

Router (src/app/router.tsx, shared): add `capture` (features/capture/CapturePage), `links/:linkId` (features/links/LinkPage), and under `buildings/:buildingId` the children `testing` (Testing) and `availability` (Availability).

`routeAccess` (src/store/selectors/nav.ts, shared):

| Route | Who |
|---|---|
| `/app/capture` | owner, surveyor (no id) |
| `/app/links/:linkId` | everyone signed in; the page renders its own inactive state |
| `/app/buildings/:id/testing` | owner or surveyor side |
| `/app/buildings/:id/availability` | `isBuildingContractor` |
| `/app/buildings/:id/inventory`, `capture` | owner or surveyor side (contractor forbidden) |
| `/app/projects` and `/app/projects/:id` with client tabs | also an owner whose organisation is the project's client |
| `/app/discover`, `/app/discover/:publicId` | also an owner with at least one client-side project (read) |

Sidebar (nav.ts, shared):
- Surveyor: main Home, Capture (new NavIcon 'Camera', href '/app/capture'). Section Clients: one folder per client (existing); each building's children follow its side (contractor buildings show Availability). A folder 'Not yet linked' with the surveyor's own unlinked buildings, then the item 'Add building' (Plus, '/app/buildings?new=1').
- Owner: main Home, plus Discover (marketplace cluster's label) when the owner has a client-side project. Section 'Donor buildings': each building with Overview, Inventory, Recovery plan, Listings, Sharing, Testing; item 'Add building'. Section 'New projects' when any: project folders exactly as the client sees them. Requests badge = pending reservations + pending claims addressed to the organisation (+ the client-linking cluster's pending approvals).

src/app/navIcons.ts adds 'Camera'. src/app/notificationIcons.ts and src/features/notifications/kit.tsx add icons: building_claim Building2 (lucide 'BuildingCheck' if present, else Building2), testing FlaskConical, availability_set CalendarClock, link_opened Link2.

## 14.4.9 Screens, in priority order

### 1. Standalone Capture, `/app/capture` (new features/capture/CapturePage.tsx)

- PageHeader 'Capture', subtitle 'Record an item on site. Choose the building, then describe what you see.'
- Building row (sticky under the top bar on phone): a Select labelled 'Building', options grouped by client and 'Not yet linked', each 'Name, address'; beside it a secondary Button 'Add building' (Plus) opening the shared NewBuildingDialog; on create the new building is selected. URL keeps `?building=bld_x`; choosing calls `setCaptureBuilding`.
- No buildings: EmptyState 'Add the building you are in', text 'You can start a survey before a client appoints you. The owner confirms it later.', action 'Add building'.
- Below: the capture form extracted from Capture.tsx as `CaptureWorkspace({ buildingId })`. Switching building keeps the description and the fields; the expected month follows the new building's dismantling start only while the person has not touched it. After Save the toast is '{tag} captured' with description 'Private until the owner decides.' (unlinked: 'Private to your firm until the owner confirms the building.').
- The building tab `/app/buildings/:id/capture` renders the same `CaptureWorkspace` with no picker.
- 390 px: picker and form single column, 44 px targets, save bar fixed at the bottom as today.

### 2. Surveyor adds a building and asks the owner

- BuildingsList for surveyors: header 'Appointments' gains primary 'Add building'. Groups by client as today, plus a 'Not yet linked' section whose tiles show a claim pill (Not linked yet neutral, Waiting for the owner warning, Not confirmed danger) and actions Capture, Inventory, 'Ask the owner'.
- NewBuildingDialog (extracted to features/buildings/NewBuildingDialog.tsx; surveyor mode): title 'Add a building to survey', description 'Private to your firm until its owner confirms it.' Fields as the owner's donor form (name, address, postcode district, local authority, region; the building; structure frame and floor slabs rows with 'Add another element'; programme). Section 'Ask the owner to confirm' (optional): Owner's name, Owner's email, Message (placeholder 'For example: we surveyed it ahead of the strip-out tender.'), hint 'Nothing is emailed in the sandbox. The owner sees the request when they sign in with this email.' Button 'Add building'.
- Building header for an unlinked building: 'For' becomes 'Owner not linked yet' with a button 'Ask the owner' (ClaimDialog: name, email, message, 'Send request'). Pending: 'Waiting for {email}' with 'Withdraw'. Declined: 'Not confirmed' with the note and 'Ask again'.
- Overview aside card 'Owner' for the surveyor side of an unlinked building, with the same controls and 'Delete building' (danger, confirm dialog 'Delete {name}? Its items and photos go too. This cannot be undone.').
- Submit survey button disabled with the hint 'Link the building to its owner first.'

### 3. Owner confirms a building: Requests, Buildings tab

- Requests page gets a top SegmentedControl: 'Reservations {n}' and 'Buildings {n}' (and the client-linking cluster's 'Projects {n}' when it ships). URL `?tab=buildings`.
- Each claim card: building name, address, region; 'Added by {surveyor org}, {person}, {time ago}'; '{n} items captured'; the message in a quote block; buttons 'Confirm it is ours' (primary) and 'Not ours' (secondary, note dialog with placeholder 'For example: we sold this building in 2025.'). Confirm toast '{building} added to your donor buildings' and navigates to it.
- Empty: 'No buildings waiting', 'When a surveyor adds a building and names you as its owner, it appears here for you to confirm.'
- Owner home: a 'Waiting for you' section lists reservation requests and building confirmations together (dashboards cluster renders; this cluster supplies `claims`).

### 4. Add building: Donor building or New project (owner)

- NewBuildingDialog owner mode starts with RadioCards 'What kind of building?': 'Donor building', 'Coming down or being stripped out. Survey it and offer what it holds for reuse.'; 'New project', 'Being built or refurbished. Source reclaimed materials for it with your architect.'
- Donor: today's fields plus the Structure block. New project: Project name, Project type (projects cluster's list), Local authority, Region, RIBA stage, Materials needed on site from, Architect (optional Select of practices on the platform, placeholder 'Not yet', hint 'They can start shortlisting at once. You approve what they propose.'). Button 'Add donor building' or 'Add new project'. Toasts '{name} added' with description 'Appoint a surveyor when you are ready.' or 'Your architect has been told.' / 'Appoint an architect when you are ready.'
- BuildingsList owner: section 'Donor buildings' (existing table, plus a Kind pill column hidden on phone) and section 'New projects' (table: Project, Architect or 'No architect yet', RIBA stage, Materials needed from, Waiting for approval). When there are no new projects, a quiet card 'Building something too? Add a new project to source reclaimed materials for it.' with 'Add new project'.
- New project workspace: the client workspace (Overview, Approvals, Reservations, Specification, Carbon). With no architect, the overview shows a Callout 'Appoint an architect to start sourcing' with a Select of practices and 'Appoint'.

### 5. Renames (14.4.1) across the listed files.

### 6. Share links: Sharing tab card and `/app/links/:linkId`

- Sharing tab, new top card 'Share by link' (features/buildings/ShareLinks.tsx): text 'Send a link to anyone on Tallyard. People who open it see the lots you choose as anonymous listings until you revoke it. Links work only in this browser while the sandbox lasts.' Button 'Create link' opens a Dialog: 'Name' (hint 'For your reference. Never shown to people who open the link.'), a checklist of this building's shared lots (tag, title, quantity; reserved ones disabled with 'Reserved'), 'Select all'. With no shared lots: Callout 'Share lots first' with a link to Listings. Rows: name, '{n} lots', 'Created {date} by {person}', openedText, status pill Active or Revoked, actions 'Copy link' (copies the absolute address; toast 'Link copied') and 'Revoke' (confirm 'Revoke this link? People who opened it lose access to these lots at once.').
- Link page (features/links/LinkPage.tsx), any role:
  - inactive: EmptyState 'This link is no longer active', 'The owner withdrew it, or the address is not right. Anything you saved from it shows as no longer shared.', action 'Go home'.
  - terms: Card 'Shared in confidence', text 'A donor building owner shared {n} lots with you. Accept to see them, and agree not to pass the details on. The owner sees only the type of your organisation.', primary 'Accept and view'.
  - open: PageHeader 'Shared with you by link', subtitle '{n} lots, shared in confidence by a donor building owner.' Grid of the marketplace ListingTile cards (read-only import), each linking to `/app/discover/{publicId}` when `materialLinks`, else opening a Sheet of the card's facts. Architects save to projects through the existing save menu.
  - preview (link owner's organisation): Callout 'This is how people with the link see your lots.' then the grid.

### 7. Structure card (features/buildings/StructureCard.tsx)

- Overview, main column after Programme: CardHeader 'Structure' (icon Layers or Columns3), Edit button for owner and surveyor. Rows: element label, material, system, note; empty state 'Record the frame, floor slabs and other elements. It helps buyers trust the survey and helps you plan recovery.'
- Edit dialog: one row per element in ELEMENT_ORDER with Material Select and System Select (filtered by material), Note input; 'Add another' per kind for mixed facades; 'Other notes on the structure' textarea (structureType). Phone: rows stack.

### 8. Contractor availability

- Overview aside card 'Deconstruction contractor' (owner and surveyor): current contractor with 'Dates set for {n} of {m} items', Select of contractors and 'Save' (same pattern as Appoint surveyor), hint 'They set when each item is expected to come out. You decide what buyers see.'
- Availability tab (features/buildings/Availability.tsx), contractor: intro 'Say when each item is expected to come out. The owner sees your dates and decides what buyers see.' Programme strip. Table (cards on phone): Tag, Item, Quantity, Location, Surveyor expects, Your month (MonthPicker). Toolbar 'Fill blanks from the programme' (dismantling start month) and primary 'Save dates' (fixed at the bottom on phone). Toast '{n} dates saved' with 'The owner has been told.'
- Owner Inventory: column 'Contractor' when a contractor is appointed; toolbar button 'Use contractor dates ({n})' when `canApplyContractorDates`; toast '{applied} dates applied' and, when skipped, description '{skipped} lots are shared or published. Make them private to change their dates.'
- ItemPanel owner: 'Dates' block: 'Surveyor expects {month}', 'Contractor expects {month}, set {date}', 'Buyers see {lot date text}', button 'Use contractor date' when private.

### 9. Testing tab (features/buildings/Testing.tsx)

- Intro 'Ask a testing company to inspect or test items. Results update each item's test status, which buyers see on listings.' Primary 'Request testing'.
- Request dialog (Sheet on phone): Items checklist (filter by family; preselected from `?items=`), Tests checklist from `testingDraftOptions`, Company radio cards (name, tests offered, email), 'Preferred from' date (optional), Message. When `noCompanyText`: 'No one company offers all of these tests. Send two requests.' Footer note 'Nothing is sent in the sandbox. The request is recorded here and the owner is told.' (surveyor) or '... and your surveyor is told.' (owner).
- Request cards: company, status pill (Sent neutral, Visit booked info, Results recorded brand, Cancelled neutral), tests, item tags, 'Requested by {person}, {date}', 'Visit {date}'. Actions: 'Record booking' (date, note), 'Record results' (per item: Inspected or Tested; steel grade S275, S355 or Unknown when recordsGrade; note; locked items show 'The owner records this one' for the surveyor), 'Cancel'.
- Empty: 'No testing requested yet', 'Testing confirms grade and condition. Buyers see the test status on each listing.'
- ItemPanel and Inventory row menu: 'Request testing' linking to `testing?items={itemId}`.

### 10. Homes (data from this cluster; layout by the dashboards cluster)

- Owner home: stats Donor buildings, New projects, Items surveyed, Published, Shared, Reserved, Avoidable carbon (Indicative, unchanged); 'Waiting for you' (requests and confirmations); Donor buildings cards with kind pill; New projects cards (architect, stage, materials needed from, waiting for approval).
- Surveyor home: header action 'Capture' (primary, Camera) linking to `/app/capture`; secondary 'Add building'; 'Not yet linked' list with claim pills; appointment rows show a 'Contractor' pill where the firm is the contractor; empty state keeps the title 'No appointments yet' with text 'When an owner appoints your firm, buildings appear here. You can also add a building yourself and start capturing now.' and action 'Add building'.

## 14.4.10 Seed additions (new src/sandbox/seed-owner-surveyor.ts; two one-line calls from src/sandbox/seed.ts)

`withOwnerSurveyorWorld(world: World): World`, applied in `referenceWorld()` before the shift:
- Org `org_fennick` 'Fennick Dismantling', type 'Deconstruction contractor'. No users.
- Tiverne House: `structure` = frame steel frame_steel_bolted; floors composite floors_composite; stability concrete_in_situ stab_cores; facade stone fac_stone; facade concrete_precast fac_precast; facade aluminium_glass fac_unitised note 'Added in 2003'. `structureType` 'Composite slabs act as diaphragms; cores at the north and east corners.' `contractorOrgId` org_fennick. Contractor dates (contractorDatedOn '2026-10-02'): TH-07 '2027-03-01', TH-08 '2027-03-01', TH-09 '2027-04-01', TH-10 '2027-03-01', TH-11 '2027-02-01'.
- Harrowden Court: structure frame steel frame_steel_bolted; floors composite floors_composite; stability steel stab_bracing; facade masonry fac_brick. structureType ''.
- Ambrey House, `bld_ab3m8r`: ownerOrgId null, surveyorOrgId and createdByOrgId Tarnbrook, sellerType 'Asset owner', sourceType 'deconstruction', address '6 Quarrel Lane, London SE1', postcodeDistrict 'SE1', localAuthority 'Southwark', region 'Central London', yearBuilt 1979, eraBand '1970 or later', storeys 4, giaM2 2600, structure frame steel frame_steel_bolted, floors concrete_precast floors_hollowcore, facade masonry fac_brick; programme strip-out '2027-03-01', dismantling '2027-04-05', clear by '2027-06-25'; hub distances from `V1_ASSUMPTIONS.regionHubKm['Central London']`, nearest hub as default; region and quarter disclosure; arisingsTitle 'owner'; surveyedBy null.
- Items (private lots, capturedBy 'Dana Kowalski', capturedOn '2026-10-03', expected '2027-04-05'): AH-01 `itm_ah7k2m` / `lot_ah7k2m` / 'L-H7MB4T', UB 305x165x40, 5.0 m, 32 pieces, condition B, recoverability A, 'Floor beams, levels 1 to 3'; AH-02 `itm_ah9p4w` / `lot_ah9p4w` / 'L-V3QK9C', clay brick facing, cement mortar, 8,000 bricks, condition B, recoverability C, 'Rear elevation'.

`withOwnerSurveyorHistory(s: AppData, h: { at; day; todayIso }): AppData`, applied in `firstRun` before the final sort:
- Survey record for Ambrey House: in_progress, appointedAt null.
- Claim `clm_ambrey` pending, from Dana to 'tom.ashby@ostlea.example', ownerName 'Tom Ashby', message 'We surveyed Ambrey House ahead of the strip-out tender. Please confirm it is yours.', requestedAt at(3, 10). Notification to Ostlea, unread. Activity for Tarnbrook 'added Ambrey House to survey' at(4, 9) and 'captured AH-01 and AH-02' at(4, 15).
- Fennick dates: activity for Ostlea, Tarnbrook and Fennick 'Fennick Dismantling set dates for 5 items' at(5, 14); notification to Ostlea kind availability_set, read by Tom. Activity 'Ostlea Estates invited Fennick Dismantling to set availability dates' at(9, 10).
- Testing request `tst_tiverne`: Tiverne TH-02 to TH-06, services ['steel_coupon'], company tco_brindmoor, preferredFrom null, message 'Coupons from five sections; grade unconfirmed from the archive drawings.', requestedBy Dana at(12, 10), status booked, bookedFor `addDays(todayIso, 9)`, history requested then booked at(4, 11) note 'Coupon cutting on site, levels 1 and 2'. Notifications to Ostlea (testing) for both, read by Tom.
- Share link `lnk_ostl01` on Tiverne: lots of TH-02 to TH-06, label 'Primary steel for enquiries', createdAt at(6, 12), createdByPersonaId Tom, revokedAt null, opens []. Activity for Ostlea.

No owner new project is seeded (see decisions). The privacy tests on the fresh sandbox stay as they are.

## 14.4.11 Tests to add

Unit (vitest):
- domain: structure.test.ts, testing.test.ts, visibility.links.test.ts as in 14.4.4; privacy.test.ts addition: lotPrivateStrings for Ambrey House lots includes 'Ambrey House', 'Quarrel Lane', 'Tarnbrook Deconstruction' and the contractor's 'Fennick Dismantling' for Tiverne lots; every projection still holds none of them.
- store/actions: claims.test.ts (create with and without owner, notify only the matching owner org, wrong org refused with notAddressed, accept sets ownerOrgId and appointedAt and notifies Tarnbrook, decline keeps it unlinked and hides the org name, submitSurvey refused while unlinked then allowed, delete refused once linked, a claim to an email with no account waits and becomes decidable after a sign-up with that email as a donor building owner); contractor.test.ts; testing.test.ts; links.test.ts; owner.test.ts additions (createOwnerProject with and without architect, wish list created, duplicate refused, appointProjectArchitect once only, Tom approves an item his architect sent through decideItem, setBuildingStructure by owner and surveyor and refused for a contractor); surveyor.test.ts additions (contractor cannot capture; capture in an unlinked building notifies nobody).
- store/selectors: owner-surveyor.selectors.test.ts: captureTargets default selection rules; buildingTabs per side; openedText cases; linkView states for owner, opener, stranger and after revoke; availabilityView has no ask, reserve, visibility or request keys; navModel for Dana shows Capture and 'Not yet linked'; navModel for Tom shows 'Donor buildings', 'Recovery plan' and, after createOwnerProject, 'New projects' and Discover; routeAccess table of 14.4.8 including forbidden cases (Priya on /app/capture, contractor on inventory, Dana on /app/buildings/{Tiverne}/availability before being the contractor).
- privacy.platform.test.ts additions (no existing assertion changed): (1) link page and Discover for Priya after opening a link hold no lot private string and not the link's label; (2) Tom's shareLinksView and notifications after Priya opens hold neither 'Studio Oriel' nor 'Priya Nair'; (3) a contractor user (test helper `addTestUser(state, { orgId: 'org_fennick', name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })` in src/test/fixtures.ts) sees in availabilityView, buildingOverview, navModel, inboxView no project private string and no ask or reserve; (4) after createOwnerProject for Tom, Isla, Priya and Marcus views hold no string of Tom's lots, and Dana's views hold neither the new project's name nor its start date.

Screen tests (vitest with the existing screens harness):
- CapturePage: picker lists Tiverne House, Harrowden Court and, under 'Not yet linked', Ambrey House; switching building keeps the description.
- Requests: Buildings tab shows the Ambrey House claim; confirming moves it to Donor buildings in the sidebar.
- LinkPage: terms, open, inactive.
- Sign-up shows 'Donor building owner' and 'Surveying or deconstruction firm'; a new surveyor organisation's home still shows 'No appointments yet' and now an 'Add building' action.

End to end (new e2e/owner-surveyor.spec.ts; existing journeys untouched):
1. Phone width 390: Dana opens Capture from the sidebar, adds 'Corbel Yard' asking 'tom.ashby@ostlea.example', captures an item with a photo, sees 'Waiting for the owner'. Switch account to Tom: the bell shows the request; Requests, Buildings, 'Confirm it is ours'; Corbel Yard is under Donor buildings with CY-01. No horizontal scroll at 390.
2. Tom creates a share link for TH-02 and TH-03 on Tiverne's Sharing tab, copies it. Switch to Priya, open the link, accept, see two cards, save TH-03 to Sallow Court. Switch to Tom, revoke. Priya reloads the link: 'This link is no longer active'.
3. Tom adds a new project 'Wexcombe House' with Studio Oriel as architect; it appears under New projects; Priya sees it in her projects.
4. Sign up Lee Shaw at Shaw Surveys as 'Surveying or deconstruction firm'; Tom appoints Shaw Surveys as contractor on Tiverne; Lee sets TH-07 to a month and saves; Tom applies contractor dates.
5. Tom edits Tiverne's structure (roof timber) and the overview summary updates.

## 14.4.12 Files

Exclusive to this cluster (existing): src/store/actions/owner.ts, src/store/actions/surveyor.ts, src/store/actions/owner.test.ts, src/store/actions/surveyor.test.ts, src/store/selectors/owner.ts, src/store/selectors/surveyor.ts, src/features/buildings/BuildingsList.tsx, BuildingLayout.tsx, Overview.tsx, Capture.tsx, Inventory.tsx, ItemPanel.tsx, Sharing.tsx, Priorities.tsx, ListingEditor.tsx, labels.ts, src/features/requests/Requests.tsx, src/features/auth/constants.ts, src/sandbox/accounts.ts (labels only), src/ui/Gallery.tsx (one label).

New (this cluster): src/domain/reference/structure.ts, src/domain/reference/testing.ts, src/domain/engines/structure.ts and .test.ts, src/domain/engines/testing.ts and .test.ts, src/domain/visibility.links.test.ts, src/store/actions/claims.ts, contractor.ts, testing.ts, links.ts and a .test.ts for each, src/store/selectors/claims.ts, contractor.ts, testing.ts, links.ts, src/store/selectors/owner-surveyor.selectors.test.ts, src/features/capture/CapturePage.tsx, src/features/links/LinkPage.tsx, src/features/buildings/NewBuildingDialog.tsx, StructureCard.tsx, ClaimDialog.tsx, ContractorCard.tsx, ShareLinks.tsx, Testing.tsx, Availability.tsx, src/features/requests/BuildingClaims.tsx, src/features/buildings/buildings.test.tsx, src/sandbox/seed-owner-surveyor.ts, e2e/owner-surveyor.spec.ts.

Shared (coordinate; small, additive edits described above): src/domain/types.ts, src/domain/seed/world.ts, src/domain/visibility.ts, src/domain/access.ts, src/domain/privacy/privateStrings.ts, src/domain/privacy/privacy.test.ts (additions), src/domain/reference/names.ts, src/store/types.ts, src/store/app.ts, src/store/act.ts, src/store/access.ts, src/store/worldOps.ts, src/store/selectors/index.ts, src/store/selectors/nav.ts, src/store/selectors/common.ts, src/store/selectors/notifications.ts, src/store/selectors/discover.ts, src/store/selectors/search.ts (owner client projects in the palette), src/store/actions/projects.ts (projectRecord builder), src/app/router.tsx, src/app/navIcons.ts, src/app/notificationIcons.ts, src/features/notifications/kit.tsx, src/features/home/OwnerHome.tsx, src/features/home/SurveyorHome.tsx, src/features/public/Landing.tsx, src/features/help/Help.tsx, src/sandbox/seed.ts, src/test/fixtures.ts, src/test/privacy.platform.test.ts (additions).

Suggested split: agent A (domain and store foundation: types, reference, engines, visibility, access, privateStrings, store types, app, act, worldOps, all new actions and selectors, seed module, unit and privacy tests); agent B (building screens: features/buildings/*, features/capture, features/links, Requests, renames in owned files); shared-file edits outside this cluster's ownership are applied by the foundation agent for round 2 in one pass to avoid two agents in the same file.


## Files changed
platform/src/store/actions/owner.ts
platform/src/store/actions/surveyor.ts
platform/src/store/actions/owner.test.ts
platform/src/store/actions/surveyor.test.ts
platform/src/store/selectors/owner.ts
platform/src/store/selectors/surveyor.ts
platform/src/features/buildings/BuildingsList.tsx
platform/src/features/buildings/BuildingLayout.tsx
platform/src/features/buildings/Overview.tsx
platform/src/features/buildings/Capture.tsx
platform/src/features/buildings/Inventory.tsx
platform/src/features/buildings/ItemPanel.tsx
platform/src/features/buildings/Sharing.tsx
platform/src/features/buildings/Priorities.tsx
platform/src/features/buildings/ListingEditor.tsx
platform/src/features/buildings/labels.ts
platform/src/features/requests/Requests.tsx
platform/src/features/auth/constants.ts
platform/src/sandbox/accounts.ts
platform/src/ui/Gallery.tsx

## Files new
platform/src/domain/reference/structure.ts
platform/src/domain/reference/testing.ts
platform/src/domain/engines/structure.ts
platform/src/domain/engines/structure.test.ts
platform/src/domain/engines/testing.ts
platform/src/domain/engines/testing.test.ts
platform/src/domain/visibility.links.test.ts
platform/src/store/actions/claims.ts
platform/src/store/actions/claims.test.ts
platform/src/store/actions/contractor.ts
platform/src/store/actions/contractor.test.ts
platform/src/store/actions/testing.ts
platform/src/store/actions/testing.test.ts
platform/src/store/actions/links.ts
platform/src/store/actions/links.test.ts
platform/src/store/selectors/claims.ts
platform/src/store/selectors/contractor.ts
platform/src/store/selectors/testing.ts
platform/src/store/selectors/links.ts
platform/src/store/selectors/owner-surveyor.selectors.test.ts
platform/src/features/capture/CapturePage.tsx
platform/src/features/links/LinkPage.tsx
platform/src/features/buildings/NewBuildingDialog.tsx
platform/src/features/buildings/StructureCard.tsx
platform/src/features/buildings/ClaimDialog.tsx
platform/src/features/buildings/ContractorCard.tsx
platform/src/features/buildings/ShareLinks.tsx
platform/src/features/buildings/Testing.tsx
platform/src/features/buildings/Availability.tsx
platform/src/features/buildings/buildings.test.tsx
platform/src/features/requests/BuildingClaims.tsx
platform/src/sandbox/seed-owner-surveyor.ts
platform/e2e/owner-surveyor.spec.ts

## Shared
platform/src/domain/types.ts
platform/src/domain/seed/world.ts
platform/src/domain/visibility.ts
platform/src/domain/access.ts
platform/src/domain/privacy/privateStrings.ts
platform/src/domain/privacy/privacy.test.ts
platform/src/domain/reference/names.ts
platform/src/store/types.ts
platform/src/store/app.ts
platform/src/store/act.ts
platform/src/store/access.ts
platform/src/store/worldOps.ts
platform/src/store/selectors/index.ts
platform/src/store/selectors/nav.ts
platform/src/store/selectors/common.ts
platform/src/store/selectors/notifications.ts
platform/src/store/selectors/discover.ts
platform/src/store/selectors/search.ts
platform/src/store/actions/projects.ts
platform/src/app/router.tsx
platform/src/app/navIcons.ts
platform/src/app/notificationIcons.ts
platform/src/features/notifications/kit.tsx
platform/src/features/home/OwnerHome.tsx
platform/src/features/home/SurveyorHome.tsx
platform/src/features/public/Landing.tsx
platform/src/features/help/Help.tsx
platform/src/sandbox/seed.ts
platform/src/test/fixtures.ts
platform/src/test/privacy.platform.test.ts

## Deps


## Open questions
- Who owns the Project record builder? createOwnerProject must build a full Project, and the projects cluster is adding RIBA timeline fields and expanded project types. REC: The projects cluster extracts and exports projectRecord(input) from src/store/actions/projects.ts (used by createProject) and OwnerProjectInput is defined as Omit<NewProjectInput, 'client' | 'consultantOrgId'> plus architectOrgId, so new fields flow to owner projects automatically. Until then the foundation agent writes the extraction once.
- Should an owner be able to reserve lots from its own donor buildings for its own new project (self-reuse)? REC: Not in this round. Add a guard in requestReservation refusing a lot whose owner is the project's client, with the message 'This lot is yours. Allocate it directly; reserving is for other sellers.' and list self-allocation as a version 2 item in Help.
- Should a sixth sample account be added for the deconstruction contractor so testers can follow availability dates without signing up? REC: No: the sign-in page stays at five people. The seed shows Fennick Dismantling's dates from the owner's side, and the e2e journey signs up a contractor. Revisit if the partner asks to demo the contractor screen live.
- Should architects linking an owner organisation as client (client-linking cluster) be able to find owners by name? REC: No. Keep the existing rule that a seller's name never resolves to its organisation on the architect's form; the client-linking request should be addressed by email, landing on the owner's Requests page as a third tab 'Projects', with the same claimAddressedTo-style email match. On approval projectSide already gives the owner the client workspace.
- Share link and claim tokens are minted deterministically from the state counter, like team invites. REC: Acceptable for the sandbox; note in Help, Version 2 that real links need random tokens and expiry. Do not add randomness to actions, which must stay pure.
- Should a link include published lots or lots from several buildings? REC: One building and Shared lots only, as the note says 'shared lots'. A published lot already appears on the marketplace; a link page still shows it if the owner later publishes it.
