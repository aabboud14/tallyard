// Horizontal bars, one row per entry: the label on the left, a 10 px bar, the value on the right in ink.
// Each bar is an SVG rect in a viewBox as wide as `max`, so the width is the value itself: nothing is worked out
// here (P2). An optional lighter bar behind shows a second figure (for example live against approved), and an
// optional ink tick marks a comparison (for example the same new). The text carries the meaning.
import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'
import { cx } from '../cx'
import { MARK } from '../labels'
import { HATCH_STYLE } from './tones'

export type BarListItem = {
  key: string
  label: string
  value: number
  valueText: string
  /** Bar fill. Defaults to the good mark. Use TYPOLOGY_VIZ for typology and MARK for status, never both in one list. */
  colour?: string
  /** A quiet line under the label. */
  sub?: string
  href?: string
  /** A second figure drawn as a lighter bar behind the first. */
  secondary?: { value: number; valueText: string } | null
  /** An ink tick on the same scale, for example the cost of the same new. */
  target?: { value: number; label: string } | null
  /** Hatches the bar, for late or declined. */
  hatched?: boolean
}

export type BarListProps = {
  items: readonly BarListItem[]
  /** The scale: the right end of every bar. From a pure domain function such as niceMax. */
  max: number
  /** Axis ticks on the same scale, under the bars. A number is printed as it is. */
  ticks?: readonly (number | { value: number; label: string })[]
  /** Names the chart; read before every label and value. */
  label: string
  /** Fill of the secondary bars. */
  secondaryColour?: string
  className?: string
  testId?: string
  /** Extra content under the bars, for example a total row. */
  footer?: ReactNode
}

const ROW = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_7rem]'

export function BarList({ items, max, ticks, label, secondaryColour = 'var(--color-brand-200)', className, testId, footer }: BarListProps) {
  const inRouter = useInRouterContext()
  const described = `${label}: ${items.map((it) => `${it.label} ${it.valueText}${it.secondary ? `, ${it.secondary.valueText}` : ''}${it.target ? `, ${it.target.label}` : ''}`).join('; ')}`
  const links = items.some((it) => it.href)
  const scale = max > 0 ? max : 1
  return (
    <div data-testid={testId} role={links ? 'group' : 'img'} aria-label={described} className={cx('flex min-w-0 flex-col gap-3', className)}>
      {items.map((it) => (
        <div key={it.key} data-part="row" className={ROW}>
          <div className="min-w-0">
            {it.href ? (
              inRouter ? (
                <Link to={it.href} className="block truncate rounded-sm text-sm font-medium text-ink hover:underline max-sm:py-3">
                  {it.label}
                </Link>
              ) : (
                <a href={it.href} className="block truncate rounded-sm text-sm font-medium text-ink hover:underline max-sm:py-3">
                  {it.label}
                </a>
              )
            ) : (
              <div className="truncate text-sm text-ink-soft">{it.label}</div>
            )}
            {it.sub ? <div className="truncate text-xs text-muted">{it.sub}</div> : null}
          </div>
          <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <div className="relative h-2.5 w-full overflow-hidden rounded-[2px] bg-subtle">
              <svg viewBox={`0 0 ${scale} 1`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 block size-full">
                {it.secondary ? <rect data-part="secondary" x="0" y="0" width={it.secondary.value} height="1" fill={secondaryColour} /> : null}
                <rect data-part="bar" x="0" y="0" width={it.value} height="1" fill={it.colour ?? MARK.brand} />
                {it.target ? <rect data-part="target" x={it.target.value} y="0" width={scale / 200} height="1" fill="var(--color-ink)" /> : null}
              </svg>
              {it.hatched ? <span data-part="hatch" aria-hidden="true" className="absolute inset-y-0 left-0" style={{ ...HATCH_STYLE, width: `calc(${it.value} / ${scale} * 100%)` }} /> : null}
            </div>
          </div>
          <div className="text-right text-sm font-medium tabular-nums text-ink sm:col-start-3 sm:row-start-1">
            {it.valueText}
            {it.secondary ? <span className="block text-xs font-normal text-muted">{it.secondary.valueText}</span> : null}
          </div>
        </div>
      ))}
      {ticks && ticks.length > 0 ? (
        <div aria-hidden="true" className={cx(ROW, 'max-sm:hidden')}>
          <div />
          <div className="relative h-4 border-t border-line text-2xs tabular-nums text-muted">
            {ticks.map((t, i) => {
              const v = typeof t === 'number' ? t : t.value
              const text = typeof t === 'number' ? String(t) : t.label
              const last = i === ticks.length - 1
              return (
                <span key={i} className={cx('absolute top-1 whitespace-nowrap', last ? '-translate-x-full' : i === 0 ? null : '-translate-x-1/2')} style={{ left: `calc(${v} / ${scale} * 100%)` }}>
                  {text}
                </span>
              )
            })}
          </div>
          <div />
        </div>
      ) : null}
      {footer}
    </div>
  )
}
