// The architect's home as a dashboard: four figures coloured by their state, the projects with a drawing, the
// planned RIBA stage, fit and shortlist progress and how many new materials fit each, what is waiting for
// approval, avoided carbon by project and recent activity (collapsed). A practice with no projects gets a
// short first-run welcome. Every figure comes from architectHome (P2); this file only lays it out.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, CalendarDays, ChevronRight, FolderKanban, FolderOpen, FolderPlus, Hourglass, Layers, Leaf, ListChecks, PackagePlus, Send, Store, UserRoundX } from 'lucide-react'
import * as f from '../../domain/format'
import type { Fit } from '../../domain/v1types'
import { useView } from '../../store'
import { MARKETPLACE_PATH } from '../../store/paths'
import { architectHome, type ArchitectHome as ArchitectHomeView, type ProjectCardView, type WaitingItem } from '../../store/selectors/architect'
import { FITS } from '../../store/selectors/dashboard'
import { BarList, Button, Card, CardHeader, cx, Donut, FIT, IndicativeMarker, Legend, MARK, MaterialImage, MetricGrid, MetricTile, PageHeader, Pill, ProgressRing, ProjectThumbnail, RibaStageStrip, SpotIllustration, TYPOLOGY_VIZ } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { NewProjectDialog } from '../projects/NewProjectDialog'
import { ProjectProgress } from '../projects/ProjectParts'
import { ActivityPanel } from './ActivityPanel'
import { TileChart } from './TileChart'
import { ARCHITECT_TILE_LABELS, carbonStateLabel, FIT_WORDS, projectsSub, STATUS_SEGMENTS, waitingSub } from './architectTiles'

/** Shortlist status, in the mark colours of the shortlist board: shortlisted neutral, waiting info, approved good. */


function sentText(days: number | null): string {
  if (days === null) return 'Sent'
  if (days === 0) return 'Sent today'
  if (days === 1) return 'Sent yesterday'
  return `Sent ${days} days ago`
}



function Metrics({ v }: { v: ArchitectHomeView }) {
  const m = v.metrics
  const anyShortlisted = v.stats.shortlisted > 0
  const statusSegments = STATUS_SEGMENTS.map((s) => ({ key: s.key, label: s.label, value: m.byStatus[s.key], colour: s.colour }))
  return (
    <MetricGrid label="Your figures" testId="home-stats" className="mt-6">
      <MetricTile
        testId="metric-projects"
        label={ARCHITECT_TILE_LABELS.projects}
        icon={FolderKanban}
        value={v.stats.activeProjects}
        state={m.programme.state?.state}
        stateLabel={m.programme.state?.label}
        sub={projectsSub(m)}
        href="/app/projects"
        footer={
          m.settingUp > 0 ? (
            <Pill tone="brand" icon={ListChecks} size="sm" data-testid="metric-projects-setup">
              {m.settingUp} setting up
            </Pill>
          ) : undefined
        }
      />
      <MetricTile
        testId="metric-shortlisted"
        label={ARCHITECT_TILE_LABELS.shortlisted}
        icon={Layers}
        value={v.stats.shortlisted}
        state={m.timing.state?.state}
        stateLabel={m.timing.state?.label}
        sub={anyShortlisted ? 'Shortlisted, waiting or approved' : 'Nothing shortlisted yet'}
        footer={!anyShortlisted ? undefined : <TileChart label="Shortlist by status" chart={<Donut segments={statusSegments} label="Shortlist by status" size={48} />} legend={statusSegments.map((s) => ({ key: s.key, label: s.label, colour: s.colour, valueText: String(s.value) }))} />}
      />
      <MetricTile
        testId="metric-waiting"
        label={ARCHITECT_TILE_LABELS.waiting}
        icon={Hourglass}
        value={m.waiting.count}
        state={m.waiting.state?.state}
        stateLabel={m.waiting.state?.label}
        sub={waitingSub(m.waiting.count, m.waiting.oldestDays)}
        href={v.waitingForApproval[0]?.href}
      />
      <MetricTile
        testId="metric-carbon"
        label={ARCHITECT_TILE_LABELS.carbon}
        icon={Leaf}
        value={f.number(m.carbon.approvedT, 1)}
        unit="tCO2e"
        indicative
        state={m.carbon.state?.state}
        stateLabel={carbonStateLabel(m)}
        sub={m.carbon.liveT > 0 ? 'On approved materials, against buying new' : 'Shows once materials are shortlisted'}
        footer={
          m.carbon.liveT <= 0 ? undefined : <TileChart
            label="Approved carbon of live shortlists"
            chart={<ProgressRing value={m.carbon.approvedT} max={m.carbon.liveT} label="Approved carbon of live shortlists" valueText={`${f.number(m.carbon.approvedT, 1)} of ${f.number(m.carbon.liveT, 1)} tCO2e`} size={48} />}
            note={`${m.carbon.percentText} of the ${f.number(m.carbon.liveT, 1)} tCO2e on live shortlists`}
          />
        }
      />
    </MetricGrid>
  )
}

function FitPills({ fits }: { fits: Record<Fit, number> }) {
  const shown = FITS.filter((k) => fits[k] > 0)
  if (shown.length === 0) return <p className="m-0 text-sm text-muted">Nothing shortlisted to check yet</p>
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Timeline check of the shortlist">
      {shown.map((k) => (
        <li key={k}>
          <Pill tone={FIT[k].tone} icon={FIT[k].icon} size="sm" data-fit={k}>
            {fits[k]} {FIT_WORDS[k]}
          </Pill>
        </li>
      ))}
    </ul>
  )
}

/** A new project's setup progress and its client's answer, in the words of the projects list. */
function SetupPills({ p }: { p: ProjectCardView }) {
  if (!p.setup && p.linkStatus === 'accepted') return null
  return (
    <span className="relative z-[1] flex flex-wrap gap-1.5">
      {p.setup ? (
        <Pill tone="brand" size="sm" icon={ListChecks} data-testid={`home-setup-pill-${p.id}`}>
          Setting up, {p.setup.done} of {p.setup.total}
        </Pill>
      ) : null}
      {p.linkStatus === 'pending' ? (
        <Pill tone="info" size="sm" icon={Hourglass} data-testid={`home-link-pill-${p.id}`}>
          Waiting for client
        </Pill>
      ) : p.linkStatus === 'declined' ? (
        <Pill tone="warning" size="sm" icon={UserRoundX} data-testid={`home-link-pill-${p.id}`}>
          Client declined
        </Pill>
      ) : null}
    </span>
  )
}

function NewFits({ p }: { p: ProjectCardView }) {
  // What is new for this project in particular leads: how many are of a kind already on its shortlist, then the split by fit.
  const parts = [...(p.newLikeShortlist > 0 ? [`${p.newLikeShortlist} like your shortlist`] : []), ...FITS.filter((k) => p.newFitsBy[k] > 0).map((k) => `${p.newFitsBy[k]} ${FIT_WORDS[k]}`)]
  return (
    <div className="relative z-[1] flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-line-soft px-4 py-2 sm:px-5">
      <Link
        to={p.newFitsHref}
        data-testid={`home-new-fits-${p.id}`}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-sm text-sm font-medium text-brand-700 outline-none hover:underline hover:underline-offset-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:min-h-11"
      >
        <PackagePlus aria-hidden="true" className="size-3.5" />
        {p.newFits} new {p.newFits === 1 ? 'material fits' : 'materials fit'}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
      {parts.length > 0 ? (
        <span className="text-xs text-muted" data-testid={`home-new-fits-by-${p.id}`}>
          {parts.join(', ')}
        </span>
      ) : null}
    </div>
  )
}

function ProjectCard({ p }: { p: ProjectCardView }) {
  const setup = p.setup
  const nothingYet = p.total === 0
  return (
    <Card
      interactive
      as="article"
      className={cx('flex flex-col overflow-hidden', setup && 'border-brand-100! bg-brand-50/70! ring-1 ring-inset ring-brand-100 hover:border-brand-200!')}
      data-testid={`home-project-${p.id}`}
      data-setup={setup ? 'true' : undefined}
    >
      <ProjectThumbnail sketch={p.sketch} materials={p.materials} aspect="16/10" rounded="top" className="border-b border-line-soft" />
      <div className="flex flex-1 flex-col gap-3.5 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-md font-semibold text-ink">
            <Link to={p.href} className="outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']">
              {p.name}
            </Link>
          </h3>
          <p className="m-0 mt-0.5 truncate text-sm text-muted">
            {p.clientName}, {p.typeLabel}
          </p>
        </div>
        <SetupPills p={p} />
        <RibaStageStrip stage={p.plannedStage ?? p.stage} showLabel size="sm" className="text-sm text-ink-soft" testId={`home-stage-${p.id}`} />
        <p className="m-0 flex items-center gap-1.5 text-sm text-ink-soft">
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
          Materials needed from <span className="font-medium text-ink">{p.startText}</span>
        </p>
        {setup && nothingYet ? null : <FitPills fits={p.fits} />}
        <div className="mt-auto flex flex-col gap-3 pt-1">
          {setup && nothingYet ? null : <ProjectProgress counts={p.counts} total={p.total} size="sm" />}
          {setup?.nextText ? (
            <Link
              to={setup.href}
              data-testid={`home-setup-next-${p.id}`}
              className="relative z-[1] inline-flex min-h-8 items-center gap-1.5 self-start rounded-sm text-sm font-medium text-brand-700 outline-none hover:underline hover:underline-offset-4 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:min-h-11"
            >
              {setup.nextText}
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
            </Link>
          ) : null}
        </div>
      </div>
      {p.newFits > 0 ? <NewFits p={p} /> : null}
    </Card>
  )
}

function Waiting({ items }: { items: WaitingItem[] }) {
  return (
    <Card>
      <CardHeader title="Waiting for approval" icon={Hourglass} titleAs="h2" description="Sent to your clients, oldest first" actions={items.length > 0 ? <span className="text-sm tabular-nums text-muted">{items.length}</span> : undefined} />
      {items.length === 0 ? (
        <p className="m-0 px-5 py-6 text-sm text-muted" data-testid="waiting-for-approval">
          Nothing is waiting. Materials you send for approval appear here until your client decides.
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-soft p-0" data-testid="waiting-for-approval">
          {items.map((w) => {
            const stale = (w.daysWaiting ?? 0) >= 7
            return (
              <li key={w.itemId}>
                <Link to={w.href} className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-page focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:px-5">
                  {w.card ? (
                    <MaterialImage spec={w.card.listing.spec} publicId={w.publicId} aspect="1/1" rounded="md" className="size-10 shrink-0" />
                  ) : (
                    <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-subtle text-muted ring-1 ring-inset ring-line-soft">
                      <Send className="size-4" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-medium text-ink">{w.title}</span>
                    <span className="truncate text-sm text-muted">
                      {w.projectName}, {w.clientName}
                    </span>
                  </span>
                  <span className={cx('inline-flex shrink-0 items-center gap-1.5 text-sm tabular-nums', stale ? 'font-medium text-warning' : 'text-muted')}>
                    {stale ? <span aria-hidden="true" className="size-2 rounded-full" style={{ background: MARK.warning }} /> : null}
                    {sentText(w.daysWaiting)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function CarbonByProject({ v }: { v: ArchitectHomeView }) {
  const rows = v.carbonByProject
  const any = rows.length > 0
  return (
    <Card data-testid="carbon-by-project">
      <CardHeader title="Carbon by project" icon={Leaf} titleAs="h2" description="Approved and on live shortlists" actions={<IndicativeMarker />} />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {any ? (
          <>
            <BarList
              label="Avoided carbon by project"
              max={v.carbonAxisMax}
              items={rows.map((r) => ({
                key: r.id,
                label: r.name,
                href: `${r.href}/sustainability`,
                value: r.approvedT,
                valueText: f.carbon(r.approvedT),
                colour: MARK.brand,
                secondary: { value: r.liveT, valueText: `of ${f.number(r.liveT, 1)}` },
              }))}
            />
            <Legend
              label="Key"
              className="text-xs"
              items={[
                { key: 'approved', label: 'Approved', colour: MARK.brand },
                { key: 'live', label: 'On live shortlists', colour: 'var(--color-brand-200)' },
              ]}
            />
          </>
        ) : (
          <p className="m-0 text-sm text-muted">Shortlist materials to see their avoided carbon here.</p>
        )}
        {any && v.carbonNotYet.length > 0 ? (
          <p className="m-0 text-xs text-muted" data-testid="carbon-not-yet">
            Nothing shortlisted yet on {v.carbonNotYet.map((x) => x.name).join(', ')}.
          </p>
        ) : null}
      </div>
    </Card>
  )
}

/** Under the welcome: what the Marketplace holds now, by category, so a new practice sees real stock at once. */
function MarketplaceNow({ firstRun }: { firstRun: NonNullable<ArchitectHomeView['firstRun']> }) {
  if (firstRun.total === 0) return null
  return (
    <section aria-labelledby="marketplace-now" className="mt-10" data-testid="architect-first-marketplace">
      <SectionTitle
        id="marketplace-now"
        title="In the Marketplace now"
        description={`${firstRun.total} reclaimed ${firstRun.total === 1 ? 'material' : 'materials'} from buildings coming down. Create a project to check each one against your start on site.`}
        actions={
          <Link to={MARKETPLACE_PATH} className="inline-flex min-h-6 items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
            Open the Marketplace <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        }
      />
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
        {firstRun.folders.map((c) => (
          <li key={c.typology} className="min-w-0">
            <Link
              to={c.href}
              data-testid={`first-category-${c.typology}`}
              className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {/*
                Laid out by how many drawings there are, never with blank cells: three as one large tile beside two
                stacked (each keeps the 4 by 3 board), two side by side, one centred on the paper at its own 4 by 3.
              */}
              {c.thumbs.length >= 3 ? (
                <div aria-hidden="true" className="grid aspect-[2/1] grid-cols-[2fr_1fr] grid-rows-2 gap-px border-b border-line bg-line" data-layout="three">
                  {c.thumbs.slice(0, 3).map((t, i) => (
                    <MaterialImage key={t.publicId} spec={t.spec} publicId={t.publicId} aspect="fill" className={cx('size-full', i === 0 && 'row-span-2')} />
                  ))}
                </div>
              ) : c.thumbs.length === 2 ? (
                <div aria-hidden="true" className="grid aspect-[2/1] grid-cols-2 gap-px border-b border-line bg-line" data-layout="two">
                  {c.thumbs.map((t) => (
                    <MaterialImage key={t.publicId} spec={t.spec} publicId={t.publicId} aspect="fill" className="size-full" />
                  ))}
                </div>
              ) : (
                <div aria-hidden="true" className="flex aspect-[2/1] justify-center border-b border-line bg-paper" data-layout="one">
                  {c.thumbs.map((t) => (
                    <MaterialImage key={t.publicId} spec={t.spec} publicId={t.publicId} aspect="4/3" className="h-full" />
                  ))}
                </div>
              )}
              <div className="relative flex flex-1 flex-col gap-1 py-4 pl-5 pr-4">
                <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-[2px]" style={{ background: TYPOLOGY_VIZ[c.typology] }} />
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-ink">
                    <FolderOpen aria-hidden="true" className="size-4 shrink-0 text-muted" />
                    {c.label}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{c.count === 1 ? '1 material' : `${c.count} materials`}</span>
                </span>
                <span className="text-sm text-muted">{c.familiesText || c.description}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                  Browse {c.label.toLowerCase()} <ChevronRight aria-hidden="true" className="size-3.5" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Welcome({ onCreate }: { onCreate: () => void }) {
  const steps = [
    { title: 'Create your first project', text: 'Name it, add the client and the date materials are needed on site.' },
    { title: 'Find materials in the Marketplace', text: 'Every material is checked against your start date.' },
    { title: 'Send your shortlist for approval', text: 'Your client approves; you export the specification.' },
  ]
  return (
    <Card className="overflow-hidden" data-testid="architect-welcome">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
          <SpotIllustration kind="project" className="h-[88px] w-[120px]" />
          <div>
            <h2 className="m-0 text-xl font-semibold text-ink">Welcome to your workspace</h2>
            <p className="m-0 mt-1.5 max-w-md text-base text-muted">Start with a project. Everything you shortlist, send and specify lives inside one.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={FolderPlus} onClick={onCreate} data-testid="welcome-create-project">
              Create a project
            </Button>
            <Button asChild icon={Store}>
              <Link to={MARKETPLACE_PATH}>Browse the Marketplace</Link>
            </Button>
          </div>
        </div>
        <ol className="m-0 flex list-none flex-col border-t border-line-soft bg-page p-0 lg:border-l lg:border-t-0">
          {steps.map((s, i) => (
            <li key={s.title} className={cx('flex items-start gap-4 px-6 py-5 sm:px-8', i > 0 && 'border-t border-line-soft')}>
              <span className={cx('inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums', i === 0 ? 'bg-brand-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-inset ring-line')}>{i + 1}</span>
              <div>
                <p className="m-0 font-medium text-ink">{s.title}</p>
                <p className="m-0 mt-0.5 text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  )
}

export function ArchitectHome() {
  const view = useView(architectHome)
  const [params, setParams] = useSearchParams()
  const welcome = params.get('welcome') === '1'
  const [creating, setCreating] = useState(() => welcome)
  if (!view) return null
  const first = view.projects.length === 0
  const closeDialog = (open: boolean) => {
    setCreating(open)
    if (!open && welcome) setParams({}, { replace: true })
  }

  return (
    <Page testId="architect-home">
      <PageHeader
        title={view.greeting}
        subtitle={view.dateText}
        actions={
          <>
            <Button asChild icon={Store}>
              <Link to={MARKETPLACE_PATH}>Marketplace</Link>
            </Button>
            <Button variant="primary" icon={FolderPlus} onClick={() => setCreating(true)} data-testid="home-new-project">
              New project
            </Button>
          </>
        }
      />

      {first ? (
        <div className="mt-8">
          <Welcome onCreate={() => setCreating(true)} />
          {view.firstRun ? <MarketplaceNow firstRun={view.firstRun} /> : null}
        </div>
      ) : (
        <>
          <Metrics v={view} />

          <section aria-labelledby="your-projects" className="mt-10">
            <SectionTitle
              id="your-projects"
              title="Your projects"
              description="The strip shows the RIBA stage your programme places today in."
              actions={
                <>
                  <IndicativeMarker />
                  <Link to="/app/projects" className="inline-flex min-h-6 items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
                    All projects <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </>
              }
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {view.projects.map((p) => (
                <ProjectCard key={p.id} p={p} />
              ))}
            </div>
          </section>

          <div className="mt-10 grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
            <div className="min-w-0">
              <Waiting items={view.waitingForApproval} />
            </div>
            <div className="min-w-0">
              <CarbonByProject v={view} />
            </div>
          </div>
          <ActivityPanel panelId="home-activity-architect" rows={view.activity} summary={view.activitySummary} emptyText="Saves, sends and decisions on your projects appear here." className="mt-6" />
        </>
      )}

      <NewProjectDialog open={creating} onOpenChange={closeDialog} short={first} title={first ? 'Create your first project' : 'New project'} />
    </Page>
  )
}
