// The Save control: a popover listing each project the lot may go to, then Saved. One click adds; a second click on
// the same row removes. Rows that cannot take the lot are disabled and say why. Architect only; renders nothing otherwise.
import { useState } from 'react'
import { Popover } from 'radix-ui'
import { useStore } from '../../store/store'
import { isSavedAnywhere, saveMenuFor, type SaveMenuRow } from '../../store/views/market'
import { Bookmark, Folder } from '../../components/v1'
import { cx } from '../../components/ui'

export function SaveToWishlist({ publicId, title, variant = 'card', className }: { publicId: string; title: string; variant?: 'card' | 'detail'; className?: string }) {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const save = useStore((s) => s.saveToWishlist)
  const remove = useStore((s) => s.removeWish)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rows = saveMenuFor(world, personaId, publicId)
  if (rows.length === 0) return null
  const saved = isSavedAnywhere(rows)

  const toggle = (r: SaveMenuRow) => {
    if (!r.canToggle) return
    const err = r.saved && r.itemId ? remove(r.itemId) : save(publicId, r.projectId)
    setError(err)
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setError(null)
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${saved ? 'Saved' : 'Save'}: ${title}`}
          data-testid={`save-${publicId}`}
          data-saved={saved ? 'true' : 'false'}
          className={cx(
            'inline-flex min-h-[44px] items-center gap-2 rounded-sm border font-medium transition-colors',
            variant === 'detail' ? 'px-4 text-base' : 'px-3 text-sm',
            saved ? 'border-steel bg-steel-tint text-steel-deep hover:bg-steel-tint' : variant === 'detail' ? 'border-steel bg-steel text-panel hover:bg-steel-deep' : 'border-rule bg-panel text-ink hover:border-steel hover:text-steel',
            className,
          )}
        >
          <Bookmark filled={saved} size={18} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[min(320px,calc(100vw-24px))] rounded-md border border-rule bg-panel p-1.5 shadow-[0_0_0_1px_rgba(20,32,43,0.04),0_18px_40px_-20px_rgba(20,32,43,0.40)] focus:outline-none"
          data-testid="save-menu"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-mill-text">Save to a project wish list or to Saved</p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {rows.map((r) => {
              const key = r.projectId ?? 'saved'
              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={!r.canToggle}
                    aria-pressed={r.saved}
                    onClick={() => toggle(r)}
                    data-testid={`save-target-${key}`}
                    className={cx(
                      'flex min-h-[44px] w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm transition-colors',
                      r.canToggle ? 'hover:bg-steel-tint' : 'cursor-not-allowed',
                      r.saved && 'bg-steel-tint/60',
                    )}
                  >
                    <span className={cx('mt-0.5 shrink-0', r.canToggle || r.saved ? 'text-steel' : 'text-mill')}>{r.projectId === null ? <Bookmark size={18} filled={r.saved} /> : <Folder size={18} />}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cx('font-medium', r.canToggle || r.saved ? 'text-ink' : 'text-mill-text')}>{r.label}</span>
                      {r.note ? <span className="text-xs text-mill-text">{r.note}</span> : null}
                    </span>
                    {r.saved ? <span className="mt-0.5 shrink-0 text-xs font-medium text-teal">Added</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
          {error ? (
            <p className="m-1 rounded-sm border-l-2 border-oxide bg-oxide-tint px-2.5 py-1.5 text-xs" role="alert" data-testid="save-error">
              {error}
            </p>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
