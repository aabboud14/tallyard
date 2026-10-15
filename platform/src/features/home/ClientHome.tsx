// The client's home as a dashboard: project requests waiting for an answer, four indicative figures (cost, saving
// against new, avoided carbon secured and reuse by value), the to-do list beside the reservations in progress, the
// programme across the projects, sustainability tracking per project, the project cards and recent activity.
// Every figure is indicative and comes from the store; none of it is certification advice.
import { Link } from 'react-router'
import { Activity, Handshake, Send } from 'lucide-react'
import { useView } from '../../store'
import { clientHomeView } from '../../store/selectors/sustainability-screens'
import { Button, CollapsiblePanel, MARK, PageHeader, Pill } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ActivityFeed } from '../notifications/kit'
import { PendingLinkRequests } from '../projects/LinkRequests'
import { ClientMetrics } from './client/ClientMetrics'
import { TodoList } from './client/TodoList'
import { ProgrammeTimeline } from './client/ProgrammeTimeline'
import { TrackingTable } from './client/TrackingTable'
import { ProjectCards } from './client/ProjectCards'

const RES_TONE = { pending: 'info', accepted: 'brand', declined: 'danger', withdrawn: 'neutral' } as const

function ReservationsPanel({ v }: { v: NonNullable<ReturnType<typeof clientHomeView>> }) {
  const first = v.projects[0]
  const next = v.todos.find((t) => t.kind === 'reserve' || t.kind === 'request_again')
  return (
    <section aria-labelledby="home-reservations-title" className="flex min-w-0 flex-col rounded-lg border border-line bg-surface" data-testid="client-reservations">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2 sm:px-5">
        <h2 id="home-reservations-title" className="m-0 flex items-center gap-2 py-1 text-base font-semibold text-ink">
          <Handshake aria-hidden="true" className="size-4 text-muted" />
          Reservations
        </h2>
        {first ? (
          <Button asChild variant="ghost" size="sm">
            <Link to={`${first.href}/reservations`}>View all</Link>
          </Button>
        ) : null}
      </div>
      <dl className="m-0 grid grid-cols-3 border-b border-line-soft" data-testid="client-reservation-counts">
        {(
          [
            ['To request', v.reservationCounts.toRequest, 'neutral'],
            ['With the seller', v.reservationCounts.pending, 'info'],
            ['Reserved', v.reservationCounts.reserved, 'brand'],
          ] as const
        ).map(([label, n, tone]) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5 border-l border-line-soft px-4 py-3 first:border-l-0 sm:px-5">
            <dt className="flex items-start gap-1.5 text-xs leading-4 text-muted">
              <span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full" style={{ background: MARK[tone] }} />
              {label}
            </dt>
            <dd className="m-0 text-xl font-semibold tabular-nums text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      {v.reservations.length === 0 ? (
        <p className="m-0 px-4 py-6 text-sm text-muted sm:px-5">No reservations in progress. Approved materials can be reserved from each project.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-soft p-0">
          {v.reservations.map((r) => (
            <li key={r.id} className="relative px-4 py-3 transition-colors hover:bg-page sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <Link to={r.href} className="min-w-0 truncate text-base font-medium text-ink outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline">
                  {r.title}
                </Link>
                <span className="shrink-0 text-xs text-muted">{r.timeAgo}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-muted">{r.projectName}</span>
                <Pill tone={RES_TONE[r.status]} dot size="sm">
                  {r.statusLabel}
                </Pill>
              </div>
            </li>
          ))}
        </ul>
      )}
      {next ? (
        <div className="mt-auto border-t border-line-soft px-4 py-3 sm:px-5">
          <Link to={next.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-brand-700 hover:underline sm:min-h-0" data-testid="client-reservations-next">
            <Send aria-hidden="true" className="size-3.5" />
            {v.reservationCounts.toRequest === 1 ? '1 approved material to request' : `${v.reservationCounts.toRequest} approved materials to request`}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

export function ClientHome() {
  const v = useView(clientHomeView)
  if (!v) return null
  const latest = v.activitySummary.latest
  return (
    <Page testId="client-home">
      <div className="flex flex-col gap-8">
        <PendingLinkRequests />
        <PageHeader title={v.greeting} subtitle={v.dateText} />
        <ClientMetrics v={v} />
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <TodoList todos={v.todos} overdue={v.todoCounts.overdue} />
          <ReservationsPanel v={v} />
        </div>
        <ProgrammeTimeline t={v.timeline} />
        <TrackingTable rows={v.tracking} />
        <section aria-labelledby="projects-title" className="min-w-0">
          <SectionTitle id="projects-title" title="Your projects" description={v.projects.length > 0 ? 'Projects where your organisation is the client.' : undefined} />
          <ProjectCards v={v} />
        </section>
        <CollapsiblePanel
          id="home-activity-client"
          title="Recent activity"
          icon={Activity}
          count={v.activitySummary.count}
          summary={latest ? `Latest, ${latest.timeAgo}: ${latest.actor} ${latest.text}` : 'Nothing yet'}
          testId="home-activity"
          toggleTestId="home-activity-toggle"
        >
          <ActivityFeed rows={v.activity} compact emptyText="Decisions and reservations on your projects appear here." />
        </CollapsiblePanel>
      </div>
    </Page>
  )
}

export default ClientHome
