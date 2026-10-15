// Dimensioned drawings from the recorded sizes: the true profile of a steel section, and a simple outline
// for panels, stone, bricks, floor panels and joists. Plus the card drawings: a steel member in axonometric
// at its recorded length, a curtain wall panel in elevation and a floor panel on its pedestals.
// Ink on paper, hairlines, a 45 degree hatch on cut faces, no gradients, glows or shadows.
// Drawing coordinates only (P2 allows them inside SVG components).
import type { ReactNode } from 'react'
import type { Spec } from '../../domain/types'
import { sectionOrThrow } from '../../domain/reference/sections'
import { formatLength, titleFor } from '../../domain/reference/families'
import { BOARD, profilePath, SAFE, scaleFor, TEXT_SIZE, type DrawingScale, type DrawingView } from './helpers'

export const INK = '#1c1917'
const DIM = '#78716c'
export const FILL = '#f7f6f3'
/** Paper ground for every drawing and swatch board. */
export const PAPER = '#f7f6f3'
const FONT = 'Inter Variable, Inter, ui-sans-serif, sans-serif'

/** Room for a caption at 12 px: about 6.8 px a character, plus a margin. */
function captionWidth(text: string): number {
  return text ? text.length * 6.8 + 16 : 0
}

function Dims({ w, h, wLabel, hLabel }: { w: number; h: number; wLabel: string; hLabel: string }) {
  return (
    <>
      <g stroke={DIM} strokeWidth="1" fill="none">
        <line x1={0} y1={-10} x2={w} y2={-10} />
        <line x1={0} y1={-15} x2={0} y2={-4} />
        <line x1={w} y1={-15} x2={w} y2={-4} />
        <line x1={-3} y1={-7} x2={3} y2={-13} />
        <line x1={w - 3} y1={-7} x2={w + 3} y2={-13} />
        <line x1={w + 12} y1={0} x2={w + 12} y2={h} />
        <line x1={w + 6} y1={0} x2={w + 18} y2={0} />
        <line x1={w + 6} y1={h} x2={w + 18} y2={h} />
        <line x1={w + 9} y1={3} x2={w + 15} y2={-3} />
        <line x1={w + 9} y1={h + 3} x2={w + 15} y2={h - 3} />
      </g>
      <text x={w / 2} y={-15} textAnchor="middle" fontFamily={FONT} fontSize="10.5" fontWeight="500" fill={DIM} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {wLabel}
      </text>
      <text x={w + 22} y={h / 2 + 3.5} fontFamily={FONT} fontSize="10.5" fontWeight="500" fill={DIM} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {hLabel}
      </text>
    </>
  )
}

/** The cut-face hatch: 45 degrees, 4 px pitch, 0.6 px lines at 0.45 opacity. */
export function Hatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke={INK} strokeWidth="0.6" opacity="0.45" />
      </pattern>
    </defs>
  )
}

export function SectionDrawing({ designation, lengthM, scale, caption = true, dims = true, className, idPrefix = 'sec' }: { designation: string; lengthM?: number; scale?: DrawingScale; caption?: boolean; dims?: boolean; className?: string; idPrefix?: string }) {
  const s = sectionOrThrow(designation)
  const k = (scale ?? scaleFor([designation])).pxPerMm
  const w = s.b * k
  const h = s.h * k
  const padL = dims ? 14 : 4
  const padR = dims ? 56 : 4
  const top = dims ? 28 : 4
  const captionText = caption ? `${designation}${lengthM !== undefined ? `, ${lengthM.toFixed(1)} m` : ''}` : ''
  const VW = Math.max(w + padL + padR, captionWidth(captionText))
  const VH = h + top + (caption ? 34 : 8)
  const hatch = `${idPrefix}-${designation.replace(/[^a-zA-Z0-9]/g, '')}-hatch`
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width={VW} height={VH} className={className} role="img" aria-label={`Section drawing of ${designation}`}>
      <Hatch id={hatch} />
      <g transform={`translate(${(VW - w - padL - padR) / 2 + padL} ${top})`}>
        <path d={profilePath(s.h, s.b, s.tw, s.tf, 1.2 * s.tw)} transform={`scale(${k})`} fill={FILL} />
        <path d={profilePath(s.h, s.b, s.tw, s.tf, 1.2 * s.tw)} transform={`scale(${k})`} fill={`url(#${hatch})`} stroke={INK} strokeWidth={1.25 / k} />
        {dims ? <Dims w={w} h={h} wLabel={String(s.b)} hLabel={String(s.h)} /> : null}
      </g>
      {caption ? (
        <text x={VW / 2} y={VH - 10} textAnchor="middle" fontFamily={FONT} fontWeight="600" fontSize="12" fill={INK}>
          {captionText}
        </text>
      ) : null}
    </svg>
  )
}

type Outline = { wLabel: string; hLabel: string; ratio: number; label: string; recorded: boolean }

function outlineFor(spec: Spec): Outline {
  switch (spec.family) {
    case 'curtain_wall':
      return { wLabel: `${spec.panelWidthM} m`, hLabel: `${spec.panelHeightM} m`, ratio: spec.panelHeightM / spec.panelWidthM, label: 'Panel', recorded: true }
    case 'precast_cladding':
      return { wLabel: '1 m module', hLabel: `${spec.thicknessMm} mm`, ratio: spec.thicknessMm / 1000 + 0.12, label: 'Panel section', recorded: true }
    case 'stone_cladding':
      return { wLabel: '1 m module', hLabel: `${spec.thicknessMm} mm`, ratio: spec.thicknessMm / 1000 + 0.12, label: 'Stone section', recorded: true }
    case 'clay_brick':
      return { wLabel: '215 mm', hLabel: '65 mm', ratio: 65 / 215, label: 'Brick', recorded: true }
    case 'raised_floor':
      return { wLabel: '600 mm', hLabel: '600 mm', ratio: 1, label: 'Panel', recorded: true }
    case 'timber_joist':
      return { wLabel: '', hLabel: '', ratio: 3, label: 'Joist section, size not recorded', recorded: false }
    case 'steel_section':
      return { wLabel: '', hLabel: '', ratio: 1, label: '', recorded: true }
  }
}

export function PanelDrawing({ spec, box = 140, caption, dims: wantDims = true, className, idPrefix = 'pnl' }: { spec: Spec; box?: number; caption?: string; dims?: boolean; className?: string; idPrefix?: string }) {
  const d = outlineFor(spec)
  const dims = wantDims && d.recorded
  const ratio = Math.max(0.12, Math.min(3.5, d.ratio))
  const w = ratio >= 1 ? box / ratio : box
  const h = ratio >= 1 ? box : box * ratio
  const padL = dims ? 14 : 4
  const padR = dims ? 72 : 4
  const top = dims ? 28 : 4
  const VW = Math.max(w + padL + padR, captionWidth(caption ?? ''))
  const VH = h + top + (caption ? 34 : 8)
  const hatch = `${idPrefix}-${spec.family}-hatch`
  const cut = spec.family === 'precast_cladding' || spec.family === 'stone_cladding'
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width={VW} height={VH} className={className} role="img" aria-label={`Drawing of ${caption ?? d.label}`}>
      <Hatch id={hatch} />
      <g transform={`translate(${(VW - w - padL - padR) / 2 + padL} ${top})`}>
        <rect x={0} y={0} width={w} height={h} fill={cut ? `url(#${hatch})` : FILL} stroke={INK} strokeWidth="1.25" strokeDasharray={d.recorded ? undefined : '5 3'} />
        {spec.family === 'raised_floor' ? <rect x={w * 0.14} y={h * 0.14} width={w * 0.72} height={h * 0.72} fill="none" stroke={INK} strokeWidth="0.75" strokeDasharray="3 2" opacity="0.6" /> : null}
        {spec.family === 'curtain_wall' ? <rect x={0} y={h * 0.8} width={w} height={h * 0.2} fill={INK} opacity="0.08" /> : null}
        {dims ? <Dims w={w} h={h} wLabel={d.wLabel} hLabel={d.hLabel} /> : null}
      </g>
      {caption ? (
        <text x={VW / 2} y={VH - 10} textAnchor="middle" fontFamily={FONT} fontWeight="600" fontSize="12" fill={INK}>
          {caption}
        </text>
      ) : null}
    </svg>
  )
}

/** The dimensioned drawing for any material. Steel sections take a shared scale so a list compares at one scale. */
export function MaterialDrawing({ spec, scale, box = 140, caption = true, dims = true, className }: { spec: Spec; scale?: DrawingScale; box?: number; caption?: boolean; dims?: boolean; className?: string }) {
  if (spec.family === 'steel_section') return <SectionDrawing designation={spec.designation} lengthM={spec.lengthM} scale={scale ?? scaleFor([spec.designation], box)} caption={caption} dims={dims} className={className} />
  return <PanelDrawing spec={spec} box={box} caption={caption ? titleFor(spec) : undefined} dims={dims} className={className} />
}

// ---------- Card drawings on the shared 480 by 360 board ----------

const W = BOARD.width
const H = BOARD.height


/** cos 30 and sin 30: the receding axis of the axonometric. */
const C30 = 0.866
const S30 = 0.5

type P = [number, number]
const pts = (ps: P[]): string => ps.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

/**
 * The title strip along the bottom of a drawing, above a 0.75 px rule: the designation or family, then the scale
 * note, then where the drawing comes from. On a card it is the scale note alone, set to the right, clear of the
 * fit chip.
 */
export function TitleStrip({ text, note = 'Not to scale', view = 'card' }: { text: string; note?: string; view?: DrawingView }) {
  const size = TEXT_SIZE[view]
  const line1 = `${text}, ${note.charAt(0).toLowerCase()}${note.slice(1)}`
  if (view === 'card') {
    // On a card the title sits under the picture already, so the strip carries the scale note alone.
    const y = SAFE.bottom - 6
    return (
      <g data-part="title-strip">
        <line x1={W * 0.56} y1={y - size - 4} x2={SAFE.right} y2={y - size - 4} stroke={INK} strokeWidth="0.75" />
        <text x={SAFE.right} y={y} textAnchor="end" fontFamily={FONT} fontSize={size} fontWeight="500" fill={DIM}>
          {note}
        </text>
      </g>
    )
  }
  const y = SAFE.bottom - 34
  return (
    <g data-part="title-strip">
      <line x1={W * 0.18} y1={y} x2={W * 0.82} y2={y} stroke={INK} strokeWidth="0.75" />
      <text x={W / 2} y={y + 15} textAnchor="middle" fontFamily={FONT} fontSize={size} fontWeight="600" fill={INK}>
        {line1}
      </text>
      <text x={W / 2} y={y + 29} textAnchor="middle" fontFamily={FONT} fontSize={size} fill={DIM}>
        Illustration from the survey record
      </text>
    </g>
  )
}

/** Architectural dimension: a 0.75 px line between two points, 45 degree ticks at the ends and a label. */
function DimLine({ a, b, label, offset = [0, 14], anchor = 'middle', size }: { a: P; b: P; label: string; offset?: P; anchor?: 'start' | 'middle' | 'end'; size: number }) {
  const a2: P = [a[0] + offset[0], a[1] + offset[1]]
  const b2: P = [b[0] + offset[0], b[1] + offset[1]]
  const mid: P = [(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2]
  // A dimension set above its edge (offset straight up) keeps its label off the line: centred, 5 px clear above it as
  // on the section drawing, or with anchor 'end' level with the line just before its first tick, clear of any edge
  // that rises from the far end. The others sit beside their line, centred on the offset.
  const above = offset[0] === 0 && offset[1] < 0
  const before = above && anchor === 'end'
  const labelX = before ? Math.min(a2[0], b2[0]) - 6 : mid[0] + offset[0] * 0.7
  const labelY = before ? mid[1] + size * 0.35 : above ? mid[1] - 5 : mid[1] + offset[1] * 0.7 + size * 0.35
  return (
    <g data-part="dimension">
      <g stroke={DIM} strokeWidth="0.75" fill="none">
        <line x1={a[0]} y1={a[1]} x2={a2[0] + offset[0] * 0.25} y2={a2[1] + offset[1] * 0.25} opacity="0.6" />
        <line x1={b[0]} y1={b[1]} x2={b2[0] + offset[0] * 0.25} y2={b2[1] + offset[1] * 0.25} opacity="0.6" />
        <line x1={a2[0]} y1={a2[1]} x2={b2[0]} y2={b2[1]} />
        <line x1={a2[0] - 3} y1={a2[1] + 3} x2={a2[0] + 3} y2={a2[1] - 3} />
        <line x1={b2[0] - 3} y1={b2[1] + 3} x2={b2[0] + 3} y2={b2[1] - 3} />
      </g>
      <text x={labelX} y={labelY} data-label={before ? 'before' : above ? 'above' : undefined} textAnchor={anchor} fontFamily={FONT} fontSize={size} fontWeight="500" fill={DIM} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </text>
    </g>
  )
}

/** A detail grid for the larger views: 0.5 px lines at 0.35 opacity. */
function DetailGrid() {
  const lines: ReactNode[] = []
  for (let x = 0; x <= W; x += 24) lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} />)
  for (let y = 0; y <= H; y += 24) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} />)
  return (
    <g data-part="grid" stroke={DIM} strokeWidth="0.5" opacity="0.35">
      {lines}
    </g>
  )
}

/** The drawing area above the title strip. */
const AREA = { left: SAFE.left, right: SAFE.right, top: SAFE.top + 8, bottom: SAFE.bottom - 46 } as const

/**
 * A steel member in axonometric, extruded to its recorded length. The section is cut at the near end (hatched),
 * the far end is drawn, and the length is dimensioned along the bottom flange. The receding axis runs at 30
 * degrees; the length is foreshortened to a half and clamped so the drawing fits the board.
 */
export function SectionAxo({ designation, lengthM, uid, view = 'card' }: { designation: string; lengthM: number; uid: string; view?: DrawingView }) {
  const s = sectionOrThrow(designation)
  const size = TEXT_SIZE[view]
  const k = Math.min(140 / s.h, 104 / s.b)
  const h = s.h * k
  const b = s.b * k
  const tw = Math.max(1.5, s.tw * k)
  const tf = Math.max(1.5, s.tf * k)
  const roomW = AREA.right - AREA.left - 70
  const roomH = AREA.bottom - AREA.top - 30
  const reach = Math.min(lengthM * 1000 * k * 0.5, (roomW - b) / C30, (roomH - h) / S30)
  const d: P = [reach * C30, -reach * S30]
  // Near-end outline, clockwise from top left, in screen coordinates (y down).
  const wl = (b - tw) / 2
  const wr = wl + tw
  const outline: P[] = [
    [0, 0],
    [b, 0],
    [b, tf],
    [wr, tf],
    [wr, h - tf],
    [b, h - tf],
    [b, h],
    [0, h],
    [0, h - tf],
    [wl, h - tf],
    [wl, tf],
    [0, tf],
  ]
  // Centre the member in the drawing area, leaving room for the length dimension below it.
  const ox = (AREA.left + AREA.right - (b + d[0])) / 2 - 10
  const oy = (AREA.top + AREA.bottom - (h - d[1])) / 2 - d[1] - 8
  const at = ([x, y]: P): P => [ox + x, oy + y]
  const far = ([x, y]: P): P => [ox + x + d[0], oy + y + d[1]]
  // A side face shows when its outward normal leans toward the receding axis; nearer faces are painted later.
  const faces = outline
    .map((p, i) => {
      const q = outline[(i + 1) % outline.length]
      const n: P = [q[1] - p[1], -(q[0] - p[0])]
      const facing = n[0] * C30 - n[1] * S30
      const near = ((p[0] + q[0]) / 2) * C30 - ((p[1] + q[1]) / 2) * S30
      return { p, q, n, facing, near, i }
    })
    .filter((f) => f.facing > 1e-6)
    .sort((x, y) => x.near - y.near || x.i - y.i)
  const hatch = `${uid}-hatch`
  return (
    <g data-part="section-axo">
      <Hatch id={hatch} />
      <rect width={W} height={H} fill={PAPER} />
      {view === 'detail' ? <DetailGrid /> : null}
      {faces.map((f) => (
        <polygon key={f.i} points={pts([at(f.p), at(f.q), far(f.q), far(f.p)])} fill={f.n[1] < 0 ? FILL : '#e9e6df'} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
      ))}
      <polygon points={pts(outline.map(at))} fill={FILL} />
      <polygon points={pts(outline.map(at))} fill={`url(#${hatch})`} stroke={INK} strokeWidth="1.25" strokeLinejoin="round" />
      <DimLine a={at([b, h])} b={far([b, h])} label={formatLength(lengthM)} offset={[9, 15.6]} anchor="start" size={size} />
      {view === 'detail' ? <DimLine a={at([0, 0])} b={at([b, 0])} label={`${s.b}`} offset={[0, -12]} anchor="end" size={size} /> : null}
      <TitleStrip text={designation} view={view} />
    </g>
  )
}

/** One curtain wall panel in elevation: frame, a spandrel band and flat glass with one soft reflection band. */
export function PanelElevation({ widthM, heightM, system, seed, view = 'card' }: { widthM: number; heightM: number; system: string; seed: number; view?: DrawingView }) {
  const size = TEXT_SIZE[view]
  const ratio = heightM / widthM
  // Fit the panel in the drawing area at its true proportion, leaving room for the dimensions.
  const boxW = AREA.right - AREA.left - 120
  const boxH = AREA.bottom - AREA.top - 24
  const panelH = Math.min(boxH, boxW * ratio)
  const panelW = panelH / ratio
  const x0 = (W - panelW) / 2 - 20
  const y0 = AREA.top
  const frame = '#3d4349'
  const m = 6
  const band = x0 + m + seed * Math.max(0, panelW - 2 * m - 18)
  const spandrel = panelH * 0.18
  return (
    <g data-part="panel-elevation">
      <rect width={W} height={H} fill={PAPER} />
      <rect x={x0} y={y0} width={panelW} height={panelH} fill="#cfdbe1" />
      <rect x={band} y={y0} width="18" height={panelH - spandrel} fill="#ffffff" opacity="0.25" />
      <rect x={x0} y={y0 + panelH - spandrel} width={panelW} height={spandrel} fill="#8d969c" />
      <rect x={x0 + m / 2} y={y0 + m / 2} width={panelW - m} height={panelH - m} fill="none" stroke={frame} strokeWidth={m} />
      <line x1={x0} y1={y0 + panelH - spandrel} x2={x0 + panelW} y2={y0 + panelH - spandrel} stroke={frame} strokeWidth="3" />
      <rect x={x0} y={y0} width={panelW} height={panelH} fill="none" stroke={INK} strokeWidth="1.25" />
      <DimLine a={[x0, y0 + panelH]} b={[x0 + panelW, y0 + panelH]} label={`${widthM} m`} offset={[0, 12]} size={size} />
      <DimLine a={[x0 + panelW, y0]} b={[x0 + panelW, y0 + panelH]} label={`${heightM} m`} offset={[14, 0]} anchor="start" size={size} />
      <TitleStrip text={`${system} curtain wall panel`} view={view} />
    </g>
  )
}

/** One raised floor panel in axonometric on its four pedestals, edges drawn and the panel dimensioned. */
export function PanelAxo({ sizeMm = [600, 600], view = 'card' }: { sizeMm?: [number, number]; view?: DrawingView }) {
  const size = TEXT_SIZE[view]
  const [px, py] = sizeMm
  const k = (AREA.right - AREA.left - 60) / ((px + py) * C30)
  const t = 32
  const ped = 220
  const axo = (x: number, y: number, z: number): P => [(x - y) * C30 * k, ((x + y) * S30 - z) * k]
  const lo = axo(0, py, 0)[0]
  const top = axo(0, 0, ped + t)[1]
  const bottom = axo(px, py, 0)[1]
  const ox = W / 2 - (lo + axo(px, 0, 0)[0]) / 2
  const oy = (AREA.top + AREA.bottom - (bottom - top)) / 2 - top
  const at = (x: number, y: number, z: number): P => {
    const [sx, sy] = axo(x, y, z)
    return [ox + sx, oy + sy]
  }
  const zt = ped + t
  const pedestal = (x: number, y: number, key: string) => {
    const base = at(x, y, 0)
    const head = at(x, y, ped)
    return (
      <g key={key} data-part="pedestal">
        <ellipse cx={base[0]} cy={base[1]} rx={9} ry={4.5} fill={FILL} stroke={INK} strokeWidth="0.9" />
        <line x1={base[0]} y1={base[1]} x2={head[0]} y2={head[1]} stroke={INK} strokeWidth="2.4" />
        <ellipse cx={head[0]} cy={head[1]} rx={7} ry={3.5} fill={FILL} stroke={INK} strokeWidth="0.9" />
      </g>
    )
  }
  return (
    <g data-part="panel-axo">
      <rect width={W} height={H} fill={PAPER} />
      <polygon points={pts([at(0, 0, 0), at(px, 0, 0), at(px, py, 0), at(0, py, 0)])} fill="none" stroke={DIM} strokeWidth="0.5" strokeDasharray="3 3" />
      {pedestal(0, 0, 'back')}
      {pedestal(px, 0, 'right')}
      {pedestal(0, py, 'left')}
      <polygon points={pts([at(px, 0, ped), at(px, py, ped), at(px, py, zt), at(px, 0, zt)])} fill="#e9e6df" stroke={INK} strokeWidth="0.9" />
      <polygon points={pts([at(0, py, ped), at(px, py, ped), at(px, py, zt), at(0, py, zt)])} fill="#dedad2" stroke={INK} strokeWidth="0.9" />
      <polygon points={pts([at(0, 0, zt), at(px, 0, zt), at(px, py, zt), at(0, py, zt)])} fill={FILL} stroke={INK} strokeWidth="1.25" strokeLinejoin="round" />
      {pedestal(px, py, 'front')}
      <DimLine a={at(0, 0, zt)} b={at(0, py, zt)} label={`${py} mm`} offset={[-10, -10]} anchor="end" size={size} />
      <DimLine a={at(0, 0, zt)} b={at(px, 0, zt)} label={`${px} mm`} offset={[10, -10]} anchor="start" size={size} />
      <TitleStrip text="Raised access floor panel" view={view} />
    </g>
  )
}
