// The asset owner's home: the portfolio in figures, requests awaiting a decision, each building and recent activity.
import { Link } from 'react-router'
import { ArrowRight, Building2, EyeOff, Inbox, Plus } from 'lucide-react'
import { selectors, useView } from '../../store'
import * as f from '../../domain/format'
import { Button, Card, CardHeader, EmptyState, PageHeader, Pill, SegmentedBar } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { ActivityFeed, StatStrip } from '../notifications/kit'
import { SURVEY_TONE, visibilitySegments } from '../buildings/labels'

export function OwnerHome() {
  const v = useView(selectors.ownerHome)
  if (!v) return null
  const s = v.stats
  return (
    <Page testId="owner-home">
      <PageHeader
        title={v.greeting}
        subtitle={v.dateText}
        actions={
          <Button asChild icon={Plus}>
            <Link to="/app/buildings?new=1">Add building</Link>
          </Button>
        }
      />
      <StatStrip
        className="mt-6"
        items={[
          { label: 'Buildings', value: s.buildings },
          { label: 'Items surveyed', value: f.number(s.itemsSurveyed) },
          { label: 'Published', value: s.listed, sub: 'On the marketplace' },
          { label: 'Shared', value: s.shared, sub: 'With selected projects' },
          { label: 'Reserved', value: s.reserved },
          { label: 'Avoidable carbon', value: f.number(s.potentialAvoidedT, 1), unit: 'tCO2e', indicative: true, sub: 'If recovered' },
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="requests-title">
            <SectionTitle
              id="requests-title"
              title={s.requestsAwaiting > 0 ? `Requests awaiting you (${s.requestsAwaiting})` : 'Requests awaiting you'}
              description={s.requestsAwaiting > 0 ? 'Buyers asking to reserve your lots. You see who they are once you accept.' : undefined}
              actions={
                <Button asChild variant="ghost" size="sm" trailingIcon={ArrowRight}>
                  <Link to="/app/requests">All requests</Link>
                </Button>
              }
            />
            {v.requests.length === 0 ? (
              <EmptyState variant="inline" icon={Inbox} title="No requests waiting" text="When a client asks to reserve one of your lots, it appears here." />
            ) : (
              <Card>
                <ul className="m-0 list-none divide-y divide-line-soft p-0">
                  {v.requests.map((r) => (
                    <li key={r.id} className="relative flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-page sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 flex items-center gap-2 text-base">
                          <span className="rounded bg-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink-soft ring-1 ring-inset ring-line-soft">{r.tag}</span>
                          <Link to="/app/requests" className="truncate font-medium text-ink outline-none after:absolute after:inset-0 after:content-['']">
                            {r.title}
                          </Link>
                        </p>
                        <p className="m-0 mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
                          <EyeOff aria-hidden="true" className="size-3.5 shrink-0" />
                          <span className="truncate">{r.buyer.kind === 'blind' ? r.buyer.text : r.buyer.org}</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-sm text-muted">
                        <span>{r.timeAgo}</span>
                        <Pill tone="info" dot size="sm">
                          {r.statusLabel}
                        </Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section aria-labelledby="buildings-title">
            <SectionTitle id="buildings-title" title="Buildings" />
            {v.buildings.length === 0 ? (
              <EmptyState
                variant="card"
                icon={Building2}
                title="Add your first building"
                text="Record a building coming down, appoint a surveyor, and decide what to recover and who may see it."
                action={
                  <Button asChild variant="primary" icon={Plus}>
                    <Link to="/app/buildings?new=1">Add building</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {v.buildings.map((b) => (
                  <Card key={b.id} interactive padding="md" className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 text-lg font-semibold text-ink">
                          <Link to={b.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                            {b.name}
                          </Link>
                        </h3>
                        <p className="m-0 mt-0.5 truncate text-sm text-muted">{b.address}</p>
                      </div>
                      <Pill tone={SURVEY_TONE[b.surveyStatus]} dot size="sm">
                        Survey {b.surveyStatusLabel.toLowerCase()}
                      </Pill>
                    </div>
                    <SegmentedBar label={`${b.itemCount} items by visibility`} segments={visibilitySegments(b.counts)} total={`${b.itemCount} items`} size="sm" />
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0">
          <Card>
            <CardHeader title="Recent activity" />
            <div className="px-4 py-4 sm:px-5">
              <ActivityFeed rows={v.activity} compact emptyText="Captures, listings and requests across your buildings appear here." />
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

export default OwnerHome
