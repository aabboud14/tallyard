// The project overview, for everyone on the project: the programme (today, each shortlisted material's window,
// the start), counts by status, carbon secured against shortlisted, the next steps for the person's side, the
// project's details and what happened lately.
import { Link, useParams } from 'react-router'
import { ArrowRight, CalendarRange, Compass, Leaf, ListChecks, ListTodo, ScrollText } from 'lucide-react'
import * as f from '../../domain/format'
import type { Fit } from '../../domain/v1types'
import { useNow, useView } from '../../store'
import { projectOverview } from '../../store/selectors/project'
import { Button, Card, CardBody, CardHeader, DescriptionList, EmptyState, IndicativeMarker, ProgressBar, TimelineStrip } from '../../ui'
import { discoverHref } from '../discover/links'
import { ActivityFeed, ProjectPage, ProjectProgress } from './ProjectParts'

export function Overview() {
  const { projectId = '' } = useParams()
  const view = useView(projectOverview, projectId)
  const today = useNow().slice(0, 10)
  if (!view) return null
  const h = view.header
  const timelineItems = view.timeline.rows.map((r) => ({ id: r.itemId, label: r.title, window: r.windowStart && r.windowEnd ? { start: r.windowStart, end: r.windowEnd } : null, fit: (r.fit ?? 'now') as Fit }))
  const total = view.totals.all.count

  return (
    <ProjectPage testId="project-overview">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader title="Programme" description="When each material is available, against the date it is needed on site." icon={CalendarRange} actions={<IndicativeMarker />} />
            <CardBody>
              {timelineItems.length > 0 ? (
                <TimelineStrip today={today} startDate={h.startDate} startLabel="Needed on site" items={timelineItems} indicative={false} testId="programme" />
              ) : (
                <EmptyState
                  variant="inline"
                  icon={CalendarRange}
                  title="No materials on the programme yet"
                  text={h.side === 'architect' ? 'Shortlist materials and each one appears here against your start date.' : 'Materials appear here as the architect shortlists them.'}
                  action={
                    h.side === 'architect' ? (
                      <Button asChild size="sm" icon={Compass}>
                        <Link to={discoverHref(projectId)}>Find materials</Link>
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="Shortlist" icon={ListChecks} actions={h.side === 'architect' ? <Link to={`/app/projects/${projectId}/shortlist`} className="text-sm font-medium text-ink-soft hover:text-ink">Open</Link> : undefined} />
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-ink">{total}</span>
                  <span className="text-sm text-muted">{total === 1 ? 'material' : 'materials'}, {f.massT(view.totals.all.massT)}</span>
                </div>
                <ProjectProgress counts={view.counts} total={total} />
              </CardBody>
            </Card>
            <Card data-testid="overview-carbon">
              <CardHeader title="Avoided carbon" icon={Leaf} actions={<IndicativeMarker />} />
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-ink">{f.number(view.carbon.securedT, 1)}</span>
                  <span className="text-sm text-muted">tCO2e secured by approval</span>
                </div>
                <ProgressBar value={view.carbon.securedT} max={view.carbon.shortlistedT} label="Avoided carbon secured by approval, against everything live on the shortlist" />
                <p className="m-0 text-xs text-muted">
                  Of <span className="font-medium tabular-nums text-ink-soft">{f.number(view.carbon.shortlistedT, 1)} tCO2e</span> across shortlisted, sent and approved materials. Against buying the same new, A1 to A4.
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Recent activity" titleAs="h2" actions={<Link to={`/app/projects/${projectId}/activity`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">All activity <ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
            <ActivityFeed rows={view.activity} empty="Nothing has happened on this project yet." />
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card data-testid="next-steps">
            <CardHeader title="Next steps" icon={ListTodo} />
            {view.nextSteps.length === 0 ? (
              <p className="m-0 px-5 py-5 text-sm text-muted">You are up to date on this project.</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-line-soft p-0">
                {view.nextSteps.map((s) => (
                  <li key={s.id}>
                    <Link to={s.href} className="group flex items-center gap-3 px-4 py-3 text-base text-ink transition-colors hover:bg-page focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:px-5">
                      <span className="min-w-0 flex-1">{s.text}</span>
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Details" icon={ScrollText} />
            <CardBody>
              {h.description ? <p className="m-0 mb-4 text-sm text-ink-soft">{h.description}</p> : null}
              <DescriptionList
                items={[
                  { label: 'Client', value: h.clientName },
                  { label: 'Architect', value: h.architectName },
                  { label: 'Consultant', value: h.consultantName || 'None yet' },
                  { label: 'Type', value: h.typeLabel },
                  { label: 'Stage', value: `Stage ${h.stage}` },
                  { label: 'Location', value: [h.localAuthority, h.region].filter(Boolean).join(', ') },
                  { label: 'Needed from', value: h.startText },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </ProjectPage>
  )
}
