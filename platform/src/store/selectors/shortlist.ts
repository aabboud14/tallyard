// The architect's shortlist board, Saved, and the specification. Rows read the public listing only; a row whose
// lot the project can no longer see, or that is gone, shows its title and why, with no figures.
import type { Lot, Project } from '../../domain/types'
import type { WishStatus, WishTotals, Wishlist, WishlistItem, SpecSheet } from '../../domain/v1types'
import { MOVE_REASONS, wishlistTotals } from '../../domain/engines/wishlist'
import { specSheet } from '../../domain/engines/specSheet'
import { PROJECT_TYPE_LABELS } from '../../domain/reference/labels'
import type { AppData, ReservationStatus, Viewer } from '../types'
import { isProjectArchitect, projectSide, projectsOfUser, roleOfUser } from '../access'
import { acceptedReservation, generalWishlist, isLotAvailable, listingOf, lotByPublicId, projectCanSee, projectWishlist, saveBlock } from '../lots'
import { listingCard, projectRef, RESERVATION_STATUS_LABELS, SHORTLIST_STATUS_LABELS, todayOf, type ListingCard, type ProjectRef } from './common'

export type RowState = 'ok' | 'not_shared' | 'not_available'

export type MoveTarget = { projectId: string | null; label: string; allowed: boolean; reason: string | null }

export type ShortlistRow = {
  itemId: string
  publicId: string
  title: string
  status: WishStatus
  statusLabel: string
  state: RowState
  stateText: string | null
  /** Null unless the row is ok: a row the project can no longer see shows no figures. */
  card: ListingCard | null
  note: string
  addedOn: string
  sentOn: string | null
  sentMessage: string | null
  decidedOn: string | null
  decisionNote: string | null
  reservation: { id: string; status: ReservationStatus; statusLabel: string } | null
  canRemove: boolean
  canMove: boolean
  canEditNote: boolean
  canReopen: boolean
  /** Can be ticked for "Send to client". */
  canSelect: boolean
  moveTargets: MoveTarget[]
}

export type TotalsByState = Record<WishStatus | 'all', WishTotals>

const STATE_TEXT: Record<Exclude<RowState, 'ok'>, string> = { not_shared: 'No longer shared with this project', not_available: 'No longer available' }

function rowState(state: AppData, lot: Lot | null, project: Project | null): RowState {
  if (!lot) return 'not_available'
  const visible = project ? projectCanSee(state.world, project, lot) : lot.visibility === 'open'
  if (!visible) return 'not_shared'
  if (!isLotAvailable(state, lot, project?.id ?? null)) return 'not_available'
  return 'ok'
}

function latestReservation(state: AppData, projectId: string, lotId: string) {
  const rs = Object.values(state.reservations)
    .filter((r) => r.projectId === projectId && r.lotId === lotId)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))
  return rs[0] ?? null
}

function moveTargetsFor(state: AppData, viewer: Viewer, list: Wishlist, item: WishlistItem, lot: Lot | null, canMove: boolean): MoveTarget[] {
  const targets: { projectId: string | null; label: string; list: Wishlist | null }[] = projectsOfUser(state, viewer.userId)
    .filter((p) => isProjectArchitect(state, viewer.userId, p.id))
    .map((p) => ({ projectId: p.id, label: p.name, list: projectWishlist(state.world, p.id) }))
  targets.push({ projectId: null, label: 'Saved', list: generalWishlist(state.world, list.orgId) })
  return targets
    .filter((t) => t.projectId !== list.projectId)
    .map((t) => {
      let reason: string | null
      if (!canMove) reason = item.status === 'approved' ? MOVE_REASONS.approved : item.status === 'sent' ? MOVE_REASONS.sent : 'Shared in confidence with this project. It cannot be moved.'
      else if (t.list?.items.some((x) => x.publicId === item.publicId)) reason = MOVE_REASONS.present
      else reason = saveBlock(state, lot, t.projectId)
      return { projectId: t.projectId, label: t.label, allowed: reason === null, reason }
    })
}

/** The rows of a list as the viewer sees them. Only the practice's own architects get controls. */
export function shortlistRows(state: AppData, viewer: Viewer, list: Wishlist, project: Project | null): ShortlistRow[] {
  const today = todayOf(viewer)
  const owns = roleOfUser(state, viewer.userId) === 'architect' && state.users[viewer.userId]?.orgId === list.orgId
  return list.items.map((item) => {
    const lot = lotByPublicId(state.world, item.publicId)
    const st = rowState(state, lot, project)
    const title = lot ? listingOf(state.world, lot).title : item.publicId
    const card = st === 'ok' && lot ? listingCard(state, listingOf(state.world, lot), project, today) : null
    const res = project && lot ? latestReservation(state, project.id, lot.id) : null
    const canMove = owns && (item.status === 'pending' || item.status === 'declined') && lot?.visibility !== 'matched_only'
    return {
      itemId: item.id,
      publicId: item.publicId,
      title,
      status: item.status,
      statusLabel: SHORTLIST_STATUS_LABELS[item.status],
      state: st,
      stateText: st === 'ok' ? null : STATE_TEXT[st],
      card,
      note: item.note,
      addedOn: item.addedOn,
      sentOn: item.sentOn ?? null,
      sentMessage: item.sentMessage ?? null,
      decidedOn: item.decidedOn,
      decisionNote: item.decisionNote,
      reservation: res ? { id: res.id, status: res.status, statusLabel: RESERVATION_STATUS_LABELS[res.status] } : null,
      canRemove: owns && item.status !== 'approved',
      canMove,
      canEditNote: owns && (item.status === 'pending' || item.status === 'declined'),
      canReopen: owns && item.status === 'declined',
      canSelect: owns && item.status === 'pending' && st === 'ok',
      moveTargets: owns ? moveTargetsFor(state, viewer, list, item, lot, canMove) : [],
    }
  })
}

/** Counts, mass and avoided carbon by state, from rows that are ok only. */
export function totalsOf(rows: ShortlistRow[]): TotalsByState {
  const ok = new Map(rows.filter((r) => r.card).map((r) => [r.publicId, r.card!.listing]))
  return wishlistTotals(
    rows.map((r) => ({ id: r.itemId, publicId: r.publicId, addedOn: r.addedOn, addedByPersonaId: '', note: r.note, status: r.status, decidedOn: r.decidedOn, decisionNote: r.decisionNote })),
    (publicId) => ok.get(publicId) ?? null,
  )
}

export const BOARD_COLUMNS: WishStatus[] = ['pending', 'sent', 'approved', 'declined']

export type ShortlistBoard = {
  project: ProjectRef
  columns: { status: WishStatus; label: string; rows: ShortlistRow[] }[]
  rows: ShortlistRow[]
  totals: TotalsByState
  /** Items that can go to the client now. */
  sendableIds: string[]
  clientName: string
  empty: boolean
}

/** The project's shortlist as a board, for its architect; null for anyone else. */
export function shortlistBoard(state: AppData, viewer: Viewer, projectId: string): ShortlistBoard | null {
  if (!isProjectArchitect(state, viewer.userId, projectId)) return null
  const p = state.world.projects[projectId]
  const list = projectWishlist(state.world, projectId)
  const rows = list ? shortlistRows(state, viewer, list, p) : []
  return {
    project: projectRef(state, p),
    columns: BOARD_COLUMNS.map((status) => ({ status, label: SHORTLIST_STATUS_LABELS[status], rows: rows.filter((r) => r.status === status) })),
    rows,
    totals: totalsOf(rows),
    sendableIds: rows.filter((r) => r.canSelect).map((r) => r.itemId),
    clientName: state.world.orgs[p.clientOrgId]?.name ?? '',
    empty: rows.length === 0,
  }
}

export type SavedView = { rows: ShortlistRow[]; totals: TotalsByState; projects: ProjectRef[]; empty: boolean }

/** The practice's Saved list, for its architects; null for anyone else. */
export function savedView(state: AppData, viewer: Viewer): SavedView | null {
  if (roleOfUser(state, viewer.userId) !== 'architect') return null
  const orgId = state.users[viewer.userId].orgId
  const list = generalWishlist(state.world, orgId)
  const rows = list ? shortlistRows(state, viewer, list, null) : []
  const projects = projectsOfUser(state, viewer.userId).filter((p) => isProjectArchitect(state, viewer.userId, p.id))
  return { rows, totals: totalsOf(rows), projects: projects.map((p) => projectRef(state, p)), empty: rows.length === 0 }
}

// ---------- Specification ----------

export type SpecMode = 'approved' | 'draft'

export type SpecificationView = {
  project: ProjectRef
  mode: SpecMode
  sheet: SpecSheet
  headerNote: string
  clauses: { publicId: string; title: string; status: WishStatus; statusLabel: string; rows: SpecSheet['blocks'][number]['rows']; note: string; reserved: boolean }[]
  canEdit: boolean
  counts: { approved: number; draft: number }
  fileName: string
  empty: boolean
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The specification schedule: approved items, or a draft of every item not declined. Rows the project can no
 * longer see are left out. The architect edits the notes; the client reads.
 */
export function specificationView(state: AppData, viewer: Viewer, projectId: string, mode: SpecMode): SpecificationView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (side !== 'architect' && side !== 'client') return null
  const p = state.world.projects[projectId]
  const list = projectWishlist(state.world, projectId)
  const rows = (list ? shortlistRows(state, viewer, list, p) : []).filter((r) => r.card)
  const pick = (m: SpecMode) => rows.filter((r) => (m === 'approved' ? r.status === 'approved' : r.status !== 'declined'))
  const chosen = pick(mode)
  const sheet = specSheet(
    { name: p.name, typeLabel: PROJECT_TYPE_LABELS[p.projectType], startDate: p.startDate },
    chosen.map((r) => ({ listing: r.card!.listing, fit: r.card!.fit, status: r.status })),
  )
  const spec = state.specs[projectId] ?? { header: '', clauseNotes: {}, updatedAt: null }
  return {
    project: projectRef(state, p),
    mode,
    sheet,
    headerNote: spec.header,
    clauses: sheet.blocks.map((b) => {
      const lot = lotByPublicId(state.world, b.publicId)
      const held = lot ? acceptedReservation(state, lot.id) : null
      return { publicId: b.publicId, title: b.title, status: b.status, statusLabel: SHORTLIST_STATUS_LABELS[b.status], rows: b.rows, note: spec.clauseNotes[b.publicId] ?? '', reserved: held?.projectId === projectId }
    }),
    canEdit: side === 'architect',
    counts: { approved: pick('approved').length, draft: pick('draft').length },
    fileName: `${slug(p.name)}-specification-${todayOf(viewer)}.xlsx`,
    empty: sheet.blocks.length === 0,
  }
}
