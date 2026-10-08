// View helpers for the client, owner, surveyor and consultant screens that the shared selectors do not give:
// score breakdowns, the disclosure meter, inventory filters, the blind line a seller sees, and the workbook model.
import type { InventoryItem, Visibility } from '../../domain/types'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { LABELS } from '../../domain/reference/labels'
import { CERTIFICATION_ROWS, RIBA_STAGES } from '../../domain/reference/policy'
import type { Disclosure } from '../../domain/engines/disclosure'
import type { PriorityRow } from '../../domain/engines/priority'
import { blindBuyerText, toBlindBuyer } from '../../domain/privacy/blindBuyer'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import { buildingSide, isProjectClient } from '../access'
import { lotOfItem } from '../lots'
import { complianceView, type ReusedItem } from './consultant'
import type { InventoryRow } from './owner'

// ---------- Priorities ----------

export type ScorePart = { key: 'netValue' | 'carbon' | 'demand' | 'ease'; label: string; points: number; max: number; text: string }

const PART_LABELS: Record<ScorePart['key'], string> = { netValue: 'Net value', carbon: 'Avoided carbon', demand: 'Demand', ease: 'Ease of recovery' }

/** The four parts of a priority score, each with the most it can contribute, in points of 100. */
export function scoreParts(row: Pick<PriorityRow, 'parts'>): ScorePart[] {
  const w = A.priorityWeights
  return (Object.keys(PART_LABELS) as ScorePart['key'][]).map((key) => ({ key, label: PART_LABELS[key], points: row.parts[key], max: 100 * w[key], text: `${f.score(row.parts[key])} of ${f.number(100 * w[key])}` }))
}

/** How the score is weighted, as one line per part. */
export function scoreWeights(): { label: string; max: number }[] {
  const w = A.priorityWeights
  return (Object.keys(PART_LABELS) as ScorePart['key'][]).map((key) => ({ label: PART_LABELS[key], max: 100 * w[key] }))
}

// ---------- Disclosure ----------

export type DisclosureMeter = { score: number; max: number; mediumFrom: number; highFrom: number; band: Disclosure['band']; parts: { label: string; points: number }[] }

/** The disclosure score on its scale: the most it can reach and where the bands start. */
export function disclosureMeter(d: Disclosure): DisclosureMeter {
  const c = A.disclosure
  const max = Math.max(c.location.region, c.location.local_authority) + Math.max(c.timing.quarter, c.timing.month) + Math.max(c.openLots.few, c.openLots.several, c.openLots.many) + c.frame + c.photos
  return {
    score: d.score,
    max,
    mediumFrom: c.mediumFrom,
    highFrom: c.highFrom,
    band: d.band,
    parts: [
      { label: 'Location', points: d.terms.location },
      { label: 'Timing', points: d.terms.timing },
      { label: 'Open lots', points: d.terms.openLots },
      { label: 'Frame pattern', points: d.terms.frame },
      { label: 'Public photos', points: d.terms.photos },
    ],
  }
}

// ---------- Inventory ----------

export type InventoryFilter = { q: string; visibility: 'all' | Visibility | 'reserved' }

/** Rows matching the search (tag, title, family, location in the title) and the visibility tab, with tab counts. */
export function filterInventory<R extends Pick<InventoryRow, 'tag' | 'title' | 'familyLabel' | 'typologyLabel' | 'visibility' | 'reserved'>>(rows: R[], filter: InventoryFilter): { rows: R[]; counts: Record<InventoryFilter['visibility'], number> } {
  const words = filter.q.toLowerCase().split(/\s+/).filter(Boolean)
  const matches = (r: R) => {
    const hay = `${r.tag} ${r.title} ${r.familyLabel} ${r.typologyLabel}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  }
  const searched = rows.filter(matches)
  const counts = { all: searched.length, private: 0, matched_only: 0, open: 0, reserved: 0 }
  for (const r of searched) {
    counts[r.visibility]++
    if (r.reserved) counts.reserved++
  }
  const shown = searched.filter((r) => filter.visibility === 'all' || (filter.visibility === 'reserved' ? r.reserved : r.visibility === filter.visibility))
  return { rows: shown, counts }
}

// ---------- Reservations ----------

/** The line the seller sees for the client's own project before accepting: organisation type, project, region, need-by. */
export function sellerSeesLine(state: AppData, viewer: Viewer, projectId: string): string | null {
  if (!isProjectClient(state, viewer.userId, projectId)) return null
  return blindBuyerText(toBlindBuyer(state.world.projects[projectId]))
}

// ---------- Compliance workbook ----------

/** The caveat on every workbook and report: honest about the data and the factors, without demo wording. */
export const OUTPUT_CAVEAT: string = LABELS.L20

export type BomRow = { name: string; element: string; layer: string; massT: number; intensity: number; valueGbp: number; recycledShare: number; reusedPercent: number; recycledPercent: number; reusedAndRecycledValue: number }

export type ComplianceWorkbookModel = {
  title: string
  projectName: string
  clientName: string
  stageText: string
  giaM2: number
  status: string
  policy: string
  securedPercent: number
  withApprovedPercent: number
  withoutReuse: number
  aimText: string
  avoidedT: number
  reclaimedMassT: number
  bom: BomRow[]
  bomTotals: { massT: number; intensity: number; valueGbp: number; percent: number; reusedAndRecycledValue: number }
  items: ReusedItem[]
  itemTotals: { securedMassT: number; securedAvoidedT: number; approvedAvoidedT: number }
  certification: { requirement: string; provides: string; note: string }[]
  methods: string[]
  caveat: string
  fileName: string
}

/** Everything the compliance workbook holds, worked out here so the writer only lays it out. Null for anyone but the consultant. */
export function complianceWorkbookModel(state: AppData, viewer: Viewer, projectId: string): ComplianceWorkbookModel | null {
  const c = complianceView(state, viewer, projectId)
  if (!c) return null
  const p = state.world.projects[projectId]
  const gia = p.giaM2
  const intensity = (massT: number) => (gia > 0 ? (massT * 1000) / gia : 0)
  const bom: BomRow[] = c.secured.lines.map((l, i) => ({
    name: c.billLines[i]?.name ?? l.line.element,
    element: l.line.element,
    layer: l.line.layer,
    massT: l.line.massT,
    intensity: intensity(l.line.massT),
    valueGbp: l.line.valueGbp,
    recycledShare: l.line.recycledShare,
    reusedPercent: l.reusedPercent,
    recycledPercent: l.recycledPercent,
    reusedAndRecycledValue: l.reusedAndRecycledValue,
  }))
  const totalMass = bom.reduce((s, r) => s + r.massT, 0)
  const secured = c.reusedItems.filter((i) => i.status !== 'Approved')
  return {
    title: `${p.name} compliance`,
    projectName: p.name,
    clientName: c.header.clientName,
    stageText: `RIBA Stage ${p.ribaStage}, ${RIBA_STAGES[p.ribaStage] ?? ''}`,
    giaM2: gia,
    status: LABELS.L17,
    policy: LABELS.L16,
    securedPercent: c.secured.percent,
    withApprovedPercent: c.withApproved.percent,
    withoutReuse: c.secured.withoutReuse,
    aimText: `At least ${f.number(c.aim * 100)}% reused or recycled content by value (Circular Economy Statement guidance, 2022)`,
    avoidedT: c.avoidedT,
    reclaimedMassT: c.reclaimedMassT,
    bom,
    bomTotals: { massT: totalMass, intensity: intensity(totalMass), valueGbp: c.secured.totalValue, percent: c.secured.percent, reusedAndRecycledValue: bom.reduce((s, r) => s + r.reusedAndRecycledValue, 0) },
    items: c.reusedItems,
    itemTotals: { securedMassT: secured.reduce((s, i) => s + i.massT, 0), securedAvoidedT: secured.reduce((s, i) => s + i.avoidedT, 0), approvedAvoidedT: c.reusedItems.filter((i) => i.status === 'Approved').reduce((s, i) => s + i.avoidedT, 0) },
    certification: CERTIFICATION_ROWS.filter((r) => r.workbook === 'compliance').map((r) => ({ requirement: r.requirement, provides: r.provides, note: LABELS.L19 })),
    methods: [LABELS.L15, LABELS.L11],
    caveat: OUTPUT_CAVEAT,
    fileName: c.fileName,
  }
}

/** The content chart's scale: the aim with room above it, so the secured figure and the aim both sit inside. */
export function contentScale(secured: number, withApproved: number, aim: number): number {
  const top = Math.max(secured, withApproved, aim)
  return Math.max(0.1, Math.ceil(top * 1.25 * 20) / 20)
}

/** How many approved materials are still to request, with the seller, and reserved. */
export function reservationCounts(rows: { canRequest: boolean; reservation: { status: string } | null }[]): { open: number; pending: number; reserved: number } {
  return { open: rows.filter((r) => r.canRequest).length, pending: rows.filter((r) => r.reservation?.status === 'pending').length, reserved: rows.filter((r) => r.reservation?.status === 'accepted').length }
}

/** "Requested yesterday", "Requested 2 hours ago", "Requested on 1 Oct 2026". */
export function whenText(verb: string, ago: string): string {
  if (ago === 'Yesterday') return `${verb} yesterday`
  if (/ago$|^just now$/.test(ago)) return `${verb} ${ago}`
  return `${verb} on ${ago}`
}

// ---------- Inventory pictures ----------

export type ItemVisual = { spec: InventoryItem['spec']; publicId: string; photo: { id: string; src: string | null } | null }

/** The first photo (or what the illustration needs) for each item, for the people who own or survey the building. */
export function inventoryVisuals(state: AppData, viewer: Viewer, buildingId: string): Record<string, ItemVisual> | null {
  if (!buildingSide(state, viewer.userId, buildingId)) return null
  const out: Record<string, ItemVisual> = {}
  for (const item of Object.values(state.world.items)) {
    if (item.buildingId !== buildingId) continue
    const lot = lotOfItem(state.world, item.id)
    const p = item.photos[0]
    out[item.id] = { spec: item.spec, publicId: lot?.publicId ?? item.id, photo: p ? { id: p.id, src: p.src } : null }
  }
  return out
}

/** The largest value in a set of lines, for the scale of a bar chart; at least 1 so an empty chart still draws. */
export function barScale(values: number[]): number {
  return Math.max(1, ...values)
}

export type ContentChart = { scale: number; securedAt: number; approvedAt: number; aimAt: number; aimLabel: string; scaleLabel: string }

/** Positions on the content chart, from 0 to 1, with its labels. */
export function contentChart(secured: number, withApproved: number, aim: number): ContentChart {
  const scale = contentScale(secured, withApproved, aim)
  const at = (x: number) => Math.min(1, Math.max(0, x / scale))
  return { scale, securedAt: at(secured), approvedAt: at(withApproved), aimAt: at(aim), aimLabel: aimLabel(aim), scaleLabel: `${f.number(scale * 100)}%` }
}

/** "At least 95%" from a ratio. */
export function aimLabel(ratio: number): string {
  return `At least ${f.number(ratio * 100)}%`
}

/** Whole pounds with a leading minus for a loss: -£26,220. */
export function signedMoneyWhole(x: number): string {
  return x < 0 ? `-${f.moneyWhole(-x)}` : f.moneyWhole(x)
}

/** Segments laid end to end: each value with where it starts, for a stacked bar. */
export function stacked(values: number[]): { at: number; size: number }[] {
  const out: { at: number; size: number }[] = []
  let at = 0
  for (const size of values) {
    out.push({ at, size })
    at += size
  }
  return out
}
