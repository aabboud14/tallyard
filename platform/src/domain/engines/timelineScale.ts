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

/**
 * The least gap between two month labels, as a share of the strip, so they never run into each other where the strip
 * is narrowest (about 358 px on a phone, where a three-letter month needs about 32 px with its padding).
 */
export const TICK_LABEL_MIN_SHARE = 0.09

/** A label carrying the year ("Jan 2027") is this many times as wide as a bare month, so it needs a wider gap. */
export const YEAR_LABEL_FACTOR = 1.7

/** Label every month, every other month, each quarter, each half year or each year; labels sit on aligned months. */
const LABEL_STEPS = [1, 2, 3, 6, 12] as const

export type TimelineScaleOptions = {
  /** The least gap between labels as a share of the span; 0 keeps the month, quarter and year rule alone. */
  minLabelShare?: number
}

function labelsFor(starts: string[], step: number, today: string): TimelineTick[] {
  let first = true
  return starts.map((iso): TimelineTick => {
    const shown = (Number(iso.slice(5, 7)) - 1) % step === 0
    const label = shown ? tickText(iso, first) : null
    if (shown) first = false
    return { iso, days: daysBetween(today, iso), label }
  })
}

/** Whether each pair of neighbouring labels is at least the share apart, wider after a label with a year. */
function spacedEnough(ticks: TimelineTick[], spanDays: number, minShare: number): boolean {
  const labelled = ticks.filter((t) => t.label !== null)
  for (let i = 1; i < labelled.length; i++) {
    const prev = labelled[i - 1]
    const need = minShare * (prev.label!.includes(' ') ? YEAR_LABEL_FACTOR : 1)
    if ((labelled[i].days - prev.days) / spanDays < need) return false
  }
  return true
}

/** The scale for a strip from today to past the start date and the last availability window. */
export function timelineScale(today: string, startDate: string, windows: (ScaleWindow | null)[], opts: TimelineScaleOptions = {}): TimelineScale {
  const last = windows.reduce((acc, w) => (w ? maxDate(acc, w.end) : acc), maxDate(today, startDate))
  const end = addDays(last, TIMELINE_MARGIN_DAYS)
  const spanDays = Math.max(1, daysBetween(today, end))
  const starts = monthStarts(today, end)
  const floor = starts.length > YEARLY_AFTER ? 12 : starts.length > QUARTERLY_AFTER ? 3 : 1
  const minShare = opts.minLabelShare ?? 0
  const steps = LABEL_STEPS.filter((k) => k >= floor)
  let ticks = labelsFor(starts, steps[0], today)
  for (const k of steps) {
    ticks = labelsFor(starts, k, today)
    if (minShare <= 0 || spacedEnough(ticks, spanDays, minShare)) break
  }
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
