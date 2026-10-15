import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, NOW, refused, U } from '../../test/fixtures'
import { cancelTesting, recordTestingBooked, recordTestResults, requestTesting, TESTING_ERRORS, type TestingInput } from './testing'
import { ERRORS } from '../access'
import { listingOf } from '../lots'
import { HARROWDEN_ID, itemByTag, lotForItem, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { FENNICK_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import type { AppData, TestResult } from '../types'

const ids = (s: AppData, tags: string[]) => tags.map((t) => itemByTag(s.world, t).id)
const STEEL = ['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06']

function input(s: AppData, patch: Partial<TestingInput> = {}): TestingInput {
  return { buildingId: TIVERNE_ID, itemIds: ids(s, STEEL), services: ['steel_coupon'], companyId: 'tco_brindmoor', preferredFrom: null, message: 'Coupons please.', ...patch }
}

function results(s: AppData, tags: string[], r: Omit<TestResult, 'itemId'>): TestResult[] {
  return ids(s, tags).map((itemId) => ({ itemId, ...r }))
}

describe('requesting testing', () => {
  it('the surveyor asks a company that does the tests, and the owner is told', () => {
    const s0 = fresh()
    const r = must(requestTesting(s0, actor(U.dana), input(s0)))
    const t = r.state.testingRequests[r.value]
    expect(t).toMatchObject({ status: 'requested', companyId: 'tco_brindmoor', services: ['steel_coupon'], requestedByOrgId: ORG_IDS.tarnbrook, bookedFor: null, results: [] })
    expect(t.history).toEqual([{ at: NOW, status: 'requested', byUserId: U.dana, note: '' }])
    const n = r.state.notifications.filter((x) => x.at === NOW)
    expect(n.map((x) => [x.orgId, x.kind, x.title])).toEqual([[ORG_IDS.ostlea, 'testing', 'Dana Kowalski asked Brindmoor Testing to test 5 items at Tiverne House']])
    expect(n[0].body).toBe('Tests: Steel coupon tests. Nothing is sent in the sandbox; the request is recorded here.')
    expect(n[0].href).toBe(`/app/buildings/${TIVERNE_ID}/testing`)
  })

  it('the owner may ask too, and then the surveyor is told', () => {
    const s0 = fresh()
    const r = must(requestTesting(s0, actor(U.tom), input(s0, { itemIds: ids(s0, ['TH-10']), services: ['visual_dimensional', 'masonry'], companyId: 'tco_quenby' })))
    expect(r.state.notifications.filter((x) => x.at === NOW).map((x) => x.orgId)).toEqual([ORG_IDS.tarnbrook])
  })

  it('refuses a test that does not suit the items, a company that does not offer it, and bad dates', () => {
    const s0 = fresh()
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { services: ['masonry'] })), TESTING_ERRORS.services)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { services: [] })), TESTING_ERRORS.services)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { companyId: 'tco_calverd' })), TESTING_ERRORS.companyServices)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { companyId: 'tco_nobody' })), TESTING_ERRORS.company)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { itemIds: [] })), TESTING_ERRORS.items)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { itemIds: ids(s0, ['HC-01']) })), TESTING_ERRORS.items)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { preferredFrom: '2026-10-07' })), TESTING_ERRORS.pastDate)
    refused(s0, requestTesting(s0, actor(U.dana), input(s0, { preferredFrom: '2026-13-01' })), TESTING_ERRORS.badDate)
    refused(s0, requestTesting(s0, actor(U.priya), input(s0)), ERRORS.role)
    const lee = addTestUser(s0, { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    refused(lee.state, requestTesting(lee.state, actor(lee.userId), input(lee.state)), ERRORS.role)
    must(requestTesting(s0, actor(U.dana), input(s0, { preferredFrom: '2026-10-08' })))
    must(requestTesting(s0, actor(U.dana), { ...input(s0), buildingId: HARROWDEN_ID, itemIds: ids(s0, ['HC-02']), services: ['masonry'], companyId: 'tco_quenby' }))
  })
})

describe('booking and results', () => {
  it('records the visit and tells the other side', () => {
    const s0 = fresh()
    const created = must(requestTesting(s0, actor(U.dana), input(s0)))
    const r = must(recordTestingBooked(created.state, actor(U.dana), created.value, { date: '2026-10-20', note: 'Levels 1 and 2' }))
    expect(r.state.testingRequests[created.value]).toMatchObject({ status: 'booked', bookedFor: '2026-10-20' })
    const n = r.state.notifications[0]
    expect(n).toMatchObject({ orgId: ORG_IDS.ostlea, title: 'Testing visit booked at Tiverne House', body: 'Brindmoor Testing on 20 October 2026.' })
    refused(r.state, recordTestingBooked(r.state, actor(U.dana), created.value, { date: '2026-10-01', note: '' }), TESTING_ERRORS.pastDate)
    refused(created.state, recordTestResults(created.state, actor(U.tom), created.value, results(created.state, STEEL, { testStatus: 'tested', grade: 'S355', note: '' })), TESTING_ERRORS.status)
  })

  it('the surveyor cannot record results on shared lots: the owner does', () => {
    const s0 = fresh()
    refused(s0, recordTestResults(s0, actor(U.dana), TIVERNE_TESTING_ID, results(s0, STEEL, { testStatus: 'tested', grade: 'S355', note: '' })), TESTING_ERRORS.locked)
  })

  it('the owner records results, which show on the listing', () => {
    const s0 = fresh()
    const r = must(recordTestResults(s0, actor(U.tom), TIVERNE_TESTING_ID, results(s0, STEEL, { testStatus: 'tested', grade: 'S355', note: 'Coupon 4 of 5' })))
    const th02 = itemByTag(r.state.world, 'TH-02')
    expect(th02).toMatchObject({ testStatus: 'tested', grade: 'S355' })
    expect(listingOf(r.state.world, lotForItem(r.state.world, th02.id))).toMatchObject({ testStatus: 'tested', grade: 'S355' })
    expect(r.state.testingRequests[TIVERNE_TESTING_ID].status).toBe('results')
    const n = r.state.notifications.find((x) => x.orgId === ORG_IDS.tarnbrook && x.at === NOW)!
    expect(n).toMatchObject({ kind: 'testing', title: 'Test results recorded at Tiverne House', body: '5 items updated. Test status now shows on any listing.' })
    refused(r.state, cancelTesting(r.state, actor(U.tom), TIVERNE_TESTING_ID, ''), TESTING_ERRORS.status)
  })

  it('needs one result per item, a status the tests allow and a grade only from a grade test on steel', () => {
    const s0 = fresh()
    refused(s0, recordTestResults(s0, actor(U.tom), TIVERNE_TESTING_ID, results(s0, STEEL.slice(1), { testStatus: 'tested', grade: null, note: '' })), TESTING_ERRORS.results)
    const visual = must(requestTesting(s0, actor(U.tom), input(s0, { itemIds: ids(s0, ['TH-07', 'TH-01']), services: ['visual_dimensional'] })))
    const booked = must(recordTestingBooked(visual.state, actor(U.tom), visual.value, { date: '2026-10-12', note: '' })).state
    refused(booked, recordTestResults(booked, actor(U.tom), visual.value, results(booked, ['TH-07', 'TH-01'], { testStatus: 'tested', grade: null, note: '' })), TESTING_ERRORS.results)
    refused(booked, recordTestResults(booked, actor(U.tom), visual.value, results(booked, ['TH-07', 'TH-01'], { testStatus: 'inspected', grade: 'S355', note: '' })), TESTING_ERRORS.results)
    const ok = must(recordTestResults(booked, actor(U.tom), visual.value, results(booked, ['TH-07', 'TH-01'], { testStatus: 'inspected', grade: null, note: '' })))
    expect(itemByTag(ok.state.world, 'TH-07').testStatus).toBe('inspected')
    expect(itemByTag(ok.state.world, 'TH-01').grade).toBe('unknown')
  })

  it('cancels a request without results, once', () => {
    const s0 = fresh()
    const s = must(cancelTesting(s0, actor(U.dana), TIVERNE_TESTING_ID, 'Postponed')).state
    expect(s.testingRequests[TIVERNE_TESTING_ID].status).toBe('cancelled')
    expect(s.testingRequests[TIVERNE_TESTING_ID].history.at(-1)).toMatchObject({ status: 'cancelled', note: 'Postponed' })
    refused(s, cancelTesting(s, actor(U.dana), TIVERNE_TESTING_ID, ''), TESTING_ERRORS.status)
    refused(s0, cancelTesting(s0, actor(U.dana), 'tst_nothere', ''), TESTING_ERRORS.noRequest)
  })
})
