// The surveyor's home: appointments by client, each building's survey progress, and recent activity.
import { Link } from 'react-router'
import { Camera, ClipboardList, List } from 'lucide-react'
import { selectors, useView } from '../../store'
import type { AppointmentBuilding } from '../../store/selectors/surveyor'
import { formatDate } from '../../domain/dates'
import { Avatar, Button, Card, CardHeader, cx, EmptyState, PageHeader, Pill } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ActivityFeed, StatStrip } from '../notifications/kit'
import { SURVEY_TONE } from '../buildings/labels'

const STEPS = [
  { key: 'appointed', label: 'Appointed' },
  { key: 'in_progress', label: 'Capturing' },
  { key: 'submitted', label: 'Submitted' },
] as const

function stepState(status: AppointmentBuilding['status'], key: (typeof STEPS)[number]['key']): 'done' | 'current' | 'todo' {
  const order = { not_started: 0, in_progress: 1, submitted: 2 }[status]
  const at = { appointed: 0, in_progress: 1, submitted: 2 }[key]
  return at < order || (at === order && status === 'submitted') ? 'done' : at === order ? 'current' : 'todo'
}

export function SurveyorHome() {
  const v = useView(selectors.surveyorHome)
  if (!v) return null
  return (
    <Page testId="surveyor-home">
      <PageHeader title={v.greeting} subtitle={v.dateText} />
      <StatStrip
        className="mt-6"
        items={[
          { label: 'Clients', value: v.stats.clients },
          { label: 'Buildings', value: v.stats.buildings },
          { label: 'Items captured', value: v.stats.itemsCaptured },
          { label: 'Surveys open', value: v.stats.inProgress, tone: v.stats.inProgress > 0 ? 'attention' : 'default' },
        ]}
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="appointments-title" className="flex min-w-0 flex-col gap-4">
          <SectionTitle id="appointments-title" title="Your appointments" description="Buildings you are appointed to survey, by client." />
          {v.appointments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No appointments yet" text="When an asset owner appoints your firm to survey a building, it appears here. You will also get a notification." />
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
                    <li key={b.id} className="flex flex-col gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={b.href} className="text-md font-semibold text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4">
                            {b.name}
                          </Link>
                          <Pill tone={SURVEY_TONE[b.status]} dot size="sm">
                            {b.statusLabel}
                          </Pill>
                        </div>
                        <p className="m-0 mt-0.5 text-sm text-muted">{b.address}</p>
                        <ol className="m-0 mt-3 flex list-none items-center gap-2 p-0" aria-label="Survey progress">
                          {STEPS.map((s, i) => {
                            const st = stepState(b.status, s.key)
                            return (
                              <li key={s.key} className="flex items-center gap-2">
                                {i > 0 ? <span aria-hidden="true" className={cx('h-px w-5 sm:w-8', st === 'todo' ? 'bg-line' : 'bg-brand-300')} /> : null}
                                <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', st === 'todo' ? 'text-faint' : st === 'current' ? 'text-ink' : 'text-brand-700')}>
                                  <span aria-hidden="true" className={cx('size-2 rounded-full', st === 'todo' ? 'border border-line-strong' : st === 'current' ? 'bg-[#d08a2c]' : 'bg-brand-600')} />
                                  {s.label}
                                  {st === 'current' ? <span className="sr-only">, current</span> : null}
                                </span>
                              </li>
                            )
                          })}
                        </ol>
                        <p className="m-0 mt-2 text-sm text-ink-soft">
                          <span className="font-medium tabular-nums text-ink">{b.itemCount}</span> {b.itemCount === 1 ? 'item' : 'items'} captured
                          {b.lastCaptureOn ? <span className="text-muted"> · last on {formatDate(b.lastCaptureOn)}</span> : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button asChild icon={List} className="max-md:flex-1">
                          <Link to={`${b.href}/inventory`}>Inventory</Link>
                        </Button>
                        <Button asChild variant="primary" icon={Camera} className="max-md:flex-1">
                          <Link to={`${b.href}/capture`} data-testid={`capture-${b.id}`}>
                            Capture
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
        </section>
        <aside className="min-w-0">
          <Card>
            <CardHeader title="Recent activity" />
            <div className="px-4 py-4 sm:px-5">
              <ActivityFeed rows={v.activity} compact emptyText="Your captures and submissions appear here." />
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

export default SurveyorHome
