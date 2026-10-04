import type { Spec } from '../../domain/types'
import { SectionDrawing, type Scale } from './SectionDrawing'
import { PanelDrawing } from './PanelDrawing'
import { titleFor } from '../../domain/reference/families'

/** The drawing for any spec. Steel sections take a shared scale so a list compares at one scale. */
export function ItemDrawing({ spec, scale, box = 110, caption = true, dims = true, className }: { spec: Spec; scale?: Scale; box?: number; caption?: boolean; dims?: boolean; className?: string }) {
  if (spec.family === 'steel_section') return <SectionDrawing designation={spec.designation} lengthM={spec.lengthM} scale={scale} caption={caption} dims={dims} className={className} />
  return <PanelDrawing spec={spec} box={box} caption={caption ? titleFor(spec) : undefined} dims={dims} className={className} />
}
