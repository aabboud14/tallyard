// Drawing helpers shared by the illustrations and the dimensioned drawings. Drawing coordinates only.
import type { Spec } from '../../domain/types'
import { FAMILIES } from '../../domain/reference/families'
import { sectionOrThrow } from '../../domain/reference/sections'

/** Every illustration is drawn on this board and sliced to fill its frame. */
export const BOARD = { width: 480, height: 360 } as const

/** Where a drawing keeps its content so that 16:10 and square frames, which slice the board, never cut it. */
export const SAFE = { left: 64, right: BOARD.width - 64, top: 36, bottom: BOARD.height - 34 } as const

/** `card` for cards and thumbnails; `detail` for the material page, drawn larger. */
export type DrawingView = 'card' | 'detail'

/** Text sizes in board units. A card shows the board at about half size, so its labels are drawn larger. */
export const TEXT_SIZE: Record<DrawingView, number> = { card: 17, detail: 11 }

/** "Illustration of clay brick". Names the family; never calls it a photo. */
export function illustrationLabel(spec: Spec): string {
  const label = FAMILIES[spec.family].label
  return `Illustration of ${label.charAt(0).toLowerCase()}${label.slice(1)}`
}

export type DrawingScale = { pxPerMm: number }

/** One scale for every section in a list: the largest fits the box. */
export function scaleFor(designations: string[], boxPx = 140): DrawingScale {
  const sizes = designations.map((d) => {
    const s = sectionOrThrow(d)
    return Math.max(s.h, s.b)
  })
  return { pxPerMm: boxPx / Math.max(1, ...sizes) }
}

/** Outline of an I section, clockwise from the top left, with root fillets of radius r. */
export function profilePath(h: number, b: number, tw: number, tf: number, r: number): string {
  const wl = (b - tw) / 2
  const wr = wl + tw
  const fb = h - tf
  const rr = Math.min(r, wl - 0.5, (fb - tf) / 2 - 0.5)
  return [
    'M 0 0',
    `H ${b}`,
    `V ${tf}`,
    `H ${wr + rr}`,
    `A ${rr} ${rr} 0 0 0 ${wr} ${tf + rr}`,
    `V ${fb - rr}`,
    `A ${rr} ${rr} 0 0 0 ${wr + rr} ${fb}`,
    `H ${b}`,
    `V ${h}`,
    'H 0',
    `V ${fb}`,
    `H ${wl - rr}`,
    `A ${rr} ${rr} 0 0 0 ${wl} ${fb - rr}`,
    `V ${tf + rr}`,
    `A ${rr} ${rr} 0 0 0 ${wl - rr} ${tf}`,
    'H 0',
    'Z',
  ].join(' ')
}

