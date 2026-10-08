import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U } from '../../test/fixtures'
import { appointSurveyor, checkPrices, createBuilding, disclosureWith, OWNER_ERRORS, resetDisclosure, setDisclosure, setLotAvailability, setLotVisibility, setPhotoPublic, setProjectAccess, type NewBuildingInput } from './owner'
import { ERRORS } from '../access'
import { itemByTag, lotForItem, MERROWGATE_ID, ORG_IDS, SALLOW_ID, TIVERNE_ID, HARROWDEN_ID } from '../../domain/seed/world'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import type { AppData } from '../types'

function lotOf(s: AppData, tag: string) {
  return lotForItem(s.world, itemByTag(s.world, tag).id)
}

describe('visibility', () => {
  it('publishing needs an ask and a reserve in whole steps, reserve not above ask', () => {
    expect(checkPrices(800, 730, 'steel_section').valid).toBe(true)
    expect(checkPrices(null, 730, 'steel_section').problem).toBe(OWNER_ERRORS.prices)
    expect(checkPrices(700, 730, 'steel_section').problem).toBe(OWNER_ERRORS.reserveAboveAsk)
    expect(checkPrices(802, 730, 'steel_section').valid).toBe(false)
    const s0 = fresh()
    const lot = lotOf(s0, 'TH-08')
    refused(s0, setLotVisibility(s0, actor(U.tom), lot.id, { visibility: 'published' }), OWNER_ERRORS.prices)
  })

  it('publishes a lot, notifies architects whose projects it fits, and never names the owner', () => {
    const s0 = fresh()
    const lot = lotOf(s0, 'TH-07')
    const r = must(setLotVisibility(s0, actor(U.tom), lot.id, { visibility: 'published', ask: 180, reserve: 165 }))
    const after = r.state.world.lots[lot.id]
    expect(after.visibility).toBe('open')
    expect(after.listedMonth).toBe('2026-10')
    const n = r.state.notifications.find((x) => x.kind === 'new_fit')!
    expect(n.orgId).toBe(ORG_IDS.oriel)
    expect(n.href).toBe(`/app/discover/${lot.publicId}`)
    const item = itemByTag(r.state.world, 'TH-07')
    for (const s of lotPrivateStrings(after, item, r.state.world.buildings[TIVERNE_ID], r.state.world)) expect(`${n.title} ${n.body}`).not.toContain(s)
    expect(r.state.activity[0].text).toBe('published TH-07 to the marketplace')
    expect(r.state.activity[0].orgIds).toEqual([ORG_IDS.ostlea])
  })

  it('refuses to publish at a High disclosure score', () => {
    let s = fresh()
    s = must(setDisclosure(s, actor(U.tom), TIVERNE_ID, { locationLevel: 'local_authority', timingLevel: 'month' })).state
    const lot = lotOf(s, 'TH-07')
    expect(disclosureWith(s, TIVERNE_ID, { lotId: lot.id, visibility: 'open' }).blocksPublishing).toBe(true)
    refused(s, setLotVisibility(s, actor(U.tom), lot.id, { visibility: 'published', ask: 180, reserve: 165 }), OWNER_ERRORS.blocked)
    // Sharing privately is still allowed.
    must(setLotVisibility(s, actor(U.tom), lot.id, { visibility: 'shared', ask: 180, reserve: 165 }))
    s = must(resetDisclosure(s, actor(U.tom), TIVERNE_ID)).state
    must(setLotVisibility(s, actor(U.tom), lot.id, { visibility: 'published', ask: 180, reserve: 165 }))
  })

  it('shares a lot with approved projects and tells them, blind', () => {
    const s0 = fresh()
    const lot = lotOf(s0, 'TH-08')
    const r = must(setLotVisibility(s0, actor(U.tom), lot.id, { visibility: 'shared', ask: 300, reserve: 270 }))
    expect(r.state.world.lots[lot.id].visibility).toBe('matched_only')
    const ns = r.state.notifications.filter((n) => n.kind === 'lots_shared' && n.at === '2026-10-08T10:00:00.000Z')
    expect(ns.map((n) => n.orgId).sort()).toEqual([ORG_IDS.lantern, ORG_IDS.oriel].sort())
    for (const n of ns) expect(n.body).not.toContain('Ostlea')
  })

  it('makes a lot private again, unless it is reserved', () => {
    const s0 = fresh()
    const r = must(setLotVisibility(s0, actor(U.tom), lotOf(s0, 'TH-01').id, { visibility: 'private' }))
    expect(r.state.world.lots[lotOf(s0, 'TH-01').id].visibility).toBe('private')
  })

  it('sets a date only while private, and only the owner', () => {
    const s0 = fresh()
    must(setLotAvailability(s0, actor(U.tom), lotOf(s0, 'TH-08').id, '2027-05-03'))
    refused(s0, setLotAvailability(s0, actor(U.tom), lotOf(s0, 'TH-01').id, '2027-05-03'), OWNER_ERRORS.notPrivate)
    refused(s0, setLotAvailability(s0, actor(U.tom), lotOf(s0, 'TH-08').id, '2027-02-30'), OWNER_ERRORS.badDate)
    refused(s0, setLotAvailability(s0, actor(U.dana), lotOf(s0, 'TH-08').id, '2027-05-03'), ERRORS.role)
    refused(s0, setLotAvailability(s0, actor(U.tom), lotOf(s0, 'HC-01').id, '2027-05-03'), ERRORS.role)
  })

  it('photos and disclosure belong to the owner of the building', () => {
    const s0 = fresh()
    const th01 = itemByTag(s0.world, 'TH-01')
    const r = must(setPhotoPublic(s0, actor(U.tom), th01.id, 'pho_th01', true))
    expect(r.state.world.items[th01.id].photos[0].isPublic).toBe(true)
    refused(s0, setPhotoPublic(s0, actor(U.dana), th01.id, 'pho_th01', true), ERRORS.role)
    refused(s0, setDisclosure(s0, actor(U.tom), HARROWDEN_ID, { timingLevel: 'month' }), ERRORS.role)
  })
})

describe('sharing with projects', () => {
  it('grants and revokes a project, telling its architect and client without naming the owner', () => {
    const s0 = fresh()
    const r = must(setProjectAccess(s0, actor(U.tom), SALLOW_ID, true))
    expect(r.state.world.projects[SALLOW_ID].approvedByOwnerOrgIds).toEqual([ORG_IDS.ostlea])
    const n = r.state.notifications[0]
    expect(n.kind).toBe('lots_shared')
    expect(n.title).toBe('5 lots shared with Sallow Court')
    expect(n.body).not.toContain('Ostlea')
    expect(r.state.activity[0].text).toBe('shared lots with Design team, hotel project, Central London, needed by Q1 2028')
    const back = must(setProjectAccess(r.state, actor(U.tom), SALLOW_ID, false))
    expect(back.state.world.projects[SALLOW_ID].approvedByOwnerOrgIds).toEqual([])
    expect(setProjectAccess(s0, actor(U.tom), MERROWGATE_ID, true).state).toBe(s0)
    refused(s0, setProjectAccess(s0, actor(U.priya), SALLOW_ID, true), ERRORS.role)
  })
})

describe('buildings', () => {
  const input: NewBuildingInput = { name: 'Wexcombe House', address: '9 Lantry Street, London SE1', postcodeDistrict: 'se1', localAuthority: 'Southwark', region: 'Inner London East', yearBuilt: 1979, storeys: 6, giaM2: 4100, structureType: 'Steel frame', stripOutStart: '2027-03-01', dismantlingStart: '2027-04-05', clearBy: '2027-07-30', surveyorOrgId: ORG_IDS.tarnbrook }

  it('the owner adds a building and appoints a surveyor, who is told', () => {
    const s0 = fresh()
    const r = must(createBuilding(s0, actor(U.tom), input))
    const b = r.state.world.buildings[r.value]
    expect(b.ownerOrgId).toBe(ORG_IDS.ostlea)
    expect(b.postcodeDistrict).toBe('SE1')
    expect(b.eraBand).toBe('1970 or later')
    expect(b.surveyorOrgId).toBe(ORG_IDS.tarnbrook)
    expect(r.state.surveys[r.value].status).toBe('not_started')
    expect(r.state.notifications[0].orgId).toBe(ORG_IDS.tarnbrook)
    expect(r.state.notifications[0].kind).toBe('appointed')
  })

  it('validates the programme order and the role', () => {
    const s0 = fresh()
    refused(s0, createBuilding(s0, actor(U.tom), { ...input, clearBy: '2027-01-01' }), OWNER_ERRORS.order)
    refused(s0, createBuilding(s0, actor(U.tom), { ...input, name: '' }), OWNER_ERRORS.name)
    refused(s0, createBuilding(s0, actor(U.tom), { ...input, surveyorOrgId: ORG_IDS.oriel }), OWNER_ERRORS.surveyor)
    refused(s0, createBuilding(s0, actor(U.dana), input), ERRORS.role)
  })

  it('appoints or removes a surveyor', () => {
    const s0 = fresh()
    const r = must(appointSurveyor(s0, actor(U.tom), TIVERNE_ID, null))
    expect(r.state.world.buildings[TIVERNE_ID].surveyorOrgId).toBeNull()
    refused(s0, appointSurveyor(s0, actor(U.tom), HARROWDEN_ID, null), ERRORS.role)
  })
})
