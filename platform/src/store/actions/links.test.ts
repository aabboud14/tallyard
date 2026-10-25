import { describe, it, expect } from 'vitest'
import { actor, fresh, must, NOW, refused, U, viewer } from '../../test/fixtures'
import { createShareLink, LINK_ERRORS, openShareLink, revokeShareLink } from './links'
import { saveToProject } from './shortlist'
import { decideReservation } from './reservations'
import { ERRORS } from '../access'
import { LOT_ERRORS, projectWishlist } from '../lots'
import { shortlistBoard } from '../selectors/shortlist'
import { itemByTag, lotForItem, MERROWGATE_ID, ORG_IDS, SALLOW_ID, TIVERNE_ID } from '../../domain/seed/world'
import { lotsVisibleToProject } from '../../domain/visibility'
import type { AppData } from '../types'

const lot = (s: AppData, tag: string) => lotForItem(s.world, itemByTag(s.world, tag).id)

function linked(): { s: AppData; id: string } {
  const s0 = fresh()
  const r = must(createShareLink(s0, actor(U.tom), { buildingId: TIVERNE_ID, lotIds: [lot(s0, 'TH-02').id, lot(s0, 'TH-03').id], label: '' }))
  return { s: r.state, id: r.value }
}

describe('share links', () => {
  it('the owner links shared lots of one building, named for reference only', () => {
    const { s, id } = linked()
    const link = s.world.shareLinks[id]
    expect(id).toMatch(/^lnk_[a-z0-9]{6}$/)
    expect(link).toMatchObject({ ownerOrgId: ORG_IDS.ostlea, buildingId: TIVERNE_ID, label: '2 lots from Tiverne House', revokedAt: null, opens: [] })
    expect(s.activity[0]).toMatchObject({ text: 'created a share link for 2 lots', orgIds: [ORG_IDS.ostlea] })
    expect(s.notifications.filter((n) => n.at === NOW)).toEqual([])
  })

  it('refuses private and published lots, reserved lots, an empty choice, other sellers and other people', () => {
    const s0 = fresh()
    const pending = Object.values(s0.reservations).find((r) => r.lotId === lot(s0, 'TH-02').id)!
    const held = must(decideReservation(s0, actor(U.tom), pending.id, 'accepted', '')).state
    refused(held, createShareLink(held, actor(U.tom), { buildingId: TIVERNE_ID, lotIds: [lot(held, 'TH-02').id], label: '' }), LINK_ERRORS.reserved)
    refused(s0, createShareLink(s0, actor(U.tom), { buildingId: TIVERNE_ID, lotIds: [lot(s0, 'TH-07').id], label: '' }), LINK_ERRORS.notShared)
    refused(s0, createShareLink(s0, actor(U.tom), { buildingId: TIVERNE_ID, lotIds: [lot(s0, 'TH-01').id], label: '' }), LINK_ERRORS.notShared)
    refused(s0, createShareLink(s0, actor(U.tom), { buildingId: TIVERNE_ID, lotIds: [], label: '' }), LINK_ERRORS.lots)
    refused(s0, createShareLink(s0, actor(U.tom), { buildingId: TIVERNE_ID, lotIds: [lot(s0, 'OS-11').id], label: '' }), LINK_ERRORS.lots)
    refused(s0, createShareLink(s0, actor(U.dana), { buildingId: TIVERNE_ID, lotIds: [lot(s0, 'TH-02').id], label: '' }), ERRORS.role)
    refused(s0, createShareLink(s0, actor(U.priya), { buildingId: TIVERNE_ID, lotIds: [lot(s0, 'TH-02').id], label: '' }), ERRORS.role)
  })

  it("an architect opens it, and their projects can shortlist the lots until it is revoked", () => {
    const { s: s1, id } = linked()
    const th03 = lot(s1, 'TH-03')
    refused(s1, saveToProject(s1, actor(U.priya), th03.publicId, SALLOW_ID), LOT_ERRORS.notShared)
    const opened = must(openShareLink(s1, actor(U.priya), id)).state
    expect(opened.world.shareLinks[id].opens).toEqual([{ orgId: ORG_IDS.oriel, at: NOW }])
    const n = opened.notifications[0]
    expect(n).toMatchObject({ orgId: ORG_IDS.ostlea, kind: 'link_opened', title: 'Your share link was opened', body: 'An architecture practice opened 2 lots from Tiverne House.', actorUserId: null })
    const text = JSON.stringify(n)
    for (const x of ['Studio Oriel', 'Priya', U.priya]) expect(text).not.toContain(x)
    // Opening again changes nothing.
    expect(openShareLink(opened, actor(U.priya), id).state).toBe(opened)
    const saved = must(saveToProject(opened, actor(U.priya), th03.publicId, SALLOW_ID)).state
    expect(projectWishlist(saved.world, SALLOW_ID)!.items.some((x) => x.publicId === th03.publicId)).toBe(true)

    const revoked = must(revokeShareLink(saved, actor(U.tom), id)).state
    expect(revoked.world.shareLinks[id].revokedAt).toBe(NOW)
    const row = shortlistBoard(revoked, viewer(U.priya), SALLOW_ID)!.rows.find((r) => r.publicId === th03.publicId)!
    expect(row.state).toBe('not_shared')
    expect(row.card).toBeNull()
    refused(revoked, saveToProject(revoked, actor(U.priya), lot(revoked, 'TH-02').publicId, SALLOW_ID), LOT_ERRORS.notShared)
    const told = revoked.notifications.find((x) => x.orgId === ORG_IDS.oriel && x.title === 'A shared link was withdrawn')!
    expect(told).toMatchObject({ kind: 'lots_shared', href: '/app/home' })
    refused(revoked, openShareLink(revoked, actor(U.isla), id), LINK_ERRORS.noLink)
  })

  it('a surveyor and a consultant may open it, but no project gains anything from the consultant', () => {
    const { s: s1, id } = linked()
    const before = lotsVisibleToProject(s1.world, s1.world.projects[MERROWGATE_ID])
    let s = must(openShareLink(s1, actor(U.marcus), id)).state
    s = must(openShareLink(s, actor(U.dana), id)).state
    expect(s.world.shareLinks[id].opens.map((o) => o.orgId)).toEqual([ORG_IDS.halewick, ORG_IDS.tarnbrook])
    for (const p of Object.values(s.world.projects)) expect(lotsVisibleToProject(s.world, p)).toEqual(lotsVisibleToProject(s1.world, s1.world.projects[p.id]))
    expect(lotsVisibleToProject(s.world, s.world.projects[MERROWGATE_ID])).toEqual(before)
    // The second open on the same day folds into one notification, still blind.
    const ns = s.notifications.filter((n) => n.kind === 'link_opened')
    expect(ns).toHaveLength(1)
    expect(ns[0].body).toBe('2 organisations opened 2 lots from Tiverne House.')
  })

  it("the owner's own organisation previews it without opening, and only the owner revokes", () => {
    const { s, id } = linked()
    expect(openShareLink(s, actor(U.tom), id).state).toBe(s)
    refused(s, revokeShareLink(s, actor(U.priya), id), ERRORS.role)
    refused(s, openShareLink(s, actor(U.priya), 'lnk_nothere'), LINK_ERRORS.noLink)
    const r = must(revokeShareLink(s, actor(U.tom), id)).state
    expect(revokeShareLink(r, actor(U.tom), id).state).toBe(r)
  })
})
