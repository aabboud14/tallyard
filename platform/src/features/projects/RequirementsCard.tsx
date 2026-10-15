// The overview's planning and sustainability card: the first few requirements the project tracks, with their
// source and kind. The architect edits them; the client and consultant track status on the Requirements tab.
import { Link } from 'react-router'
import { ArrowRight, Landmark, PencilLine, Scale } from 'lucide-react'
import type { ProjectRequirementsView } from '../../store/selectors/requirements'
import { requirementsPreview } from '../../store/selectors/requirements'
import { Button, Card, CardHeader, IndicativeMarker, Pill } from '../../ui'

type Props = { view: ProjectRequirementsView; projectId: string; onEdit: () => void }

export function RequirementsCard({ view, projectId, onEdit }: Props) {
  const { shown, moreText } = requirementsPreview(view.selected, 4)
  const empty = view.selected.length === 0
  return (
    <Card className="flex flex-col" data-testid="requirements-card">
      <CardHeader
        title="Planning and sustainability"
        icon={Landmark}
        description={empty ? view.locationText || 'No location set' : `${view.selected.length} chosen for ${view.locationText}`}
        actions={
          <>
            <IndicativeMarker />
            {view.canEdit && !empty ? (
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
            <Link to={`/app/projects/${projectId}/team`} className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11" data-testid="requirements-appoint">
              Appoint an architect <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>
      ) : (
        <>
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
                <Pill size="sm" className="max-sm:hidden">
                  {r.kindLabel}
                </Pill>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-line-soft px-4 py-2.5 sm:px-5">
            <span className="text-sm text-muted">{moreText ?? 'All shown'}</span>
            <Link to={`/app/projects/${projectId}/requirements`} className="inline-flex min-h-8 items-center gap-1 rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
              Track requirements <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </>
      )}
    </Card>
  )
}
