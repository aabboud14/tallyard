// Buildings a surveying firm adds before any appointment (owner-surveyor design 14.4.6). The firm names the owner by
// email; only an owner organisation with a member using that email can confirm or decline. Until then the building
// is private to the firm, nothing in it can be shared or published, and the survey cannot be submitted.
import type { BuildingClaim } from '../types'
import type { ActionResult, Actor, AppData } from '../types'
import { normaliseEmail, isEmail } from '../../sandbox/accounts'
import { ERRORS, buildingSide, roleOfOrg, usersOfOrg } from '../access'
import { mint } from '../ids'
import { claimNoticeKey, log, notify, plural } from '../notifications'
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
  mergeSubmitted: 'The survey of that building is already submitted, so nothing more can be added to it.',
  confirmInto: 'Choose one of your buildings with the same surveyor.',
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
    s = notify(s, { orgIds: owners, kind: 'building_claim', title: `${a.org.name} surveyed a building for you`, body: `${b.name}, ${b.address}. Confirm it is yours to see what it holds.`, href: '/app/requests?tab=buildings', at: a.now, actorUserId: a.user.id, key: claimNoticeKey(claim.id) })
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
  const b = state.world.buildings[c.buildingId]
  const name = b?.name ?? ''
  if (b) s = retireClaimNotices(s, [c], b)
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
    s = readClaimNotice(s, c, b, a.user.id)
    s = log(s, { at: a.now, orgIds: [a.org.id, c.surveyorOrgId], buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `confirmed ${b.name} as their building`, href })
    s = notify(s, { orgIds: [c.surveyorOrgId], kind: 'building_claim', title: `${a.org.name} confirmed ${b.name}`, body: 'It is in their portfolio now. You stay appointed as its surveyor.', href, at: a.now, actorUserId: a.user.id })
    return ok(s)
  }
  let s: AppData = { ...state, buildingClaims: { ...state.buildingClaims, [c.id]: { ...c, status: 'declined', decidedAt: a.now, decidedByUserId: a.user.id, decisionNote: text || null } } }
  s = readClaimNotice(s, c, b, a.user.id)
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
  s = retireClaimNotices(s, Object.values(state.buildingClaims).filter((c) => c.buildingId === buildingId && c.status === 'pending'), b)
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: null, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `deleted ${b.name}`, href: '/app/buildings' })
  return ok(s)
}

const SURVEY_ORDER: SurveyStatus[] = ['not_started', 'in_progress', 'submitted']

export type MergeResult = { moved: number; intoId: string; intoName: string; retagged: boolean }

/**
 * Removes the owner side's 'Confirm it is yours' notifications for requests that no longer wait, so none invites an
 * action that has gone. Older notifications carry no key and are found by their building's name and address.
 */
function retireClaimNotices(state: AppData, claims: BuildingClaim[], building: { name: string; address: string }): AppData {
  if (claims.length === 0) return state
  const keys = new Set(claims.map((c) => claimNoticeKey(c.id)))
  const firms = new Set(claims.map((c) => c.surveyorOrgId))
  const legacy = `${building.name}, ${building.address}.`
  const stale = (n: AppData['notifications'][number]) =>
    n.kind === 'building_claim' && !firms.has(n.orgId) && (n.key ? keys.has(n.key) : n.href === '/app/requests?tab=buildings' && n.body.startsWith(legacy))
  return { ...state, notifications: state.notifications.filter((n) => !stale(n)) }
}

/** Marks the owner side's notification of a request read for the person who answered it, since it needs nothing more. */
function readClaimNotice(state: AppData, claim: BuildingClaim, building: { name: string; address: string }, userId: string): AppData {
  const legacy = `${building.name}, ${building.address}.`
  const orgId = state.users[userId]?.orgId
  const ours = (n: AppData['notifications'][number]) => n.kind === 'building_claim' && n.orgId === orgId && (n.key ? n.key === claimNoticeKey(claim.id) : n.href === '/app/requests?tab=buildings' && n.body.startsWith(legacy))
  return { ...state, notifications: state.notifications.map((n) => (ours(n) && !n.readBy.includes(userId) ? { ...n, readBy: [...n.readBy, userId] } : n)) }
}

/** Whether the survey of a building is already submitted, when nothing more can join it. */
export function surveySubmitted(state: AppData, buildingId: string): boolean {
  return state.surveys[buildingId]?.status === 'submitted'
}

type MoveCore = { state: AppData; moved: number; retagged: boolean; withdrawn: BuildingClaim[] }

/**
 * Moves everything of one building into another and removes the first (audit 16 October, note 26): every item, with
 * its lot, photos and testing requests; structure, programme dates and facts fill gaps on the receiving record; the
 * survey keeps the further status; links in history follow. Items keep their tags unless the receiving building
 * already has items or a different prefix, when they take its next tags. `accept` names a request to confirm the moved
 * building that is accepted by the move; every other waiting request on it is withdrawn.
 */
function moveBuildingInto(state: AppData, fromId: string, intoId: string, at: string, byUserId: string, accept: { claimId: string; note: string | null } | null): MoveCore {
  const w = structuredClone(state.world)
  const from = w.buildings[fromId]
  const moving = Object.values(w.items)
    .filter((i) => i.buildingId === fromId)
    .sort((x, y) => x.tag.localeCompare(y.tag, 'en-GB', { numeric: true }))
  const targetPrefix = nextTag(w, intoId).split('-')[0]
  const hasItems = Object.values(w.items).some((i) => i.buildingId === intoId)
  const retag = moving.length > 0 && (hasItems || moving.some((i) => i.tag.split('-')[0] !== targetPrefix))
  for (const item of moving) {
    // Each moved item takes the receiving building's next tag before it joins, so the numbering continues.
    if (retag) item.tag = nextTag(w, intoId)
    item.buildingId = intoId
  }
  const target = w.buildings[intoId]
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
  delete w.buildings[fromId]
  let s = withWorld(state, w)
  // The survey record: the further of the two, keeping the appointment.
  const fromSurvey = s.surveys[fromId]
  const intoSurvey = s.surveys[intoId] ?? { buildingId: intoId, status: 'not_started' as const, appointedAt: null, submittedAt: null, submittedByUserId: null }
  const further = [fromSurvey?.status ?? 'not_started', intoSurvey.status, moving.length > 0 ? 'in_progress' : 'not_started'].reduce<SurveyStatus>((m, x) => (SURVEY_ORDER.indexOf(x as SurveyStatus) > SURVEY_ORDER.indexOf(m) ? (x as SurveyStatus) : m), 'not_started')
  const surveys = { ...s.surveys, [intoId]: { ...intoSurvey, status: further } }
  delete surveys[fromId]
  const testingRequests = Object.fromEntries(Object.entries(s.testingRequests).map(([id, t]) => [id, t.buildingId === fromId ? { ...t, buildingId: intoId } : t]))
  const withdrawn: BuildingClaim[] = []
  const buildingClaims = Object.fromEntries(
    Object.entries(s.buildingClaims).map(([id, c]) => {
      if (c.buildingId !== fromId || c.status !== 'pending') return [id, c]
      // The accepted request now names the building it joined, so the owner's Answered list still shows it.
      if (accept && c.id === accept.claimId) return [id, { ...c, buildingId: intoId, status: 'accepted' as const, decidedAt: at, decidedByUserId: byUserId, decisionNote: accept.note }]
      withdrawn.push(c)
      return [id, { ...c, status: 'withdrawn' as const, decidedAt: at, decidedByUserId: byUserId }]
    }),
  )
  // Links in activity and notifications follow the items to the receiving building.
  const oldHref = `/app/buildings/${fromId}`
  const newHref = (href: string | null) => (href && (href === oldHref || href.startsWith(`${oldHref}/`)) ? `/app/buildings/${intoId}${href.slice(oldHref.length)}` : href)
  const activity = s.activity.map((e) => (e.buildingId === fromId ? { ...e, buildingId: intoId, href: newHref(e.href) } : e))
  const notifications = s.notifications.map((n) => (n.href ? { ...n, href: newHref(n.href) ?? n.href } : n))
  s = { ...s, surveys, testingRequests, buildingClaims, activity, notifications }
  s = retireClaimNotices(s, withdrawn, from)
  return { state: s, moved: moving.length, retagged: retag, withdrawn }
}

/**
 * The surveying firm moves what it captured in a building it added itself into the same building once its owner has
 * appointed the firm (audit 16 October, note 26). Pending requests to the owner are withdrawn and their notifications
 * removed, and the firm's own record goes. A submitted survey takes no more items. The owner is told; the items stay
 * private until the owner decides.
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
  if (surveySubmitted(state, into.id)) return fail(state, CLAIM_ERRORS.mergeSubmitted)
  const core = moveBuildingInto(state, from.id, into.id, a.now, a.user.id, null)
  let s = core.state
  const n = plural(core.moved, 'item')
  const href = `/app/buildings/${into.id}`
  s = log(s, { at: a.now, orgIds: [a.org.id, into.ownerOrgId], buildingId: into.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `moved ${n} captured earlier into ${into.name}`, href: `${href}/inventory` })
  if (core.moved > 0) {
    s = notify(s, { orgIds: [into.ownerOrgId], kind: 'appointed', title: `${a.org.name} added ${n} to ${into.name}`, body: 'Captured before your appointment. Private until you decide.', href: `${href}/inventory`, at: a.now, actorUserId: a.user.id })
  }
  return ok(s, { moved: core.moved, intoId: into.id, intoName: into.name, retagged: core.retagged })
}

/**
 * An owner confirms a building a surveyor asked about as one they already have (audit 16 October, note 26): the
 * surveyor's record joins the owner's own, appointed to the same firm, instead of becoming a second copy. The request
 * is accepted, the firm is told where its items went, and the firm's record is removed.
 */
export function confirmBuildingClaimInto(state: AppData, actor: Actor, claimId: string, intoBuildingId: string, note: string): ActionResult<MergeResult> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'owner') return fail(state, ERRORS.role)
  const c = state.buildingClaims[claimId]
  if (!c) return fail(state, CLAIM_ERRORS.noClaim)
  if (c.status !== 'pending') return fail(state, CLAIM_ERRORS.notPending)
  if (!claimAddressedTo(state, c, a.org.id)) return fail(state, CLAIM_ERRORS.notAddressed)
  const from = state.world.buildings[c.buildingId]
  const into = state.world.buildings[intoBuildingId]
  if (!from || !into) return fail(state, ERRORS.noBuilding)
  if (from.ownerOrgId !== null) return fail(state, CLAIM_ERRORS.linked)
  if (into.id === from.id || into.ownerOrgId !== a.org.id || into.surveyorOrgId !== c.surveyorOrgId) return fail(state, CLAIM_ERRORS.confirmInto)
  if (surveySubmitted(state, into.id)) return fail(state, CLAIM_ERRORS.mergeSubmitted)
  const text = clean(note, 1000)
  const core = moveBuildingInto(state, from.id, into.id, a.now, a.user.id, { claimId: c.id, note: text || null })
  let s = readClaimNotice(core.state, c, from, a.user.id)
  const n = plural(core.moved, 'item')
  const href = `/app/buildings/${into.id}`
  const sameName = from.name === into.name
  s = log(s, { at: a.now, orgIds: [a.org.id, c.surveyorOrgId], buildingId: into.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: sameName ? `confirmed ${from.name} as their building and added its ${n} to their record` : `confirmed ${from.name} as their ${into.name} and added its ${n}`, href: `${href}/inventory` })
  s = notify(s, {
    orgIds: [c.surveyorOrgId],
    kind: 'building_claim',
    title: `${a.org.name} confirmed ${from.name}`,
    body: `They already had it as ${into.name}, so your ${n} moved there. You stay appointed as its surveyor.`,
    href,
    at: a.now,
    actorUserId: a.user.id,
  })
  return ok(s, { moved: core.moved, intoId: into.id, intoName: into.name, retagged: core.retagged })
}
