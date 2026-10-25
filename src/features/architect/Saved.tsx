// Saved (brief/09-V1-PRODUCT.md section 3.3): the practice's general list, with no project yet. Each card can move
// to a project's wish list or be removed. Formats the savedView rows only.
import { useState } from 'react'
import { Link } from 'react-router'
import { Popover } from 'radix-ui'
import { useStore } from '../../store/store'
import { savedView, type WishRow } from '../../store/v1selectors'
import { MarketCard, CardGrid } from '../market/MarketCard'
import { Button, Note, PageTitle, cx } from '../../components/ui'
import { Bookmark, Folder } from '../../components/v1'
import { NotAvailable } from '../../app/params'
import { LABELS } from '../../domain/reference/labels'

export function Saved() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const [error, setError] = useState<string | null>(null)
  const v = savedView(world, personaId)
  if (!v) return <NotAvailable />
  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Saved" sub="Materials you like but have no project for yet. Move one to a project when it finds a home." />
      {error ? (
        <Note tone="oxide" testId="saved-error">
          {error}
        </Note>
      ) : null}
      {v.rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-rule bg-panel px-6 py-10" data-testid="saved-empty">
          <span className="text-steel">
            <Bookmark size={24} />
          </span>
          <p className="m-0 text-base font-medium">Nothing saved yet.</p>
          <p className="m-0 max-w-lg text-sm text-mill-text">Use Save on any listing in the marketplace and pick Saved. It stays here until you move it to a project.</p>
          <Link to="/market" className="inline-flex min-h-[44px] items-center rounded-sm border border-steel bg-steel px-4 text-base font-medium text-panel no-underline hover:bg-steel-deep">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <>
          <p className="m-0 text-sm text-mill-text" data-testid="saved-count">
            {v.rows.length === 1 ? '1 saved lot' : `${v.rows.length} saved lots`}
          </p>
          <CardGrid testId="saved-grid">
            {v.rows.map((r) => (
              <li key={r.item.id} className="flex">
                <SavedCard row={r} onError={setError} />
              </li>
            ))}
          </CardGrid>
          <p className="m-0 text-xs text-mill-text" data-testid="label-L37">
            {LABELS.L37}
          </p>
        </>
      )}
    </div>
  )
}

function SavedCard({ row: r, onError }: { row: WishRow; onError: (e: string | null) => void }) {
  const remove = useStore((s) => s.removeWish)
  const actions = (
    <>
      {r.canMove ? <MoveMenu row={r} onError={onError} /> : null}
      {r.canRemove ? (
        <Button size="lg" variant="quiet" onClick={() => onError(remove(r.item.id))} data-testid={`saved-remove-${r.item.publicId}`} aria-label={`Remove ${r.title} from Saved`}>
          Remove
        </Button>
      ) : null}
    </>
  )
  if (r.state !== 'ok' || !r.listing || !r.band) {
    return (
      <article className="flex w-full flex-col gap-3 rounded-md border border-dashed border-rule bg-panel px-4 py-4" data-testid={`saved-card-${r.item.publicId}`}>
        <h3 className="m-0 font-display text-xl leading-tight tracking-wide text-mill-text">{r.title}</h3>
        <p className="m-0 text-sm text-ink-soft" data-testid={`saved-state-${r.item.publicId}`}>
          {r.stateText}
        </p>
        <div className="mt-auto flex justify-end">{actions}</div>
      </article>
    )
  }
  return <MarketCard card={{ listing: r.listing, typologyLabel: r.typologyLabel, band: r.band, fit: r.fit }} canSave={false} testId={`saved-card-${r.item.publicId}`} footerExtra={actions} />
}

function MoveMenu({ row: r, onError }: { row: WishRow; onError: (e: string | null) => void }) {
  const move = useStore((s) => s.moveWish)
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="lg" variant="primary" className="text-panel" data-testid={`saved-move-${r.item.publicId}`} aria-label={`Move ${r.title} to a project`}>
          Move to project
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} collisionPadding={12} className="z-50 w-[min(320px,calc(100vw-24px))] rounded-md border border-rule bg-panel p-1.5 shadow-[0_0_0_1px_rgba(20,32,43,0.04),0_18px_40px_-20px_rgba(20,32,43,0.40)] focus:outline-none" data-testid="move-menu">
          <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-mill-text">Move to a project wish list</p>
          {r.moveTargets.length === 0 ? <p className="px-2.5 py-2 text-sm text-mill-text">Create a project first.</p> : null}
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {r.moveTargets.map((t) => (
              <li key={t.projectId ?? 'saved'}>
                <button
                  type="button"
                  disabled={!t.allowed}
                  onClick={() => {
                    const err = move(r.item.id, t.projectId)
                    onError(err)
                    if (!err) setOpen(false)
                  }}
                  data-testid={`move-target-${t.projectId ?? 'saved'}`}
                  className={cx('flex min-h-[44px] w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm', t.allowed ? 'hover:bg-steel-tint' : 'cursor-not-allowed')}
                >
                  <span className={cx('mt-0.5 shrink-0', t.allowed ? 'text-steel' : 'text-mill')}>
                    <Folder size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className={cx('font-medium', t.allowed ? 'text-ink' : 'text-mill-text')}>{t.label}</span>
                    {t.reason ? <span className="text-xs text-mill-text">{t.reason}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
