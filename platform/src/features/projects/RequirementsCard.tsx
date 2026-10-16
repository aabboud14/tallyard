// The overview's planning and sustainability card: the first few requirements the project tracks, with their
// source and kind. Until the architect chooses, the suggestions for the location are tracked, and the card says so
// with the same list the Requirements tab shows. The architect chooses; the client and the consultant track status
// on the Requirements tab, which the architect reads.
import { Link } from 'react-router'
import { ArrowRight, Landmark, ListChecks, PencilLine, Scale } from 'lucide-react'
import { PLACEHOLDER_LABEL } from '../../domain/reference/requirements'
import type { ProjectRequirementsView } from '../../store/selectors/requirements'
import { requirementsPreview } from '../../store/selectors/requirements'
import { Button, Card, CardHeader, IndicativeMarker, Pill } from '../../ui'

type Props = { view: ProjectRequirementsView; projectId: string; onEdit: () => void }

const LINK = 'inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11'

export function RequirementsCard({ view, projectId, onEdit }: Props) {
  const { shown, moreText } = requirementsPreview(view.tracked, 4)
  const empty = view.tracked.length === 0
  return (
    <Card className="flex flex-col" data-testid="requirements-card" data-suggested={view.suggestedOnly ? 'true' : undefined}>
      <CardHeader
        title="Planning and sustainability"
        icon={Landmark}
        description={empty ? view.locationText || 'No location set' : view.trackedText}
        actions={
          <>
            <IndicativeMarker />
            {view.canEdit && !empty && !view.suggestedOnly ? (
              <Button size="sm" variant="ghost" icon={PencilLine} onClick={onEdit} data-testid="requirements-edit">
                Edit
              </Button>
            ) : null}
          </>
        }
      />
      {empty ? (
        <div className="flex flex-1 flex-col items-start gap-3 px-4 py-5 sm:px-5">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-subtle text-muted ring-1 ring-inset ring-line-soft">
            <Scale aria-hidden="true" className="size-4" />
          </span>
          <p className="m-0 text-sm text-ink-soft">{view.emptyText}</p>
          {view.canEdit ? (
            <Button size="sm" variant="primary" onClick={onEdit} data-testid="requirements-choose">
              Choose requirements
            </Button>
          ) : view.noArchitect ? (
            <Link to={`/app/projects/${projectId}/team`} className={LINK} data-testid="requirements-appoint">
              Appoint an architect <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {view.suggestedNote ? (
            <div className="flex flex-col items-start gap-2.5 border-b border-line-soft bg-subtle/60 px-4 py-3 sm:px-5" data-testid="requirements-suggested-note">
              <p className="m-0 text-sm text-ink-soft">{view.suggestedNote}</p>
              {view.canEdit ? (
                <Button size="sm" variant="primary" icon={ListChecks} onClick={onEdit} data-testid="requirements-choose">
                  Review requirements
                </Button>
              ) : view.noArchitect ? (
                <Link to={`/app/projects/${projectId}/team`} className={LINK} data-testid="requirements-appoint">
                  Appoint an architect <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              ) : null}
            </div>
          ) : null}
          <ul className="m-0 flex-1 list-none divide-y divide-line-soft p-0">
            {shown.map((r) => (
              <li key={r.id} className="flex min-w-0 items-start gap-3 px-4 py-2.5 sm:px-5">
                <span className="mt-0.5 inline-flex h-5 min-w-14 shrink-0 items-center justify-center rounded-[4px] bg-subtle px-1.5 text-2xs font-semibold text-ink-soft ring-1 ring-inset ring-line-soft">{r.code}</span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-medium text-ink" title={r.title}>
                    {r.title}
                  </p>
                  <p className="m-0 truncate text-xs text-muted">{r.source}</p>
                </div>
                <Pill size="sm" tone={r.placeholder ? 'info' : 'neutral'} className="max-sm:hidden">
                  {r.placeholder ? PLACEHOLDER_LABEL : r.kindLabel}
                </Pill>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5 sm:px-5">
            <span className="text-sm text-muted">{moreText ?? 'All shown'}</span>
            <Link to={`/app/projects/${projectId}/requirements`} className={LINK} data-testid="requirements-open">
              {view.canTrack ? 'Track requirements' : 'View requirements'} <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </>
      )}
    </Card>
  )
}
