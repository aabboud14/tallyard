// Small line spots for empty states: 120 by 88, ink-soft strokes at 1.25 px and one flat accent. Always
// decorative (aria-hidden): the empty state's title and text carry the meaning. Drawing coordinates only.
import type { ReactNode } from 'react'
import type { SpotKind } from './spotKinds'

const STROKE = 'var(--color-ink-soft)'
const ACCENT = 'var(--color-brand-100)'
const BRICK = '#c9907a'
const STONE = '#e6ddc8'

function Site() {
  return (
    <>
      <rect x="22" y="16" width="76" height="56" rx="2" fill="none" stroke={STROKE} strokeDasharray="4 3" />
      <rect x="40" y="30" width="34" height="26" fill={ACCENT} stroke={STROKE} />
      <line x1="40" y1="43" x2="74" y2="43" stroke={STROKE} strokeWidth="0.75" />
      <line x1="57" y1="30" x2="57" y2="56" stroke={STROKE} strokeWidth="0.75" />
      <path d="M 8 80 H 112" stroke={STROKE} />
      <circle cx="88" cy="62" r="5" fill="none" stroke={STROKE} />
      <circle cx="30" cy="62" r="4" fill="none" stroke={STROKE} />
    </>
  )
}

function Building() {
  return (
    <>
      <path d="M 30 30 L 60 16 L 90 30 L 60 44 Z" fill="#f7f5f1" stroke={STROKE} />
      <path d="M 30 30 V 70 L 60 84 V 44 Z" fill={ACCENT} stroke={STROKE} />
      <path d="M 60 44 V 84 L 90 70 V 30 Z" fill="none" stroke={STROKE} />
      {[40, 50, 60].map((y) => (
        <line key={y} x1="30" y1={y} x2="60" y2={y + 14} stroke={STROKE} strokeWidth="0.75" />
      ))}
      {[40, 50, 60].map((y) => (
        <line key={`r${y}`} x1="60" y1={y + 14} x2="90" y2={y} stroke={STROKE} strokeWidth="0.75" />
      ))}
    </>
  )
}

function Beam({ y }: { y: number }) {
  return (
    <>
      <path d={`M 20 ${y} h 14 v 3 h -5 v 8 h 5 v 3 h -14 v -3 h 5 v -8 h -5 Z`} fill={ACCENT} stroke={STROKE} strokeLinejoin="round" />
      <path d={`M 34 ${y} L 96 ${y - 12} M 34 ${y + 14} L 96 ${y + 2}`} stroke={STROKE} />
      <path d={`M 96 ${y - 12} v 14`} stroke={STROKE} strokeWidth="0.75" />
    </>
  )
}

function Materials() {
  return (
    <>
      <Beam y={54} />
      <Beam y={36} />
      <path d="M 10 76 H 110" stroke={STROKE} />
      <rect x="16" y="70" width="88" height="6" fill="none" stroke={STROKE} strokeWidth="0.75" />
    </>
  )
}

function Inbox() {
  return (
    <>
      <path d="M 22 50 L 60 32 L 98 50 L 60 68 Z" fill="#f7f5f1" stroke={STROKE} />
      <path d="M 22 50 V 58 L 60 76 V 68 M 98 50 V 58 L 60 76" fill="none" stroke={STROKE} />
      <path d="M 40 46 L 60 37 L 80 46 L 60 55 Z" fill={BRICK} stroke={STROKE} strokeWidth="0.75" />
      <path d="M 40 46 V 40 L 60 31 L 80 40 V 46" fill="none" stroke={STROKE} strokeWidth="0.75" />
    </>
  )
}

function Targets() {
  return (
    <>
      <path d="M 14 72 H 106" stroke={STROKE} />
      <rect x="22" y="48" width="14" height="24" fill="none" stroke={STROKE} />
      <rect x="46" y="36" width="14" height="36" fill={ACCENT} stroke={STROKE} />
      <rect x="70" y="26" width="14" height="46" fill="none" stroke={STROKE} />
      <path d="M 16 30 H 104" stroke={STROKE} strokeDasharray="3 3" />
      <path d="M 96 26 l 8 4 l -8 4" fill="none" stroke={STROKE} />
    </>
  )
}

function Search() {
  return (
    <>
      <rect x="16" y="22" width="26" height="26" fill={BRICK} stroke={STROKE} />
      <rect x="46" y="22" width="26" height="26" fill={STONE} stroke={STROKE} />
      <rect x="16" y="52" width="26" height="20" fill="none" stroke={STROKE} />
      <circle cx="78" cy="50" r="16" fill="#ffffff" fillOpacity="0.6" stroke={STROKE} />
      <path d="M 90 62 L 104 76" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
    </>
  )
}

function Activity() {
  return (
    <>
      <path d="M 12 44 H 108" stroke={STROKE} strokeDasharray="2 4" />
      {[24, 50, 76, 98].map((x, i) => (
        <circle key={x} cx={x} cy="44" r="5" fill={i === 2 ? ACCENT : '#ffffff'} stroke={STROKE} />
      ))}
      <path d="M 24 30 v 6 M 50 54 v 6 M 76 30 v 6" stroke={STROKE} strokeWidth="0.75" />
    </>
  )
}

const DRAW: Record<SpotKind, () => ReactNode> = {
  project: Site,
  building: Building,
  materials: Materials,
  inbox: Inbox,
  targets: Targets,
  search: Search,
  activity: Activity,
}

/** A decorative line spot for an empty state. */
export function SpotIllustration({ kind, className }: { kind: SpotKind; className?: string }) {
  const Draw = DRAW[kind]
  return (
    <svg viewBox="0 0 120 88" width="120" height="88" aria-hidden="true" focusable="false" className={className} data-spot={kind} fill="none" strokeWidth="1.25">
      <Draw />
    </svg>
  )
}
