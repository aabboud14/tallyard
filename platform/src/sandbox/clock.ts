// The one clock (P7). Nothing else in the app reads the system time. Tests pin it with setClockForTests.

let pinned: Date | null = null

function current(): Date {
  return pinned ? new Date(pinned.getTime()) : new Date()
}

/** Today as a UTC ISO date, for example 2026-10-08. */
export function today(): string {
  return current().toISOString().slice(0, 10)
}

/** Now as a full ISO timestamp in UTC, for example 2026-10-08T09:30:00.000Z. */
export function nowIso(): string {
  return current().toISOString()
}

/** Pins the clock to a date (an ISO date, an ISO timestamp or a Date), or releases it with null. */
export function setClockForTests(date: string | Date | null): void {
  if (date === null) {
    pinned = null
    return
  }
  if (date instanceof Date) {
    pinned = new Date(date.getTime())
    return
  }
  pinned = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T09:00:00.000Z` : date)
}
