# client-consultant

## Decisions
- **Developer dashboard needs cost, savings, carbon and % reuse**: The client home opens on four indicative metric tiles built from pure functions: Indicative cost (sum of package totals for approved materials, reserved and requested, plus earlier deals at their agreed material price), Saving against new (sum of the same quantity at each family's new price, minus that cost), Avoided carbon secured (earlier deals plus accepted reservations, against the sum of the projects' carbon targets) and Reuse by value (reused share of the bill of materials by value, with reused and recycled content against the 20% aim as the sub line). Every tile carries the Indicative marker.
- **BREEAM, LEED, WELL and circular economy tracking on the developer dashboard**: A Sustainability tracking table on the client home, one row per project: target rating and credits ready, targeted or at risk for BREEAM, LEED and WELL; content by value against its target plus the statement status for circular economy; requirements ready out of total. The data comes from the consultant's per-project records. Clients read these records here and do not edit them.
- **Parallel timeline across projects (RIBA stages, site start, completion)**: Programme across your projects: one shared time axis, one row per project, with stages 0 to 6 as coloured segments (done, current, ahead), site start, practical completion, materials needed from, and a line for today. A pure portfolioTimeline function works out every position. The stage dates come from the projects cluster through one adapter, programmeInput(project). A project with no programme says so and does not draw guessed bars.
- **To-do list of approvals and reviews**: The to-do list is derived and has no manual entries, so every item clears itself once it is done. Kinds: approve (sent materials, due 7 days after sending), reserve (approved and not requested), request again (the seller declined or the client withdrew), review the circular economy statement (due 14 days after it is sent) and check a requirement marked at risk. A pure rankTodos function puts overdue items first, then items by due date, then the oldest.
- **Approvals need financial metrics**: Each material waiting for a decision gets a cost panel with the indicative package total if approved, the same new, the saving, and storage months and hub, all from estimateForListing. The page opens with a strip of totals: waiting, approved, and avoided carbon if you approve. Decided rows show their package total and saving. Clients still see the guide price, as the marketplace cluster decided.
- **Reservations need financial metrics and a carbon summary**: The Reservations page opens with two summary cards. Cost shows package totals and the saving against new for Reserved, With the seller and To request. Carbon shows avoided carbon and mass for the same three groups, plus the project's secured carbon (earlier deals and reserved) against its carbon target. Each reservation card gains an avoided carbon row with its share of new and its band.
- **Track planning and sustainability requirements per borough and region across the software**: A new Requirements tab on every project for the architect (read only), the client and the consultant (both can edit). It lists the requirements that apply to the project, from the projects cluster's reference dataset, each with a status (Not started, In progress, At risk, Evidence ready, Not applicable), an evidence log (a note, optionally linked to an output from Tallyard, with who added it and when) and a 'Held in Tallyard' list of live figures. The same roll-up appears on the Sustainability tab and the client home. A requirement marked at risk or evidence ready notifies the other side.
- **Consultant view should differ from the others**: Only consultants get the Goals and targets, Certification, Circular economy and Compliance tabs, and only they can edit targets, credits and the statement. Architects and clients get the shared Sustainability tab (read only) and Requirements. Clients review the statement from their Sustainability tab.
- **Goals and targets tab with default targets from the requirements, overridable per project**: Eight goals in a reference table (content by value, reuse by value, avoided carbon, upfront carbon A1 to A5, C&D waste diversion, BREEAM, LEED and WELL levels). A goal's default comes from a requirement that applies to the project, with its basis and status (published or indicative). The consultant can override it, mark it not targeted, or reset it, and for goals Tallyard cannot measure the consultant enters the result with a date and a source. effectiveTargets(state, projectId) is exported for the dashboards cluster. The seeded Project.targets become seeded overrides.
- **Auto-written circular economy statement, editable and exportable**: A pure statementSections(input) writes eight sections from the project's records: context, approach, reclaimed materials, content by value, carbon, targets, certification and next steps. The consultant can edit any section. An edit stores the generated text it replaced, so the page can say when the figures have moved on since, and the consultant can use the updated text or keep their own. The statement exports to Word (.docx, built with jszip from pure XML parts), prints to A4 PDF and copies as text. The workflow runs from draft, to sent to the client for review, to reviewed. Editing after a review returns it to draft.
- **Carbon tab becomes a wider Sustainability tab**: The Carbon tab is renamed Sustainability for every side at /app/projects/:id/sustainability, and /carbon redirects there so stored links and the existing e2e keep working. The tab keeps the carbon by status and by typology (still with test id project-carbon) and adds secured metrics, target meters, a certification snapshot per scheme, a requirements roll-up and the statement card. It never shows money to architects or consultants.
- **Certification mapping should be interactive**: A Certification tab for the consultant, with scheme tabs for BREEAM, LEED, WELL and Circular economy. Each credit or measure has a Targeted switch, a status, a suggested status with its reason (from content by value, the items mapped to it and the statement status), the metrics Tallyard provides, a checklist of mapped materials with rule-based defaults that the consultant can override, and a note. A By material view shows the same mapping as a grid of materials against targeted credits. Every summary is marked indicative and is not certification advice.
- **A one-project client cannot show a parallel timeline**: The sandbox adds a second Lantern Quay project, Kilnworth Place (residential, Tower Hamlets, RIBA stage 4, site start in about four months), with a new fictional architect, Tessaly Architects, which has no sample user, and no consultant appointed yet. It is added in src/sandbox (referenceWorld), not in the domain seed, so the domain seed and access tests do not change, and Priya's and Marcus's workspaces stay the same.
- **New persisted records**: AppData gains sustainability: Record<projectId, ProjectSustainability> (goals, actuals, requirements, credits, statement), on the pattern of specs. We recommend that the foundation agent raise STATE_VERSION to 2, because several clusters add store keys and an older sandbox would otherwise merge in undefined keys. Selectors also read the record defensively.

## Spec
# 14.5 Developer and sustainability consultant views

This section answers the review notes under "Developer and sustainability consultant views". Read it with BRIEF sections 6 and 9 and the rules P1 to P9. Everything here keeps P2 (every figure comes from a pure, tested function in `src/domain` or `src/store`), P3 (buyer-side data comes only through `listingOf` and `toPublicListing`, and owners never see these records), P4 (Indicative markers), P6 (copy) and P7 (one clock: actions read `actor.now`, selectors read `viewer.now`).

## 0. Contracts consumed from other clusters (reconcile in the foundation step)

| Id | From | What this design reads | Fallback until it exists |
|---|---|---|---|
| C1 | projects-timeline: `src/domain/reference/requirements.ts` | `type PolicyRequirement = { id: string; title: string; source: string; summary: string; scope: 'national' \| 'london' \| 'borough'; area: string \| null; status: ReferenceStatus }`, a lookup `requirementById(id)`, and the project's applicable list (`project.requirementIds` chosen by the architect, else the candidates from `requirementsFor(project)`) | `[]`: the Requirements tab shows its empty state and goals have no defaults |
| C2 | projects-timeline: the requirement ids used for goal defaults | `london-plan-si7` (Circular Economy Statement), `london-plan-si2` (whole life-cycle carbon), `borough-breeam` (borough BREEAM policy for major non-residential schemes) | A reference test fails until the ids exist, so the mismatch cannot pass unnoticed. Only `GOAL_DEFAULTS` changes if the ids differ. |
| C3 | projects-timeline: the programme | `stageWindows(project): { stage: number; start: string; end: string }[]`, `project.programme.siteStart: string \| null` and `project.programme.practicalCompletion: string \| null` | No stage segments; the row shows "Programme not set" and only the "materials needed from" marker (`project.startDate`) |
| C4 | shell-dashboards: `src/ui/charts/*`, `src/ui/CollapsiblePanel.tsx`, `src/ui/Thumbnails.tsx`, `src/features/home/ActivityPanel.tsx`, `src/store/selectors/dashboard.ts` | MetricGrid, MetricTile, Donut, ProgressRing, BarList, TargetMeter, Legend, RibaStageStrip, ProjectThumbnail, ActivityPanel (`panelId 'home-activity-client'`), `thumbsOf`, and the project sketch helper used by the architect home | Plain Card and Stat |
| C5 | marketplace-material | Clients keep the guide price and seller details; consultants and architects lose them. `ListingCard.availabilityShort` | None needed |

Only one adapter reads each contract: `applicableRequirements(project)` in `src/store/sustainabilityRecord.ts` (C1), and `programmeInput(project)` in `src/store/selectors/portfolio.ts` (C3).

## 1. Data model

### 1.1 `src/store/types.ts` (shared file, additions only)

```ts
export const NOTIFICATION_KINDS = [ /* existing */, 'sustainability'] as const

/** One status vocabulary for requirements and certification credits. */
export type TrackStatus = 'not_started' | 'in_progress' | 'at_risk' | 'evidence_ready' | 'not_applicable'

/** Outputs held in Tallyard that a person can cite as evidence. */
export type OutputRef = 'compliance_workbook' | 'ce_statement' | 'specification' | 'sustainability' | 'certification'

export type Evidence = {
  id: string
  text: string
  output: OutputRef | null
  addedByUserId: string
  /** The name at the time, so the log reads the same if the person later leaves. */
  addedBy: string
  addedAt: string
}

export type RequirementTrack = { requirementId: string; status: TrackStatus; evidence: Evidence[]; updatedAt: string | null; updatedByUserId: string | null }

export type GoalId = 'content_by_value' | 'reuse_by_value' | 'avoided_carbon' | 'upfront_carbon' | 'cd_diversion' | 'breeam' | 'leed' | 'well'
/** A number for measured goals (a ratio from 0 to 1, tCO2e, or kgCO2e per m2), a level name for ratings. */
export type GoalValue = number | string

/** The consultant's override. value null means "not targeted on this project". */
export type GoalOverride = { goalId: GoalId; value: GoalValue | null; note: string; setByUserId: string; setAt: string }

/** A result the consultant enters for a goal Tallyard cannot measure. */
export type GoalActual = { goalId: GoalId; value: GoalValue; asOf: string; source: string; enteredByUserId: string; enteredAt: string }

export type CreditTrack = {
  creditId: string
  targeted: boolean
  status: TrackStatus
  note: string
  /** publicId to included, only where the consultant overrode the rule-based default. */
  items: Record<string, boolean>
  updatedAt: string | null
  updatedByUserId: string | null
}

export type StatementSectionId = 'context' | 'approach' | 'reuse' | 'content' | 'carbon' | 'targets' | 'certification' | 'next_steps'
/** The consultant's text for a section, with the generated text it replaced (basis), to spot later changes. */
export type StatementEdit = { text: string; basis: string; editedAt: string; editedByUserId: string }
export type StatementStatus = 'draft' | 'ready_for_review' | 'reviewed'
export type StatementDoc = {
  edits: Partial<Record<StatementSectionId, StatementEdit>>
  status: StatementStatus
  sentAt: string | null
  sentByUserId: string | null
  reviewedAt: string | null
  reviewedByUserId: string | null
  reviewNote: string | null
}

export type ProjectSustainability = {
  goals: Partial<Record<GoalId, GoalOverride>>
  actuals: Partial<Record<GoalId, GoalActual>>
  requirements: Record<string, RequirementTrack>
  credits: Record<string, CreditTrack>
  statement: StatementDoc | null
}

export type AppData = { /* existing */; sustainability: Record<string, ProjectSustainability> }
```

Note: `Requirement` in `src/domain/types.ts` is a steel member line. Everything here says `PolicyRequirement` and `requirementId` to keep the two apart.

### 1.2 Store plumbing (shared files)

- `src/store/app.ts`: add `'sustainability'` to `DATA_KEYS`, and require `!!d.sustainability` in `looksValid`. We recommend `STATE_VERSION = 2` (see open questions).
- `src/store/hooks.ts`: add `sustainability: s.sustainability` to `useData`.
- `src/sandbox/seed.ts`: set `sustainability: {}` in the initial `s`, then make the two calls in section 8.

### 1.3 `src/store/sustainabilityRecord.ts` (new)

```ts
export const EMPTY_SUSTAINABILITY: ProjectSustainability = { goals: {}, actuals: {}, requirements: {}, credits: {}, statement: null }
export function sustainabilityOf(state: AppData, projectId: string): ProjectSustainability // state.sustainability?.[projectId] ?? EMPTY
export function withSustainability(state: AppData, projectId: string, fn: (r: ProjectSustainability) => ProjectSustainability): AppData
/** C1 adapter. The project's chosen requirement ids, else the dataset's candidates; unknown ids dropped. */
export function applicableRequirements(project: Project): PolicyRequirement[]
/** True when the public ID is one of the project's earlier deals or an approved item on its shortlist. */
export function isProjectMaterial(world: World, project: Project, publicId: string): boolean
```

## 2. Reference data (new files)

### 2.1 `src/domain/reference/goals.ts`

```ts
export type GoalUnit = 'ratio' | 'tCO2e' | 'kgCO2e_m2' | 'rating'
export type GoalDef = { id: GoalId; label: string; unitLabel: string; unit: GoalUnit; direction: 'at_least' | 'at_most'; measuredBy: 'tallyard' | 'consultant'; scale: readonly string[] | null; scheme: SchemeId | null }
export type GoalDefault = { goalId: GoalId; requirementId: string; value: GoalValue | null; byType: Partial<Record<string, number>> | null; basis: string; status: ReferenceStatus }
export const GOAL_DEFS: GoalDef[]
export const GOAL_DEFAULTS: GoalDefault[]
export const RATING_SCALES = { breeam: ['Pass', 'Good', 'Very good', 'Excellent', 'Outstanding'], leed: ['Certified', 'Silver', 'Gold', 'Platinum'], well: ['Bronze', 'Silver', 'Gold', 'Platinum'] } as const
```

| id | label | unit, direction | measured by | default (requirement, value, status) |
|---|---|---|---|---|
| content_by_value | Reused and recycled content by value | ratio, at least | Tallyard, secured | london-plan-si7, 0.20, published. Basis: "Circular Economy Statement guidance (2022), paragraph 4.7.6: aim of at least 20% reused or recycled content by value" |
| reuse_by_value | Reused content by value | ratio, at least | Tallyard, secured | none |
| avoided_carbon | Upfront carbon avoided by reuse | tCO2e, at least | Tallyard, secured | none |
| upfront_carbon | Upfront carbon, modules A1 to A5 | kgCO2e per m2 GIA, at most | consultant | london-plan-si2, byType office 950, residential 850, indicative. Basis: "GLA whole life-cycle carbon guidance (2022), benchmark for modules A1 to A5. Indicative summary, check the current guidance." |
| cd_diversion | Construction and demolition waste diverted from landfill | ratio, at least | consultant | london-plan-si7, 0.95, published. Basis: "London Plan 2021 Policy SI 7: at least 95% diverted from landfill" |
| breeam | BREEAM rating | rating, at least | consultant (predicted) | borough-breeam, 'Excellent', indicative. Basis: "Local plan policy for major non-residential development. Indicative summary, check the borough's policy." |
| leed | LEED certification | rating, at least | consultant (predicted) | none |
| well | WELL certification | rating, at least | consultant (predicted) | none |

### 2.2 `src/domain/reference/certification.ts`

```ts
export type SchemeId = 'breeam' | 'leed' | 'well' | 'circular'
export type ItemRule = 'all_reused' | 'steel' | 'pre_1970_or_untested' | 'none'
export type CreditEvidence = 'reused_items' | 'content_by_value' | 'avoided_carbon' | 'carbon_factors' | 'hazard_screening' | 'waste_reporting' | 'statement' | 'specification'
export type SchemeDef = { id: SchemeId; label: string; version: string; ratingGoal: GoalId | null }
export type CreditDef = { id: string; scheme: SchemeId; code: string; title: string; summary: string; provides: string; evidence: CreditEvidence[]; itemRule: ItemRule; defaultTargeted: boolean }
export const SCHEMES: SchemeDef[]
export const CREDITS: CreditDef[]
```

Schemes: BREEAM, "New Construction Version 7 series", ratingGoal breeam. LEED, "v5, Building Design and Construction", ratingGoal leed. WELL, "WELL v2", ratingGoal well. Circular economy, "London Plan 2021 Policy SI 7 and the Circular Economy Statement guidance (2022)", ratingGoal null.

Credits. Every summary is an indicative summary to check; the wording follows the existing `CERTIFICATION_ROWS`.

| id | scheme | code | title | provides | evidence | itemRule | defaultTargeted |
|---|---|---|---|---|---|---|---|
| breeam-mat01 | breeam | Mat 01 | Building life cycle assessment | Carbon factors and avoided carbon for the reclaimed items, as an input to the assessment, which is done elsewhere | carbon_factors, avoided_carbon | all_reused | true |
| breeam-mat03 | breeam | Mat 03 | Responsible sourcing of construction products | Source type, era and testing status of each reclaimed item, from the public listing | reused_items | all_reused | true |
| breeam-mat05 | breeam | Mat 05 | Material efficiency: reuse of materials | The reused items and their quantities | reused_items | all_reused | true |
| breeam-wst01 | breeam | Wst 01 | Construction waste management | Nothing yet: diversion comes from the contractor's waste reports | waste_reporting | none | true |
| breeam-wst06 | breeam | Wst 06 | Design for disassembly and adaptability | Reclaimed steel members, which can be taken down again | reused_items | steel | false |
| leed-mr-reuse | leed | MR | Building and materials reuse | The reused items and their quantities | reused_items | all_reused | true |
| leed-mr-quantify | leed | MR prerequisite | Quantify and assess embodied carbon | Carbon factors for the reclaimed items, as an input only | carbon_factors | all_reused | true |
| leed-mr-reduce | leed | MR | Reduce embodied carbon | Avoided carbon against buying new, as an input only | avoided_carbon | all_reused | true |
| leed-mr-waste | leed | MR | Construction and demolition waste diversion | Nothing yet: LEED counts diversion differently | waste_reporting | none | true |
| well-x01 | well | X01 | Material restrictions (precondition) | Items built before 1970 or untested, to screen for restricted materials such as lead in coatings | hazard_screening | pre_1970_or_untested | true |
| well-x02 | well | X02 | Interior hazardous materials management (precondition) | The same items, for the hazardous materials survey | hazard_screening | pre_1970_or_untested | true |
| well-x07 | well | X07 | Materials transparency | The specification schedule from public listing fields | specification | all_reused | true |
| ce-content | circular | Bill of materials | Reused and recycled content by value, aim at least 20% | Content by value from the bill of materials | content_by_value | none | true |
| ce-reuse | circular | Reuse | Reuse of materials and components, with quantities | The reused items and their quantities | reused_items | all_reused | true |
| ce-diversion | circular | Waste | At least 95% of construction and demolition waste diverted from landfill | Nothing yet: from the contractor's waste reports | waste_reporting | none | true |
| ce-eol | circular | End of life | End-of-life strategy: design for disassembly | Reclaimed steel members, which can be taken down again | reused_items | steel | false |
| ce-statement | circular | Statement | Circular economy statement at each stage | The statement drafted in Tallyard | statement | none | true |

### 2.3 `src/domain/reference/sustainabilityCopy.ts` (fixed strings, so labels.ts is not touched)

```ts
export const CERT_CAVEAT = 'Indicative summaries of each scheme to help plan the evidence. Not certification advice. Confirm with the assessor and the current scheme manual.'
export const REQ_CAVEAT = "Indicative summaries of planning and sustainability requirements. Check the current policy and the local authority's validation list."
export const STATEMENT_CAVEAT = "Drafted from the project's records in Tallyard. Check every figure and statement before you submit it."
export const FINANCE_CAVEAT = 'Indicative. Guide prices with storage, testing and delivery from the package engine. Earlier deals count at the agreed material price. The same new is the quantity at the new price for the family.'
export const TARGET_CAVEAT = 'Default targets come from the requirements that apply to this project. They are indicative summaries to check.'
export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = { not_started: 'Not started', in_progress: 'In progress', at_risk: 'At risk', evidence_ready: 'Evidence ready', not_applicable: 'Not applicable' }
export const STATEMENT_STATUS_LABELS = { draft: 'Draft', ready_for_review: 'With the client for review', reviewed: 'Reviewed by the client' } as const
export const STATEMENT_STATUS_FOR_CLIENT = { draft: 'Being drafted', ready_for_review: 'Ready for your review', reviewed: 'Reviewed' } as const
export const OUTPUT_LABELS: Record<OutputRef, string> = { compliance_workbook: 'Compliance workbook', ce_statement: 'Circular economy statement', specification: 'Specification', sustainability: 'Sustainability summary', certification: 'Certification tracking' }
export const SCOPE_LABELS = { national: 'National', london: 'London-wide' } as const // a borough shows its area name
export const GOAL_STATUS_TEXT = { met: 'Target met', below: 'Below target', over: 'Over the limit', no_target: 'No target set', no_data: 'No result yet' } as const
```

## 3. Domain engines (new, pure, each with a test file)

### 3.1 `src/domain/engines/finance.ts`

```ts
export type FinanceStage = 'confirmed' | 'reserved' | 'requested' | 'to_request' | 'waiting'
export type FinanceLine = { key: string; stage: FinanceStage; total: number; costNew: number; avoidedT: number | null; massT: number }
export type FinanceTotals = { count: number; total: number; costNew: number; saving: number; savingPercent: number; avoidedT: number; massT: number }
export function financeTotals(lines: FinanceLine[]): FinanceTotals
export function byStage(lines: FinanceLine[]): Record<FinanceStage, FinanceTotals>
export function seededDealLine(d: SeededDeal): FinanceLine
export function reuseByValue(r: ContentResult): number
export function portfolioContent(results: ContentResult[]): { percent: number; reuse: number; totalValue: number } | null
```

Formulas:
- `total = sumPence(lines.total)`, `costNew = sumPence(lines.costNew)`, `saving = roundPence(costNew - total)`, `savingPercent = costNew > 0 ? saving / costNew : 0`, `avoidedT = sum(avoidedT ?? 0)`, `massT = sum(massT)`.
- `seededDealLine`: `total = roundPence(materialGbp)`, `costNew = roundPence(quantityUnits * FAMILIES[family].newPrice)`, stage `confirmed`.
- The package line for an approved row: `total` and `costNew` from the `ReservationEstimate` (the request's estimate while a request is open or accepted, otherwise `estimateForListing` today). Those come from `buyerPackage`: `material = units * guide`, `costNew = units * newPrice`, `total = material + testing + storage + handlingOut + outbound`.
- `reuseByValue = sum(line.valueGbp * line.s) / totalValue`, or 0 when totalValue is 0.
- `portfolioContent`: over results with `totalValue > 0`, `percent = sum(totalContribution) / sum(totalValue)` and `reuse = sum(valueGbp * s) / sum(totalValue)`; null when there are none.

Tests:
- financeTotals of (41390.59, 49734) and (9481.10, 9662.40) gives total 50871.69, costNew 59396.40, saving 8524.71 and savingPercent 0.1435223 (to 6 dp).
- financeTotals of no lines is all zeros with savingPercent 0.
- A negative saving keeps its sign: (1200, 1000) gives saving -200 and savingPercent -0.2.
- seededDealLine for deal_seed_1 gives total 91000 and costNew 234000; for deal_seed_2, 14060 and 41800.
- The four Merrowgate lines (two earlier deals, the pending request, the approved and unrequested lot, on the fixture date) give total 155931.69, costNew 335196.40 and saving 179264.71.
- reuseByValue of Merrowgate secured is 275800 / 11680600 = 0.0236118; with the approved items it is 0.0286968.
- portfolioContent of one result equals its own percent; with a zero-value result it ignores that result; with none it is null.

### 3.2 `src/domain/engines/goals.ts`

```ts
export type GoalTarget = { value: GoalValue | null; source: 'default' | 'override' | 'none'; requirementId: string | null; basis: string | null; status: ReferenceStatus | null }
export type GoalProgress = { status: 'met' | 'below' | 'no_target' | 'no_data'; share: number }
export function defaultTarget(def: GoalDef, ctx: { requirementIds: string[]; projectType: string }): GoalTarget
export function effectiveTarget(dflt: GoalTarget, override: GoalOverride | undefined): GoalTarget
export function goalProgress(def: GoalDef, target: GoalValue | null, actual: GoalValue | null): GoalProgress
export function goalValueText(def: GoalDef, v: GoalValue | null): string
export function parseGoalInput(def: GoalDef, text: string): { value: GoalValue } | { error: string }
export function sumTargets(rows: { actual: number | null; target: number | null }[]): { actual: number; target: number }
```

Rules:
- `defaultTarget` takes the first GOAL_DEFAULTS entry for the goal whose requirementId is in ctx. Its value is `byType[projectType]` when byType is set (none when the type is missing), otherwise `value`. With no match it returns `{ value: null, source: 'none' }`.
- `effectiveTarget`: an override present gives `{ value: override.value, source: 'override' }` (null value means not targeted); otherwise the default.
- `goalProgress`: target null gives no_target with share 0; actual null gives no_data with share 0. For a number at_least, share is `min(1, actual / target)` (1 when target is 0) and status is met when actual >= target. For a number at_most, status is met when actual <= target and share is `actual <= target ? 1 : target / actual`. For a rating, `i = scale.indexOf`, share is `min(1, (iA + 1) / (iT + 1))` and status is met when iA >= iT.
- `goalValueText`: ratio gives `fixed(v * 100, d) + '%'`, with d 0 when `v * 100` rounds to a whole number at 1 dp and 1 otherwise ('25%', '19.9%'). tCO2e gives `f.carbon`. kgCO2e_m2 gives `fixed(v, 0) + ' kgCO2e per m2'`. A rating is the level itself. null gives 'Not targeted'.
- `parseGoalInput`: trim, drop a trailing '%', and the empty string gives 'Enter a target, or choose not targeted.'. For ratio, a number from 0 to 100 is divided by 100 (error 'Enter a percentage from 0 to 100.'). For tCO2e, a number from 0 to 1,000,000 (error 'Enter a number of tonnes, 0 or more.'). For kgCO2e_m2, a number above 0 and up to 5000 (error 'Enter kgCO2e per m2, more than 0.'). For a rating, a member of the scale (error 'Choose a level.'). Thousands commas are accepted.
- `sumTargets`: over rows with target > 0, sum the actual (null counts as 0) and the target.

Tests:
- goalProgress content at least: 0.1991 against 0.25 is below with share 0.7964.
- At most: 820 against 950 is met with share 1; 1000 against 950 is below with share 0.95.
- Rating: 'Very good' against 'Excellent' is below with share 0.75; 'Outstanding' against 'Excellent' is met with share 1.
- No target gives no_target; no actual gives no_data.
- defaultTarget upfront_carbon: office with london-plan-si2 gives 950; residential gives 850; hotel gives none; without the requirement gives none.
- An override with null gives 'Not targeted'.
- parseGoalInput: '25' and '25%' give 0.25; '120' and '' give errors; '1,500' tCO2e gives 1500; 'Gold' for leed is valid; 'Excellent' for leed is an error.
- goalValueText: 0.25 gives '25%' and 0.19910 gives '19.9%'.

### 3.3 `src/domain/engines/certification.ts`

```ts
export type MappedItem = { publicId: string; description: string; family: FamilyId; status: 'Confirmed' | 'Reserved' | 'Approved'; eraBand: EraBand | null; testStatus: TestStatus | null }
export type CreditMetrics = { hasBill: boolean; contentSecured: number; contentWithApproved: number; aim: number; avoidedSecuredT: number; statement: StatementStatus | null }
export function defaultIncluded(rule: ItemRule, item: MappedItem): boolean
export function creditItems(def: CreditDef, items: MappedItem[], overrides: Record<string, boolean>): { item: MappedItem; included: boolean; byDefault: boolean }[]
export function defaultTargeted(def: CreditDef, schemeTargeted: boolean): boolean
export function suggestedStatus(def: CreditDef, m: CreditMetrics, included: MappedItem[]): { status: TrackStatus; reason: string } | null
export function schemeCounts(rows: { targeted: boolean; status: TrackStatus }[]): { targeted: number; counts: Record<TrackStatus, number>; ready: number; atRisk: number }
```

Rules:
- defaultIncluded: all_reused is true; steel is `family === 'steel_section'`; pre_1970_or_untested is `eraBand === 'before 1970' || testStatus === 'untested'`; none is false. A rule of none returns no items at all.
- schemeTargeted: for BREEAM, LEED and WELL, the effective rating goal is not null. For circular, the content_by_value goal is not null, or london-plan-si7 applies.
- suggestedStatus:
  - content_by_value: no bill gives null. contentSecured >= aim gives evidence_ready, with the reason "Content by value {p} secured, aim {a}". contentWithApproved >= aim gives in_progress ("{p} secured, {q} with approved materials"). Anything else gives at_risk.
  - reused_items, carbon_factors, avoided_carbon: any included item with status Confirmed or Reserved gives in_progress ("{n} secured items mapped"). Approved items only also give in_progress ("{n} approved items, none secured yet"). None gives not_started.
  - hazard_screening: one or more included items gives at_risk ("{n} items to screen: built before 1970 or untested"); none gives null.
  - statement: reviewed gives evidence_ready, ready_for_review or draft gives in_progress, and none gives not_started.
  - waste_reporting and specification give null.
- schemeCounts: the counts cover targeted rows only, with ready meaning evidence_ready and atRisk meaning at_risk.

Tests:
- All four rules against items for TH-02 (steel, untested, era unknown), OS-11 (steel, tested, 1970 or later) and stone (inspected).
- An override false drops an item that is included by default, and an override true adds an excluded one.
- ce-content on Merrowgate secured 0.1991, with approved 0.2029 and aim 0.20 gives in_progress; 0.20 and 0.20 gives evidence_ready; 0.15 and 0.16 gives at_risk; no bill gives null.
- well-x01 with TH-02 mapped gives at_risk.
- schemeCounts ignores rows that are not targeted.

### 3.4 `src/domain/engines/tracker.ts`

```ts
export type TrackerSummary = { total: number; ready: number; atRisk: number; inProgress: number; notStarted: number; notApplicable: number; share: number }
export function trackerSummary(statuses: TrackStatus[]): TrackerSummary
// total excludes not_applicable; share = total > 0 ? ready / total : 0
export type TodoKind = 'approve' | 'reserve' | 'request_again' | 'review_statement' | 'requirement_at_risk'
export type Todo = { id: string; kind: TodoKind; title: string; detail: string; projectId: string; projectName: string; href: string; since: string | null; due: string | null }
export type RankedTodo = Todo & { overdue: boolean; ageDays: number | null; whenText: string }
export const APPROVAL_DUE_DAYS = 7 // equals the dashboards cluster's STALE_SENT_DAYS
export const REVIEW_DUE_DAYS = 14
export function rankTodos(todos: Todo[], today: string): RankedTodo[]
```

rankTodos:
- `overdue = due !== null && daysBetween(due, today) > 0`.
- `ageDays = since ? daysBetween(since, today) : null`.
- whenText: overdue gives 'Overdue by 1 day' or 'Overdue by {n} days'. A due date gives 'Due today', 'Due tomorrow' or 'Due in {n} days'. Otherwise the age gives 'Today', 'Yesterday' or '{n} days ago', and nothing gives ''.
- Order: overdue first (most overdue first), then by due date ascending, then items without a due date by since ascending, then by title (en-GB).

Tests:
- trackerSummary of [evidence_ready, at_risk, not_started, not_applicable, in_progress] gives total 4, ready 1 and share 0.25. Of none, all zeros.
- rankTodos with due dates of today minus 2, today plus 3, null with since today minus 5, and null with since today minus 1 comes out in that order. whenText reads 'Overdue by 2 days', 'Due in 3 days', '5 days ago' and 'Yesterday'.

### 3.5 `src/domain/engines/portfolio.ts`

```ts
export type ProgrammeInput = { id: string; name: string; stages: { stage: number; start: string; end: string }[]; siteStart: string | null; completion: string | null; materialsFrom: string }
export type PortfolioTimeline = {
  start: string; end: string; spanDays: number; today: number
  ticks: { iso: string; at: number; label: string | null }[]
  rows: { id: string; name: string; segments: { stage: number; from: number; to: number; state: 'done' | 'current' | 'ahead' }[]; siteStart: number | null; completion: number | null; materialsFrom: number; currentStage: number | null; hasProgramme: boolean }[]
}
export const PORTFOLIO_MARGIN_DAYS = 90
export function portfolioTimeline(rows: ProgrammeInput[], today: string): PortfolioTimeline
```

Formulas:
- Only stages 0 to 6 are drawn.
- `lo` is the minimum of today, every stage start, siteStart, completion and materialsFrom.
- `hi` is the maximum of today, siteStart, completion, materialsFrom and the end of each stage up to 5.
- `start` is the first day of lo's month. `end = monthWindow(addDays(hi, 90)).end`. `spanDays = max(1, daysBetween(start, end))`. `at(d) = clamp(daysBetween(start, d) / spanDays, 0, 1)`.
- A segment state is done when `end < today`, current when `start <= today <= end`, and ahead otherwise. currentStage is the stage of the current segment, or null.
- Ticks come from `monthStarts(start, end)` (timelineScale.ts) with the same labelling rule: every month up to 12, quarters up to 36, then Januaries; the first label and each January read 'Jan 2027'.
- hasProgramme is `stages.length > 0`.

Test: today 2026-10-07 and one row with stage 4 from 2026-04-27 to 2027-01-29, site start 2027-02-01, completion 2028-06-30 and materials from 2027-02-15 gives start 2026-04-01, end 2028-09-30 and spanDays 913. today is 0.20701, siteStart 0.33516, completion 0.89923, and the segment runs from 0.02848 to 0.33187 as current, with currentStage 4. A row with no stages has hasProgramme false and only materialsFrom. Two rows share one scale.

### 3.6 `src/domain/engines/statement.ts`

```ts
export type StatementInput = {
  projectName: string; clientName: string; architectName: string; consultantName: string; typeLabel: string; giaM2: number
  localAuthority: string; region: string; stageText: string; requirementTitles: string[]
  hasBill: boolean; contentSecured: number; contentWithApproved: number; contentWithoutReuse: number; aim: number; contentTarget: number | null
  avoidedSecuredT: number; avoidedApprovedT: number; carbonTargetT: number | null
  items: { publicId: string; description: string; quantityLabel: string; family: FamilyId; status: 'Confirmed' | 'Reserved' | 'Approved' }[]
  targets: { label: string; targetText: string; actualText: string; statusText: string }[]
  credits: { schemeLabel: string; code: string; title: string; statusLabel: string }[]
}
export const STATEMENT_SECTIONS: { id: StatementSectionId; heading: string }[]
export function statementSections(i: StatementInput): { id: StatementSectionId; heading: string; text: string }[]
export function isStale(edit: StatementEdit | undefined, generated: string): boolean // !!edit && edit.basis !== generated
export function statementPlainText(title: string, subtitle: string, sections: { heading: string; text: string }[], caveat: string): string
```

The headings, in order: Project and policy context; Strategic approach; Reclaimed materials; Reused and recycled content by value; Upfront carbon avoided; Targets and commitments; Certification; Next steps. Text uses "\n" between paragraphs. No date appears inside a section, so the generated text only changes when the data does.

- context: "{projectName} is a {typeLabel lower} scheme of {fixed(gia,0)} m2 GIA in {localAuthority}, {region}, at {stageText}. The client is {clientName} and the architect is {architectName}. This statement follows London Plan 2021 Policy SI 7 and the Circular Economy Statement guidance (2022) and covers the reclaimed materials recorded in Tallyard." Add, when there are requirements: "\nThe requirements recorded for this project are {listJoin(requirementTitles)}." Then add "\n" + LABELS.L16.
- approach, with items: "The design team follows the circular economy hierarchy: keep materials in use at their highest value, reuse before recycling, and design out waste. Reclaimed {listJoin(distinct family labels, lower case, plural)} have been chosen for this scheme, checked against the programme and, for structural steel, against testing before specification." With no items: "No reclaimed materials are on record yet. The design team will look for reclaimed structure, envelope and finishes as the design develops."
- reuse: "{n} reclaimed {material or materials} on record: {s} secured through earlier deals or reservations, and {a} approved by the client and not yet reserved." Then one line per item, "{publicId}, {description}, {quantityLabel}: {status lower}." With none: "None yet."
- content, with a bill: "Reused and recycled content by value is {percent2(secured)} with what is secured and {percent2(withApproved)} with the approved materials. Without reuse it would be {percent2(withoutReuse)}. The guidance aims for at least {goalValueText(aim)}" followed by "; this project targets at least {t}" when the target differs from the aim, then ".", then "\n" + LABELS.L15. Without a bill: "The bill of materials is not yet on record, so content by value cannot be worked out."
- carbon: "Reusing the secured materials avoids an estimated {carbon(secured)} of upfront carbon against buying new, and {carbon(secured + approved)} with the approved materials." Add " The project target is {carbon(target)}." when there is one, then "\n" + LABELS.L11.
- targets: one line per row, "{label}: target {targetText}, now {actualText}, {statusText lower}." With none: "No targets are set yet."
- certification: "Credits and measures targeted:" followed by a line per credit, "{schemeLabel} {code}, {title}: {statusLabel lower}." With none: "No certification credits are targeted yet." Then "\n" + CERT_CAVEAT.
- next_steps: "The statement is updated at each stage:" followed by one line per STAGE_CHECKLIST entry.

Tests:
- Merrowgate seeded input gives 8 sections in order. content contains '19.91%', '20.29%', '17.62%' and '25%'. carbon contains '47.8 tCO2e' and '148.6 tCO2e' (from 47.7974 plus 100.8227). reuse lists 4 items with L-R8Q33F first.
- A project with no items and no bill gives the two "not yet" texts.
- No section matches FORBIDDEN, and none contains a date.
- isStale is true after the data changes and false with no edit.

### 3.7 `src/domain/engines/statementDocx.ts`

```ts
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export type DocxInput = { title: string; subtitle: string; sections: { heading: string; text: string }[]; footer: string }
export function xmlEscape(s: string): string // & < > " '
export function docxParts(i: DocxInput): Record<string, string>
```

The keys are exactly `[Content_Types].xml`, `_rels/.rels`, `word/document.xml` and `word/styles.xml`.
- document.xml holds the title (style Title), the subtitle (Subtitle), then a Heading1 for each section and one `w:p` per non-empty line, with runs of `<w:t xml:space="preserve">`, and the footer in italics. sectPr is A4 (`w:w="11906" w:h="16838"`) with 1134 twip margins.
- styles.xml defines Normal (Arial 11 pt), Title, Subtitle and Heading1.

Tests:
- The four keys are present.
- 'Smith & Co <x>' is escaped.
- The paragraph count equals 2, plus the sections, plus the non-empty lines, plus 1.
- The A4 size is present, and no part matches FORBIDDEN.

## 4. Store actions: `src/store/actions/sustainability.ts` (new) and `sustainability.test.ts`

The errors live in `SUSTAINABILITY_ERRORS`:

| key | message |
|---|---|
| noGoal | That target could not be found. |
| measured | Tallyard works this figure out from the project. It cannot be entered. |
| noRequirement | That requirement does not apply to this project. |
| noCredit | That credit could not be found. |
| notTargeted | Target this credit before you set its status. |
| noMaterial | That material is not on this project. |
| emptyEvidence | Add a note or choose an output. |
| noEvidence | That evidence could not be found. |
| notAuthor | Only the person who added this evidence can remove it. |
| notSent | The statement has not been sent for review. |
| noSection | That section could not be found. |
| badDate | Enter a date on or before today. |
| noSource | Say where the result comes from. |

Every action:
- returns a new state, or `ok(state)` unchanged when nothing changes;
- fails with `ERRORS.noProject` for an unknown project;
- fails with `ERRORS.role` for the wrong side (see the access column);
- logs activity to `projectOrgIds(p)` with `href` on the consultant's page (hrefForReader maps it for other readers);
- trims free text with `clean`.

| action (state, actor, ...) | access | effect | activity text | notification (kind 'sustainability') |
|---|---|---|---|---|
| setGoalTarget(projectId, goalId, value: GoalValue \| null, note) | consultant | goals[goalId] = override (value validated: ratio 0..1, tCO2e 0..1e6, kg 0..5000, rating in scale) | "set the target for {label lower} to {goalValueText}" or "marked {label lower} as not targeted" | client org: title "New target on {project}", body "{actor}, {org}: {label} {valueText}." href `/app/projects/{id}/sustainability` |
| resetGoalTarget(projectId, goalId) | consultant | delete goals[goalId] | "reset the target for {label lower} to the default" | none |
| setGoalActual(projectId, goalId, value, asOf, source) | consultant; only measuredBy consultant | actuals[goalId]; asOf must be an ISO date on or before today; source required | "recorded {label lower}: {valueText}" | none |
| clearGoalActual(projectId, goalId) | consultant | delete | none | none |
| setRequirementStatus(projectId, requirementId, status) | client or consultant | requirements[id].status, updatedAt and updatedByUserId | "marked {title} as {status label lower}" | to whichever of client and consultant is not the actor's org, when the status becomes at_risk or evidence_ready: "{title} is {status lower} on {project}", href `/requirements` |
| addRequirementEvidence(projectId, requirementId, { text, output }) | client or consultant | appends Evidence (minted id `evd`); text or output required; a status of not_started moves to in_progress | "added evidence to {title}" | none |
| removeRequirementEvidence(projectId, requirementId, evidenceId) | the person who added it | remove | none | none |
| setCreditTargeted(projectId, creditId, targeted) | consultant | credits[id].targeted; untargeting keeps the status | "now targets {scheme} {code}" or "no longer targets {scheme} {code}" | none |
| setCreditStatus(projectId, creditId, status) | consultant; credit must be targeted; not_applicable refused | status | "marked {scheme} {code} as {status lower}" | client org when at_risk: "{scheme} {code} is at risk on {project}" |
| setCreditNote(projectId, creditId, note) | consultant | note (max 1000) | none | none |
| setCreditItem(projectId, creditId, publicId, included) | consultant; isProjectMaterial | items[publicId] = included; when it equals the rule default the key is deleted | none | none |
| editStatementSection(projectId, sectionId, text, basis) | consultant | edits[sectionId] = { text, basis, editedAt, editedByUserId }; an empty text deletes the edit; status ready_for_review or reviewed returns to draft | none (too granular) | none |
| resetStatementSection(projectId, sectionId) | consultant | delete edits[sectionId]; status returns to draft as above | none | none |
| sendStatementForReview(projectId) | consultant; project must have a client | status ready_for_review, sentAt, sentByUserId; when already ready_for_review, ok unchanged | "sent the circular economy statement to {client} for review" | client: title "Circular economy statement ready for review", body "{project}. Sent by {actor}, {org}." href `/app/projects/{id}/sustainability#statement` |
| reviewStatement(projectId, note) | client; status must be ready_for_review | status reviewed, reviewedAt, reviewedByUserId, reviewNote | "reviewed the circular economy statement" | consultant org: "{client org} reviewed the circular economy statement", body the note or "No comments." href `/statement` |

Credit records that do not exist yet are created as `{ creditId, targeted: defaultTargeted(def, schemeTargeted), status: 'not_started', note: '', items: {}, updatedAt: null, updatedByUserId: null }` before the change is applied, so a first toggle does what the screen shows.

`src/store/act.ts` (shared) binds each action: `setGoalTarget, resetGoalTarget, setGoalActual, clearGoalActual, setRequirementStatus, addRequirementEvidence, removeRequirementEvidence, setCreditTargeted, setCreditStatus, setCreditNote, setCreditItem, editStatementSection, resetStatementSection, sendStatementForReview, reviewStatement`.

Action tests, using fixtures `fresh()` and `U`:
- Each action is refused for an owner, a surveyor and the wrong side, and changes nothing.
- setGoalTarget by Marcus logs to the three Merrowgate organisations and notifies Lantern only. A ratio of 1.2 is refused.
- setGoalActual on content_by_value is refused with `measured`. asOf tomorrow is refused.
- setRequirementStatus by Isla to at_risk notifies Halewick and not Lantern; by Marcus it notifies Lantern. The same status twice returns the same state.
- addRequirementEvidence with neither text nor output is refused. The first evidence moves not_started to in_progress. Removal by another person is refused.
- setCreditStatus on an untargeted credit is refused. setCreditItem with 'L-9F4CQQ' (not on Merrowgate) is refused. Setting an item back to its default deletes the override.
- sendStatementForReview then reviewStatement: the to-do and notification appear for Lantern, then the notification for Halewick. reviewStatement on a draft is refused. editStatementSection after a review sets the status to draft.
- No action writes anything addressed to Ostlea Estates or Tarnbrook (owner and surveyor).

## 5. Selectors (view models)

### 5.1 `src/store/selectors/consultant.ts` (changed)

Lift the body of `complianceView` into a side-agnostic function. `complianceView` keeps its type and behaviour but builds on it, and its `targets` field now comes from `effectiveTargets`.

```ts
export type ProjectMetrics = { hasBill: boolean; secured: ContentResult; withApproved: ContentResult; aim: number; reuseSecured: number; reuseWithApproved: number; avoidedSecuredT: number; avoidedApprovedT: number; reclaimedSecuredT: number; items: (ReusedItem & { family: FamilyId; eraBand: EraBand | null; testStatus: TestStatus | null })[] }
export function projectMetrics(state: AppData, viewer: Viewer, projectId: string): ProjectMetrics | null // any project side
```

`avoidedApprovedT` counts approved, unreserved items only. The family, era and testing fields come from `listingOf` for a lot that exists, else the seeded deal's family with nulls.

### 5.2 `src/store/selectors/sustainability.ts` (new)

```ts
export function effectiveTargets(state: AppData, projectId: string): { contentByValue: number; avoidedCarbonT: number } // 0 when not targeted; for home-consultant.ts
export type GoalRow = { id: GoalId; label: string; unitLabel: string; direction: 'at_least' | 'at_most'; measuredBy: 'tallyard' | 'consultant'; scale: readonly string[] | null
  defaultText: string; defaultBasis: string | null; defaultStatus: ReferenceStatus | null
  target: GoalValue | null; targetText: string; source: 'default' | 'override' | 'none'; overrideNote: string | null; overriddenText: string | null // "Set by Marcus Lindqvist on 29 Aug 2026"
  actual: GoalValue | null; actualText: string; actualNote: string | null // "Secured, worked out by Tallyard" or "18 Sep 2026, Stage 2 life cycle assessment"
  progress: GoalProgress; share: number; statusText: string; tone: 'brand' | 'warning' | 'neutral'; indicative: boolean; canEdit: boolean; canEnterActual: boolean }
export function goalRows(state, viewer, projectId): GoalRow[] | null // architect, client, consultant
export type GoalsView = { header: ProjectHeader; rows: GoalRow[]; requirements: { id: string; title: string }[]; caveat: string }
export function goalsView(state, viewer, projectId): GoalsView | null // consultant only

export type SchemeSummaryView = { scheme: SchemeId; label: string; version: string; ratingTarget: string | null; ratingPredicted: string | null; targeted: number; ready: number; atRisk: number; counts: Record<TrackStatus, number>; tone: 'brand' | 'info' | 'warning' | 'neutral' }
export function certificationSummary(state, viewer, projectId): SchemeSummaryView[] | null // any side
export type CreditRow = { id: string; scheme: SchemeId; code: string; title: string; summary: string; provides: string; targeted: boolean; status: TrackStatus; statusLabel: string; note: string
  suggested: { status: TrackStatus; label: string; reason: string } | null; metrics: { label: string; value: string }[]
  items: { publicId: string; description: string; status: string; included: boolean; byDefault: boolean }[]; updatedText: string | null }
export type CertificationView = { header: ProjectHeader; scheme: SchemeId; schemes: SchemeSummaryView[]; credits: CreditRow[]
  matrix: { items: { publicId: string; description: string; status: string }[]; credits: { id: string; label: string }[]; included: Record<string, boolean> /* `${creditId}:${publicId}` */ }; caveat: string; empty: boolean }
export function certificationView(state, viewer, projectId, scheme: SchemeId): CertificationView | null // consultant only

export type RequirementRow = { id: string; title: string; scopeLabel: string; source: string; summary: string; status: TrackStatus; statusLabel: string
  evidence: { id: string; text: string; outputLabel: string | null; outputHref: string | null; by: string; onText: string; canRemove: boolean }[]
  heldInTallyard: { label: string; value: string; href: string | null }[]; updatedText: string | null }
export type RequirementsView = { header: ProjectHeader; rows: RequirementRow[]; summary: TrackerSummary; canEdit: boolean; caveat: string; empty: boolean }
export function requirementsView(state, viewer, projectId): RequirementsView | null // architect read; client and consultant edit

export type StatementView = { header: ProjectHeader; title: string; subtitle: string; sections: { id: StatementSectionId; heading: string; text: string; generated: string; edited: boolean; stale: boolean }[]
  status: StatementStatus; statusLabel: string; sentText: string | null; reviewedText: string | null; reviewNote: string | null
  canEdit: boolean; canSend: boolean; canReview: boolean; plainText: string; docx: DocxInput; fileName: string; caveat: string }
export function statementView(state, viewer, projectId): StatementView | null // consultant edits; client reads and reviews; architect null

export type SustainabilityView = { header: ProjectHeader; side: ProjectSide
  metrics: { avoidedSecuredT: number; avoidedLiveT: number; contentSecured: number | null; reclaimedSecuredT: number; carbon: GoalRow | null; content: GoalRow | null }
  carbon: ProjectCarbon; goals: GoalRow[]; schemes: SchemeSummaryView[]
  requirements: TrackerSummary & { atRisk: { id: string; title: string }[]; href: string }
  statement: { status: StatementStatus; label: string; sentText: string | null; canReview: boolean; href: string | null } | null
  links: { targets: string | null; certification: string | null; statement: string | null; requirements: string } }
export function sustainabilityView(state, viewer, projectId): SustainabilityView | null // any project side

export type TrackingRow = { projectId: string; projectName: string; href: string; consultantName: string | null
  schemes: Record<'breeam' | 'leed' | 'well', { targetText: string; predictedText: string | null; targeted: number; ready: number; atRisk: number; tone: string }>
  circular: { content: GoalRow | null; statementLabel: string; statementTone: string }; requirements: TrackerSummary }
export function sustainabilityTracking(state, viewer, projectId): TrackingRow | null // client and consultant
```

Rules:
- The Tallyard actuals are content_by_value = `secured.percent`, reuse_by_value = `reuseSecured`, and avoided_carbon = `avoidedSecuredT`. A project without a bill gives null, and so no_data, for the two by-value goals.
- `defaultText` is "{valueText} from {requirement title}" or "No default".
- The goals shown on the Sustainability tab are those with a target or an actual.
- The `heldInTallyard` lines for a requirement are the goals whose default comes from that requirement (label, then "{actual} of {target}"), plus "Circular economy statement: {status}" for london-plan-si7.
- outputHref by side:
  - compliance_workbook links to consultant `/compliance`.
  - ce_statement links to consultant `/statement` and client `/sustainability#statement`.
  - specification links to architect and client `/specification`.
  - sustainability links to all sides.
  - certification links to consultant `/certification`, and to `/sustainability` for the others.
  - In every other case it is null.
- statementView's `fileName` is `${slug(project)}-circular-economy-statement-${today}.docx`.
- No view model for the architect or the consultant holds a '£' figure.

### 5.3 `src/store/selectors/client.ts` (changed)

```ts
export type CostView = { total: number; costNew: number; saving: number; savingPercent: number; savingText: string; storageMonths: number; facilityName: string; testing: boolean; lines: CostLine[] }
ApprovalCard = ShortlistRow & { card: ListingCard; cost: CostView } // the live estimate, or the request's estimate when one is open or accepted
ApprovalsView += { finance: { waiting: FinanceTotals; approved: FinanceTotals }; caveat: string }
ReservationRow += { carbon: { avoidedT: number | null; percentText: string | null; band: Band } }
ReservationsView += { summary: { cost: Record<'reserved' | 'requested' | 'to_request', FinanceTotals>; total: FinanceTotals; carbon: Record<'reserved' | 'requested' | 'to_request', FinanceTotals>; securedProjectT: number; carbonGoal: GoalRow | null }; caveat: string }
```

`percentText` is "{percent(listing.carbon.percent)} less than new". The groups are: reserved for an accepted request, requested for a pending one, and to_request when `canRequest` is true.

### 5.4 `src/store/selectors/client-dashboard.ts` (new)

```ts
export type ClientDashboard = { greeting: string; dateText: string
  metrics: { cost: { total: number; count: number; projects: number; byStage: { key: FinanceStage; label: string; total: number }[] }
    saving: { amount: number; percent: number; costNew: number; text: string; negative: boolean }
    carbon: { securedT: number; approvedT: number; targetT: number; progress: GoalProgress }
    reuse: { reuse: number | null; content: number | null; aim: number; progress: GoalProgress } }
  todos: RankedTodo[]
  programme: PortfolioTimeline & { rows: (PortfolioTimeline['rows'][number] & { href: string; stageText: string; siteStartText: string | null; completionText: string | null; materialsFromText: string })[]; todayText: string }
  tracking: TrackingRow[]
  projects: (ClientHome['projects'][number] & { costText: string | null; thumbs: ThumbMaterial[] })[]
  reservations: ClientHome['reservations']; activity: ActivityRow[] }
export function clientDashboard(state: AppData, viewer: Viewer): ClientDashboard | null
```

The cost is built from FinanceLines over all the client's projects: confirmed (seededDealLine), reserved, requested and to_request (approved rows). Waiting items are left out of the cost. The stage labels are Confirmed, Reserved, With the seller and Approved.

The carbon figures:
- `securedT` is the sum of `avoidedSecuredT`, and `approvedT` the sum of `avoidedApprovedT`.
- `targetT` and the progress come from `sumTargets` over the avoided_carbon goal rows, then `goalProgress(avoided_carbon def, sum.target or null, sum.actual)`.

The reuse figures come from `portfolioContent` over `projectMetrics`, with progress `goalProgress(content_by_value def, aim, content)`.

The to-do items, all from `rankTodos`:
- approve: from the `sent` rows, with since = sentOn and due = sentOn + 7. Title "Approve or decline {title}"; detail "{project}. Sent by {architect}"; href approvals.
- reserve: from approved rows with no open or accepted reservation, since = decidedOn. Title "Request a reservation for {title}"; detail "{project}. Approved"; href reservations.
- request_again: when the latest reservation was declined or withdrawn. Title "Choose again for {title}"; detail "{project}. The seller declined" or "You withdrew the request"; href reservations.
- review_statement: when the statement is ready_for_review, with due = sentAt + 14. Title "Review the circular economy statement"; detail "{project}. Sent by {consultant org}"; href `/sustainability#statement`.
- requirement_at_risk: one per at-risk requirement. Title "Check {title}: at risk"; detail "{project}. Marked by {name}"; href requirements.

`clientHome` stays as it is for compatibility; its seeded `stats.projects` becomes 2.

### 5.5 `src/store/selectors/portfolio.ts` (new)

```ts
export function programmeInput(project: Project): ProgrammeInput // the only C3 reader
export function clientProgramme(state, viewer): ClientDashboard['programme'] | null
```

### 5.6 `src/store/selectors/compliance-workbook.ts` (new)

`complianceWorkbook(state, viewer, projectId): ComplianceWorkbookModel & { targets: GoalRow[]; requirements: RequirementRow[]; credits: (CreditRow & { schemeLabel: string })[] }`. It is null for anyone but the consultant. `certification` is now built from the tracked credits.

### 5.7 Shared selector edits

- `src/store/selectors/project.ts` (owned by projects-timeline). `projectTabs`:
  - architect: Overview, Shortlist, Specification, `tab('sustainability','Sustainability','/sustainability')`, `tab('requirements','Requirements','/requirements')`, Team, Activity, Matching (soon).
  - client: Overview, Approvals (badge), Reservations, Specification, Sustainability (badge 1 when the statement is ready_for_review), Requirements (badge = at-risk count), Team, Activity.
  - consultant: Overview, Sustainability, `tab('targets','Goals and targets','/targets')`, `tab('certification','Certification','/certification')`, Requirements (badge = at-risk count), `tab('statement','Circular economy','/statement')`, Compliance, Team, Activity.
  - The consultant's next steps become "Review targets for this project" (targets), "Send the circular economy statement for review" (statement, while it is draft), and "Export the compliance workbook" (compliance).
  - `projectCarbon` stays where it is.
- `src/store/selectors/common.ts`: `PROJECT_TABS_OF` follows the lists above. `hrefForReader` maps `carbon` to `sustainability` for every side; for a side without access, `targets`, `certification` and `compliance` map to `/sustainability`, and `statement` maps to `/sustainability#statement` for the client.
- `src/store/selectors/nav.ts`: routeAccess accepts the tabs 'sustainability', 'targets', 'certification', 'requirements' and 'statement', and treats 'carbon' as 'sustainability' so the redirect is reached.
- `src/store/selectors/notifications.ts`: `sustainability: { label: 'Sustainability and compliance', description: 'Targets, certification credits, requirements and the circular economy statement change on one of your projects.', roles: ['client', 'consultant'] }`.
- `src/store/selectors/index.ts`: export `./sustainability`, `./client-dashboard`, `./portfolio` and `./compliance-workbook`.

## 6. Routes and navigation

- `src/app/router.tsx` (shared), project children:
  - `sustainability` lazy-loads `features/sustainability/Sustainability`.
  - `targets` lazy-loads `Targets`, `certification` lazy-loads `Certification`, `requirements` lazy-loads `Requirements`, and `statement` lazy-loads `Statement`.
  - `carbon` becomes `<ProjectTabRedirect to="sustainability" />`.
- `src/app/redirects.tsx` (shared): add `ProjectTabRedirect({ to })`, which navigates to `/app/projects/${projectId}/${to}` with replace and keeps the search and hash.
- Sidebar children come from projectTabs, so no Sidebar.tsx change is needed. The consultant's project folder shows Overview, Sustainability, Goals and targets, Certification, Requirements, Circular economy and Compliance.
- `src/app/notificationIcons.ts` (shared): `sustainability: Leaf`.

## 7. Screens, in priority order

All copy is British English and sentence case, with no dashes and no arrow, tick or comparison characters. Every carbon, price, saving, content-by-value and target figure carries `IndicativeMarker`. Lists stack below 640 px, touch targets are 44 px, and nothing scrolls sideways at 390, 1024 or 1440 px.

### 7.1 Client home (`src/features/home/ClientHome.tsx`, rewritten; parts in `src/features/home/client/`)

1. PageHeader: greeting and date.
2. MetricGrid of 4 MetricTiles, each indicative:
   - Indicative cost (test id client-metric-cost, Wallet icon, info). The value is `moneyWhole(total)`. The sub is "{n} reclaimed materials across {p} projects". The chart is a Donut by stage (Confirmed, Reserved, With the seller, Approved).
   - Saving against new (client-metric-saving, PiggyBank, brand; warning when negative). The value is `moneyWhole(abs)`. The sub is "{percent} less than buying new", or "Costs more than buying new". The chart is a ProgressRing of the saving against the new cost.
   - Avoided carbon, secured (client-metric-carbon, Leaf, brand). The value is `number(securedT, 1)` tCO2e. The sub is "{approvedT} tCO2e more with approved materials". The chart is a ProgressRing against targetT, and the sub reads "Of {t} tCO2e targeted" when there is a target.
   - Reuse by value (client-metric-reuse, Recycle). The value is `percent(reuse)`. The sub is "{content} with recycled content, aim {aim}". The chart is a ProgressRing of content against the aim. With no bill the value is "No bill yet" and the sub "Needs the bill of materials".
3. Two columns at lg:
   - Left, To do (client-todo, ListChecks), with a count Pill. Each row (todo-{id}) has an icon by kind (CheckCheck, Send, RotateCcw, FileText, TriangleAlert), the title, the detail, and whenText (warning colour when overdue), and links to its page. Empty: "Nothing to do. Approvals and reviews appear here."
   - Right, Reservations, as today.
4. Programme across your projects (portfolio-timeline), full width.
   - Legend: Design stages, Site start, Practical completion, Materials needed from, Today.
   - Axis ticks (unlabelled ticks hidden below 640 px).
   - One row per project (portfolio-row-{id}):
     - The name links to the project, with "Stage {n}, {label}" under it.
     - The track has stage segments: done brand-200, current brand-600 with its number, ahead subtle.
     - Markers: a site start diamond (info), a practical completion flag (ink), a materials-needed-from tick (amber), and the today line spanning all rows.
     - The markers' text appears in a visually hidden list for screen readers.
   - A row without a programme reads "Programme not set".
5. Sustainability tracking (sustainability-tracking), with an IndicativeMarker and CERT_CAVEAT under it.
   - At md and up it is a table with the columns Project, BREEAM, LEED, WELL, Circular economy and Requirements:
     - Each scheme cell shows the target level, or "Not targeted", then "{ready} of {targeted} ready", and an at-risk Pill when any are at risk.
     - The circular cell shows a TargetMeter for content by value and the statement Pill.
     - The requirements cell shows "{ready} of {total} ready" and an at-risk count.
   - On a phone each project is a card (tracking-{id}).
   - A project without a consultant shows "No consultant appointed" in the scheme cells, with default targets still shown.
6. Your projects: cards with a ProjectThumbnail, RibaStageStrip, To decide, Approved, Reserved and the indicative cost.
7. ActivityPanel (`home-activity-client`), collapsed.

### 7.2 Approvals (`Approvals.tsx`, plus new `CostPanel.tsx`)

- Under the section title, a MetricGrid (approvals-finance) of 3 indicative tiles:
  - Waiting for your decision: the count, with the sub "Indicative {moneyWhole(total)}, saving {moneyWhole(saving)} against new".
  - Approved: the count, with the same sub.
  - Avoided carbon if you approve: tCO2e of the waiting items.
- Each waiting card holds a CostPanel (approval-cost-{publicId}) after MaterialSignals:
  - The title "Indicative cost if approved" with the IndicativeMarker.
  - The total (text-lg) and "The same new {money}".
  - A saving Pill (`f.saving`): brand, or warning when negative.
  - The line "Stored {months} at {facility}. Includes testing." where those apply.
  - A disclosure "Show the package" listing its lines.
- Decided rows (decided-cost-{publicId}) add muted text "{moneyWhole(total)} · {savingShort}".
- FINANCE_CAVEAT sits at the foot of the page.

### 7.3 Reservations (`Reservations.tsx`)

- Under the title, two cards at lg:
  - Cost (reservations-cost): a BarList with Reserved, With the seller and To request (package total, with the saving as secondary text), a Total row, and FINANCE_CAVEAT.
  - Carbon (reservations-carbon): a TargetMeter "Secured for this project", where secured is earlier deals plus reserved, against the avoided carbon target (or "No carbon target set"). Under it, rows for Reserved, With the seller and To request with tCO2e and tonnes, and the L11 line. Both cards are indicative.
- Each ReservationCard's package panel gains a row (reservation-carbon-{publicId}): "Avoided carbon {carbon}" with "{percentText}" and a SustainabilityBand sm.

### 7.4 Sustainability (`src/features/sustainability/Sustainability.tsx`; all sides)

1. MetricGrid:
   - Avoided carbon, secured, with a ProgressRing against target.
   - On the live list.
   - Reused and recycled content by value, with a ProgressRing against target ("No bill yet" when missing).
   - Reclaimed mass, secured.
2. Targets (sustainability-targets): one TargetMeter per goal row. The consultant gets an "Edit targets" button that links to /targets. Others get the note "Targets are set by {consultant}", or "No consultant appointed yet. Defaults from the requirements are shown."
3. Carbon by status and by typology: the existing LinesCards, kept under `data-testid="project-carbon"` (exported from `ProjectCarbon.tsx` as `CarbonSection`).
4. Certification (sustainability-schemes): 4 scheme cards (scheme-{id}) with the target level, the predicted level, a SegmentedBar of statuses with a word legend, and "{ready} of {targeted} ready". The consultant gets "Open certification".
5. Requirements: the counts strip, then the at-risk titles as links, then "Open requirements".
6. Circular economy statement (statement-card, `id="statement"`):
   - The status Pill and the sent and reviewed text.
   - The client, when canReview, gets "Read and review" (statement-review). It opens a Dialog (statement-review-dialog) with the sections, STATEMENT_CAVEAT, and a note Textarea ("Comments for {consultant}", optional) with Mark as reviewed (statement-review-confirm). The toast reads "Statement reviewed".
   - The consultant gets "Open the statement".
   - The architect does not see this card.
7. The methodology footer with L11 and its link.

### 7.5 Goals and targets (`Targets.tsx`; consultant)

- The header "Goals and targets", with the sub "Targets start from the requirements that apply to {project}. Override any of them for this project; the default stays on record." It is followed by requirement Pills and TARGET_CAVEAT.
- At md and up a Table (goals), one row per goal (goal-{id}):
  - Goal: the label, the unit, and the Indicative marker where it applies.
  - Default: the defaultText and the basis in a Tooltip.
  - For this project: the targetText, plus the Pill "Default" or "Overridden" with overriddenText.
  - Now: the actualText and actualNote.
  - Status: a TargetMeter.
  - Actions: Edit (goal-edit-{id}), Reset to default (goal-reset-{id}, only when overridden), and Enter result (goal-actual-{id}, consultant-measured goals only).
- On a phone, each row is a card.
- Edit dialog (goal-dialog):
  - The control is an Input with a unit suffix (goal-value), or a Select of levels for a rating.
  - A Checkbox "Not targeted on this project" (goal-not-targeted), and a Textarea "Reason", optional.
  - Save (goal-save). `parseGoalInput` errors show under the field.
  - The toast reads "Target updated", with Undo.
- Result dialog: the value, "As at" (a date input with max today), "Source" (required, for example "Stage 2 life cycle assessment"), and Save.

### 7.6 Certification (`Certification.tsx`; consultant)

- The header "Certification", a Callout with CERT_CAVEAT, and a SegmentedControl of schemes (scheme-tab-{id}) with counts. The scheme comes from `?scheme=` and defaults to breeam.
- The summary row shows the target level ("Change in Goals and targets"), the predicted level, and a SegmentedBar of statuses.
- A SegmentedControl switches between "By credit" (view-by-credit) and "By material" (view-by-item).
- By credit, one Card per credit (credit-{id}):
  - The header has a Switch "Targeted" (credit-targeted-{id}, aria-label "Target {code}"), the code and the title, and a status Select (credit-status-{id}; disabled when not targeted; options without Not applicable).
  - When the suggestion differs from the status, a Pill "Suggested: {label}" shows its reason, with a "Use suggestion" button (credit-suggest-{id}).
  - The body holds the summary, "What Tallyard provides", the metrics as a description list, and a "Materials" checklist: a Checkbox per item (credit-item-{id}-{publicId}) with a status Pill and the hint "Included by the rule" or "Added by you" or "Left out by you".
  - A Note Textarea with Save.
- By material (cert-matrix): a Table of items against the targeted credits of the scheme, with a Checkbox in each cell (aria-label "Include {publicId} in {code}"). On a phone, each item is a card with its checkbox list.
- Empty: "No reclaimed materials yet. Credits that rely on reused items fill in as the client approves and reserves materials."

### 7.7 Requirements (`Requirements.tsx`; architect reads, client and consultant edit)

- The header "Planning and sustainability requirements", with the sub "{localAuthority}, {region}" and REQ_CAVEAT.
- A summary strip with a SegmentedBar and the words Evidence ready, At risk, In progress and Not started.
- Filter chips: All, At risk, Open, Evidence ready, Not applicable.
- A card per requirement (requirement-{id}):
  - The scope Pill (London-wide, the borough's name, or National), the title, the source and the summary.
  - Status: a Select (requirement-status-{id}) for editors, a Pill for the architect.
  - "Held in Tallyard": lines that link to their pages.
  - Evidence: a list (evidence-{id}) of the text, the output link and "Added by {name} on {date}", with Remove (evidence-remove-{id}) for its author.
  - An "Add evidence" form: Select "Output" with None and the OUTPUT_LABELS available to the side (evidence-output-{id}), Textarea "Note" (evidence-text-{id}), and an Add button (evidence-add-{id}).
- Empty: "No requirements recorded for this project yet. The architect chooses them from the local authority and region in the project settings."

### 7.8 Circular economy (`Statement.tsx`, `statementExport.ts`, `print.css`; consultant)

- Header "Circular economy statement", with the status Pill (statement-status). Actions:
  - Copy text (statement-copy).
  - Print (statement-print).
  - Download for Word (statement-docx).
  - Primary "Send to {client} for review" (statement-send), which becomes the disabled "Sent for review" while ready_for_review.
- A Callout with STATEMENT_CAVEAT.
- The document: the title "{project}: circular economy statement" and the subtitle "Prepared by {consultant} for {client}, {date}". Then each section (statement-section-{id}):
  - The heading and the text (whitespace pre-line).
  - An "Edited" Pill when edited.
  - Edit (statement-edit-{id}) turns the text into a Textarea with Save (statement-save-{id}) and Cancel. Save calls `editStatementSection(text, generated)`.
  - "Reset to generated text" (statement-reset-{id}).
  - When stale (statement-stale-{id}): a warning Callout "The project's figures have changed since this section was edited." with "Use updated text" (reset) and "Keep my text" (re-save with the new basis).
- Once reviewed, the client's note and the date.
- Print: A4 with 18 mm margins, hiding controls and the shell.
- `statementExport.ts`: `buildStatementDocx(d: DocxInput): Promise<ArrayBuffer>` lazy-imports `jszip`, writes `docxParts`, and generates an arraybuffer. It is downloaded with `downloadFile(buf, fileName, DOCX_MIME)`.

### 7.9 Compliance (`Compliance.tsx`, `exports.ts`)

- The "Circular Economy Statement stages" card becomes a "Circular economy statement" card with the status and "Open the statement".
- The static certification table becomes a per-scheme summary from certificationSummary, with "Open certification".
- The workbook uses `complianceWorkbook`. Its sheets are Summary, Bill of materials, Reused items, Targets (Goal, Default, Target, Source, Now, Status), Requirements (Requirement, Scope, Status, Evidence), Certification mapping (Scheme, Code, Title, Targeted, Status, Materials, What the workbook provides, Note), and Assumptions.

## 8. Seed

### 8.1 Names (`src/domain/reference/names.ts`, shared)

Add 'Tessaly Architects' to ALLOWED_ORGANISATIONS and 'Kilnworth Place' to ALLOWED_PLACES. There are no new people or emails.

### 8.2 `src/sandbox/seed-portfolio.ts` (new)

`addClientPortfolio(w: World): World` adds:
- the org `{ id: 'org_tessaly', name: 'Tessaly Architects', type: 'Architect' }`;
- the project `prj_w7kq2m` Kilnworth Place, with these fields:
  - client and developer: Lantern Quay Developments; architect: org_tessaly; consultant '' (none);
  - type residential, postcode district E14, Tower Hamlets, Inner London East;
  - blind `{ orgType: 'Developer', projectType: 'residential project' }`;
  - GIA 7400, RIBA stage 4;
  - description "Ninety-six homes over ground floor workspace, 7,400 m2 GIA, at RIBA stage 4.";
  - startDate '2027-02-15', keyDates `{ planningSubmission: '2026-05-11', steelNeedBy: '2027-02-15' }`;
  - hubDistancesKm `{ 'HUB-BARK': 9, 'HUB-PARK': 25, 'HUB-TILB': 29 }`;
  - teamOrgIds ['org_tessaly'], teamPersonaIds [isla];
  - every other list empty, termsAccepted false, and targets of 0.

The programme, in the C3 fields, is:

| Stage | Start | End |
|---|---|---|
| 0 | 2025-03-03 | 2025-04-25 |
| 1 | 2025-04-28 | 2025-07-25 |
| 2 | 2025-07-28 | 2025-11-28 |
| 3 | 2025-12-01 | 2026-04-24 |
| 4 | 2026-04-27 | 2027-01-29 |
| 5 | 2027-02-01 | 2028-06-30 |
| 6 | 2028-07-03 | 2029-06-29 |

Site start is 2027-02-01 and practical completion 2028-06-30. requirementIds is the dataset default.

`src/sandbox/seed.ts` calls it inside `referenceWorld()` (after publishTh01), so shiftWorld moves its dates. The domain `createSeed` is unchanged.

### 8.3 `src/sandbox/seed-sustainability.ts` (new)

`seedSustainability(s: AppData, todayIso: string, now: string): AppData`. Times use the same clamped `at(k, hh)` rule as firstRun. `seed.ts` calls it just before the final byTime sort. For Merrowgate Wharf:
- goals:
  - content_by_value 0.25, note "Set at inception with the client.", Marcus, at(40,10).
  - avoided_carbon 150, same note.
  - breeam 'Excellent', note "Client brief.", at(40,10).
  - leed null, note "Not pursued on this project.", at(40,10).
  - well 'Silver', note "The client's aim for the office floors.", at(12,15).
- actuals:
  - upfront_carbon 820, asOf day(18), source "Stage 2 life cycle assessment".
  - breeam 'Very good', asOf day(9), source "BREEAM pre-assessment, second workshop".
  - well 'Silver', asOf day(9), source "WELL scorecard, first pass".
- credits:
  - breeam-mat01 targeted, in_progress. breeam-mat03 targeted, not_started. breeam-mat05 targeted, in_progress. breeam-wst01 targeted, not_started.
  - well-x01 targeted, at_risk, note "Primary beams from Tiverne House are untested. Coatings to be checked for lead before delivery." well-x02 targeted, not_started. well-x07 targeted, in_progress.
  - ce-content in_progress, ce-reuse in_progress, ce-statement in_progress.
- requirements (only ids present in the project's applicable set):
  - london-plan-si7 in_progress, with evidence "Pre-application meeting with the GLA. The outline of the statement was agreed." (Marcus, at(26,14)) and evidence with output ce_statement and the text "Draft statement sent to the client." (at(1,16)).
  - london-plan-si2 in_progress, with evidence "Stage 2 life cycle assessment issued to the design team." (at(18,11)).
  - borough-breeam at_risk, with evidence "The pre-assessment predicts Very good. Two more materials credits are needed for Excellent." (at(9,16)).
- statement: status ready_for_review, sentAt at(1,16) by Marcus. The approach section is edited with this text: "Lantern Quay Developments has asked the design team to put reclaimed structure first. The steel frame is set out on a grid that suits reclaimed sections of about 9 m, and the facade and finishes follow the same approach where the programme allows. Every reclaimed material is checked against the programme and, for structural steel, against testing before it is specified." Its basis is the generated approach text worked out from the seeded state.
- activity, for the Merrowgate organisations: at(40,10) Marcus "set the targets for Merrowgate Wharf"; at(18,11) "recorded upfront carbon, modules A1 to A5: 820 kgCO2e per m2"; at(9,16) "marked {borough-breeam title} as at risk"; at(1,16) "sent the circular economy statement to Lantern Quay Developments for review".
- Kilnworth activity: at(45,10), actor 'Tessaly Architects', orgIds [org_tessaly, lantern], "added Lantern Quay Developments as the client on Kilnworth Place".
- notification: one, to Lantern, at(1,16), "Circular economy statement ready for review", read by Isla. That keeps Isla's unread count at 1 while the to-do stays open.

## 9. Help (`src/features/help/Help.tsx`, shared)

Methodology gains a section "Targets, certification and costs" with:
- the goal defaults table, showing each basis and status;
- FINANCE_CAVEAT and the formulas in words: "Indicative cost is the package total: material at the guide price, testing, storage and delivery. The same new is the quantity at the family's new price. Saving is the difference.";
- CERT_CAVEAT and REQ_CAVEAT.

Getting started for consultants reads: "Set goals and targets, track certification credits and requirements, and send the circular economy statement for review." For clients: "Follow cost, savings and carbon across your projects, review the statement, and keep the requirements up to date."

## 10. Privacy

- None of these records ever reaches an owner or a surveyor. Actions address only `projectOrgIds(p)`, and selectors return null outside project sides.
- Items, titles and figures come from `listingOf` (toPublicListing) and the project's own records. No new projection is needed.
- Architects and consultants get no money figures (no '£' in their sustainability, goals, certification, requirements or statement views). Clients see package money as before.

Add to `src/test/privacy.platform.test.ts` (shared):
- buyerViews gains `sustainabilityView`, `goalRows`, `requirementsView`, `statementView`, `certificationView` (Marcus, each scheme), `clientDashboard` (Isla), `complianceWorkbook` and `sustainabilityTracking`.
- A new case: the JSON of these views for Priya and Marcus contains no '£'.
- A new case: Tom's inbox and activity contain nothing of kind 'sustainability' and no statement text.

## 11. Tests

- Unit, new: finance.test.ts, goals.test.ts, certification.test.ts, tracker.test.ts, portfolio.test.ts, statement.test.ts, statementDocx.test.ts and `src/domain/reference/sustainability.test.ts`. The reference test checks:
  - ids are unique;
  - every GOAL_DEFAULTS requirementId exists in the C1 dataset;
  - every credit's scheme exists;
  - no string matches FORBIDDEN;
  - every rating default is in its scale.
- Store, new: `src/store/actions/sustainability.test.ts` (section 4).
- Selectors, new: `src/store/selectors/sustainability.test.ts` (Merrowgate, fixture date):
  - goalRows(Marcus): content target 25% from override, actual 19.9%, below, share 0.7964; avoided carbon 47.8 of 150, share 0.3186; upfront 820 at most 950, met; breeam Very good against Excellent, below.
  - effectiveTargets gives { 0.25, 150 }, and for Sallow Court { 0.20 or 0 per C1, 0 }.
  - certificationView breeam lists 5 credits with 4 targeted; well-x01 suggests at_risk with TH-02 mapped.
  - statementView for Isla has canReview true and canEdit false; for Priya it is null.
  - requirementsView for Priya has canEdit false.
  - sustainabilityView for Priya holds no '£'.
- Selectors, new: `src/store/selectors/client-dashboard.test.ts`:
  - cost total 155931.69, costNew 335196.40, saving 179264.71;
  - carbon securedT 47.7974, targetT 150;
  - reuse 0.0236 and content 0.1991;
  - todos in order: approve (L-2MAC36, due in 6 days), review_statement, reserve (L-NHZ32R);
  - programme has 2 rows with Kilnworth current stage 4;
  - tracking for Kilnworth has consultantName null.
  - After reviewStatement, the review to-do is gone.
- Seed, new: `src/sandbox/seed-sustainability.test.ts`:
  - firstRun has sustainability for Merrowgate only;
  - the approach edit is not stale on a fresh sandbox;
  - Kilnworth is in Isla's projects and not in Priya's or Marcus's;
  - Isla's unread count is 1.
- Screens, new: `src/features/sustainability/sustainability.screens.test.tsx` (jsdom, real router), each rendering cleanly with no FORBIDDEN text:
  - client home (all 4 metric test ids, portfolio-timeline with 2 rows, client-todo);
  - sustainability for Isla, Priya and Marcus;
  - targets, certification (switching scheme and view) and statement for Marcus;
  - requirements for Isla and Priya (no status select for Priya);
  - `/carbon` redirects to `/sustainability`;
  - Marcus edits a goal through the dialog;
  - Isla reviews the statement through the dialog and the to-do disappears.
- Feature, new: `statementExport.test.ts` (node), where the built docx reopens with JSZip and its document.xml contains the project name.
- Updated (spec changes, not weaker):
  - `views.test.ts`: the client nav children become `[['Overview', null], ['Approvals', 1], ['Reservations', null], ['Specification', null], ['Sustainability', 1], ['Requirements', 1]]` (Requirements 1 only when borough-breeam applies to Merrowgate); clientHome stats `projects: 2`; Isla's inbox groups stay the same with unread 1.
  - `compliance/exports.test.ts`: the sheet list adds 'Targets' and 'Requirements' before 'Certification mapping'.
  - `notifications/screens.test.tsx`: keep the `/carbon` entry (it now redirects) and add sustainability and requirements.
- e2e, new: `e2e/sustainability.spec.ts`, at 1440 px with phone checks at 390 px:
  1. Isla: home shows the metrics, the to-do and the 2 timeline rows. She opens "Review the circular economy statement", reads it, marks it reviewed, and the to-do is gone. On Approvals, the cost panel shows for L-2MAC36. On Reservations, the cost and carbon cards show. On Requirements, she marks a requirement evidence ready with a note.
  2. Marcus: he gets the notifications. In Goals and targets he sets content by value to 30%, and the meter reads below. In Certification (WELL) he uses the suggestion on X01, and in By material he includes L-NHZ32R in X07. In Circular economy he edits a section (the status becomes Draft), sends it for review, and downloads the .docx (filename matches /circular-economy-statement.*\.docx$/).
  3. At 390 px there is no horizontal scroll on the client home, Certification or Requirements.

## 12. Files

New:
- `src/domain/engines/{finance,goals,certification,tracker,portfolio,statement,statementDocx}.ts`, each with its `.test.ts`
- `src/domain/reference/{goals,certification,sustainabilityCopy}.ts` and `sustainability.test.ts`
- `src/store/sustainabilityRecord.ts` and `src/store/actions/sustainability.ts` with its `.test.ts`
- `src/store/selectors/{sustainability,client-dashboard,portfolio,compliance-workbook}.ts`, plus `sustainability.test.ts` and `client-dashboard.test.ts`
- `src/sandbox/seed-portfolio.ts`, `seed-sustainability.ts` and `seed-sustainability.test.ts`
- `src/features/sustainability/{Sustainability,Targets,Certification,Requirements,Statement,parts}.tsx`, plus `statementExport.ts`, `statementExport.test.ts`, `print.css` and `sustainability.screens.test.tsx`
- `src/features/home/client/{ProgrammeTimeline,TodoList,TrackingTable}.tsx`
- `src/features/approvals/CostPanel.tsx`
- `e2e/sustainability.spec.ts`

Changed (this cluster only):
- `src/features/home/ClientHome.tsx`
- `src/features/approvals/Approvals.tsx`, `MaterialSummary.tsx` (it accepts a children slot for the cost panel)
- `src/features/reservations/Reservations.tsx`
- `src/features/carbon/ProjectCarbon.tsx` (exports CarbonSection; no longer a routed page)
- `src/features/compliance/Compliance.tsx`, `exports.ts`, `exports.test.ts`
- `src/store/selectors/client.ts`, `consultant.ts`

Shared (coordinate):
- `src/store/types.ts`, `src/store/app.ts`, `src/store/hooks.ts`, `src/store/act.ts`
- `src/store/selectors/index.ts`, `project.ts`, `common.ts`, `nav.ts`, `notifications.ts`, `views.test.ts`
- `src/app/router.tsx`, `src/app/redirects.tsx`, `src/app/notificationIcons.ts`
- `src/sandbox/seed.ts`
- `src/domain/reference/names.ts`
- `src/features/help/Help.tsx`
- `src/features/notifications/screens.test.tsx`
- `src/test/privacy.platform.test.ts`
- `package.json`

## Files changed
/home/user/tallyard/platform/src/features/home/ClientHome.tsx
/home/user/tallyard/platform/src/features/approvals/Approvals.tsx
/home/user/tallyard/platform/src/features/approvals/MaterialSummary.tsx
/home/user/tallyard/platform/src/features/reservations/Reservations.tsx
/home/user/tallyard/platform/src/features/carbon/ProjectCarbon.tsx
/home/user/tallyard/platform/src/features/compliance/Compliance.tsx
/home/user/tallyard/platform/src/features/compliance/exports.ts
/home/user/tallyard/platform/src/features/compliance/exports.test.ts
/home/user/tallyard/platform/src/store/selectors/client.ts
/home/user/tallyard/platform/src/store/selectors/consultant.ts
/home/user/tallyard/platform/src/store/types.ts
/home/user/tallyard/platform/src/store/app.ts
/home/user/tallyard/platform/src/store/hooks.ts
/home/user/tallyard/platform/src/store/act.ts
/home/user/tallyard/platform/src/store/selectors/index.ts
/home/user/tallyard/platform/src/store/selectors/project.ts
/home/user/tallyard/platform/src/store/selectors/common.ts
/home/user/tallyard/platform/src/store/selectors/nav.ts
/home/user/tallyard/platform/src/store/selectors/notifications.ts
/home/user/tallyard/platform/src/store/selectors/views.test.ts
/home/user/tallyard/platform/src/app/router.tsx
/home/user/tallyard/platform/src/app/redirects.tsx
/home/user/tallyard/platform/src/app/notificationIcons.ts
/home/user/tallyard/platform/src/sandbox/seed.ts
/home/user/tallyard/platform/src/domain/reference/names.ts
/home/user/tallyard/platform/src/features/help/Help.tsx
/home/user/tallyard/platform/src/features/notifications/screens.test.tsx
/home/user/tallyard/platform/src/test/privacy.platform.test.ts
/home/user/tallyard/platform/package.json

## Files new
/home/user/tallyard/platform/src/domain/engines/finance.ts
/home/user/tallyard/platform/src/domain/engines/finance.test.ts
/home/user/tallyard/platform/src/domain/engines/goals.ts
/home/user/tallyard/platform/src/domain/engines/goals.test.ts
/home/user/tallyard/platform/src/domain/engines/certification.ts
/home/user/tallyard/platform/src/domain/engines/certification.test.ts
/home/user/tallyard/platform/src/domain/engines/tracker.ts
/home/user/tallyard/platform/src/domain/engines/tracker.test.ts
/home/user/tallyard/platform/src/domain/engines/portfolio.ts
/home/user/tallyard/platform/src/domain/engines/portfolio.test.ts
/home/user/tallyard/platform/src/domain/engines/statement.ts
/home/user/tallyard/platform/src/domain/engines/statement.test.ts
/home/user/tallyard/platform/src/domain/engines/statementDocx.ts
/home/user/tallyard/platform/src/domain/engines/statementDocx.test.ts
/home/user/tallyard/platform/src/domain/reference/goals.ts
/home/user/tallyard/platform/src/domain/reference/certification.ts
/home/user/tallyard/platform/src/domain/reference/sustainabilityCopy.ts
/home/user/tallyard/platform/src/domain/reference/sustainability.test.ts
/home/user/tallyard/platform/src/store/sustainabilityRecord.ts
/home/user/tallyard/platform/src/store/actions/sustainability.ts
/home/user/tallyard/platform/src/store/actions/sustainability.test.ts
/home/user/tallyard/platform/src/store/selectors/sustainability.ts
/home/user/tallyard/platform/src/store/selectors/sustainability.test.ts
/home/user/tallyard/platform/src/store/selectors/client-dashboard.ts
/home/user/tallyard/platform/src/store/selectors/client-dashboard.test.ts
/home/user/tallyard/platform/src/store/selectors/portfolio.ts
/home/user/tallyard/platform/src/store/selectors/compliance-workbook.ts
/home/user/tallyard/platform/src/sandbox/seed-portfolio.ts
/home/user/tallyard/platform/src/sandbox/seed-sustainability.ts
/home/user/tallyard/platform/src/sandbox/seed-sustainability.test.ts
/home/user/tallyard/platform/src/features/sustainability/Sustainability.tsx
/home/user/tallyard/platform/src/features/sustainability/Targets.tsx
/home/user/tallyard/platform/src/features/sustainability/Certification.tsx
/home/user/tallyard/platform/src/features/sustainability/Requirements.tsx
/home/user/tallyard/platform/src/features/sustainability/Statement.tsx
/home/user/tallyard/platform/src/features/sustainability/parts.tsx
/home/user/tallyard/platform/src/features/sustainability/statementExport.ts
/home/user/tallyard/platform/src/features/sustainability/statementExport.test.ts
/home/user/tallyard/platform/src/features/sustainability/print.css
/home/user/tallyard/platform/src/features/sustainability/sustainability.screens.test.tsx
/home/user/tallyard/platform/src/features/home/client/ProgrammeTimeline.tsx
/home/user/tallyard/platform/src/features/home/client/TodoList.tsx
/home/user/tallyard/platform/src/features/home/client/TrackingTable.tsx
/home/user/tallyard/platform/src/features/approvals/CostPanel.tsx
/home/user/tallyard/platform/e2e/sustainability.spec.ts

## Shared
/home/user/tallyard/platform/src/store/types.ts (AppData.sustainability, TrackStatus, Evidence, GoalId, GoalOverride, GoalActual, CreditTrack, StatementDoc, ProjectSustainability, NOTIFICATION_KINDS adds 'sustainability')
/home/user/tallyard/platform/src/store/app.ts (DATA_KEYS and looksValid add sustainability; STATE_VERSION 2 recommended)
/home/user/tallyard/platform/src/store/hooks.ts (useData adds sustainability)
/home/user/tallyard/platform/src/store/act.ts (bind 15 sustainability actions)
/home/user/tallyard/platform/src/store/selectors/index.ts (export sustainability, client-dashboard, portfolio, compliance-workbook)
/home/user/tallyard/platform/src/store/selectors/project.ts (owned by projects-timeline: projectTabs per side and consultant next steps)
/home/user/tallyard/platform/src/store/selectors/common.ts (PROJECT_TABS_OF; hrefForReader maps carbon, targets, certification, statement and compliance)
/home/user/tallyard/platform/src/store/selectors/nav.ts (routeAccess tab list; carbon treated as sustainability)
/home/user/tallyard/platform/src/store/selectors/notifications.ts (NOTIFICATION_KIND_INFO.sustainability)
/home/user/tallyard/platform/src/store/selectors/views.test.ts (client nav children and clientHome stats updated to the new seed)
/home/user/tallyard/platform/src/app/router.tsx (sustainability, targets, certification, requirements and statement routes; carbon redirect)
/home/user/tallyard/platform/src/app/redirects.tsx (ProjectTabRedirect)
/home/user/tallyard/platform/src/app/notificationIcons.ts (sustainability: Leaf)
/home/user/tallyard/platform/src/sandbox/seed.ts (sustainability: {}; addClientPortfolio in referenceWorld; seedSustainability before the final sort)
/home/user/tallyard/platform/src/domain/reference/names.ts (Tessaly Architects, Kilnworth Place)
/home/user/tallyard/platform/src/features/help/Help.tsx (methodology section and getting-started lines)
/home/user/tallyard/platform/src/features/notifications/screens.test.tsx (add sustainability and requirements screens)
/home/user/tallyard/platform/src/test/privacy.platform.test.ts (buyerViews gains the new views; no money for architect and consultant; no owner leakage)
/home/user/tallyard/platform/package.json (jszip 3.10.2)
/home/user/tallyard/platform/src/domain/reference/requirements.ts (consumed, owned by projects-timeline: PolicyRequirement, requirementById, requirementsFor, ids london-plan-si7, london-plan-si2, borough-breeam)
Programme fields on Project and stageWindows (consumed, owned by projects-timeline)
/home/user/tallyard/platform/src/ui/charts/*, /home/user/tallyard/platform/src/ui/Thumbnails.tsx, /home/user/tallyard/platform/src/features/home/ActivityPanel.tsx, /home/user/tallyard/platform/src/store/selectors/dashboard.ts (consumed, owned by shell-dashboards)
/home/user/tallyard/platform/src/store/selectors/home-consultant.ts and /home/user/tallyard/platform/src/features/home/ConsultantHome.tsx (owned by shell-dashboards; import effectiveTargets from selectors/sustainability.ts)

## Deps
jszip@3.10.2 (already installed as a dependency of exceljs; pinned explicitly and lazy-loaded to build the .docx export of the circular economy statement)

## Open questions
- What are the exact shape and ids of the projects cluster's requirements dataset (C1, C2)? The goal defaults need entries for the Circular Economy Statement (SI 7), whole life-cycle carbon (SI 2) and a borough BREEAM policy, and a way to get a project's applicable list. REC: The foundation agent keeps the ids london-plan-si7, london-plan-si2 and borough-breeam in src/domain/reference/requirements.ts, and exports PolicyRequirement, requirementById and requirementsFor, plus Project.requirementIds for the architect's choice. If other ids are used, change only GOAL_DEFAULTS and the seed in this cluster. The reference test catches any id that is missing.
- What are the programme field names (C3) for RIBA stage dates, site start and practical completion? REC: Export stageWindows(project): { stage, start, end }[] from a pure engine, and store project.programme.siteStart and project.programme.practicalCompletion as ISO strings. programmeInput(project) in selectors/portfolio.ts is the only reader, so a different name means a one-line change there. The Kilnworth Place seed values in section 8.2 should be written in whatever shape is chosen.
- Several clusters add persisted keys (sustainability here; link requests and ui.navProjects elsewhere). Should the store version change? REC: Raise STATE_VERSION to 2 in src/store/app.ts so an older sandbox re-seeds cleanly, rather than merging undefined keys. Selectors here also read state.sustainability?.[id] defensively.
- Should the architect read, or co-author, the circular economy statement? REC: Not in this round. Architects see the statement's status in the requirements' 'Held in Tallyard' lines, while the consultant writes it and the client reviews it. Read access for architects is easy to add later through statementView, if the partner asks.
- The consultant's project tabs grow to nine, and the dashboards cluster builds its consultant home links from projectTabs. Is that too many links on a card? REC: Show only Sustainability, Goals and targets and Certification on the consultant home cards. The sidebar folder shows all of them.
- Are the BREEAM v7, LEED v5 and WELL v2 credit codes and titles current? REC: Keep them as indicative summaries, with CERT_CAVEAT shown everywhere they appear. Ask the partner's sustainability contact to check the codes against the current manuals before any external demo, and record the check in Help, Methodology.
- Should the client be able to set certification rating targets (for example a WELL aspiration) directly? REC: No. Targets belong to the consultant, which keeps the consultant view distinct. The client sees each target and its source, and asks the consultant to change it. A client-side 'Propose a target' action is a candidate for version 2.
