// The material's pictures: public photos first, then the illustration generated from the survey record and the
// dimensioned drawing. A photo is shown beside the drawing, never instead of it (09 section 13.10).
import { useState } from 'react'
import { Camera, PenTool, Ruler } from 'lucide-react'
import type { Spec } from '../../domain/types'
import type { GalleryEntry } from '../../store/selectors/discover'
import { cx, MaterialDrawing, MaterialImage } from '../../ui'
import { usePhotoSrc } from '../discover/photo'

function PhotoView({ photo, title, thumb = false }: { photo: { id: string; src: string | null }; title: string; thumb?: boolean }) {
  const src = usePhotoSrc(photo)
  if (!src) return <div className={cx('flex size-full items-center justify-center bg-subtle text-muted', thumb ? '' : 'text-sm')}>{thumb ? <Camera aria-hidden="true" className="size-4" /> : 'Loading photo'}</div>
  return <img src={src} alt={thumb ? '' : `Photo of ${title}`} className="size-full object-cover" />
}

function DrawingView({ spec, big }: { spec: Spec; big: boolean }) {
  return (
    <div className="flex size-full items-center justify-center bg-[#fbfbfa] [background-image:linear-gradient(to_right,rgb(28_25_23/0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgb(28_25_23/0.045)_1px,transparent_1px)] [background-size:20px_20px]">
      <MaterialDrawing spec={spec} box={big ? 200 : 60} caption={big} dims={big} className={big ? 'h-auto max-h-[78%] w-auto max-w-[78%]' : 'h-auto max-h-[70%] w-auto max-w-[70%]'} />
    </div>
  )
}

function entryLabel(e: GalleryEntry, i: number): string {
  if (e.kind === 'photo') return `Photo ${i + 1}`
  if (e.kind === 'illustration') return 'Illustration'
  return 'Dimensioned drawing'
}

export function MaterialGallery({ entries, spec, publicId, title }: { entries: GalleryEntry[]; spec: Spec; publicId: string; title: string }) {
  const [index, setIndex] = useState(0)
  const current = entries[Math.min(index, entries.length - 1)]
  const caption = current.kind === 'photo' ? 'Photo from the survey, published by the owner' : current.caption
  const CaptionIcon = current.kind === 'photo' ? Camera : current.kind === 'illustration' ? PenTool : Ruler
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="material-gallery">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-subtle shadow-[0_0_0_1px_rgb(28_25_23/0.06)]" data-kind={current.kind}>
        {current.kind === 'photo' ? <PhotoView photo={current} title={title} /> : current.kind === 'illustration' ? <MaterialImage spec={spec} publicId={publicId} aspect="fill" eager /> : <DrawingView spec={spec} big />}
      </div>
      <figcaption className="flex items-center gap-1.5 text-sm text-muted" data-testid="gallery-caption">
        <CaptionIcon aria-hidden="true" className="size-3.5 shrink-0" />
        {caption}
      </figcaption>
      {entries.length > 1 ? (
        <div role="tablist" aria-label="Pictures" className="flex gap-2.5">
          {entries.map((e, i) => {
            const active = i === index
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={entryLabel(e, i)}
                onClick={() => setIndex(i)}
                data-testid={`gallery-thumb-${e.kind}`}
                className={cx(
                  'relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-subtle transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:size-16',
                  active ? 'shadow-[0_0_0_2px_var(--color-ink)]' : 'shadow-[0_0_0_1px_rgb(28_25_23/0.08)] hover:shadow-[0_0_0_1px_rgb(28_25_23/0.2)]',
                )}
              >
                {e.kind === 'photo' ? <PhotoView photo={e} title={title} thumb /> : e.kind === 'illustration' ? <MaterialImage spec={spec} publicId={publicId} aspect="fill" /> : <DrawingView spec={spec} big={false} />}
              </button>
            )
          })}
        </div>
      ) : null}
    </figure>
  )
}
