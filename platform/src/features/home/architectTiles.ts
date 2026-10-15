// The architect home's tile names and shortlist segments, shared with the landing page's product shot so the
// mock reads exactly like the real dashboard.
import { SHORTLIST_STATUS_LABELS } from '../../store/selectors/common'
import { MARK } from '../../ui'

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
