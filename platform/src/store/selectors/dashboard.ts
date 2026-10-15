// Small pure helpers every role's dashboard shares: tones for the metric tiles, counts by fit and typology,
// progress against a target, a one-line activity summary and the material thumbnails on a project card.
// Thumbnails come from the shortlist rows' public cards only (P3).
import type { FamilyId, Spec } from '../../domain/types'
import type { Fit, Typology, WishStatus } from '../../domain/v1types'
import { typologyOf } from '../../domain/engines/typology'
import type { ActivityRow } from './common'
import type { ShortlistRow } from './shortlist'

export type MetricTone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger'

/** Days after which something sent for approval counts as stale. */
export const STALE_SENT_DAYS = 7

/** Nothing waiting is neutral; anything waiting a week or more is a warning; otherwise informational. */
export function waitingTone(count: number, oldestDays: number | null): MetricTone {
  if (count === 0) return 'neutral'
  if (oldestDays !== null && oldestDays >= STALE_SENT_DAYS) return 'warning'
  return 'info'
}

export const FITS: Fit[] = ['now', 'in_time', 'tight', 'late']

/** How many of each fit, ignoring materials with no fit. */
export function fitCounts(fits: (Fit | null)[]): Record<Fit, number> {
  const out: Record<Fit, number> = { now: 0, in_time: 0, tight: 0, late: 0 }
  for (const f of fits) if (f !== null) out[f] += 1
  return out
}

/** Late wins, then tight, then anything in time or available now; nothing at all is neutral. */
export function fitTone(c: Record<Fit, number>): MetricTone {
  if (c.late > 0) return 'danger'
  if (c.tight > 0) return 'warning'
  if (c.in_time + c.now > 0) return 'brand'
  return 'neutral'
}

/** The project whose start is the earliest on or after today, ties by name; null when none is ahead. */
export function earliestStart<T extends { name: string; startDate: string }>(projects: T[], today: string): T | null {
  let best: T | null = null
  for (const p of projects) {
    if (p.startDate < today) continue
    if (!best || p.startDate < best.startDate || (p.startDate === best.startDate && p.name.localeCompare(best.name, 'en-GB') < 0)) best = p
  }
  return best
}

/** How many of the families fall in each typology. */
export function typologyCounts(families: FamilyId[]): Record<Typology, number> {
  const out: Record<Typology, number> = { structure: 0, envelope: 0, finishes: 0 }
  for (const f of families) out[typologyOf(f)] += 1
  return out
}

export type TargetProgress = { status: 'met' | 'below' | 'no_target' | 'no_data'; share: number }

/** Progress towards a target: the share filled (0 to 1) and whether it is met. */
export function targetProgress(actual: number | null, target: number): TargetProgress {
  if (!(target > 0)) return { status: 'no_target', share: 0 }
  if (actual === null) return { status: 'no_data', share: 0 }
  return { status: actual >= target ? 'met' : 'below', share: Math.max(0, Math.min(1, actual / target)) }
}

export type ActivitySummary = { count: number; latest: ActivityRow | null }

/** The count and the newest entry of a newest-first feed, for a collapsed panel's one line. */
export function activitySummary(rows: ActivityRow[]): ActivitySummary {
  return { count: rows.length, latest: rows[0] ?? null }
}

export type ThumbMaterial = { publicId: string; spec: Spec; title: string }

const THUMB_ORDER: Record<WishStatus, number> = { approved: 0, sent: 1, pending: 2, declined: 3 }

/** Up to `limit` materials for a project thumbnail: approved first, then sent, then shortlisted; never declined. */
export function thumbsOf(rows: ShortlistRow[], limit = 3): ThumbMaterial[] {
  return rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.card !== null && r.status !== 'declined')
    .sort((a, b) => THUMB_ORDER[a.r.status] - THUMB_ORDER[b.r.status] || a.i - b.i)
    .slice(0, limit)
    .map(({ r }) => ({ publicId: r.publicId, spec: r.card!.listing.spec, title: r.card!.title }))
}
