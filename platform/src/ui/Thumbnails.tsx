// Project and building thumbnails: the generated axonometric (BuildingIllustration) in a paper frame. A project
// thumbnail adds up to three small swatches of its shortlisted materials along the bottom edge. The thumbnail
// has one accessible name, the sketch's label; the swatches are decorative.
import type { ReactNode } from 'react'
import type { BuildingSketch } from '../domain/sketch'
import type { Spec } from '../domain/types'
import { cx } from './cx'
import { BuildingIllustration } from './illustration/BuildingIllustration'
import { MaterialIllustration } from './MaterialImage'

export type ThumbMaterial = { publicId: string; spec: Spec }

/** 'fill' takes its height from the container (the className sets it), for a frame that runs the height of a card. */
type Aspect = '16/10' | '4/3' | '3/2' | '1/1' | 'fill'
type Rounded = 'none' | 'md' | 'top'

const ASPECT: Record<Aspect, string> = { '16/10': 'aspect-[16/10]', '4/3': 'aspect-[4/3]', '3/2': 'aspect-[3/2]', '1/1': 'aspect-square', fill: '' }
const ROUNDED: Record<Rounded, string> = { none: '', md: 'rounded-md', top: 'rounded-t-lg' }

export type ThumbnailProps = {
  sketch: BuildingSketch
  aspect?: Aspect
  rounded?: Rounded
  /** Hide from assistive technology when the name sits beside the thumbnail. */
  decorative?: boolean
  className?: string
  testId?: string
}

function Frame({ aspect, rounded, className, testId, children }: { aspect: Aspect; rounded: Rounded; className?: string; testId?: string; children: ReactNode }) {
  return (
    <div data-testid={testId} data-kind="illustration" className={cx('relative isolate min-w-0 overflow-hidden bg-paper', ASPECT[aspect], ROUNDED[rounded], className)}>
      {children}
      <div aria-hidden="true" className={cx('pointer-events-none absolute inset-0 ring-1 ring-inset ring-line', ROUNDED[rounded])} />
    </div>
  )
}

/**
 * `fit` crops the drawing to the building and scales it to fill the frame above the swatch band, for a frame whose
 * shape is not the board's (a tall card column), so the building never sits small at the bottom of empty paper.
 */
export function ProjectThumbnail({ sketch, materials = [], aspect = '16/10', rounded = 'none', decorative = false, fit = false, className, testId }: ThumbnailProps & { materials?: ThumbMaterial[]; fit?: boolean }) {
  return (
    <Frame aspect={aspect} rounded={rounded} className={className} testId={testId}>
      {fit ? (
        <BuildingIllustration sketch={sketch} decorative={decorative} fit className={cx('absolute inset-x-3 top-3 block h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]', materials.length > 0 && 'h-[calc(100%-3.5rem)]')} />
      ) : (
        // The swatches sit bottom left, so the left trees give way to them.
        <BuildingIllustration sketch={sketch} decorative={decorative} trees={materials.length > 0 ? 'right' : 'both'} className="absolute inset-0 size-full" />
      )}
      {materials.length > 0 ? (
        <div aria-hidden="true" className="absolute bottom-2 left-2 flex gap-1.5">
          {materials.slice(0, 3).map((m) => (
            <span key={m.publicId} className="block size-7 overflow-hidden rounded-[3px] bg-surface ring-2 ring-surface">
              <MaterialIllustration spec={m.spec} publicId={m.publicId} className="block size-full" />
            </span>
          ))}
        </div>
      ) : null}
    </Frame>
  )
}

/** `fit`, as on a project thumbnail, crops the drawing to the building and scales it to fill the frame. */
export function BuildingThumbnail({ sketch, aspect = '16/10', rounded = 'none', decorative = false, fit = false, className, testId }: ThumbnailProps & { fit?: boolean }) {
  return (
    <Frame aspect={aspect} rounded={rounded} className={className} testId={testId}>
      {fit ? (
        <BuildingIllustration sketch={sketch} decorative={decorative} fit className="absolute inset-3 block h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]" />
      ) : (
        <BuildingIllustration sketch={sketch} decorative={decorative} className="absolute inset-0 size-full" />
      )}
    </Frame>
  )
}

// ---------- Compact thumbs for a page header's leading slot or a list row ----------

type ThumbSize = 'sm' | 'md' | 'lg'

/** sm 32 by 32 for list rows, md 48 by 48 for page headers, lg 96 by 72 to lead a card. */
const THUMB_SIZE: Record<ThumbSize, string> = { sm: 'size-8', md: 'size-12', lg: 'h-[72px] w-24' }

export type ThumbProps = {
  sketch: BuildingSketch
  size?: ThumbSize
  /**
   * Decorative by default: a thumb sits beside the project or building name, so the name already says what it is.
   * Pass false to give it the sketch's label.
   */
  decorative?: boolean
  className?: string
  testId?: string
}

function CompactThumb({ sketch, size = 'md', decorative = true, className, testId }: ThumbProps) {
  return (
    <span
      data-testid={testId}
      data-kind="illustration"
      data-size={size}
      className={cx('relative isolate block shrink-0 overflow-hidden rounded-md border border-line bg-paper', THUMB_SIZE[size], className)}
    >
      <BuildingIllustration sketch={sketch} decorative={decorative} fit className="absolute inset-0.5 block size-[calc(100%-4px)]" />
    </span>
  )
}

/** A project's drawing at header size, in place of a folder tile. */
export function ProjectThumb(props: ThumbProps) {
  return <CompactThumb {...props} />
}

/** A building's drawing at header size, in place of a building tile. */
export function BuildingThumb(props: ThumbProps) {
  return <CompactThumb {...props} />
}
