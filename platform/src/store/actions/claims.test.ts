import { describe, it, expect } from 'vitest'
import { actor, fresh, must, NOW, refused, U } from '../../test/fixtures'
import { CLAIM_ERRORS, createSurveyBuilding, decideBuildingClaim, deleteSurveyBuilding, requestBuildingClaim, withdrawBuildingClaim, type SurveyBuildingInput } from './claims'
import { captureItem, submitSurvey, SURVEY_ERRORS } from './surveyor'
import { signUpState } from './auth'
import { draftFromText } from '../capture'
import { ERRORS, buildingSide } from '../access'
import { ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_CLAIM_ID, AMBREY_ID } from '../../sandbox/seed-owner-surveyor'
import type { AppData } from '../types'

const CORBEL: SurveyBuildingInput = {
  name: 'Corbel Yard',
  address: '9 Lantry Street, London E1',
  postcodeDistrict: 'e1',
  localAuthority: 'Tower Hamlets',
  region: 'Inner London East',
  yearBuilt: 1988,
  storeys: 5,
  giaM2: 3000,
  structureType: '',
  structure: [{ kind: 'frame', material: null, systemId: 'frame_steel_bolted', note: '' }],
  stripOutStart: '2027-05-03',
  dismantlingStart: '2027-06-07',
  clearBy: '2027-08-27',
  owner: null,
}

const ASK_TOM = { email: ' Tom.Ashby@ostlea.example ', name: 'Tom Ashby', message: 'We surveyed it ahead of the strip-out tender.' }

function capture(s: AppData, userId: string, buildingId: string): AppData {
  const d = draftFromText('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
  return must(captureItem(s, actor(userId), { buildingId, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: 'A', location: d.location, notes: '', photoIds: [], expectedAvailableFrom: null })).state
}

describe('a surveyor adds a building before any appointment', () => {
  it('records it private to the firm, unlinked, with its structure', () => {
    const s0 = fresh()
    const r = must(createSurveyBuilding(s0, actor(U.dana), CORBEL))
    const b = r.state.world.buildings[r.value]
    expect(b).toMatchObject({ ownerOrgId: null, surveyorOrgId: ORG_IDS.tarnbrook, createdByOrgId: ORG_IDS.tarnbrook, contractorOrgId: null, postcodeDistrict: 'E1', sellerType: 'Asset owner' })
    expect(b.structure).toEqual([{ kind: 'frame', material: 'steel', systemId: 'frame_steel_bolted', note: '' }])
    expect(r.state.surveys[r.value]).toMatchObject({ status: 'not_started', appointedAt: null })
    expect(r.state.activity[0]).toMatchObject({ actor: 'Dana Kowalski', text: 'added Corbel Yard to survey', orgIds: [ORG_IDS.tarnbrook] })
    expect(Object.values(r.state.buildingClaims).filter((c) => c.buildingId === r.value)).toEqual([])
    expect(buildingSide(r.state, U.dana, r.value)).toBe('surveyor')
    expect(buildingSide(r.state, U.tom, r.value)).toBeNull()
    expect(r.state.notifications).toBe(s0.notifications)
  })

  it('asks the owner in the same step, and only the matching owner organisation hears of it', () => {
    const s0 = fresh()
    const r = must(createSurveyBuilding(s0, actor(U.dana), { ...CORBEL, owner: ASK_TOM }))
    const claim = Object.values(r.state.buildingClaims).find((c) => c.buildingId === r.value)!
    expect(claim).toMatchObject({ status: 'pending', ownerEmail: 'tom.ashby@ostlea.example', ownerName: 'Tom Ashby', surveyorOrgId: ORG_IDS.tarnbrook, requestedByUserId: U.dana })
    const fresh_ = r.state.notifications.filter((n) => n.at === NOW)
    expect(fresh_.map((n) => [n.orgId, n.kind, n.title, n.href])).toEqual([[ORG_IDS.ostlea, 'building_claim', 'Tarnbrook Deconstruction surveyed a building for you', '/app/requests?tab=buildings']])
    expect(fresh_[0].body).toBe('Corbel Yard, 9 Lantry Street, London E1. Confirm it is yours to see what it holds.')
  })

  it('refuses a bad email, another role and a second pending request', () => {
    const s0 = fresh()
    refused(s0, createSurveyBuilding(s0, actor(U.dana), { ...CORBEL, owner: { ...ASK_TOM, email: 'tom' } }), CLAIM_ERRORS.email)
    refused(s0, createSurveyBuilding(s0, actor(U.tom), CORBEL), ERRORS.role)
    refused(s0, createSurveyBuilding(s0, actor(U.dana), { ...CORBEL, structure: [{ kind: 'floors', material: null, systemId: 'frame_steel_bolted', note: '' }] }), 'Choose a system that matches the element and material.')
    refused(s0, requestBuildingClaim(s0, actor(U.dana), AMBREY_ID, ASK_TOM), CLAIM_ERRORS.pending)
    refused(s0, requestBuildingClaim(s0, actor(U.dana), TIVERNE_ID, ASK_TOM), CLAIM_ERRORS.notCreator)
  })
})

describe('the owner confirms or declines', () => {
  it('only an owner organisation with a member using the email may decide', () => {
    const s0 = fresh()
    const reed = must(signUpState(s0, { name: 'Ash Reed', email: 'ash@reed.example', orgName: 'Reed Holdings', orgType: 'Asset owner', salt: 's', passwordHash: 'h', now: NOW }))
    refused(reed.state, decideBuildingClaim(reed.state, actor(reed.value), AMBREY_CLAIM_ID, 'accepted', ''), CLAIM_ERRORS.notAddressed)
    refused(s0, decideBuildingClaim(s0, actor(U.dana), AMBREY_CLAIM_ID, 'accepted', ''), ERRORS.role)
    refused(s0, decideBuildingClaim(s0, actor(U.isla), AMBREY_CLAIM_ID, 'accepted', ''), ERRORS.role)
  })

  it('accepting links the building to the owner, starts the appointment and tells the surveyor', () => {
    const s0 = fresh()
    const s = must(decideBuildingClaim(s0, actor(U.tom), AMBREY_CLAIM_ID, 'accepted', '')).state
    expect(s.world.buildings[AMBREY_ID].ownerOrgId).toBe(ORG_IDS.ostlea)
    expect(s.surveys[AMBREY_ID]).toMatchObject({ status: 'in_progress', appointedAt: NOW })
    expect(s.buildingClaims[AMBREY_CLAIM_ID]).toMatchObject({ status: 'accepted', decidedByUserId: U.tom })
    expect(buildingSide(s, U.tom, AMBREY_ID)).toBe('owner')
    expect(buildingSide(s, U.dana, AMBREY_ID)).toBe('surveyor')
    const n = s.notifications.find((x) => x.orgId === ORG_IDS.tarnbrook && x.at === NOW)!
    expect(n).toMatchObject({ kind: 'building_claim', title: 'Ostlea Estates confirmed Ambrey House', body: 'It is in their portfolio now. You stay appointed as its surveyor.', href: `/app/buildings/${AMBREY_ID}` })
    expect(s.activity[0]).toMatchObject({ actor: 'Tom Ashby', text: 'confirmed Ambrey House as their building' })
    expect(s.activity[0].orgIds.sort()).toEqual([ORG_IDS.ostlea, ORG_IDS.tarnbrook].sort())
    refused(s, decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'declined', ''), CLAIM_ERRORS.notPending)
  })

  it('declining keeps the building unlinked and never names the organisation that declined', () => {
    const s0 = fresh()
    const s = must(decideBuildingClaim(s0, actor(U.tom), AMBREY_CLAIM_ID, 'declined', 'We sold this building in 2025.')).state
    expect(s.world.buildings[AMBREY_ID].ownerOrgId).toBeNull()
    expect(s.buildingClaims[AMBREY_CLAIM_ID]).toMatchObject({ status: 'declined', decisionNote: 'We sold this building in 2025.' })
    const toSurveyor = [...s.notifications.filter((n) => n.orgId === ORG_IDS.tarnbrook && n.at === NOW), ...s.activity.filter((e) => e.orgIds.includes(ORG_IDS.tarnbrook) && e.at === NOW)]
    expect(toSurveyor.length).toBeGreaterThan(0)
    const text = JSON.stringify(toSurveyor)
    expect(text).toContain('Ambrey House was not confirmed')
    for (const x of ['Ostlea', 'Tom Ashby', U.tom]) expect(text).not.toContain(x)
    // Dana can ask again once the request is answered.
    must(requestBuildingClaim(s, actor(U.dana), AMBREY_ID, { email: 'someone@else.example', name: '', message: '' }))
  })

  it('the firm can withdraw a waiting request, and nobody else can', () => {
    const s0 = fresh()
    refused(s0, withdrawBuildingClaim(s0, actor(U.tom), AMBREY_CLAIM_ID), ERRORS.role)
    const s = must(withdrawBuildingClaim(s0, actor(U.dana), AMBREY_CLAIM_ID)).state
    expect(s.buildingClaims[AMBREY_CLAIM_ID].status).toBe('withdrawn')
    refused(s, decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'accepted', ''), CLAIM_ERRORS.notPending)
    refused(s, withdrawBuildingClaim(s, actor(U.dana), AMBREY_CLAIM_ID), CLAIM_ERRORS.notPending)
  })

  it('a request to an email with no account waits, and becomes decidable once that person signs up as a donor building owner', () => {
    const s0 = fresh()
    const r = must(createSurveyBuilding(s0, actor(U.dana), { ...CORBEL, owner: { email: 'ash@reed.example', name: 'Ash Reed', message: '' } }))
    expect(r.state.notifications.filter((n) => n.at === NOW && n.kind === 'building_claim')).toEqual([])
    const claim = Object.values(r.state.buildingClaims).find((c) => c.buildingId === r.value)!
    const reed = must(signUpState(r.state, { name: 'Ash Reed', email: 'Ash@Reed.example', orgName: 'Reed Holdings', orgType: 'Asset owner', salt: 's', passwordHash: 'h', now: NOW }))
    const s = must(decideBuildingClaim(reed.state, actor(reed.value), claim.id, 'accepted', '')).state
    expect(s.world.buildings[r.value].ownerOrgId).toBe(s.users[reed.value].orgId)
  })
})

describe('the survey waits for the link', () => {
  it('submitting is refused while unlinked, then allowed once the owner confirms', () => {
    let s = fresh()
    refused(s, submitSurvey(s, actor(U.dana), AMBREY_ID), SURVEY_ERRORS.unlinked)
    s = must(decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'accepted', '')).state
    const r = must(submitSurvey(s, actor(U.dana), AMBREY_ID))
    expect(r.state.notifications.find((n) => n.kind === 'survey_submitted' && n.at === NOW)!.orgId).toBe(ORG_IDS.ostlea)
  })

  it('capturing in an unlinked building notifies nobody', () => {
    const s0 = fresh()
    const s = capture(s0, U.dana, AMBREY_ID)
    expect(s.notifications).toBe(s0.notifications)
    expect(s.activity[0]).toMatchObject({ text: 'captured AH-03', orgIds: [ORG_IDS.tarnbrook] })
  })
})

describe('deleting a building the firm added', () => {
  it('removes it with its items, lots and records while unlinked, and withdraws the waiting request', () => {
    const s0 = fresh()
    const itemIds = Object.values(s0.world.items).filter((i) => i.buildingId === AMBREY_ID).map((i) => i.id)
    expect(itemIds).toHaveLength(2)
    refused(s0, deleteSurveyBuilding(s0, actor(U.tom), AMBREY_ID), ERRORS.role)
    const s = must(deleteSurveyBuilding(s0, actor(U.dana), AMBREY_ID)).state
    expect(s.world.buildings[AMBREY_ID]).toBeUndefined()
    for (const id of itemIds) expect(s.world.items[id]).toBeUndefined()
    expect(Object.values(s.world.lots).some((l) => itemIds.includes(l.itemId))).toBe(false)
    expect(s.surveys[AMBREY_ID]).toBeUndefined()
    expect(s.buildingClaims[AMBREY_CLAIM_ID].status).toBe('withdrawn')
  })

  it('is refused once the owner has confirmed it, and for a building the firm did not add', () => {
    let s = fresh()
    refused(s, deleteSurveyBuilding(s, actor(U.dana), TIVERNE_ID), CLAIM_ERRORS.notCreator)
    s = must(decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'accepted', '')).state
    refused(s, deleteSurveyBuilding(s, actor(U.dana), AMBREY_ID), CLAIM_ERRORS.deleteLinked)
  })
})
