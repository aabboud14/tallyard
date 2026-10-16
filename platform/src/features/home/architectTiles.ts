// The architect home's tile names, sub-lines and shortlist segments, shared with the landing page's product shot so
// the shot reads exactly like the real dashboard. Words only: every figure and state comes from architectHome (P2).
import * as f from '../../domain/format'
import type { Fit } from '../../domain/v1types'
import type { ArchitectHome } from '../../store/selectors/architect'
import { SHORTLIST_STATUS_LABELS } from '../../store/selectors/common'
import { MARK } from '../../ui'

/** A fit in the words of the pills: "5 in time", "2 available now". */
export const FIT_WORDS: Record<Fit, string> = { in_time: 'in time', tight: 'tight', late: 'late', now: 'available now' }

/** The Waiting for approval tile's sub-line. */
export function waitingSub(count: number, oldestDays: number | null): string {
  if (count === 0) return 'Nothing waiting'
  if (oldestDays === null) return 'With your clients'
  if (oldestDays === 0) return 'Sent today'
  return `Oldest sent ${oldestDays} ${oldestDays === 1 ? 'day' : 'days'} ago`
}

/** The Active projects tile's sub-line: the next start on site, or why there is none yet. */
export function projectsSub(m: ArchitectHome['metrics']): string {
  if (m.nextStart) return `Next start on site ${m.nextStart.dateText}, ${m.nextStart.projectName}`
  if (m.settingUp > 0 || m.notAccepted > 0) return 'Counted once the client accepts and the programme is confirmed'
  return 'No start dates ahead'
}

/** The Carbon avoided tile's state word with its aim, as "Off target, aim 150 tCO2e"; undefined with no carbon target. */
export function carbonStateLabel(m: ArchitectHome['metrics']): string | undefined {
  return m.carbon.state ? `${m.carbon.state.label}, aim ${f.number(m.carbon.targetT, 0)} tCO2e` : undefined
}

export const ARCHITECT_TILE_LABELS = {
  projects: 'Active projects',
  shortlisted: 'Materials shortlisted',
  waiting: 'Waiting for approval',
  carbon: 'Carbon avoided',
} as const

/** The shortlist donut: shortlisted, waiting and approved. Declined materials are left out, as on the home. */
export const STATUS_SEGMENTS = [
  { key: 'pending', label: SHORTLIST_STATUS_LABELS.pending, colour: MARK.neutral },
  { key: 'sent', label: SHORTLIST_STATUS_LABELS.sent, colour: MARK.info },
  { key: 'approved', label: SHORTLIST_STATUS_LABELS.approved, colour: MARK.brand },
] as const
