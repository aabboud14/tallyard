// Availability as approximate dates, and the month scale behind the "available by" slider
// (feedback/r2-design/marketplace-material.md section 3.1). Pure. Reads only the disclosed window of a public
// listing, never the owner's exact date.
import type { Availability, PublicListing } from '../types'
import { formatDate, formatMonth, isOnOrBefore, monthWindow, MONTHS, MONTHS_SHORT } from '../dates'

export type AvailabilityPhrase = {
  kind: 'now' | 'month' | 'range'
  /** "Available now", "Expected November 2026", "Expected January to March 2027" */
  text: string
  /** "Available now", "Expected Nov 2026", "Expected Jan to Mar 2027" (cards) */
  short: string
}

export type AvailabilityPosition = {
  /** ISO date used as BrowseFilters.availableBy: today for position 0, else the last day of the month. */
  value: string
  /** "Available now" or "By the end of January 2027" */
  label: string
  /** "Now", "Nov", "Jan 2027" (the year is shown on January) */
  short: string
  /** Listings that become available in this step (window start after the previous value, on or before this one). */
  count: number
  /** Listings available by this value. */
  cumulative: number
  /** count / largest count, 0 to 1, rounded to 3 decimals (bar height). */
  share: number
}

export type AvailabilityScale = {
  today: string
  positions: AvailabilityPosition[] // index 0 is "Available now"
  /** Index of "Any time", that is positions.length. */
  anyIndex: number
  /** Windows starting after the last position (only counted under "Any time"). */
  later: number
  /** later / largest count, 0 to 1, rounded to 3 decimals: the bar height on "Any time". */
  laterShare: number
  total: number
}

export const AVAILABLE_NOW = 'Available now'
export const ANY_TIME = 'Any time'

function ym(iso: string): [number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7))]
}

/** Whole calendar months from the month of a to the month of b. */
export function monthsAfter(a: string, b: string): number {
  const [ya, ma] = ym(a)
  const [yb, mb] = ym(b)
  return (yb - ya) * 12 + (mb - ma)
}

/** The last day of the month that is `n` months after the month of `iso`. */
export function monthEndAfter(iso: string, n: number): string {
  const [y, m] = ym(iso)
  const k = y * 12 + (m - 1) + n
  const yy = Math.floor(k / 12)
  const mm = (k % 12) + 1
  return monthWindow(`${yy}-${String(mm).padStart(2, '0')}-01`).end
}

function isMonthEnd(iso: string): boolean {
  return monthWindow(iso).end === iso
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

/** The availability as buyers read it, from the disclosed window only. */
export function availabilityPhrase(a: Availability): AvailabilityPhrase {
  if (a.kind === 'now') return { kind: 'now', text: AVAILABLE_NOW, short: AVAILABLE_NOW }
  const [ys, ms] = ym(a.windowStart)
  const [ye, me] = ym(a.windowEnd)
  if (ys === ye && ms === me) {
    return { kind: 'month', text: `Expected ${formatMonth(a.windowStart)}`, short: `Expected ${MONTHS_SHORT[ms - 1]} ${ys}` }
  }
  if (ys === ye) {
    return {
      kind: 'range',
      text: `Expected ${MONTHS[ms - 1]} to ${MONTHS[me - 1]} ${ye}`,
      short: `Expected ${MONTHS_SHORT[ms - 1]} to ${MONTHS_SHORT[me - 1]} ${ye}`,
    }
  }
  return {
    kind: 'range',
    text: `Expected ${MONTHS[ms - 1]} ${ys} to ${MONTHS[me - 1]} ${ye}`,
    short: `Expected ${MONTHS_SHORT[ms - 1]} ${ys} to ${MONTHS_SHORT[me - 1]} ${ye}`,
  }
}

export type ScaleOptions = { minMonths?: number; maxMonths?: number; includeDate?: string | null }

/**
 * The month steps of the "available by" slider. Position 0 is today ("Available now"), position i the last day of
 * the month i months after today's month. Counts match filterListings with the same availableBy value.
 */
export function availabilityScale(listings: PublicListing[], today: string, opts: ScaleOptions = {}): AvailabilityScale {
  const minMonths = opts.minMonths ?? 6
  const maxMonths = opts.maxMonths ?? 24
  const starts = listings.flatMap((l) => (l.availability.kind === 'window' ? [l.availability.windowStart] : []))
  const latest = starts.reduce((m, s) => Math.max(m, monthsAfter(today, s)), 0)
  const include = opts.includeDate ? monthsAfter(today, opts.includeDate) : 0
  const n = clamp(Math.max(latest, include), minMonths, maxMonths)

  const values = [today]
  for (let i = 1; i <= n; i++) values.push(monthEndAfter(today, i))

  const counts = values.map(() => 0)
  let later = 0
  for (const l of listings) {
    const a = l.availability
    if (a.kind === 'now' || isOnOrBefore(a.windowStart, today)) {
      counts[0]++
      continue
    }
    const i = values.findIndex((v) => isOnOrBefore(a.windowStart, v))
    if (i === -1) later++
    else counts[i]++
  }
  const maxCount = Math.max(0, later, ...counts)
  const share = (c: number) => (maxCount === 0 ? 0 : round3(c / maxCount))

  let running = 0
  const positions: AvailabilityPosition[] = values.map((value, i) => {
    running += counts[i]
    const month = ym(value)[1]
    return {
      value,
      label: i === 0 ? AVAILABLE_NOW : `By the end of ${formatMonth(value)}`,
      short: i === 0 ? 'Now' : month === 1 ? `${MONTHS_SHORT[0]} ${ym(value)[0]}` : MONTHS_SHORT[month - 1],
      count: counts[i],
      cumulative: running,
      share: share(counts[i]),
    }
  })
  return { today, positions, anyIndex: positions.length, later, laterShare: share(later), total: listings.length }
}

/** The slider position of an availableBy value. Old quarter-start links land on their month. */
export function scalePositionOf(scale: AvailabilityScale, availableBy: string | null): number {
  if (availableBy === null) return scale.anyIndex
  if (isOnOrBefore(availableBy, scale.today)) return 0
  const i = scale.positions.findIndex((p) => isOnOrBefore(availableBy, p.value))
  return i === -1 ? scale.anyIndex : i
}

/** The words for an availableBy value: the slider label and the active filter chip. */
export function availableByLabel(availableBy: string | null, today: string): string {
  if (availableBy === null) return ANY_TIME
  if (isOnOrBefore(availableBy, today)) return AVAILABLE_NOW
  if (isMonthEnd(availableBy)) return `By the end of ${formatMonth(availableBy)}`
  return `By ${formatDate(availableBy)}`
}
