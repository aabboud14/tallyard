// Audit of 16 October 2026, owner package: moving a surveyor's early captures into an appointment (note 26), editing
// the location of a building (note 26), clearing a replaced contractor's dates and inviting one by email (note 28).
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, NOW, refused, U, viewer } from '../../test/fixtures'
import { CLAIM_ERRORS, createSurveyBuilding, mergeSurveyBuilding, requestBuildingClaim, type SurveyBuildingInput } from './claims'
import { appointSurveyor, createBuilding, updateBuilding, type NewBuildingInput } from './owner'
import { appointContractor, CONTRACTOR_ERRORS, inviteContractorByEmail, resolveContractorInvites, withdrawContractorInvite } from './contractor'
import { captureItem } from './surveyor'
import { signUpState } from './auth'
import { draftFromText } from '../capture'
import { ERRORS } from '../access'
import { HARROWDEN_ID, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID, FENNICK_ID } from '../../sandbox/seed-owner-surveyor'
import * as sel from '../selectors'
import type { AppData } from '../types'

const CORBEL: SurveyBuildingInput = {
  name: 'Corbel Yard',
  address: '9 Lantry Street, London E1',
  postcodeDistrict: 'E1',
  localAuthority: 'Tower Hamlets',
  region: 'Inner London East',
  yearBuilt: 1988,
  storeys: 5,
  giaM2: 3000,
  structureType: 'Cores at the east end',
  structure: [{ kind: 'frame', material: null, systemId: 'frame_steel_bolted', note: '' }],
  stripOutStart: '2027-05-03',
  dismantlingStart: '2027-06-07',
  clearBy: '2027-08-27',
  owner: null,
}

/** Tom's own record of the same building, appointing Tarnbrook: the owner's normal flow, with no programme yet. */
const TOMS_CORBEL: NewBuildingInput = {
  name: 'Corbel Yard',
  address: '9 Lantry Street, London E1',
  postcodeDistrict: 'E1',
  localAuthority: 'Tower Hamlets',
  region: 'Inner London East',
  yearBuilt: null,
  storeys: null,
  giaM2: null,
  structureType: '',
  structure: [],
  stripOutStart: null,
  dismantlingStart: null,
  clearBy: null,
  surveyorOrgId: ORG_IDS.tarnbrook,
}

function capture(s: AppData, userId: string, buildingId: string, text = '30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room'): AppData {
  const d = draftFromText(text)
  return must(captureItem(s, actor(userId), { buildingId, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: 'A', location: d.location, notes: '', photoIds: [], expectedAvailableFrom: null })).state
}

/** Dana adds Corbel Yard and captures two items; then Tom adds it himself and appoints Tarnbrook. */
function twoCorbels(): { s: AppData; mine: string; toms: string } {
  let s = fresh()
  const a = must(createSurveyBuilding(s, actor(U.dana), CORBEL))
  s = capture(a.state, U.dana, a.value)
  s = capture(s, U.dana, a.value, '12 no. 305x165x40 UB, 5.0m long, bolted, level 2')
  const t = must(createBuilding(s, actor(U.tom), TOMS_CORBEL))
  return { s: t.state, mine: a.value, toms: t.value }
}

describe('moving early captures into an appointment (note 26)', () => {
  it('pairs the firm\'s own building with the appointment that looks like the same place', () => {
    const { s, mine, toms } = twoCorbels()
    const pairs = sel.mergeCandidates(s, viewer(U.dana))
    expect(pairs).toHaveLength(1)
    expect(pairs[0]).toMatchObject({ fromId: mine, intoId: toms, itemCount: 2, ownerName: 'Ostlea Estates', reason: 'name', actionLabel: 'Move items here' })
    expect(pairs[0].prompt).toBe('You added Corbel Yard yourself before Ostlea Estates appointed you. Move its 2 captured items here?')
    // Never anything for the owner side, or for anyone else.
    expect(sel.mergeCandidates(s, viewer(U.tom))).toEqual([])
    expect(sel.mergeCandidates(s, viewer(U.priya))).toEqual([])
    // The manual route lists every appointment of the firm's.
    expect(sel.mergeTargets(s, viewer(U.dana), mine).map((t) => t.id)).toEqual(expect.arrayContaining([toms, TIVERNE_ID, HARROWDEN_ID]))
    expect(sel.mergeTargets(s, viewer(U.dana), toms)).toEqual([])
  })

  it('matches by address, and by postcode district with a similar name', () => {
    let s = fresh()
    const a = must(createSurveyBuilding(s, actor(U.dana), CORBEL))
    s = must(createBuilding(a.state, actor(U.tom), { ...TOMS_CORBEL, name: 'Corbel Yard offices', address: '9 Lantry Street, London E1' })).state
    expect(sel.mergeCandidates(s, viewer(U.dana))[0].reason).toBe('address')
    let s2 = fresh()
    const b = must(createSurveyBuilding(s2, actor(U.dana), CORBEL))
    s2 = must(createBuilding(b.state, actor(U.tom), { ...TOMS_CORBEL, name: 'The Corbel Building', address: 'Corbel Yard, Lantry Street, E1' })).state
    expect(sel.mergeCandidates(s2, viewer(U.dana))[0].reason).toBe('postcode')
    let s3 = fresh()
    const c = must(createSurveyBuilding(s3, actor(U.dana), CORBEL))
    s3 = must(createBuilding(c.state, actor(U.tom), { ...TOMS_CORBEL, name: 'Wexcombe House', address: '2 Wharf Lane, London E1' })).state
    expect(sel.mergeCandidates(s3, viewer(U.dana))).toEqual([])
  })

  it('moves the items, lots and testing into the appointment, fills gaps, and removes the firm\'s record', () => {
    const { s, mine, toms } = twoCorbels()
    const itemsBefore = Object.values(s.world.items).filter((i) => i.buildingId === mine)
    const lotsBefore = itemsBefore.map((i) => Object.values(s.world.lots).find((l) => l.itemId === i.id)!.id)
    const homeBefore = sel.surveyorHome(s, viewer(U.dana))!
    const ownerBefore = sel.ownerHome(s, viewer(U.tom))!
    const r = must(mergeSurveyBuilding(s, actor(U.dana), mine, toms))
    expect(r.value).toEqual({ moved: 2, intoId: toms, intoName: 'Corbel Yard', retagged: false })
    const w = r.state.world
    expect(w.buildings[mine]).toBeUndefined()
    expect(r.state.surveys[mine]).toBeUndefined()
    for (const i of itemsBefore) expect(w.items[i.id].buildingId).toBe(toms)
    for (const id of lotsBefore) expect(w.items[w.lots[id].itemId].buildingId).toBe(toms)
    expect(itemsBefore.map((i) => w.items[i.id].tag)).toEqual(itemsBefore.map((i) => i.tag))
    // Gaps on the appointed record are filled from the firm's; its own values stay.
    const into = w.buildings[toms]
    expect(into.programme).toEqual({ stripOutStart: '2027-05-03', dismantlingStart: '2027-06-07', clearBy: '2027-08-27' })
    expect(into.structure.map((e) => e.systemId)).toEqual(['frame_steel_bolted'])
    expect(into.structureType).toBe('Cores at the east end')
    expect(into.yearBuilt).toBe(1988)
    expect(into.ownerOrgId).toBe(ORG_IDS.ostlea)
    expect(r.state.surveys[toms].status).toBe('in_progress')
    // Counts on both homes: one Corbel Yard for Dana, its items now in Tom's inventory.
    const homeAfter = sel.surveyorHome(r.state, viewer(U.dana))!
    expect(homeAfter.stats.unlinked).toBe(homeBefore.stats.unlinked - 1)
    expect(homeAfter.stats.itemsCaptured).toBe(homeBefore.stats.itemsCaptured)
    expect(homeAfter.appointments.flatMap((g) => g.buildings).find((b) => b.id === toms)!.itemCount).toBe(2)
    expect(sel.captureTargets(r.state, viewer(U.dana))!.targets.filter((t) => t.name === 'Corbel Yard')).toHaveLength(1)
    expect(sel.ownerHome(r.state, viewer(U.tom))!.stats.itemsSurveyed).toBe(ownerBefore.stats.itemsSurveyed + 2)
    expect(sel.inventoryView(r.state, viewer(U.tom), toms)!.rows).toHaveLength(2)
    expect(sel.mergeCandidates(r.state, viewer(U.dana))).toEqual([])
    // The owner is told, in the firm's words; the activity reads for both.
    const n = r.state.notifications.find((x) => x.orgId === ORG_IDS.ostlea)!
    expect(n).toMatchObject({ kind: 'appointed', title: 'Tarnbrook Deconstruction added 2 items to Corbel Yard', body: 'Captured before your appointment. Private until you decide.', href: `/app/buildings/${toms}/inventory` })
    expect(r.state.activity[0]).toMatchObject({ text: 'moved 2 items captured earlier into Corbel Yard', orgIds: [ORG_IDS.tarnbrook, ORG_IDS.ostlea] })
    // Links in the firm's history follow the items.
    expect(r.state.activity.some((e) => e.href?.includes(mine))).toBe(false)
  })

  it('continues the appointment\'s numbering when it already has items, and withdraws a waiting request', () => {
    let { s, mine, toms } = twoCorbels()
    s = capture(s, U.dana, toms, '4 no. 203x203x46 UC, 2.4m long, bolted, stair core')
    s = must(requestBuildingClaim(s, actor(U.dana), mine, { email: 'tom.ashby@ostlea.example', name: 'Tom Ashby', message: '' })).state
    const r = must(mergeSurveyBuilding(s, actor(U.dana), mine, toms))
    expect(r.value.retagged).toBe(true)
    const tags = Object.values(r.state.world.items)
      .filter((i) => i.buildingId === toms)
      .map((i) => i.tag)
      .sort()
    expect(new Set(tags).size).toBe(3)
    expect(tags).toEqual(['CY-01', 'CY-02', 'CY-03'])
    expect(Object.values(r.state.buildingClaims).filter((c) => c.buildingId === mine).map((c) => c.status)).toEqual(['withdrawn'])
  })

  it('refuses a linked building, another firm, an appointment of another firm and anyone but a surveyor', () => {
    const { s, mine, toms } = twoCorbels()
    refused(s, mergeSurveyBuilding(s, actor(U.dana), toms, TIVERNE_ID), CLAIM_ERRORS.mergeFrom)
    refused(s, mergeSurveyBuilding(s, actor(U.dana), AMBREY_ID, mine), CLAIM_ERRORS.mergeInto)
    refused(s, mergeSurveyBuilding(s, actor(U.dana), mine, mine), CLAIM_ERRORS.mergeInto)
    refused(s, mergeSurveyBuilding(s, actor(U.tom), mine, toms), ERRORS.role)
    // Another surveying firm cannot touch Tarnbrook's building.
    const shaw = must(signUpState(s, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW }))
    refused(shaw.state, mergeSurveyBuilding(shaw.state, actor(shaw.value), mine, toms), CLAIM_ERRORS.mergeFrom)
    // An appointment of another firm is not a target.
    const moved = must(appointSurveyor(s, actor(U.tom), toms, null)).state
    refused(moved, mergeSurveyBuilding(moved, actor(U.dana), mine, toms), CLAIM_ERRORS.mergeInto)
  })
})

describe('correcting a building\'s location (note 26)', () => {
  it('lets the owner change the postcode district, region and local authority', () => {
    const s = fresh()
    const r = must(updateBuilding(s, actor(U.tom), TIVERNE_ID, { postcodeDistrict: 'ec3', region: 'Inner London East', localAuthority: 'Tower Hamlets' }))
    expect(r.state.world.buildings[TIVERNE_ID]).toMatchObject({ postcodeDistrict: 'EC3', region: 'Inner London East', localAuthority: 'Tower Hamlets' })
    expect(sel.buildingHeader(s, viewer(U.tom), TIVERNE_ID)!.canEditDetails).toBe(true)
  })

  it('lets the surveying firm edit a building it added until its owner confirms it, and no longer after', () => {
    const s = fresh()
    expect(sel.buildingHeader(s, viewer(U.dana), AMBREY_ID)!.canEditDetails).toBe(true)
    const r = must(updateBuilding(s, actor(U.dana), AMBREY_ID, { localAuthority: 'Lambeth', postcodeDistrict: 'SE11' }))
    expect(r.state.world.buildings[AMBREY_ID]).toMatchObject({ localAuthority: 'Lambeth', postcodeDistrict: 'SE11' })
    expect(sel.buildingHeader(s, viewer(U.dana), TIVERNE_ID)!.canEditDetails).toBe(false)
    refused(s, updateBuilding(s, actor(U.dana), TIVERNE_ID, { name: 'Renamed' }), ERRORS.role)
  })
})

describe('changing the deconstruction contractor (note 28)', () => {
  it('clears the previous contractor\'s dates, so the new one starts from none', () => {
    const s = fresh()
    const before = sel.buildingOverview(s, viewer(U.tom), TIVERNE_ID)!
    expect(before.contractor).toMatchObject({ orgId: FENNICK_ID, datedCount: 5 })
    expect(sel.inventoryView(s, viewer(U.tom), TIVERNE_ID)!.canApplyContractorDates).toBe(true)
    const r = must(appointContractor(s, actor(U.tom), TIVERNE_ID, ORG_IDS.tarnbrook))
    expect(r.value).toEqual({ cleared: 5, previousName: 'Fennick Dismantling' })
    const after = sel.buildingOverview(r.state, viewer(U.tom), TIVERNE_ID)!
    expect(after.contractor).toMatchObject({ orgId: ORG_IDS.tarnbrook, datedCount: 0 })
    const inv = sel.inventoryView(r.state, viewer(U.tom), TIVERNE_ID)!
    expect(inv.canApplyContractorDates).toBe(false)
    expect(inv.applyCount).toBe(0)
    expect(Object.values(r.state.world.items).filter((i) => i.buildingId === TIVERNE_ID && (i.contractorAvailableFrom || i.contractorDatedOn))).toEqual([])
    // Removing the contractor clears them too; lots keep the dates the owner already applied.
    const gone = must(appointContractor(s, actor(U.tom), TIVERNE_ID, null))
    expect(gone.value!.cleared).toBe(5)
    expect(gone.state.world.lots).toEqual(s.world.lots)
    // The same contractor again changes nothing.
    expect(appointContractor(s, actor(U.tom), TIVERNE_ID, FENNICK_ID).state).toBe(s)
  })
})

describe('inviting a contractor by email (note 28)', () => {
  it('appoints a firm already on Tallyard at once', () => {
    const s0 = fresh()
    const r = must(inviteContractorByEmail(s0, actor(U.tom), TIVERNE_ID, ' Dana.Kowalski@tarnbrook.example '))
    expect(r.value).toEqual({ status: 'appointed', orgName: 'Tarnbrook Deconstruction', cleared: 5 })
    expect(r.state.world.buildings[TIVERNE_ID].contractorOrgId).toBe(ORG_IDS.tarnbrook)
  })

  it('waits for a firm not on Tallyard, which becomes the contractor when it signs up with that email', () => {
    const s0 = fresh()
    const r = must(inviteContractorByEmail(s0, actor(U.tom), TIVERNE_ID, 'Lee@Shaw.example'))
    expect(r.value).toEqual({ status: 'waiting', orgName: null, cleared: 0 })
    expect(r.state.world.buildings[TIVERNE_ID].contractorInvite).toEqual({ email: 'lee@shaw.example', invitedAt: NOW, invitedByOrgId: ORG_IDS.ostlea, invitedByUserId: U.tom })
    expect(sel.buildingOverview(r.state, viewer(U.tom), TIVERNE_ID)!.contractorInvite).toEqual({ email: 'lee@shaw.example', invitedText: '8 October 2026' })
    // Fennick stays until the new firm joins.
    expect(r.state.world.buildings[TIVERNE_ID].contractorOrgId).toBe(FENNICK_ID)
    const lee = must(signUpState(r.state, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW }))
    const b = lee.state.world.buildings[TIVERNE_ID]
    const shaw = lee.state.users[lee.value].orgId
    expect(b.contractorOrgId).toBe(shaw)
    expect(b.contractorInvite).toBeNull()
    expect(Object.values(lee.state.world.items).filter((i) => i.buildingId === TIVERNE_ID && i.contractorAvailableFrom !== null)).toEqual([])
    expect(lee.state.notifications.find((n) => n.orgId === shaw)).toMatchObject({ kind: 'appointed', title: 'Ostlea Estates invited you to set availability dates at Tiverne House' })
    expect(lee.state.notifications.find((n) => n.orgId === ORG_IDS.ostlea)).toMatchObject({ kind: 'availability_set', title: 'Shaw Surveys joined and can set dates at Tiverne House' })
    // A firm that only dates buildings reads as a deconstruction contractor, with no Capture page.
    const nav = sel.navModel(lee.state, viewer(lee.value))!
    expect(nav.org.roleLabel).toBe('Deconstruction contractor')
    expect(nav.sections[0].items.map((i) => i.label)).toEqual(['Home'])
  })

  it('does nothing for an owner who signs up with that email, and refuses an email at a firm of another kind', () => {
    const s0 = fresh()
    const r = must(inviteContractorByEmail(s0, actor(U.tom), TIVERNE_ID, 'ash@reed.example'))
    const reed = must(signUpState(r.state, { name: 'Ash Reed', email: 'ash@reed.example', orgName: 'Reed Holdings', orgType: 'Asset owner', salt: 's', passwordHash: 'h', now: NOW }))
    expect(reed.state.world.buildings[TIVERNE_ID].contractorOrgId).toBe(FENNICK_ID)
    expect(resolveContractorInvites(r.state, U.priya, NOW)).toBe(r.state)
    refused(s0, inviteContractorByEmail(s0, actor(U.tom), TIVERNE_ID, 'priya.nair@studiooriel.example'), CONTRACTOR_ERRORS.notFirm)
    refused(s0, inviteContractorByEmail(s0, actor(U.tom), TIVERNE_ID, 'not an email'), CONTRACTOR_ERRORS.email)
    refused(s0, inviteContractorByEmail(s0, actor(U.priya), TIVERNE_ID, 'lee@shaw.example'), ERRORS.role)
  })

  it('can be withdrawn', () => {
    const s0 = fresh()
    const r = must(inviteContractorByEmail(s0, actor(U.dana), HARROWDEN_ID, 'lee@shaw.example'))
    const w = must(withdrawContractorInvite(r.state, actor(U.dana), HARROWDEN_ID))
    expect(w.state.world.buildings[HARROWDEN_ID].contractorInvite).toBeNull()
    const lee = must(signUpState(w.state, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW }))
    expect(lee.state.world.buildings[HARROWDEN_ID].contractorOrgId).toBe(ORG_IDS.tarnbrook)
  })
})
