// The deconstruction contractor (owner-surveyor design 14.4.6): appointed per building by the owner or the surveyor,
// it says when each item is expected to come out. Its dates stay apart from the surveyor's estimate and never reach
// buyers: the owner applies them to private lots, and only the owner changes a lot's date.
import { monthKey } from '../../domain/dates'
import type { World } from '../../domain/types'
import type { ActionResult, Actor, AppData } from '../types'
import { isEmail, normaliseEmail } from '../../sandbox/accounts'
import { ERRORS, buildingOrgIds, buildingSide, isBuildingContractor, roleOfOrg } from '../access'
import { acceptedReservation, lotOfItem } from '../lots'
import { log, notify, plural } from '../notifications'
import { acting, fail, ok, withWorld } from './common'

export const CONTRACTOR_ERRORS = {
  contractor: 'Choose a deconstruction contractor.',
  notContractor: 'Only the appointed contractor can set these dates.',
  badMonth: 'Choose a valid month.',
  unknownItem: 'That item is not in this building.',
  email: "Enter the contractor's email address.",
} as const

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** The date stored for a month: the dismantling start when it falls in that month, else the first (as expectedFromMonth). */
export function isoForMonth(dismantlingStart: string | null, key: string): string {
  if (dismantlingStart && monthKey(dismantlingStart) === key) return dismantlingStart
  return `${key}-01`
}

/**
 * The sentence that says a contractor's dates go: 'Fennick Dismantling's 5 dates were cleared.' in the past, or
 * 'Fennick Dismantling's 5 dates are cleared when they join.' for an invite still waiting. Null when there are none.
 */
export function datesClearedText(previousName: string | null, count: number, when: 'done' | 'on_join'): string | null {
  if (count === 0 || !previousName) return null
  const what = count === 1 ? 'date' : `${count} dates`
  const verb = when === 'done' ? (count === 1 ? 'was cleared' : 'were cleared') : count === 1 ? 'is cleared when they join' : 'are cleared when they join'
  return `${previousName}'s ${what} ${verb}.`
}

/** How many dates the building's current contractor has set, which go when another contractor takes over. */
export function datedByContractor(world: World, buildingId: string): number {
  return Object.values(world.items).filter((i) => i.buildingId === buildingId && i.contractorAvailableFrom !== null).length
}

/** What changing the contractor did: how many of the previous contractor's dates were cleared, and whose. */
export type AppointResult = { cleared: number; previousName: string | null }

/**
 * Sets the building's contractor in a world copy. A different contractor (or none) clears the previous contractor's
 * dates on every item, so a new firm never inherits another's months (audit 16 October, note 28). Returns how many.
 */
function setContractorIn(w: World, buildingId: string, contractorOrgId: string | null): number {
  const b = w.buildings[buildingId]
  let cleared = 0
  if ((b.contractorOrgId ?? null) !== contractorOrgId) {
    for (const it of Object.values(w.items)) {
      if (it.buildingId !== buildingId || (it.contractorAvailableFrom === null && it.contractorDatedOn === null)) continue
      if (it.contractorAvailableFrom !== null) cleared++
      it.contractorAvailableFrom = null
      it.contractorDatedOn = null
    }
  }
  b.contractorOrgId = contractorOrgId
  if (contractorOrgId !== null) b.contractorInvite = null
  return cleared
}

/** The owner or the surveyor invites a deconstruction contractor to set dates, or removes it. */
export function appointContractor(state: AppData, actor: Actor, buildingId: string, contractorOrgId: string | null): ActionResult<AppointResult> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  const side = buildingSide(state, actor.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return fail(state, ERRORS.role)
  if (contractorOrgId !== null && (!contractorOrgId || roleOfOrg(state, contractorOrgId) !== 'surveyor')) return fail(state, CONTRACTOR_ERRORS.contractor)
  const previousName = b.contractorOrgId ? (state.world.orgs[b.contractorOrgId]?.name ?? null) : null
  if ((b.contractorOrgId ?? null) === contractorOrgId) return ok(state, { cleared: 0, previousName })
  const w = structuredClone(state.world)
  const cleared = setContractorIn(w, buildingId, contractorOrgId)
  let s = withWorld(state, w)
  const href = `/app/buildings/${buildingId}`
  if (contractorOrgId === null) {
    s = log(s, { at: a.now, orgIds: [...buildingOrgIds(w.buildings[buildingId]), b.contractorOrgId ?? ''], buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'removed the deconstruction contractor', href })
    return ok(s, { cleared, previousName })
  }
  const contractor = w.orgs[contractorOrgId].name
  s = log(s, { at: a.now, orgIds: buildingOrgIds(w.buildings[buildingId]), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `invited ${contractor} to set availability dates`, href })
  s = notify(s, { orgIds: [contractorOrgId], kind: 'appointed', title: `${a.org.name} invited you to set availability dates at ${b.name}`, body: 'Say when each item is expected to come out. The owner decides what buyers see.', href: `${href}/availability`, at: a.now, actorUserId: a.user.id })
  if (side === 'surveyor' && b.ownerOrgId) {
    s = notify(s, { orgIds: [b.ownerOrgId], kind: 'availability_set', title: `${a.org.name} invited ${contractor} to ${b.name}`, body: 'They will set expected dates for each item. You can remove them in Overview.', href, at: a.now, actorUserId: a.user.id })
  }
  return ok(s, { cleared, previousName })
}

/** The surveying or deconstruction firm with a member at this email, if any. */
function contractorOrgByEmail(state: AppData, email: string): string | null {
  const key = normaliseEmail(email)
  const user = Object.values(state.users).find((u) => normaliseEmail(u.email) === key)
  return user && roleOfOrg(state, user.orgId) === 'surveyor' ? user.orgId : null
}

/**
 * `cleared` counts the dates cleared now (appointed at once); `clearsOnJoin` the current contractor's dates that go
 * when an invite still waiting is taken up, with `previousName` naming that contractor.
 */
export type ContractorInviteResult = { status: 'appointed' | 'waiting'; orgName: string | null; cleared: number; clearsOnJoin: number; previousName: string | null }

/**
 * The owner or the surveyor invites a deconstruction company by email. A firm already on Tallyard with a member at
 * that email is appointed at once; otherwise the invite waits, and the firm becomes the contractor when it signs up as
 * a surveying or deconstruction firm with that email (resolveContractorInvites). Nothing is emailed from the sandbox.
 */
export function inviteContractorByEmail(state: AppData, actor: Actor, buildingId: string, email: string): ActionResult<ContractorInviteResult> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  const side = buildingSide(state, actor.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return fail(state, ERRORS.role)
  if (!isEmail(email)) return fail(state, CONTRACTOR_ERRORS.email)
  // An email at an organisation of another kind is treated like an unknown one, so the invite never tells anyone who
  // is on Tallyard: it waits, and only a surveying or deconstruction firm joining with it takes it up.
  const found = contractorOrgByEmail(state, email)
  const previousName = b.contractorOrgId ? (state.world.orgs[b.contractorOrgId]?.name ?? null) : null
  if (found) {
    const r = appointContractor(state, actor, buildingId, found)
    if (r.error || !r.value) return fail(state, r.error ?? CONTRACTOR_ERRORS.contractor)
    return ok(r.state, { status: 'appointed', orgName: state.world.orgs[found]?.name ?? null, cleared: r.value.cleared, clearsOnJoin: 0, previousName: r.value.previousName })
  }
  const waiting: ContractorInviteResult = { status: 'waiting', orgName: null, cleared: 0, clearsOnJoin: b.contractorOrgId ? datedByContractor(state.world, buildingId) : 0, previousName }
  const invite = { email: normaliseEmail(email), invitedAt: a.now, invitedByOrgId: a.org.id, invitedByUserId: a.user.id }
  if (b.contractorInvite?.email === invite.email) return ok(state, waiting)
  const w = structuredClone(state.world)
  w.buildings[buildingId].contractorInvite = invite
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `invited ${invite.email} to set availability dates`, href: `/app/buildings/${buildingId}` })
  return ok(s, waiting)
}

/** Withdraws an invite by email that no firm has taken up yet. */
export function withdrawContractorInvite(state: AppData, actor: Actor, buildingId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  const side = buildingSide(state, actor.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return fail(state, ERRORS.role)
  if (!b.contractorInvite) return ok(state)
  const w = structuredClone(state.world)
  w.buildings[buildingId].contractorInvite = null
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `withdrew the invite to ${b.contractorInvite.email}`, href: `/app/buildings/${buildingId}` })
  return ok(s)
}

/**
 * After someone joins Tallyard: each building waiting for a contractor at their email gets their firm as contractor,
 * when the firm is a surveying or deconstruction firm. The firm and the side that invited it are told.
 */
export function resolveContractorInvites(state: AppData, userId: string, now: string): AppData {
  const user = state.users[userId]
  if (!user || roleOfOrg(state, user.orgId) !== 'surveyor') return state
  const key = normaliseEmail(user.email)
  const waiting = Object.values(state.world.buildings).filter((b) => b.contractorInvite?.email === key)
  if (waiting.length === 0) return state
  const w = structuredClone(state.world)
  let s = state
  const orgName = w.orgs[user.orgId]?.name ?? ''
  const notes: { b: (typeof waiting)[number]; inviterOrgId: string; clearedText: string | null }[] = []
  for (const b of waiting) {
    const previousName = b.contractorOrgId && b.contractorOrgId !== user.orgId ? (w.orgs[b.contractorOrgId]?.name ?? null) : null
    const cleared = setContractorIn(w, b.id, user.orgId)
    notes.push({ b, inviterOrgId: b.contractorInvite?.invitedByOrgId ?? '', clearedText: datesClearedText(previousName, cleared, 'done') })
  }
  s = withWorld(s, w)
  for (const { b, inviterOrgId, clearedText } of notes) {
    const href = `/app/buildings/${b.id}`
    const inviter = s.world.orgs[inviterOrgId]?.name ?? 'The owner'
    s = log(s, { at: now, orgIds: buildingOrgIds(s.world.buildings[b.id]), buildingId: b.id, projectId: null, actorUserId: userId, actor: user.name, text: `joined Tallyard as the deconstruction contractor for ${b.name}`, href })
    s = notify(s, { orgIds: [user.orgId], kind: 'appointed', title: `${inviter} invited you to set availability dates at ${b.name}`, body: 'Say when each item is expected to come out. The owner decides what buyers see.', href: `${href}/availability`, at: now, actorUserId: null })
    s = notify(s, { orgIds: [inviterOrgId, ...(b.ownerOrgId && b.ownerOrgId !== inviterOrgId ? [b.ownerOrgId] : [])], kind: 'availability_set', title: `${orgName} joined and can set dates at ${b.name}`, body: ['They accepted your invitation.', clearedText, 'Their dates appear in the inventory once set.'].filter(Boolean).join(' '), href, at: now, actorUserId: null })
  }
  return s
}

export type ContractorDateEntry = { itemId: string; month: string | null }

/** The contractor sets (or clears, with null) the month each item is expected to come out. Returns how many changed. */
export function setContractorDates(state: AppData, actor: Actor, buildingId: string, entries: ContractorDateEntry[]): ActionResult<number> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!isBuildingContractor(state, actor.userId, buildingId)) return fail(state, CONTRACTOR_ERRORS.notContractor)
  for (const e of entries) {
    if (state.world.items[e.itemId]?.buildingId !== buildingId) return fail(state, CONTRACTOR_ERRORS.unknownItem)
    if (e.month !== null && !MONTH.test(e.month)) return fail(state, CONTRACTOR_ERRORS.badMonth)
  }
  const w = structuredClone(state.world)
  let changed = 0
  for (const e of entries) {
    const it = w.items[e.itemId]
    const next = e.month === null ? null : isoForMonth(b.programme.dismantlingStart, e.month)
    if (it.contractorAvailableFrom === next) continue
    it.contractorAvailableFrom = next
    it.contractorDatedOn = next === null ? null : a.today
    changed++
  }
  if (changed === 0) return ok(state, 0)
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: buildingOrgIds(b), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `set dates for ${plural(changed, 'item')}`, href: `/app/buildings/${buildingId}/inventory` })
  if (b.ownerOrgId) {
    // Folded per building, contractor and day: the count is every item this contractor dated today.
    const today = Object.values(w.items).filter((i) => i.buildingId === buildingId && i.contractorDatedOn === a.today).length
    const title = `${a.org.name} set dates for ${plural(today, 'item')} at ${b.name}`
    const body = 'Review them in the inventory and apply the ones you agree with.'
    s = notify(s, { orgIds: [b.ownerOrgId], kind: 'availability_set', title, body, href: `/app/buildings/${buildingId}/inventory`, at: a.now, actorUserId: a.user.id, key: `dates:${buildingId}:${a.org.id}`, fold: () => ({ title, body }) })
  }
  return ok(s, changed)
}

/** The owner applies the contractor's dates to private lots that are not reserved; other lots that differ are counted as skipped. */
export function applyContractorDates(state: AppData, actor: Actor, buildingId: string): ActionResult<{ applied: number; skipped: number }> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (buildingSide(state, actor.userId, buildingId) !== 'owner') return fail(state, ERRORS.role)
  const w = structuredClone(state.world)
  let applied = 0
  let skipped = 0
  for (const item of Object.values(state.world.items)) {
    if (item.buildingId !== buildingId || !item.contractorAvailableFrom) continue
    const lot = lotOfItem(state.world, item.id)
    if (!lot || lot.availableFrom === item.contractorAvailableFrom) continue
    if (lot.visibility !== 'private' || acceptedReservation(state, lot.id)) {
      skipped++
      continue
    }
    w.lots[lot.id].availableFrom = item.contractorAvailableFrom
    applied++
  }
  if (applied === 0) return ok(state, { applied, skipped })
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `applied the contractor's dates to ${plural(applied, 'lot')}`, href: `/app/buildings/${buildingId}/inventory` })
  return ok(s, { applied, skipped })
}
