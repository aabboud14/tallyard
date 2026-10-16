// The Marketplace's front door: Structure, Envelope and Finishes as folders, each with a mosaic of up to three of
// its materials, the count, its families and, with a project checked, its fit counts in the checking strip's words
// ("10 available now, 1 in time"), so the folders add up to the strip. On a narrow screen they
// are compact rows, so the page never scrolls sideways.
import type { ReactNode } from 'react'
import { ChevronRight, FolderOpen } from 'lucide-react'
import type { CategoryFolder, CategoryThumb } from '../../store/selectors/marketplace'
import type { ProjectRef } from '../../store/selectors/common'
import { cx, MaterialImage, TYPOLOGY_VIZ } from '../../ui'
import { usePhotoSrc } from './photo'

function Tile({ thumb, className, eager }: { thumb: CategoryThumb; className?: string; eager?: boolean }) {
  const photo = usePhotoSrc(thumb.photo)
  return <MaterialImage spec={thumb.spec} publicId={thumb.publicId} photo={photo} alt={`Photo of ${thumb.title}`} aspect="fill" eager={eager} className={className ?? 'size-full'} />
}

/**
 * A 2 by 1 frame, so every tile keeps the 4 by 3 board of the drawings and nothing is cropped: three are one large
 * tile beside two stacked ones (columns 2 to 1); two split it; one sits in the middle on paper.
 */
function Mosaic({ thumbs }: { thumbs: CategoryThumb[] }) {
  if (thumbs.length === 0) return <div className="aspect-[2/1] bg-paper" />
  if (thumbs.length === 1) {
    return (
      <div aria-hidden="true" className="flex aspect-[2/1] justify-center bg-paper">
        <Tile thumb={thumbs[0]} eager className="aspect-[4/3] h-full w-auto border-x border-line" />
      </div>
    )
  }
  return (
    <div aria-hidden="true" className={cx('grid aspect-[2/1] gap-px bg-line', thumbs.length === 2 ? 'grid-cols-2' : 'grid-cols-[2fr_1fr] grid-rows-2')}>
      {thumbs.map((t, i) => (
        <Tile key={t.publicId} thumb={t} eager className={cx('size-full', thumbs.length === 3 && i === 0 && 'row-span-2')} />
      ))}
    </div>
  )
}

function countText(n: number): string {
  return n === 1 ? '1 material' : `${n} materials`
}

function FolderCard({ folder, project, onOpen }: { folder: CategoryFolder; project: ProjectRef | null; onOpen: () => void }) {
  const empty = folder.count === 0
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={empty}
      aria-label={`Open ${folder.label}, ${countText(folder.count)}`}
      data-testid={`category-${folder.typology}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface text-left transition-colors hover:border-line-strong focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-default disabled:hover:border-line"
    >
      <div className={cx('w-full border-b border-line', empty && 'opacity-50')}>
        <Mosaic thumbs={folder.thumbs} />
      </div>
      <div className="relative flex w-full flex-1 flex-col gap-1 py-4 pl-5 pr-4">
        <span aria-hidden="true" className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-[2px]" style={{ background: TYPOLOGY_VIZ[folder.typology] }} />
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="flex min-w-0 items-center gap-2">
            <FolderOpen aria-hidden="true" className="size-4 shrink-0 self-center text-muted" />
            <span className={cx('text-lg font-semibold', empty ? 'text-muted' : 'text-ink')}>{folder.label}</span>
          </span>
          <span className="shrink-0 text-sm tabular-nums text-muted">{countText(folder.count)}</span>
        </span>
        <span className="text-sm text-muted">{folder.description}</span>
        {empty ? (
          <span className="mt-1 text-sm text-faint">Nothing listed yet</span>
        ) : (
          <span className="mt-1 line-clamp-2 text-sm text-ink-soft">{folder.families.map((f) => f.label).join(', ')}</span>
        )}
        {project && folder.fitsText && !empty ? (
          <span className="mt-2 inline-flex items-baseline gap-1.5 text-sm text-ink-soft" data-testid={`category-fits-${folder.typology}`}>
            <span aria-hidden="true" className="size-1.5 shrink-0 self-center rounded-full bg-mark-good" />
            <span>
              <span className="font-medium text-ink">{project.name}:</span> <span className="tabular-nums">{folder.fitsText}</span>
            </span>
          </span>
        ) : null}
      </div>
    </button>
  )
}

function FolderRow({ folder, project, onOpen }: { folder: CategoryFolder; project: ProjectRef | null; onOpen: () => void }) {
  const empty = folder.count === 0
  const first = folder.thumbs[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={empty}
      aria-label={`Open ${folder.label}, ${countText(folder.count)}`}
      data-testid={`category-row-${folder.typology}`}
      className="flex min-h-[76px] w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 disabled:cursor-default"
    >
      <span aria-hidden="true" className={cx('size-16 shrink-0 overflow-hidden rounded-md border border-line', empty && 'opacity-50')}>
        {first ? <Tile thumb={first} /> : <span className="block size-full bg-paper" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3.5 w-[3px] shrink-0 rounded-[2px]" style={{ background: TYPOLOGY_VIZ[folder.typology] }} />
          <span className={cx('truncate text-md font-semibold', empty ? 'text-muted' : 'text-ink')}>{folder.label}</span>
        </span>
        <span className="truncate text-sm text-muted">{empty ? 'Nothing listed yet' : countText(folder.count)}</span>
        {project && folder.fitsText && !empty ? <span className="text-sm tabular-nums text-ink-soft">{folder.fitsText}</span> : null}
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-faint" />
    </button>
  )
}

export function CategoryFolders({ folders, project, onOpen, aside }: { folders: CategoryFolder[]; project: ProjectRef | null; onOpen: (typology: CategoryFolder['typology']) => void; /** Beside the heading, for example the jump to New for your projects. */ aside?: ReactNode }) {
  return (
    <section aria-labelledby="browse-by-category" data-testid="category-folders">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="browse-by-category" className="m-0 text-lg font-semibold text-ink">
          Browse by category
        </h2>
        {aside}
      </div>
      <div className="grid grid-cols-3 gap-5 max-md:hidden">
        {folders.map((f) => (
          <FolderCard key={f.typology} folder={f} project={project} onOpen={() => onOpen(f.typology)} />
        ))}
      </div>
      <div className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line md:hidden">
        {folders.map((f) => (
          <FolderRow key={f.typology} folder={f} project={project} onOpen={() => onOpen(f.typology)} />
        ))}
      </div>
    </section>
  )
}
