// Words and tones for statuses and timeline fits, shared by pills, legends and tables.
import type { LucideIcon } from 'lucide-react'
import { CalendarCheck, CalendarX, Circle, CircleAlert, CircleCheck, CircleDashed, Clock, Minus, PackageCheck, TriangleAlert } from 'lucide-react'
import type { Fit } from '../domain/v1types'
import { RIBA_STAGES } from '../domain/reference/policy'

export type Tone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger'

/** Shortlist status. `pending` is the domain's word for shortlisted. */
export type ItemStatus = 'shortlisted' | 'pending' | 'sent' | 'approved' | 'declined'

export const STATUS: Record<ItemStatus, { tone: Tone; label: string }> = {
  shortlisted: { tone: 'neutral', label: 'Shortlisted' },
  pending: { tone: 'neutral', label: 'Shortlisted' },
  sent: { tone: 'info', label: 'Sent to client' },
  approved: { tone: 'brand', label: 'Approved' },
  declined: { tone: 'danger', label: 'Declined' },
}

export function statusLabel(status: ItemStatus): string {
  return STATUS[status].label
}

export const FIT: Record<Fit, { tone: Tone; label: string; icon: LucideIcon }> = {
  in_time: { tone: 'brand', label: 'In time', icon: CalendarCheck },
  tight: { tone: 'warning', label: 'Tight', icon: Clock },
  late: { tone: 'danger', label: 'Late', icon: CalendarX },
  now: { tone: 'neutral', label: 'Available now', icon: PackageCheck },
}

export function fitLabel(fit: Fit): string {
  return FIT[fit].label
}

/** Named avatar colours a person can choose in their profile. */
export const AVATAR_COLOUR_NAMES = ['forest', 'blue', 'amber', 'rose', 'violet', 'slate', 'teal'] as const
export type AvatarColourName = (typeof AVATAR_COLOUR_NAMES)[number]

// ---------- Data colours (round 2, feedback/r2-design/visual-qa.md section 4) ----------
// Status marks and categorical hues are never mixed in one chart. Text never takes a series colour.

/** State of a figure against its target. Worked out by a pure domain function, never in a component. */
export type MetricState = 'good' | 'warning' | 'critical' | 'neutral'

/** Fill for each tone's mark: a dot, a bar, a ring or a timeline window. */
export const MARK: Record<Tone, string> = {
  neutral: 'var(--color-mark-neutral)',
  brand: 'var(--color-mark-good)',
  info: 'var(--color-mark-info)',
  warning: 'var(--color-mark-warning)',
  danger: 'var(--color-mark-critical)',
}

/** The tone each metric state takes, so a state reads the same on a pill, a meter and a tile. */
export const STATE_TONE: Record<MetricState, Tone> = { good: 'brand', warning: 'warning', critical: 'danger', neutral: 'neutral' }

/** Words and icons for each metric state. A state colour always comes with both. */
export const METRIC_STATE: Record<MetricState, { label: string; icon: LucideIcon; tone: Tone }> = {
  good: { label: 'On target', icon: CircleCheck, tone: 'brand' },
  warning: { label: 'Near target', icon: TriangleAlert, tone: 'warning' },
  critical: { label: 'Off target', icon: CircleAlert, tone: 'danger' },
  neutral: { label: 'No target set', icon: Minus, tone: 'neutral' },
}

/** The three typologies take the first three categorical slots, in this order, everywhere. */
export const TYPOLOGY_VIZ: Record<'structure' | 'envelope' | 'finishes', string> = {
  structure: 'var(--color-viz-1)',
  envelope: 'var(--color-viz-2)',
  finishes: 'var(--color-viz-3)',
}

/** The categorical order for any other identity. A seventh series folds into "Other" in VIZ_OTHER. */
export const VIZ = ['var(--color-viz-1)', 'var(--color-viz-2)', 'var(--color-viz-3)', 'var(--color-viz-4)', 'var(--color-viz-5)', 'var(--color-viz-6)'] as const
export const VIZ_OTHER = 'var(--color-viz-other)'

/** The unfilled part of a ring, meter or bar. */
export const TRACK = 'var(--color-track)'

/** Status of a tracked requirement, credit or measure. The words and tones the product uses everywhere. */
export type TrackStatusKey = 'not_started' | 'in_progress' | 'at_risk' | 'evidence_ready' | 'not_applicable'

export const TRACK_STATUS: Record<TrackStatusKey, { label: string; tone: Tone; icon: LucideIcon }> = {
  not_started: { label: 'Not started', tone: 'neutral', icon: Circle },
  in_progress: { label: 'In progress', tone: 'info', icon: CircleDashed },
  at_risk: { label: 'At risk', tone: 'warning', icon: TriangleAlert },
  evidence_ready: { label: 'Evidence ready', tone: 'brand', icon: CircleCheck },
  not_applicable: { label: 'Not applicable', tone: 'neutral', icon: Minus },
}

export const TRACK_STATUS_ORDER: readonly TrackStatusKey[] = ['not_started', 'in_progress', 'at_risk', 'evidence_ready', 'not_applicable']

/** "Stage 2, Concept Design", or "Before stage 0" when the programme has not started. */
export function ribaStageText(stage: number | null, labels: readonly string[] = RIBA_STAGES): string {
  if (stage === null) return 'Before stage 0'
  const name = labels[stage]
  return name ? `Stage ${stage}, ${name}` : `Stage ${stage}`
}
