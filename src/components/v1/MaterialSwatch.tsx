// A 4:3 illustration of a material, generated from the survey record. Never a photograph.
// The same public ID always draws the same picture: a tiny hash of the ID seeds the variation.
import { useId, type ReactNode } from 'react'
import type { Spec } from '../../domain/types'
import { FAMILIES } from '../../domain/reference/families'
import { SectionDrawing } from '../drawings/SectionDrawing'
import { cx } from '../ui'
import { between, pick, rngFor, svgId, type Rng } from './rng'

const W = 400
const H = 300

/** "Illustration of clay brick". Names the family; never calls it a photo. */
function swatchLabel(spec: Spec): string {
  const label = FAMILIES[spec.family].label
  return `Illustration of ${label.charAt(0).toLowerCase()}${label.slice(1)}`
}

export function MaterialSwatch({ spec, publicId, className, testId }: { spec: Spec; publicId: string; className?: string; testId?: string }) {
  const uid = svgId('sw', publicId, useId())
  const r = rngFor(`${publicId}:${spec.family}`)
  return (
    <div role="img" aria-label={swatchLabel(spec)} data-testid={testId} data-family={spec.family} className={cx('relative aspect-[4/3] w-full overflow-hidden bg-rule-soft', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
        {art(spec, r, uid)}
      </svg>
      {spec.family === 'steel_section' ? (
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <SectionDrawing designation={spec.designation} caption={false} dims={false} className="h-[62%] w-auto max-w-[70%] drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]" />
        </div>
      ) : null}
    </div>
  )
}

function art(spec: Spec, r: Rng, uid: string): ReactNode {
  switch (spec.family) {
    case 'clay_brick':
      return <Brick r={r} uid={uid} stock={/stock/i.test(spec.brickType)} lime={/lime/i.test(spec.mortar)} />
    case 'stone_cladding':
      return <Stone r={r} uid={uid} />
    case 'curtain_wall':
      return <CurtainWall r={r} uid={uid} ratio={spec.panelHeightM / spec.panelWidthM} />
    case 'precast_cladding':
      return <Precast r={r} uid={uid} />
    case 'raised_floor':
      return <RaisedFloor r={r} uid={uid} />
    case 'timber_joist':
      return <Timber r={r} uid={uid} />
    case 'steel_section':
      return <SteelGround r={r} uid={uid} />
  }
}

/** A soft light from the top left, laid over every ground so the swatches read as one set. */
function Light({ uid }: { uid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#14202B" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-light)`} />
    </>
  )
}

// Brick: stretcher bond, 215 by 65 faces with 10 mm joints, drawn at about 0.3 px per mm.
const CLAY = ['#9E4A32', '#B25A3C', '#8A3F2B', '#A9533A', '#C0684A', '#94452F', '#7E3828']
const STOCK = ['#C9B48A', '#B8A27A', '#D6C39A', '#A8916A', '#C2A57A', '#BBA27C', '#9C8460']

function Brick({ r, uid, stock, lime }: { r: Rng; uid: string; stock: boolean; lime: boolean }) {
  const tints = stock ? STOCK : CLAY
  const mortar = lime ? '#E6DFD0' : '#C8C5BD'
  const joint = 3.2
  const bw = 66
  const bh = 19.5
  const course = bh + joint
  const shift = between(r, 0, bw)
  const rows: ReactNode[] = []
  for (let row = 0, y = -between(r, 0, course); y < H; row++, y += course) {
    const offset = (row % 2 === 0 ? 0 : (bw + joint) / 2) - shift
    for (let x = offset - (bw + joint); x < W; x += bw + joint) {
      const fill = pick(r, tints)
      rows.push(<rect key={`${row}-${x.toFixed(1)}`} x={x} y={y} width={bw} height={bh} fill={fill} opacity={between(r, 0.86, 1)} />)
      if (r() < 0.18) rows.push(<rect key={`${row}-${x.toFixed(1)}-s`} x={x + between(r, 4, bw - 16)} y={y + between(r, 3, bh - 6)} width={between(r, 4, 12)} height={between(r, 1.5, 3)} fill="#14202B" opacity="0.08" />)
    }
  }
  return (
    <>
      <rect width={W} height={H} fill={mortar} />
      {rows}
      <Light uid={uid} />
    </>
  )
}

// Stone: pale Portland ground in large modules, faint veining and shell flecks.
function Stone({ r, uid }: { r: Rng; uid: string }) {
  const ground = pick(r, ['#ECE7DA', '#E8E2D2', '#EFEADF'])
  const cols = pick(r, [2, 3])
  const rows = 2
  const veins: ReactNode[] = []
  for (let i = 0; i < 7; i++) {
    const y0 = between(r, 0, H)
    const d = `M -10 ${y0.toFixed(1)} C ${between(r, 60, 160).toFixed(1)} ${(y0 + between(r, -60, 60)).toFixed(1)}, ${between(r, 220, 320).toFixed(1)} ${(y0 + between(r, -60, 60)).toFixed(1)}, ${W + 10} ${(y0 + between(r, -40, 40)).toFixed(1)}`
    veins.push(<path key={`v${i}`} d={d} fill="none" stroke="#B9AE93" strokeWidth={between(r, 0.4, 1.3)} opacity={between(r, 0.18, 0.4)} />)
  }
  const flecks: ReactNode[] = []
  for (let i = 0; i < 90; i++) {
    const cx = between(r, 0, W)
    const cy = between(r, 0, H)
    flecks.push(<ellipse key={`f${i}`} cx={cx} cy={cy} rx={between(r, 0.6, 2.2)} ry={between(r, 0.4, 1.2)} fill="#A79C80" opacity={between(r, 0.12, 0.3)} transform={`rotate(${between(r, 0, 180).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})`} />)
  }
  const joints: ReactNode[] = []
  for (let c = 1; c < cols; c++) joints.push(<line key={`c${c}`} x1={(W / cols) * c} y1={0} x2={(W / cols) * c} y2={H} stroke="#CFC6B0" strokeWidth="2.5" />)
  for (let k = 1; k < rows; k++) joints.push(<line key={`r${k}`} x1={0} y1={(H / rows) * k} x2={W} y2={(H / rows) * k} stroke="#CFC6B0" strokeWidth="2.5" />)
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-stone`} cx={between(r, 0.3, 0.7)} cy={between(r, 0.3, 0.7)} r="0.8">
          <stop offset="0" stopColor="#F6F2E8" />
          <stop offset="1" stopColor={ground} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-stone)`} />
      <g transform={`translate(${between(r, -20, 20).toFixed(1)} 0)`}>{flecks}</g>
      {veins}
      {joints}
      <Light uid={uid} />
    </>
  )
}

// Curtain wall: a glazed grid of panels with mullions and transoms over a soft sky.
function CurtainWall({ r, uid, ratio }: { r: Rng; uid: string; ratio: number }) {
  const panelW = 110
  const panelH = Math.max(110, Math.min(300, panelW * ratio))
  const ox = -between(r, 0, panelW)
  const oy = -between(r, 0, panelH * 0.6)
  const mullion = 7
  const frame = '#4A5560'
  const streak = between(r, 40, 300)
  const panels: ReactNode[] = []
  for (let x = ox; x < W; x += panelW) {
    for (let y = oy; y < H; y += panelH) {
      panels.push(<rect key={`p${x.toFixed(0)}-${y.toFixed(0)}`} x={x + mullion / 2} y={y + mullion / 2} width={panelW - mullion} height={panelH - mullion} fill={`url(#${uid}-sky)`} />)
      panels.push(<rect key={`s${x.toFixed(0)}-${y.toFixed(0)}`} x={x + mullion / 2} y={y + panelH * 0.78} width={panelW - mullion} height={panelH * 0.22 - mullion / 2} fill="#5E6B76" opacity="0.55" />)
    }
  }
  const lines: ReactNode[] = []
  for (let x = ox; x < W + panelW; x += panelW) lines.push(<rect key={`m${x.toFixed(0)}`} x={x - mullion / 2} y={0} width={mullion} height={H} fill={frame} />)
  for (let y = oy; y < H + panelH; y += panelH) lines.push(<rect key={`t${y.toFixed(0)}`} x={0} y={y - mullion / 2} width={W} height={mullion} fill={frame} />)
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pick(r, ['#A9C6DC', '#B4CEE0', '#9FBFD6'])} />
          <stop offset="0.75" stopColor="#DCE8F0" />
          <stop offset="1" stopColor="#EEF3F6" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={frame} />
      {panels}
      <polygon points={`${streak},0 ${streak + 70},0 ${streak - 80},${H} ${streak - 150},${H}`} fill="#ffffff" opacity="0.16" />
      <polygon points={`${streak + 95},0 ${streak + 112},0 ${streak - 38},${H} ${streak - 55},${H}`} fill="#ffffff" opacity="0.12" />
      {lines}
      <Light uid={uid} />
    </>
  )
}

// Precast: grey concrete ground with an exposed aggregate dot field and panel joints.
function Precast({ r, uid }: { r: Rng; uid: string }) {
  const ground = pick(r, ['#BDBFBB', '#C3C2BC', '#B8BBB9'])
  const stones = ['#8F918D', '#D9DAD6', '#A39C8F', '#7F807B', '#CBC6BB', '#9AA0A3']
  const dots: ReactNode[] = []
  for (let i = 0; i < 520; i++) {
    dots.push(<circle key={i} cx={between(r, 0, W).toFixed(1)} cy={between(r, 0, H).toFixed(1)} r={between(r, 0.6, 2.4).toFixed(2)} fill={pick(r, stones)} opacity={between(r, 0.55, 0.95).toFixed(2)} />)
  }
  const jx = between(r, 150, 250)
  return (
    <>
      <rect width={W} height={H} fill={ground} />
      {dots}
      <line x1={jx} y1={0} x2={jx} y2={H} stroke="#8A8C88" strokeWidth="3" opacity="0.7" />
      <line x1={jx + 1.5} y1={0} x2={jx + 1.5} y2={H} stroke="#E4E5E1" strokeWidth="0.8" opacity="0.6" />
      <Light uid={uid} />
    </>
  )
}

// Raised floor: a 600 grid of tiles in plan, with pedestal heads at the corners.
function RaisedFloor({ r, uid }: { r: Rng; uid: string }) {
  const tile = 92
  const gap = 3
  const ox = -between(r, 0, tile)
  const oy = -between(r, 0, tile)
  const tints = ['#C9CED2', '#C3C8CC', '#CDD2D5', '#BEC4C9']
  const cells: ReactNode[] = []
  for (let x = ox; x < W; x += tile) {
    for (let y = oy; y < H; y += tile) {
      const k = `${x.toFixed(0)}-${y.toFixed(0)}`
      cells.push(<rect key={`t${k}`} x={x + gap / 2} y={y + gap / 2} width={tile - gap} height={tile - gap} rx="2" fill={pick(r, tints)} stroke="#8F979E" strokeWidth="1" />)
      cells.push(<rect key={`i${k}`} x={x + 9} y={y + 9} width={tile - 18} height={tile - 18} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.35" />)
      cells.push(<circle key={`c${k}`} cx={x} cy={y} r="3.2" fill="#6F777E" />)
    }
  }
  return (
    <>
      <rect width={W} height={H} fill="#7F878E" />
      {cells}
      <Light uid={uid} />
    </>
  )
}

// Timber: boards seen from the side, with grain lines and the odd knot.
function Timber({ r, uid }: { r: Rng; uid: string }) {
  const boards = 4
  const bh = H / boards
  const tints = ['#C99B62', '#BF8F55', '#D1A56C', '#B98650']
  const out: ReactNode[] = []
  for (let b = 0; b < boards; b++) {
    const y0 = b * bh
    out.push(<rect key={`b${b}`} x={0} y={y0} width={W} height={bh - 3} fill={pick(r, tints)} />)
    for (let g = 0; g < 9; g++) {
      const y = y0 + between(r, 4, bh - 7)
      const a = between(r, -6, 6)
      const d = `M -10 ${y.toFixed(1)} C ${between(r, 80, 160).toFixed(0)} ${(y + a).toFixed(1)}, ${between(r, 240, 320).toFixed(0)} ${(y - a).toFixed(1)}, ${W + 10} ${(y + between(r, -3, 3)).toFixed(1)}`
      out.push(<path key={`g${b}-${g}`} d={d} fill="none" stroke="#8A5A2E" strokeWidth={between(r, 0.5, 1.4)} opacity={between(r, 0.25, 0.55)} />)
    }
    if (r() < 0.6) {
      const kx = between(r, 40, W - 40)
      const ky = y0 + bh / 2
      out.push(
        <g key={`k${b}`} opacity="0.7">
          <ellipse cx={kx} cy={ky} rx={between(r, 7, 12)} ry={between(r, 4, 7)} fill="#8A5A2E" opacity="0.55" />
          <ellipse cx={kx} cy={ky} rx="16" ry="9" fill="none" stroke="#8A5A2E" strokeWidth="0.8" opacity="0.5" />
        </g>,
      )
    }
    out.push(<rect key={`e${b}`} x={0} y={y0 + bh - 3} width={W} height={3} fill="#6E4524" opacity="0.6" />)
  }
  return (
    <>
      <rect width={W} height={H} fill="#6E4524" />
      {out}
      <Light uid={uid} />
    </>
  )
}

// Steel: a mill-grey ground with a faint drafting grid; the section drawing sits on top.
function SteelGround({ r, uid }: { r: Rng; uid: string }) {
  const step = 20
  const ox = Math.floor(between(r, 0, step))
  const oy = Math.floor(between(r, 0, step))
  const grid: ReactNode[] = []
  for (let x = ox; x < W; x += step) grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#ffffff" strokeWidth={(x - ox) % (step * 5) === 0 ? 0.9 : 0.4} opacity="0.55" />)
  for (let y = oy; y < H; y += step) grid.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#ffffff" strokeWidth={(y - oy) % (step * 5) === 0 ? 0.9 : 0.4} opacity="0.55" />)
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-mill`} x1="0" y1="0" x2={between(r, 0.6, 1).toFixed(2)} y2="1">
          <stop offset="0" stopColor="#D5DBE0" />
          <stop offset="1" stopColor="#BCC5CC" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-mill)`} />
      {grid}
      <Light uid={uid} />
    </>
  )
}
