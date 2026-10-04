// A steel section drawn as its true profile from h, b, tw and tf, with dimension lines.
import { sectionOrThrow } from '../../domain/reference/sections'

export type Scale = { pxPerMm: number }

/** One scale for every section in a list: the largest fits the box. */
export function scaleFor(designations: string[], boxPx = 120): Scale {
  const sizes = designations.map((d) => {
    const s = sectionOrThrow(d)
    return Math.max(s.h, s.b)
  })
  const max = Math.max(1, ...sizes)
  return { pxPerMm: boxPx / max }
}

function profilePath(h: number, b: number, tw: number, tf: number, r: number): string {
  // Outline of an I section, clockwise from the top left, with root fillets of radius r.
  const x0 = 0
  const x1 = b
  const y0 = 0
  const y1 = h
  const wl = (b - tw) / 2
  const wr = wl + tw
  const ft = tf
  const fb = h - tf
  const rr = Math.min(r, wl - 0.5, (fb - ft) / 2 - 0.5)
  return [
    `M ${x0} ${y0}`,
    `H ${x1}`,
    `V ${ft}`,
    `H ${wr + rr}`,
    `A ${rr} ${rr} 0 0 0 ${wr} ${ft + rr}`,
    `V ${fb - rr}`,
    `A ${rr} ${rr} 0 0 0 ${wr + rr} ${fb}`,
    `H ${x1}`,
    `V ${y1}`,
    `H ${x0}`,
    `V ${fb}`,
    `H ${wl - rr}`,
    `A ${rr} ${rr} 0 0 0 ${wl} ${fb - rr}`,
    `V ${ft + rr}`,
    `A ${rr} ${rr} 0 0 0 ${wl - rr} ${ft}`,
    `H ${x0}`,
    'Z',
  ].join(' ')
}

export function SectionDrawing({ designation, scale, lengthM, caption = true, dims = true, className }: { designation: string; scale?: Scale; lengthM?: number; caption?: boolean; dims?: boolean; className?: string }) {
  const s = sectionOrThrow(designation)
  const sc = scale ?? scaleFor([designation])
  const k = sc.pxPerMm
  const w = s.b * k
  const h = s.h * k
  const padL = dims ? 10 : 4
  const padR = dims ? 48 : 4
  const top = dims ? 22 : 4
  const W = w + padL + padR
  const H = h + top + (caption ? 36 : 6)
  const dim = '#7B8A97'
  const ink = '#2C5E86'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} role="img" aria-label={`Section drawing of ${designation}`}>
      <g transform={`translate(${padL} ${top})`}>
        <path d={profilePath(s.h, s.b, s.tw, s.tf, 1.2 * s.tw)} transform={`scale(${k})`} fill="#E4EDF4" stroke={ink} strokeWidth={1.5 / k} vectorEffect="non-scaling-stroke" />
        {dims ? (
        <>
        {/* width dimension above */}
        <g stroke={dim} strokeWidth="1">
          <line x1={0} y1={-6} x2={w} y2={-6} />
          <line x1={0} y1={-9} x2={0} y2={-3} />
          <line x1={w} y1={-9} x2={w} y2={-3} />
        </g>
        <text x={w / 2} y={-9} textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#5A6873">
          {s.b}
        </text>
        {/* depth dimension to the right */}
        <g stroke={dim} strokeWidth="1">
          <line x1={w + 8} y1={0} x2={w + 8} y2={h} />
          <line x1={w + 5} y1={0} x2={w + 11} y2={0} />
          <line x1={w + 5} y1={h} x2={w + 11} y2={h} />
        </g>
        <text x={w + 13} y={h / 2 + 3} fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#5A6873">
          {s.h}
        </text>
        </>
        ) : null}
      </g>
      {caption ? (
        <text x={W / 2} y={H - 8} textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif" fontWeight="600" fontSize="15" fill="#14202B">
          {designation}
          {lengthM !== undefined ? `, ${lengthM.toFixed(1)} m` : ''}
        </text>
      ) : null}
    </svg>
  )
}
