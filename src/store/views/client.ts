// Pure view helpers for the buying owner's screens: approvals, the match schedule (advanced), the reuse plan
// and deals (brief/09-V1-PRODUCT.md sections 3.4, 13.2 and 13.5). The screens format what these return.
import type { Allocation, PlanStatus, Project, World } from '../../domain/types'
import type { TimelineFit, WishlistItem } from '../../domain/v1types'
import { GRADE_UNKNOWN } from '../../domain/reference/labels'
import { FAMILIES } from '../../domain/reference/families'
import { formatDate } from '../../domain/dates'
import { ticksOf } from '../../domain/money'
import * as f from '../../domain/format'
import { isProjectClient } from '../v1actions'
import { planItemView, type PlanItemView } from '../selectors'

/** The client's own screens open only for the project's paying client; the access check alone also admits the architect and consultant. */
export function clientCanOpen(world: World, personaId: string, projectId: string): boolean {
  return isProjectClient(world, personaId, projectId)
}

// ---------- Approvals ----------

/** "7 months of storage until the start", "No storage before the start", or null when the lot arrives late. */
export function fitStorageText(fit: TimelineFit | null): string | null {
  if (!fit || fit.storageMonths === null) return null
  if (fit.storageMonths === 0) return 'No storage before the start'
  return `${f.months(fit.storageMonths)} of storage until the start`
}

/** "Approved on 7 October 2026", "Declined on ...", or the state alone when no date is stamped. */
export function decisionText(item: WishlistItem): string {
  const word = item.status === 'approved' ? 'Approved' : item.status === 'declined' ? 'Declined' : 'Awaiting your decision'
  return item.decidedOn && (item.status === 'approved' || item.status === 'declined') ? `${word} on ${formatDate(item.decidedOn)}` : word
}

/** "1 item" or "3 items". */
export function itemCount(n: number): string {
  return `${n} ${n === 1 ? 'item' : 'items'}`
}

// ---------- Match schedule (advanced) ----------

export type MatchRow = {
  key: string
  ref: string
  /** The first row of a requirement carries the requirement cells, spanning its allocations. */
  first: boolean
  rowSpan: number
  requirementText: string
  matchedText: string
  allocation: Allocation | null
  gradeText: string
  storageText: string
  inPlan: boolean
  /** The reason a requirement has no allocation at all; null when it has one. */
  reason: string | null
}

export type MatchTable = {
  rows: MatchRow[]
  /** Reasons for requirements that are matched in part. */
  partialReasons: { ref: string; reason: string }[]
  planCount: number
  planCountText: string
}

/** "Storage 13 months" or "Storage 13 to 16 months". */
export function storageRangeText(min: number, max: number): string {
  return min === max ? `Storage ${min} months` : `Storage ${min} to ${max} months`
}

/** The matcher result as table rows, in reference order, with each allocation's plan state. Null before a run. */
export function matchTable(project: Project): MatchTable | null {
  const r = project.matchResult
  if (!r) return null
  const inPlan = (publicId: string, ref: string) => project.planItems.some((i) => i.lotPublicId === publicId && i.requirementRef === ref)
  const rows: MatchRow[] = r.results.flatMap((res) => {
    const req = project.requirements.find((q) => q.ref === res.ref)
    const requirementText = req ? `${req.designation}, ${req.lengthM.toFixed(1)} m, ${req.count} off, ${req.minGrade}` : res.ref
    const allocs: (Allocation | null)[] = res.allocations.length ? res.allocations : [null]
    return allocs.map((a, i) => ({
      key: `${res.ref}-${i}`,
      ref: res.ref,
      first: i === 0,
      rowSpan: allocs.length,
      requirementText,
      matchedText: `${res.matched} of ${res.required}`,
      allocation: a,
      gradeText: a ? (a.gradeFlag ? `Grade ${GRADE_UNKNOWN.toLowerCase()}` : 'Grade known') : '',
      storageText: a ? storageRangeText(a.storageMin, a.storageMax) : '',
      inPlan: a ? inPlan(a.publicId, res.ref) : false,
      reason: a ? null : res.reason,
    }))
  })
  const partialReasons = r.results.filter((x) => x.reason && x.matched > 0).map((x) => ({ ref: x.ref, reason: x.reason! }))
  const planCount = project.planItems.length
  return { rows, partialReasons, planCount, planCountText: `The reuse plan has ${itemCount(planCount)}.` }
}

// ---------- Reuse plan ----------

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = { planned: 'Planned', agreed_in_principle: 'Agreed in principle', awaiting_seller: 'Awaiting seller approval', confirmed: 'Confirmed', no_agreement: 'No agreement' }

export const PLAN_STATUS_TONE: Record<PlanStatus, 'teal' | 'oxide' | 'steel'> = { planned: 'steel', agreed_in_principle: 'steel', awaiting_seller: 'steel', confirmed: 'teal', no_agreement: 'oxide' }

export type PlanRow = { id: string; lotPublicId: string; title: string; requirementRef: string; pieces: number; status: PlanStatus; statusLabel: string; estimateTotal: number }

/** One row per plan item, with its own estimated total. There is no plan total. */
export function planRows(world: World, projectId: string): PlanRow[] {
  return world.projects[projectId].planItems.map((i) => {
    const v = planItemView(world, projectId, i.id)
    return { id: i.id, lotPublicId: i.lotPublicId, title: v.listing.title, requirementRef: i.requirementRef, pieces: i.pieces, status: i.status, statusLabel: PLAN_STATUS_LABELS[i.status], estimateTotal: v.estimate.total }
  })
}

export type FacilityRow = PlanItemView['comparison'][number] & { lowest: boolean; chosen: boolean; canChoose: boolean }

/** The facility comparison with the lowest estimated total and the chosen facility marked. */
export function facilityRows(v: PlanItemView): FacilityRow[] {
  const planned = v.item.status === 'planned'
  return v.comparison.map((c) => {
    const chosen = c.facilityId === v.item.pkg.facilityId
    return { ...c, lowest: v.comparison.every((x) => c.total <= x.total), chosen, canChoose: planned && !v.item.pkg.facilityFixed && !chosen }
  })
}

/** The package's storage: the deal's months once confirmed, otherwise the matcher's range. */
export function packageStorageText(v: PlanItemView): string {
  if (v.item.status === 'confirmed' && v.deal) return `Storage ${f.months(v.deal.storageMonths)}`
  if (!v.storageRange) return ''
  return v.storageRange.min === v.storageRange.max ? `Storage ${f.months(v.storageRange.min)}` : `Storage ${v.storageRange.min} to ${v.storageRange.max} months`
}

export type MandateCheck = { valid: boolean; open: number; max: number }

/** A mandate is valid when both prices are positive, on the family's price tick, and the opening bid is not above the maximum. */
export function checkMandate(open: string, max: string, family: keyof typeof FAMILIES): MandateCheck {
  const o = Number(open)
  const m = Number(max)
  const tick = FAMILIES[family].tick
  const onTick = (x: number) => Math.abs(x / tick - Math.round(x / tick)) < 1e-9
  const valid = open.trim() !== '' && max.trim() !== '' && Number.isFinite(o) && Number.isFinite(m) && o > 0 && onTick(o) && onTick(m) && ticksOf(o, tick) <= ticksOf(m, tick)
  return { valid, open: o, max: m }
}
