// The sustainability consultant's home as a dashboard: four figures, each project against its effective targets
// (reused and recycled content by value and upfront carbon avoided by reuse, as on Goals and targets, as target
// meters, then its requirement tracking with any at risk) with links to its Sustainability, Goals and targets,
// Certification and Requirements tabs, the waste engagements and recent activity (collapsed). Indicative throughout.
// Every figure and state comes from consultantDashboard (P2).
import { Link } from 'react-router'
import { ArrowRight, FileSpreadsheet, FolderKanban, Leaf, Recycle, Target, TriangleAlert } from 'lucide-react'
import * as f from '../../domain/format'
import { useView } from '../../store'
import { consultantDashboard, type ConsultantDashboard, type TargetRowView } from '../../store/selectors/home-consultant'
import { NO_RESULT_TEXT } from '../../store/selectors/dashboard'
import { Card, Donut, EmptyState, IndicativeMarker, MARK, METRIC_STATE, MetricGrid, MetricTile, PageHeader, Pill, ProgressRing, ProjectThumbnail, RibaStageStrip, TargetMeter } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ActivityPanel } from './ActivityPanel'
import { PendingLinkRequests } from '../projects/LinkRequests'
import { TileChart } from './TileChart'
import { FirstRunCard } from './FirstRunCard'

const CONSULTANT_FIRST_STEPS = [
  { title: 'An architect adds your consultancy', text: 'Ask the architect to choose your consultancy on the project\'s Team page. Accept the request and the project appears here.' },
  { title: 'Set the goals and targets', text: 'Reused content, avoided carbon and the schemes the project reports against, each overridable per project.' },
  { title: 'Write the circular economy statement', text: 'Drafted from the project\'s records. You edit it and send it to the client for review.' },
] as const

function Metrics({ v }: { v: ConsultantDashboard }) {
  const m = v.metrics
  // The same words and colours as each project's meters (metricState), so one state reads one way.
  const targets = [
    { key: 'met', label: METRIC_STATE.good.label, value: m.targetsMet, colour: MARK[METRIC_STATE.good.tone] },
    { key: 'near', label: METRIC_STATE.warning.label, value: m.targetsNear, colour: MARK[METRIC_STATE.warning.tone] },
    { key: 'off', label: METRIC_STATE.critical.label, value: m.targetsOff, colour: MARK[METRIC_STATE.critical.tone] },
    { key: 'waiting', label: NO_RESULT_TEXT, value: m.targetsWaiting, colour: MARK.neutral },
  ].filter((t) => t.value > 0)
  return (
    <MetricGrid label="Your figures" testId="home-stats" className="mt-6">
      <MetricTile testId="metric-projects" label="Projects" icon={FolderKanban} value={v.stats.projects} sub={m.targetsSetText} />
      <MetricTile
        testId="metric-carbon"
        label="Avoided carbon, secured"
        icon={Leaf}
        value={m.carbonValueText}
        unit="tCO2e"
        indicative
        state={m.carbonState?.state}
        stateLabel={m.carbonState?.label}
        sub={m.carbonTargetT > 0 ? `Of ${f.number(m.carbonTargetT, 0)} tCO2e targeted` : 'No carbon targets set'}
        footer={
          m.carbonTargetT > 0 ? (
            <TileChart
              label="Secured avoided carbon against the targets"
              chart={<ProgressRing value={m.carbonSecuredT} max={m.carbonTargetT} state={m.carbonState?.state} label="Secured avoided carbon against the targets" valueText={`${m.carbonValueText} of ${f.number(m.carbonTargetT, 0)} tCO2e`} size={48} />}
              note={`${f.percent(m.carbonShare)} of the target. ${f.number(m.carbonApprovedT, 1)} tCO2e more with approved materials`}
            />
          ) : undefined
        }
      />
      <MetricTile
        testId="metric-targets"
        label="Targets met"
        icon={Target}
        value={
          <>
            {m.targetsMet}
            <span className="text-base font-medium text-muted"> of {m.targetsSet}</span>
          </>
        }
        state={m.targetsState?.state}
        stateLabel={m.targetsState?.label}
        sub={m.targetsScopeText}
        footer={m.targetsSet > 0 ? <TileChart label="Targets" chart={<Donut segments={targets} label="Targets" size={48} />} legend={targets.map((t) => ({ key: t.key, label: t.label, colour: t.colour, valueText: String(t.value) }))} /> : undefined}
      />
      <MetricTile testId="metric-engagements" label="Waste engagements" icon={Recycle} value={v.stats.engagements} sub={`${m.billsReviewed} ${m.billsReviewed === 1 ? 'bill' : 'bills'} reviewed`} href={v.engagements[0]?.href} />
    </MetricGrid>
  )
}

function Meter({ label, t, testId }: { label: string; t: TargetRowView; testId: string }) {
  return (
    <TargetMeter
      testId={testId}
      label={label}
      value={t.meter.value}
      max={t.meter.max}
      target={t.meter.target}
      valueText={t.actualText}
      targetText={t.aimText}
      state={t.meter.state}
      stateText={t.statusText}
    />
  )
}

function Requirements({ r }: { r: ConsultantDashboard['rows'][number] }) {
  const q = r.requirements
  return (
    <div className="flex flex-col gap-1.5 border-t border-line-soft px-4 py-3.5 sm:px-5" data-testid={`consultant-requirements-${r.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium text-ink">Requirements</span>
        <span className="flex items-center gap-2 text-sm tabular-nums text-ink-soft">
          {q.readyText}
          {q.atRisk > 0 ? (
            <Pill size="sm" tone="warning" icon={TriangleAlert}>
              {q.atRisk} at risk
            </Pill>
          ) : null}
        </span>
      </div>
      {q.atRiskItems.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {q.atRiskItems.map((x) => (
            <li key={x.id}>
              <Link to={x.href} className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm text-ink-soft outline-none hover:text-ink hover:underline hover:underline-offset-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:min-h-11" data-testid={`consultant-at-risk-${r.id}-${x.id}`}>
                Check {x.title}
                <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function ProjectCard({ r }: { r: ConsultantDashboard['rows'][number] }) {
  return (
    <Card as="article" className="flex flex-col" data-testid={`consultant-project-${r.id}`}>
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <ProjectThumbnail sketch={r.sketch} aspect="16/10" rounded="md" className="w-24 shrink-0 2xl:w-[120px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="min-w-0">
            <h3 className="m-0 truncate text-md font-semibold text-ink">
              <Link to={r.href} className="rounded-sm outline-none hover:underline hover:decoration-line-strong hover:underline-offset-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
                {r.name}
              </Link>
            </h3>
            <p className="m-0 mt-0.5 truncate text-sm text-muted">{r.clientName}</p>
            {r.locationText ? (
              <p className="m-0 truncate text-xs text-muted" data-testid={`consultant-location-${r.id}`}>
                {r.locationText}
              </p>
            ) : null}
          </div>
          <RibaStageStrip stage={r.plannedStage ?? r.stage} showLabel size="sm" className="text-sm text-ink-soft" />
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-line-soft px-4 py-4 sm:px-5">
        <Meter label={r.content.label} t={r.content} testId={`meter-content-${r.id}`} />
        <Meter label={r.carbon.label} t={r.carbon} testId={`meter-carbon-${r.id}`} />
      </div>
      <Requirements r={r} />
      <nav aria-label={`${r.name} pages`} className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line-soft px-4 py-2.5 sm:px-5">
        {r.links.map((l) => (
          <Link key={l.id} to={l.href} className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-brand-700 outline-none hover:underline hover:underline-offset-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:min-h-11">
            {l.label}
          </Link>
        ))}
      </nav>
    </Card>
  )
}

export function ConsultantHome() {
  const v = useView(consultantDashboard)
  if (!v) return null
  return (
    <Page testId="consultant-home">
      <PageHeader title={v.greeting} subtitle={v.dateText} />
      <PendingLinkRequests className="mt-6" />
      {/* A new consultancy has no figures yet; the first steps below lead instead of four zero tiles. */}
      {v.firstRun ? null : <Metrics v={v} />}

      <section aria-labelledby="projects-title" className="mt-10">
        <SectionTitle id="projects-title" title="Projects against targets" description="Reused and recycled content by value and upfront carbon avoided by reuse, secured, against the targets set for each project." actions={<IndicativeMarker />} />
        {v.rows.length === 0 ? (
          <FirstRunCard spot="targets" titleAs="h3" testId="consultant-first-run" title="No projects yet" text="When an architect adds your consultancy to a project and you accept, it appears here with its targets and figures." steps={CONSULTANT_FIRST_STEPS} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3" data-testid="consultant-projects">
            {v.rows.map((r) => (
              <ProjectCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="engagements-title" className="mt-10">
        <SectionTitle id="engagements-title" title="Waste engagements" description="Demolition bills for buildings coming down, reviewed for diversion and reuse." />
        {v.engagements.length === 0 ? (
          <Card>
            <EmptyState illustration="materials" title="No engagements" text="Waste engagements you are given appear here, ready to import the demolition bill." />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {v.engagements.map((e) => (
              <Card key={e.id} interactive padding="md" className="flex items-start gap-3.5" data-testid={`engagement-${e.id}`}>
                <FileSpreadsheet aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-faint" />
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-base font-semibold text-ink">
                    <Link to={e.href} className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']">
                      {e.name}
                    </Link>
                  </h3>
                  <p className="m-0 mt-0.5 text-sm text-muted">{e.period}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <Pill tone={e.hasBill ? 'brand' : 'neutral'} dot size="sm">
                      {e.hasBill ? 'Bill reviewed' : 'No bill loaded'}
                    </Pill>
                    <ArrowRight aria-hidden="true" className="size-4 text-faint" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <ActivityPanel panelId="home-activity-consultant" rows={v.activity} summary={v.activitySummary} emptyText="Decisions and reservations on your projects appear here." className="mt-10" />
    </Page>
  )
}

export default ConsultantHome
