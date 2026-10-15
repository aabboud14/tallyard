// A generated axonometric of a project going up or a donor building coming down, drawn from data: its use, its
// storeys when recorded, its frame and the facade materials from its families. Ink hairlines and flat fills on
// paper; no gradients, glows or blur. A proposed building leaves its top storey as frame and has a tower crane;
// an existing one has scaffold on its right face. Always an illustration, never a photo.
import type { ReactNode } from 'react'
import type { BuildingSketch, FacadeKind } from '../../domain/sketch'
import { axo, cranePoints, massingFor, massingPoints, SKETCH_BOARD, type Massing, type MassingBlock } from './massing'

const INK = '#1c1917'
const GROUND = '#f7f6f3'
const ROOF = '#f7f5f1'

const FILL: Record<FacadeKind | 'plain', string> = {
  brick: '#b5654a',
  stone: '#e6ddc8',
  glass: '#9db7c9',
  precast: '#cfcbc3',
  timber: '#c49a6c',
  plain: '#e7e5e4',
}

/** The right face takes the facade colour at 85 percent. */
function darker(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * 0.85))
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('')
}

type P = [number, number]
const pts = (ps: P[]): string => ps.map(([x, y]) => `${x},${y}`).join(' ')

function line(a: P, b: P, key: string, width = 0.5, opacity = 1): ReactNode {
  return <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={INK} strokeWidth={width} opacity={opacity} />
}

/** Texture lines on one face. `along` gives a point on the face at position t (0 to 1 across) and height z. */
function texture(kind: FacadeKind | 'plain', b: MassingBlock, bays: number, along: (t: number, z: number) => P, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const z0 = b.z
  const z1 = b.z + b.h
  if (kind === 'brick') {
    for (let z = z0 + 3; z < z1; z += 3) out.push(line(along(0, z), along(1, z), `${key}c${z}`, 0.5, 0.15))
  }
  if (kind === 'stone' || kind === 'precast' || kind === 'glass' || kind === 'plain') {
    for (let i = 1; i < b.storeys; i++) out.push(line(along(0, z0 + i * b.storeyH), along(1, z0 + i * b.storeyH), `${key}s${i}`, 0.5, 0.7))
  }
  if (kind === 'stone' || kind === 'precast' || kind === 'glass') {
    const n = kind === 'precast' ? Math.max(2, bays - 1) : bays
    for (let i = 1; i < n; i++) out.push(line(along(i / n, z0), along(i / n, z1), `${key}v${i}`, 0.5, kind === 'glass' ? 0.8 : 0.5))
  }
  if (kind === 'timber') {
    for (let i = 1; i < bays * 3; i++) out.push(line(along(i / (bays * 3), z0), along(i / (bays * 3), z1), `${key}t${i}`, 0.5, 0.35))
  }
  if (kind === 'glass') {
    const a = along(0.15, z0 + b.h * 0.2)
    const c = along(0.45, z1 - b.h * 0.15)
    out.push(<line key={`${key}r`} x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} stroke="#ffffff" strokeWidth="3" opacity="0.35" />)
  }
  return out
}

function Block({ b, m, frameOnlyTop, steel, scaffold, k }: { b: MassingBlock; m: Massing; frameOnlyTop: boolean; steel: boolean; scaffold: boolean; k: string }) {
  const o = m.origin
  const A = (x: number, y: number, z: number) => axo(x, y, z, o)
  const { x, y, z, w, d, h } = b
  // A proposed building's top storey is frame only: the faces stop one storey short.
  const top = frameOnlyTop ? z + h - b.storeyH : z + h
  const left: P[] = [A(x, y + d, z), A(x + w, y + d, z), A(x + w, y + d, top), A(x, y + d, top)]
  const right: P[] = [A(x + w, y, z), A(x + w, y + d, z), A(x + w, y + d, top), A(x + w, y, top)]
  const roof: P[] = [A(x, y, top), A(x + w, y, top), A(x + w, y + d, top), A(x, y + d, top)]
  const fill = FILL[b.facade]
  const solid = top > z
  const leftAlong = (t: number, zz: number) => A(x + t * w, y + d, Math.min(zz, top))
  const rightAlong = (t: number, zz: number) => A(x + w, y + t * d, Math.min(zz, top))
  const cols: ReactNode[] = []
  if (steel || frameOnlyTop) {
    const from = frameOnlyTop ? top : z
    const to = z + h
    for (let i = 0; i <= m.bays; i++) cols.push(line(A(x + (i / m.bays) * w, y + d, from), A(x + (i / m.bays) * w, y + d, to), `${k}col${i}`, frameOnlyTop ? 0.9 : 0.6))
    cols.push(line(A(x + w, y, from), A(x + w, y, to), `${k}colb`, frameOnlyTop ? 0.9 : 0.6))
    if (frameOnlyTop) {
      cols.push(line(A(x, y + d, to), A(x + w, y + d, to), `${k}beam1`, 0.9))
      cols.push(line(A(x + w, y + d, to), A(x + w, y, to), `${k}beam2`, 0.9))
      cols.push(line(A(x + w, y, to), A(x, y, to), `${k}beam3`, 0.6, 0.6))
      cols.push(line(A(x, y, to), A(x, y + d, to), `${k}beam4`, 0.6, 0.6))
    }
  }
  const scaf: ReactNode[] = []
  if (scaffold && solid) {
    for (let zz = z + 4; zz < top; zz += 6) scaf.push(line(A(x + w + 2, y, zz), A(x + w + 2, y + d, zz), `${k}sh${zz}`, 0.5, 0.4))
    for (let i = 0; i <= 6; i++) scaf.push(line(A(x + w + 2, y + (i / 6) * d, z), A(x + w + 2, y + (i / 6) * d, top), `${k}sv${i}`, 0.5, 0.4))
  }
  return (
    <g data-part="block" data-facade={b.facade}>
      {solid ? (
        <>
          <polygon points={pts(left)} fill={fill} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
          {texture(b.facade, { ...b, h: top - z }, m.bays, leftAlong, `${k}l`)}
          <polygon points={pts(right)} fill={darker(fill)} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
          {texture(b.facade, { ...b, h: top - z }, m.bays, rightAlong, `${k}r`)}
          <polygon points={pts(roof)} fill={ROOF} stroke={INK} strokeWidth="0.75" strokeLinejoin="round" />
        </>
      ) : null}
      {cols}
      {scaf}
    </g>
  )
}

/**
 * The building alone, as an SVG group on the 320 by 200 board: its blocks, frame, scaffold and crane, with no
 * ground or trees. The landing scene places two of these on one sheet.
 */
export function BuildingDrawing({ sketch }: { sketch: BuildingSketch }) {
  const m = massingFor(sketch)
  const tallest = Math.max(...m.blocks.map((b) => b.z + b.h))
  const steel = sketch.frame === 'steel'
  const crane = m.crane ? cranePoints(m) : null
  return (
    <g data-part="building" data-sketch={sketch.state} data-use={sketch.use}>
      {/* The crane stands behind the building, so it is drawn first. */}
      {crane ? (
        <g data-part="crane" stroke={INK} strokeWidth="1" fill="none">
          <line x1={crane[0][0]} y1={crane[0][1]} x2={crane[1][0]} y2={crane[1][1]} />
          <line x1={crane[3][0]} y1={crane[3][1]} x2={crane[2][0]} y2={crane[2][1]} />
          <line x1={crane[1][0]} y1={crane[1][1] - 6} x2={crane[2][0] - 20} y2={crane[2][1]} strokeWidth="0.5" />
          <line x1={crane[1][0]} y1={crane[1][1] - 6} x2={crane[3][0]} y2={crane[3][1]} strokeWidth="0.5" />
          <line x1={crane[2][0] - 24} y1={crane[2][1]} x2={crane[2][0] - 24} y2={crane[2][1] + 18} strokeWidth="0.5" />
        </g>
      ) : null}
      {m.blocks.map((b, i) => (
        <Block key={i} k={`b${i}`} b={b} m={m} steel={steel} scaffold={m.scaffold} frameOnlyTop={m.crane && b.z + b.h === tallest && b.storeys > 1} />
      ))}
    </g>
  )
}

/** The view box that holds the building and its crane with a margin, for small frames. Drawing coordinates only. */
function fittedBox(sketch: BuildingSketch): { x: number; y: number; w: number; h: number } {
  const ps = massingPoints(massingFor(sketch))
  const pad = 8
  const xs = ps.map((p) => p[0])
  const ys = ps.map((p) => p[1])
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad
  return { x, y, w: Math.max(...xs) + pad + 4 - x, h: SKETCH_BOARD.height - 10 + pad - y }
}

/**
 * `fit` crops the drawing to the building itself and leaves out the trees, so it still reads in a 32 to 48 px
 * thumb; the frame behind it supplies the paper. Without it the whole board is drawn and sliced to fill.
 */
export function BuildingIllustration({ sketch, className, decorative = false, fit = false }: { sketch: BuildingSketch; className?: string; decorative?: boolean; fit?: boolean }) {
  const W = SKETCH_BOARD.width
  const H = SKETCH_BOARD.height
  const box = fit ? fittedBox(sketch) : { x: 0, y: 0, w: W, h: H }
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      preserveAspectRatio={fit ? 'xMidYMid meet' : 'xMidYMid slice'}
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : sketch.label}
      aria-hidden={decorative ? true : undefined}
      data-sketch={sketch.state}
      data-use={sketch.use}
      data-fit={fit ? 'building' : undefined}
    >
      {fit ? null : <rect width={W} height={H} fill={GROUND} />}
      <line x1={fit ? box.x : 0} y1={H - 10} x2={fit ? box.x + box.w : W} y2={H - 10} stroke={INK} strokeWidth="0.75" opacity="0.5" />
      {fit
        ? null
        : [
            [26, H - 22, 9],
            [44, H - 18, 6],
            [W - 30, H - 20, 8],
          ].map(([cx, cy, r], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth="0.75" opacity="0.6" />
              <line x1={cx} y1={cy + r} x2={cx} y2={H - 10} stroke={INK} strokeWidth="0.75" opacity="0.6" />
            </g>
          ))}
      <BuildingDrawing sketch={sketch} />
    </svg>
  )
}
