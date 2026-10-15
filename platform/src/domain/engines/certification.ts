// Mapping a project's reclaimed materials to certification credits, and suggesting a status for each credit from
// what Tallyard holds (client-consultant design, section 3.3). Rule-based and indicative, never an assessment.
import type { EraBand, FamilyId, TestStatus } from '../types'
import type { StatementStatus, TrackStatus } from '../sustainabilityTypes'
import type { CreditDef, ItemRule } from '../reference/certification'
import { TRACK_STATUSES } from '../sustainabilityTypes'
import * as f from '../format'

export type MappedItem = { publicId: string; description: string; family: FamilyId; status: 'Confirmed' | 'Reserved' | 'Approved'; eraBand: EraBand | null; testStatus: TestStatus | null }

export type CreditMetrics = { hasBill: boolean; contentSecured: number; contentWithApproved: number; aim: number; avoidedSecuredT: number; statement: StatementStatus | null }

/** Whether a rule includes an item before the consultant changes anything. */
export function defaultIncluded(rule: ItemRule, item: MappedItem): boolean {
  if (rule === 'all_reused') return true
  if (rule === 'steel') return item.family === 'steel_section'
  if (rule === 'pre_1970_or_untested') return item.eraBand === 'before 1970' || item.testStatus === 'untested'
  return false
}

/** The items a credit lists, each with whether it is included and whether that is the rule's default. A rule of none lists nothing. */
export function creditItems(def: CreditDef, items: MappedItem[], overrides: Record<string, boolean>): { item: MappedItem; included: boolean; byDefault: boolean }[] {
  if (def.itemRule === 'none') return []
  return items.map((item) => {
    const byDefault = defaultIncluded(def.itemRule, item)
    const o = overrides[item.publicId]
    return { item, included: o === undefined ? byDefault : o, byDefault }
  })
}

/** A credit starts targeted when its scheme is targeted on the project and the credit is one usually sought. */
export function defaultTargeted(def: CreditDef, schemeTargeted: boolean): boolean {
  return schemeTargeted && def.defaultTargeted
}

const pct = (x: number) => f.percent(x)

/** The status Tallyard's records suggest, with the reason, or null when its records say nothing about the credit. */
export function suggestedStatus(def: CreditDef, m: CreditMetrics, included: MappedItem[]): { status: TrackStatus; reason: string } | null {
  const ev = def.evidence
  if (ev.includes('content_by_value')) {
    if (!m.hasBill) return null
    if (m.contentSecured >= m.aim) return { status: 'evidence_ready', reason: `Content by value ${pct(m.contentSecured)} secured, aim ${pct(m.aim)}` }
    if (m.contentWithApproved >= m.aim) return { status: 'in_progress', reason: `${pct(m.contentSecured)} secured, ${pct(m.contentWithApproved)} with approved materials` }
    return { status: 'at_risk', reason: `${pct(m.contentWithApproved)} with approved materials, aim ${pct(m.aim)}` }
  }
  if (ev.includes('hazard_screening')) {
    if (included.length === 0) return null
    return { status: 'at_risk', reason: `${included.length} ${included.length === 1 ? 'item' : 'items'} to screen: built before 1970 or untested` }
  }
  if (ev.includes('statement')) {
    if (m.statement === 'reviewed') return { status: 'evidence_ready', reason: 'The statement is reviewed by the client' }
    if (m.statement === 'ready_for_review' || m.statement === 'draft') return { status: 'in_progress', reason: m.statement === 'draft' ? 'The statement is in draft' : 'The statement is with the client for review' }
    return { status: 'not_started', reason: 'No statement drafted yet' }
  }
  if (ev.includes('reused_items') || ev.includes('carbon_factors') || ev.includes('avoided_carbon')) {
    const secured = included.filter((i) => i.status === 'Confirmed' || i.status === 'Reserved').length
    if (secured > 0) return { status: 'in_progress', reason: `${secured} secured ${secured === 1 ? 'item' : 'items'} mapped` }
    if (included.length > 0) return { status: 'in_progress', reason: `${included.length} approved ${included.length === 1 ? 'item' : 'items'}, none secured yet` }
    return { status: 'not_started', reason: 'No reclaimed materials mapped yet' }
  }
  return null
}

/** Counts by status over the targeted rows only. */
export function schemeCounts(rows: { targeted: boolean; status: TrackStatus }[]): { targeted: number; counts: Record<TrackStatus, number>; ready: number; atRisk: number } {
  const counts = Object.fromEntries(TRACK_STATUSES.map((s) => [s, 0])) as Record<TrackStatus, number>
  let targeted = 0
  for (const r of rows) {
    if (!r.targeted) continue
    targeted += 1
    counts[r.status] += 1
  }
  return { targeted, counts, ready: counts.evidence_ready, atRisk: counts.at_risk }
}
