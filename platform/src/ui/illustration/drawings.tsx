// Dimensioned drawings from the recorded sizes: the true profile of a steel section, and a simple outline
// for panels, stone, bricks, floor panels and joists. Drawing coordinates only.
import type { Spec } from '../../domain/types'
import { sectionOrThrow } from '../../domain/reference/sections'
import { titleFor } from '../../domain/reference/families'
import { profilePath, scaleFor, type DrawingScale } from './helpers'

const INK = '#292524'
const DIM = '#78716c'
const FILL = '#f5f5f4'
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

function Hatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="0.7" opacity="0.35" />
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
        <path d={profilePath(s.h, s.b, s.tw, s.tf, 1.2 * s.tw)} transform={`scale(${k})`} fill={`url(#${hatch})`} stroke={INK} strokeWidth={1.4 / k} />
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
        <rect x={0} y={0} width={w} height={h} fill={cut ? `url(#${hatch})` : FILL} stroke={INK} strokeWidth="1.4" strokeDasharray={d.recorded ? undefined : '5 3'} />
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
