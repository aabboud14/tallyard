// The time scale of a programme strip (P2): where the month ticks, each availability window, the storage run and
// the start date sit, as whole days from today, so the strip component only places them. Pure; dates are ISO
// strings and every count is in whole UTC days.
import type { Fit } from '../v1types'
import { addDays, daysBetween, formatMonth, maxDate, monthKey } from '../dates'

export type ScaleWindow = { start: string; end: string }

export type TimelineTick = {
  /** The first day of the month. */
  iso: string
  /** Days from today. */
  days: number
  /** "Mar", or "Jan 2027" at the turn of a year and on the first label; null for an unlabelled grid line. */
  label: string | null
}

export type TimelineScale = {
  today: string
  /** The last day on the strip: the latest date shown plus a margin. */
  end: string
  /** Days from today to the end, at least 1. */
  spanDays: number
  ticks: TimelineTick[]
}

/** Days of margin after the latest date on the strip. */
export const TIMELINE_MARGIN_DAYS = 45

/** Beyond this many month lines only quarters are labelled; beyond the second, only years. */
const QUARTERLY_AFTER = 12
const YEARLY_AFTER = 36

/** The first day of each month after `from`, up to and including `to`. */
export function monthStarts(from: string, to: string): string[] {
  const out: string[] = []
  let key = monthKey(from)
  for (let i = 0; i < 240; i++) {
    const next = monthKey(addDays(`${key}-01`, 32))
    const iso = `${next}-01`
    if (daysBetween(iso, to) < 0) break
    out.push(iso)
    key = next
  }
  return out
}

function tickText(iso: string, first: boolean): string {
  const [name, year] = formatMonth(iso).split(' ')
  return first || iso.slice(5, 7) === '01' ? `${name.slice(0, 3)} ${year}` : name.slice(0, 3)
}

/** The scale for a strip from today to past the start date and the last availability window. */
export function timelineScale(today: string, startDate: string, windows: (ScaleWindow | null)[]): TimelineScale {
  const last = windows.reduce((acc, w) => (w ? maxDate(acc, w.end) : acc), maxDate(today, startDate))
  const end = addDays(last, TIMELINE_MARGIN_DAYS)
  const spanDays = Math.max(1, daysBetween(today, end))
  const starts = monthStarts(today, end)
  const quarterly = starts.length > QUARTERLY_AFTER
  const yearly = starts.length > YEARLY_AFTER
  let first = true
  const ticks = starts.map((iso): TimelineTick => {
    const m = iso.slice(5, 7)
    const shown = yearly ? m === '01' : quarterly ? ['01', '04', '07', '10'].includes(m) : true
    const label = shown ? tickText(iso, first) : null
    if (shown) first = false
    return { iso, days: daysBetween(today, iso), label }
  })
  return { today, end, spanDays, ticks }
}

/** Days from today to a date, on the scale. */
export function daysOnScale(scale: TimelineScale, iso: string): number {
  return daysBetween(scale.today, iso)
}

/** Storage on the strip: from the end of availability (or today, when available now) to the start, when the material arrives in time and early. */
export function storageRun(window: ScaleWindow | null, fit: Fit, today: string, startDate: string): ScaleWindow | null {
  const from = window ? window.end : today
  return fit !== 'late' && daysBetween(from, startDate) > 0 ? { start: from, end: startDate } : null
}
