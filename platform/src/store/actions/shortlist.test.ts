import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U, TODAY } from '../../test/fixtures'
import { decideItem, editItemNote, moveItem, removeFromList, reopenItem, saveToProject, sendToClient, SHORTLIST_ERRORS } from './shortlist'
import { projectWishlist, generalWishlist, LOT_ERRORS } from '../lots'
import { ERRORS } from '../access'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'

describe('saving to a shortlist', () => {
  it('the architect saves an open listing to a project, once', () => {
    const s0 = fresh()
    const r = must(saveToProject(s0, actor(U.priya), 'L-9F4CQQ', MERROWGATE_ID))
    const list = projectWishlist(r.state.world, MERROWGATE_ID)!
    const it = list.items.find((x) => x.publicId === 'L-9F4CQQ')!
    expect(it.id).toBe(r.value)
    expect(it.status).toBe('pending')
    expect(it.addedOn).toBe(TODAY)
    expect(r.state.activity[0].text).toBe('shortlisted UB 457x191x67, 7.5 m')
    expect(r.state.activity[0].orgIds).toEqual([ORG_IDS.oriel, ORG_IDS.lantern, ORG_IDS.halewick])
    const again = saveToProject(r.state, actor(U.priya), 'L-9F4CQQ', MERROWGATE_ID)
    expect(again.state).toBe(r.state)
    expect(again.value).toBe(r.value)
  })

  it('saves to Saved with no project, without activity on any project', () => {
    const s0 = fresh()
    const r = must(saveToProject(s0, actor(U.priya), 'L-9F4CQQ', null))
    expect(generalWishlist(r.state.world, ORG_IDS.oriel)!.items.map((x) => x.publicId)).toContain('L-9F4CQQ')
    expect(r.state.activity).toBe(s0.activity)
  })

  it('refuses private, sold, unshared and wrongly targeted lots', () => {
    const s0 = fresh()
    refused(s0, saveToProject(s0, actor(U.priya), 'L-DAXNV3', MERROWGATE_ID), LOT_ERRORS.noLot)
    refused(s0, saveToProject(s0, actor(U.priya), 'L-R8Q33F', MERROWGATE_ID), LOT_ERRORS.notAvailable)
    refused(s0, saveToProject(s0, actor(U.priya), 'L-MNY55K', SALLOW_ID), LOT_ERRORS.notShared)
    refused(s0, saveToProject(s0, actor(U.priya), 'L-MNY55K', null), LOT_ERRORS.sharedToSaved)
    refused(s0, saveToProject(s0, actor(U.priya), 'L-NOPE00', MERROWGATE_ID), LOT_ERRORS.noLot)
  })

  it('a shared lot saves to the project it is shared with', () => {
    const s0 = fresh()
    must(saveToProject(s0, actor(U.priya), 'L-MNY55K', MERROWGATE_ID))
  })

  it('only the project architect saves', () => {
    const s0 = fresh()
    for (const u of [U.isla, U.tom, U.dana, U.marcus]) refused(s0, saveToProject(s0, actor(u), 'L-9F4CQQ', MERROWGATE_ID), ERRORS.role)
    refused(s0, saveToProject(s0, actor('usr_nobody'), 'L-9F4CQQ', null), ERRORS.signedOut)
  })
})

describe('changing the shortlist', () => {
  it('removes a shortlisted item but never an approved one', () => {
    const s0 = fresh()
    must(removeFromList(s0, actor(U.priya), 'wli_hp23zk_4'))
    refused(s0, removeFromList(s0, actor(U.priya), 'wli_hp23zk_1'), SHORTLIST_ERRORS.approvedRemove)
    refused(s0, removeFromList(s0, actor(U.isla), 'wli_hp23zk_4'), ERRORS.role)
  })

  it('moves an open item between projects and Saved; a shared one stays', () => {
    const s0 = fresh()
    const r = must(moveItem(s0, actor(U.priya), 'wli_hp23zk_4', SALLOW_ID))
    expect(projectWishlist(r.state.world, MERROWGATE_ID)!.items.some((x) => x.publicId === 'L-6APVMW')).toBe(false)
    const moved = projectWishlist(r.state.world, SALLOW_ID)!.items.find((x) => x.publicId === 'L-6APVMW')!
    expect(moved.id).toBe(r.value)
    expect(moved.status).toBe('pending')
    must(moveItem(s0, actor(U.priya), 'wli_oriel_1', FERRYMOOR_ID))
    refused(s0, moveItem(s0, actor(U.priya), 'wli_hp23zk_3', SALLOW_ID))
    refused(s0, moveItem(s0, actor(U.priya), 'wli_hp23zk_4', MERROWGATE_ID), SHORTLIST_ERRORS.sameList)
  })

  it('edits notes while shortlisted, not once sent', () => {
    const s0 = fresh()
    const r = must(editItemNote(s0, actor(U.priya), 'wli_hp23zk_4', '  Check the grade first  '))
    expect(projectWishlist(r.state.world, MERROWGATE_ID)!.items[3].note).toBe('Check the grade first')
    refused(s0, editItemNote(s0, actor(U.priya), 'wli_hp23zk_3', 'x'), SHORTLIST_ERRORS.noteLocked)
  })
})

describe('sending to the client and deciding', () => {
  it('sends only the chosen shortlisted items, with the message, and tells the client', () => {
    let s = fresh()
    s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', MERROWGATE_ID)).state
    const newId = projectWishlist(s.world, MERROWGATE_ID)!.items.find((x) => x.publicId === 'L-9F4CQQ')!.id
    const r = must(sendToClient(s, actor(U.priya), MERROWGATE_ID, [newId], 'Beams for the upper floors.'))
    expect(r.value).toBe(1)
    const list = projectWishlist(r.state.world, MERROWGATE_ID)!
    const sent = list.items.find((x) => x.id === newId)!
    expect(sent.status).toBe('sent')
    expect(sent.sentOn).toBe(TODAY)
    expect(sent.sentMessage).toBe('Beams for the upper floors.')
    expect(list.items.find((x) => x.id === 'wli_hp23zk_4')!.status).toBe('pending')
    const n = r.state.notifications[0]
    expect(n.orgId).toBe(ORG_IDS.lantern)
    expect(n.kind).toBe('sent_to_client')
    expect(n.title).toBe('1 material to approve on Merrowgate Wharf')
    expect(n.body).toBe('Priya Nair: Beams for the upper floors.')
    expect(n.readBy).toEqual([])
  })

  it('refuses to send nothing', () => {
    const s0 = fresh()
    refused(s0, sendToClient(s0, actor(U.priya), MERROWGATE_ID, ['wli_hp23zk_1'], ''), SHORTLIST_ERRORS.nothingToSend)
    refused(s0, sendToClient(s0, actor(U.isla), MERROWGATE_ID, null, ''), ERRORS.role)
  })

  it('the client approves or declines a sent item with a note; the architect and consultant hear', () => {
    const s0 = fresh()
    const r = must(decideItem(s0, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_3', 'declined', 'Too short for the podium.'))
    const it = projectWishlist(r.state.world, MERROWGATE_ID)!.items.find((x) => x.id === 'wli_hp23zk_3')!
    expect(it.status).toBe('declined')
    expect(it.decisionNote).toBe('Too short for the podium.')
    expect(it.decidedOn).toBe(TODAY)
    const orgs = r.state.notifications.slice(0, 2).map((n) => n.orgId).sort()
    expect(orgs).toEqual([ORG_IDS.halewick, ORG_IDS.oriel].sort())
    expect(r.state.notifications[0].title).toBe('Lantern Quay Developments declined UC 305x305x97, 4.2 m')
    refused(s0, decideItem(s0, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_4', 'approved', ''), SHORTLIST_ERRORS.notSent)
    refused(s0, decideItem(s0, actor(U.priya), MERROWGATE_ID, 'wli_hp23zk_3', 'approved', ''), ERRORS.role)
  })

  it('a declined item reopens with a new note', () => {
    let s = fresh()
    s = must(decideItem(s, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_3', 'declined', 'No')).state
    const r = must(reopenItem(s, actor(U.priya), 'wli_hp23zk_3', 'Longer lengths available'))
    const it = projectWishlist(r.state.world, MERROWGATE_ID)!.items.find((x) => x.id === 'wli_hp23zk_3')!
    expect(it.status).toBe('pending')
    expect(it.note).toBe('Longer lengths available')
    expect(it.decisionNote).toBeNull()
    refused(s, reopenItem(s, actor(U.priya), 'wli_hp23zk_4', ''), SHORTLIST_ERRORS.notDeclined)
  })
})
