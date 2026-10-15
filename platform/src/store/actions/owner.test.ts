import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, NOW, refused, U, viewer } from '../../test/fixtures'
import { appointProjectArchitect, createOwnerProject, setBuildingStructure, updateBuilding, type OwnerProjectInput } from './owner'
import { createProject, existingClientOrgIds, PROJECT_ERRORS } from './projects'
import { newProjectOptions } from '../selectors/project'
import { decideItem, saveToProject, sendToClient } from './shortlist'
import { requestReservation, RESERVATION_ERRORS } from './reservations'
import { projectSide, projectsOfUser } from '../access'
import { projectWishlist } from '../lots'
import { FENNICK_ID } from '../../sandbox/seed-owner-surveyor'
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

describe('round 2: building records, structure and new projects', () => {
  const donor: NewBuildingInput = { name: 'Wexcombe House', address: '9 Lantry Street, London SE1', postcodeDistrict: 'se1', localAuthority: 'Southwark', region: 'Inner London East', yearBuilt: 1979, storeys: 6, giaM2: 4100, structureType: '', structure: [{ kind: 'facade', material: 'masonry', systemId: null, note: '' }, { kind: 'frame', material: null, systemId: 'frame_steel_bolted', note: '' }], stripOutStart: '2027-03-01', dismantlingStart: '2027-04-05', clearBy: '2027-07-30', surveyorOrgId: null }

  it('the owner is recorded as the creator, and the structure is kept in element order', () => {
    const s0 = fresh()
    const r = must(createBuilding(s0, actor(U.tom), donor))
    const b = r.state.world.buildings[r.value]
    expect(b).toMatchObject({ createdByOrgId: ORG_IDS.ostlea, contractorOrgId: null })
    expect(b.structure.map((e) => [e.kind, e.material])).toEqual([['frame', 'steel'], ['facade', 'masonry']])
    refused(s0, createBuilding(s0, actor(U.tom), { ...donor, structure: [{ kind: 'roof', material: 'timber', systemId: 'roof_rc', note: '' }] }), 'Choose a system that matches the element and material.')
  })

  it('the owner and the surveyor record the structure; a contractor alone may not', () => {
    let s = fresh()
    const elements = [{ kind: 'roof' as const, material: 'timber' as const, systemId: null, note: '' }]
    const r = must(setBuildingStructure(s, actor(U.tom), TIVERNE_ID, { elements: [...s.world.buildings[TIVERNE_ID].structure, ...elements], notes: 'Cores at the north and east corners.' }))
    expect(r.state.world.buildings[TIVERNE_ID].structure.map((e) => e.kind)).toEqual(['frame', 'floors', 'roof', 'stability', 'facade', 'facade', 'facade'])
    expect(r.state.world.buildings[TIVERNE_ID].structureType).toBe('Cores at the north and east corners.')
    expect(r.state.activity[0]).toMatchObject({ text: 'updated the structure' })
    expect(r.state.activity[0].orgIds).toEqual(expect.arrayContaining([ORG_IDS.ostlea, ORG_IDS.tarnbrook]))
    // The same input again changes nothing.
    const b = r.state.world.buildings[TIVERNE_ID]
    expect(setBuildingStructure(r.state, actor(U.tom), TIVERNE_ID, { elements: b.structure, notes: b.structureType }).state).toBe(r.state)
    must(setBuildingStructure(s, actor(U.dana), HARROWDEN_ID, { elements, notes: '' }))
    refused(s, setBuildingStructure(s, actor(U.tom), TIVERNE_ID, { elements: Array.from({ length: 13 }, () => elements[0]), notes: '' }), 'A building can have up to 12 structural elements.')
    refused(s, setBuildingStructure(s, actor(U.priya), TIVERNE_ID, { elements, notes: '' }), ERRORS.role)
    const lee = addTestUser(s, { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    s = lee.state
    refused(s, setBuildingStructure(s, actor(lee.userId), TIVERNE_ID, { elements, notes: '' }), ERRORS.role)
  })

  it('the owner corrects the location of a building', () => {
    const s0 = fresh()
    const r = must(updateBuilding(s0, actor(U.tom), TIVERNE_ID, { postcodeDistrict: 'ec3', localAuthority: 'City of London', region: 'Central London' }))
    expect(r.state.world.buildings[TIVERNE_ID]).toMatchObject({ postcodeDistrict: 'EC3', localAuthority: 'City of London', region: 'Central London' })
    refused(s0, updateBuilding(s0, actor(U.tom), TIVERNE_ID, { region: 'Atlantis' }), OWNER_ERRORS.region)
  })
})

describe('round 2: the owner as client of a New project', () => {
  const WEXCOMBE: OwnerProjectInput = { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: ORG_IDS.oriel }

  it('creates the project with the owner as client and developer, and tells the architect', () => {
    const s0 = fresh()
    const r = must(createOwnerProject(s0, actor(U.tom), WEXCOMBE))
    const p = r.state.world.projects[r.value]
    expect(p).toMatchObject({ name: 'Wexcombe House', clientOrgId: ORG_IDS.ostlea, developerOrgId: ORG_IDS.ostlea, architectOrgId: ORG_IDS.oriel, consultantOrgId: '', blind: { orgType: 'Design team', projectType: 'office project' } })
    expect(p.clientLink.status).toBe('accepted')
    expect(p.programme.source).toBe('suggested')
    expect(p.teamOrgIds).toEqual([ORG_IDS.ostlea, ORG_IDS.oriel])
    expect(projectWishlist(r.state.world, r.value)).toMatchObject({ orgId: ORG_IDS.oriel, projectId: r.value, items: [] })
    expect(projectSide(r.state, U.tom, r.value)).toBe('client')
    expect(projectSide(r.state, U.priya, r.value)).toBe('architect')
    expect(projectsOfUser(r.state, U.priya).map((x) => x.id)).toContain(r.value)
    expect(projectSide(r.state, U.isla, r.value)).toBeNull()
    const n = r.state.notifications.find((x) => x.orgId === ORG_IDS.oriel && x.at === NOW)!
    expect(n).toMatchObject({ kind: 'team', title: 'Ostlea Estates added you as architect on Wexcombe House', body: 'Wexcombe House is now in your projects. Your client is Ostlea Estates.', href: `/app/projects/${r.value}` })
    expect(r.state.activity[0]).toMatchObject({ text: 'created the project', actor: 'Tom Ashby' })
  })

  it('without an architect, appoints one later, once only', () => {
    const s0 = fresh()
    const r = must(createOwnerProject(s0, actor(U.tom), { ...WEXCOMBE, architectOrgId: null }))
    expect(r.state.world.projects[r.value].architectOrgId).toBe('')
    expect(projectWishlist(r.state.world, r.value)).toBeNull()
    expect(r.state.notifications.filter((x) => x.at === NOW)).toEqual([])
    refused(r.state, appointProjectArchitect(r.state, actor(U.tom), r.value, ORG_IDS.lantern), OWNER_ERRORS.architect)
    refused(r.state, appointProjectArchitect(r.state, actor(U.priya), r.value, ORG_IDS.oriel), ERRORS.role)
    const a = must(appointProjectArchitect(r.state, actor(U.tom), r.value, ORG_IDS.oriel))
    expect(a.state.world.projects[r.value].architectOrgId).toBe(ORG_IDS.oriel)
    expect(projectWishlist(a.state.world, r.value)).not.toBeNull()
    expect(a.state.notifications.find((x) => x.orgId === ORG_IDS.oriel && x.at === NOW)!.title).toBe('Ostlea Estates added you as architect on Wexcombe House')
    refused(a.state, appointProjectArchitect(a.state, actor(U.tom), r.value, ORG_IDS.oriel), OWNER_ERRORS.hasArchitect)
  })

  it('refuses a duplicate name, a practice that is not one, and another role', () => {
    const s0 = fresh()
    const r = must(createOwnerProject(s0, actor(U.tom), WEXCOMBE))
    refused(r.state, createOwnerProject(r.state, actor(U.tom), { ...WEXCOMBE, name: ' wexcombe house ' }), PROJECT_ERRORS.duplicateName)
    refused(s0, createOwnerProject(s0, actor(U.tom), { ...WEXCOMBE, architectOrgId: ORG_IDS.halewick }), OWNER_ERRORS.architect)
    refused(s0, createOwnerProject(s0, actor(U.tom), { ...WEXCOMBE, name: '' }), PROJECT_ERRORS.name)
    refused(s0, createOwnerProject(s0, actor(U.priya), WEXCOMBE), ERRORS.role)
    // A seeded project's name is not a duplicate: names are unique per client.
    must(createOwnerProject(s0, actor(U.tom), { ...WEXCOMBE, name: 'Sallow Court' }))
  })

  it('the owner approves what its architect sends, but never reserves its own lot', () => {
    const s0 = fresh()
    const created = must(createOwnerProject(s0, actor(U.tom), WEXCOMBE))
    const id = created.value
    let s = must(saveToProject(created.state, actor(U.priya), 'L-9F4CQQ', id)).state
    s = must(saveToProject(s, actor(U.priya), 'L-NHZ32R', id)).state
    s = must(sendToClient(s, actor(U.priya), id, null, 'Two for the frame.')).state
    expect(s.notifications.find((n) => n.kind === 'sent_to_client' && n.at === NOW)!.orgId).toBe(ORG_IDS.ostlea)
    const items = projectWishlist(s.world, id)!.items
    for (const it of items) s = must(decideItem(s, actor(U.tom), id, it.id, 'approved', '')).state
    const own = items.find((x) => x.publicId === 'L-9F4CQQ')!
    refused(s, requestReservation(s, actor(U.tom), id, own.id, ''), RESERVATION_ERRORS.ownLot)
    expect(RESERVATION_ERRORS.ownLot).toBe('This lot is yours. Allocate it directly; reserving is for other sellers.')
    const other = items.find((x) => x.publicId === 'L-NHZ32R')!
    must(requestReservation(s, actor(U.tom), id, other.id, 'For the frame.'))
    // A New project is never one of the owner's own sharing lines.
    refused(s, setProjectAccess(s, actor(U.tom), id, true), ERRORS.role)
  })
})

describe('round 2: an architect never finds an owner by name (BRIEF 14.2)', () => {
  it("the owner of a New project is not offered as the practice's client, nor resolved from its name", () => {
    const s0 = fresh()
    const r = must(createOwnerProject(s0, actor(U.tom), { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: ORG_IDS.oriel }))
    expect(existingClientOrgIds(r.state, ORG_IDS.oriel)).not.toContain(ORG_IDS.ostlea)
    expect(newProjectOptions(r.state, viewer(U.priya))!.clients.map((c) => c.name)).not.toContain('Ostlea Estates')
    const base = { projectType: 'office' as const, localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20' }
    refused(r.state, createProject(r.state, actor(U.priya), { ...base, name: 'Corbel Yard', client: { orgId: ORG_IDS.ostlea } }), PROJECT_ERRORS.clientNotBuyer)
    const named = must(createProject(r.state, actor(U.priya), { ...base, name: 'Corbel Yard', client: { name: 'Ostlea Estates' } }))
    const client = named.state.world.projects[named.value].clientOrgId
    expect(client).not.toBe(ORG_IDS.ostlea)
    expect(named.state.world.orgs[client].type).toBe('Developer')
  })
})
