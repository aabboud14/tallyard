// The hero drawing: a donor building coming down on the left, with scaffold on its face, a project going up on
// the right, with a crane and its top storey still open frame, and between them a yard of stacked steel beams,
// a pallet of stone and a pallet of brick, joined by a dashed route on the ground. Ink hairlines and flat fills
// on paper, no gradients, glows or blur, no arrowheads. Built from the same massing as the thumbnails, so it is
// the same every time. Drawing coordinates only (P2).
import type { ReactNode } from 'react'
import { BuildingDrawing, cx } from '../../ui'
import { buildingSketch, projectSketch } from '../../domain/sketch'
import { SCENE_CAPTIONS, SCENE_LABEL } from './landingContent'

/** Where each caption sits across the sheet, as a share of its width: under the donor, the yard and the new building. */
const SCENE_CAPTION_AT = { donor: '22%', yard: '49.5%', proposed: '76%' } as const satisfies Record<keyof typeof SCENE_CAPTIONS, string>

const W = 720
const H = 420
const GROUND = 326
const INK = '#1c1917'

/** The two buildings: fixed seeds, so the hero never changes between visits. */
const DONOR = buildingSketch({ id: 'landing-donor', storeys: 8, structureType: 'Steel frame with stone and precast cladding', use: 'office' }, ['stone_cladding', 'stone_cladding', 'precast_cladding', 'curtain_wall'])
const PROPOSED = projectSketch({ id: 'landing-new', name: 'New building', projectType: 'residential' }, ['steel_section', 'clay_brick', 'clay_brick', 'stone_cladding'])

/** Each building is drawn on the 320 by 200 thumbnail board, whose ground sits at y 190; this scales it onto the sheet. */
const SCALE = 1.6
function place(centreX: number): string {
  return `translate(${centreX - 160 * SCALE} ${GROUND - 190 * SCALE}) scale(${SCALE})`
}

type P = [number, number]
const pts = (ps: P[]): string => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/** The yard's own 30 degree axonometric, the same projection as the buildings. */
const YARD = { x: 346, y: 266, scale: 1.4 }
function A(x: number, y: number, z: number): P {
  return [YARD.x + (x - y) * 0.866 * YARD.scale, YARD.y + ((x + y) * 0.5 - z) * YARD.scale]
}

/** A box in the yard: its top, its left face (toward the viewer) and its right face, with optional joint lines. */
function Box({ x, y, z, w, d, h, fill, side, joints = 0, jointOpacity = 0.35, k }: { x: number; y: number; z: number; w: number; d: number; h: number; fill: string; side: string; joints?: number; jointOpacity?: number; k: string }) {
  const left: P[] = [A(x, y + d, z), A(x + w, y + d, z), A(x + w, y + d, z + h), A(x, y + d, z + h)]
  const right: P[] = [A(x + w, y, z), A(x + w, y + d, z), A(x + w, y + d, z + h), A(x + w, y, z + h)]
  const top: P[] = [A(x, y, z + h), A(x + w, y, z + h), A(x + w, y + d, z + h), A(x, y + d, z + h)]
  const lines: ReactNode[] = []
  for (let i = 1; i <= joints; i++) {
    const zz = z + (i * h) / (joints + 1)
    const [a, b, c] = [A(x, y + d, zz), A(x + w, y + d, zz), A(x + w, y, zz)]
    lines.push(<polyline key={`${k}j${i}`} points={pts([a, b, c])} fill="none" stroke={INK} strokeWidth="0.5" opacity={jointOpacity} />)
  }
  return (
    <g data-part="yard-item">
      <polygon points={pts(left)} fill={fill} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
      <polygon points={pts(right)} fill={side} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
      <polygon points={pts(top)} fill="#f7f5f1" stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
      {lines}
    </g>
  )
}

const TIMBER = '#c49a6c'
const TIMBER_SIDE = '#a7835c'
const STEEL = '#aeb6bd'
const STEEL_SIDE = '#949ba1'

/** Stacked beams on two timber bearers, then a pallet of stone and a pallet of brick in front. Back to front. */
function Yard() {
  const beams: { y: number; z: number }[] = [
    { y: 0, z: 5 },
    { y: 10, z: 5 },
    { y: 20, z: 5 },
    { y: 5, z: 13 },
    { y: 15, z: 13 },
  ]
  return (
    <g data-part="yard">
      <Box k="bear1" x={8} y={-3} z={0} w={6} d={34} h={5} fill={TIMBER} side={TIMBER_SIDE} />
      <Box k="bear2" x={76} y={-3} z={0} w={6} d={34} h={5} fill={TIMBER} side={TIMBER_SIDE} />
      {beams.map((b, i) => (
        <Box key={i} k={`beam${i}`} x={0} y={b.y} z={b.z} w={90} d={8} h={8} fill={STEEL} side={STEEL_SIDE} joints={1} jointOpacity={0.5} />
      ))}
      <Box k="pal1" x={4} y={46} z={0} w={30} d={30} h={4} fill={TIMBER} side={TIMBER_SIDE} />
      <Box k="stone" x={6} y={48} z={4} w={26} d={26} h={18} fill="#e6ddc8" side="#cfc7b4" joints={3} />
      <Box k="pal2" x={46} y={46} z={0} w={28} d={28} h={4} fill={TIMBER} side={TIMBER_SIDE} />
      <Box k="brick" x={48} y={48} z={4} w={24} d={24} h={24} fill="#b5654a" side="#9a563f" joints={7} jointOpacity={0.25} />
    </g>
  )
}

/** The drawing with its three captions set in HTML under each part, so they stay legible on a phone. */
export function LandingScene({ className }: { className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <SceneDrawing />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-2 h-4 text-2xs font-medium text-ink-soft sm:bottom-3 sm:text-xs">
        {(Object.keys(SCENE_CAPTIONS) as (keyof typeof SCENE_CAPTIONS)[]).map((k) => (
          <span key={k} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: SCENE_CAPTION_AT[k] }}>
            {SCENE_CAPTIONS[k]}
          </span>
        ))}
      </div>
    </div>
  )
}

function SceneDrawing() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={SCENE_LABEL} className="block h-auto w-full" data-testid="landing-scene">
      <line x1={16} y1={GROUND} x2={W - 16} y2={GROUND} stroke={INK} strokeWidth="0.75" opacity="0.5" />
      {[
        [40, 10],
        [62, 7],
        [W - 44, 9],
      ].map(([cx, r], i) => (
        <g key={i} stroke={INK} strokeWidth="0.75" fill="none" opacity="0.55">
          <circle cx={cx} cy={GROUND - 14 - r} r={r} />
          <line x1={cx} y1={GROUND - 14} x2={cx} y2={GROUND} />
        </g>
      ))}
      <g transform={place(160)}>
        <BuildingDrawing sketch={DONOR} />
      </g>
      <g transform={place(548)}>
        <BuildingDrawing sketch={PROPOSED} />
      </g>
      <path data-part="route" d={`M 236 ${GROUND + 8} L 292 ${GROUND + 54} L 420 ${GROUND + 54} L 470 ${GROUND + 8}`} fill="none" stroke={INK} strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <Yard />
    </svg>
  )
}
