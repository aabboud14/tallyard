# projects-timeline

## Decisions
- **Stage 5 runs from site start to the day before practical completion. Stage 6 runs from practical completion for HANDOVER_DAYS (365). Stage 7 is open-ended. This is the smallest stored shape that always gives contiguous stages, so there is nothing to keep consistent.**: The programme is stored as five design stage start dates (RIBA stages 0 to 4), plus site start and practical completion. Stages 5, 6 and 7 are derived from those dates.
- **Every timeline fit check, toBlindBuyer's needByQuarter and the seeded demo values keep working unchanged. Existing tests that pass only startDate still pass, because siteStart defaults to startDate.**: The existing Project.startDate keeps its meaning ('materials needed on site from') and must fall between site start and practical completion. In forms it defaults to site start.
- **Projects slip, so the declared stage should not be overwritten by dates. Showing the difference is what 'showing today's stage' adds.**: Project.ribaStage stays as the stage the architect declares. The programme gives a planned stage for today, and a pure programmeCheck compares the two: on, behind, ahead or not started. The result is shown as an Indicative pill.
- **The form stays short. The new-practice e2e and journey test still create a project by filling one date. P4 is met because the defaults are disclosed.**: New projects get suggested stage dates (source 'suggested'). The suggestion is a pure function of today, the current stage, site start and typical stage lengths. These lengths are listed in Help, Methodology as placeholders. The setup checklist asks the architect to confirm or edit the dates.
- **This is the literal reading of the note, and the partner can demonstrate it with the sample accounts: Priya adds Lantern Quay and Isla accepts. A per-relationship 'trusted practice' shortcut would have kept one existing test assertion intact, but Priya adding Isla would then show no approval at all.**: Every new project needs the client organisation's acceptance, including a client the practice has worked with before. The link status lives on the Project (clientLink), and domain access counts the client only once the status is 'accepted'.
- **Without this, an architect could name any developer as client just to read its member list and emails. The privacy test covers it.**: Before the client accepts, the architect sees only the client organisation's name. Client members, avatars and emails stay hidden on Team and in the header. A decline reaches the architect under the organisation's name, not a person's.
- **One place gates every log audience. The other actions that address the client (owner sharing notices) switch to the same helper.**: projectOrgIds(project) leaves out the client until the link is accepted, so activity entries cannot reach a client that has not accepted. sendToClient refuses while the link is not accepted.
- **Existing nav, client home and access tests stay exact. The approval flow appears as soon as Priya creates a project for Lantern Quay.**: Seeded projects are already linked (clientLink accepted, with seeded dates). No pending request is seeded.
- **No change to NOTIFICATION_KINDS or the notification icons. The views.test sidebar assertion for Isla on fresh seed still holds.**: Link notifications reuse the existing 'team' kind; only its description changes. The client gets a 'Project requests' sidebar item with a badge, shown only while requests are pending, and a page at /app/projects/requests.
- **The client dashboard and the consultant clusters read the same module. A topic field (breeam, leed, well, circular_economy, whole_life_carbon, net_zero, energy, planning) lets them group and track entries without a second dataset.**: The planning and sustainability reference data is defined once in src/domain/reference/requirements.ts, with places in src/domain/reference/places.ts. It has three levels: national, London (London Plan 2021 and GLA guidance) and local (hand-written entries for 6 boroughs, otherwise a generated 'local plan' entry for any authority). Every entry is marked as an indicative summary as at October 2026.
- **The note asks for dropdowns, and typed input keeps non-London places possible. A London region accepts only its own boroughs or empty.**: The local authority is a dropdown filtered by region: all 33 London authorities spread across the five London regions, and a short list for South East and East of England. An 'Another local authority' option takes typed input. The field stays optional.
- **Matches 'optional for architects' while still giving a sensible default.**: Requirements are optional. The form pre-ticks the suggested statutory items, meaning planning policy, regulation and GLA guidance for the location, and never voluntary standards or certifications. Skipping is allowed. A change of location keeps only the requirements that still apply.
- **Free text could identify a project, so the blind description for 'other' stays 'other project'. The privacy test covers it.**: ProjectType grows to 13 values. 'Other' comes with an optional free-text description (projectTypeOther) that is shown to the project team and never reaches toBlindBuyer or owners.
- **TimelineStrip and timelineScale stay as they are for the marketplace cluster's material page, and the existing overview test assertions on timeline and nextSteps still hold.**: On the overview, the programme becomes a new full-width ProgrammeChart. It shows RIBA stage bands, milestones, a today line labelled with the stage, and shortlisted material windows coloured by fit. It replaces the TimelineStrip on the overview only. projectOverview().timeline is kept unchanged for compatibility.
- **Other clusters can reuse it, for example with the key 'home-activity'.**: Recent activity on the overview becomes a reusable CollapsibleCard, collapsed by default. Open state is kept in a new UiState.panels map, keyed 'project-activity'.
- **The seeded projects are already past setup, so they do not show it. Their nextSteps stay as they are.**: New projects show a setup checklist at the top of the overview, plus a pill and next-step line on the projects list. It hides itself once the programme is confirmed, the client has accepted and something is shortlisted.
- **As the note asks.**: Draggable availability bars are listed under Help, Version 2 and not built.
- **Project gains required fields. Without the bump, old persisted worlds would crash the selectors.**: STATE_VERSION goes from 1 to 2 in a single bump shared by all round-2 clusters, so stored v1 sandboxes reseed.

## Spec
## 14.x Project setup and timeline (cluster: projects-timeline)

Partner notes covered (review of 14 October 2026, "Project setup and timeline", plus one line from "Surveyor and asset owner flows"):

1. Each project needs a timeline of design stages (RIBA), site start and practical completion.
2. Material availability should overlap it, showing today's stage. The programme should dominate the overview.
3. Region and local authority dropdowns should pull in the relevant legislation and standards to select. This is optional for architects.
4. Project type options need expanding, plus manual input. Recent activity should be collapsible.
5. New projects should visually highlight next steps. Draggable availability bars are kept as a possible future feature.
6. Client linking by architects should require approval.

Product readings where a note is ambiguous:
- "Timeline of design stages" means RIBA Plan of Work 2020, stages 0 to 7. The architect enters the start of each design stage (0 to 4), site start and practical completion; stages 5 to 7 follow from those dates.
- "Showing today's stage" means a today line on the programme labelled with the planned stage, plus a pill comparing it with the stage the architect declares (on, behind or ahead of programme). The pill is Indicative.
- "Dominate the overview" means the programme is the first full-width card on the overview, above everything except the setup checklist and the client link banner.
- "Require approval" means each new project waits for the client organisation to accept before it appears in their workspace. Until then they see only a request.

---

### A. Data model (shared files; foundation agent)

#### A1. `src/domain/v1types.ts`: ProjectType

```ts
export type ProjectType =
  | 'office' | 'residential' | 'hotel' | 'mixed_use' | 'retail' | 'education' | 'healthcare'
  | 'laboratory' | 'industrial' | 'cultural' | 'leisure' | 'student_housing' | 'other'
```

#### A2. `src/domain/types.ts`: new types and Project fields

```ts
/** Start of RIBA Plan of Work 2020 stages 0 to 4, in order. Stage i runs to the day before stage i+1 starts; stage 4 runs to the day before site start. */
export type StageStarts = [string, string, string, string, string]

export type ProgrammeDates = {
  stageStarts: StageStarts
  /** Start of stage 5, Manufacturing and Construction. */
  siteStart: string
  /** Start of stage 6, Handover. */
  practicalCompletion: string
}

export type ProgrammeSource = 'suggested' | 'set'
export type ProjectProgramme = ProgrammeDates & { source: ProgrammeSource }

export type ClientLinkStatus = 'pending' | 'accepted' | 'declined'
/** The client organisation's answer to being added to a project. Only 'accepted' gives the client access. */
export type ClientLink = {
  status: ClientLinkStatus
  requestedOn: string                 // ISO date
  requestedByPersonaId: string | null // null for seeded links
  message: string                     // the architect's note to the client, '' if none
  decidedOn: string | null
  decidedByPersonaId: string | null
  decisionNote: string                // the client's note on a decline, '' if none
}
```

Add these fields to `Project` (all required):

```ts
  /** Free text when projectType is 'other'; '' otherwise. Project team only, never in toBlindBuyer. */
  projectTypeOther: string
  programme: ProjectProgramme
  clientLink: ClientLink
  /** IDs from src/domain/reference/requirements.ts that apply to the project's region and local authority, in dataset order. */
  planningRequirementIds: string[]
  /** True once the architect has saved or skipped the requirements. */
  requirementsReviewed: boolean
```

All new dates are `YYYY-MM-DD` strings inside the world, so `shiftWorld` moves them with the rest of the seed. No requirement ID may match `/^\d{4}-\d{2}(-\d{2})?$/`; a test asserts this.

#### A3. `src/store/types.ts` and `src/store/app.ts`

- `UiState` gains `panels: Record<string, boolean>` (true means open; an absent key means the panel's default). `DEFAULT_UI.panels = {}`.
- `AppData.version: 2`. `STATE_VERSION = 2` in `app.ts`, and `version: 2` (or `STATE_VERSION`) in `src/sandbox/seed.ts`. This is one bump for all round-2 clusters: a stored v1 sandbox reseeds.

---

### B. Reference data (new files; this cluster)

#### B1. `src/domain/reference/places.ts` (new)

```ts
export const LONDON_REGIONS = ['Central London', 'Inner London East', 'Inner London West', 'Outer London East', 'Outer London West'] as const
/** Local authorities by product region. The London grouping is the product's own and is indicative. Real places, named as references only. */
export const LOCAL_AUTHORITIES: Record<string, readonly string[]> = {
  'Central London': ['City of London', 'Westminster', 'Camden', 'Islington', 'Kensington and Chelsea', 'Lambeth', 'Southwark'],
  'Inner London East': ['Hackney', 'Haringey', 'Tower Hamlets', 'Newham', 'Lewisham', 'Greenwich'],
  'Inner London West': ['Hammersmith and Fulham', 'Wandsworth', 'Brent', 'Merton'],
  'Outer London East': ['Barking and Dagenham', 'Havering', 'Redbridge', 'Waltham Forest', 'Enfield', 'Bexley', 'Bromley', 'Croydon'],
  'Outer London West': ['Ealing', 'Hounslow', 'Hillingdon', 'Harrow', 'Barnet', 'Richmond upon Thames', 'Kingston upon Thames', 'Sutton'],
  'South East': ['Brighton and Hove', 'Canterbury', 'Guildford', 'Medway', 'Milton Keynes', 'Oxford', 'Portsmouth', 'Reading', 'Southampton', 'Woking'],
  'East of England': ['Basildon', 'Cambridge', 'Chelmsford', 'Colchester', 'Ipswich', 'Luton', 'Norwich', 'Peterborough', 'Southend-on-Sea', 'Thurrock'],
}
export function isLondonRegion(region: string): boolean
export function localAuthoritiesFor(region: string): readonly string[]   // [] for an unknown region
/** '' is always valid. A London region needs one of its own authorities. Other regions also accept any typed name of 80 characters or fewer. */
export function isValidLocalAuthority(region: string, localAuthority: string): boolean
export function regionOfLocalAuthority(localAuthority: string): string | null
export const ALL_REFERENCE_PLACES: readonly string[]  // every authority above, for names.ts
```

#### B2. `src/domain/reference/requirements.ts` (new): the single dataset

```ts
export type RequirementLevel = 'national' | 'london' | 'local'
export type RequirementKind = 'planning_policy' | 'regulation' | 'guidance' | 'voluntary_standard' | 'certification' | 'method'
export type RequirementTopic = 'planning' | 'energy' | 'whole_life_carbon' | 'circular_economy' | 'net_zero' | 'breeam' | 'leed' | 'well'
export type PlanningRequirement = {
  id: string; code: string; title: string; source: string
  level: RequirementLevel; kind: RequirementKind; topic: RequirementTopic
  /** When it applies, in plain words; '' when it always applies. */
  trigger: string
  summary: string
  asks: string[]
  /** How Tallyard's records feed it, or null. */
  helps: string | null
  /** Pre-ticked in the form: statutory policy, regulation and GLA guidance only. */
  suggested: boolean
  status: 'indicative'
}
export const REQUIREMENTS_AS_AT = 'October 2026'
export const REQUIREMENTS_NOTE = 'Indicative summaries as at October 2026. Check the current published documents before you rely on them.'
export const KIND_LABELS: Record<RequirementKind, string> = { planning_policy: 'Planning policy', regulation: 'Regulation', guidance: 'Guidance', voluntary_standard: 'Voluntary standard', certification: 'Certification', method: 'Method' }
export const NATIONAL_REQUIREMENTS: PlanningRequirement[]
export const LONDON_REQUIREMENTS: PlanningRequirement[]
export const LOCAL_REQUIREMENTS: Record<string, PlanningRequirement[]>  // hand-written, keyed by authority
export function localSlug(la: string): string        // lower case, runs of non-alphanumerics become '-', trimmed
export function localRequirements(region: string, la: string): PlanningRequirement[]  // [] when la is ''
export type RequirementGroup = { level: RequirementLevel; title: string; subtitle: string; items: PlanningRequirement[] }
export function requirementsFor(region: string, localAuthority: string): RequirementGroup[]
export function applicableIds(region: string, localAuthority: string): string[]
export function suggestedRequirementIds(region: string, localAuthority: string): string[]
/** Keeps the IDs that apply here, in dataset order, without repeats. */
export function keepApplicable(ids: string[], region: string, localAuthority: string): string[]
export function requirementsMethodology(): { title: string; source: string; status: 'Indicative summary' }[]
```

Group titles: national is "National" (subtitle "England, statutory and voluntary"); london is "London Plan 2021 and GLA guidance" (subtitle "Applies across Greater London"); local is the authority's name (subtitle "Local plan and guidance"). The london group appears only for a London region. The local group appears only when a local authority is set.

Every entry has `status: 'indicative'`. All copy follows P6: no "<" or ">", no dashes. Entries:

National (every region):
| id | code | title | source | kind | topic | suggested | summary |
|---|---|---|---|---|---|---|---|
| nppf | NPPF | National Planning Policy Framework | National Planning Policy Framework, December 2024 | planning_policy | planning | yes | National planning policy for England. Plans and decisions should support the move to a low carbon future and encourage the reuse of existing resources, including the conversion of existing buildings. |
| adl | Part L | Building Regulations Part L: conservation of fuel and power | Approved Document L, 2021 edition | regulation | energy | yes | Sets the energy and carbon performance new buildings must meet in use. It covers operational carbon only, not embodied carbon. |
| nzcbs | UK NZCBS | UK Net Zero Carbon Buildings Standard | UK Net Zero Carbon Buildings Standard, pilot version, 2024 | voluntary_standard | net_zero | no | A voluntary standard with limits on upfront embodied carbon and energy use by building type, verified once the building is in use. |
| riba2030 | RIBA 2030 | RIBA 2030 Climate Challenge | RIBA 2030 Climate Challenge, version 2, 2021 | voluntary_standard | whole_life_carbon | no | Voluntary targets for operational energy, embodied carbon and potable water use, by building type. |
| rics-wlca | RICS WLCA | Whole life carbon assessment for the built environment | RICS professional standard, 2nd edition, 2023 | method | whole_life_carbon | no | The method most UK whole life carbon assessments follow, based on BS EN 15978. The London Plan guidance and the net zero standard refer to it. |
| breeam-nc | BREEAM | BREEAM New Construction | BREEAM New Construction Version 7 series | certification | breeam | no | Certification scheme. Mat 01 covers life cycle assessment, Mat 05 rewards reusing materials and Wst 01 diverting construction waste from landfill. |
| leed-v5 | LEED | LEED v5 Building Design and Construction | LEED v5 | certification | leed | no | Certification scheme. Materials and Resources credits cover building and materials reuse, embodied carbon and construction waste diversion. |
| well-v2 | WELL | WELL Building Standard | WELL v2 | certification | well | no | Certification scheme for health and wellbeing. Its Materials concept restricts hazardous substances, which matters when reusing older materials. |

London (the five London regions):
| id | code | title | source | kind | topic | suggested | trigger and summary |
|---|---|---|---|---|---|---|---|
| lp-si2 | Policy SI 2 | Minimising greenhouse gas emissions | London Plan 2021 | planning_policy | whole_life_carbon | yes | Trigger "Major development; the whole life-cycle carbon assessment applies to applications referable to the Mayor". Summary "Major development should be net zero carbon in operation, following the energy hierarchy. Applications referable to the Mayor calculate whole life-cycle carbon emissions and show the actions taken to reduce them." Asks: "Energy strategy", "Whole life-cycle carbon assessment". Helps: "Avoided carbon on reused items is an input to the assessment, not a result." |
| lp-si7 | Policy SI 7 | Reducing waste and supporting the circular economy | London Plan 2021 | planning_policy | circular_economy | yes | Trigger "Applications referable to the Mayor". Summary "Referable applications submit a Circular Economy Statement. Policy targets include putting at least 95% of construction and demolition waste to beneficial use instead of landfill." Asks: "Circular Economy Statement", "Pre-demolition audit where there is demolition", "Bill of materials". Helps: "Reused items and their share of the bill of materials feed the statement." |
| lp-d3 | Policy D3 | Optimising site capacity through the design-led approach | London Plan 2021 | planning_policy | planning | yes | Summary "Development should aim for high sustainability standards and take into account the principles of the circular economy, as part of a design-led approach to site capacity." |
| gla-wlc | WLC guidance | Whole Life-Cycle Carbon Assessments guidance | Greater London Authority, 2022 | guidance | whole_life_carbon | yes | Summary "How to carry out and report the assessment for Policy SI 2, with benchmarks, at pre-application, planning and after construction." |
| gla-ces | CES guidance | Circular Economy Statements guidance | Greater London Authority, 2022 | guidance | circular_economy | yes | Summary "How to prepare the statement for Policy SI 7: the bill of materials with reused and recycled content by value, with an aim of at least 20%, and reporting after construction." |
| gla-energy | Energy guidance | Energy Assessment guidance | Greater London Authority, 2022 | guidance | energy | yes | Summary "How to show the energy hierarchy and the net zero carbon target for Policy SI 2, including carbon offset payments for any shortfall." |

Local, hand-written (these replace the generated entry for their authority; all `planning_policy` or `guidance`, topic `planning`, suggested yes):
- City of London: `la-city-of-london-carbon-options`, code "Carbon options", title "Carbon Options guidance", source "City of London planning advice note, 2023". Summary: "Major schemes are expected to compare retrofit and redevelopment options on whole life carbon before demolition is chosen."
- Westminster: `la-westminster-retrofit-first`, code "Retrofit first", title "Retrofit first approach", source "Westminster City Plan review". Summary: "The plan review sets a retrofit first approach where substantial demolition is proposed. Check its adoption status."
- Camden: `la-camden-cc1`, code "Policy CC1", title "Climate change mitigation", source "Camden Local Plan 2017". Summary: "Proposals with substantial demolition must show that keeping and improving the existing building is not possible." Also `la-camden-cpg`, code "CPG", title "Energy efficiency and adaptation", source "Camden Planning Guidance, 2021", kind guidance. Summary: "How Camden applies its climate policies, including whole life carbon and circular economy expectations for larger schemes."
- Southwark: `la-southwark-plan`, code "Southwark Plan", title "Sustainability standards and energy policies", source "Southwark Plan 2022".
- Hackney: `la-hackney-lp33`, code "LP33", title "Climate change and sustainable design policies", source "Hackney Local Plan 2033".
- Islington: `la-islington-lp`, code "Local Plan", title "Sustainable design policies", source "Islington Local Plan 2023".

Summary for Southwark, Hackney and Islington: "Borough policies on carbon, energy and sustainable design apply alongside the London Plan. Check the adopted plan and any supplementary planning documents."

Generated local entry, for any other authority, known or typed: `la-${localSlug(la)}`, code "Local plan", title `${la} local plan policies`, source `${la} local plan and supplementary planning documents`, kind planning_policy, topic planning, suggested yes. Summary in London: "Borough policies apply alongside the London Plan. Check the adopted local plan and any guidance on sustainable design, energy, waste and the circular economy." Outside London: "Local policies apply alongside national policy. Check the adopted local plan and any guidance on sustainable design, energy and waste."

#### B3. `src/domain/reference/projectTypes.ts` (new)

```ts
export const PROJECT_TYPES: ProjectType[]  // the order of A1; 'other' last
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = { office: 'Office', residential: 'Residential', hotel: 'Hotel', mixed_use: 'Mixed use', retail: 'Retail', education: 'Education', healthcare: 'Healthcare', laboratory: 'Laboratory', industrial: 'Industrial and logistics', cultural: 'Cultural and civic', leisure: 'Sport and leisure', student_housing: 'Student housing', other: 'Other' }
/** What a seller may read: never the free text. */
export function blindProjectType(type: ProjectType): string  // `${PROJECT_TYPE_LABELS[type].toLowerCase()} project`, so 'other project' for other
export function projectTypeLabel(p: { projectType: ProjectType; projectTypeOther: string }): string  // the trimmed free text when type is 'other' and the text is not empty, else the label
export const PROJECT_TYPE_OTHER_MAX = 60
```

`src/domain/reference/labels.ts`: replace the PROJECT_TYPE_LABELS line with `export { PROJECT_TYPE_LABELS } from './projectTypes'`. `store/actions/projects.ts` re-exports `PROJECT_TYPES` from here, so existing imports keep working.

#### B4. `src/domain/reference/names.ts` (shared)

- Add to `ALLOWED_SOURCES`: 'WELL', 'UK Net Zero Carbon Buildings Standard', 'RIBA 2030 Climate Challenge', 'National Planning Policy Framework', 'Approved Document L', 'BS EN 15978'.
- Add a new group 5: `export { ALL_REFERENCE_PLACES as REFERENCE_PLACES } from './places'`, with the comment "Real places, named only as references for location and policy, never as actors."
- No new fictional names are needed. 'Corbel Yard' is already in TEST_ONLY_NAMES and is used by the new tests.

---

### C. Engine: `src/domain/engines/programme.ts` (new, pure)

```ts
export const DESIGN_STAGE_DAYS = [28, 56, 84, 112, 140] as const  // stages 0 to 4: 4, 8, 12, 16, 20 weeks, placeholders
export const CONSTRUCTION_DAYS = 540   // default site start to practical completion
export const HANDOVER_DAYS = 365       // stage 6 drawn for this long after practical completion
export const USE_STUB_DAYS = 90        // stage 7 visible this far on the chart
export type StageSpan = { stage: number; start: string; end: string | null }  // inclusive; end null for stage 7

export function programmeStages(p: ProgrammeDates): StageSpan[]
// stage i (0..3): [starts[i], starts[i+1]-1]; stage 4: [starts[4], siteStart-1]; stage 5: [siteStart, PC-1];
// stage 6: [PC, PC+HANDOVER_DAYS-1]; stage 7: [PC+HANDOVER_DAYS, null]
export function stageOn(p: ProgrammeDates, date: string): number | null   // null before stage 0 starts
export function defaultCompletion(siteStart: string): string               // addDays(siteStart, CONSTRUCTION_DAYS)
export function suggestProgramme(today: string, stage: number, siteStart: string, practicalCompletion?: string | null): ProgrammeDates | null
export const PROGRAMME_ERRORS = {
  badDate: 'Enter a valid date.',
  order: 'Each stage must start after the one before.',
  siteStart: 'Site start must be after the start of stage 4.',
  completion: 'Practical completion must be after site start.',
  materials: 'Materials must be needed between site start and practical completion.',
  tooSoon: 'Site start is too soon for the remaining design stages.',
} as const
export type ProgrammeField = 'stage0' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'siteStart' | 'practicalCompletion' | 'startDate'
export function validateProgramme(p: ProgrammeDates, materialsFrom?: string): [ProgrammeField, string][]
export type ProgrammeStatus = 'on' | 'behind' | 'ahead' | 'not_started'
export type ProgrammeCheck = { status: ProgrammeStatus; planned: number | null; declared: number }
export function programmeCheck(p: ProgrammeDates, declaredStage: number, today: string): ProgrammeCheck
export type AxisTick = { iso: string; at: number; label: string | null; major: boolean }
export type ProgrammeAxis = { start: string; end: string; spanDays: number; ticks: AxisTick[] }
export function programmeRange(p: ProgrammeDates, today: string, materialsFrom: string, windowEnds: string[], range: 'whole' | 'ahead'): { start: string; end: string }
export function programmeAxis(start: string, end: string): ProgrammeAxis
export function axisAt(axis: ProgrammeAxis, iso: string): number          // clamp(daysBetween(start, iso) / spanDays, 0, 1)
export const PROGRAMME_PARAMETER_ROWS: Parameter[]
```

**suggestProgramme**
- PC is `practicalCompletion ?? defaultCompletion(siteStart)`. Let T = daysBetween(today, siteStart).
- Stage 4 or earlier: if T is less than 5 minus stage, return null. Otherwise set starts[stage] = today, and go back from there: starts[i] = starts[i+1] minus DESIGN_STAGE_DAYS[i] for each earlier stage.
- Going forward: W is the sum of DESIGN_STAGE_DAYS[stage..4]. For i from stage to 3, the length is d = max(1, floor(T × DESIGN_STAGE_DAYS[i] / W)), capped at T minus the days used so far minus (4 minus i). Then starts[i+1] = starts[i] + d. Stage 4 takes the remainder.
- Stage 5 or later: starts[4] = siteStart minus 140, then back from there as above. The today constraint does not apply.

**validateProgramme**
- Any date that is not a real ISO date gives `badDate` on that field.
- Each starts[i+1] must be after starts[i], otherwise `order` on stage i+1.
- siteStart must be after starts[4] (`siteStart`), and PC after siteStart (`completion`).
- When `materialsFrom` is given, it must be on or after siteStart and on or before PC (`materials` on 'startDate').

**programmeCheck**
- planned = stageOn(p, today).
- Status is `not_started` when planned is null, `on` when planned equals declared, `behind` when declared is less than planned, and `ahead` otherwise.

**programmeRange**
- 'whole': start is the first of the month of min(starts[0], today). End is the last day of the month of max(PC + HANDOVER_DAYS + USE_STUB_DAYS, materialsFrom, every window end).
- 'ahead': start is the first of today's month; the end is the same as for 'whole'.

**programmeAxis**
- One tick at the first of each month from start to end, inclusive. `major` is true for January, April, July and October.
- Labels by span:
  - 12 months or fewer: every month, as 'Oct 2026' on the first tick and in January, otherwise 'Nov'.
  - 13 to 36 months: quarter starts only, as 'Q1 2027' (formatQuarter).
  - More than 36 months: Januaries only, as '2027'.

**PROGRAMME_PARAMETER_ROWS** (group 'Programme suggestions'; source 'Sample durations, to be validated with practices'; status 'placeholder'):
- One row per design stage, with id `programme.stage${i}`, label `Stage ${i}, ${RIBA_STAGES[i]}, typical length`, the value from DESIGN_STAGE_DAYS and unit 'days, for suggested dates'.
- programme.construction: 540, 'days from site start to practical completion, when no date is given'.
- programme.handover: 365, 'days of stage 6 shown after practical completion'.

---

### D. Access and privacy

**D1. `src/domain/access.ts`**
- Add `export function clientLinked(p: Project): boolean { return p.clientLink.status === 'accepted' }`.
- `projectsFor` keeps a project for its client org only when `clientLinked(p)`. The architect and consultant rules are unchanged.

**D2. `src/store/access.ts`**
- `projectOrgIds(project)` includes `clientOrgId` only when `clientLinked(project)`.
- New `export function buyerSideOrgIds(p: Project): string[]` returns the architect, plus the client if linked.

**D3. `src/store/actions/owner.ts`** (shared, two lines, near 275 and 355)
- Replace `[p.architectOrgId, p.clientOrgId]` with `buyerSideOrgIds(p)`.

**D4. `src/domain/privacy/privateStrings.ts`**
- `projectPrivateStrings` also returns `project.projectTypeOther`, `project.clientLink.message` and `project.clientLink.decisionNote` when they are not empty.

**D5. The client side of a pending link sees only** the architect's name for the project, the practice name, the requester's name, the type label, region and local authority, the declared stage, site start, practical completion and the message. It never sees the shortlist, any listing or any figure.

**D6. The architect side of a pending or declined link sees only** the client organisation's name and whether it has any members. It never sees member names, emails or avatars (Team section and header avatars), and a decline is attributed to the organisation, not to a person.

---

### E. Store actions (`src/store/actions/projects.ts` unless noted; pure `(state, actor, ...) => ActionResult`)

```ts
export const PROJECT_ERRORS = { ...existing,
  localAuthority: 'Choose a local authority in this region.',
  requirement: 'Choose requirements that apply to this location.',
  linked: 'The client has already accepted this project.',
  alreadyPending: 'A request is already waiting for this client.',
  notPending: 'This request has already been answered.',
}
export type NewProjectInput = { ...existing (startDate stays required: materials needed on site from),
  projectTypeOther?: string; siteStart?: string; practicalCompletion?: string;
  requirementIds?: string[]; clientMessage?: string }
export type ProjectField = existing | 'projectTypeOther' | 'localAuthority' | 'siteStart' | 'practicalCompletion'
```

**`validateNewProject(input, today)`**: the existing checks in the existing order, then:
- `localAuthority` when the region is valid and `!isValidLocalAuthority(region, la)`.
- If startDate has no error: siteStart = input.siteStart ?? startDate, and PC = input.practicalCompletion ?? defaultCompletion(siteStart). Run suggestProgramme(today, ribaStage, siteStart, PC). A null result gives ['siteStart', tooSoon]. Otherwise run validateProgramme(dates, startDate) and map its errors: siteStart and practicalCompletion to their fields; `materials` to 'startDate' when the input gave a siteStart, otherwise to 'siteStart'.
- None of these fire when startDate is invalid or in the past, so the existing test's exact error lists still hold.

**`createProject`** (existing checks, then):
- `projectTypeOther`: cleaned to 60 characters and kept only when the type is 'other'.
- `blind.projectType`: `blindProjectType(type)`.
- `programme`: `{ ...suggestProgramme(...), source: 'suggested' }`.
- `clientLink`: `{ status: 'pending', requestedOn: a.today, requestedByPersonaId: a.persona.id, message: clean(clientMessage, 1000), decidedOn: null, decidedByPersonaId: null, decisionNote: '' }`.
- `planningRequirementIds`: `keepApplicable(input.requirementIds ?? [], region, la)`. `requirementsReviewed` is true when that list is not empty.
- Log 'created the project' to projectOrgIds, which now leaves the pending client out.
- Log for the client org only: `{ orgIds: [clientOrgId], projectId: null, actor: a.user.name, text: 'asked to add you as client on ${name}', href: '/app/projects/requests' }`.
- Notify the client org: kind 'team', title `${a.org.name} asked to add you as client on ${name}`, body `${a.user.name}: ${message}` if there is a message, else 'Accept to see the project and approve materials for it.', href '/app/projects/requests'.
- The consultant notification is unchanged.

**`decideClientLink(state, actor, projectId, decision: 'accepted' | 'declined', note: string)`**
- Refusals: the actor must have role client and belong to `p.clientOrgId` (else ERRORS.role); the status must be pending (else notPending); an unknown project gives noProject.
- Accept:
  - Set status accepted, decidedOn today and decidedByPersonaId.
  - Log with actor `a.user.name` and text `accepted the project as client` to projectOrgIds(next), which now includes the client.
  - Notify the architect org: title `${clientOrg} accepted ${p.name}`, body 'They can now see the project and approve materials you send.', href the project.
- Decline:
  - Set status declined and decisionNote to the cleaned note (1000 characters).
  - Log with actor set to the client org name and text `declined the project`, to the architect org only.
  - Notify the architect org: title `${clientOrg} declined ${p.name}`, body `Their note: ${note}` if there is a note, else 'Ask again or choose another client from the project overview.', href the project.

**`requestClientLink(state, actor, projectId, client: ClientChoice, message: string)`**
- Architect only. Refused with `linked` when the status is accepted, and with `alreadyPending` when the status is pending for the same org.
- Resolve the client with the existing resolveClient, which may mint a new placeholder org. Set clientOrgId and developerOrgId, and a fresh pending clientLink.
- Log `asked ${clientName} to join as client` (architect and consultant), add the client-side log line as above, and notify the client as above.

**`setProjectProgramme(state, actor, projectId, input: { ribaStage: number; programme: ProgrammeDates; startDate: string })`**
- Architect only. Stage must be 0 to 7 (else `stage`).
- validateProgramme(programme, startDate): the first error is returned.
- Save `{ ...programme, source: 'set' }`, ribaStage, startDate and `keyDates.steelNeedBy = startDate`.
- Nothing changed, including source: return ok(state). Otherwise log 'updated the programme'.

**`setProjectRequirements(state, actor, projectId, ids: string[])`**
- Architect only. Any ID not in applicableIds gives `requirement`.
- Save the IDs in dataset order and set `requirementsReviewed = true` (an empty list counts as skipped).
- Log `chose ${plural(n, 'planning and sustainability requirement')}`, or 'cleared the planning and sustainability requirements' when the list is empty.

**`updateProject`**
- ProjectPatch adds `projectTypeOther`.
- Region and local authority are validated together with isValidLocalAuthority.
- A change of location prunes `planningRequirementIds` with keepApplicable.
- A startDate outside the programme gives PROGRAMME_ERRORS.materials.
- blind.projectType uses `blindProjectType` (created projects only, as today).

**`existingClientOrgIds`**: clients of the practice's projects whose clientLink status is not 'declined'.

**`src/store/actions/shortlist.ts`** (shared): in `sendToClient`, after the role check, add `if (p.clientLink.status !== 'accepted') return fail(state, SHORTLIST_ERRORS.clientNotLinked)`, with clientNotLinked = 'The client has not accepted this project yet, so nothing can be sent for approval.'

**`src/store/act.ts`** (shared): bind `decideClientLink`, `requestClientLink`, `setProjectProgramme` and `setProjectRequirements`.

---

### F. Selectors

**`src/store/selectors/programme.ts`** (new)

```ts
export type ProgrammeRange = 'whole' | 'ahead'
export type ProgrammeStageBand = { stage: number; label: string; name: string; start: string; end: string | null; datesText: string; weeksText: string; from: number; to: number; state: 'past' | 'current' | 'future' }
export type ProgrammeMilestone = { id: 'site_start' | 'materials' | 'completion'; label: string; date: string; dateText: string; at: number }
export type ProgrammeMaterialRow = { itemId: string; publicId: string; title: string; status: WishStatus; statusLabel: string; kind: 'now' | 'window'; from: number; to: number; fit: Fit; fitLabel: string; windowText: string; storage: { from: number; to: number } | null; href: string }
export type ProgrammeView = {
  range: ProgrammeRange; axis: ProgrammeAxis
  today: { date: string; dateText: string; at: number }
  stages: ProgrammeStageBand[]
  plannedStageText: string          // 'Today: stage 2, Concept Design', or 'Programme starts 1 Nov 2026'
  check: { status: ProgrammeStatus; label: string; text: string }
  source: ProgrammeSource           // drives the 'Suggested dates' pill
  milestones: ProgrammeMilestone[]  // 'materials' left out when it equals site start
  materials: ProgrammeMaterialRow[] // live shortlist rows, from rowsOf (public listings only)
  canEdit: boolean
  description: string               // the chart's accessible description
}
export function programmeView(state: AppData, viewer: Viewer, projectId: string, range?: ProgrammeRange): ProgrammeView | null
export type ProgrammeSummary = { projectId: string; name: string; stages: StageSpan[]; plannedStage: number | null; declaredStage: number; siteStart: string; practicalCompletion: string; materialsFrom: string; source: ProgrammeSource }
/** For the client's parallel timeline and the consultant. Pure, with no viewer. */
export function projectProgrammeSummary(p: Project, today: string): ProgrammeSummary
export type ProgrammeForm = { ribaStage: number; stageStarts: StageStarts; siteStart: string; practicalCompletion: string; startDate: string; stageOptions: { value: number; label: string }[]; today: string }
export function programmeForm(state: AppData, viewer: Viewer, projectId: string): ProgrammeForm | null  // architect only
```

Fields of ProgrammeView:
- `state` on a stage band is current for the planned stage, past before it and future after it.
- `weeksText` is `Math.round(days / 7)` weeks, or 'Ongoing' for stage 7.
- `check.label` is 'On programme', 'Behind programme', 'Ahead of programme' or 'Not started'.
- `check.text` for behind is 'Planned stage 3 today. The project is at stage 2.' For ahead it is 'The project is at stage 3, ahead of the planned stage 2.' For on, it is ''.

**`src/store/selectors/requirements.ts`** (new)

```ts
export type RequirementRow = { id: string; code: string; title: string; source: string; kindLabel: string; topic: RequirementTopic; summary: string; trigger: string; asks: string[]; helps: string | null; suggested: boolean; selected: boolean }
export type RequirementChoiceGroup = { level: RequirementLevel; title: string; subtitle: string; rows: RequirementRow[] }
/** For the forms: no state needed. */
export function requirementChoices(region: string, localAuthority: string, selected: string[]): { groups: RequirementChoiceGroup[]; suggestedIds: string[]; note: string }
export type ProjectRequirementsView = { canEdit: boolean; locationText: string; selected: RequirementRow[]; reviewed: boolean; choices: ReturnType<typeof requirementChoices>; note: string }
export function projectRequirementsView(state: AppData, viewer: Viewer, projectId: string): ProjectRequirementsView | null  // any side on the project
```

**`src/store/selectors/project.ts`** (this cluster)

```ts
export type ClientLinkView = { status: ClientLinkStatus; clientName: string; clientHasMembers: boolean; requestedText: string; decidedText: string | null; note: string | null; canChange: boolean }
export function clientLinkView(state, viewer, projectId): ClientLinkView | null  // architect only; null when accepted
export type SetupStepState = 'done' | 'current' | 'todo' | 'waiting' | 'attention'
export type SetupIntent = 'edit_programme' | 'keep_programme' | 'requirements' | 'change_client' | null
export type SetupStep = { id: 'programme' | 'client' | 'requirements' | 'consultant' | 'shortlist' | 'send'; title: string; text: string; state: SetupStepState; optional: boolean; action: { label: string; href: string | null; intent: SetupIntent } | null; secondary: { label: string; intent: SetupIntent } | null }
export type ProjectSetup = { visible: boolean; done: number; total: number; steps: SetupStep[]; nextText: string | null }
export function projectSetup(state, viewer, projectId): ProjectSetup | null  // architect only
export type LinkRequestRow = { projectId: string; projectName: string; architectName: string; requestedBy: string; requestedText: string; message: string; typeLabel: string; locationText: string; stageText: string; siteStartText: string; completionText: string; status: ClientLinkStatus; statusText: string; href: string | null }
export function clientLinkRequests(state, viewer): { pending: LinkRequestRow[]; answered: LinkRequestRow[] } | null  // clients only
```

Setup step rules, in order:
- **programme**: done when source is 'set'. Otherwise the title is 'Check the programme', the action is 'Edit programme' (edit_programme) and the secondary is 'Keep these dates' (keep_programme).
- **client**: done when accepted. When pending, the state is 'waiting'. When declined, the state is 'attention' with the action 'Ask again' (change_client).
- **requirements** (optional): done when reviewed.
- **consultant** (optional): done when consultantOrgId is set; the action goes to team.
- **shortlist**: done when the list has any item; the action is 'Find materials' to discoverHref.
- **send**: done when any item was ever sent, approved or declined. It is 'waiting' until the client accepts.

'current' is the first step that is not done and not waiting. `visible` is false once programme, client and shortlist are all done. `nextText` is `Next: ${current.title lower-cased at first letter}`.

Changes to the existing functions:
- `projectOverview`: add `programme: ProgrammeView`, `requirements: ProjectRequirementsView`, `setup: ProjectSetup | null`, `link: ClientLinkView | null` and `activityTotal: number`. Leave `timeline` (programmeTimeline) and `nextSteps` as they are, except that the architect 'send' step needs the client to have accepted.
- `projectHeader`: team avatars leave out the client org unless linked. Add `siteStartText`, `completionText`, `plannedStageText` and `linkStatus: ClientLinkStatus`.
- `projectTeam`: TeamSection gains `pending: boolean`. A client section that is not linked has `members: []` and `pending: true`.
- `projectsListView`: rows gain `setup: { done: number; total: number; nextText: string | null } | null` (architect, visible only) and `linkStatus`.
- `newProjectOptions`: types come from PROJECT_TYPES with labels. Add `localAuthorities: Record<string, readonly string[]>`, `today` and `typicalCompletionDays: CONSTRUCTION_DAYS`.
- `projectRef` (common.ts): `typeLabel: projectTypeLabel(p)`.
- `arch-project.ts` ProjectFields: add `projectTypeOther`.

Shared selector edits:
- `common.ts`: in `hrefForReader`, `if (section === 'projects' && id === 'requests') return roleOfUser(state, userId) === 'client' ? href : null` must come before the projectSide branch.
- `nav.ts`: the client branch appends `item('project-requests', 'Project requests', '/app/projects/requests', 'Inbox', { badge })` to the Projects section, only when pending is more than 0. In `routeAccess`, `if (id === 'requests') return tab === undefined ? roles('client') : 'not_found'` goes before the ID check.
- `notifications.ts`: the 'team' description becomes 'Someone joins your organisation, an architect asks to add you to a project, or a client answers your request.'
- `settings.ts` `methodologyView`: include PROGRAMME_PARAMETER_ROWS, and add `references: requirementsMethodology()` to its return.
- `index.ts`: `export * from './programme'` and `export * from './requirements'`.
- Optional: in `shortlist.ts` line 202, use projectTypeLabel(p) so a custom type reaches the specification.

---

### G. Routes and navigation

- `src/app/router.tsx` (shared): add `{ path: 'projects/requests', lazy: lazyPage(() => import('../features/projects/LinkRequests'), 'LinkRequests') }` before `projects/:projectId`.
- Sidebar: the client gets 'Project requests' (Inbox icon) with a badge while requests are pending. Nothing changes for the architect or consultant.
- No new project tab: the programme and requirements live on the Overview.

---

### H. Screens, in priority order

**H1. Overview (`features/projects/Overview.tsx`), top to bottom**

1. **Setup checklist** (`SetupChecklist.tsx`; architect only, when `setup.visible`), full width.
   - Card with a brand-50 background and a brand-100 ring.
   - Header: 'Set up {project name}', subtitle 'A few steps to get this project working. You can come back to any of them.', a SegmentedBar '{done} of {total} done'.
   - Steps: a vertical list on phone; a 3-column grid of step tiles from md. Each step shows an icon by state (CircleCheck for done, Circle for todo, Hourglass for waiting, CircleAlert for attention), the title, the text and an 'Optional' pill where it applies.
   - The current step gets a brand ring and a primary button; other actions are secondary or ghost buttons. Intents open ProgrammeDialog, RequirementsDialog or ChangeClientDialog. 'Keep these dates' calls setProjectProgramme with the current values.
   - Touch targets are 44px.
2. **Client link banner** (`ClientLinkBanner.tsx`; architect only, when `link` is not null). A Callout with `data-testid="client-link-banner"`:
   - Pending, client has members (info): 'Waiting for {client} to accept this project. Until they do, they cannot see it and you cannot send materials for approval.' Action: 'Change client'.
   - Pending, no members: 'Nobody from {client} uses Tallyard yet, so nobody can accept this project. You can still shortlist materials. Sending for approval opens once the client accepts.' Action: 'Change client'.
   - Declined (warning): '{client} declined this project on {date}.' plus the note line 'Their note: {note}'. Actions: 'Ask again', 'Choose another client'.
   - ChangeClientDialog: client select (existing clients plus 'A new client'), a new-client name, a message textarea 'Message to the client (optional)', and the button 'Send request'. Toast: 'Request sent to {client}'.
3. **Programme card** (`ProgrammeCard.tsx`), full width and the visual anchor of the page.
   - CardHeader: title 'Programme', description 'RIBA Plan of Work stages, site start and completion, with when each shortlisted material is available.'
   - Header actions: the 'Today: stage 2, Concept Design' chip; a check Pill (On programme is brand, Behind programme is warning, Ahead of programme is info, Not started is neutral) with a tooltip giving check.text; a 'Suggested dates' pill when the source is suggested (tooltip 'Worked out from your site start and typical stage lengths. Edit to match your plan.'); IndicativeMarker; a SegmentedControl 'Whole programme' / 'From today' (local state, default whole); 'Edit programme' (architect).
   - Body: `<ProgrammeChart>` (H6).
   - Below the chart, a `<details>` 'Stage dates' with a table: Stage, Name, From, To, Length.
   - Footer line: 'Stages from the RIBA Plan of Work 2020. Dates are the architect's plan. Indicative.'
   - When there are no materials, the materials lane shows, for the architect, 'No materials on the programme yet. Shortlist materials and each one appears here against your programme.' with a 'Find materials' button. For the client and consultant: 'Materials appear here as the architect shortlists them.'
4. **Three tiles**, a grid of 3 at xl, 2 at md, 1 on phone: Shortlist (existing), Avoided carbon (existing), and Planning and sustainability (`RequirementsCard.tsx`).
   - RequirementsCard: title 'Planning and sustainability', IndicativeMarker, subtitle '{n} chosen for {locationText}'. Up to 4 rows (code, title, source, kind pill), then '{k} more'. The architect gets an 'Edit' button.
   - Empty, architect: 'No requirements chosen yet. Pick the policies and standards to track for this location.' with the button 'Choose requirements'. Empty, others: 'The architect has not chosen any requirements yet.'
5. **Two columns**: Next steps (existing) and Details. Details gains 'Site start', 'Practical completion' and 'Local authority'. The Client row reads '{client}, waiting to accept' or '{client}, declined' when not linked.
6. **Recent activity**: `CollapsibleCard` with `data-testid="overview-activity"`, collapsed by default (key 'project-activity').
   - Collapsed header: 'Recent activity', the count, and a summary of the latest row ('{actor} {text}, {timeAgo}').
   - Expanded: the existing ActivityFeed and an 'All activity' link.
   - The toggle is a button with aria-expanded and aria-controls, 44px high.

**H2. New project dialog (`NewProjectDialog.tsx`)**

One form, so `create-project` still submits in a single click, with these sections:
- **Project**: name; type (13 options; choosing 'Other' reveals 'Describe the type (optional)', placeholder 'For example, data centre', testid `project-type-other`).
- **Client**: existing select or new name (as today), then 'Message to the client (optional)' (testid `project-client-message`), with the hint '{client or "The client"} must accept before the project appears in their workspace.'
- **Programme**:
  - 'Current RIBA stage'.
  - 'Site start' (testid `project-start`, hint 'When work starts on site.').
  - 'Practical completion' (testid `project-completion`, hint 'Leave blank to use 18 months after site start.').
  - 'Materials needed on site from' (testid `project-materials-from`, optional, hint 'Leave blank to use the site start.').
  - On submit: startDate = materials date or site start; siteStart = site start; practicalCompletion = completion or undefined.
- **Location and requirements**: region; local authority Select (placeholder 'Choose a local authority', options for the region plus 'Another local authority', which reveals an Input; testid `project-local-authority`).
  - A disclosure 'Planning and sustainability requirements (optional)' with the summary '{n} apply to {place}, {m} suggested. Choose now or later.'
  - Expanded, it shows `RequirementsPicker`. The suggested items are pre-ticked when the location is first set; changing the location re-applies suggestions only if the architect has not touched the picker.
- **Team**: consultant and description (as today).
- The short (onboarding) form keeps name, client, type, site start (`project-start`) and region. Everything else takes its default.
- Toast after create: '{name} created', description 'Waiting for {client} to accept. Set up the programme while you wait.'

**H3. RequirementsPicker (`RequirementsPicker.tsx`)**, used by the new project dialog and RequirementsDialog
- Top: an IndicativeMarker and REQUIREMENTS_NOTE, plus the buttons 'Select suggested' and 'Clear'.
- Groups, each with a title and subtitle. Rows: Checkbox, '{code}, {title}', the source in muted text, a kind pill, a 'Suggested' pill, and a 'More' disclosure showing the summary, 'When it applies: {trigger}', 'What it asks for' (a list) and 'How Tallyard helps: {helps}'.
- Footer: '{n} selected'.
- RequirementsDialog: title 'Planning and sustainability requirements', description 'Pick what to track on this project. Based on {locationText}.', buttons 'Cancel' and 'Save'. Toast: 'Requirements saved', with Undo.

**H4. ProgrammeDialog (`ProgrammeDialog.tsx`)**, from 'Edit programme'
- Title 'Edit programme'. Description 'Set the RIBA stage dates, site start and practical completion. Every timeline check on this project uses the date materials are needed on site.'
- Fields:
  - 'Current RIBA stage'.
  - A table of five rows 'Stage {i}, {name}', each with a date input and a live length from `programmeStages(draft)` (a domain call; the component only formats).
  - 'Site start' (hint 'Stage 5, Manufacturing and Construction, starts here.').
  - 'Practical completion' (hint 'Stage 6, Handover, starts here.').
  - 'Materials needed on site from' (hint 'Between site start and practical completion.').
- A secondary button 'Suggest stage dates' (RotateCcw) fills the five starts from suggestProgramme(today, stage, siteStart, PC), or shows tooSoon.
- Errors come from validateProgramme and appear on their fields. Footer: 'Cancel', 'Save programme'. Toast: 'Programme saved', with Undo.

**H5. Project requests page (`LinkRequests.tsx`, route /app/projects/requests, clients)**
- PageHeader 'Project requests', subtitle 'Architects ask before they add you as the client on a project. Accept to see the project and approve materials for it.'
- Pending cards (`data-testid="link-request-{projectId}"`):
  - The project name as h2, then '{architect} wants to add you as client'.
  - 'Asked by {requestedBy}, {requestedText}'.
  - A DescriptionList: Type, Location, RIBA stage, Site start, Practical completion.
  - The message as a quote.
  - Buttons 'Accept' (primary, Check icon, `accept-link-{id}`) and 'Decline' (`decline-link-{id}`). Decline opens a dialog 'Decline {project}?' with 'Tell {architect} why (optional)' and the buttons 'Decline' and 'Cancel'.
  - Toasts: 'You joined {project}' with the action 'Open project'; 'Request declined'.
- 'Answered' section: rows reading '{project}, {architect}' with 'Accepted {date}' (linking to the project) or 'Declined {date}'.
- Empty state: Inbox icon, 'No project requests', 'When an architect asks to add you as the client on a project, it appears here for you to accept or decline.'
- Also export `PendingLinkRequests` (pending cards only, rendering nothing when there are none) for the client cluster to place at the top of ClientHome.

**H6. ProgrammeChart (`src/ui/ProgrammeChart.tsx`; positions come in as fractions)**

Props: `{ axis, today, todayLabel, stages, milestones, materials, emptyText?, emptyAction?, testId }`.

Lanes:
- A tick label row.
- 'RIBA stages': `data-part="stage-band"` blocks positioned with `left: calc(from*100%)` and `right: calc((1-to)*100%)`, showing the stage number and, from lg, a truncated name. Current is brand-600 with white text, past is brand-50, future is subtle. Stage 7 fades out with a gradient.
- 'Milestones': diamond markers with labels: 'Site start', 'Materials needed on site', 'Practical completion'.
- 'Materials': one row per material, coloured by fit (in time green, tight amber, late red, now neutral), with a dashed storage run as in TimelineStrip.

Other rules:
- A today line runs through all lanes, labelled at the top with todayLabel. Grid lines sit at the ticks, stronger on major ticks.
- Left label column of 180px from sm; on phone the labels sit above the bars.
- The whole figure is `role="img"` with `aria-label={description}`.
- No horizontal scroll at 390, 1024 and 1440 px.

**H7. Other screens**
- **ProjectLayout header**: the facts line adds 'Site start {date}' (CalendarRange) and 'Practical completion {date}'. For the architect, a 'Waiting for client' pill (or 'Client declined') appears next to the subtitle when the link is not accepted.
- **ProjectsList**: architect cards whose setup is visible show the pill 'Setting up, {done} of {total}' and the line '{nextText}'. Cards and table rows for a pending link show the pill 'Waiting for client'.
- **Team**: a pending client section shows '{client} has not accepted this project yet.' and no members.
- **Shortlist**: render `<ClientLinkBanner>` above the board when not linked.
- **EditProjectDialog**: the RIBA stage and date fields move to ProgrammeDialog. Add type 'Other' with its free text, and the local authority Select with the same behaviour as H2.

**H8. `src/ui/Collapsible.tsx`**: `CollapsibleCard({ title, icon?, count?, summary?, open, onOpenChange, actions?, children, testId })`, exported from `src/ui/index.ts` together with ProgrammeChart.

**H9. Help (`features/help/Help.tsx`, shared)**
- Version 2 list: add `{ icon: GripHorizontal, title: 'Drag availability on the programme', text: "Drag a material's availability bar on the project programme to try other dates and see the timing check update. A change would go to the seller as a request, never straight to their record." }`.
- Methodology: the 'Programme suggestions' rows arrive through methodologyView. Add a short section 'Planning and sustainability references' that lists `references` (title, source, 'Indicative summary') with REQUIREMENTS_NOTE, and the line 'Local authority entries name the adopted plan to check; they do not summarise every policy.'

---

### I. Seed (`src/domain/seed/world.ts`, shared). Reference dates, before the shift.

All three projects get `projectTypeOther: ''`.

| Project | stageStarts | siteStart | practicalCompletion | requirements |
|---|---|---|---|---|
| Merrowgate Wharf (stage 2, materials 2028-04-03) | 2025-09-01, 2025-12-01, 2026-06-01, 2026-11-02, 2027-02-01 | 2027-11-01 | 2029-06-29 | nppf, adl, nzcbs, breeam-nc, lp-si2, lp-si7, lp-d3, gla-wlc, gla-ces, la-newham |
| Sallow Court (stage 1, materials 2028-01-10) | 2026-05-04, 2026-08-03, 2026-12-07, 2027-04-05, 2027-08-02 | 2027-11-01 | 2029-03-30 | nppf, breeam-nc, lp-si2, lp-si7, gla-ces, la-camden-cc1, la-camden-cpg |
| Ferrymoor Yard (stage 3, materials 2027-06-07) | 2025-06-02, 2025-08-04, 2025-11-03, 2026-04-06, 2026-11-02 | 2027-03-01 | 2028-08-25 | nppf, adl, well-v2, lp-si2, lp-si7, lp-d3, la-hackney-lp33 |

All three: `source: 'set'`, `requirementsReviewed: true`. Each seeded project's declared stage equals its planned stage on 7 October 2026, so the check reads 'On programme'.

`clientLink: { status: 'accepted', message: '', decisionNote: '' }` on each, with:
- Merrowgate: requestedOn 2025-09-01, requestedByPersonaId priya, decidedOn 2025-09-03, decidedByPersonaId isla.
- Sallow and Ferrymoor: requestedOn and decidedOn equal to their stageStarts[0], requestedByPersonaId priya, decidedByPersonaId null.

No pending request is seeded. The approval appears when Priya creates a project for Lantern Quay Developments.

---

### J. Copy (sentence case, British English, no dashes, arrows, ticks or comparison signs)

All strings are quoted in E and H.

Indicative markers appear on the programme card (dates and the check pill), the requirements card and picker, and the setup checklist's programme step text when the dates are suggested. Each links to Help, Methodology.

---

### K. Tests

**Unit, domain**

`src/domain/engines/programme.test.ts` (dates are reference values from createSeed(), not shifted):
- `programmeStages(merrowgate.programme)` gives these exact spans:
  - stage 0: 2025-09-01 to 2025-11-30
  - stage 2: 2026-06-01 to 2026-11-01
  - stage 4: 2027-02-01 to 2027-10-31
  - stage 5: 2027-11-01 to 2029-06-28
  - stage 6: 2029-06-29 to 2030-06-28
  - stage 7: from 2030-06-29, end null
- `stageOn` gives:
  - 2025-08-31: null
  - 2026-06-01: 2
  - 2027-10-31: 4
  - 2027-11-01: 5
  - 2029-06-29: 6
  - 2030-06-29: 7
- `suggestProgramme('2026-10-08', 2, '2027-11-01')` gives starts [2026-07-16, 2026-08-13, 2026-10-08, 2027-01-13, 2027-05-22] and PC 2029-04-24.
- `suggestProgramme('2026-10-08', 2, '2027-09-06')` gives starts [2026-07-16, 2026-08-13, 2026-10-08, 2026-12-30, 2027-04-20] and PC 2029-02-27.
- `suggestProgramme('2026-10-08', 0, '2026-10-12')` gives null. With '2026-10-13' it gives one day per stage: [2026-10-08, 2026-10-09, 2026-10-10, 2026-10-11, 2026-10-12].
- `suggestProgramme('2026-10-08', 4, '2027-01-04')` gives [2026-01-01, 2026-01-29, 2026-03-26, 2026-06-18, 2026-10-08].
- `suggestProgramme('2026-10-08', 5, '2026-06-01', '2027-12-17')` gives [2025-04-07, 2025-05-05, 2025-06-30, 2025-09-22, 2026-01-12].
- `validateProgramme`:
  - Equal starts give `order` on stage1.
  - starts[4] on site start gives `siteStart`.
  - PC on site start gives `completion`.
  - '2026-02-30' gives `badDate`.
  - Materials before site start gives ['startDate', materials].
  - The seeded programmes give [].
- `programmeCheck(merrowgate, 2, '2026-10-07')` is on. With declared 1 it is behind (planned 2); with 3 it is ahead; before 2025-09-01 it is not_started.
- `programmeAxis('2025-09-01', '2030-09-30')`: the labelled ticks are ['2026', '2027', '2028', '2029', '2030']. `axisAt` stays within 0 and 1. For a 12-month axis from 2026-10-01 to 2027-09-30, the first label is 'Oct 2026' and the January label is 'Jan 2027'.
- `programmeRange(merrowgate, '2026-10-07', '2028-04-03', [], 'whole')` gives { start: '2025-09-01', end: '2030-09-30' }. With 'ahead', start is '2026-10-01'.
- PROGRAMME_PARAMETER_ROWS has 7 rows, all placeholder.

`src/domain/reference/requirements.test.ts`:
- IDs are unique, and none matches the date patterns. Every entry has status 'indicative' and non-empty source and summary, and no text matches FORBIDDEN or contains a dash character.
- `requirementsFor('Inner London East', 'Hackney')` gives the levels ['national', 'london', 'local'], with the local group IDs ['la-hackney-lp33'].
- `requirementsFor('South East', 'Reading')` gives ['national', 'local'], with the local ID 'la-reading'. `requirementsFor('South East', '')` gives ['national'].
- `suggestedRequirementIds('Central London', 'Camden')` gives nppf, adl, the six London IDs, la-camden-cc1 and la-camden-cpg, and never nzcbs, breeam-nc, leed-v5 or well-v2.
- `keepApplicable(['la-camden-cc1', 'lp-si2', 'lp-si2', 'nppf'], 'Inner London East', 'Hackney')` gives ['nppf', 'lp-si2'].
- Places: 33 London authorities, each in exactly one London region; `isValidLocalAuthority('Inner London East', 'Camden')` is false; `('South East', 'St Albans')` is true; `('Mars', '')` is true.

`src/domain/reference/projectTypes.test.ts`:
- Every ProjectType has a label.
- `blindProjectType('other')` is 'other project'; `blindProjectType('mixed_use')` is 'mixed use project'.
- `projectTypeLabel({ projectType: 'other', projectTypeOther: ' Data centre ' })` is 'Data centre'; with '' it is 'Other'.

`src/domain/access.test.ts` (add): with Merrowgate's clientLink set to pending, `projectsFor(isla)` is [] and `canAccess` is false; Priya and Marcus are unchanged.

`src/domain/privacy/privacy.test.ts` (add): `toBlindBuyer` of a project with type other and free text 'Rooftop lido and spa' never contains that text.

**Store actions, `src/store/actions/projects.test.ts`**

Existing test that must change: in 'builds a full project with an empty shortlist', the single assertion `title === 'Studio Oriel added you as client'` describes behaviour this note removes. Replace it with stronger assertions:
- The notification to Lantern is titled 'Studio Oriel asked to add you as client on Corbel Yard', with href '/app/projects/requests'.
- `clientLink.status === 'pending'`.
- Corbel Yard is not in projectsOfUser(isla).

Record this in docs/DECISIONS.md as a spec change from the 14 October review. Every other existing assertion stays.

New describes:
1. createProject builds the programme: base input with today 2026-10-08 gives starts [2026-07-16, 2026-08-13, 2026-10-08, 2026-12-30, 2027-04-20], siteStart 2027-09-06, PC 2029-02-27 and source 'suggested'. requirementIds are filtered to the location. projectTypeOther is kept only for 'other'. A local authority outside the region is refused with localAuthority. Site start too soon gives tooSoon.
2. decideClientLink:
   - Isla accepts: she sees the project, Priya's org gets 'Lantern Quay Developments accepted Corbel Yard', and the activity now includes Lantern.
   - A second decision is refused with notPending; Priya, Tom and Marcus are refused with role.
   - Decline with a note: the architect notification body is 'Their note: ...' and contains no person's name.
3. requestClientLink: after a decline, asking Quillon makes Quillon's link pending. Pending to the same org gives alreadyPending. Once accepted, it gives linked.
4. sendToClient on a pending project, after saveToProject, is refused with clientNotLinked. After acceptance it succeeds.
5. setProjectProgramme: source becomes 'set'; materials outside the programme is refused; an unchanged input that is already set returns the same state; the activity says 'updated the programme'.
6. setProjectRequirements: an inapplicable ID is refused; an empty list sets reviewed true; a region change in updateProject prunes the IDs.

**Selectors, `src/store/selectors/projects-timeline.test.ts` (new; fresh() is shifted by one day)**
- `programmeView(Merrowgate, Priya, 'whole')`:
  - 8 stages, with only stage 2 'current' and stages 0 and 1 'past'.
  - Bands are contiguous: to(i) equals from(i+1) within 1e-9.
  - check.status is 'on'; plannedStageText is 'Today: stage 2, Concept Design'.
  - Milestone ids are ['site_start', 'materials', 'completion']; there are 4 material rows, each with 0 ≤ from ≤ to ≤ 1.
  - `today.at` is close to 402/1855 (start 2025-09-01, end 2030-09-30).
- `programmeView` is null for Tom; canEdit is false for Isla and Marcus.
- `projectSetup`: hidden for Merrowgate, Sallow and Ferrymoor. For a new Corbel Yard it has states programme current, client waiting, requirements todo, consultant done, shortlist todo, send waiting, with done 1 of 6. After setProjectProgramme, current is 'requirements'.
- `clientLinkRequests(Isla)` after the create: 1 pending row with architectName 'Studio Oriel'. After accept: pending is empty and answered has 1 row.
- Sidebar and routes: Isla's sidebar has 'Project requests' with badge 1 while pending, and it is gone after the answer. `routeAccess('/app/projects/requests')` is ok for Isla and forbidden for Priya and Tom. `hrefForReader` keeps the link for Isla.
- Hiding before acceptance: Jo Park (a signed-up practice, Park Studio) creates a project for 'Lantern Quay Developments'. Before Isla accepts, `projectTeam` and `projectHeader` for Jo contain neither 'Isla Brennan' nor 'isla.brennan@lanternquay.example'; after acceptance, Team lists Isla.

**Privacy, `src/test/privacy.platform.test.ts`** (shared): add `programmeView` (both ranges), `projectRequirementsView` and `clientLinkRequests` to buyerViews. Add a case where a project of type other with 'Rooftop lido and spa' and a client message never appears in any ownerViews.

**Screen tests, `src/features/projects/projects.screen.test.tsx` (new)**
- The Merrowgate overview for Priya renders `programme-chart` with 8 `[data-part=stage-band]` and the text 'Today: stage 2, Concept Design'.
- `overview-activity` starts with aria-expanded false and expands on click.
- No text matches FORBIDDEN.
- New project dialog:
  - Choosing 'Other' shows `project-type-other`.
  - With region 'Central London', `project-local-authority` offers 'Camden'.
  - Expanding requirements shows 'Policy SI 7, Reducing waste and supporting the circular economy'.
- Isla's LinkRequests page shows Accept and Decline, and its empty state appears after answering.

**E2E, `e2e/journeys.spec.ts`** (shared, one new test: 'a new project waits for the client to accept')
1. Priya opens /app/projects/new, fills `project-name` 'Corbel Yard', keeps the client Lantern Quay Developments, fills `project-start` '2027-09-06' and creates the project.
2. Expect `client-link-banner` to contain 'Waiting for Lantern Quay Developments', the `project-setup` checklist to be visible, and `programme-chart` to be visible.
3. Sign out and sign in as Isla. 'Project requests' has a badge; open it, then `accept-link-{id}`. 'Corbel Yard' appears in her sidebar, and its overview shows `programme-chart`.
4. At 390 px, the overview has no horizontal overflow.
5. Sign back in as Priya: the bell shows 'Lantern Quay Developments accepted Corbel Yard'.

The existing new-practice journey and unit journey stay green: siteStart defaults to the date they fill, and saving to a pending project is allowed.

---

### L. Out of scope here (other clusters)

- Embedding `PendingLinkRequests` in ClientHome (client cluster, one line).
- The client parallel timeline (it reads `projectProgrammeSummary`).
- Consultant requirement tracking and targets (they read `requirements.ts` and `Project.planningRequirementIds`).
- Showing stage bands on the material page TimelineStrip (marketplace cluster may pass `programmeStages` later).
- Collapsible activity on the home pages (reuse CollapsibleCard with the key 'home-activity').

## Files changed
platform/src/domain/types.ts
platform/src/domain/v1types.ts
platform/src/domain/access.ts
platform/src/domain/access.test.ts
platform/src/domain/seed/world.ts
platform/src/domain/reference/labels.ts
platform/src/domain/reference/names.ts
platform/src/domain/privacy/privateStrings.ts
platform/src/domain/privacy/privacy.test.ts
platform/src/sandbox/seed.ts
platform/src/store/types.ts
platform/src/store/app.ts
platform/src/store/access.ts
platform/src/store/act.ts
platform/src/store/actions/projects.ts
platform/src/store/actions/projects.test.ts
platform/src/store/actions/shortlist.ts
platform/src/store/actions/owner.ts
platform/src/store/selectors/project.ts
platform/src/store/selectors/arch-project.ts
platform/src/store/selectors/common.ts
platform/src/store/selectors/nav.ts
platform/src/store/selectors/notifications.ts
platform/src/store/selectors/settings.ts
platform/src/store/selectors/index.ts
platform/src/store/selectors/shortlist.ts
platform/src/app/router.tsx
platform/src/ui/index.ts
platform/src/features/projects/Overview.tsx
platform/src/features/projects/ProjectLayout.tsx
platform/src/features/projects/ProjectParts.tsx
platform/src/features/projects/NewProjectDialog.tsx
platform/src/features/projects/EditProjectDialog.tsx
platform/src/features/projects/ProjectsList.tsx
platform/src/features/projects/Team.tsx
platform/src/features/projects/Shortlist.tsx
platform/src/features/help/Help.tsx
platform/src/features/home/ClientHome.tsx
platform/src/test/privacy.platform.test.ts
platform/e2e/journeys.spec.ts

## Files new
platform/src/domain/reference/places.ts
platform/src/domain/reference/requirements.ts
platform/src/domain/reference/requirements.test.ts
platform/src/domain/reference/projectTypes.ts
platform/src/domain/reference/projectTypes.test.ts
platform/src/domain/engines/programme.ts
platform/src/domain/engines/programme.test.ts
platform/src/store/selectors/programme.ts
platform/src/store/selectors/requirements.ts
platform/src/store/selectors/projects-timeline.test.ts
platform/src/ui/ProgrammeChart.tsx
platform/src/ui/Collapsible.tsx
platform/src/features/projects/ProgrammeCard.tsx
platform/src/features/projects/ProgrammeDialog.tsx
platform/src/features/projects/RequirementsCard.tsx
platform/src/features/projects/RequirementsDialog.tsx
platform/src/features/projects/RequirementsPicker.tsx
platform/src/features/projects/SetupChecklist.tsx
platform/src/features/projects/ClientLinkBanner.tsx
platform/src/features/projects/LinkRequests.tsx
platform/src/features/projects/projects.screen.test.tsx

## Shared
platform/src/domain/types.ts (Project fields, ClientLink, ProgrammeDates; every cluster touching Project)
platform/src/domain/v1types.ts (ProjectType union)
platform/src/domain/seed/world.ts (programme, clientLink, requirements on the three seeded projects)
platform/src/domain/reference/labels.ts (PROJECT_TYPE_LABELS becomes a re-export)
platform/src/domain/reference/names.ts (allowed sources, reference places group)
platform/src/domain/privacy/privacy.test.ts (one added case)
platform/src/sandbox/seed.ts (version literal 2)
platform/src/store/types.ts (UiState.panels, DEFAULT_UI, AppData.version 2)
platform/src/store/app.ts (STATE_VERSION 2, one bump for all round-2 clusters)
platform/src/store/access.ts (projectOrgIds gates the client on the link; new buyerSideOrgIds)
platform/src/store/act.ts (bind four new actions)
platform/src/store/actions/shortlist.ts (sendToClient guard, SHORTLIST_ERRORS.clientNotLinked)
platform/src/store/actions/owner.ts (two notify audiences use buyerSideOrgIds)
platform/src/store/selectors/common.ts (projectRef typeLabel via projectTypeLabel; hrefForReader for /app/projects/requests)
platform/src/store/selectors/nav.ts (client 'Project requests' item; routeAccess for projects/requests)
platform/src/store/selectors/notifications.ts ('team' description)
platform/src/store/selectors/settings.ts (methodologyView adds programme rows and references)
platform/src/store/selectors/index.ts (export programme and requirements selectors)
platform/src/store/selectors/shortlist.ts (optional: spec sheet type label)
platform/src/app/router.tsx (projects/requests route before projects/:projectId)
platform/src/ui/index.ts (export ProgrammeChart, CollapsibleCard)
platform/src/features/help/Help.tsx (Version 2 item; methodology references section)
platform/src/features/home/ClientHome.tsx (client cluster embeds PendingLinkRequests)
platform/src/features/projects/Shortlist.tsx (ClientLinkBanner above the board)
platform/src/test/privacy.platform.test.ts (new selectors in buyerViews; owner-side free text case)
platform/e2e/journeys.spec.ts (one new journey)

## Deps


## Open questions
- One existing assertion in store/actions/projects.test.ts expects the client notification 'Studio Oriel added you as client'. That is exactly the behaviour the partner asked to remove. Can it be replaced, given P8? REC: Replace it with the stronger assertions in K: the request notification, the pending status, and the project absent from Isla's projects until she accepts. Log it in docs/DECISIONS.md as a spec change from the 14 October review. The alternative is a 'trusted practice' rule that keeps the line but lets Priya add Isla with no approval, which the partner would notice at once.
- Should a client that has already accepted one project from a practice be asked again for every later project? REC: Yes in this round, every project asks, because it is literal and easy to demonstrate. A setting such as 'Let Studio Oriel add projects without asking' can come later if clients find the requests repetitive.
- Should adding a sustainability consultant also require the consultancy's acceptance? The same abuse is possible: any architect can add any consultancy. REC: Not in this round, because the note names only clients. ClientLink is generic enough to reuse as consultantLink later; list it as a follow-up.
- The hand-written borough entries (City of London Carbon Options, Westminster retrofit first, Camden CC1 and CPG, Southwark, Hackney, Islington) are summarised from memory as at October 2026. Should someone check them before the partner sees them? REC: Keep them, marked 'Indicative summary' with REQUIREMENTS_NOTE, and ask the partner or the consultant persona's real-world counterpart to check the six named entries. Every other authority uses the generated 'local plan' entry, which makes no specific claim.
- The five London 'regions' are a product grouping used for hub distances, not official subregions. Will the borough-to-region mapping confuse users? REC: Keep the mapping, which is in places.ts and marked indicative. The local authority dropdown is the precise field, and the region only filters it. Revisit the regions if hub distances move to borough level.
- Should the material page timeline (marketplace cluster) also show the checking project's RIBA stages? REC: Optional, not required by the note, which asks for availability over the project programme on the overview. Expose programmeStages and projectProgrammeSummary so the marketplace cluster can add stage bands to TimelineStrip later without a new engine.
