// The deconstruction contractor (owner-surveyor design 14.4.6): appointed per building by the owner or the surveyor,
// it says when each item is expected to come out. Its dates stay apart from the surveyor's estimate and never reach
// buyers: the owner applies them to private lots, and only the owner changes a lot's date.
import { monthKey } from '../../domain/dates'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, buildingOrgIds, buildingSide, isBuildingContractor, roleOfOrg } from '../access'
import { acceptedReservation, lotOfItem } from '../lots'
import { log, notify, plural } from '../notifications'
import { acting, fail, ok, withWorld } from './common'

export const CONTRACTOR_ERRORS = {
  contractor: 'Choose a deconstruction contractor.',
  notContractor: 'Only the appointed contractor can set these dates.',
  badMonth: 'Choose a valid month.',
  unknownItem: 'That item is not in this building.',
} as const

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** The date stored for a month: the dismantling start when it falls in that month, else the first (as expectedFromMonth). */
export function isoForMonth(dismantlingStart: string | null, key: string): string {
  if (dismantlingStart && monthKey(dismantlingStart) === key) return dismantlingStart
  return `${key}-01`
}

/** The owner or the surveyor invites a deconstruction contractor to set dates, or removes it. */
export function appointContractor(state: AppData, actor: Actor, buildingId: string, contractorOrgId: string | null): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  const side = buildingSide(state, actor.userId, buildingId)
  if (side !== 'owner' && side !== 'surveyor') return fail(state, ERRORS.role)
  if (contractorOrgId !== null && (!contractorOrgId || roleOfOrg(state, contractorOrgId) !== 'surveyor')) return fail(state, CONTRACTOR_ERRORS.contractor)
  if ((b.contractorOrgId ?? null) === contractorOrgId) return ok(state)
  const w = structuredClone(state.world)
  w.buildings[buildingId].contractorOrgId = contractorOrgId
  let s = withWorld(state, w)
  const href = `/app/buildings/${buildingId}`
  if (contractorOrgId === null) {
    s = log(s, { at: a.now, orgIds: [...buildingOrgIds(w.buildings[buildingId]), b.contractorOrgId ?? ''], buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: 'removed the deconstruction contractor', href })
    return ok(s)
  }
  const contractor = w.orgs[contractorOrgId].name
  s = log(s, { at: a.now, orgIds: buildingOrgIds(w.buildings[buildingId]), buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `invited ${contractor} to set availability dates`, href })
  s = notify(s, { orgIds: [contractorOrgId], kind: 'appointed', title: `${a.org.name} invited you to set availability dates at ${b.name}`, body: 'Say when each item is expected to come out. The owner decides what buyers see.', href: `${href}/availability`, at: a.now, actorUserId: a.user.id })
  if (side === 'surveyor' && b.ownerOrgId) {
    s = notify(s, { orgIds: [b.ownerOrgId], kind: 'availability_set', title: `${a.org.name} invited ${contractor} to ${b.name}`, body: 'They will set expected dates for each item. You can remove them in Overview.', href, at: a.now, actorUserId: a.user.id })
  }
  return ok(s)
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
