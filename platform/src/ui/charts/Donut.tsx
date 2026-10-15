// Part to whole at a glance, for up to six segments: thin arcs with a 2 px surface gap between them, starting at
// twelve o'clock. Each arc's length is its value on a ring whose path length is the total, so the arcs are
// drawing coordinates only (P2). The accessible name lists every segment; pair it with a Legend.
import type { ReactNode } from 'react'
import { cx } from '../cx'
import { CHART_GAP, CHART_TRACK } from './tones'

export type DonutSegment = { key: string; label: string; value: number; colour: string; /** Read out in place of the value, for example "£41,391". */ valueText?: string }

export type DonutProps = {
  segments: readonly DonutSegment[]
  /** Names the chart, read before the segments. */
  label: string
  size?: 48 | 56 | 72 | 96
  /** Ring width in pixels, 6 to 8 by default. */
  thickness?: number
  /** A figure in the middle, for example a count. */
  centre?: ReactNode
  className?: string
  testId?: string
}

/** Where each arc starts on a ring whose path length is the total, less a surface gap. Drawing coordinates only. */
function arcsOf(segments: readonly DonutSegment[], circumference: number): { arcs: { s: DonutSegment; start: number; length: number }[]; total: number } {
  const shown = segments.filter((s) => s.value > 0)
  const total = shown.reduce((sum, s) => sum + s.value, 0)
  const gap = shown.length > 1 ? (CHART_GAP * total) / circumference : 0
  const arcs: { s: DonutSegment; start: number; length: number }[] = []
  let at = 0
  for (const s of shown) {
    arcs.push({ s, start: at, length: Math.max(0, s.value - gap) })
    at += s.value
  }
  return { arcs, total }
}

export function Donut({ segments, label, size = 56, thickness, centre, className, testId }: DonutProps) {
  const t = thickness ?? (size >= 72 ? 8 : 6)
  const r = (size - t) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const { arcs, total } = arcsOf(segments, circumference)
  return (
    <div data-testid={testId} className={cx('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.valueText ?? s.value}`).join(', ')}`} viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block -rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke={CHART_TRACK} strokeWidth={t} />
        {arcs.map(({ s, start, length }) => (
          <circle
            key={s.key}
            data-part="arc"
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.colour}
            strokeWidth={t}
            pathLength={total}
            strokeDasharray={`${length} ${total - length}`}
            strokeDashoffset={-start}
          />
        ))}
      </svg>
      {centre !== undefined ? <div aria-hidden="true" className="absolute inset-0 grid place-items-center text-sm font-semibold tabular-nums text-ink">{centre}</div> : null}
    </div>
  )
}
