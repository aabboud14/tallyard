// Drawing geometry for project and building thumbnails (feedback/r2-design/shell-dashboards.md B3): blocks in
// a 30 degree axonometric on a 320 by 200 board. The storeys drawn here are drawing variation only and are never
// shown as a figure. Deterministic: the same sketch always gives the same massing.
import type { BuildingSketch, FacadeKind, SketchUse } from '../../domain/sketch'
import { rngFor } from './rng'

export const SKETCH_BOARD = { width: 320, height: 200 } as const

/** Where the building's origin sits on the board. */
const ORIGIN = { x: 160, y: 150 } as const

/** 30 degree axonometric: x runs down to the right, y down to the left, z up. Offset to the board. */
export function axo(x: number, y: number, z: number, origin: { x: number; y: number } = ORIGIN): [number, number] {
  return [round((x - y) * 0.866 + origin.x), round((x + y) * 0.5 - z + origin.y)]
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}

export type MassingBlock = {
  x: number
  y: number
  /** Base height of the block. */
  z: number
  w: number
  d: number
  h: number
  storeyH: number
  /** Number of storeys in this block. */
  storeys: number
  facade: FacadeKind | 'plain'
}

export type Massing = {
  storeys: number
  blocks: MassingBlock[]
  bays: number
  crane: boolean
  scaffold: boolean
  /** Board offset so the whole drawing sits inside the board. */
  origin: { x: number; y: number }
}

const RANGE: Record<SketchUse, [number, number]> = {
  office: [6, 9],
  hotel: [7, 10],
  residential: [4, 6],
  industrial: [2, 3],
  other: [3, 5],
}

/** Split one mass into facade bands, bottom to top, one block per band. */
function bands(x: number, y: number, z: number, w: number, d: number, storeys: number, storeyH: number, facades: FacadeKind[]): MassingBlock[] {
  const kinds: (FacadeKind | 'plain')[] = facades.length > 0 ? facades : ['plain']
  const n = Math.min(kinds.length, storeys)
  const out: MassingBlock[] = []
  let done = 0
  for (let i = 0; i < n; i++) {
    const next = Math.round(((i + 1) * storeys) / n)
    const count = next - done
    out.push({ x, y, z: z + done * storeyH, w, d, h: count * storeyH, storeyH, storeys: count, facade: kinds[i] })
    done = next
  }
  return out
}

export function massingFor(s: BuildingSketch): Massing {
  const r = rngFor(`massing:${s.seed}`)
  const [lo, hi] = RANGE[s.use]
  const storeys = s.storeys !== null ? Math.min(12, Math.max(2, Math.round(s.storeys))) : lo + Math.floor(r() * (hi - lo + 1))
  const bays = 3 + Math.floor(r() * 3)
  // The plan footprint first, then the storey height that fits the board above it, with room for the crane.
  const plan: Record<SketchUse, [number, number]> = { office: [72, 50], hotel: [84, 60], residential: [98, 60], industrial: [120, 66], other: [62, 50] }
  const [px, py] = plan[s.use]
  const room = SKETCH_BOARD.height - 10 - (px + py) * 0.5 - 28
  const storeyH = Math.min(s.use === 'industrial' ? 14 : 10, room / storeys)
  const blocks: MassingBlock[] = []
  switch (s.use) {
    case 'hotel':
      blocks.push(...bands(0, 0, 0, 84, 60, 2, storeyH, s.facades.slice(0, 1)))
      blocks.push(...bands(17, 12, 2 * storeyH, 50, 36, storeys - 2, storeyH, s.facades.length > 1 ? s.facades.slice(1) : s.facades))
      break
    case 'residential':
      blocks.push(...bands(0, 0, 0, 46, 36, storeys, storeyH, s.facades))
      blocks.push(...bands(52, 24, 0, 46, 36, Math.max(2, storeys - 1), storeyH, s.facades))
      break
    default:
      blocks.push(...bands(0, 0, 0, px, py, storeys, storeyH, s.facades))
  }
  // Centre the footprint across the board and stand its nearest corner on a ground line 10 px above the bottom.
  const maxX = Math.max(...blocks.map((b) => b.x + b.w))
  const maxY = Math.max(...blocks.map((b) => b.y + b.d))
  const origin = { x: round(SKETCH_BOARD.width / 2 - ((maxX - maxY) * 0.866) / 2), y: round(SKETCH_BOARD.height - 10 - (maxX + maxY) * 0.5) }
  return { storeys, blocks, bays, crane: s.state === 'proposed', scaffold: s.state === 'existing', origin }
}

/** Every corner the drawing uses, for the bounds test. */
export function massingPoints(m: Massing): [number, number][] {
  const pts: [number, number][] = []
  for (const b of m.blocks) {
    for (const x of [b.x, b.x + b.w]) for (const y of [b.y, b.y + b.d]) for (const z of [b.z, b.z + b.h]) pts.push(axo(x, y, z, m.origin))
  }
  if (m.crane) for (const p of cranePoints(m)) pts.push(p)
  return pts
}

/** The tower crane: a mast beside the tallest block and a jib over it, kept inside the board. */
export function cranePoints(m: Massing): [number, number][] {
  const top = Math.max(...m.blocks.map((b) => b.z + b.h))
  const maxY = Math.max(...m.blocks.map((b) => b.y + b.d))
  const base = axo(-6, maxY * 0.4, 0, m.origin)
  const mastTop: [number, number] = [base[0], Math.max(8, axo(-6, maxY * 0.4, top + 20, m.origin)[1])]
  const jibEnd: [number, number] = [Math.min(SKETCH_BOARD.width - 8, mastTop[0] + 92), mastTop[1]]
  const counter: [number, number] = [Math.max(8, mastTop[0] - 26), mastTop[1]]
  return [base, mastTop, jibEnd, counter]
}
