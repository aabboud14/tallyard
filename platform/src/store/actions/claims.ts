// Buildings a surveying firm adds before any appointment (owner-surveyor design 14.4.6). The firm names the owner by
// email; only an owner organisation with a member using that email can confirm or decline. Until then the building
// is private to the firm, nothing in it can be shared or published, and the survey cannot be submitted.
import type { BuildingClaim } from '../types'
import type { ActionResult, Actor, AppData } from '../types'
import { normaliseEmail, isEmail } from '../../sandbox/accounts'
import { ERRORS, buildingSide, roleOfOrg, usersOfOrg } from '../access'
import { mint } from '../ids'
import { log, notify, plural } from '../notifications'
import { nextTag } from '../worldOps'
import type { SurveyStatus } from '../types'
import { acting, clean, fail, ok, withWorld } from './common'
import { buildingRecord, checkBuildingDetails, type BuildingDetailsInput } from './owner'

export const CLAIM_ERRORS = {
  notCreator: 'Only the firm that added this building can ask its owner.',
  linked: 'This building is already linked to its owner.',
  email: "Enter the owner's email address.",
  pending: 'A request is already waiting for the owner. Withdraw it first.',
  noClaim: 'That request could not be found.',
  notPending: 'That request is no longer waiting.',
  notAddressed: 'This request is addressed to someone else.',
  deleteLinked: 'A building linked to its owner cannot be deleted here.',
  mergeFrom: 'Only a building your firm added, with no owner confirmed yet, can be moved into an appointment.',
  mergeInto: 'Choose a building an owner appointed your firm to survey.',
} as const

export type ClaimRequestInput = { email: string; name: string; message: string }

export type SurveyBuildingInput = BuildingDetailsInput & { owner: ClaimRequestInput | null }

/** Whether a claim is addressed to this organisation: a donor building owner with a member using the email named. */
export function claimAddressedTo(state: AppData, claim: BuildingClaim, orgId: string): boolean {
  return roleOfOrg(state, orgId) === 'owner' && usersOfOrg(state, orgId).some((u) => normaliseEmail(u.email) === claim.ownerEmail)
}

/** The owner organisations a claim is addressed to, in the order they joined. */
function addressees(state: AppData, claim: BuildingClaim): string[] {
  return Object.keys(state.world.orgs).filter((id) => claimAddressedTo(state, claim, id))
}

/** The pending claim on a building, if any. */
export function pendingClaimOf(state: AppData, buildingId: string): BuildingClaim | null {
  return Object.values(state.buildingClaims).find((c) => c.buildingId === buildingId && c.status === 'pending') ?? null
}

/** The surveyor adds a building to survey before any appointment, and may ask its owner to confirm it at once. */
export function createSurveyBuilding(state: AppData, actor: Actor, input: SurveyBuildingInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'surveyor') return fail(state, ERRORS.role)
  const bad = checkBuildingDetails(input, a.today)
  if (bad) return fail(state, bad)
  if (input.owner && !isEmail(input.owner.email)) return fail(state, CLAIM_ERRORS.email)
  const m = mint(state, 'bld', (id) => !!state.world.buildings[id])
  let s = m.state
  const building = buildingRecord(m.id, input, { ownerOrgId: null, surveyorOrgId: a.org.id, createdByOrgId: a.org.id })
  const w = structuredClone(s.world)
  w.buildings[m.id] = building
  s = withWorld(s, w)
  s = { ...s, surveys: { ...s.surveys, [m.id]: { buildingId: m.id, status: 'not_started', appointedAt: null, submittedAt: null, submittedByUserId: null } } }
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: m.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `added ${building.name} to survey`, href: `/app/buildings/${m.id}` })
  if (input.owner) {
    const r = requestBuildingClaim(s, actor, m.id, input.owner)
    if (r.error) return fail(state, r.error)
    s = r.state
  }
  return ok(s, m.id)
}

/** The firm that added a building asks its owner, by email, to confirm it. Returns the request ID. */
export function requestBuildingClaim(state: AppData, actor: Actor, buildingId: string, input: ClaimRequestInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (buildingSide(state, actor.userId, buildingId) !== 'surveyor') return fail(state, ERRORS.role)
  if (b.createdByOrgId !== a.org.id) return fail(state, CLAIM_ERRORS.notCreator)
  if (b.ownerOrgId !== null) return fail(state, CLAIM_ERRORS.linked)
  if (pendingClaimOf(state, buildingId)) return fail(state, CLAIM_ERRORS.pending)
  if (!isEmail(input.email)) return fail(state, CLAIM_ERRORS.email)
  const m = mint(state, 'clm', (id) => !!state.buildingClaims[id])
  const claim: BuildingClaim = {
    id: m.id,
    buildingId,
    surveyorOrgId: a.org.id,
    requestedByUserId: a.user.id,
    requestedAt: a.now,
    ownerEmail: normaliseEmail(input.email),
    ownerName: clean(input.name, 120),
    message: clean(input.message, 600),
    status: 'pending',
    decidedAt: null,
    decidedByUserId: null,
    decisionNote: null,
  }
  let s: AppData = { ...m.state, buildingClaims: { ...m.state.buildingClaims, [claim.id]: claim } }
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `asked ${claim.ownerEmail} to confirm ${b.name}`, href: `/app/buildings/${buildingId}` })
  // With no owner account for the email yet, the request waits: it shows once someone signs up with it as an owner.
  const owners = addressees(s, claim)
  if (owners.length > 0) {
    s = notify(s, { orgIds: owners, kind: 'building_claim', title: `${a.org.name} surveyed a building for you`, body: `${b.name}, ${b.address}. Confirm it is yours to see what it holds.`, href: '/app/requests?tab=buildings', at: a.now, actorUserId: a.user.id })
  }
  return ok(s, claim.id)
}

/** The requesting firm withdraws a request that is still waiting. */
export function withdrawBuildingClaim(state: AppData, actor: Actor, claimId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const c = state.buildingClaims[claimId]
  if (!c) return fail(state, CLAIM_ERRORS.noClaim)
  if (a.role !== 'surveyor' || c.surveyorOrgId !== a.org.id) return fail(state, ERRORS.role)
  if (c.status !== 'pending') return fail(state, CLAIM_ERRORS.notPending)
  let s: AppData = { ...state, buildingClaims: { ...state.buildingClaims, [c.id]: { ...c, status: 'withdrawn', decidedAt: a.now, decidedByUserId: a.user.id } } }
  const name = state.world.buildings[c.buildingId]?.name ?? ''
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: c.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `withdrew the request to confirm ${name}`, href: `/app/buildings/${c.buildingId}` })
  return ok(s)
}

/** An owner the request is addressed to confirms the building as theirs, or says it is not. */
export function decideBuildingClaim(state: AppData, actor: Actor, claimId: string, decision: 'accepted' | 'declined', note: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'owner') return fail(state, ERRORS.role)
  const c = state.buildingClaims[claimId]
  if (!c) return fail(state, CLAIM_ERRORS.noClaim)
  if (c.status !== 'pending') return fail(state, CLAIM_ERRORS.notPending)
  if (!claimAddressedTo(state, c, a.org.id)) return fail(state, CLAIM_ERRORS.notAddressed)
  const b = state.world.buildings[c.buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (b.ownerOrgId !== null) return fail(state, CLAIM_ERRORS.linked)
  const text = clean(note, 1000)
  const href = `/app/buildings/${b.id}`
  if (decision === 'accepted') {
    const w = structuredClone(state.world)
    w.buildings[b.id].ownerOrgId = a.org.id
    let s = withWorld(state, w)
    const prev = s.surveys[b.id]
    s = {
      ...s,
      surveys: { ...s.surveys, [b.id]: { buildingId: b.id, status: prev?.status ?? 'not_started', appointedAt: a.now, submittedAt: prev?.submittedAt ?? null, submittedByUserId: prev?.submittedByUserId ?? null } },
      buildingClaims: { ...s.buildingClaims, [c.id]: { ...c, status: 'accepted', decidedAt: a.now, decidedByUserId: a.user.id, decisionNote: text || null } },
    }
    s = log(s, { at: a.now, orgIds: [a.org.id, c.surveyorOrgId], buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `confirmed ${b.name} as their building`, href })
    s = notify(s, { orgIds: [c.surveyorOrgId], kind: 'building_claim', title: `${a.org.name} confirmed ${b.name}`, body: 'It is in their portfolio now. You stay appointed as its surveyor.', href, at: a.now, actorUserId: a.user.id })
    return ok(s)
  }
  let s: AppData = { ...state, buildingClaims: { ...state.buildingClaims, [c.id]: { ...c, status: 'declined', decidedAt: a.now, decidedByUserId: a.user.id, decisionNote: text || null } } }
  // The surveyor never learns which organisation declined: no actor, no organisation name.
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: null, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `said ${b.name} is not theirs`, href: '/app/requests?tab=buildings' })
  s = log(s, { at: a.now, orgIds: [c.surveyorOrgId], buildingId: b.id, projectId: null, actorUserId: null, actor: 'The owner', text: `did not confirm ${b.name}`, href })
  s = notify(s, { orgIds: [c.surveyorOrgId], kind: 'building_claim', title: `${b.name} was not confirmed`, body: text || 'The owner did not recognise this building. Check the email address and ask again.', href, at: a.now, actorUserId: null })
  return ok(s)
}

/** The firm that added a building deletes it while no owner has confirmed it, with its items, lots and records. */
export function deleteSurveyBuilding(state: AppData, actor: Actor, buildingId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (buildingSide(state, actor.userId, buildingId) !== 'surveyor') return fail(state, ERRORS.role)
  if (b.createdByOrgId !== a.org.id) return fail(state, CLAIM_ERRORS.notCreator)
  if (b.ownerOrgId !== null) return fail(state, CLAIM_ERRORS.deleteLinked)
  const w = structuredClone(state.world)
  const itemIds = new Set(Object.values(w.items).filter((i) => i.buildingId === buildingId).map((i) => i.id))
  for (const id of itemIds) delete w.items[id]
  for (const lot of Object.values(w.lots)) if (itemIds.has(lot.itemId)) delete w.lots[lot.id]
  delete w.buildings[buildingId]
  let s = withWorld(state, w)
  const surveys = { ...s.surveys }
  delete surveys[buildingId]
  const testingRequests = Object.fromEntries(Object.entries(s.testingRequests).filter(([, t]) => t.buildingId !== buildingId))
  const buildingClaims = Object.fromEntries(Object.entries(s.buildingClaims).map(([id, c]) => [id, c.buildingId === buildingId && c.status === 'pending' ? { ...c, status: 'withdrawn' as const, decidedAt: a.now, decidedByUserId: a.user.id } : c]))
  s = { ...s, surveys, testingRequests, buildingClaims }
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: null, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `deleted ${b.name}`, href: '/app/buildings' })
  return ok(s)
}

const SURVEY_ORDER: SurveyStatus[] = ['not_started', 'in_progress', 'submitted']

export type MergeResult = { moved: number; intoId: string; intoName: string; retagged: boolean }

/**
 * The surveying firm moves what it captured in a building it added itself into the same building once its owner has
 * appointed the firm (audit 16 October, note 26): every item, with its lot, photos and testing requests, moves across;
 * structure and programme dates fill gaps on the appointed record; pending requests to the owner are withdrawn; and the
 * firm's own record is removed. Items keep their tags unless the appointed building already has items, when they
 * continue its numbering. The owner is told; the items stay private until the owner decides.
 */
export function mergeSurveyBuilding(state: AppData, actor: Actor, fromBuildingId: string, intoBuildingId: string): ActionResult<MergeResult> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'surveyor') return fail(state, ERRORS.role)
  const from = state.world.buildings[fromBuildingId]
  const into = state.world.buildings[intoBuildingId]
  if (!from || !into) return fail(state, ERRORS.noBuilding)
  if (from.ownerOrgId !== null || from.createdByOrgId !== a.org.id || from.surveyorOrgId !== a.org.id) return fail(state, CLAIM_ERRORS.mergeFrom)
  if (into.id === from.id || into.ownerOrgId === null || into.surveyorOrgId !== a.org.id) return fail(state, CLAIM_ERRORS.mergeInto)
  const w = structuredClone(state.world)
  const moving = Object.values(w.items)
    .filter((i) => i.buildingId === from.id)
    .sort((x, y) => x.tag.localeCompare(y.tag, 'en-GB', { numeric: true }))
  const retag = Object.values(w.items).some((i) => i.buildingId === into.id) && moving.length > 0
  for (const item of moving) {
    // Each moved item takes the appointed building's next tag before it joins, so the numbering continues.
    if (retag) item.tag = nextTag(w, into.id)
    item.buildingId = into.id
  }
  const target = w.buildings[into.id]
  if (target.structure.length === 0 && from.structure.length > 0) target.structure = structuredClone(from.structure)
  if (!target.structureType && from.structureType) target.structureType = from.structureType
  target.programme = {
    stripOutStart: target.programme.stripOutStart ?? from.programme.stripOutStart,
    dismantlingStart: target.programme.dismantlingStart ?? from.programme.dismantlingStart,
    clearBy: target.programme.clearBy ?? from.programme.clearBy,
  }
  if (target.yearBuilt === null && from.yearBuilt !== null) {
    target.yearBuilt = from.yearBuilt
    target.eraBand = from.eraBand
  }
  if (target.storeys === null) target.storeys = from.storeys
  if (target.giaM2 === null) target.giaM2 = from.giaM2
  delete w.buildings[from.id]
  let s = withWorld(state, w)
  // The survey record: the further of the two, keeping the appointment.
  const fromSurvey = s.surveys[from.id]
  const intoSurvey = s.surveys[into.id] ?? { buildingId: into.id, status: 'not_started' as const, appointedAt: null, submittedAt: null, submittedByUserId: null }
  const further = [fromSurvey?.status ?? 'not_started', intoSurvey.status, moving.length > 0 ? 'in_progress' : 'not_started'].reduce<SurveyStatus>((m, x) => (SURVEY_ORDER.indexOf(x as SurveyStatus) > SURVEY_ORDER.indexOf(m) ? (x as SurveyStatus) : m), 'not_started')
  const surveys = { ...s.surveys, [into.id]: { ...intoSurvey, status: further } }
  delete surveys[from.id]
  const testingRequests = Object.fromEntries(Object.entries(s.testingRequests).map(([id, t]) => [id, t.buildingId === from.id ? { ...t, buildingId: into.id } : t]))
  const buildingClaims = Object.fromEntries(Object.entries(s.buildingClaims).map(([id, c]) => [id, c.buildingId === from.id && c.status === 'pending' ? { ...c, status: 'withdrawn' as const, decidedAt: a.now, decidedByUserId: a.user.id } : c]))
  // Links in the firm's own activity and notifications follow the items to the appointed building.
  const oldHref = `/app/buildings/${from.id}`
  const newHref = (href: string | null) => (href && (href === oldHref || href.startsWith(`${oldHref}/`)) ? `/app/buildings/${into.id}${href.slice(oldHref.length)}` : href)
  const activity = s.activity.map((e) => (e.buildingId === from.id ? { ...e, buildingId: into.id, href: newHref(e.href) } : e))
  const notifications = s.notifications.map((n) => (n.href ? { ...n, href: newHref(n.href) ?? n.href } : n))
  s = { ...s, surveys, testingRequests, buildingClaims, activity, notifications }
  const n = plural(moving.length, 'item')
  const href = `/app/buildings/${into.id}`
  s = log(s, { at: a.now, orgIds: [a.org.id, into.ownerOrgId], buildingId: into.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `moved ${n} captured earlier into ${into.name}`, href: `${href}/inventory` })
  if (moving.length > 0) {
    s = notify(s, { orgIds: [into.ownerOrgId], kind: 'appointed', title: `${a.org.name} added ${n} to ${into.name}`, body: 'Captured before your appointment. Private until you decide.', href: `${href}/inventory`, at: a.now, actorUserId: a.user.id })
  }
  return ok(s, { moved: moving.length, intoId: into.id, intoName: into.name, retagged: retag })
}
