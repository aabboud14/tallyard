// Everything that happened on the project that the person's organisation may read, newest first, by day.
import { Link, useParams } from 'react-router'
import { History } from 'lucide-react'
import { useView } from '../../store'
import { projectActivityDays } from '../../store/selectors/arch-activity'
import { Avatar, Card, EmptyState } from '../../ui'
import { ProjectPage } from './ProjectParts'

export function Activity() {
  const { projectId = '' } = useParams()
  const view = useView(projectActivityDays, projectId)
  if (!view) return null
  return (
    <ProjectPage testId="project-activity">
      {view.total === 0 ? (
        <EmptyState variant="page" icon={History} title="No activity yet" text="Shortlisting, sending, decisions and reservations on this project appear here." />
      ) : (
        <div className="mx-auto flex max-w-[760px] flex-col gap-8">
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
                      <p className="m-0 min-w-0 flex-1 text-base text-ink-soft">
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
      )}
    </ProjectPage>
  )
}
