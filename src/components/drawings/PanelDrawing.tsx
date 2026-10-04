// Simple dimensioned drawings for panels, stone, bricks, floor panels and joists.
import type { Spec } from '../../domain/types'

type Dims = { wLabel: string; hLabel: string; ratio: number; label: string }

function dimsFor(spec: Spec): Dims {
  switch (spec.family) {
    case 'curtain_wall':
      return { wLabel: `${spec.panelWidthM} m`, hLabel: `${spec.panelHeightM} m`, ratio: spec.panelHeightM / spec.panelWidthM, label: 'Panel' }
    case 'precast_cladding':
      return { wLabel: '1 m module', hLabel: `${spec.thicknessMm} mm`, ratio: spec.thicknessMm / 1000 + 0.12, label: 'Panel section' }
    case 'stone_cladding':
      return { wLabel: '1 m module', hLabel: `${spec.thicknessMm} mm`, ratio: spec.thicknessMm / 1000 + 0.12, label: 'Stone section' }
    case 'clay_brick':
      return { wLabel: '215 mm', hLabel: '65 mm', ratio: 65 / 215, label: 'Brick' }
    case 'raised_floor':
      return { wLabel: '600 mm', hLabel: '600 mm', ratio: 1, label: 'Panel' }
    case 'timber_joist':
      return { wLabel: '50 mm', hLabel: '200 mm', ratio: 200 / 50, label: 'Joist section' }
    case 'steel_section':
      return { wLabel: '', hLabel: '', ratio: 1, label: '' }
  }
}

export function PanelDrawing({ spec, box = 110, caption, dims = true, className }: { spec: Spec; box?: number; caption?: string; dims?: boolean; className?: string }) {
  const d = dimsFor(spec)
  const ratio = Math.max(0.12, Math.min(3.5, d.ratio))
  const w = ratio >= 1 ? box / ratio : box
  const h = ratio >= 1 ? box : box * ratio
  const padL = dims ? 10 : 4
  const padR = dims ? 56 : 4
  const top = dims ? 22 : 4
  const W = w + padL + padR
  const H = h + top + (caption ? 36 : 6)
  const dim = '#7B8A97'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} role="img" aria-label={`Drawing of ${caption ?? d.label}`}>
      <g transform={`translate(${padL} ${top})`}>
        <rect x={0} y={0} width={w} height={h} fill="#E4EDF4" stroke="#2C5E86" strokeWidth="1.5" />
        {spec.family === 'raised_floor' ? <rect x={w * 0.15} y={h * 0.15} width={w * 0.7} height={h * 0.7} fill="none" stroke="#2C5E86" strokeWidth="0.75" strokeDasharray="3 2" /> : null}
        {dims ? (
        <>
        <g stroke={dim} strokeWidth="1">
          <line x1={0} y1={-6} x2={w} y2={-6} />
          <line x1={0} y1={-9} x2={0} y2={-3} />
          <line x1={w} y1={-9} x2={w} y2={-3} />
          <line x1={w + 8} y1={0} x2={w + 8} y2={h} />
          <line x1={w + 5} y1={0} x2={w + 11} y2={0} />
          <line x1={w + 5} y1={h} x2={w + 11} y2={h} />
        </g>
        <text x={w / 2} y={-9} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#5A6873">
          {d.wLabel}
        </text>
        <text x={w + 13} y={h / 2 + 3} fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#5A6873">
          {d.hLabel}
        </text>
        </>
        ) : null}
      </g>
      {caption ? (
        <text x={W / 2} y={H - 8} textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="600" fontSize="15" fill="#14202B">
          {caption}
        </text>
      ) : null}
    </svg>
  )
}
