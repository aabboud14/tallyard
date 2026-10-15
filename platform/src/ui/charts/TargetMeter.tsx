// One figure against its target: a label row, a 12 px bar filled in the state's mark, an ink tick at the target,
// the target in words and the state as an icon and a word. Every figure and the state come in as props; the
// state is worked out by a pure domain function (P2).
import { cx } from '../cx'
import { MARK, METRIC_STATE, type MetricState } from '../labels'

export type TargetMeterProps = {
  label: string
  value: number
  /** The right end of the bar. */
  max: number
  /** On the same scale as value; null when no target is set. */
  target: number | null
  valueText: string
  /** For example "Aim at least 20%". */
  targetText: string | null
  state: MetricState
  /** Overrides the state's words, for example "Target met" or "No bill of materials yet". */
  stateText?: string
  /** Words for the two ends of the bar, for example "0%" and "40%". */
  axis?: { start: string; end: string }
  size?: 'sm' | 'md'
  className?: string
  testId?: string
}

export function TargetMeter({ label, value, max, target, valueText, targetText, state, stateText, axis, size = 'md', className, testId }: TargetMeterProps) {
  const m = METRIC_STATE[state]
  const Icon = m.icon
  const word = stateText ?? m.label
  const scale = max > 0 ? max : 1
  const spoken = [valueText, targetText, word].filter(Boolean).join('. ')
  return (
    <div data-testid={testId} data-state={state} className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-ink-soft">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-ink">{valueText}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={spoken}
        className={cx('relative w-full overflow-hidden rounded-[2px] bg-subtle', size === 'sm' ? 'h-1.5' : 'h-3')}
      >
        <svg viewBox={`0 0 ${scale} 1`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 block size-full">
          <rect data-part="fill" x="0" y="0" width={value} height="1" fill={MARK[m.tone]} />
          {target !== null ? <rect data-part="target" x={target} y="0" width={scale / 150} height="1" fill="var(--color-ink)" /> : null}
        </svg>
      </div>
      {axis ? (
        <div aria-hidden="true" className="flex justify-between text-2xs tabular-nums text-muted">
          <span>{axis.start}</span>
          <span>{axis.end}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        {targetText ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span aria-hidden="true" className="h-3 w-0.5 shrink-0 bg-ink" />
            {targetText}
          </span>
        ) : (
          <span />
        )}
        <span data-part="state" className="inline-flex items-center gap-1.5 text-ink-soft">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: MARK[m.tone] }} />
          <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
          {word}
        </span>
      </div>
    </div>
  )
}
