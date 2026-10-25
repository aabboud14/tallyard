// Small pure helpers every role's dashboard shares: tones for the metric tiles, counts by fit and typology,
// progress against a target, a one-line activity summary and the material thumbnails on a project card.
// Thumbnails come from the shortlist rows' public cards only (P3).
import type { FamilyId, Spec } from '../../domain/types'
import type { Fit, Typology, WishStatus } from '../../domain/v1types'
import { typologyOf } from '../../domain/engines/typology'
import { metricReading, metricState, METRIC_STATE_WORDS, type MetricState } from '../../domain/engines/metricState'
import { GOAL_STATUS_TEXT } from '../../domain/reference/sustainabilityCopy'
import type { ProgrammeStatus } from '../../domain/engines/programme'
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

// ---------- Tile states (round 2, UI stage) ----------
// A metric tile is coloured by its state against a target, always with a word (BRIEF 14.2). Each function below
// names the target it reads; a tile with no target gets null and shows no state.

export type TileState = { state: MetricState; label: string }

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Materials against the project's start on site: late wins, then tight, then all in time. */
export function fitState(c: Record<Fit, number>): TileState | null {
  if (c.late > 0) return { state: 'critical', label: `${c.late} arriving late` }
  if (c.tight > 0) return { state: 'warning', label: `${c.tight} tight for time` }
  if (c.in_time + c.now > 0) return { state: 'good', label: 'All in time' }
  return null
}

/** Something sent for approval a week ago or more is a warning; otherwise no state. */
export function waitingState(count: number, oldestDays: number | null): TileState | null {
  return waitingTone(count, oldestDays) === 'warning' ? { state: 'warning', label: 'Over a week' } : null
}

/** Each project's declared stage against the stage its programme dates place today in. */
export function programmeState(statuses: ProgrammeStatus[]): TileState | null {
  const checked = statuses.filter((s) => s !== 'not_started')
  if (checked.length === 0) return null
  const behind = checked.filter((s) => s === 'behind').length
  return behind > 0 ? { state: 'warning', label: `${plural(behind, 'project', 'projects')} behind programme` } : { state: 'good', label: 'On programme' }
}

/** A figure against a target (at least), in the words of metricState; null when no target is set. */
export function targetState(value: number, target: number): TileState | null {
  if (!(target > 0)) return null
  const r = metricReading(value, target, 'at_least')
  return { state: r.state, label: r.word }
}

/** Set targets counted by the state of their figure (metricState), plus those with no figure yet. */
export type TargetCounts = { good: number; warning: number; critical: number; set: number }

/**
 * The state of a set of targets, in the words of metricState so it reads like each meter and the carbon tile:
 * any off target is critical, else any near target is a warning, all on target is good, and the rest wait for a
 * figure (neutral). None set gives null.
 */
export function targetsMetState(c: TargetCounts): TileState | null {
  if (c.set === 0) return null
  if (c.critical > 0) return { state: 'critical', label: `${c.critical} ${METRIC_STATE_WORDS.critical.toLowerCase()}` }
  if (c.warning > 0) return { state: 'warning', label: `${c.warning} ${METRIC_STATE_WORDS.warning.toLowerCase()}` }
  if (c.good >= c.set) return { state: 'good', label: `All ${METRIC_STATE_WORDS.good.toLowerCase()}` }
  return { state: 'neutral', label: `${c.set - c.good} with ${NO_RESULT_TEXT.toLowerCase()}` }
}

/** The one phrase for a target whose figure is not known yet (no bill of materials, no result entered). */
export const NO_RESULT_TEXT = GOAL_STATUS_TEXT.no_data

/** A figure against a target (at least) as one line: no target, no figure yet, or the metricState word. */
export function targetStatusText(actual: number | null, target: number): string {
  if (!(target > 0)) return METRIC_STATE_WORDS.neutral
  if (actual === null) return NO_RESULT_TEXT
  return METRIC_STATE_WORDS[metricState(actual, target, 'at_least')]
}

/** Decisions waiting on the viewer: a warning while any wait. */
export function awaitingState(count: number): TileState | null {
  return count > 0 ? { state: 'warning', label: 'Needs a decision' } : null
}
