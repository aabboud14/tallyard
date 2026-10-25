// The site surveyor's home as a dashboard: four figures, Capture as the main action, appointments by client with
// each building drawn from its survey and its survey steps, the firm's own buildings not yet linked to an owner,
// and recent activity (collapsed). Every figure comes from surveyorDashboard (P2).
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Building2, CalendarClock, Camera, ClipboardList, List, Mail, Plus, Users } from 'lucide-react'
import type { Typology } from '../../domain/v1types'
import { formatDate } from '../../domain/dates'
import { useView } from '../../store'
import type { SurveyStatus } from '../../store'
import { surveyorDashboard, surveySteps, type SurveyorDashboard } from '../../store/selectors/home-surveyor'
import type { AppointmentBuilding } from '../../store/selectors/surveyor'
import type { ClaimState } from '../../store/selectors/claims'
import { Avatar, BuildingThumb, BuildingThumbnail, Button, Card, cx, Donut, EmptyState, MARK, MetricGrid, MetricTile, PageHeader, Pill, SegmentedBar, TYPOLOGY_FILL, type Tone } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { SURVEY_TONE } from '../buildings/labels'
import { ActivityPanel } from './ActivityPanel'
import { MergeCallouts } from '../buildings/MergeCallout'
import { TileChart } from './TileChart'
import { BuildingRequirementsLine } from './BuildingRequirementsLine'
import { FirstRunCard } from './FirstRunCard'

const SURVEYOR_FIRST_STEPS = [
  { title: 'Add a building, or wait for an appointment', text: 'Add a building your firm is surveying now. When an owner appoints your firm, their buildings appear here too.' },
  { title: 'Capture each item on site', text: 'Photos, sizes, condition and where each item sits, from your phone, room by room.' },
  { title: 'Submit the survey to the owner', text: 'Once the owner confirms the building, you submit the survey and they decide what to recover and list.' },
] as const

const STATUS_ORDER: { key: SurveyStatus; label: string }[] = [
  { key: 'not_started', label: 'Not started' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'submitted', label: 'Submitted' },
]

const TYPOLOGIES: { key: Typology; label: string; word: string }[] = [
  { key: 'structure', label: 'Structure', word: 'structure' },
  { key: 'envelope', label: 'Envelope', word: 'envelope' },
  { key: 'finishes', label: 'Finishes', word: 'finishes' },
]

const CLAIM_TONE: Record<ClaimState['status'], Tone> = { linked: 'brand', not_linked: 'neutral', pending: 'warning', declined: 'danger' }

function Steps({ status, claim = null }: { status: SurveyStatus; claim?: ClaimState | null }) {
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0" aria-label="Survey progress">
      {surveySteps(status, claim?.status ?? null).map((s, i) => {
        const st = s.state
        return (
          <li key={s.key} className="flex items-center gap-2" data-step={s.key} data-state={st}>
            {i > 0 ? <span aria-hidden="true" className={cx('h-px w-4 sm:w-6', st === 'todo' || st === 'waiting' ? 'bg-line' : 'bg-brand-300')} /> : null}
            <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', st === 'todo' ? 'text-faint' : st === 'waiting' ? 'text-ink-soft' : st === 'current' ? 'text-ink' : 'text-brand-700')}>
              {st === 'waiting' ? (
                // Asked and not answered yet: a ring in the warning colour, so it never reads as the current step.
                <span aria-hidden="true" className="size-2 rounded-full border-[1.5px]" style={{ borderColor: MARK.warning }} />
              ) : (
                <span aria-hidden="true" className={cx('size-2 rounded-full', st === 'todo' && 'border border-line-strong')} style={st === 'todo' ? undefined : { background: st === 'current' ? MARK.warning : MARK.brand }} />
              )}
              {s.label}
              {st === 'current' ? <span className="sr-only">, current step</span> : st === 'done' ? <span className="sr-only">, done</span> : st === 'waiting' ? <span className="sr-only">, waiting for the owner</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function TypologyBar({ counts }: { counts: Record<Typology, number> }) {
  const total = counts.structure + counts.envelope + counts.finishes
  return (
    <div className="flex min-w-0 max-w-md flex-col gap-1.5">
      <SegmentedBar label="Items by typology" size="sm" legend={false} segments={TYPOLOGIES.map((t) => ({ key: t.key, label: t.label, count: counts[t.key], tone: 'neutral', colour: TYPOLOGY_FILL[t.key] }))} />
      <p className="m-0 text-xs text-muted">{total === 0 ? 'Nothing captured yet' : TYPOLOGIES.map((t) => `${counts[t.key]} ${t.word}`).join(', ')}</p>
    </div>
  )
}

function Metrics({ v }: { v: SurveyorDashboard }) {
  const m = v.metrics
  const status = STATUS_ORDER.map((s) => ({ key: s.key, label: s.label, value: m.byStatus[s.key], colour: MARK[SURVEY_TONE[s.key]] }))
  return (
    <MetricGrid label="Your figures" testId="home-stats" className="mt-6">
      <MetricTile testId="metric-clients" label="Clients" icon={Users} value={v.stats.clients} sub={v.stats.unlinked > 0 ? `Plus ${v.stats.unlinked} ${v.stats.unlinked === 1 ? 'building' : 'buildings'} not yet linked` : 'Owners who appointed your firm'} />
      <MetricTile
        testId="metric-buildings"
        label="Buildings"
        icon={Building2}
        value={v.stats.buildings}
        sub="Appointed, by survey status"
        footer={<TileChart label="Buildings by survey status" chart={<Donut segments={status} label="Buildings by survey status" size={48} />} legend={status.map((s) => ({ key: s.key, label: s.label, colour: s.colour, valueText: String(s.value) }))} />}
      />
      <MetricTile testId="metric-items" label="Items captured" icon={ClipboardList} value={v.stats.itemsCaptured} sub={m.itemsSubText} />
      <MetricTile testId="metric-open" label="Surveys open" icon={CalendarClock} value={m.open} state={m.openState?.state} stateLabel={m.openState?.label} sub={m.openSubText} />
    </MetricGrid>
  )
}

/** A firm that only dates buildings as their contractor: buildings to date and dates set, no capture or survey counts. */
function ContractorMetrics({ v, t }: { v: SurveyorDashboard; t: NonNullable<SurveyorDashboard['contractorTiles']> }) {
  return (
    <MetricGrid label="Your figures" testId="home-stats" className="mt-6">
      <MetricTile testId="metric-clients" label="Clients" icon={Users} value={v.stats.clients} sub="Owners who invited your firm" />
      <MetricTile testId="metric-to-date" label="Buildings to date" icon={Building2} value={t.buildings} sub={t.buildingsSubText} />
      <MetricTile testId="metric-dated" label="Dates set" icon={CalendarClock} value={t.dated} sub={t.datedSubText} />
      <MetricTile testId="metric-undated" label="Still to date" icon={ClipboardList} value={t.undated} state={t.undatedState?.state} stateLabel={t.undatedState?.label} sub={t.undatedSubText} />
    </MetricGrid>
  )
}

function BuildingRow({
  b,
  extra,
  children,
  ask = false,
  merge = false,
  claim = null,
}: {
  b: AppointmentBuilding
  extra: SurveyorDashboard['extras'][string] | undefined
  children?: ReactNode
  /** Offer to ask the owner to confirm the building. */
  ask?: boolean
  /** Offer to move a building the firm added itself into this appointment, when they look like the same place. */
  merge?: boolean
  /** Where a building the firm added stands with its owner; null for an appointment. */
  claim?: ClaimState | null
}) {
  const contractor = b.role === 'contractor'
  return (
    <li className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:px-5" data-testid={`home-building-${b.id}`}>
      {/* A phone shows the drawing full width above the name; wider screens a compact one beside it. */}
      {extra ? <BuildingThumbnail sketch={extra.sketch} aspect="16/10" rounded="md" fit className="w-full sm:hidden" testId={`home-building-thumb-${b.id}`} /> : null}
      {extra ? <BuildingThumb sketch={extra.sketch} size="lg" decorative={false} className="shrink-0 max-sm:hidden" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={b.href} className="inline-flex items-center text-md font-semibold text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4 max-sm:min-h-11">
              {b.name}
            </Link>
            <Pill tone={SURVEY_TONE[b.status]} dot size="sm">
              {b.statusLabel}
            </Pill>
            {b.setsDates ? (
              <Pill tone="info" size="sm" data-testid={`contractor-pill-${b.id}`}>
                {contractor ? 'Contractor' : 'Surveyor and contractor'}
              </Pill>
            ) : null}
            {children}
          </div>
          <p className="m-0 mt-0.5 truncate text-sm text-muted">{b.address}</p>
        </div>
        {contractor ? null : <Steps status={b.status} claim={claim} />}
        {extra ? <TypologyBar counts={extra.byTypology} /> : null}
        {extra?.requirements ? <BuildingRequirementsLine r={extra.requirements} testId={`home-building-requirements-${b.id}`} /> : null}
        {merge ? <MergeCallouts intoId={b.id} /> : null}
        <p className="m-0 text-sm text-ink-soft">
          {contractor ? (
            <>
              Dates set for <span className="font-medium tabular-nums text-ink">{b.datedCount}</span> of {b.itemCount} items
            </>
          ) : (
            <>
              <span className="font-medium tabular-nums text-ink">{b.itemCount}</span> {b.itemCount === 1 ? 'item' : 'items'} captured
              {b.lastCaptureOn ? <span className="text-muted">, last on {formatDate(b.lastCaptureOn)}</span> : null}
              {b.setsDates ? (
                <span className="text-muted" data-testid={`dates-set-${b.id}`}>
                  . Dates set for {b.datedCount} of {b.itemCount}
                </span>
              ) : null}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:flex-nowrap md:flex-row">
        {contractor ? (
          <Button asChild variant="primary" icon={CalendarClock} className="max-sm:flex-1">
            <Link to={`${b.href}/availability`}>Set dates</Link>
          </Button>
        ) : (
          <>
            {ask ? (
              <Button asChild icon={Mail} className="max-sm:flex-1">
                <Link to={b.href} data-testid={`ask-owner-${b.id}`}>
                  Ask the owner
                </Link>
              </Button>
            ) : null}
            <Button asChild icon={List} className="max-sm:flex-1">
              <Link to={`${b.href}/inventory`}>Inventory</Link>
            </Button>
            {b.setsDates ? (
              <Button asChild icon={CalendarClock} className="max-sm:flex-1">
                <Link to={`${b.href}/availability`} data-testid={`set-dates-${b.id}`}>
                  Set dates
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="primary" icon={Camera} className="max-sm:flex-1">
              <Link to={`${b.href}/capture`} data-testid={`capture-${b.id}`}>
                Capture
              </Link>
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

export function SurveyorHome() {
  const v = useView(surveyorDashboard)
  if (!v) return null
  const none = v.appointments.length === 0
  return (
    <Page testId="surveyor-home">
      <PageHeader
        title={v.greeting}
        subtitle={v.dateText}
        actions={
          // A firm that only dates buildings as their contractor gets neither: adding a building starts a survey of the
          // firm's own, and Appointments offers it with a word on what it is for.
          v.contractorTiles ? null : (
            <>
              <Button asChild icon={Plus}>
                <Link to="/app/buildings?new=1" data-testid="home-add-building">
                  Add building
                </Link>
              </Button>
              <Button asChild variant="primary" icon={Camera}>
                <Link to={v.quickCapture.href} data-testid="home-capture">
                  Capture
                </Link>
              </Button>
            </>
          )
        }
      />
      {v.firstRun ? null : v.contractorTiles ? <ContractorMetrics v={v} t={v.contractorTiles} /> : <Metrics v={v} />}

      <section aria-labelledby="appointments-title" className="mt-10 flex min-w-0 flex-col gap-4">
        <SectionTitle id="appointments-title" title="Your appointments" description="Buildings owners appointed your firm to survey or to date, by client." className="mb-0" />
        {v.firstRun ? (
          <FirstRunCard
            spot="building"
            titleAs="h3"
            testId="surveyor-first-run"
            title="No appointments yet"
            text="Buildings your firm surveys appear here, by client, each drawn from its survey with its progress."
            steps={SURVEYOR_FIRST_STEPS}
            actions={
              <Button asChild variant="primary" icon={Plus}>
                <Link to="/app/buildings?new=1">Add building</Link>
              </Button>
            }
          />
        ) : none ? (
          <Card>
            <EmptyState
              illustration="building"
              title="No appointments yet"
              text="When an owner appoints your firm, buildings appear here. You can also add a building yourself and start capturing now."
              action={
                <Button asChild variant="primary" icon={Plus}>
                  <Link to="/app/buildings?new=1">Add building</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          v.appointments.map((g) => (
            <Card key={g.orgId} data-testid={`client-${g.orgId}`}>
              <div className="flex items-center gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
                <Avatar name={g.clientName} shape="square" size="md" decorative />
                <div className="min-w-0">
                  <h3 className="m-0 truncate text-base font-semibold text-ink">{g.clientName}</h3>
                  <p className="m-0 text-sm text-muted">
                    {g.buildings.length} {g.buildings.length === 1 ? 'building' : 'buildings'}
                  </p>
                </div>
              </div>
              <ul className="m-0 list-none divide-y divide-line-soft p-0">
                {g.buildings.map((b) => (
                  <BuildingRow key={b.id} b={b} extra={v.extras[b.id]} merge />
                ))}
              </ul>
            </Card>
          ))
        )}
      </section>

      {v.unlinked.length > 0 ? (
        <section aria-labelledby="unlinked-title" className="mt-10" data-testid="home-unlinked">
          <SectionTitle id="unlinked-title" title="Not yet linked" description="Buildings your firm added. They stay private to your firm until the owner confirms them, and the survey can be submitted only after that." />
          <Card>
            <ul className="m-0 list-none divide-y divide-line-soft p-0">
              {v.unlinked.map((b) => (
                <BuildingRow key={b.id} b={b} extra={v.unlinkedExtras[b.id]} claim={b.claim} ask={b.claim.status === 'not_linked' || b.claim.status === 'declined'}>
                  <Pill tone={CLAIM_TONE[b.claim.status]} dot size="sm" data-testid={`claim-${b.id}`}>
                    {b.claim.label}
                  </Pill>
                </BuildingRow>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <ActivityPanel panelId="home-activity-surveyor" rows={v.activity} summary={v.activitySummary} emptyText="Your captures and submissions appear here." className="mt-10" />
    </Page>
  )
}

export default SurveyorHome
