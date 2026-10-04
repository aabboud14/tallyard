// Calendar dates as ISO strings. Arithmetic in whole days, UTC. Never the system clock.

function parts(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new Error('Bad ISO date: ' + iso)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function toUtcMs(iso: string): number {
  const [y, m, d] = parts(iso)
  return Date.UTC(y, m - 1, d)
}

export function fromUtcMs(ms: number): string {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** b minus a in whole calendar days. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000)
}

export function addDays(iso: string, days: number): string {
  return fromUtcMs(toUtcMs(iso) + days * 86_400_000)
}

export function maxDate(a: string, b: string): string {
  return toUtcMs(a) >= toUtcMs(b) ? a : b
}

export function isOnOrBefore(a: string, b: string): boolean {
  return toUtcMs(a) <= toUtcMs(b)
}

/** A month is 30 days in every storage formula. */
export function monthsCeil(days: number): number {
  return Math.ceil(Math.max(0, days) / 30)
}

export function quarterOf(iso: string): { year: number; quarter: number } {
  const [y, m] = parts(iso)
  return { year: y, quarter: Math.floor((m - 1) / 3) + 1 }
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function quarterWindow(iso: string): { start: string; end: string } {
  const { year, quarter } = quarterOf(iso)
  const m0 = (quarter - 1) * 3 + 1
  const m1 = m0 + 2
  return {
    start: `${year}-${String(m0).padStart(2, '0')}-01`,
    end: `${year}-${String(m1).padStart(2, '0')}-${String(lastDayOfMonth(year, m1)).padStart(2, '0')}`,
  }
}

export function monthWindow(iso: string): { start: string; end: string } {
  const [y, m] = parts(iso)
  return {
    start: `${y}-${String(m).padStart(2, '0')}-01`,
    end: `${y}-${String(m).padStart(2, '0')}-${String(lastDayOfMonth(y, m)).padStart(2, '0')}`,
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 15 March 2027 */
export function formatDate(iso: string): string {
  const [y, m, d] = parts(iso)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** 15 Mar 2027 */
export function formatDateShort(iso: string): string {
  const [y, m, d] = parts(iso)
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`
}

/** 15/03/2027 */
export function formatDateSlash(iso: string): string {
  const [y, m, d] = parts(iso)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

/** Q1 2027 */
export function formatQuarter(iso: string): string {
  const { year, quarter } = quarterOf(iso)
  return `Q${quarter} ${year}`
}

/** March 2027, from an ISO date or a YYYY-MM month key. */
export function formatMonth(isoOrMonth: string): string {
  const y = Number(isoOrMonth.slice(0, 4))
  const m = Number(isoOrMonth.slice(5, 7))
  return `${MONTHS[m - 1]} ${y}`
}

/** The four formats a private date must never appear in (04 section 4). */
export function dateFormats(iso: string): string[] {
  return [formatDate(iso), formatDateShort(iso), iso, formatDateSlash(iso)]
}
