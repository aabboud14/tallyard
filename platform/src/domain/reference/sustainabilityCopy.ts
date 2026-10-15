// Fixed strings for targets, certification, requirements, the circular economy statement and the client's costs
// (client-consultant design, section 2.3). Kept apart from labels.ts so the fixed label list does not change.
import type { OutputRef, StatementStatus, TrackStatus } from '../sustainabilityTypes'

export const CERT_CAVEAT = 'Indicative summaries of each scheme to help plan the evidence. Not certification advice. Confirm with the assessor and the current scheme manual.'
export const REQ_CAVEAT = "Indicative summaries of planning and sustainability requirements. Check the current policy and the local authority's validation list."
export const STATEMENT_CAVEAT = "Drafted from the project's records in Tallyard. Check every figure and statement before you submit it."
export const FINANCE_CAVEAT = 'Indicative. Guide prices with storage, testing and delivery from the package engine. Earlier deals count at the agreed material price. The same new is the quantity at the new price for the family.'
export const TARGET_CAVEAT = 'Default targets come from the requirements that apply to this project. They are indicative summaries to check.'

export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = { not_started: 'Not started', in_progress: 'In progress', at_risk: 'At risk', evidence_ready: 'Evidence ready', not_applicable: 'Not applicable' }
export const STATEMENT_STATUS_LABELS: Record<StatementStatus, string> = { draft: 'Draft', ready_for_review: 'With the client for review', reviewed: 'Reviewed by the client' }
export const STATEMENT_STATUS_FOR_CLIENT: Record<StatementStatus, string> = { draft: 'Being drafted', ready_for_review: 'Ready for your review', reviewed: 'Reviewed' }
export const OUTPUT_LABELS: Record<OutputRef, string> = { compliance_workbook: 'Compliance workbook', ce_statement: 'Circular economy statement', specification: 'Specification', sustainability: 'Sustainability summary', certification: 'Certification tracking' }
/** A local requirement shows its authority's name instead. */
export const SCOPE_LABELS = { national: 'National', london: 'London-wide' } as const
export const GOAL_STATUS_TEXT = { met: 'Target met', below: 'Below target', over: 'Over the limit', no_target: 'No target set', no_data: 'No result yet' } as const

/** Lower case for use inside a sentence, unless the word is an acronym such as BREEAM. */
export function inSentence(s: string): string {
  if (s.length > 1 && s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase()) return s
  return s.charAt(0).toLowerCase() + s.slice(1)
}
