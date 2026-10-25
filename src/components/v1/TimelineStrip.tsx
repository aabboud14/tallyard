// One horizontal scale from today to a little past the later of the availability window and the project start.
// The window is a bar, today and the start are marks. Colour by fit. Layout arithmetic for drawing only.
import type { Fit } from '../../domain/v1types'
import { addDays, daysBetween, formatDate, formatDateShort, formatMonth, maxDate, monthKey } from '../../domain/dates'
import { TIMELINE_TEXT } from '../../domain/reference/labels'
import { cx } from '../ui'

type Window = { start: string; end: string }

const FIT_COLOUR: Record<Fit, { fill: string; tint: string }> = {
  now: { fill: '#2E7D6B', tint: '#E1F0EC' },
  in_time: { fill: '#2E7D6B', tint: '#E1F0EC' },
  tight: { fill: '#F4C20D', tint: '#FDF3C4' },
  late: { fill: '#A63A22', tint: '#F7E7E2' },
}

/** The first day of each month after `from`, up to `to`. */
function monthStarts(from: string, to: string): string[] {
  const out: string[] = []
  let y = Number(from.slice(0, 4))
  let m = Number(from.slice(5, 7))
  for (let i = 0; i < 240; i++) {
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    const iso = `${y}-${String(m).padStart(2, '0')}-01`
    if (daysBetween(iso, to) < 0) break
    out.push(iso)
  }
  return out
}

function windowText(w: Window | null): string {
  if (w === null) return 'Available now'
  if (monthKey(w.start) === monthKey(w.end)) return `Available ${formatMonth(w.start)}`
  return `Available ${formatDateShort(w.start)} to ${formatDateShort(w.end)}`
}

export function TimelineStrip({ today, startDate, window, fit, testId, className }: { today: string; startDate: string; window: Window | null; fit: Fit; testId?: string; className?: string }) {
  const last = maxDate(window ? window.end : today, startDate)
  const span0 = Math.max(1, daysBetween(today, last))
  const end = addDays(last, Math.max(21, Math.round(span0 * 0.08)))
  const span = Math.max(1, daysBetween(today, end))
  const pct = (iso: string) => Math.min(100, Math.max(0, (daysBetween(today, iso) / span) * 100))
  const c = FIT_COLOUR[fit]

  const barStart = window ? pct(window.start) : 0
  const barEnd = window ? pct(window.end) : 0
  const startX = pct(startDate)
  const storageFrom = window ? barEnd : 0
  const showStorage = fit !== 'late' && startX > storageFrom
  const ticks = monthStarts(today, end)
  const startAnchor = startX > 82 ? 'right' : startX < 18 ? 'left' : 'centre'
  const describe = `Timeline. Today ${formatDate(today)}. ${windowText(window)}. Start ${formatDate(startDate)}. ${TIMELINE_TEXT[fit]}.`

  return (
    <figure className={cx('m-0 w-full', className)} data-testid={testId} data-fit={fit}>
      <div className="relative h-5 text-xs text-mill-text">
        <span className="absolute left-0 top-0 whitespace-nowrap">
          <span className="font-medium text-ink">Today</span> {formatDateShort(today)}
        </span>
      </div>
      <svg viewBox="0 0 1000 28" preserveAspectRatio="none" className="block h-7 w-full" role="img" aria-label={describe}>
        <line x1="0" y1="14" x2="1000" y2="14" stroke="#D3DAE0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {ticks.map((iso) => {
          const x = pct(iso) * 10
          const jan = iso.slice(5, 7) === '01'
          return <line key={iso} x1={x} y1={jan ? 7 : 11} x2={x} y2={jan ? 21 : 17} stroke="#7B8A97" strokeWidth="1" opacity={jan ? 0.9 : 0.5} vectorEffect="non-scaling-stroke" />
        })}
        {showStorage ? <rect x={storageFrom * 10} y="12" width={(startX - storageFrom) * 10} height="4" fill={c.fill} opacity="0.28" /> : null}
        {window ? (
          <rect x={barStart * 10} y="6" width={Math.max(4, (barEnd - barStart) * 10)} height="16" rx="2" fill={c.tint} stroke={c.fill} strokeWidth="1.5" vectorEffect="non-scaling-stroke" data-part="window" />
        ) : (
          <rect x="0" y="6" width="6" height="16" fill={c.fill} data-part="window" />
        )}
        <line x1="1" y1="0" x2="1" y2="28" stroke="#3D4A56" strokeWidth="1.5" vectorEffect="non-scaling-stroke" data-part="today" />
        <line x1={startX * 10} y1="0" x2={startX * 10} y2="28" stroke="#14202B" strokeWidth="2" vectorEffect="non-scaling-stroke" data-part="start" />
      </svg>
      <div className="relative h-5 text-xs text-mill-text">
        <span
          className={cx('absolute top-0.5 whitespace-nowrap', startAnchor === 'right' ? '-translate-x-full' : startAnchor === 'centre' ? '-translate-x-1/2' : '')}
          style={{ left: `${startX}%` }}
        >
          <span className="font-medium text-ink">Start</span> {formatDateShort(startDate)}
        </span>
      </div>
      <figcaption className="mt-1 flex items-center gap-2 text-sm">
        <span className="inline-block h-2.5 w-4 shrink-0 rounded-[2px] border" style={{ background: c.tint, borderColor: c.fill }} aria-hidden="true" />
        <span className="text-ink-soft">{windowText(window)}</span>
      </figcaption>
    </figure>
  )
}
