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

type Aspect = '16/10' | '4/3' | '3/2' | '1/1'
type Rounded = 'none' | 'md' | 'top'

const ASPECT: Record<Aspect, string> = { '16/10': 'aspect-[16/10]', '4/3': 'aspect-[4/3]', '3/2': 'aspect-[3/2]', '1/1': 'aspect-square' }
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

export function ProjectThumbnail({ sketch, materials = [], aspect = '16/10', rounded = 'none', decorative = false, className, testId }: ThumbnailProps & { materials?: ThumbMaterial[] }) {
  return (
    <Frame aspect={aspect} rounded={rounded} className={className} testId={testId}>
      <BuildingIllustration sketch={sketch} decorative={decorative} className="absolute inset-0 size-full" />
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

export function BuildingThumbnail({ sketch, aspect = '16/10', rounded = 'none', decorative = false, className, testId }: ThumbnailProps) {
  return (
    <Frame aspect={aspect} rounded={rounded} className={className} testId={testId}>
      <BuildingIllustration sketch={sketch} decorative={decorative} className="absolute inset-0 size-full" />
    </Frame>
  )
}
