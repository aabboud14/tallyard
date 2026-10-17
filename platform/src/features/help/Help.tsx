// Help: getting started for each workspace, the methodology behind every indicative figure (each factor and price
// with its source and status, the programme suggestions, the default targets, the caveats and the planning and
// sustainability references), and what version 2 adds.
import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { Award, BookOpen, Boxes, Building2, CalendarRange, Camera, ChevronDown, ClipboardCheck, Compass, Database, FileSpreadsheet, FileText, Gauge, GripHorizontal, Handshake, History, Inbox, Info, KeyRound, Landmark, Layers, Leaf, ListOrdered, Network, PackageCheck, Recycle, Rocket, Scale, Share2, ShieldCheck, Tag, Target, Timer, Users } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import { useSession, type PlatformRole } from '../../store'
import { MARKETPLACE_PATH } from '../../store/paths'
import { methodologyView } from '../../store/selectors/settings'
import { methodologyNotes } from '../../store/selectors/help'
import { scoreWeights } from '../../store/selectors/roles-views'
import { Badge, Card, CardBody, cx, Pill, Table, TBody, TD, TH, THead, TR, type Tone } from '../../ui'
import { Page } from '../../app/Page'
import { UPGRADE_HELP_TOPIC, UPGRADE_TITLE } from '../../store/upgrade'
import { WhatChanged } from './WhatChanged'

const TOPICS = [
  { id: 'getting-started', label: 'Getting started', icon: Rocket },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
  { id: 'version-2', label: 'Version 2', icon: Boxes },
  { id: UPGRADE_HELP_TOPIC, label: UPGRADE_TITLE, icon: History },
] as const

export function Help() {
  const { topic = 'getting-started' } = useParams()
  const current = TOPICS.find((t) => t.id === topic)?.id ?? 'getting-started'
  return (
    <Page testId="help">
      <h1 className="m-0 text-2xl font-semibold text-ink">Help</h1>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-10">
        {/* Below lg the topics wrap onto a second line rather than scroll sideways, so every topic, the first and the open one included, is always in view. */}
        <nav aria-label="Help topics" className="lg:w-52 lg:shrink-0">
          <ul className="m-0 flex list-none flex-wrap gap-1 p-0 lg:sticky lg:top-6 lg:flex-col lg:flex-nowrap">
            {TOPICS.map((t) => {
              const Icon = t.icon
              const active = t.id === current
              return (
                <li key={t.id}>
                  <Link to={`/app/help/${t.id}`} aria-current={active ? 'page' : undefined} className={cx('flex h-9 items-center gap-2.5 whitespace-nowrap rounded-md px-3 text-base transition-colors max-lg:h-11', active ? 'bg-subtle font-medium text-ink ring-1 ring-inset ring-line-soft' : 'text-ink-soft hover:bg-hover hover:text-ink')} data-testid={`help-${t.id}`}>
                    <Icon aria-hidden="true" className={cx('size-4', active ? 'text-ink' : 'text-faint')} />
                    {t.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">{current === 'methodology' ? <Methodology /> : current === 'version-2' ? <VersionTwo /> : current === UPGRADE_HELP_TOPIC ? <WhatChanged /> : <GettingStarted />}</div>
      </div>
    </Page>
  )
}

type Step = { icon: LucideIcon; title: string; text: string; href?: string; cta?: string }

const GUIDES: Record<PlatformRole, { title: string; intro: string; steps: Step[] }> = {
  architect: {
    title: 'Architects',
    intro: 'Find reclaimed materials, shortlist them for a project, check the timing and send them to your client.',
    steps: [
      { icon: CalendarRange, title: 'Set up a project', text: 'Give it a site start and the dates are suggested for each RIBA stage: confirm or edit them. Choose the planning and sustainability requirements for its location. Your client accepts before they see it.', href: '/app/projects', cta: 'Your projects' },
      { icon: Compass, title: 'Browse the Marketplace', text: 'Filter by typology, family and availability. Pick a project in "Checking against" to see whether each material arrives in time.', href: MARKETPLACE_PATH, cta: 'Open the Marketplace' },
      { icon: Tag, title: 'Save to a project', text: 'Save materials to a project shortlist, or to Saved when you have no project for them yet.', href: '/app/saved', cta: 'Saved' },
      { icon: Handshake, title: 'Send to your client', text: 'Once your client has accepted the project, select materials on the shortlist and send them for approval with a message. The client approves or declines.' },
      { icon: FileSpreadsheet, title: 'Export the specification', text: 'Approved materials make the specification schedule: export the spreadsheet or print it, and download DXF, OBJ or IFC geometry.' },
    ],
  },
  client: {
    title: 'Clients and developers',
    intro: 'Follow cost, savings and carbon across your projects, review the statement, and keep the requirements up to date.',
    steps: [
      { icon: Inbox, title: 'Accept project requests', text: 'An architect asks before adding you as the client on a project. Accept to see it and approve materials for it, or decline with a note.', href: '/app/projects/requests', cta: 'Project requests' },
      { icon: ClipboardCheck, title: 'Review approvals', text: 'Each material comes with its facts, the timeline check, avoided carbon and the guide price range. Approve or decline with a note.' },
      { icon: Handshake, title: 'Request a reservation', text: 'For an approved material, see the indicative package for storage, testing and delivery, then ask the seller to hold it.' },
      { icon: Users, title: 'Meet the seller', text: 'The seller sees your project as a blind line. When they accept, you both see each other\'s organisation and contact.' },
    ],
  },
  owner: {
    title: 'Donor building owners',
    intro: 'Know what your buildings hold and decide what is visible, to whom and from when.',
    steps: [
      { icon: Building2, title: 'Add a building and appoint a surveyor', text: 'The surveyor captures each item. You are told as items arrive and when the survey is submitted.', href: '/app/buildings', cta: 'Buildings' },
      { icon: ListOrdered, title: 'Decide what to recover', text: 'The recovery plan ranks items by net value, avoided carbon, demand and ease, with their route on the UK decision tree.' },
      { icon: Share2, title: 'Share or publish', text: 'Keep a lot private, share it in confidence with projects you choose, or publish it. Set the ask, the reserve and the date.' },
      { icon: Handshake, title: 'Answer requests', text: 'Buyers stay anonymous until you accept. Accepting holds the lot and exchanges contacts.', href: '/app/requests', cta: 'Requests' },
    ],
  },
  surveyor: {
    title: 'Site surveyors',
    intro: 'Capture each material on site from a phone, then hand the survey to the owner.',
    steps: [
      { icon: Camera, title: 'Capture on site', text: 'Describe the item in your own words and the fields fill: family, size, quantity. Grade its condition and recoverability, add photos.', href: '/app/capture', cta: 'Capture' },
      { icon: Timer, title: 'Say when it comes out', text: 'Set the month you expect it to be free. It starts at the dismantling date in the programme; the owner sets the final date.' },
      { icon: ClipboardCheck, title: 'Submit the survey', text: 'When the walk-round is done, submit the survey. The owner is told at once. You can reopen it to add more.' },
    ],
  },
  consultant: {
    title: 'Sustainability consultants',
    intro: 'Set goals and targets, track certification credits and requirements, and send the circular economy statement for review.',
    steps: [
      { icon: Leaf, title: 'Read the sustainability', text: 'Each project\'s Sustainability tab totals avoided carbon and mass by status and by typology, against the project\'s targets.' },
      { icon: Target, title: 'Set goals and targets', text: 'Default targets come from the requirements that apply to the project. Override any of them, with your reason.' },
      { icon: Award, title: 'Track certification and the statement', text: 'Map reused materials to BREEAM, LEED and WELL credits, then send the auto-written circular economy statement to the client for review.' },
      { icon: Scale, title: 'Compliance', text: 'Reused and recycled content by value against the aim, the reused items and the bill of materials. Export the workbook or print it.' },
      { icon: Recycle, title: 'Waste engagements', text: 'Import a demolition bill, review its rows, and export the waste and reuse workbook.' },
    ],
  },
}

const ORDER: PlatformRole[] = ['architect', 'client', 'owner', 'surveyor', 'consultant']

function GettingStarted() {
  const { role } = useSession()
  const mine = role ?? 'architect'
  const others = ORDER.filter((r) => r !== mine)
  const g = GUIDES[mine]
  return (
    <div className="flex flex-col gap-8" data-testid="getting-started">
      <section>
        <p className="m-0 text-sm font-medium text-brand-700">Your workspace</p>
        <h2 className="m-0 mt-1 text-xl font-semibold text-ink">{g.title}</h2>
        <p className="m-0 mt-1 max-w-2xl text-base text-muted">{g.intro}</p>
        <ol className="m-0 mt-5 grid list-none gap-3 p-0 md:grid-cols-2">
          {g.steps.map((s, i) => (
            <StepCard key={s.title} step={s} n={i + 1} />
          ))}
        </ol>
      </section>
      <section>
        <h2 className="m-0 text-md font-semibold text-ink">Other workspaces</h2>
        <p className="m-0 mt-0.5 text-sm text-muted">Each organisation type has its own workspace. This is how the others work.</p>
        <div className="mt-3 flex flex-col gap-2">
          {others.map((r) => (
            <details key={r} className="group rounded-lg border border-line bg-surface shadow-xs">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-medium text-ink max-sm:min-h-11 [&::-webkit-details-marker]:hidden">
                <span>
                  {GUIDES[r].title}
                  <span className="ml-2 font-normal text-muted">{GUIDES[r].intro}</span>
                </span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
              </summary>
              <ol className="m-0 grid list-none gap-3 border-t border-line-soft p-4 md:grid-cols-2">
                {GUIDES[r].steps.map((s, i) => (
                  <StepCard key={s.title} step={{ ...s, href: undefined }} n={i + 1} />
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function StepCard({ step, n }: { step: Step; n: number }) {
  const Icon = step.icon
  return (
    <li className="flex gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs">
      <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
        <Icon aria-hidden="true" className="size-4" />
        <span className="absolute -right-1.5 -top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-ink text-[10px] font-semibold text-white">{n}</span>
      </span>
      <div className="min-w-0">
        <h3 className="m-0 text-base font-semibold text-ink">{step.title}</h3>
        <p className="m-0 mt-0.5 text-sm text-ink-soft">{step.text}</p>
        {step.href ? (
          <Link to={step.href} className="mt-2 inline-flex rounded-sm text-sm font-medium text-brand-700 hover:underline max-sm:-mx-2 max-sm:min-h-11 max-sm:min-w-11 max-sm:items-center max-sm:px-2">
            {step.cta}
          </Link>
        ) : null}
      </div>
    </li>
  )
}

const STATUS_TONE: Record<string, Tone> = { published: 'brand', indicative: 'warning', placeholder: 'neutral', candidate: 'info' }

const RULES: { icon: LucideIcon; title: string; text: ReactNode }[] = [
  { icon: Leaf, title: 'Avoided carbon', text: `${LABELS.L11} Reuse is compared with buying the same quantity new, with transport to site.` },
  { icon: Gauge, title: 'Sustainability band', text: `${LABELS.L37} High at 90% or more of the new figure avoided, Medium at 80%, Low below that, Not claimed for unused surplus.` },
  { icon: Timer, title: 'Timeline check', text: `${LABELS.L38} In time, tight, too late, or available now with storage until the start.` },
  { icon: CalendarRange, title: 'Availability wording', text: 'Availability is shown as the month or the three-month window the owner discloses, never the exact date.' },
  {
    icon: CalendarRange,
    title: 'Programme',
    text: 'Stages 0 to 4 start on the dates the architect sets; stage 5 runs from site start, stage 6 from practical completion for a year, then stage 7. The programme check compares the stage planned for today with the stage the architect declares. Suggested dates share the time to site start between the remaining design stages in proportion to their typical lengths, listed below as placeholders.',
  },
  { icon: Boxes, title: 'Generated geometry', text: '3D views and the DXF, OBJ and IFC files are generated from the recorded dimensions, with square corners. Panel depths for curtain walls and raised floors are placeholders.' },
  { icon: Tag, title: 'Guide price', text: `A range from the family's reference price, adjusted for condition, testing and demand. ${LABELS.L10}.` },
  { icon: Handshake, title: 'Indicative package', text: 'Storage at the nearest suitable yard until the start, testing where the material is untested, handling and delivery to site.' },
  { icon: ListOrdered, title: 'Recovery plan ranking', text: `Out of 100 points: ${scoreWeights().map((w) => `${w.label.toLowerCase()} ${w.max}`).join(', ')}. Items that would cost more to recover than they fetch, or will not come out intact, go to recycling.` },
  { icon: Layers, title: 'Decision tree', text: LABELS.L41 },
  { icon: ShieldCheck, title: 'Disclosure score', text: 'Points for how precisely published listings show location and timing, how many open lots a building has, a structural frame pattern and public photos. Publishing is refused at High.' },
  { icon: Camera, title: 'Capture', text: 'The description is read by fixed rules: section designations from the steel tables, counts, lengths, areas and volumes, connections for recoverability, and the location. Nothing is guessed silently.' },
  { icon: Scale, title: 'Content by value', text: LABELS.L15 },
  { icon: Recycle, title: 'Waste and reuse', text: LABELS.L13 },
]

function Methodology() {
  const m = useMemo(() => methodologyView(), [])
  return (
    <div className="flex flex-col gap-8" data-testid="methodology">
      <section>
        <h2 className="m-0 text-xl font-semibold text-ink">Methodology</h2>
        <p className="m-0 mt-1 max-w-2xl text-base text-muted">How every figure marked Indicative is worked out, and where each factor comes from.</p>
        <div className="mt-4 flex gap-3 rounded-lg border border-warning-line bg-warning-soft/50 p-4">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="text-base text-ink-soft">
            <p className="m-0 font-medium text-ink">What Indicative means</p>
            <p className="m-0 mt-1">An indicative figure is worked out by fixed, published rules from the record and the factors below. It helps you compare and decide; it is not a certified assessment, a quotation or a valuation. Confirm with the seller, the engineer, testing and your assessor before you rely on it.</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="m-0 text-md font-semibold text-ink">The rules</h3>
        <ul className="m-0 mt-3 grid list-none gap-3 p-0 md:grid-cols-2">
          {RULES.map((r) => {
            const Icon = r.icon
            return (
              <li key={r.title} className="flex gap-3 rounded-lg border border-line bg-surface p-4">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="m-0 text-base font-semibold text-ink">{r.title}</p>
                  <p className="m-0 mt-0.5 text-sm text-ink-soft">{r.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <MethodNotes />

      <section aria-labelledby="factors-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="factors-title" className="m-0 text-md font-semibold text-ink">
              Factors and prices
            </h3>
            <p className="m-0 mt-0.5 text-sm text-muted">Every value the rules use, with its source and status.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Status key">
            {Object.entries(STATUS_TONE).map(([s, tone]) => (
              <Pill key={s} tone={tone} size="sm">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Pill>
            ))}
          </div>
        </div>
        <nav aria-label="Factor groups" className="mt-3 flex flex-wrap gap-1.5">
          {m.groups.map((g) => (
            <a key={g.group} href={`#group-${slug(g.group)}`} className="inline-flex items-center rounded-full bg-subtle px-2.5 py-1 text-sm text-ink-soft ring-1 ring-inset ring-line-soft hover:bg-hover hover:text-ink max-sm:min-h-11">
              {g.group}
            </a>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-6">
          {m.groups.map((g) => (
            <div key={g.group} id={`group-${slug(g.group)}`} className="scroll-mt-6">
              <h4 className="m-0 mb-2 flex items-center gap-2 text-base font-semibold text-ink">
                {g.group}
                <Badge tone="outline">{g.rows.length}</Badge>
              </h4>
              <Table caption={g.group} density="compact">
                <THead>
                  <tr>
                    <TH>Parameter</TH>
                    <TH>Value</TH>
                    <TH>Source</TH>
                    <TH>Status</TH>
                  </tr>
                </THead>
                <TBody>
                  {g.rows.map((r) => (
                    <TR key={r.id}>
                      <TD className="min-w-40 font-medium">{r.label}</TD>
                      <TD className="min-w-40">
                        <span className="tabular-nums">{r.value}</span>
                        {r.unit ? <span className="block text-xs text-muted">{r.unit}</span> : null}
                      </TD>
                      <TD muted className="min-w-64 whitespace-normal text-sm">
                        {r.source}
                      </TD>
                      <TD>
                        <Pill tone={STATUS_TONE[r.status] ?? 'neutral'} size="sm">
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Pill>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function NoteCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-surface p-4">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
      <div className="min-w-0 text-sm text-ink-soft">
        <p className="m-0 text-base font-semibold text-ink">{title}</p>
        <div className="mt-0.5 flex flex-col gap-1.5">{children}</div>
      </div>
    </div>
  )
}

function MethodNotes() {
  const n = useMemo(() => methodologyNotes(), [])
  return (
    <>
      <section aria-labelledby="targets-title" data-testid="methodology-targets">
        <h3 id="targets-title" className="m-0 text-md font-semibold text-ink">
          Targets, certification and costs
        </h3>
        <p className="m-0 mt-0.5 text-sm text-muted">{n.targetNote}</p>
        <div className="mt-3">
          <Table caption="Default targets" density="compact">
            <THead>
              <tr>
                <TH>Goal</TH>
                <TH>From</TH>
                <TH>Default</TH>
                <TH>Basis</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {n.goalDefaults.map((g) => (
                <TR key={g.id}>
                  <TD className="min-w-48 font-medium">{g.goal}</TD>
                  <TD muted className="min-w-48 whitespace-normal text-sm">
                    {g.requirement}
                  </TD>
                  <TD className="min-w-32 whitespace-normal tabular-nums">{g.valueText}</TD>
                  <TD muted className="min-w-64 whitespace-normal text-sm">
                    {g.basis}
                  </TD>
                  <TD>
                    <Pill tone={STATUS_TONE[g.status.toLowerCase()] ?? 'neutral'} size="sm">
                      {g.status}
                    </Pill>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <NoteCard icon={Tag} title="Costs and savings">
            <p className="m-0">{n.financeFormula}</p>
            <p className="m-0 text-muted">{n.financeNote}</p>
          </NoteCard>
          <NoteCard icon={Award} title="Certification">
            <p className="m-0">Reused materials are mapped to the credits they can support in BREEAM, LEED and WELL, and each credit is tracked with its evidence.</p>
            <p className="m-0 text-muted">{n.certificationNote}</p>
          </NoteCard>
          <NoteCard icon={Landmark} title="Requirements">
            <p className="m-0">Each project tracks the planning and sustainability requirements chosen for its location, with a status and evidence for each. Each donor building tracks the ones that apply before demolition. Entries marked Not yet summarised name the document to check and summarise nothing yet.</p>
            <p className="m-0 text-muted">{n.requirementsNote}</p>
          </NoteCard>
          <NoteCard icon={FileText} title="Circular economy statement">
            <p className="m-0">Written from the project&apos;s records in {n.statementSections.length} sections: {n.statementSections.map((x) => x.toLowerCase()).join(', ')}. The consultant can replace any section; a later change in the figures is flagged.</p>
            <p className="m-0 text-muted">{n.statementNote}</p>
          </NoteCard>
        </div>
      </section>

      <section aria-labelledby="references-title" data-testid="methodology-references">
        <h3 id="references-title" className="m-0 text-md font-semibold text-ink">
          Planning and sustainability references
        </h3>
        <p className="m-0 mt-0.5 max-w-3xl text-sm text-muted">
          {n.referencesNote} {n.localNote}
        </p>
        <div className="mt-3">
          <Table caption="Planning and sustainability references" density="compact">
            <THead>
              <tr>
                <TH>Reference</TH>
                <TH>Source</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {n.references.map((r) => (
                <TR key={r.title}>
                  <TD className="min-w-56 whitespace-normal font-medium">{r.title}</TD>
                  <TD muted className="min-w-56 whitespace-normal text-sm">
                    {r.source}
                  </TD>
                  <TD>
                    <Pill tone="warning" size="sm">
                      {r.status}
                    </Pill>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </section>
    </>
  )
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const V2: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: GripHorizontal, title: 'Drag availability on the programme', text: "Drag a material's availability bar on the project programme to try other dates and see the timing check update. A change would go to the seller as a request, never straight to their record." },
  { icon: Network, title: 'Match a BIM model or steel schedule', text: 'Upload a model or a schedule and match every member against the whole marketplace, with lengths, sections and grades checked for you.' },
  { icon: Boxes, title: 'BIM families', text: 'Download a reclaimed material as a native Revit family, ready to place in the model with its record attached. IFC files are available now.' },
  { icon: Users, title: 'Real accounts and shared data', text: 'Organisations work together on one shared record instead of a sandbox in each browser, with invitations by email.' },
  { icon: Database, title: 'Life cycle assessment and product declarations', text: 'Connect a life cycle assessment database and Environmental Product Declarations, so carbon figures come from reviewed sources.' },
  { icon: PackageCheck, title: 'Use your own donor materials', text: 'Allocate lots from your own donor buildings straight to your own new project, without a reservation request.' },
  { icon: KeyRound, title: 'Secure share links', text: 'Share and claim links with random tokens and an expiry date, in place of the sandbox links made from a counter.' },
  { icon: Target, title: 'Propose a target', text: 'Clients propose a target to the consultant from the project, instead of asking outside the product.' },
  { icon: Handshake, title: 'Trusted practices', text: 'A client lets a practice it works with add projects without asking each time.' },
]

function VersionTwo() {
  return (
    <div className="flex flex-col gap-6" data-testid="version-2">
      <div>
        <h2 className="m-0 text-xl font-semibold text-ink">Version 2</h2>
        <p className="m-0 mt-1 max-w-2xl text-base text-muted">What comes next. {LABELS.L35}</p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
        {V2.map((x) => {
          const Icon = x.icon
          return (
            <li key={x.title}>
              <Card className="h-full">
                <CardBody className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-subtle text-ink-soft ring-1 ring-inset ring-line-soft">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <Pill size="sm">Soon</Pill>
                  </div>
                  <h3 className="m-0 text-base font-semibold text-ink">{x.title}</h3>
                  <p className="m-0 text-sm text-ink-soft">{x.text}</p>
                </CardBody>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Help
