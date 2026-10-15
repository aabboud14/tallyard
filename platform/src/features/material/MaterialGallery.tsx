// The material's pictures on a plain white stage: public photos first, then the spinnable 3D view built from the
// recorded dimensions, the illustration generated from the survey record and the dimensioned drawing. The stage
// opens on the first photo, else the 3D view, else the illustration. A photo is shown beside the drawing, never
// instead of it (09 section 13.10). Long members open in close-up so the section reads; a toggle shows the full
// length, and Reset view turns the model back.
import { useId, useState } from 'react'
import { Box, Camera, MoveHorizontal, PenTool, Ruler } from 'lucide-react'
import type { FamilyId, Spec } from '../../domain/types'
import type { ModelGeometry } from '../../domain/engines/geometry'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import type { GalleryEntry } from '../../store/selectors/discover'
import { cx, MaterialDrawing, MaterialImage, ModelViewer } from '../../ui'
import { usePhotoSrc } from '../discover/photo'

type StageEntry = GalleryEntry | { kind: 'model' }

function PhotoView({ photo, title, thumb = false }: { photo: { id: string; src: string | null }; title: string; thumb?: boolean }) {
  const src = usePhotoSrc(photo)
  if (!src) return <div className={cx('flex size-full items-center justify-center bg-paper text-muted', thumb ? '' : 'text-sm')}>{thumb ? <Camera aria-hidden="true" className="size-4" /> : 'Loading photo'}</div>
  return <img src={src} alt={thumb ? '' : `Photo of ${title}`} className="size-full object-cover" />
}

function DrawingView({ spec, big }: { spec: Spec; big: boolean }) {
  return (
    <div className="flex size-full items-center justify-center bg-surface">
      <MaterialDrawing spec={spec} box={big ? 200 : 60} caption={big} dims={big} className={big ? 'h-auto max-h-[78%] w-auto max-w-[78%]' : 'h-auto max-h-[70%] w-auto max-w-[70%]'} />
    </div>
  )
}

function entryLabel(e: StageEntry, i: number): string {
  if (e.kind === 'photo') return `Photo ${i + 1}`
  if (e.kind === 'model') return '3D view'
  if (e.kind === 'illustration') return 'Illustration'
  return 'Dimensioned drawing'
}

const CONTROL =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-ink-soft shadow-xs hover:border-line-strong hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:h-11 [&_svg]:size-3.5'

export function MaterialGallery({ entries, spec, family, publicId, title, model }: { entries: GalleryEntry[]; spec: Spec; family: FamilyId; publicId: string; title: string; model: ModelGeometry | null }) {
  const photos = entries.filter((e) => e.kind === 'photo')
  const rest = entries.filter((e) => e.kind !== 'photo')
  const all: StageEntry[] = [...photos, ...(model ? [{ kind: 'model' as const }] : []), ...rest]
  const [index, setIndex] = useState(0)
  const [fullLength, setFullLength] = useState(false)
  const captionId = useId()
  const current = all[Math.min(index, all.length - 1)]
  const closeUp = model && model.closeUp && !fullLength ? model.closeUp : null

  let caption: string
  let CaptionIcon = Ruler
  if (current.kind === 'photo') {
    caption = 'Photo from the survey, published by the owner'
    CaptionIcon = Camera
  } else if (current.kind === 'model') {
    caption = [`${LABELS.L42} Drag or use the arrow keys to turn it.`, closeUp && model?.closeUpMm ? `Shown ${f.number(model.closeUpMm)} mm long so the section reads. The download is the full ${f.number(model.lengthMm)} mm.` : null, model?.placeholderNote ?? null].filter(Boolean).join(' ')
    CaptionIcon = Box
  } else {
    caption = current.caption
    CaptionIcon = current.kind === 'illustration' ? PenTool : Ruler
  }

  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="material-gallery">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-surface ring-1 ring-line" data-kind={current.kind} data-testid="gallery-stage">
        {current.kind === 'photo' ? (
          <PhotoView photo={current} title={title} />
        ) : current.kind === 'model' && model ? (
          <ModelViewer
            mesh={closeUp ?? model.mesh}
            family={family}
            title={title}
            describedBy={captionId}
            className="flex size-full items-center justify-center [&>[data-testid=model-viewer]]:w-full"
            actions={
              model.closeUp ? (
                <button type="button" onClick={() => setFullLength((v) => !v)} aria-pressed={fullLength} className={CONTROL} data-testid="model-length">
                  <MoveHorizontal aria-hidden="true" />
                  {fullLength ? 'Show close up' : 'Show full length'}
                </button>
              ) : null
            }
          />
        ) : current.kind === 'illustration' ? (
          <MaterialImage spec={spec} publicId={publicId} aspect="fill" view="detail" eager />
        ) : (
          <DrawingView spec={spec} big />
        )}
      </div>
      <figcaption id={captionId} className="flex items-start gap-1.5 text-sm text-muted" data-testid="gallery-caption">
        <CaptionIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{caption}</span>
      </figcaption>
      {all.length > 1 ? (
        <div role="tablist" aria-label="Pictures" className="flex flex-wrap gap-2.5">
          {all.map((e, i) => {
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
                  'relative size-[72px] shrink-0 overflow-hidden rounded-md bg-surface transition-shadow focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:size-16',
                  active ? 'shadow-[0_0_0_2px_var(--color-ink)]' : 'shadow-[0_0_0_1px_var(--color-line)] hover:shadow-[0_0_0_1px_var(--color-line-strong)]',
                )}
              >
                {e.kind === 'photo' ? (
                  <PhotoView photo={e} title={title} thumb />
                ) : e.kind === 'model' && model ? (
                  <span className="flex size-full items-center justify-center">
                    <ModelViewer mesh={model.closeUp ?? model.mesh} family={family} title={title} size="thumb" testId="gallery-model-thumb" className="w-full" />
                  </span>
                ) : e.kind === 'illustration' ? (
                  <MaterialImage spec={spec} publicId={publicId} aspect="fill" />
                ) : (
                  <DrawingView spec={spec} big={false} />
                )}
                {e.kind === 'model' ? <span className="absolute bottom-1 right-1 rounded-[3px] bg-surface/95 px-1 text-2xs font-medium text-ink-soft ring-1 ring-line">3D</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </figure>
  )
}
