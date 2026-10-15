// One figure against a whole as a thin ring, starting at twelve o'clock. The ring's path length is `max`, so the
// arc is the value itself: drawing coordinates only (P2). A max of 0 draws the track alone.
import type { ReactNode } from 'react'
import { cx } from '../cx'
import { MARK, METRIC_STATE, type MetricState, type Tone } from '../labels'
import { CHART_TRACK } from './tones'

export type ProgressRingProps = {
  value: number
  max: number
  /** Names the ring. */
  label: string
  /** Read after the label, for example "47.8 of 150 tCO2e". */
  valueText: string
  /** Fill by tone; `state` wins when both are given. */
  tone?: Tone
  state?: MetricState
  size?: 48 | 56 | 72 | 96
  thickness?: number
  /** A figure in the middle, usually the share as a percentage. */
  centre?: ReactNode
  className?: string
  testId?: string
}

export function ProgressRing({ value, max, label, valueText, tone = 'brand', state, size = 56, thickness, centre, className, testId }: ProgressRingProps) {
  const t = thickness ?? (size >= 72 ? 8 : 6)
  const r = (size - t) / 2
  const c = size / 2
  const fill = MARK[state ? METRIC_STATE[state].tone : tone]
  const shown = max > 0 ? Math.min(Math.max(value, 0), max) : 0
  return (
    <div data-testid={testId} className={cx('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg role="img" aria-label={`${label}: ${valueText}`} viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="block -rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" stroke={CHART_TRACK} strokeWidth={t} />
        {max > 0 && shown > 0 ? (
          <circle data-part="arc" cx={c} cy={c} r={r} fill="none" stroke={fill} strokeWidth={t} strokeLinecap="butt" pathLength={max} strokeDasharray={`${shown} ${max - shown}`} />
        ) : null}
      </svg>
      {centre !== undefined ? <div aria-hidden="true" className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-ink">{centre}</div> : null}
    </div>
  )
}
