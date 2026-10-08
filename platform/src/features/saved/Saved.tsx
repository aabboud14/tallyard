// Saved: materials the practice likes with no project yet ("that is nice, but I have no project for it"). Each can
// move to a project when one comes along, or be removed.
import { Link } from 'react-router'
import { Bookmark, Compass, FolderInput, Trash2, TriangleAlert } from 'lucide-react'
import * as f from '../../domain/format'
import { formatDate } from '../../domain/dates'
import { act, useView } from '../../store'
import { savedView } from '../../store/selectors/shortlist'
import type { ShortlistRow } from '../../store/selectors/shortlist'
import { Button, Card, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, EmptyState, IconButton, IndicativeMarker, toast } from '../../ui'
import { Page } from '../../app/Page'
import { ListingTile } from '../discover/ListingTile'

function MoveMenu({ row }: { row: ShortlistRow }) {
  const allowed = row.moveTargets.filter((t) => t.projectId !== null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" icon={FolderInput} disabled={!row.canMove || allowed.length === 0} data-testid={`move-${row.publicId}`}>
          Move to project
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {allowed.map((t) => (
          <DropdownMenuItem
            key={t.projectId}
            disabled={!t.allowed}
            onSelect={() => {
              const r = act.moveItem(row.itemId, t.projectId)
              if (!r.ok) toast.error(r.error ?? 'That could not be moved.')
              else toast.success(`Moved to ${t.label}`, { description: row.title, action: { label: 'Undo', onClick: r.undo } })
            }}
            className="items-start py-2"
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{t.label}</span>
              {t.reason ? <span className="whitespace-normal text-xs text-muted">{t.reason}</span> : null}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function remove(row: ShortlistRow) {
  const r = act.removeFromList(row.itemId)
  if (!r.ok) toast.error(r.error ?? 'That could not be removed.')
  else toast({ title: 'Removed from Saved', description: row.title, action: { label: 'Undo', onClick: r.undo } })
}

export function Saved() {
  const view = useView(savedView)
  if (!view) return null
  const ok = view.rows.filter((r) => r.card)
  const gone = view.rows.filter((r) => !r.card)
  return (
    <Page width="wide" testId="saved">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-2xl font-semibold text-ink">Saved</h1>
          <p className="m-0 mt-1 max-w-xl text-base text-muted">Materials you like with no project yet. Move one to a project when it finds a home.</p>
        </div>
        {!view.empty ? (
          <div className="flex items-center gap-4 text-sm text-muted" data-testid="saved-totals">
            <span>
              <span className="font-medium tabular-nums text-ink">{view.totals.all.count}</span> saved
            </span>
            <span>
              <span className="font-medium tabular-nums text-ink">{f.massT(view.totals.all.massT)}</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="font-medium tabular-nums text-ink">{f.carbon(view.totals.all.avoidedT)}</span> avoided
              <IndicativeMarker />
            </span>
          </div>
        ) : null}
      </header>

      {view.empty ? (
        <EmptyState
          variant="page"
          icon={Bookmark}
          title="Nothing saved yet"
          text="When a material catches your eye but has no project yet, save it here from Discover. It waits until a project comes along."
          action={
            <Button asChild variant="primary" icon={Compass}>
              <Link to="/app/discover">Browse Discover</Link>
            </Button>
          }
          className="mt-6"
          testId="saved-empty"
        />
      ) : (
        <div className="@container mt-8">
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 @lg:grid-cols-2 @3xl:grid-cols-3 @7xl:grid-cols-4" data-testid="saved-grid">
            {ok.map((r) => (
              <div key={r.itemId} className="flex flex-col gap-3">
                <ListingTile card={r.card!} canSave={false} />
                <div className="flex items-center gap-2 px-0.5">
                  <MoveMenu row={r} />
                  <IconButton icon={Trash2} label={`Remove ${r.title} from Saved`} size="sm" disabled={!r.canRemove} onClick={() => remove(r)} />
                  <span className="ml-auto text-xs text-faint">Saved {formatDate(r.addedOn)}</span>
                </div>
              </div>
            ))}
          </div>
          {gone.length > 0 ? (
            <div className="mt-12">
              <h2 className="m-0 mb-3 text-md font-semibold text-ink">No longer available</h2>
              <Card className="divide-y divide-line-soft">
                {gone.map((r) => (
                  <div key={r.itemId} className="flex items-center gap-3 px-4 py-3">
                    <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate font-medium text-ink">{r.title}</p>
                      <p className="m-0 text-sm text-muted">{r.stateText}</p>
                    </div>
                    <IconButton icon={Trash2} label={`Remove ${r.title}`} size="sm" disabled={!r.canRemove} onClick={() => remove(r)} />
                  </div>
                ))}
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </Page>
  )
}
