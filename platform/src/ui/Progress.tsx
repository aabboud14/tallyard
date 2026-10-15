// ProgressBar (one value against a whole, with an optional target tick) and SegmentedBar (counts by status in
// one bar, with a legend). Widths come from SVG coordinates and flex growth, so no figure is worked out here.
import type { ReactNode } from 'react'
import { cx } from './cx'
import type { Tone } from './Badge'
import { MARK } from './labels'

export type ProgressBarProps = {
  value: number
  max: number
  /** Accessible name, and the visible label when `showLabel`. */
  label: string
  /** Text at the end of the label row, for example "3 of 8". */
  valueText?: ReactNode
  /** A target on the same scale, drawn as an ink tick. */
  target?: number
  /** Words for the target, read out with the value, for example "Aim at least 20%". */
  targetText?: string
  showLabel?: boolean
  tone?: Tone
  size?: 'sm' | 'md'
  className?: string
}

export function ProgressBar({ value, max, label, valueText, target, targetText, showLabel = false, tone = 'brand', size = 'md', className }: ProgressBarProps) {
  const ok = max > 0
  const spoken = [typeof valueText === 'string' ? valueText : null, target !== undefined ? (targetText ?? `Target ${target} of ${max}`) : null].filter(Boolean).join('. ')
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      {showLabel ? (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-ink-soft">{label}</span>
          {valueText ? <span className="font-medium tabular-nums text-ink">{valueText}</span> : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={spoken || undefined}
        className={cx('w-full overflow-hidden rounded-full bg-subtle ring-1 ring-inset ring-line-soft', size === 'sm' ? 'h-1.5' : 'h-2')}
      >
        {ok ? (
          <svg viewBox={`0 0 ${max} 1`} preserveAspectRatio="none" className="block h-full w-full" aria-hidden="true">
            <rect x="0" y="0" width={Math.min(value, max)} height="1" fill={MARK[tone]} />
            {target !== undefined ? <rect data-part="target" x={target} y="0" width={max / 200} height="1" fill="var(--color-ink)" /> : null}
          </svg>
        ) : null}
      </div>
    </div>
  )
}

export type Segment = {
  key: string
  label: string
  count: number
  tone: Tone
  /** A categorical colour in place of the tone's mark, for identity rather than status (typology, factors). */
  colour?: string
}

const fillOf = (s: Segment): string => s.colour ?? MARK[s.tone]

/** Counts by status as one bar. Segments with no items are left out of the bar but stay in the legend. */
export function SegmentedBar({ segments, label, legend = true, total, size = 'md', className }: { segments: Segment[]; label: string; legend?: boolean; total?: ReactNode; size?: 'sm' | 'md'; className?: string }) {
  const described = `${label}: ${segments.map((s) => `${s.label} ${s.count}`).join(', ')}`
  const any = segments.some((s) => s.count > 0)
  return (
    <div className={cx('flex min-w-0 flex-col gap-2', className)}>
      <div role="img" aria-label={described} className={cx('flex w-full gap-[2px] overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5', !any && 'rounded-[2px] bg-subtle ring-1 ring-inset ring-line-soft')}>
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span key={s.key} className="h-full rounded-[2px]" style={{ flexGrow: s.count, flexBasis: 0, background: fillOf(s) }} />
          ))}
      </div>
      {legend ? (
        <ul aria-hidden="true" className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-sm text-muted">
          {segments.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px]" style={{ background: fillOf(s) }} />
              <span>{s.label}</span>
              <span className="font-medium tabular-nums text-ink">{s.count}</span>
            </li>
          ))}
          {total !== undefined ? <li className="ml-auto text-muted">{total}</li> : null}
        </ul>
      ) : null}
    </div>
  )
}
