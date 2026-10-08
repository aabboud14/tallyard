// The programme on one horizontal scale: today, each material's availability window coloured by its fit,
// storage until the start, and the project start date. One row for a material page, several for a project.
// Positions are day counts from the domain's timeline scale; the browser turns them into widths with calc().
import type { CSSProperties, ReactNode } from 'react'
import type { Fit } from '../domain/v1types'
import { formatDateShort, formatMonth, monthKey } from '../domain/dates'
import { TIMELINE_TEXT } from '../domain/reference/labels'
import { daysOnScale, storageRun, timelineScale } from '../domain/engines/timelineScale'
import { cx } from './cx'
import { IndicativeMarker } from './Badge'
import { fitLabel } from './labels'

export type TimelineWindow = { start: string; end: string }

export type TimelineItem = {
  id: string
  /** Shown beside the bar when there are several rows. */
  label?: ReactNode
  /** Null when the material is available now. */
  window: TimelineWindow | null
  fit: Fit
}

const FIT_STYLE: Record<Fit, { bar: string; line: string; dot: string }> = {
  in_time: { bar: 'bg-brand-100 border-brand-500', line: 'border-brand-400', dot: 'bg-brand-600' },
  tight: { bar: 'bg-warning-soft border-[#d08a2c]', line: 'border-[#d08a2c]', dot: 'bg-[#d08a2c]' },
  late: { bar: 'bg-danger-soft border-[#c94a43]', line: 'border-[#c94a43]', dot: 'bg-danger' },
  now: { bar: 'bg-subtle border-faint', line: 'border-faint', dot: 'bg-muted' },
}

function windowText(w: TimelineWindow | null): string {
  if (w === null) return 'Available now'
  if (monthKey(w.start) === monthKey(w.end)) return `Available ${formatMonth(w.start)}`
  return `Available ${formatDateShort(w.start)} to ${formatDateShort(w.end)}`
}

export type TimelineStripProps = {
  today: string
  startDate: string
  items: TimelineItem[]
  /** Name of the start mark. */
  startLabel?: string
  /** Show the Indicative marker in the legend (P4). */
  indicative?: boolean
  className?: string
  testId?: string
}

export function TimelineStrip({ today, startDate, items, startLabel = 'Start on site', indicative = true, className, testId }: TimelineStripProps) {
  const scale = timelineScale(today, startDate, items.map((it) => it.window))
  const left = (iso: string): string => `clamp(0%, calc(${daysOnScale(scale, iso)} / ${scale.spanDays} * 100%), 100%)`
  const right = (iso: string): string => `clamp(0%, calc(100% - ${daysOnScale(scale, iso)} / ${scale.spanDays} * 100%), 100%)`
  const labelled = scale.ticks.filter((t) => t.label !== null)
  const multi = items.length > 1 || items.some((i) => i.label !== undefined)
  const single = items.length === 1 ? items[0] : null
  const describe = [
    `Timeline from today, ${formatDateShort(today)}, to the start on site, ${formatDateShort(startDate)}.`,
    ...items.map((it) => `${typeof it.label === 'string' ? it.label + ': ' : ''}${windowText(it.window)}. ${TIMELINE_TEXT[it.fit]}.`),
  ].join(' ')

  return (
    <figure className={cx('m-0 w-full min-w-0', className)} data-testid={testId} data-fit={single?.fit}>
      <div role="img" aria-label={describe} className={cx('grid gap-x-5', multi ? 'sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]' : 'grid-cols-1')}>
        {multi ? (
          <div aria-hidden="true" className="max-sm:hidden">
            <div className="h-6" />
            {items.map((it) => (
              <div key={it.id} className="flex h-8 min-w-0 items-center gap-2 text-sm text-ink-soft">
                <span className={cx('size-1.5 shrink-0 rounded-full', FIT_STYLE[it.fit].dot)} />
                <span className="truncate">{it.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div aria-hidden="true" className="relative min-w-0">
          {/* Month grid and the two marks, behind the bars. */}
          <div className="pointer-events-none absolute inset-0">
            {scale.ticks.map((t) => (
              <div key={t.iso} className="absolute bottom-0 top-5 w-px bg-line-soft" style={{ left: left(t.iso) }} />
            ))}
            <div className="absolute bottom-0 left-0 top-4 w-0.5 rounded-full bg-ink-soft/70" />
            <div className="absolute bottom-0 top-4 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: left(startDate) }} />
          </div>
          <div className="relative h-6 overflow-hidden text-[11px] text-muted">
            {labelled.map((t) => (
              <span key={t.iso} className="absolute top-0 whitespace-nowrap pl-1.5 tabular-nums" style={{ left: left(t.iso) } as CSSProperties}>
                {t.label}
              </span>
            ))}
          </div>
          {items.map((it) => {
            const s = FIT_STYLE[it.fit]
            const storage = storageRun(it.window, it.fit, today, startDate)
            return (
              <div key={it.id}>
                {multi ? <div className="truncate pt-1.5 text-xs text-ink-soft sm:hidden">{it.label}</div> : null}
                <div className="relative h-8">
                  {storage ? <div className={cx('absolute top-1/2 border-t-2 border-dashed opacity-60', s.line)} style={{ left: left(storage.start), right: right(storage.end) }} /> : null}
                  {it.window ? (
                    <div data-part="window" className={cx('absolute top-1/2 h-5 min-w-2 -translate-y-1/2 rounded-[5px] border shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]', s.bar)} style={{ left: left(it.window.start), right: right(it.window.end) }} />
                  ) : (
                    <div data-part="window" className={cx('absolute left-0 top-1/2 size-3 -translate-x-[5px] -translate-y-1/2 rounded-full ring-[3px] ring-surface', s.dot)} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-ink-soft/70" />
          Today <span className="tabular-nums text-ink-soft">{formatDateShort(today)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-ink" />
          {startLabel} <span className="font-medium tabular-nums text-ink">{formatDateShort(startDate)}</span>
        </span>
        {single ? (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={cx('h-2.5 w-4 rounded-[3px] border', FIT_STYLE[single.fit].bar)} />
            <span className="text-ink-soft">{windowText(single.window)}</span>
            <span className="text-faint">{fitLabel(single.fit)}</span>
          </span>
        ) : null}
        {indicative ? <IndicativeMarker className="sm:ml-auto" /> : null}
      </figcaption>
    </figure>
  )
}
