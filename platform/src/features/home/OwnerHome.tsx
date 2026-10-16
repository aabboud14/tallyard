// The donor building owner's home as a dashboard: four figures, what waits on the owner (reservation requests, with
// the buyer kept blind, and buildings surveyors ask the owner to confirm), each donor building and New project drawn
// with its kind, and recent activity (collapsed). Every figure comes from ownerDashboard (P2).
import { Link } from 'react-router'
import { ArrowRight, Building2, CalendarDays, EyeOff, FolderPlus, Inbox, Layers, Leaf, Plus, Store } from 'lucide-react'
import * as f from '../../domain/format'
import type { Typology } from '../../domain/v1types'
import { useView } from '../../store'
import { ownerDashboard, type OwnerBuildingCard, type OwnerDashboard, type OwnerProjectCard } from '../../store/selectors/home-owner'
import type { ClaimRow } from '../../store/selectors/claims'
import type { RequestRow } from '../../store/selectors/owner'
import { BuildingThumbnail, Button, Card, Donut, EmptyState, Legend, MARK, MaterialImage, MetricGrid, MetricTile, PageHeader, Pill, ProjectThumbnail, SegmentedBar, TYPOLOGY_FILL } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { SURVEY_TONE, visibilitySegments } from '../buildings/labels'
import { ActivityPanel } from './ActivityPanel'
import { TileChart } from './TileChart'
import { FirstRunCard } from './FirstRunCard'

const TYPOLOGIES: { key: Typology; label: string }[] = [
  { key: 'structure', label: 'Structure' },
  { key: 'envelope', label: 'Envelope' },
  { key: 'finishes', label: 'Finishes' },
]

const OWNER_FIRST_STEPS = [
  { title: 'Add a building coming down', text: 'Its address, storeys and when dismantling starts. A building going up is added the same way, as a new project.' },
  { title: 'Appoint a surveyor', text: 'They capture each item on site and submit the survey to you.' },
  { title: 'Decide what to recover and who may see it', text: 'Publish each item to the Marketplace, share it with chosen architects, or keep it private.' },
] as const

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function Metrics({ v }: { v: OwnerDashboard }) {
  const s = v.stats
  const m = v.metrics
  const typology = TYPOLOGIES.map((t) => ({ key: t.key, label: t.label, value: m.byTypology[t.key], colour: TYPOLOGY_FILL[t.key] }))
  const visibility = [
    { key: 'open', label: 'Published', value: s.listed, colour: MARK.brand },
    { key: 'shared', label: 'Shared', value: s.shared, colour: MARK.info },
    { key: 'private', label: 'Private', value: m.privateCount, colour: MARK.neutral },
  ]
  const parts = [s.requestsAwaiting > 0 ? plural(s.requestsAwaiting, 'reservation', 'reservations') : null, s.claimsAwaiting > 0 ? plural(s.claimsAwaiting, 'building to confirm', 'buildings to confirm') : null].filter(Boolean)
  return (
    <MetricGrid label="Your figures" testId="home-stats" className="mt-6">
      <MetricTile
        testId="metric-items"
        label="Items surveyed"
        icon={Layers}
        value={f.number(s.itemsSurveyed)}
        sub={`Across ${plural(s.donorBuildings, 'donor building', 'donor buildings')}`}
        footer={<TileChart label="Items by typology" chart={<Donut segments={typology} label="Items by typology" size={48} />} legend={typology.map((t) => ({ key: t.key, label: t.label, colour: t.colour, valueText: String(t.value) }))} />}
      />
      <MetricTile
        testId="metric-listed"
        label="Listed"
        icon={Store}
        value={m.listed}
        sub={`${s.listed} published, ${s.shared} shared, ${s.reserved} reserved`}
        footer={<TileChart label="Items by visibility" chart={<Donut segments={visibility} label="Items by visibility" size={48} />} legend={visibility.map((t) => ({ key: t.key, label: t.label, colour: t.colour, valueText: String(t.value) }))} />}
      />
      <MetricTile
        testId="metric-requests"
        label="Requests awaiting you"
        icon={Inbox}
        value={m.awaiting}
        state={m.requestState?.state}
        stateLabel={m.requestState?.label}
        sub={parts.length > 0 ? parts.join(' and ') : 'Nothing to decide'}
        href="/app/requests"
      />
      <MetricTile testId="metric-carbon" label="Avoidable carbon" icon={Leaf} value={f.number(s.potentialAvoidedT, 1)} unit="tCO2e" indicative sub="If recovered as the recovery plan ranks" />
    </MetricGrid>
  )
}

function RequestItem({ r, v }: { r: RequestRow; v: OwnerDashboard }) {
  const thumb = v.requestThumbs[r.id]
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-page sm:px-5" data-testid={`home-request-${r.id}`}>
      {thumb ? <MaterialImage spec={thumb.spec} publicId={thumb.publicId} aspect="1/1" rounded="md" className="size-10 shrink-0" /> : null}
      <div className="min-w-0 flex-1">
        <p className="m-0 flex min-w-0 items-center gap-2 text-base">
          <span className="shrink-0 font-mono text-xs text-muted">{r.tag}</span>
          <Link to="/app/requests" className="truncate font-medium text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-brand-600">
            {r.title}
          </Link>
        </p>
        <p className="m-0 mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-muted">
          <EyeOff aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{r.buyer.kind === 'blind' ? r.buyer.text : r.buyer.org}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted sm:flex-row sm:items-center sm:gap-3">
        <Pill tone="info" dot size="sm">
          Reservation
        </Pill>
        <span className="max-sm:text-xs">{r.timeAgo}</span>
      </div>
    </li>
  )
}

function ClaimItem({ c }: { c: ClaimRow }) {
  return (
    <li className="relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-page sm:px-5" data-testid={`home-claim-${c.id}`}>
      <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-paper text-ink-soft ring-1 ring-inset ring-line">
        <Building2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-base">
          <Link to="/app/requests?tab=buildings" className="font-medium text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-brand-600">
            Confirm {c.buildingName}
          </Link>
        </p>
        <p className="m-0 mt-0.5 truncate text-sm text-muted">
          Added by {c.surveyorName}, {c.requestedByName}. {plural(c.itemCount, 'item', 'items')} captured
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted sm:flex-row sm:items-center sm:gap-3">
        <Pill tone="warning" dot size="sm">
          Confirmation
        </Pill>
        <span className="max-sm:text-xs">{c.timeAgo}</span>
      </div>
    </li>
  )
}

function WaitingForYou({ v }: { v: OwnerDashboard }) {
  const empty = v.requests.length === 0 && v.claims.length === 0
  return (
    <section aria-labelledby="waiting-title" className="mt-10">
      <SectionTitle
        id="waiting-title"
        title="Requests awaiting you"
        description={empty ? undefined : 'Reservation requests, with the buyer kept anonymous until you accept, and buildings surveyors ask you to confirm.'}
        actions={
          <Button asChild variant="ghost" size="sm" trailingIcon={ArrowRight}>
            <Link to="/app/requests">All requests</Link>
          </Button>
        }
      />
      {empty ? (
        <EmptyState variant="inline" icon={Inbox} title="No requests waiting" text="Reservation requests and buildings surveyors ask you to confirm appear here." />
      ) : (
        <Card>
          <ul className="m-0 list-none divide-y divide-line-soft p-0" data-testid="waiting-for-you">
            {v.requests.map((r) => (
              <RequestItem key={r.id} r={r} v={v} />
            ))}
            {v.claims.map((c) => (
              <ClaimItem key={c.id} c={c} />
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

function KindPill({ label }: { label: string }) {
  return <span className="absolute left-3 top-3 inline-flex h-6 items-center rounded-[5px] bg-surface/95 px-2 text-2xs font-medium text-ink-soft ring-1 ring-line">{label}</span>
}

function BuildingCard({ b }: { b: OwnerBuildingCard }) {
  const typology = TYPOLOGIES.map((t) => ({ key: t.key, label: t.label, colour: TYPOLOGY_FILL[t.key], valueText: String(b.byTypology[t.key]) }))
  return (
    <Card interactive as="article" className="flex flex-col overflow-hidden sm:flex-row" data-testid={`home-building-${b.id}`}>
      <div className="relative shrink-0 border-b border-line-soft sm:w-[42%] sm:border-b-0 sm:border-r">
        <BuildingThumbnail sketch={b.sketch} aspect="4/3" className="sm:h-full" />
        <KindPill label={b.kindLabel} />
      </div>
      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-md font-semibold text-ink">
              <Link to={b.href} className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']">
                {b.name}
              </Link>
            </h3>
            <p className="m-0 mt-0.5 truncate text-sm text-muted">{b.address}</p>
          </div>
          <Pill tone={SURVEY_TONE[b.surveyStatus]} dot size="sm">
            Survey {b.surveyStatusLabel.toLowerCase()}
          </Pill>
        </div>
        <p className="m-0 flex items-center gap-1.5 text-sm text-ink-soft">
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
          {b.programmeText}
        </p>
        <SegmentedBar label={`${b.itemCount} items by visibility`} segments={visibilitySegments(b.counts)} size="sm" />
        <Legend label="Items by typology" items={typology} className="mt-auto gap-x-3 text-xs" />
      </div>
    </Card>
  )
}

function NewProjectCard({ p }: { p: OwnerProjectCard }) {
  return (
    <Card interactive as="article" className="flex flex-col overflow-hidden" data-testid={`home-new-project-${p.id}`}>
      <div className="relative">
        <ProjectThumbnail sketch={p.sketch} aspect="16/10" rounded="top" className="border-b border-line-soft" />
        <KindPill label={p.kindLabel} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-md font-semibold text-ink">
            <Link to={p.href} className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']">
              {p.name}
            </Link>
          </h3>
          <p className="m-0 mt-0.5 truncate text-sm text-muted">
            {p.typeLabel}, {p.architectName ?? 'No architect yet'}
          </p>
        </div>
        <p className="m-0 text-sm text-ink-soft">{p.stageText}</p>
        <p className="m-0 flex items-center gap-1.5 text-sm text-ink-soft">
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
          Materials needed from <span className="font-medium text-ink">{p.startText}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          <Pill tone={p.waitingApprovals > 0 ? 'info' : 'neutral'} dot size="sm">
            {p.waitingApprovals} waiting for approval
          </Pill>
          <Pill tone={p.approved > 0 ? 'brand' : 'neutral'} dot size="sm">
            {p.approved} approved
          </Pill>
        </div>
      </div>
    </Card>
  )
}

export function OwnerHome() {
  const v = useView(ownerDashboard)
  if (!v) return null
  return (
    <Page testId="owner-home">
      <PageHeader
        title={v.greeting}
        subtitle={v.dateText}
        actions={
          <Button asChild variant="primary" icon={Plus}>
            <Link to="/app/buildings?new=1">Add building</Link>
          </Button>
        }
      />
      {v.firstRun ? (
        <div className="mt-6">
          <FirstRunCard
            spot="building"
            testId="owner-first-run"
            title="Add your first building"
            text="Your buildings appear here, each drawn from its survey, with what is listed and the requests waiting on you."
            steps={OWNER_FIRST_STEPS}
            actions={
              <Button asChild variant="primary" icon={Plus}>
                <Link to="/app/buildings?new=1">Add building</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
      <Metrics v={v} />
      <WaitingForYou v={v} />

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] xl:gap-6">
      <section aria-labelledby="buildings-title" className="min-w-0">
        <SectionTitle id="buildings-title" title="Donor buildings" description="Buildings coming down or being stripped out, drawn from their surveys." />
        {v.buildingCards.length === 0 ? (
          <Card>
            <EmptyState
              illustration="building"
              title="Add your first building"
              text="Record a building coming down, appoint a surveyor, and decide what to recover and who may see it."
              action={
                <Button asChild variant="primary" icon={Plus}>
                  <Link to="/app/buildings?new=1">Add building</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {v.buildingCards.map((b) => (
              <BuildingCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="new-projects-title" className="min-w-0">
        <SectionTitle id="new-projects-title" title="New projects" description="Buildings going up or being refurbished, sourced with your architect." />
        {v.newProjectCards.length === 0 ? (
          <Card data-testid="new-projects-empty">
            <EmptyState
              illustration="project"
              title="Building something too?"
              text="Add a new project to source reclaimed materials for it with your architect. You approve what they propose."
              action={
                <Button asChild icon={FolderPlus}>
                  <Link to="/app/buildings?new=1">Add new project</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {v.newProjectCards.map((p) => (
              <NewProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
      </div>
        </>
      )}

      <ActivityPanel panelId="home-activity-owner" rows={v.activity} summary={v.activitySummary} emptyText="Captures, listings and requests across your buildings appear here." className="mt-10" />
    </Page>
  )
}

export default OwnerHome
