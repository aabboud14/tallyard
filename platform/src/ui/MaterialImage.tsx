// The picture of a material: the first public photo when there is one, otherwise the illustration generated
// from the survey record, deterministic from the public ID. An illustration is never called a photo.
import { useId } from 'react'
import { Camera, PenTool } from 'lucide-react'
import type { Spec } from '../domain/types'
import { FAMILIES } from '../domain/reference/families'
import { cx } from './cx'
import { rngFor, svgId } from './illustration/rng'
import { BOARD, illustrationLabel } from './illustration/helpers'
import { MaterialArt } from './illustration/swatches'

export function MaterialIllustration({ spec, publicId, className }: { spec: Spec; publicId: string; className?: string }) {
  const uid = svgId('mi', publicId, useId())
  const r = rngFor(`${publicId}:${spec.family}`)
  return (
    <svg viewBox={`0 0 ${BOARD.width} ${BOARD.height}`} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={illustrationLabel(spec)} data-family={spec.family}>
      <MaterialArt spec={spec} r={r} uid={uid} />
    </svg>
  )
}

export type MaterialImageProps = {
  spec: Spec
  publicId: string
  /** The first public photo, when there is one. */
  photo?: string | null
  /** Alternative text for a photo. */
  alt?: string
  aspect?: '4/3' | '3/2' | '16/10' | '1/1' | 'fill'
  /** A small chip in the corner saying whether this is a photo or an illustration. */
  showKind?: boolean
  rounded?: 'none' | 'md' | 'lg' | 'xl'
  className?: string
  eager?: boolean
  testId?: string
}

const aspects = { '4/3': 'aspect-[4/3]', '3/2': 'aspect-[3/2]', '16/10': 'aspect-[16/10]', '1/1': 'aspect-square', fill: 'size-full' }
const radii = { none: '', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl' }

export function MaterialImage({ spec, publicId, photo, alt, aspect = '4/3', showKind = false, rounded = 'none', className, eager = false, testId }: MaterialImageProps) {
  const isPhoto = !!photo
  return (
    <div data-testid={testId} data-kind={isPhoto ? 'photo' : 'illustration'} className={cx('relative isolate w-full overflow-hidden bg-subtle', aspects[aspect], radii[rounded], className)}>
      {isPhoto ? (
        <img src={photo!} alt={alt ?? `Photo of ${FAMILIES[spec.family].label.toLowerCase()}`} loading={eager ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 size-full object-cover" />
      ) : (
        <MaterialIllustration spec={spec} publicId={publicId} className="absolute inset-0 size-full" />
      )}
      <div aria-hidden="true" className={cx('pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06]', radii[rounded])} />
      {showKind ? (
        <span className="absolute bottom-2 left-2 inline-flex h-6 items-center gap-1.5 rounded-full bg-white/80 px-2 text-[11px] font-medium text-ink-soft shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
          {isPhoto ? <Camera aria-hidden="true" className="size-3" /> : <PenTool aria-hidden="true" className="size-3" />}
          {isPhoto ? 'Photo' : 'Illustration'}
        </span>
      ) : null}
    </div>
  )
}
