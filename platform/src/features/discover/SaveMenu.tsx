// Save a material to one of the architect's projects or to Saved. The menu lists every place with a tick where it
// is saved already, and says why a place cannot take it. Each change confirms with a toast that can undo it.
import type { ReactElement } from 'react'
import { useNavigate } from 'react-router'
import { Bookmark, BookmarkCheck, Folder, FolderPlus } from 'lucide-react'
import { useView } from '../../store'
import { saveTargets, type SaveTarget } from '../../store/selectors/discover'
import { toggleSave } from './save'
import type { ListingCard } from '../../store/selectors/common'
import { cx, DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../ui'

function TargetItem({ t, publicId, title }: { t: SaveTarget; publicId: string; title: string }) {
  const hint = t.saved ? (t.reason ?? t.status) : t.reason
  const Icon = t.projectId === null ? Bookmark : Folder
  return (
    <DropdownMenuCheckboxItem
      checked={t.saved}
      disabled={!t.canToggle}
      data-testid={`save-target-${t.projectId ?? 'saved'}`}
      onSelect={(e) => {
        e.preventDefault()
        toggleSave(publicId, title, t)
      }}
      className="items-start py-2 data-[disabled]:opacity-100"
    >
      <span className={cx('flex min-w-0 flex-1 items-start gap-2', !t.canToggle && 'opacity-60')}>
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-ink">{t.label}</span>
          {hint ? <span className="whitespace-normal text-xs leading-4 text-muted">{hint}</span> : null}
        </span>
      </span>
    </DropdownMenuCheckboxItem>
  )
}

function SaveMenuContent({ publicId, title }: { publicId: string; title: string }) {
  const navigate = useNavigate()
  const targets = useView(saveTargets, publicId) ?? []
  const projects = targets.filter((t) => t.projectId !== null)
  const general = targets.filter((t) => t.projectId === null)
  return (
    <>
      <DropdownMenuLabel>Save to a project</DropdownMenuLabel>
      {projects.length === 0 ? <p className="m-0 px-2 pb-2 text-sm text-muted">You have no projects yet.</p> : null}
      {projects.map((t) => (
        <TargetItem key={t.projectId} t={t} publicId={publicId} title={title} />
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Or keep it for later</DropdownMenuLabel>
      {general.map((t) => (
        <TargetItem key="saved" t={t} publicId={publicId} title={title} />
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem icon={FolderPlus} onSelect={() => navigate('/app/projects/new')}>
        New project
      </DropdownMenuItem>
    </>
  )
}

export function SaveMenu({ publicId, title, trigger, align = 'end' }: { publicId: string; title: string; trigger: ReactElement; align?: 'start' | 'end' | 'center' }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72" data-testid="save-menu">
        <SaveMenuContent publicId={publicId} title={title} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The Save control over a card's picture: "Save", or "Saved" in green once it is on any list. */
export function CardSaveButton({ card }: { card: ListingCard }) {
  const saved = card.savedIn.length > 0
  const where = card.savedIn.map((s) => s.label).join(', ')
  return (
    <SaveMenu
      publicId={card.publicId}
      title={card.title}
      trigger={
        <button
          type="button"
          data-testid={`save-${card.publicId}`}
          aria-label={saved ? `Saved to ${where}. Change where ${card.title} is saved` : `Save ${card.title}`}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium shadow-[0_1px_2px_rgb(28_25_23/0.12),0_4px_12px_-4px_rgb(28_25_23/0.25)] ring-1 backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:h-10 [&_svg]:size-4',
            saved ? 'bg-brand-600 text-white ring-brand-700/40 hover:bg-brand-700' : 'bg-white/95 text-ink ring-black/5 hover:bg-white',
          )}
        >
          {saved ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
          {saved ? 'Saved' : 'Save'}
        </button>
      }
    />
  )
}
