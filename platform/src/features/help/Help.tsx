// Help: getting started for each workspace, the methodology behind every indicative figure (each factor and price
// with its source and status), and what version 2 adds.
import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { BookOpen, Boxes, Building2, Camera, ChevronDown, ClipboardCheck, Compass, Database, FileSpreadsheet, Gauge, Handshake, Info, Layers, Leaf, ListOrdered, Network, Recycle, Rocket, Scale, Share2, ShieldCheck, Tag, Timer, Users } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import { useSession, type PlatformRole } from '../../store'
import { methodologyView } from '../../store/selectors/settings'
import { scoreWeights } from '../../store/selectors/roles-views'
import { Badge, Card, CardBody, cx, Pill, Table, TBody, TD, TH, THead, TR, type Tone } from '../../ui'
import { Page } from '../../app/Page'

const TOPICS = [
  { id: 'getting-started', label: 'Getting started', icon: Rocket },
  { id: 'methodology', label: 'Methodology', icon: BookOpen },
  { id: 'version-2', label: 'Version 2', icon: Boxes },
] as const

export function Help() {
  const { topic = 'getting-started' } = useParams()
  const current = TOPICS.find((t) => t.id === topic)?.id ?? 'getting-started'
  return (
    <Page testId="help">
      <h1 className="m-0 text-2xl font-semibold text-ink">Help</h1>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-10">
        <nav aria-label="Help topics" className="-mx-4 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:w-52 lg:shrink-0 lg:overflow-visible lg:px-0">
          <ul className="m-0 flex w-max list-none gap-1 p-0 lg:sticky lg:top-6 lg:w-auto lg:flex-col">
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
        <div className="min-w-0 flex-1">{current === 'methodology' ? <Methodology /> : current === 'version-2' ? <VersionTwo /> : <GettingStarted />}</div>
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
      { icon: Compass, title: 'Browse Discover', text: 'Filter by typology, family and availability. Pick a project in "Checking against" to see whether each material arrives in time.', href: '/app/discover', cta: 'Open Discover' },
      { icon: Tag, title: 'Save to a project', text: 'Save materials to a project shortlist, or to Saved when you have no project for them yet.', href: '/app/saved', cta: 'Saved' },
      { icon: Handshake, title: 'Send to your client', text: 'From the shortlist, select materials and send them for approval with a message. The client approves or declines.', href: '/app/projects', cta: 'Your projects' },
      { icon: FileSpreadsheet, title: 'Export the specification', text: 'Approved materials make the specification schedule: export the spreadsheet or print it, and download DXF or OBJ geometry.' },
    ],
  },
  client: {
    title: 'Clients and developers',
    intro: 'Approve what your architect proposes, then reserve it with the seller.',
    steps: [
      { icon: ClipboardCheck, title: 'Review approvals', text: 'Each material comes with its facts, the timeline check, avoided carbon and the guide price range. Approve or decline with a note.' },
      { icon: Handshake, title: 'Request a reservation', text: 'For an approved material, see the indicative package for storage, testing and delivery, then ask the seller to hold it.' },
      { icon: Users, title: 'Meet the seller', text: 'The seller sees your project as a blind line. When they accept, you both see each other\'s organisation and contact.' },
    ],
  },
  owner: {
    title: 'Asset owners',
    intro: 'Know what your buildings hold and decide what is visible, to whom and from when.',
    steps: [
      { icon: Building2, title: 'Add a building and appoint a surveyor', text: 'The surveyor captures each item. You are told as items arrive and when the survey is submitted.', href: '/app/buildings', cta: 'Buildings' },
      { icon: ListOrdered, title: 'Decide what to recover', text: 'Priorities ranks items by net value, avoided carbon, demand and ease, with their route on the UK decision tree.' },
      { icon: Share2, title: 'Share or publish', text: 'Keep a lot private, share it in confidence with projects you choose, or publish it. Set the ask, the reserve and the date.' },
      { icon: Handshake, title: 'Answer requests', text: 'Buyers stay anonymous until you accept. Accepting holds the lot and exchanges contacts.', href: '/app/requests', cta: 'Requests' },
    ],
  },
  surveyor: {
    title: 'Site surveyors',
    intro: 'Capture each material on site from a phone, then hand the survey to the owner.',
    steps: [
      { icon: Camera, title: 'Capture on site', text: 'Describe the item in your own words and the fields fill: family, size, quantity. Grade its condition and recoverability, add photos.' },
      { icon: Timer, title: 'Say when it comes out', text: 'Set the month you expect it to be free. It starts at the dismantling date in the programme; the owner sets the final date.' },
      { icon: ClipboardCheck, title: 'Submit the survey', text: 'When the walk-round is done, submit the survey. The owner is told at once. You can reopen it to add more.' },
    ],
  },
  consultant: {
    title: 'Sustainability consultants',
    intro: 'Follow avoided carbon on each project and produce the compliance outputs.',
    steps: [
      { icon: Leaf, title: 'Read the carbon', text: 'Each project\'s Carbon tab totals avoided carbon and mass by status and by typology.' },
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
          <Link to={step.href} className="mt-2 inline-flex rounded-sm text-sm font-medium text-brand-700 hover:underline max-sm:min-h-11 max-sm:items-center">
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
  { icon: Tag, title: 'Guide price', text: `A range from the family's reference price, adjusted for condition, testing and demand. ${LABELS.L10}.` },
  { icon: Handshake, title: 'Indicative package', text: 'Storage at the nearest suitable yard until the start, testing where the material is untested, handling and delivery to site.' },
  { icon: ListOrdered, title: 'Priority ranking', text: `Out of 100 points: ${scoreWeights().map((w) => `${w.label.toLowerCase()} ${w.max}`).join(', ')}. Items that would cost more to recover than they fetch, or will not come out intact, go to recycling.` },
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
            <a key={g.group} href={`#group-${slug(g.group)}`} className="rounded-full bg-subtle px-2.5 py-1 text-sm text-ink-soft ring-1 ring-inset ring-line-soft hover:bg-hover hover:text-ink max-sm:py-2.5">
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

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const V2: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Network, title: 'Match a BIM model or steel schedule', text: 'Upload a model or a schedule and match every member against the whole marketplace, with lengths, sections and grades checked for you.' },
  { icon: Boxes, title: 'BIM families', text: 'Download a reclaimed material as a Revit family or an IFC object, ready to place in the model with its record attached.' },
  { icon: Users, title: 'Real accounts and shared data', text: 'Organisations work together on one shared record instead of a sandbox in each browser, with invitations by email.' },
  { icon: Database, title: 'Life cycle assessment and product declarations', text: 'Connect a life cycle assessment database and Environmental Product Declarations, so carbon figures come from reviewed sources.' },
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
