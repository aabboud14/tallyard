// The client's home: what is waiting for a decision, the projects, reservations in progress and recent activity.
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, CheckCheck, ClipboardCheck, Handshake } from 'lucide-react'
import { selectors, useView } from '../../store'
import { formatDateShort } from '../../domain/dates'
import { Button, Card, CardHeader, cx, EmptyState, FitPill, PageHeader, Pill, SustainabilityBand } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ActivityFeed, StatStrip } from '../notifications/kit'
import { MaterialPicture } from '../buildings/photos'

const RES_TONE = { pending: 'info', accepted: 'brand', declined: 'danger', withdrawn: 'neutral' } as const

export function ClientHome() {
  const v = useView(selectors.clientHome)
  if (!v) return null
  const first = v.projects[0]
  return (
    <Page testId="client-home">
      <PageHeader title={v.greeting} subtitle={v.dateText} />
      <StatStrip
        className="mt-6"
        items={[
          { label: 'Projects', value: v.stats.projects },
          { label: 'Waiting for your decision', value: v.stats.approvalsWaiting, tone: v.stats.approvalsWaiting > 0 ? 'attention' : 'default', href: v.approvals[0]?.href, testId: 'stat-approvals' },
          { label: 'Reservations pending', value: v.stats.reservationsPending, sub: 'With the seller' },
          { label: 'Reserved', value: v.stats.reserved, sub: 'Held for your projects' },
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="approvals-title">
            <SectionTitle
              id="approvals-title"
              title="Waiting for your decision"
              description={v.approvals.length > 0 ? 'Materials your architect sent for approval.' : undefined}
              actions={
                v.approvals.length > 0 ? (
                  <Button asChild variant="ghost" size="sm" trailingIcon={ArrowRight}>
                    <Link to={v.approvals[0].href}>Open approvals</Link>
                  </Button>
                ) : null
              }
            />
            {v.approvals.length === 0 ? (
              <EmptyState variant="inline" icon={CheckCheck} title="You are up to date" text="When your architect sends materials for approval, they appear here." testId="approvals-empty" />
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {v.approvals.map((a) => (
                  <li key={a.itemId}>
                    <Card interactive className="flex items-stretch gap-4 p-3 sm:p-3.5">
                      <MaterialPicture spec={a.card.listing.spec} publicId={a.card.publicId} photo={a.card.photo} aspect="4/3" rounded="md" className="w-28 shrink-0 sm:w-36" />
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
                        <div className="min-w-0">
                          <p className="m-0 text-sm text-muted">
                            {a.projectName}
                            {a.sentOn ? ` · Sent ${formatDateShort(a.sentOn)}` : ''}
                          </p>
                          <h3 className="m-0 mt-0.5 truncate text-md font-semibold text-ink">
                            <Link to={a.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                              {a.title}
                            </Link>
                          </h3>
                          <p className="m-0 mt-0.5 truncate text-sm text-ink-soft">
                            {a.card.quantityText} · {a.card.availabilityText}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {a.card.fit ? <FitPill fit={a.card.fit.fit} size="sm" /> : null}
                          <SustainabilityBand band={a.card.band} size="sm" />
                        </div>
                      </div>
                      <div className="hidden shrink-0 items-center sm:flex">
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink shadow-xs">
                          Review
                          <ArrowRight aria-hidden="true" className="size-3.5" />
                        </span>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="projects-title">
            <SectionTitle id="projects-title" title="Your projects" />
            {v.projects.length === 0 ? (
              <EmptyState variant="inline" icon={ClipboardCheck} title="No projects yet" text="When an architect adds your organisation as the client on a project, it appears here." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {v.projects.map((p) => (
                  <Card key={p.id} interactive padding="md" className="flex flex-col gap-4">
                    <div className="min-w-0">
                      <p className="m-0 text-sm text-muted">
                        {p.typeLabel} · {p.localAuthority}
                      </p>
                      <h3 className="m-0 mt-0.5 text-lg font-semibold text-ink">
                        <Link to={p.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                          {p.name}
                        </Link>
                      </h3>
                      <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                        <CalendarDays aria-hidden="true" className="size-3.5 text-faint" />
                        Materials needed from {p.startText}
                      </p>
                    </div>
                    <dl className="m-0 grid grid-cols-3 gap-2 border-t border-line-soft pt-3">
                      {[
                        ['To decide', p.waiting],
                        ['Approved', p.approved],
                        ['Reserved', p.reserved],
                      ].map(([label, n]) => (
                        <div key={label} className="min-w-0">
                          <dt className="text-xs text-muted">{label}</dt>
                          <dd className={cx('m-0 text-lg font-semibold tabular-nums', label === 'To decide' && Number(n) > 0 ? 'text-brand-700' : 'text-ink')}>{n}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="Reservations"
              icon={Handshake}
              actions={
                first ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`${first.href}/reservations`}>View all</Link>
                  </Button>
                ) : null
              }
            />
            {v.reservations.length === 0 ? (
              <p className="m-0 px-4 py-5 text-sm text-muted sm:px-5">No reservations in progress. Approved materials can be reserved from each project.</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-line-soft p-0">
                {v.reservations.map((r) => (
                  <li key={r.id} className="relative px-4 py-3 transition-colors hover:bg-page sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <Link to={r.href} className="min-w-0 truncate text-base font-medium text-ink outline-none after:absolute after:inset-0 after:content-['']">
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
          </Card>
          <Card>
            <CardHeader title="Recent activity" />
            <div className="px-4 py-4 sm:px-5">
              <ActivityFeed rows={v.activity} compact emptyText="Decisions and reservations on your projects appear here." />
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

export default ClientHome
