// Audit of 16 October 2026, owner package, after the adversarial review: a claim for a building the owner already has
// joins it instead of making a second copy; withdrawn requests leave no 'Confirm it is yours' behind; a submitted
// survey takes no more items; moved items take the receiving building's prefix; an invited contractor's arrival says
// whose dates go; and the smaller fixes (wording, breadcrumbs, the contractor's home, building activity).
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, NOW, refused, U, viewer } from '../../test/fixtures'
import { CLAIM_ERRORS, confirmBuildingClaimInto, createSurveyBuilding, decideBuildingClaim, mergeSurveyBuilding, requestBuildingClaim, withdrawBuildingClaim, type SurveyBuildingInput } from './claims'
import { appointSurveyor, createBuilding, type NewBuildingInput } from './owner'
import { datesClearedText, inviteContractorByEmail } from './contractor'
import { captureItem } from './surveyor'
import { signUpState } from './auth'
import { draftFromText } from '../capture'
import { ERRORS, buildingsOfUser } from '../access'
import { claimNoticeKey } from '../notifications'
import { ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_CLAIM_ID, AMBREY_ID } from '../../sandbox/seed-owner-surveyor'
import * as sel from '../selectors'
import { pageLocation } from '../selectors/arch-breadcrumbs'
import { buildingActivityDays } from '../selectors/arch-activity'
import { routeAccess } from '../selectors/nav'
import { ownerDashboard } from '../selectors/home-owner'
import { surveyorDashboard } from '../selectors/home-surveyor'
import { preferredLine, testingRequestText } from '../selectors/testing'
import type { AppData } from '../types'

const TOM_EMAIL = 'tom.ashby@ostlea.example'

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

function capture(s: AppData, buildingId: string, text = '30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room'): AppData {
  const d = draftFromText(text)
  return must(captureItem(s, actor(U.dana), { buildingId, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: 'A', location: d.location, notes: '', photoIds: [], expectedAvailableFrom: null })).state
}

/** Dana adds Corbel Yard, captures two items and asks Tom to confirm it; Tom then adds his own and appoints Tarnbrook. */
function claimAndDuplicate(): { s: AppData; mine: string; toms: string; claimId: string } {
  let s = fresh()
  const a = must(createSurveyBuilding(s, actor(U.dana), { ...CORBEL, owner: { email: TOM_EMAIL, name: 'Tom Ashby', message: '' } }))
  s = capture(a.state, a.value)
  s = capture(s, a.value, '12 no. 305x165x40 UB, 5.0m long, bolted, level 2')
  const claimId = Object.values(s.buildingClaims).find((c) => c.buildingId === a.value)!.id
  const t = must(createBuilding(s, actor(U.tom), TOMS_CORBEL))
  return { s: t.state, mine: a.value, toms: t.value, claimId }
}

const corbels = (s: AppData) => buildingsOfUser(s, U.tom).filter((b) => b.name === 'Corbel Yard')

describe('confirming a building the owner already has (review finding on note 26)', () => {
  it('warns the owner on the request, and only the owner', () => {
    const { s, mine, toms, claimId } = claimAndDuplicate()
    const row = sel.claimRowsForOwner(s, viewer(U.tom)).find((r) => r.id === claimId)!
    expect(row.duplicate).toEqual({
      intoId: toms,
      intoName: 'Corbel Yard',
      intoAddress: '9 Lantry Street, London E1',
      canMerge: true,
      warning: "You already have Corbel Yard with Tarnbrook Deconstruction as surveyor. Confirming adds the surveyor's 2 items to it, so you keep one record.",
      confirmLabel: 'Confirm as your Corbel Yard',
    })
    expect(sel.claimDuplicateOf(s, viewer(U.dana), claimId)).toBeNull()
    expect(sel.claimDuplicateOf(s, viewer(U.priya), claimId)).toBeNull()
    // The seeded Ambrey House request has no twin.
    expect(sel.claimRowsForOwner(s, viewer(U.tom)).find((r) => r.id === AMBREY_CLAIM_ID)!.duplicate).toBeNull()
    expect(mine).not.toBe(toms)
  })

  it('confirms into the existing building: one Corbel Yard with the items, the request accepted, the firm told', () => {
    const { s, mine, toms, claimId } = claimAndDuplicate()
    const items = Object.values(s.world.items).filter((i) => i.buildingId === mine)
    const r = must(confirmBuildingClaimInto(s, actor(U.tom), claimId, toms, 'Same building.'))
    expect(r.value).toEqual({ moved: 2, intoId: toms, intoName: 'Corbel Yard', retagged: false })
    expect(r.state.world.buildings[mine]).toBeUndefined()
    expect(corbels(r.state).map((b) => b.id)).toEqual([toms])
    for (const i of items) expect(r.state.world.items[i.id].buildingId).toBe(toms)
    expect(r.state.buildingClaims[claimId]).toMatchObject({ buildingId: toms, status: 'accepted', decidedByUserId: U.tom, decisionNote: 'Same building.' })
    expect(r.state.world.buildings[toms].programme.dismantlingStart).toBe('2027-06-07')
    expect(sel.inventoryView(r.state, viewer(U.tom), toms)!.rows).toHaveLength(2)
    const told = r.state.notifications.find((n) => n.orgId === ORG_IDS.tarnbrook)!
    expect(told).toMatchObject({ kind: 'building_claim', title: 'Ostlea Estates confirmed Corbel Yard', body: 'They already had it as Corbel Yard, so your 2 items moved there. You stay appointed as its surveyor.', href: `/app/buildings/${toms}` })
    // Nothing left to merge on Dana's side, and no Requests card waits.
    expect(sel.mergeCandidates(r.state, viewer(U.dana))).toEqual([])
    expect(sel.pendingClaimCount(r.state, ORG_IDS.ostlea)).toBe(1)
    expect(sel.claimRowsForOwner(r.state, viewer(U.tom)).find((x) => x.id === claimId)!.status).toBe('accepted')
  })

  it('still lets the owner add it as a separate building', () => {
    const { s, claimId } = claimAndDuplicate()
    const r = must(decideBuildingClaim(s, actor(U.tom), claimId, 'accepted', ''))
    expect(corbels(r.state)).toHaveLength(2)
  })

  it('refuses another surveyor, someone else\'s building, a submitted survey and anyone but the addressee', () => {
    const { s, toms, claimId } = claimAndDuplicate()
    const moved = must(appointSurveyor(s, actor(U.tom), toms, null)).state
    refused(moved, confirmBuildingClaimInto(moved, actor(U.tom), claimId, toms, ''), CLAIM_ERRORS.confirmInto)
    expect(sel.claimRowsForOwner(moved, viewer(U.tom)).find((r) => r.id === claimId)!.duplicate).toBeNull()
    refused(s, confirmBuildingClaimInto(s, actor(U.dana), claimId, toms, ''), ERRORS.role)
    refused(s, confirmBuildingClaimInto(s, actor(U.tom), claimId, TIVERNE_ID, ''), CLAIM_ERRORS.mergeSubmitted)
    refused(s, confirmBuildingClaimInto(s, actor(U.tom), AMBREY_CLAIM_ID, AMBREY_ID, ''), CLAIM_ERRORS.confirmInto)
  })

  it('says when the owner\'s twin is submitted, and offers no merge', () => {
    let s = fresh()
    const a = must(createSurveyBuilding(s, actor(U.dana), { ...CORBEL, name: 'Tiverne House', address: s.world.buildings[TIVERNE_ID].address, owner: { email: TOM_EMAIL, name: '', message: '' } }))
    s = a.state
    const claimId = Object.values(s.buildingClaims).find((c) => c.buildingId === a.value)!.id
    const dup = sel.claimDuplicateOf(s, viewer(U.tom), claimId)!
    expect(dup).toMatchObject({ intoId: TIVERNE_ID, canMerge: false })
    expect(dup.warning).toBe("You already have Tiverne House with Tarnbrook Deconstruction as surveyor. Its survey is submitted, so the surveyor's 0 items cannot join it. Add this as a separate building, or say it is not yours.")
  })
})

describe('stale confirmation notices (review finding on note 26)', () => {
  const confirmNotices = (s: AppData) => s.notifications.filter((n) => n.orgId === ORG_IDS.ostlea && n.kind === 'building_claim')

  it('removes the owner\'s notice when the surveyor moves the building into an appointment', () => {
    const { s, mine, toms, claimId } = claimAndDuplicate()
    expect(confirmNotices(s).some((n) => n.key === claimNoticeKey(claimId))).toBe(true)
    const r = must(mergeSurveyBuilding(s, actor(U.dana), mine, toms))
    expect(confirmNotices(r.state).some((n) => n.key === claimNoticeKey(claimId))).toBe(false)
    // The seeded Ambrey House notice stays: its request still waits.
    expect(confirmNotices(r.state).some((n) => n.key === claimNoticeKey(AMBREY_CLAIM_ID))).toBe(true)
  })

  it('removes it when the request is withdrawn, the seeded one included', () => {
    const s = fresh()
    expect(confirmNotices(s)).toHaveLength(1)
    const r = must(withdrawBuildingClaim(s, actor(U.dana), AMBREY_CLAIM_ID))
    expect(confirmNotices(r.state)).toHaveLength(0)
    // An older notice with no key is found by the building's name and address.
    const legacy: AppData = { ...s, notifications: s.notifications.map((n) => (n.kind === 'building_claim' ? { ...n, key: null } : n)) }
    expect(confirmNotices(must(withdrawBuildingClaim(legacy, actor(U.dana), AMBREY_CLAIM_ID)).state)).toHaveLength(0)
  })

  it('marks the notice read for the person who answers the request, whichever way', () => {
    const notice = (s: AppData) => s.notifications.find((n) => n.key === claimNoticeKey(AMBREY_CLAIM_ID))!
    const s = fresh()
    expect(notice(s).readBy).not.toContain(U.tom)
    expect(notice(must(decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'accepted', '')).state).readBy).toContain(U.tom)
    expect(notice(must(decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'declined', '')).state).readBy).toContain(U.tom)
    const { s: dup, toms, claimId } = claimAndDuplicate()
    const into = must(confirmBuildingClaimInto(dup, actor(U.tom), claimId, toms, ''))
    expect(into.state.notifications.find((n) => n.key === claimNoticeKey(claimId))!.readBy).toContain(U.tom)
  })

  it('keys a new request\'s notice to it', () => {
    const s = fresh()
    const a = must(createSurveyBuilding(s, actor(U.dana), CORBEL))
    const r = must(requestBuildingClaim(a.state, actor(U.dana), a.value, { email: TOM_EMAIL, name: '', message: '' }))
    expect(r.state.notifications.find((n) => n.orgId === ORG_IDS.ostlea)!.key).toBe(claimNoticeKey(r.value))
  })
})

describe('moving into an appointment (review findings on note 26)', () => {
  it('leaves out and refuses a submitted survey', () => {
    let s = fresh()
    const a = must(createSurveyBuilding(s, actor(U.dana), { ...CORBEL, name: 'Tiverne House', address: s.world.buildings[TIVERNE_ID].address }))
    s = capture(a.state, a.value)
    expect(sel.mergeCandidates(s, viewer(U.dana))).toEqual([])
    expect(sel.mergeTargets(s, viewer(U.dana), a.value).map((t) => t.id)).not.toContain(TIVERNE_ID)
    refused(s, mergeSurveyBuilding(s, actor(U.dana), a.value, TIVERNE_ID), CLAIM_ERRORS.mergeSubmitted)
  })

  it('gives moved items the receiving building\'s prefix when its name differs', () => {
    let s = fresh()
    const a = must(createSurveyBuilding(s, actor(U.dana), CORBEL))
    s = capture(a.state, a.value)
    s = capture(s, a.value, '12 no. 305x165x40 UB, 5.0m long, bolted, level 2')
    const t = must(createBuilding(s, actor(U.tom), { ...TOMS_CORBEL, name: 'The Corbel Building' }))
    const r = must(mergeSurveyBuilding(t.state, actor(U.dana), a.value, t.value))
    expect(r.value.retagged).toBe(true)
    const tags = Object.values(r.state.world.items)
      .filter((i) => i.buildingId === t.value)
      .map((i) => i.tag)
      .sort()
    expect(tags).toEqual(['TCB-01', 'TCB-02'])
  })

  it('words the prompt on the unlinked building for the record the items leave', () => {
    const { s, mine } = claimAndDuplicate()
    const c = sel.mergeCandidates(s, viewer(U.dana)).find((x) => x.fromId === mine)!
    expect(c.unlinkedPrompt).toBe("Ostlea Estates has since appointed you to Corbel Yard. Move this building's 2 captured items into it?")
    expect(c.unlinkedActionLabel).toBe('Move into their Corbel Yard')
  })
})

describe('a waiting contractor invite says whose dates go (review finding on note 28)', () => {
  it('words the cleared dates for now and for later', () => {
    expect(datesClearedText('Fennick Dismantling', 5, 'done')).toBe("Fennick Dismantling's 5 dates were cleared.")
    expect(datesClearedText('Fennick Dismantling', 1, 'done')).toBe("Fennick Dismantling's date was cleared.")
    expect(datesClearedText('Fennick Dismantling', 1, 'on_join')).toBe("Fennick Dismantling's date is cleared when they join.")
    expect(datesClearedText('Fennick Dismantling', 0, 'on_join')).toBeNull()
    expect(datesClearedText(null, 3, 'done')).toBeNull()
  })

  it('says nothing is cleared when the building has no contractor', () => {
    const s = fresh()
    const r = must(inviteContractorByEmail(s, actor(U.dana), AMBREY_ID, 'lee@shaw.example'))
    expect(r.value).toMatchObject({ status: 'waiting', clearsOnJoin: 0, previousName: null })
    expect(sel.buildingOverview(r.state, viewer(U.dana), AMBREY_ID)!.contractorInvite!.clearsText).toBeNull()
  })

  it('reports how many were cleared to the inviter when the invited firm joins', () => {
    const s = fresh()
    const r = must(inviteContractorByEmail(s, actor(U.dana), TIVERNE_ID, 'lee@shaw.example'))
    const lee = must(signUpState(r.state, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW }))
    const toDana = lee.state.notifications.find((n) => n.orgId === ORG_IDS.tarnbrook && n.kind === 'availability_set')!
    expect(toDana.body).toContain("Fennick Dismantling's 5 dates were cleared.")
    const toTom = lee.state.notifications.find((n) => n.orgId === ORG_IDS.ostlea && n.kind === 'availability_set')!
    expect(toTom.body).toContain("Fennick Dismantling's 5 dates were cleared.")
  })
})

describe('the smaller review findings', () => {
  it('calls published and shared lots offered on the owner\'s Items surveyed tile', () => {
    const d = ownerDashboard(fresh(), viewer(U.tom))!
    expect(d.stats.donorBuildings).toBe(1)
    expect(d.metrics.itemsSub).toBe(`Across 1 donor building. ${d.stats.listed + d.stats.shared} offered: ${d.stats.listed} published, ${d.stats.shared} shared, ${d.stats.reserved} reserved`)
    expect(d.metrics.itemsSub).not.toContain('listed')
  })

  it('crumbs a building the firm added under Not yet linked, and an appointment under Appointments alone', () => {
    const s = fresh()
    expect(pageLocation(s, viewer(U.dana), `/app/buildings/${AMBREY_ID}`).crumbs.map((c) => c.label)).toEqual(['Appointments', 'Not yet linked', 'Ambrey House'])
    expect(pageLocation(s, viewer(U.dana), `/app/buildings/${AMBREY_ID}`).crumbs[1].href).toBe('/app/buildings#not-yet-linked')
    expect(pageLocation(s, viewer(U.dana), `/app/buildings/${TIVERNE_ID}`).crumbs.map((c) => c.label)).toEqual(['Appointments', 'Tiverne House'])
    expect(pageLocation(s, viewer(U.tom), `/app/buildings/${TIVERNE_ID}`).crumbs.map((c) => c.label)).toEqual(['Donor buildings', 'Tiverne House'])
  })

  it('gives a contractor-only firm dating tiles, not capture and survey counts', () => {
    const s = fresh()
    expect(surveyorDashboard(s, viewer(U.dana))!.contractorTiles).toBeNull()
    const r = must(inviteContractorByEmail(s, actor(U.tom), TIVERNE_ID, 'lee@shaw.example'))
    const lee = must(signUpState(r.state, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW }))
    const items = Object.values(lee.state.world.items).filter((i) => i.buildingId === TIVERNE_ID).length
    expect(surveyorDashboard(lee.state, viewer(lee.value))!.contractorTiles).toEqual({
      buildings: 1,
      dated: 0,
      items,
      undated: items,
      undatedState: { state: 'warning', label: 'To do' },
      buildingsSubText: '1 building with items still to date',
      datedSubText: `Of ${items} items. The owner decides what buyers see`,
      undatedSubText: 'Items with no expected date yet',
    })
  })

  it('opens a building\'s full activity to everyone with a side on it, in their own words', () => {
    const s = fresh()
    const path = `/app/buildings/${TIVERNE_ID}/activity`
    expect(routeAccess(s, viewer(U.tom), path)).toBe('ok')
    expect(routeAccess(s, viewer(U.dana), path)).toBe('ok')
    expect(routeAccess(s, viewer(U.priya), path)).toBe('forbidden')
    expect(routeAccess(s, viewer(U.tom), `${path}/x`)).toBe('not_found')
    expect(pageLocation(s, viewer(U.tom), path).crumbs.map((c) => c.label)).toEqual(['Donor buildings', 'Tiverne House', 'Activity'])
    const tom = buildingActivityDays(s, viewer(U.tom), TIVERNE_ID)!
    const tomRows = tom.days.flatMap((d) => d.rows)
    expect(tom.total).toBe(tomRows.length)
    expect(tom.total).toBeGreaterThan(sel.buildingOverview(s, viewer(U.tom), TIVERNE_ID)!.activity.length - 1)
    const readable = s.activity.filter((e) => e.buildingId === TIVERNE_ID && e.orgIds.includes(ORG_IDS.ostlea)).map((e) => e.id)
    expect(tomRows.map((r) => r.id).sort()).toEqual(readable.sort())
    expect(buildingActivityDays(s, viewer(U.priya), TIVERNE_ID)).toBeNull()
    // Ambrey House is Tarnbrook's alone until Tom confirms it.
    expect(buildingActivityDays(s, viewer(U.tom), AMBREY_ID)).toBeNull()
    expect(buildingActivityDays(s, viewer(U.dana), AMBREY_ID)!.total).toBeGreaterThan(0)
  })

  it('writes the preferred date the same way on screen and in the text', () => {
    expect(preferredLine(null)).toBe('Preferred from: no preference')
    expect(preferredLine('20 October 2026')).toBe('Preferred from: 20 October 2026')
    const row = sel.testingView(fresh(), viewer(U.tom), TIVERNE_ID)!.rows[0]
    expect(testingRequestText(row.sheet)).toContain(row.sheet.preferredLine)
  })
})
