// The consultant's workspace: home, project compliance (reused content by value and avoided carbon), and waste.
import type { FamilyId, WasteBill, WasteEngagement } from '../../domain/types'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { BILL_LINE_NAMES } from '../../domain/seed/world'
import { contentByValue, type ContentResult } from '../../domain/engines/content'
import { wasteRates, reuseCarbonBenefit, unresolvedNotice, type WasteRates, type ReuseCarbonRow } from '../../domain/engines/waste'
import { confidenceCounts, sumOfRows } from '../../domain/engines/billImport'
import { DESTINATIONS, STREAMS } from '../../domain/reference/wasteCodes'
import { LABELS } from '../../domain/reference/labels'
import type { AppData, Viewer } from '../types'
import { canOpenEngagement, isProjectConsultant, projectSide, projectsOfUser, roleOfUser } from '../access'
import { listingOf, projectWishlist } from '../lots'
import { quantityText } from '../../domain/engines/specSheet'
import { activityFor, firstName, greeting, longDate, projectRef, todayOf, type ActivityRow, type ProjectRef } from './common'
import { projectHeader, type ProjectHeader } from './project'
import { shortlistRows, totalsOf } from './shortlist'

export type ReusedItem = { publicId: string; description: string; quantityLabel: string; massT: number; status: 'Confirmed' | 'Reserved' | 'Approved'; date: string | null; avoidedT: number; source: 'earlier deal' | 'reservation' | 'approval' }

export type ComplianceView = {
  header: ProjectHeader
  hasBill: boolean
  /** Content by value with what is confirmed or reserved. */
  secured: ContentResult
  /** And with the approved materials not yet reserved. */
  withApproved: ContentResult
  aim: number
  targets: { contentByValue: number; avoidedCarbonT: number }
  avoidedT: number
  reclaimedMassT: number
  reusedItems: ReusedItem[]
  billLines: { id: string; name: string; element: string; layer: string; massT: number; valueGbp: number; recycledShare: number }[]
  caveats: string[]
  fileName: string
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The project's compliance figures for its consultant; null for anyone else. Indicative, from public listings. */
export function complianceView(state: AppData, viewer: Viewer, projectId: string): ComplianceView | null {
  if (!isProjectConsultant(state, viewer.userId, projectId)) return null
  const header = projectHeader(state, viewer, projectId)!
  const p = state.world.projects[projectId]
  const secured: Partial<Record<FamilyId, number>> = {}
  const add = (into: Partial<Record<FamilyId, number>>, family: FamilyId, q: number) => {
    into[family] = (into[family] ?? 0) + q
  }
  const items: ReusedItem[] = []
  let avoidedT = 0
  let reclaimedMassT = 0
  for (const d of p.seededDeals) {
    add(secured, d.family, d.quantityUnits)
    items.push({ publicId: d.publicId, description: d.description, quantityLabel: d.quantityLabel, massT: d.massT, status: 'Confirmed', date: d.confirmedOn, avoidedT: d.avoidedT, source: 'earlier deal' })
    avoidedT += d.avoidedT
    reclaimedMassT += d.massT
  }
  for (const r of Object.values(state.reservations)) {
    if (r.projectId !== projectId || r.status !== 'accepted') continue
    const l = listingOf(state.world, state.world.lots[r.lotId])
    add(secured, l.family, l.quantity.value)
    items.push({ publicId: l.publicId, description: l.title, quantityLabel: quantityText(l), massT: l.massT, status: 'Reserved', date: r.decidedAt?.slice(0, 10) ?? null, avoidedT: l.carbon?.avoidedT ?? 0, source: 'reservation' })
    avoidedT += l.carbon?.avoidedT ?? 0
    reclaimedMassT += l.massT
  }
  const withApproved: Partial<Record<FamilyId, number>> = { ...secured }
  const list = projectWishlist(state.world, projectId)
  const reservedIds = new Set(items.map((i) => i.publicId))
  for (const row of list ? shortlistRows(state, viewer, list, p) : []) {
    if (row.status !== 'approved' || !row.card || reservedIds.has(row.publicId)) continue
    add(withApproved, row.card.family, row.card.listing.quantity.value)
    items.push({ publicId: row.publicId, description: row.title, quantityLabel: row.card.quantityText, massT: row.card.massT, status: 'Approved', date: row.decidedOn, avoidedT: row.card.avoidedT ?? 0, source: 'approval' })
  }
  return {
    header,
    hasBill: p.billOfMaterials.length > 0,
    secured: contentByValue(p.billOfMaterials, secured),
    withApproved: contentByValue(p.billOfMaterials, withApproved),
    aim: A.contentAim,
    targets: p.targets,
    avoidedT,
    reclaimedMassT,
    reusedItems: items,
    billLines: p.billOfMaterials.map((b) => ({ id: b.id, name: BILL_LINE_NAMES[b.id] ?? b.element, element: b.element, layer: b.layer, massT: b.massT, valueGbp: b.valueGbp, recycledShare: b.recycledShare })),
    caveats: [LABELS.L11, LABELS.L15, LABELS.L16, LABELS.L20],
    fileName: `${slug(p.name)}-compliance-${todayOf(viewer)}.xlsx`,
  }
}

export type ConsultantProject = ProjectRef & { avoidedApprovedT: number; avoidedShortlistedT: number; contentPercent: number | null; href: string }

export type ConsultantHome = {
  greeting: string
  dateText: string
  stats: { projects: number; avoidedApprovedT: number; avoidedShortlistedT: number; engagements: number }
  projects: ConsultantProject[]
  engagements: { id: string; name: string; period: string; hasBill: boolean; href: string }[]
  activity: ActivityRow[]
}

export function consultantHome(state: AppData, viewer: Viewer): ConsultantHome | null {
  if (roleOfUser(state, viewer.userId) !== 'consultant') return null
  const user = state.users[viewer.userId]
  const projects = projectsOfUser(state, viewer.userId).filter((p) => projectSide(state, viewer.userId, p.id) === 'consultant')
  const cards = projects.map((p) => {
    const list = projectWishlist(state.world, p.id)
    const totals = totalsOf(list ? shortlistRows(state, viewer, list, p) : [])
    const c = complianceView(state, viewer, p.id)
    return { ...projectRef(state, p), avoidedApprovedT: totals.approved.avoidedT, avoidedShortlistedT: totals.all.avoidedT - totals.declined.avoidedT, contentPercent: c && c.hasBill ? c.secured.percent : null, href: `/app/projects/${p.id}` }
  })
  const engagements = engagementsOf(state, viewer).map((e) => ({ id: e.id, name: e.name, period: e.period, hasBill: e.bill !== null, href: `/app/engagements/${e.id}/waste` }))
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(todayOf(viewer)),
    stats: { projects: cards.length, avoidedApprovedT: cards.reduce((s, c) => s + c.avoidedApprovedT, 0), avoidedShortlistedT: cards.reduce((s, c) => s + c.avoidedShortlistedT, 0), engagements: engagements.length },
    projects: cards,
    engagements,
    activity: activityFor(state, viewer, {}, 8),
  }
}

export function engagementsOf(state: AppData, viewer: Viewer): WasteEngagement[] {
  return Object.values(state.world.engagements).filter((e) => canOpenEngagement(state, viewer.userId, e.id))
}

export type WasteView = {
  engagement: { id: string; name: string; buildingName: string; ownerName: string; period: string; giaM2: number }
  bill: WasteBill | null
  rates: WasteRates | null
  benefit: { rows: ReuseCarbonRow[]; total: number } | null
  counts: { high: number; medium: number; low: number; edited: number } | null
  sum: number | null
  unresolvedText: string | null
  streams: { id: string; label: string }[]
  destinations: { id: string; label: string }[]
  diversionTarget: number
  caveats: string[]
  fileName: string
}

export function wasteView(state: AppData, viewer: Viewer, engagementId: string): WasteView | null {
  if (!canOpenEngagement(state, viewer.userId, engagementId)) return null
  const e = state.world.engagements[engagementId]
  const bill = e.bill
  const rates = bill ? wasteRates(bill.rows, e.giaM2) : null
  return {
    engagement: { id: e.id, name: e.name, buildingName: e.buildingName, ownerName: state.world.orgs[e.ownerOrgId]?.name ?? '', period: e.period, giaM2: e.giaM2 },
    bill,
    rates,
    benefit: bill ? reuseCarbonBenefit(bill.rows, A) : null,
    counts: bill ? confidenceCounts(bill) : null,
    sum: bill ? sumOfRows(bill) : null,
    unresolvedText: rates ? unresolvedNotice(rates.unresolved) : null,
    streams: STREAMS.map((s) => ({ id: s.id, label: s.label })),
    destinations: DESTINATIONS.map((d) => ({ id: d.id, label: d.label })),
    diversionTarget: A.diversionTarget,
    caveats: [LABELS.L13, LABELS.L18, LABELS.L20],
    fileName: `${slug(e.name)}-waste-and-reuse-${todayOf(viewer)}.xlsx`,
  }
}
