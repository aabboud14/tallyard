// Testing requests (owner-surveyor design 14.4.6): the owner or the surveyor asks one of the testing companies
// (reference data) to inspect or test items, records the visit and the results, and the other side is told.
// Results update each item's test status and steel grade, which buyers see on listings. On shared or published lots
// only the owner records results, as only the owner changes what a listing says.
import type { SteelGrade } from '../../domain/types'
import { formatDate, isOnOrBefore } from '../../domain/dates'
import { TEST_SERVICE_ORDER, TEST_SERVICES, testingCompanyById } from '../../domain/reference/testing'
import { companiesFor, recordsGrade, resultStatusesFor, servicesForFamilies } from '../../domain/engines/testing'
import type { ActionResult, Actor, AppData, TestingRequest, TestResult, TestService } from '../types'
import { ERRORS, buildingOrgIds, buildingSide, canCaptureIn } from '../access'
import { mint } from '../ids'
import { acceptedReservation, lotOfItem } from '../lots'
import { listJoin, log, notify, plural } from '../notifications'
import { acting, clean, fail, isIsoDate, ok, withWorld, type Acting } from './common'

export const TESTING_ERRORS = {
  items: 'Choose at least one item.',
  services: 'Choose at least one test.',
  company: 'Choose a testing company.',
  companyServices: 'This company does not offer every test you chose.',
  badDate: 'Enter a valid date.',
  pastDate: 'The date must be today or later.',
  noRequest: 'That testing request could not be found.',
  status: 'This request cannot change now.',
  results: 'Record a result for every item.',
  locked: 'Some items are shared or published. The owner records results for those.',
  reserved: 'A reserved lot cannot change.',
} as const

export type TestingInput = { buildingId: string; itemIds: string[]; services: TestService[]; companyId: string; preferredFrom: string | null; message: string }

/** The organisation on the other side of the building from the actor: the owner for a surveyor, the surveyor for an owner. */
function otherSide(state: AppData, a: Acting, buildingId: string): string[] {
  const b = state.world.buildings[buildingId]
  const side = buildingSide(state, a.user.id, buildingId)
  const other = side === 'owner' ? b.surveyorOrgId : side === 'surveyor' ? b.ownerOrgId : null
  return other && other !== a.org.id ? [other] : []
}

function withRequest(state: AppData, r: TestingRequest): AppData {
  return { ...state, testingRequests: { ...state.testingRequests, [r.id]: r } }
}

/** The owner or the surveyor asks a testing company to test items of the building. Returns the request ID. */
export function requestTesting(state: AppData, actor: Actor, input: TestingInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[input.buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!canCaptureIn(state, actor.userId, input.buildingId)) return fail(state, ERRORS.role)
  const itemIds = [...new Set(input.itemIds)]
  if (itemIds.length === 0 || itemIds.some((id) => state.world.items[id]?.buildingId !== input.buildingId)) return fail(state, TESTING_ERRORS.items)
  const services = TEST_SERVICE_ORDER.filter((x) => input.services.includes(x))
  const allowed = servicesForFamilies([...new Set(itemIds.map((id) => state.world.items[id].family))])
  if (services.length === 0 || services.length !== new Set(input.services).size || services.some((x) => !allowed.includes(x))) return fail(state, TESTING_ERRORS.services)
  const company = testingCompanyById(input.companyId)
  if (!company) return fail(state, TESTING_ERRORS.company)
  if (!companiesFor(services, b.region).some((c) => c.id === company.id)) return fail(state, TESTING_ERRORS.companyServices)
  if (input.preferredFrom !== null) {
    if (!isIsoDate(input.preferredFrom)) return fail(state, TESTING_ERRORS.badDate)
    if (!isOnOrBefore(a.today, input.preferredFrom)) return fail(state, TESTING_ERRORS.pastDate)
  }
  const m = mint(state, 'tst', (id) => !!state.testingRequests[id])
  const request: TestingRequest = {
    id: m.id,
    buildingId: b.id,
    itemIds,
    companyId: company.id,
    services,
    preferredFrom: input.preferredFrom,
    message: clean(input.message, 1000),
    status: 'requested',
    requestedByUserId: a.user.id,
    requestedByOrgId: a.org.id,
    requestedAt: a.now,
    bookedFor: null,
    results: [],
    history: [{ at: a.now, status: 'requested', byUserId: a.user.id, note: '' }],
  }
  let s = withRequest(m.state, request)
  const n = plural(itemIds.length, 'item')
  const href = `/app/buildings/${b.id}/testing`
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `asked ${company.name} to test ${n}`, href })
  s = notify(s, { orgIds: otherSide(s, a, b.id), kind: 'testing', title: `${a.user.name} asked ${company.name} to test ${n} at ${b.name}`, body: `Tests: ${listJoin(services.map((x) => TEST_SERVICES[x].label))}. Nothing is sent in the sandbox; the request is recorded here.`, href, at: a.now, actorUserId: a.user.id })
  return ok(s, request.id)
}

function requestFor(state: AppData, actor: Actor, requestId: string): { a: Acting; r: TestingRequest } | string {
  const a = acting(state, actor)
  if (typeof a === 'string') return a
  const r = state.testingRequests[requestId]
  if (!r) return TESTING_ERRORS.noRequest
  if (!canCaptureIn(state, actor.userId, r.buildingId)) return ERRORS.role
  return { a, r }
}

/** Records the date the testing company will visit. */
export function recordTestingBooked(state: AppData, actor: Actor, requestId: string, input: { date: string; note: string }): ActionResult {
  const found = requestFor(state, actor, requestId)
  if (typeof found === 'string') return fail(state, found)
  const { a, r } = found
  if (r.status !== 'requested' && r.status !== 'booked') return fail(state, TESTING_ERRORS.status)
  if (!isIsoDate(input.date)) return fail(state, TESTING_ERRORS.badDate)
  if (!isOnOrBefore(a.today, input.date)) return fail(state, TESTING_ERRORS.pastDate)
  const note = clean(input.note, 600)
  let s = withRequest(state, { ...r, status: 'booked', bookedFor: input.date, history: [...r.history, { at: a.now, status: 'booked', byUserId: a.user.id, note }] })
  const b = s.world.buildings[r.buildingId]
  const company = testingCompanyById(r.companyId)?.name ?? ''
  const href = `/app/buildings/${b.id}/testing`
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'recorded the testing visit', href })
  s = notify(s, { orgIds: otherSide(s, a, b.id), kind: 'testing', title: `Testing visit booked at ${b.name}`, body: `${company} on ${formatDate(input.date)}.`, href, at: a.now, actorUserId: a.user.id })
  return ok(s)
}

const GRADES: SteelGrade[] = ['S275', 'S355', 'unknown']

/** Records one result per item. Writes each item's test status and, for a grade test on steel, its grade. */
export function recordTestResults(state: AppData, actor: Actor, requestId: string, results: TestResult[]): ActionResult {
  const found = requestFor(state, actor, requestId)
  if (typeof found === 'string') return fail(state, found)
  const { a, r } = found
  if (r.status !== 'booked') return fail(state, TESTING_ERRORS.status)
  const byItem = new Map(results.map((x) => [x.itemId, x]))
  if (results.length !== r.itemIds.length || byItem.size !== r.itemIds.length || r.itemIds.some((id) => !byItem.has(id))) return fail(state, TESTING_ERRORS.results)
  const statuses = resultStatusesFor(r.services)
  const grades = recordsGrade(r.services)
  for (const x of results) {
    const item = state.world.items[x.itemId]
    if (!item || !statuses.includes(x.testStatus)) return fail(state, TESTING_ERRORS.results)
    if (x.grade !== null && (!grades || item.family !== 'steel_section' || !GRADES.includes(x.grade))) return fail(state, TESTING_ERRORS.results)
  }
  const lots = r.itemIds.map((id) => lotOfItem(state.world, id))
  if (lots.some((l) => !!l && !!acceptedReservation(state, l.id))) return fail(state, TESTING_ERRORS.reserved)
  if (buildingSide(state, actor.userId, r.buildingId) !== 'owner' && lots.some((l) => !!l && l.visibility !== 'private')) return fail(state, TESTING_ERRORS.locked)
  const w = structuredClone(state.world)
  for (const x of results) {
    w.items[x.itemId].testStatus = x.testStatus
    if (x.grade !== null) w.items[x.itemId].grade = x.grade
  }
  const clean_ = results.map((x) => ({ itemId: x.itemId, testStatus: x.testStatus, grade: x.grade, note: clean(x.note, 600) }))
  let s = withRequest(withWorld(state, w), { ...r, status: 'results', results: clean_, history: [...r.history, { at: a.now, status: 'results', byUserId: a.user.id, note: '' }] })
  const b = s.world.buildings[r.buildingId]
  const href = `/app/buildings/${b.id}/testing`
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `recorded test results for ${plural(results.length, 'item')}`, href })
  s = notify(s, { orgIds: otherSide(s, a, b.id), kind: 'testing', title: `Test results recorded at ${b.name}`, body: `${plural(results.length, 'item')} updated. Test status now shows on any listing.`, href, at: a.now, actorUserId: a.user.id })
  return ok(s)
}

/** Cancels a request that has no results yet. */
export function cancelTesting(state: AppData, actor: Actor, requestId: string, note: string): ActionResult {
  const found = requestFor(state, actor, requestId)
  if (typeof found === 'string') return fail(state, found)
  const { a, r } = found
  if (r.status !== 'requested' && r.status !== 'booked') return fail(state, TESTING_ERRORS.status)
  let s = withRequest(state, { ...r, status: 'cancelled', history: [...r.history, { at: a.now, status: 'cancelled', byUserId: a.user.id, note: clean(note, 600) }] })
  const b = s.world.buildings[r.buildingId]
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `cancelled the testing request to ${testingCompanyById(r.companyId)?.name ?? 'the testing company'}`, href: `/app/buildings/${b.id}/testing` })
  return ok(s)
}
