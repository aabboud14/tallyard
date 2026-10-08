// Material illustrations generated from the survey record. Never a photograph. The same public ID always
// draws the same picture: a hash of the ID seeds every variation. Drawn on a 480 by 360 board and sliced to
// fill any frame, with a shared light, grain and vignette so every family reads as one set.
// Coordinates here are drawing only (P2 allows it inside SVG components).
import type { ReactNode } from 'react'
import type { Spec } from '../../domain/types'
import { sectionOrThrow } from '../../domain/reference/sections'
import { between, pick, type Rng } from './rng'
import { BOARD, profilePath } from './helpers'

const W = BOARD.width
const H = BOARD.height

/** The illustration for one family, drawn on the shared board. */
export function MaterialArt({ spec, r, uid }: { spec: Spec; r: Rng; uid: string }) {
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
      return <Steel r={r} uid={uid} designation={spec.designation} />
  }
}

/** Light from the top left, a fine grain and a soft vignette, laid over every family. */
export function Finish({ uid, grain = 0.12, light = 0.2 }: { uid: string; grain?: number; light?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={light} />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#1c1917" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id={`${uid}-vig`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#1c1917" stopOpacity="0" />
          <stop offset="1" stopColor="#1c1917" stopOpacity="0.16" />
        </radialGradient>
        <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0 0.08  0 0 0 1.4 -0.45" />
        </filter>
      </defs>
      <rect width={W} height={H} filter={`url(#${uid}-grain)`} opacity={grain} />
      <rect width={W} height={H} fill={`url(#${uid}-light)`} />
      <rect width={W} height={H} fill={`url(#${uid}-vig)`} />
    </>
  )
}

// Brick: stretcher bond, 215 by 65 faces with 10 mm joints. Each brick has its own fire tint, a lit top
// arris and a shadow into the recessed joint below.
const CLAY = ['#9b4a33', '#ad573b', '#8a412d', '#a65239', '#b9654a', '#934632', '#7f3a29', '#a14d36']
const STOCK = ['#c8b088', '#baa27b', '#d3bf98', '#ab936d', '#c1a57c', '#b89f79', '#9e8664', '#cbb48c']

function Brick({ r, uid, stock, lime }: { r: Rng; uid: string; stock: boolean; lime: boolean }) {
  const tints = stock ? STOCK : CLAY
  const mortar = lime ? '#e2dacb' : '#c9c6bf'
  const joint = 3.4
  const bw = 46
  const bh = 14
  const course = bh + joint
  const shift = between(r, 0, bw)
  const out: ReactNode[] = []
  let row = 0
  for (let y = -between(r, 0, course); y < H; y += course, row++) {
    const offset = (row % 2 === 0 ? 0 : (bw + joint) / 2) - shift
    for (let x = offset - (bw + joint); x < W; x += bw + joint) {
      const k = `${row}-${x.toFixed(1)}`
      const burnt = r() < 0.07
      out.push(<rect key={`b${k}`} x={x} y={y} width={bw} height={bh} rx="0.8" fill={burnt ? (stock ? '#7d6a50' : '#5e2a1f') : pick(r, tints)} />)
      out.push(<rect key={`t${k}`} x={x} y={y} width={bw} height={bh} rx="0.8" fill={r() < 0.5 ? '#ffffff' : '#1c1917'} opacity={between(r, 0, 0.09)} />)
      out.push(<rect key={`h${k}`} x={x + 0.6} y={y} width={bw - 1.2} height="1" fill="#ffffff" opacity="0.16" />)
      out.push(<rect key={`s${k}`} x={x} y={y + bh} width={bw} height="1.4" fill="#1c1917" opacity="0.2" />)
      const specks = Math.floor(between(r, 0, stock ? 5 : 3))
      for (let s = 0; s < specks; s++) {
        out.push(<circle key={`p${k}-${s}`} cx={x + between(r, 2, bw - 2)} cy={y + between(r, 2, bh - 2)} r={between(r, 0.4, 1.1)} fill="#1c1917" opacity={between(r, 0.12, 0.3)} />)
      }
    }
  }
  return (
    <>
      <rect width={W} height={H} fill={mortar} />
      {out}
      <Finish uid={uid} grain={0.16} />
    </>
  )
}

// Stone: Portland ashlar in courses, each block its own tone, shell flecks and faint veining, fine joints.
function Stone({ r, uid }: { r: Rng; uid: string }) {
  const ground = pick(r, ['#ebe5d6', '#e7e0cf', '#eee9dd'])
  const courseH = pick(r, [118, 124, 132])
  const blocks: ReactNode[] = []
  let row = 0
  for (let y = -between(r, 0, courseH * 0.6); y < H; y += courseH, row++) {
    let x = -between(r, 20, 160)
    while (x < W) {
      const bwid = between(r, 170, 250)
      blocks.push(<rect key={`k${row}-${x.toFixed(0)}`} x={x} y={y} width={bwid} height={courseH} fill={r() < 0.5 ? '#ffffff' : '#a49878'} opacity={between(r, 0.02, 0.12)} />)
      blocks.push(<rect key={`j${row}-${x.toFixed(0)}`} x={x - 1.2} y={y} width="2.4" height={courseH} fill="#cfc5ad" />)
      blocks.push(<rect key={`js${row}-${x.toFixed(0)}`} x={x + 1.2} y={y} width="1" height={courseH} fill="#ffffff" opacity="0.5" />)
      x += bwid
    }
    blocks.push(<rect key={`c${row}`} x={0} y={y - 1.2} width={W} height="2.4" fill="#cfc5ad" />)
    blocks.push(<rect key={`cs${row}`} x={0} y={y + 1.2} width={W} height="1" fill="#ffffff" opacity="0.55" />)
  }
  const flecks: ReactNode[] = []
  for (let i = 0; i < 220; i++) {
    const cx = between(r, 0, W)
    const cy = between(r, 0, H)
    flecks.push(<ellipse key={`f${i}`} cx={cx} cy={cy} rx={between(r, 0.5, 2.6)} ry={between(r, 0.3, 1.1)} fill={r() < 0.8 ? '#9d9277' : '#f8f5ee'} opacity={between(r, 0.12, 0.42)} transform={`rotate(${between(r, 0, 180).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})`} />)
  }
  const veins: ReactNode[] = []
  for (let i = 0; i < 5; i++) {
    const y0 = between(r, 0, H)
    const d = `M -10 ${y0.toFixed(1)} C ${between(r, 80, 200).toFixed(1)} ${(y0 + between(r, -50, 50)).toFixed(1)}, ${between(r, 260, 400).toFixed(1)} ${(y0 + between(r, -50, 50)).toFixed(1)}, ${W + 10} ${(y0 + between(r, -30, 30)).toFixed(1)}`
    veins.push(<path key={`v${i}`} d={d} fill="none" stroke="#b5aa8d" strokeWidth={between(r, 0.4, 1)} opacity={between(r, 0.15, 0.32)} />)
  }
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-stone`} cx={between(r, 0.25, 0.6)} cy={between(r, 0.2, 0.5)} r="0.9">
          <stop offset="0" stopColor="#f7f3ea" />
          <stop offset="1" stopColor={ground} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-stone)`} />
      {flecks}
      {veins}
      {blocks}
      <Finish uid={uid} grain={0.14} light={0.16} />
    </>
  )
}

// Curtain wall: one sky reflected across the whole facade, panes with their own tint, spandrel bands at the
// floors, and mullions with a lit edge.
function CurtainWall({ r, uid, ratio }: { r: Rng; uid: string; ratio: number }) {
  const panelW = 132
  const panelH = Math.max(150, Math.min(330, panelW * ratio))
  const ox = -between(r, 10, panelW - 10)
  const oy = -between(r, 0, panelH * 0.5)
  const frame = '#3f4a53'
  const m = 6
  const sky = pick(r, [
    ['#8fb3cf', '#c9dbe8', '#eef3f6'],
    ['#9dbdd6', '#d3e1ec', '#f1f4f6'],
    ['#86a9c6', '#c2d5e4', '#e9eff3'],
  ])
  const clouds: ReactNode[] = []
  for (let i = 0; i < 6; i++) {
    clouds.push(<ellipse key={`c${i}`} cx={between(r, 0, W)} cy={between(r, 20, H * 0.7)} rx={between(r, 50, 140)} ry={between(r, 14, 34)} fill="#ffffff" opacity={between(r, 0.25, 0.55)} />)
  }
  const panes: ReactNode[] = []
  const mullions: ReactNode[] = []
  for (let x = ox; x < W; x += panelW) {
    mullions.push(<rect key={`m${x.toFixed(0)}`} x={x - m / 2} y={0} width={m} height={H} fill={frame} />)
    mullions.push(<rect key={`mh${x.toFixed(0)}`} x={x - m / 2} y={0} width="1.2" height={H} fill="#ffffff" opacity="0.28" />)
    for (let y = oy; y < H; y += panelH) {
      const k = `${x.toFixed(0)}-${y.toFixed(0)}`
      panes.push(<rect key={`p${k}`} x={x} y={y} width={panelW} height={panelH} fill={r() < 0.5 ? '#ffffff' : '#20344a'} opacity={between(r, 0.02, 0.12)} />)
      panes.push(<rect key={`s${k}`} x={x} y={y + panelH * 0.8} width={panelW} height={panelH * 0.2} fill="#46525c" opacity="0.88" />)
      panes.push(<rect key={`sh${k}`} x={x} y={y + panelH * 0.8} width={panelW} height="1.5" fill="#ffffff" opacity="0.18" />)
    }
  }
  for (let y = oy; y < H + panelH; y += panelH) {
    mullions.push(<rect key={`t${y.toFixed(0)}`} x={0} y={y - m / 2} width={W} height={m} fill={frame} />)
    mullions.push(<rect key={`th${y.toFixed(0)}`} x={0} y={y - m / 2} width={W} height="1.2" fill="#ffffff" opacity="0.22" />)
  }
  const streak = between(r, 60, 380)
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.6" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <filter id={`${uid}-blur`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-sky)`} />
      <g filter={`url(#${uid}-blur)`}>{clouds}</g>
      {panes}
      <polygon points={`${streak},0 ${streak + 90},0 ${streak - 70},${H} ${streak - 160},${H}`} fill="#ffffff" opacity="0.14" />
      <polygon points={`${streak + 118},0 ${streak + 136},0 ${streak - 24},${H} ${streak - 42},${H}`} fill="#ffffff" opacity="0.12" />
      {mullions}
      <Finish uid={uid} grain={0.08} light={0.12} />
    </>
  )
}

// Precast: grey concrete with exposed aggregate, soft formwork staining and recessed panel joints.
function Precast({ r, uid }: { r: Rng; uid: string }) {
  const ground = pick(r, ['#bebfba', '#c4c3bd', '#b9bcb9'])
  const stones = ['#8f918d', '#d9dad6', '#a39c8f', '#7f807b', '#cbc6bb', '#9aa0a3', '#b5ada0']
  const dots: ReactNode[] = []
  for (let i = 0; i < 900; i++) {
    dots.push(<circle key={i} cx={between(r, 0, W).toFixed(1)} cy={between(r, 0, H).toFixed(1)} r={between(r, 0.5, 2.1).toFixed(2)} fill={pick(r, stones)} opacity={between(r, 0.5, 0.95).toFixed(2)} />)
  }
  const stains: ReactNode[] = []
  for (let i = 0; i < 5; i++) {
    stains.push(<ellipse key={i} cx={between(r, 0, W)} cy={between(r, 0, H)} rx={between(r, 40, 120)} ry={between(r, 30, 90)} fill={r() < 0.5 ? '#6f716d' : '#ffffff'} opacity={between(r, 0.06, 0.14)} />)
  }
  const jx = between(r, 170, 300)
  const jy = between(r, 120, 240)
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-conc`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d0d0cb" />
          <stop offset="1" stopColor={ground} />
        </linearGradient>
        <filter id={`${uid}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-conc)`} />
      <g filter={`url(#${uid}-soft)`}>{stains}</g>
      {dots}
      <rect x={jx - 3} y={0} width="6" height={H} fill="#7c7e7a" opacity="0.75" />
      <rect x={jx + 3} y={0} width="1.2" height={H} fill="#eceeea" opacity="0.7" />
      <rect x={0} y={jy - 3} width={jx - 3} height="6" fill="#7c7e7a" opacity="0.75" />
      <rect x={0} y={jy + 3} width={jx - 3} height="1.2" fill="#eceeea" opacity="0.7" />
      <Finish uid={uid} grain={0.2} light={0.16} />
    </>
  )
}

// Raised floor: a 600 grid of tiles in plan with bevelled edges; one tile lifted to show the pedestals.
function RaisedFloor({ r, uid }: { r: Rng; uid: string }) {
  const tile = 104
  const gap = 3
  const ox = -between(r, 0, tile)
  const oy = -between(r, 0, tile)
  const tints = ['#c9ced2', '#c4c9cd', '#cdd2d5', '#c0c6ca']
  const cols = Math.ceil((W - ox) / tile)
  const rows = Math.ceil((H - oy) / tile)
  const liftC = Math.max(1, Math.min(cols - 2, Math.floor(between(r, 1, cols - 1))))
  const liftR = Math.max(1, Math.min(rows - 2, Math.floor(between(r, 1, rows - 1))))
  const cells: ReactNode[] = []
  for (let c = 0; c < cols; c++) {
    for (let rr = 0; rr < rows; rr++) {
      const x = ox + c * tile
      const y = oy + rr * tile
      const k = `${c}-${rr}`
      if (c === liftC && rr === liftR) {
        cells.push(<rect key={`v${k}`} x={x + gap / 2} y={y + gap / 2} width={tile - gap} height={tile - gap} fill="#3b4147" />)
        cells.push(<rect key={`vs${k}`} x={x + gap / 2} y={y + gap / 2} width={tile - gap} height="10" fill="#1c1917" opacity="0.35" />)
        for (const [px, py] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
          cells.push(<circle key={`pd${k}${px}${py}`} cx={x + px * tile} cy={y + py * tile} r="7" fill="#80898f" stroke="#5d656b" strokeWidth="1.5" />)
        }
        cells.push(<path key={`str${k}`} d={`M ${x} ${y + tile / 2} H ${x + tile}`} stroke="#5d656b" strokeWidth="1" opacity="0.6" />)
        continue
      }
      cells.push(<rect key={`t${k}`} x={x + gap / 2} y={y + gap / 2} width={tile - gap} height={tile - gap} rx="2" fill={pick(r, tints)} />)
      cells.push(<rect key={`hl${k}`} x={x + gap / 2} y={y + gap / 2} width={tile - gap} height="1.5" fill="#ffffff" opacity="0.6" />)
      cells.push(<rect key={`hs${k}`} x={x + gap / 2} y={y + tile - gap / 2 - 1.5} width={tile - gap} height="1.5" fill="#1c1917" opacity="0.14" />)
      cells.push(<rect key={`i${k}`} x={x + 10} y={y + 10} width={tile - 20} height={tile - 20} rx="1" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.3" />)
    }
  }
  return (
    <>
      <rect width={W} height={H} fill="#7d858c" />
      {cells}
      <Finish uid={uid} grain={0.12} light={0.2} />
    </>
  )
}

// Timber: reclaimed joists side by side, each with flowing grain, the odd knot and a dark gap between.
function Timber({ r, uid }: { r: Rng; uid: string }) {
  const boards = 5
  const bh = H / boards
  const tints = ['#c39660', '#b98a55', '#cda36d', '#b2814e', '#a87947']
  const out: ReactNode[] = []
  for (let b = 0; b < boards; b++) {
    const y0 = b * bh
    const tint = pick(r, tints)
    out.push(<rect key={`b${b}`} x={0} y={y0} width={W} height={bh - 4} fill={tint} />)
    out.push(<rect key={`bh${b}`} x={0} y={y0} width={W} height="1.5" fill="#ffffff" opacity="0.22" />)
    const knotX = r() < 0.7 ? between(r, 60, W - 60) : -100
    const knotY = y0 + between(r, bh * 0.35, bh * 0.6)
    for (let g = 0; g < 14; g++) {
      const y = y0 + between(r, 3, bh - 8)
      const a = between(r, -5, 5)
      const bend = Math.abs(y - knotY) < 18 ? (y < knotY ? -10 : 10) : 0
      const d = `M -10 ${y.toFixed(1)} C ${(knotX - 80).toFixed(0)} ${(y + a).toFixed(1)}, ${(knotX - 30).toFixed(0)} ${(y + bend).toFixed(1)}, ${knotX.toFixed(0)} ${(y + bend).toFixed(1)} S ${(knotX + 120).toFixed(0)} ${(y - a).toFixed(1)}, ${W + 10} ${(y + between(r, -3, 3)).toFixed(1)}`
      out.push(<path key={`g${b}-${g}`} d={d} fill="none" stroke="#7a4d27" strokeWidth={between(r, 0.4, 1.3)} opacity={between(r, 0.18, 0.45)} />)
    }
    if (knotX > 0) {
      out.push(
        <g key={`k${b}`}>
          <ellipse cx={knotX} cy={knotY} rx={between(r, 6, 10)} ry={between(r, 3.5, 6)} fill="#6b4220" opacity="0.7" />
          <ellipse cx={knotX} cy={knotY} rx="15" ry="8" fill="none" stroke="#6b4220" strokeWidth="0.8" opacity="0.45" />
          <ellipse cx={knotX} cy={knotY} rx="22" ry="11" fill="none" stroke="#6b4220" strokeWidth="0.6" opacity="0.25" />
        </g>,
      )
    }
    if (r() < 0.5) {
      const cx = between(r, 20, W - 80)
      out.push(<path key={`ck${b}`} d={`M ${cx.toFixed(0)} ${(y0 + bh * 0.5).toFixed(1)} l ${between(r, 30, 70).toFixed(0)} ${between(r, -2, 2).toFixed(1)}`} stroke="#4a2d16" strokeWidth="1.2" opacity="0.35" />)
    }
    out.push(<rect key={`e${b}`} x={0} y={y0 + bh - 4} width={W} height="4" fill="#3f2715" opacity="0.85" />)
  }
  return (
    <>
      <rect width={W} height={H} fill="#3f2715" />
      {out}
      <Finish uid={uid} grain={0.16} light={0.18} />
    </>
  )
}

// Steel: the true section profile, drawn large on a drafting ground with a fine grid and a cut hatch.
function Steel({ r, uid, designation }: { r: Rng; uid: string; designation: string }) {
  const s = sectionOrThrow(designation)
  const k = (H * 0.6) / Math.max(s.h, s.b * 1.1)
  const w = s.b * k
  const h = s.h * k
  const x0 = (W - w) / 2 + between(r, -18, 18)
  const y0 = (H - h) / 2 + 8
  const step = 16
  const grid: ReactNode[] = []
  for (let x = 0, i = 0; x <= W; x += step, i++) grid.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#ffffff" strokeWidth={i % 5 === 0 ? 1 : 0.5} opacity={i % 5 === 0 ? 0.8 : 0.5} />)
  for (let y = 0, i = 0; y <= H; y += step, i++) grid.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#ffffff" strokeWidth={i % 5 === 0 ? 1 : 0.5} opacity={i % 5 === 0 ? 0.8 : 0.5} />)
  const dim = '#6f7c86'
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-mill`} x1="0" y1="0" x2={between(r, 0.6, 1).toFixed(2)} y2="1">
          <stop offset="0" stopColor="#dfe5ea" />
          <stop offset="1" stopColor="#c8d1d8" />
        </linearGradient>
        <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7d8b96" />
          <stop offset="0.5" stopColor="#5f6d78" />
          <stop offset="1" stopColor="#4b5862" />
        </linearGradient>
        <pattern id={`${uid}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#ffffff" strokeWidth="1" opacity="0.18" />
        </pattern>
        <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#1c2a33" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-mill)`} />
      {grid}
      <g transform={`translate(${x0.toFixed(1)} ${y0.toFixed(1)})`}>
        <g filter={`url(#${uid}-shadow)`}>
          <path d={profilePath(s.h, s.b, s.tw, s.tf, 1.2 * s.tw)} transform={`scale(${k})`} fill={`url(#${uid}-steel)`} />
        </g>
        <path d={profilePath(s.h, s.b, s.tw, s.tf, 1.2 * s.tw)} transform={`scale(${k})`} fill={`url(#${uid}-hatch)`} stroke="#2f3a42" strokeWidth={1.4 / k} />
        <g stroke={dim} strokeWidth="1">
          <line x1={0} y1={-14} x2={w} y2={-14} />
          <line x1={0} y1={-19} x2={0} y2={-6} />
          <line x1={w} y1={-19} x2={w} y2={-6} />
          <line x1={w + 16} y1={0} x2={w + 16} y2={h} />
          <line x1={w + 6} y1={0} x2={w + 21} y2={0} />
          <line x1={w + 6} y1={h} x2={w + 21} y2={h} />
        </g>
        <text x={w / 2} y={-20} textAnchor="middle" fontFamily="Inter Variable, Inter, sans-serif" fontSize="11" fontWeight="500" fill="#4b5862">
          {s.b}
        </text>
        <text x={w + 26} y={h / 2 + 4} fontFamily="Inter Variable, Inter, sans-serif" fontSize="11" fontWeight="500" fill="#4b5862">
          {s.h}
        </text>
      </g>
      <Finish uid={uid} grain={0.06} light={0.14} />
    </>
  )
}
