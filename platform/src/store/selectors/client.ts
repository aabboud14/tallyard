// The client's workspace: home, approvals and reservations. Seller details appear only on an accepted reservation.
import type { Band, WishStatus } from '../../domain/v1types'
import type { CostLine, Project } from '../../domain/types'
import { financeTotals, type FinanceLine, type FinanceTotals } from '../../domain/engines/finance'
import { FINANCE_CAVEAT } from '../../domain/reference/sustainabilityCopy'
import * as f from '../../domain/format'
import type { AppData, ExchangedContacts, ReservationEstimate, ReservationStatus, Viewer } from '../types'
import { isProjectClient, projectsOfUser, roleOfUser } from '../access'
import { estimateForListing } from '../estimate'
import { listingOf, projectWishlist } from '../lots'
import { activityFor, firstName, greeting, longDate, projectRef, RESERVATION_STATUS_LABELS, timeAgo, todayOf, type ActivityRow, type ListingCard, type ProjectRef } from './common'
import { shortlistRows, totalsOf, type ShortlistRow, type TotalsByState } from './shortlist'
import { projectHeader, type ProjectHeader } from './project'
import { projectMetrics } from './consultant'
import { goalRows, type GoalRow } from './sustainability'

export type ClientHome = {
  greeting: string
  dateText: string
  stats: { projects: number; approvalsWaiting: number; reservationsPending: number; reserved: number }
  projects: (ProjectRef & { waiting: number; approved: number; reserved: number; href: string })[]
  approvals: { projectId: string; projectName: string; itemId: string; title: string; card: ListingCard; sentOn: string | null; href: string }[]
  reservations: { id: string; projectId: string; projectName: string; title: string; status: ReservationStatus; statusLabel: string; requestedAt: string; timeAgo: string; href: string }[]
  activity: ActivityRow[]
}

function clientProjects(state: AppData, viewer: Viewer) {
  return projectsOfUser(state, viewer.userId).filter((p) => isProjectClient(state, viewer.userId, p.id))
}

/**
 * Whether the viewer sees the developer's dashboard figures: a client, or a donor building owner that is the client of
 * its own New project (audit 16 October, note C6: an owner who builds sees what a developer sees).
 */
export function buysAsClient(state: AppData, viewer: Viewer): boolean {
  const role = roleOfUser(state, viewer.userId)
  return role === 'client' || (role === 'owner' && clientProjects(state, viewer).length > 0)
}

export function clientHome(state: AppData, viewer: Viewer): ClientHome | null {
  if (!buysAsClient(state, viewer)) return null
  const user = state.users[viewer.userId]
  const projects = clientProjects(state, viewer)
  const approvals: ClientHome['approvals'] = []
  const cards = projects.map((p) => {
    const list = projectWishlist(state.world, p.id)
    const rows = list ? shortlistRows(state, viewer, list, p) : []
    for (const r of rows) if (r.status === 'sent' && r.card) approvals.push({ projectId: p.id, projectName: p.name, itemId: r.itemId, title: r.title, card: r.card, sentOn: r.sentOn, href: `/app/projects/${p.id}/approvals` })
    const reserved = Object.values(state.reservations).filter((x) => x.projectId === p.id && x.status === 'accepted').length
    return { ...projectRef(state, p), waiting: rows.filter((r) => r.status === 'sent' && r.card).length, approved: rows.filter((r) => r.status === 'approved' && r.card).length, reserved, href: `/app/projects/${p.id}` }
  })
  const ids = new Set(projects.map((p) => p.id))
  const reservations = Object.values(state.reservations)
    .filter((r) => ids.has(r.projectId) && (r.status === 'pending' || r.status === 'accepted'))
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))
    .map((r) => ({ id: r.id, projectId: r.projectId, projectName: state.world.projects[r.projectId].name, title: titleOfReservation(state, r.lotId), status: r.status, statusLabel: RESERVATION_STATUS_LABELS[r.status], requestedAt: r.requestedAt, timeAgo: timeAgo(r.requestedAt, viewer.now), href: `/app/projects/${r.projectId}/reservations` }))
  return {
    greeting: greeting(viewer.now, firstName(user.name)),
    dateText: longDate(todayOf(viewer)),
    stats: { projects: projects.length, approvalsWaiting: approvals.length, reservationsPending: reservations.filter((r) => r.status === 'pending').length, reserved: reservations.filter((r) => r.status === 'accepted').length },
    projects: cards,
    approvals,
    reservations,
    activity: activityFor(state, viewer, {}, 8),
  }
}

function titleOfReservation(state: AppData, lotId: string): string {
  const lot = state.world.lots[lotId]
  return lot ? listingOf(state.world, lot).title : ''
}

// ---------- Approvals ----------

/** The indicative package for a material: what it costs if approved, against the same new. Clients only. */
export type CostView = { total: number; costNew: number; saving: number; savingPercent: number; savingText: string; storageMonths: number; facilityName: string; testing: boolean; lines: CostLine[] }

export function costView(e: ReservationEstimate): CostView {
  return { total: e.total, costNew: e.costNew, saving: e.saving, savingPercent: e.savingPercent, savingText: f.saving(e.saving, e.savingPercent), storageMonths: e.storageMonths, facilityName: e.facilityName, testing: e.testing, lines: e.lines }
}

/** The request's estimate while a request is open or accepted, otherwise the live one at the guide price. */
function estimateOf(state: AppData, row: ShortlistRow & { card: ListingCard }, p: Project, today: string): ReservationEstimate {
  const res = row.reservation ? state.reservations[row.reservation.id] : null
  const open = !!res && (res.status === 'pending' || res.status === 'accepted')
  return open ? res!.estimate : estimateForListing(row.card.listing, p, today)
}

function line(key: string, stage: FinanceLine['stage'], e: ReservationEstimate, card: ListingCard): FinanceLine {
  return { key, stage, total: e.total, costNew: e.costNew, avoidedT: card.avoidedT, massT: card.massT }
}

export type ApprovalCard = ShortlistRow & { card: ListingCard; cost: CostView }

export type ApprovalsView = {
  header: ProjectHeader
  waiting: ApprovalCard[]
  history: ApprovalCard[]
  totals: TotalsByState
  architectName: string
  empty: boolean
  /** Totals of the packages waiting for a decision and approved. Indicative. */
  finance: { waiting: FinanceTotals; approved: FinanceTotals }
  caveat: string
}

/** The client's approvals for a project: items sent to them, and their decisions. Rows no longer visible are left out. */
export function approvalsView(state: AppData, viewer: Viewer, projectId: string): ApprovalsView | null {
  if (!isProjectClient(state, viewer.userId, projectId)) return null
  const header = projectHeader(state, viewer, projectId)!
  const p = state.world.projects[projectId]
  const today = todayOf(viewer)
  const list = projectWishlist(state.world, projectId)
  const rows = (list ? shortlistRows(state, viewer, list, p) : [])
    .filter((r): r is ShortlistRow & { card: ListingCard } => !!r.card && r.status !== 'pending')
    .map((r): ApprovalCard => ({ ...r, cost: costView(estimateOf(state, r, p, today)) }))
  const by = (s: WishStatus) => rows.filter((r) => r.status === s)
  const history = [...by('approved'), ...by('declined')].sort((a, b) => ((a.decidedOn ?? '') < (b.decidedOn ?? '') ? 1 : -1))
  const lines = (s: WishStatus, stage: FinanceLine['stage']) => by(s).map((r) => ({ key: r.publicId, stage, total: r.cost.total, costNew: r.cost.costNew, avoidedT: r.card.avoidedT, massT: r.card.massT }))
  return {
    header,
    waiting: by('sent'),
    history,
    totals: totalsOf(rows),
    architectName: header.architectName,
    empty: rows.length === 0,
    finance: { waiting: financeTotals(lines('sent', 'waiting')), approved: financeTotals(lines('approved', 'to_request')) },
    caveat: FINANCE_CAVEAT,
  }
}

// ---------- Reservations ----------

export type ReservationRow = {
  itemId: string
  publicId: string
  title: string
  card: ListingCard
  /** The request's estimate, or a live one before any request. Indicative. */
  estimate: ReservationEstimate
  estimateIsLive: boolean
  reservation: {
    id: string
    status: ReservationStatus
    statusLabel: string
    requestedAt: string
    requestedAgo: string
    decidedAt: string | null
    decisionNote: string | null
    message: string
    /** The seller's organisation and contact, once accepted. */
    exchanged: ExchangedContacts | null
  } | null
  canRequest: boolean
  canWithdraw: boolean
  /** Avoided carbon against buying new, from the public listing. Indicative. */
  carbon: { avoidedT: number | null; percentText: string | null; band: Band }
}

export type ReservationGroup = 'reserved' | 'requested' | 'to_request'

export type ReservationsView = {
  header: ProjectHeader
  rows: ReservationRow[]
  empty: boolean
  /** Cost and carbon of the reserved, requested and still to request packages; secured carbon against the project's target. */
  summary: {
    cost: Record<ReservationGroup, FinanceTotals>
    total: FinanceTotals
    carbon: Record<ReservationGroup, FinanceTotals>
    securedProjectT: number
    carbonGoal: GoalRow | null
  }
  caveat: string
}

/** Which summary group a reservation row falls in, or null. */
export function reservationGroup(row: ReservationRow): ReservationGroup | null {
  if (row.reservation?.status === 'accepted') return 'reserved'
  if (row.reservation?.status === 'pending') return 'requested'
  return row.canRequest ? 'to_request' : null
}

function reservationRows(state: AppData, viewer: Viewer, projectId: string): { header: ProjectHeader; rows: ReservationRow[]; empty: boolean } | null {
  if (!isProjectClient(state, viewer.userId, projectId)) return null
  const header = projectHeader(state, viewer, projectId)!
  const p = state.world.projects[projectId]
  const today = todayOf(viewer)
  const list = projectWishlist(state.world, projectId)
  const rows = (list ? shortlistRows(state, viewer, list, p) : []).filter((r): r is ShortlistRow & { card: ListingCard } => r.status === 'approved' && !!r.card)
  return {
    header,
    rows: rows.map((r) => {
      const res = r.reservation ? state.reservations[r.reservation.id] : null
      const open = !!res && (res.status === 'pending' || res.status === 'accepted')
      return {
        itemId: r.itemId,
        publicId: r.publicId,
        title: r.title,
        card: r.card,
        estimate: open ? res!.estimate : estimateForListing(r.card.listing, p, today),
        estimateIsLive: !open,
        reservation: res
          ? {
              id: res.id,
              status: res.status,
              statusLabel: RESERVATION_STATUS_LABELS[res.status],
              requestedAt: res.requestedAt,
              requestedAgo: timeAgo(res.requestedAt, viewer.now),
              decidedAt: res.decidedAt,
              decisionNote: res.decisionNote,
              message: res.message,
              exchanged: res.status === 'accepted' ? res.exchanged : null,
            }
          : null,
        canRequest: !open,
        canWithdraw: res?.status === 'pending',
        carbon: { avoidedT: r.card.avoidedT, percentText: r.card.listing.carbon ? `${f.percent(r.card.listing.carbon.percent)} less than new` : null, band: r.card.band },
      }
    }),
    empty: rows.length === 0,
  }
}

export function reservationsView(state: AppData, viewer: Viewer, projectId: string): ReservationsView | null {
  const base = reservationRows(state, viewer, projectId)
  if (!base) return null
  const groups: ReservationGroup[] = ['reserved', 'requested', 'to_request']
  const lines: (FinanceLine & { group: ReservationGroup })[] = []
  for (const r of base.rows) {
    const g = reservationGroup(r)
    if (!g) continue
    lines.push({ ...line(r.publicId, g === 'to_request' ? 'to_request' : g, r.estimate, r.card), group: g })
  }
  const byGroup = Object.fromEntries(groups.map((g) => [g, financeTotals(lines.filter((l) => l.group === g))])) as Record<ReservationGroup, FinanceTotals>
  const m = projectMetrics(state, viewer, projectId)!
  return {
    ...base,
    summary: { cost: byGroup, total: financeTotals(lines), carbon: byGroup, securedProjectT: m.avoidedSecuredT, carbonGoal: goalRows(state, viewer, projectId)?.find((g) => g.id === 'avoided_carbon') ?? null },
    caveat: FINANCE_CAVEAT,
  }
}
