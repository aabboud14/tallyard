// Everything that happened on a building that the person's organisation may read, newest first, by day. Opened from
// All activity on the building's overview.
import { Link, useParams } from 'react-router'
import { History } from 'lucide-react'
import { useView } from '../../store'
import { buildingActivityDays } from '../../store/selectors/arch-activity'
import { Avatar, Card, EmptyState } from '../../ui'

export function BuildingActivity() {
  const { buildingId = '' } = useParams()
  const view = useView(buildingActivityDays, buildingId)
  if (!view) return null
  if (view.total === 0) return <EmptyState variant="page" icon={History} title="No activity yet" text="Captures, decisions and listings for this building appear here." testId="building-activity-empty" />
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8" data-testid="building-activity-page">
      {view.days.map((d) => (
        <section key={d.label} aria-labelledby={`day-${d.label}`}>
          <h2 id={`day-${d.label}`} className="m-0 mb-3 text-sm font-semibold text-ink">
            {d.label}
          </h2>
          <Card>
            <ol className="m-0 list-none divide-y divide-line-soft p-0">
              {d.rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={r.actor} size="sm" decorative className="mt-0.5" />
                  <p className="m-0 min-w-0 flex-1 break-words text-base text-ink-soft">
                    <span className="font-medium text-ink">{r.actor}</span>{' '}
                    {r.href ? (
                      <Link to={r.href} className="hover:text-ink hover:underline hover:underline-offset-2">
                        {r.text}
                      </Link>
                    ) : (
                      r.text
                    )}
                  </p>
                  <time dateTime={r.at} className="shrink-0 text-sm tabular-nums text-faint">
                    {r.timeAgo}
                  </time>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ))}
    </div>
  )
}
