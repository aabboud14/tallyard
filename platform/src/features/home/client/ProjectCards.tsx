// The client's project cards: the drawn thumbnail, the stage on the RIBA strip, what is waiting, approved and
// reserved, and the indicative cost of the reclaimed materials so far.
import { Link } from 'react-router'
import { CalendarDays, FolderOpen } from 'lucide-react'
import type { ClientHomeView } from '../../../store/selectors/sustainability-screens'
import { cx, EmptyState, IndicativeMarker, ProjectThumbnail, RibaStageStrip } from '../../../ui'

export function ProjectCards({ v }: { v: ClientHomeView }) {
  if (v.projects.length === 0)
    return <EmptyState variant="card" illustration="project" icon={FolderOpen} title="No projects yet" text="When an architect adds your organisation as the client on a project and you accept, it appears here." testId="client-projects-empty" />
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2" data-testid="client-projects">
      {v.projects.map((p) => {
        const sketch = v.sketches[p.id]
        return (
          <li key={p.id} data-testid={`client-project-${p.id}`} className="group relative grid min-w-0 grid-cols-1 overflow-hidden rounded-lg lg:grid-cols-[13rem_minmax(0,1fr)] border border-line bg-surface transition-colors hover:border-line-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-600">
            {sketch ? <ProjectThumbnail sketch={sketch} aspect="16/10" decorative className="w-full max-sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:min-h-56" /> : null}
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="m-0 text-sm text-muted">
                  {p.typeLabel} · {p.localAuthority}
                </p>
                <h3 className="m-0 mt-0.5 text-lg font-semibold text-ink">
                  <Link to={p.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                    {p.name}
                  </Link>
                </h3>
                <RibaStageStrip stage={p.stage} showLabel size="sm" className="mt-2" />
                <p className="m-0 mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                  <CalendarDays aria-hidden="true" className="size-3.5 text-faint" />
                  Materials needed from {p.startText}
                </p>
              </div>
              <dl className="m-0 mt-auto grid grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.7fr)] gap-2 border-t border-line-soft pt-3">
                {(
                  [
                    ['To decide', String(p.waiting), p.waiting > 0],
                    ['Approved', String(p.approved), false],
                    ['Reserved', String(p.reserved), false],
                  ] as const
                ).map(([label, n, hot]) => (
                  <div key={label} className="min-w-0">
                    <dt className="truncate text-xs text-muted">{label}</dt>
                    <dd className={cx('m-0 text-base font-semibold tabular-nums sm:text-lg', hot ? 'text-info-strong' : 'text-ink')}>{n}</dd>
                  </div>
                ))}
                <div className="min-w-0">
                  <dt className="flex items-center gap-1 truncate text-xs text-muted">Cost</dt>
                  <dd className="m-0 whitespace-nowrap text-base font-semibold tabular-nums text-ink sm:text-lg">{p.costText ?? <span className="font-medium text-muted">None yet</span>}</dd>
                </div>
              </dl>
              {p.costText ? (
                <div className="relative z-[1] -mt-2 flex justify-end">
                  <IndicativeMarker />
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
