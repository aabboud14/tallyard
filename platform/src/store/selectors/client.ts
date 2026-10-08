// The client's workspace: home, approvals and reservations. Seller details appear only on an accepted reservation.
import type { WishStatus } from '../../domain/v1types'
import type { AppData, ExchangedContacts, ReservationEstimate, ReservationStatus, Viewer } from '../types'
import { isProjectClient, projectsOfUser, roleOfUser } from '../access'
import { estimateForListing } from '../estimate'
import { listingOf, projectWishlist } from '../lots'
import { activityFor, firstName, greeting, longDate, projectRef, RESERVATION_STATUS_LABELS, timeAgo, todayOf, type ActivityRow, type ListingCard, type ProjectRef } from './common'
import { shortlistRows, totalsOf, type ShortlistRow, type TotalsByState } from './shortlist'
import { projectHeader, type ProjectHeader } from './project'

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

export function clientHome(state: AppData, viewer: Viewer): ClientHome | null {
  if (roleOfUser(state, viewer.userId) !== 'client') return null
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

export type ApprovalCard = ShortlistRow & { card: ListingCard }

export type ApprovalsView = {
  header: ProjectHeader
  waiting: ApprovalCard[]
  history: ApprovalCard[]
  totals: TotalsByState
  architectName: string
  empty: boolean
}

/** The client's approvals for a project: items sent to them, and their decisions. Rows no longer visible are left out. */
export function approvalsView(state: AppData, viewer: Viewer, projectId: string): ApprovalsView | null {
  if (!isProjectClient(state, viewer.userId, projectId)) return null
  const header = projectHeader(state, viewer, projectId)!
  const p = state.world.projects[projectId]
  const list = projectWishlist(state.world, projectId)
  const rows = (list ? shortlistRows(state, viewer, list, p) : []).filter((r): r is ApprovalCard => !!r.card && r.status !== 'pending')
  const by = (s: WishStatus) => rows.filter((r) => r.status === s)
  const history = [...by('approved'), ...by('declined')].sort((a, b) => ((a.decidedOn ?? '') < (b.decidedOn ?? '') ? 1 : -1))
  return { header, waiting: by('sent'), history, totals: totalsOf(rows), architectName: header.architectName, empty: rows.length === 0 }
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
}

export type ReservationsView = { header: ProjectHeader; rows: ReservationRow[]; empty: boolean }

export function reservationsView(state: AppData, viewer: Viewer, projectId: string): ReservationsView | null {
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
      }
    }),
    empty: rows.length === 0,
  }
}
