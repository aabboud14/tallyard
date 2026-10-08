// Reservations: the client requests an approved material; the seller sees a blind request and accepts or declines.
// Before acceptance neither side learns who the other is. After acceptance the client and the seller see each
// other's organisation and contact; the architect and the consultant never see the seller.
import { blindBuyerText, toBlindBuyer } from '../../domain/privacy/blindBuyer'
import type { ActionResult, Actor, AppData, ExchangedContacts, Reservation } from '../types'
import { ERRORS, isBuildingOwner, isProjectClient, usersOfOrg } from '../access'
import { mint } from '../ids'
import { acceptedReservation, isLotAvailable, listingOf, lotByPublicId, ownerOrgOfLot, projectCanSee, projectWishlist, reservationsForLot } from '../lots'
import { estimateForLot } from '../estimate'
import { log, notify } from '../notifications'
import { acting, clean, fail, ok } from './common'

export const RESERVATION_ERRORS = {
  noItem: 'That item is not on this project.',
  notApproved: 'Only an approved material can be reserved.',
  notShared: 'No longer shared with this project.',
  notAvailable: 'No longer available.',
  pending: 'A request for this material is already with the seller.',
  held: 'Already reserved for this project.',
  noReservation: 'That request could not be found.',
  notPending: 'This request has already been decided.',
  reservedElsewhere: 'Reserved for another buyer.',
} as const

/** Kept on a request declined because the seller accepted another one. */
export const RESERVED_ELSEWHERE_NOTE = 'Reserved for another buyer.'

/** The client asks the seller to reserve an approved material for the project. Returns the reservation ID. */
export function requestReservation(state: AppData, actor: Actor, projectId: string, wishItemId: string, message: string): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectClient(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const item = projectWishlist(state.world, projectId)?.items.find((x) => x.id === wishItemId)
  if (!item) return fail(state, RESERVATION_ERRORS.noItem)
  if (item.status !== 'approved') return fail(state, RESERVATION_ERRORS.notApproved)
  const lot = lotByPublicId(state.world, item.publicId)
  if (!lot || !projectCanSee(state.world, p, lot)) return fail(state, RESERVATION_ERRORS.notShared)
  const mine = reservationsForLot(state, lot.id).filter((r) => r.projectId === projectId)
  if (mine.some((r) => r.status === 'accepted')) return fail(state, RESERVATION_ERRORS.held)
  if (mine.some((r) => r.status === 'pending')) return fail(state, RESERVATION_ERRORS.pending)
  if (!isLotAvailable(state, lot, projectId)) return fail(state, RESERVATION_ERRORS.notAvailable)

  const listing = listingOf(state.world, lot)
  const m = mint(state, 'res', (id) => !!state.reservations[id])
  const reservation: Reservation = {
    id: m.id,
    projectId,
    lotId: lot.id,
    publicId: lot.publicId,
    wishItemId,
    requestedByUserId: a.user.id,
    requestedAt: a.now,
    message: clean(message, 1000),
    status: 'pending',
    decidedAt: null,
    decidedByUserId: null,
    decisionNote: null,
    estimate: estimateForLot(state.world, lot, p, a.today),
    exchanged: null,
  }
  let s: AppData = { ...m.state, reservations: { ...m.state.reservations, [m.id]: reservation } }
  const blind = blindBuyerText(toBlindBuyer(p))
  const ownerOrgId = ownerOrgOfLot(s.world, lot)
  const item2 = s.world.items[lot.itemId]
  s = log(s, { at: a.now, orgIds: [p.clientOrgId, p.architectOrgId, p.consultantOrgId], projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `requested a reservation of ${listing.title}`, href: `/app/projects/${projectId}/reservations` })
  if (ownerOrgId) {
    s = log(s, { at: a.now, orgIds: [ownerOrgId], projectId: null, buildingId: item2.buildingId, actorUserId: null, actor: 'A buyer', text: `requested a reservation of ${item2.tag}. ${blind}.`, href: '/app/requests' })
    s = notify(s, { orgIds: [ownerOrgId], kind: 'reservation_requested', title: `Reservation request for ${item2.tag}`, body: `${listing.title}. ${blind}.`, href: '/app/requests', at: a.now, actorUserId: null })
  }
  return ok(s, m.id)
}

/** The client withdraws a request the seller has not decided. */
export function withdrawReservation(state: AppData, actor: Actor, reservationId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const r = state.reservations[reservationId]
  if (!r) return fail(state, RESERVATION_ERRORS.noReservation)
  if (!isProjectClient(state, actor.userId, r.projectId)) return fail(state, ERRORS.role)
  if (r.status !== 'pending') return fail(state, RESERVATION_ERRORS.notPending)
  let s: AppData = { ...state, reservations: { ...state.reservations, [r.id]: { ...r, status: 'withdrawn', decidedAt: a.now, decidedByUserId: a.user.id } } }
  const p = s.world.projects[r.projectId]
  const lot = s.world.lots[r.lotId]
  const listing = listingOf(s.world, lot)
  const item = s.world.items[lot.itemId]
  const ownerOrgId = ownerOrgOfLot(s.world, lot)
  s = log(s, { at: a.now, orgIds: [p.clientOrgId, p.architectOrgId, p.consultantOrgId], projectId: p.id, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `withdrew the reservation request for ${listing.title}`, href: `/app/projects/${p.id}/reservations` })
  if (ownerOrgId) {
    s = log(s, { at: a.now, orgIds: [ownerOrgId], projectId: null, buildingId: item.buildingId, actorUserId: null, actor: 'A buyer', text: `withdrew a reservation request for ${item.tag}`, href: '/app/requests' })
    s = notify(s, { orgIds: [ownerOrgId], kind: 'reservation_requested', title: `Request withdrawn for ${item.tag}`, body: `The buyer withdrew their request for ${listing.title}.`, href: '/app/requests', at: a.now, actorUserId: null })
  }
  return ok(s)
}

function contactsFor(state: AppData, r: Reservation, sellerUserId: string): ExchangedContacts {
  const p = state.world.projects[r.projectId]
  const buyerOrg = state.world.orgs[p.clientOrgId]
  const requester = state.users[r.requestedByUserId] ?? usersOfOrg(state, p.clientOrgId)[0] ?? null
  const seller = state.users[sellerUserId]
  return {
    buyerOrg: buyerOrg?.name ?? '',
    buyerContact: requester?.name ?? '',
    buyerEmail: requester?.email ?? '',
    sellerOrg: state.world.orgs[seller.orgId]?.name ?? '',
    sellerContact: seller.name,
    sellerEmail: seller.email,
  }
}

/** The seller accepts or declines a request. Accepting holds the lot for that project and declines the others. */
export function decideReservation(state: AppData, actor: Actor, reservationId: string, decision: 'accepted' | 'declined', note: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const r = state.reservations[reservationId]
  if (!r) return fail(state, RESERVATION_ERRORS.noReservation)
  const lot = state.world.lots[r.lotId]
  const item = lot ? state.world.items[lot.itemId] : null
  if (!lot || !item || !isBuildingOwner(state, actor.userId, item.buildingId)) return fail(state, ERRORS.role)
  if (r.status !== 'pending') return fail(state, RESERVATION_ERRORS.notPending)
  if (decision === 'accepted' && acceptedReservation(state, lot.id)) return fail(state, RESERVATION_ERRORS.reservedElsewhere)
  const text = clean(note, 1000)
  const listing = listingOf(state.world, lot)
  const p = state.world.projects[r.projectId]
  const reservations = { ...state.reservations }
  reservations[r.id] = { ...r, status: decision, decidedAt: a.now, decidedByUserId: a.user.id, decisionNote: text || null, exchanged: decision === 'accepted' ? contactsFor(state, r, a.user.id) : null }
  const bumped: Reservation[] = []
  if (decision === 'accepted') {
    for (const other of Object.values(state.reservations)) {
      if (other.id === r.id || other.lotId !== lot.id || other.status !== 'pending') continue
      reservations[other.id] = { ...other, status: 'declined', decidedAt: a.now, decidedByUserId: a.user.id, decisionNote: RESERVED_ELSEWHERE_NOTE }
      bumped.push(other)
    }
  }
  let s: AppData = { ...state, reservations }
  const blind = blindBuyerText(toBlindBuyer(p))
  const projectHref = `/app/projects/${p.id}/reservations`
  if (decision === 'accepted') {
    const x = reservations[r.id].exchanged!
    s = log(s, { at: a.now, orgIds: [a.org.id], projectId: null, buildingId: item.buildingId, actorUserId: a.user.id, actor: a.user.name, text: `accepted the reservation of ${item.tag} by ${x.buyerOrg}`, href: '/app/requests' })
    // The client learns the seller; the architect and the consultant read a blind line.
    s = log(s, { at: a.now, orgIds: [p.clientOrgId], projectId: p.id, buildingId: null, actorUserId: a.user.id, actor: `${x.sellerContact}, ${x.sellerOrg}`, text: `accepted the reservation of ${listing.title}`, href: projectHref })
    s = log(s, { at: a.now, orgIds: [p.architectOrgId, p.consultantOrgId], projectId: p.id, buildingId: null, actorUserId: null, actor: 'The seller', text: `accepted the reservation of ${listing.title}`, href: `/app/projects/${p.id}` })
    s = notify(s, { orgIds: [p.clientOrgId], kind: 'reservation_decided', title: `${x.sellerOrg} accepted your reservation`, body: `${listing.title} is reserved for ${p.name}. Contact ${x.sellerContact}, ${x.sellerEmail}.`, href: projectHref, at: a.now, actorUserId: a.user.id })
    s = notify(s, { orgIds: [p.architectOrgId], kind: 'reservation_decided', title: `${listing.title} is reserved`, body: `The seller accepted the client's reservation on ${p.name}.`, href: `/app/projects/${p.id}/shortlist`, at: a.now, actorUserId: null })
  } else {
    s = log(s, { at: a.now, orgIds: [a.org.id], projectId: null, buildingId: item.buildingId, actorUserId: a.user.id, actor: a.user.name, text: `declined a reservation request for ${item.tag}. ${blind}.`, href: '/app/requests' })
    s = log(s, { at: a.now, orgIds: [p.clientOrgId, p.architectOrgId, p.consultantOrgId], projectId: p.id, buildingId: null, actorUserId: null, actor: 'The seller', text: `declined the reservation of ${listing.title}`, href: projectHref })
    s = notify(s, { orgIds: [p.clientOrgId], kind: 'reservation_decided', title: `Reservation declined: ${listing.title}`, body: text ? `The seller's note: ${text}` : 'The seller declined this request.', href: projectHref, at: a.now, actorUserId: null })
  }
  for (const other of bumped) {
    const op = s.world.projects[other.projectId]
    s = log(s, { at: a.now, orgIds: [op.clientOrgId, op.architectOrgId, op.consultantOrgId], projectId: op.id, buildingId: null, actorUserId: null, actor: 'The seller', text: `reserved ${listing.title} for another buyer`, href: `/app/projects/${op.id}/reservations` })
    s = notify(s, { orgIds: [op.clientOrgId], kind: 'reservation_decided', title: `Reservation declined: ${listing.title}`, body: RESERVED_ELSEWHERE_NOTE, href: `/app/projects/${op.id}/reservations`, at: a.now, actorUserId: null })
  }
  return ok(s)
}
