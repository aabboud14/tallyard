import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U } from '../../test/fixtures'
import { decideReservation, requestReservation, RESERVATION_ERRORS, RESERVED_ELSEWHERE_NOTE, withdrawReservation } from './reservations'
import { decideItem, saveToProject, sendToClient } from './shortlist'
import { acceptedReservation, isLotAvailable, lotByPublicId, marketplaceListings, projectWishlist } from '../lots'
import { ERRORS } from '../access'
import { MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import type { AppData } from '../types'

/** Priya shortlists TH-01 for a project and sends it; the project's client approves. */
function approvedTh01(s0: AppData, projectId: string, clientUserId: string | null): { state: AppData; itemId: string } {
  let s = must(saveToProject(s0, actor(U.priya), 'L-9F4CQQ', projectId)).state
  const itemId = projectWishlist(s.world, projectId)!.items.find((x) => x.publicId === 'L-9F4CQQ')!.id
  s = must(sendToClient(s, actor(U.priya), projectId, [itemId], '')).state
  if (clientUserId) s = must(decideItem(s, actor(clientUserId), projectId, itemId, 'approved', '')).state
  return { state: s, itemId }
}

describe('requesting a reservation', () => {
  it('the client requests an approved item; the owner gets a blind notification', () => {
    const { state, itemId } = approvedTh01(fresh(), MERROWGATE_ID, U.isla)
    const r = must(requestReservation(state, actor(U.isla), MERROWGATE_ID, itemId, 'For the upper floors.'))
    const res = r.state.reservations[r.value]
    expect(res.status).toBe('pending')
    expect(res.publicId).toBe('L-9F4CQQ')
    expect(res.estimate.total).toBeGreaterThan(0)
    expect(res.estimate.testing).toBe(true)
    expect(res.estimate.lines.map((l) => l.id)).toEqual(['material', 'testing', 'storage', 'handlingOut', 'delivery'])
    const n = r.state.notifications.find((x) => x.orgId === ORG_IDS.ostlea && x.kind === 'reservation_requested')!
    expect(n.title).toBe('Reservation request for TH-01')
    expect(n.body).toBe('UB 457x191x67, 7.5 m. Design team, commercial project, Inner London East, needed by Q2 2028.')
    expect(n.body).not.toContain('Merrowgate')
    expect(n.body).not.toContain('Lantern')
  })

  it('refuses items that are not approved, repeats, and other people', () => {
    const s0 = fresh()
    refused(s0, requestReservation(s0, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_3', ''), RESERVATION_ERRORS.notApproved)
    refused(s0, requestReservation(s0, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_1', ''), RESERVATION_ERRORS.pending)
    refused(s0, requestReservation(s0, actor(U.priya), MERROWGATE_ID, 'wli_hp23zk_2', ''), ERRORS.role)
    refused(s0, requestReservation(s0, actor(U.isla), MERROWGATE_ID, 'wli_nope', ''), RESERVATION_ERRORS.noItem)
  })

  it('the client withdraws a pending request', () => {
    const s0 = fresh()
    const id = Object.keys(s0.reservations)[0]
    const r = must(withdrawReservation(s0, actor(U.isla), id))
    expect(r.state.reservations[id].status).toBe('withdrawn')
    refused(r.state, withdrawReservation(r.state, actor(U.isla), id), RESERVATION_ERRORS.notPending)
  })
})

describe('the seller decides', () => {
  it('accepting holds the lot for the project, exchanges contacts and declines competing requests', () => {
    // Merrowgate Wharf and Sallow Court both ask for TH-01. Sallow Court's client has no account, so this test
    // writes its approval straight into the list.
    let { state: s, itemId } = approvedTh01(fresh(), MERROWGATE_ID, U.isla)
    const a = approvedTh01(s, SALLOW_ID, null)
    s = a.state
    const list = projectWishlist(s.world, SALLOW_ID)!
    s = { ...s, world: { ...s.world, wishlists: { ...s.world.wishlists, [list.id]: { ...list, items: list.items.map((x) => (x.id === a.itemId ? { ...x, status: 'approved' as const } : x)) } } } }
    // Isla requests for Merrowgate Wharf; a second request comes from Sallow Court's client.
    const mine = must(requestReservation(s, actor(U.isla), MERROWGATE_ID, itemId, 'Please hold'))
    s = mine.state
    const otherId = 'res_other1'
    s = { ...s, reservations: { ...s.reservations, [otherId]: { ...s.reservations[mine.value], id: otherId, projectId: SALLOW_ID, wishItemId: a.itemId } } }

    const r = must(decideReservation(s, actor(U.tom), mine.value, 'accepted', 'Happy to hold until the start.'))
    const res = r.state.reservations[mine.value]
    expect(res.status).toBe('accepted')
    expect(res.exchanged).toEqual({ buyerOrg: 'Lantern Quay Developments', buyerContact: 'Isla Brennan', buyerEmail: 'isla.brennan@lanternquay.example', sellerOrg: 'Ostlea Estates', sellerContact: 'Tom Ashby', sellerEmail: 'tom.ashby@ostlea.example' })
    expect(r.state.reservations[otherId].status).toBe('declined')
    expect(r.state.reservations[otherId].decisionNote).toBe(RESERVED_ELSEWHERE_NOTE)
    const lot = lotByPublicId(r.state.world, 'L-9F4CQQ')!
    expect(acceptedReservation(r.state, lot.id)!.id).toBe(mine.value)
    expect(isLotAvailable(r.state, lot, MERROWGATE_ID)).toBe(true)
    expect(isLotAvailable(r.state, lot, SALLOW_ID)).toBe(false)
    expect(marketplaceListings(r.state).map((l) => l.publicId)).not.toContain('L-9F4CQQ')
    // The client learns the seller; the architect hears only that it is reserved.
    const toClient = r.state.notifications.find((n) => n.orgId === ORG_IDS.lantern && n.kind === 'reservation_decided')!
    expect(toClient.title).toBe('Ostlea Estates accepted your reservation')
    const toArchitect = r.state.notifications.find((n) => n.orgId === ORG_IDS.oriel && n.kind === 'reservation_decided')!
    expect(`${toArchitect.title} ${toArchitect.body}`).not.toContain('Ostlea')
    // Nothing more can change the lot.
    refused(r.state, decideReservation(r.state, actor(U.tom), mine.value, 'declined', ''), RESERVATION_ERRORS.notPending)
  })

  it('declining keeps both sides blind', () => {
    const s0 = fresh()
    const id = Object.keys(s0.reservations)[0]
    const r = must(decideReservation(s0, actor(U.tom), id, 'declined', 'Committed elsewhere.'))
    expect(r.state.reservations[id].exchanged).toBeNull()
    const n = r.state.notifications.find((x) => x.orgId === ORG_IDS.lantern)!
    expect(n.title).toBe('Reservation declined: UB 533x210x92, 9.0 m')
    expect(n.body).toBe("The seller's note: Committed elsewhere.")
  })

  it('only the owner of the lot decides', () => {
    const s0 = fresh()
    const id = Object.keys(s0.reservations)[0]
    for (const u of [U.isla, U.priya, U.dana, U.marcus]) refused(s0, decideReservation(s0, actor(u), id, 'accepted', ''), ERRORS.role)
  })
})
