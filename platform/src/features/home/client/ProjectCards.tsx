// The client's project cards: the drawn thumbnail with its material swatches, the stage on the RIBA strip, what is
// waiting, approved and reserved, and the indicative cost of the reclaimed materials so far. A project with nothing
// shortlisted yet says so. A client with no projects gets a short first-run welcome with the steps ahead.
import { Link } from 'react-router'
import { CalendarDays, Hourglass, ListChecks } from 'lucide-react'
import type { ClientHomeView } from '../../../store/selectors/sustainability-screens'
import { cx, IndicativeMarker, Pill, ProjectThumbnail, RibaStageStrip } from '../../../ui'
import { FirstRunCard } from '../FirstRunCard'

const STEPS = [
  { title: 'Your architect adds you as the client', text: 'Ask them to choose your organisation when they create the project in Tallyard.' },
  { title: 'Accept the project', text: 'The request appears at the top of this page. Nothing about the project reaches you until you accept.' },
  { title: 'Approve and reserve materials', text: 'Your architect sends what they shortlist. You approve it, then request a reservation from the seller.' },
] as const

/** The first-run welcome for a client with no projects yet: what happens next, in three steps. */
export function ClientWelcome() {
  return (
    <FirstRunCard
      testId="client-projects-empty"
      title="No projects yet"
      text="When an architect adds your organisation as the client on a project and you accept, it appears here with its programme, costs, carbon and approvals."
      steps={STEPS}
    />
  )
}

export function ProjectCards({ v }: { v: ClientHomeView }) {
  if (v.projects.length === 0) return <ClientWelcome />
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2" data-testid="client-projects">
      {v.projects.map((p) => {
        const sketch = v.sketches[p.id]
        const extra = v.cardExtras[p.id]
        return (
          <li key={p.id} data-testid={`client-project-${p.id}`} className="group relative grid min-w-0 grid-cols-1 overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-600 lg:grid-cols-[13rem_minmax(0,1fr)]">
            {sketch ? (
              // The building is cropped to itself and scaled to fill the frame: 16 by 10 on top of the card below
              // lg, the card's full height beside it from lg.
              <ProjectThumbnail sketch={sketch} materials={extra?.materials ?? []} fit aspect="fill" className="aspect-[16/10] w-full border-line-soft max-lg:border-b max-sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:min-h-52 lg:border-r" testId={`client-project-thumb-${p.id}`} />
            ) : null}
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="m-0 text-sm text-muted" data-testid={`client-project-place-${p.id}`}>
                  {extra?.placeText ?? p.typeLabel}
                </p>
                <h3 className="m-0 mt-0.5 text-lg font-semibold text-ink">
                  <Link to={p.href} className="outline-none after:absolute after:inset-0 after:content-['']">
                    {p.name}
                  </Link>
                </h3>
                {extra?.status ? (
                  <Pill tone={extra.status.kind === 'setting_up' ? 'brand' : 'neutral'} icon={extra.status.kind === 'setting_up' ? ListChecks : Hourglass} size="sm" className="mt-2" data-testid={`client-project-status-${p.id}`}>
                    {extra.status.label}
                  </Pill>
                ) : null}
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
