// Shortlists (the domain's wish lists): the architect saves, moves, notes and sends; the client decides.
// Adapted from the demo's v1actions. Every action checks the person's side on the project first.
import type { Wishlist, WishlistItem } from '../../domain/v1types'
import { addToWishlist, decideItem as decideWish, editNote, MOVE_REASONS, putItem, removeFromWishlist, reopenItem as reopenWish, takeItem } from '../../domain/engines/wishlist'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, isProjectArchitect, isProjectClient, projectOrgIds } from '../access'
import { generalWishlist, isLotAvailable, listIdFor, listingOf, listOfItem, lotByPublicId, projectCanSee, projectWishlist, saveBlock } from '../lots'
import { log, notify, plural } from '../notifications'
import { acting, clean, fail, ok, withWorld } from './common'

export const SHORTLIST_ERRORS = {
  noItem: 'That item is no longer on the list.',
  approvedRemove: MOVE_REASONS.approved,
  sameList: MOVE_REASONS.present,
  sharedMove: 'Shared in confidence with this project. It cannot be moved.',
  nothingToSend: 'Nothing selected can go to the client.',
  notSent: 'Only an item sent to the client can be decided.',
  notDeclined: 'Only a declined item can be reopened.',
  noteLocked: 'The note can be edited while the item is shortlisted or declined.',
  revoked: 'No longer shared with this project.',
  notAvailable: 'No longer available.',
} as const

function withList(state: AppData, list: Wishlist): AppData {
  const w = structuredClone(state.world)
  w.wishlists[list.id] = structuredClone(list)
  return withWorld(state, w)
}

/** The architect may change a list held by their practice: a project they work on, or Saved. */
function architectOwnsList(state: AppData, userId: string, list: Wishlist): boolean {
  const u = state.users[userId]
  if (!u || list.orgId !== u.orgId) return false
  if (list.projectId === null) return Object.values(state.world.orgs).some((o) => o.id === u.orgId && o.type === 'Architect')
  return isProjectArchitect(state, userId, list.projectId)
}

function titleOf(state: AppData, publicId: string): string {
  const lot = lotByPublicId(state.world, publicId)
  return lot ? listingOf(state.world, lot).title : publicId
}

/** Saves a material to a project's shortlist or to Saved. Saving twice is a no-op. Returns the shortlist item ID. */
export function saveToProject(state: AppData, actor: Actor, publicId: string, projectId: string | null): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (a.role !== 'architect') return fail(state, ERRORS.role)
  if (projectId !== null && !isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const lot = lotByPublicId(state.world, publicId)
  const blocked = saveBlock(state, lot, projectId)
  if (blocked) return fail(state, blocked)
  const list: Wishlist = (projectId === null ? generalWishlist(state.world, a.org.id) : projectWishlist(state.world, projectId)) ?? { id: listIdFor(a.org.id, projectId), orgId: a.org.id, projectId, items: [] }
  const existing = list.items.find((x) => x.publicId === publicId)
  if (existing) return ok(state, existing.id)
  const next = addToWishlist(list, publicId, a.persona.id, a.today)
  const added = next.items[next.items.length - 1]
  let s = withList(state, next)
  if (projectId !== null) {
    const p = s.world.projects[projectId]
    s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `shortlisted ${titleOf(s, publicId)}`, href: `/app/projects/${projectId}/shortlist` })
  }
  return ok(s, added.id)
}

/** Removes an item. An approved item stays. */
export function removeFromList(state: AppData, actor: Actor, itemId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const found = listOfItem(state.world, itemId)
  if (!found) return fail(state, SHORTLIST_ERRORS.noItem)
  if (!architectOwnsList(state, actor.userId, found.list)) return fail(state, ERRORS.role)
  if (found.item.status === 'approved') return fail(state, SHORTLIST_ERRORS.approvedRemove)
  let s = withList(state, removeFromWishlist(found.list, itemId))
  if (found.list.projectId) {
    const p = s.world.projects[found.list.projectId]
    s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId: p.id, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `removed ${titleOf(s, found.item.publicId)} from the shortlist`, href: `/app/projects/${p.id}/shortlist` })
  }
  return ok(s)
}

/** Moves a shortlisted or declined item to another project or to Saved. A shared lot never moves. */
export function moveItem(state: AppData, actor: Actor, itemId: string, toProjectId: string | null): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const found = listOfItem(state.world, itemId)
  if (!found) return fail(state, SHORTLIST_ERRORS.noItem)
  if (!architectOwnsList(state, actor.userId, found.list)) return fail(state, ERRORS.role)
  if (toProjectId !== null && !isProjectArchitect(state, actor.userId, toProjectId)) return fail(state, ERRORS.role)
  if (found.list.projectId === toProjectId) return fail(state, SHORTLIST_ERRORS.sameList)
  const lot = lotByPublicId(state.world, found.item.publicId)
  if (lot && lot.visibility === 'matched_only') return fail(state, SHORTLIST_ERRORS.sharedMove)
  const blocked = saveBlock(state, lot, toProjectId)
  if (blocked) return fail(state, blocked)
  const taken = takeItem(found.list, itemId)
  if (!taken.item) return fail(state, taken.reason ?? SHORTLIST_ERRORS.noItem)
  const orgId = found.list.orgId
  const target: Wishlist = (toProjectId === null ? generalWishlist(state.world, orgId) : projectWishlist(state.world, toProjectId)) ?? { id: listIdFor(orgId, toProjectId), orgId, projectId: toProjectId, items: [] }
  const put = putItem(target, { ...taken.item, sentOn: null, sentMessage: null })
  if (put.reason) return fail(state, put.reason)
  const moved = put.list.items[put.list.items.length - 1]
  let s = withList(withList(state, taken.list), put.list)
  const label = (pid: string | null) => (pid === null ? 'Saved' : s.world.projects[pid].name)
  for (const pid of [found.list.projectId, toProjectId]) {
    if (pid === null) continue
    const p = s.world.projects[pid]
    s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId: pid, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `moved ${titleOf(s, found.item.publicId)} from ${label(found.list.projectId)} to ${label(toProjectId)}`, href: `/app/projects/${pid}/shortlist` })
  }
  return ok(s, moved.id)
}

/** The architect's note on an item, while it is shortlisted or declined. */
export function editItemNote(state: AppData, actor: Actor, itemId: string, note: string): ActionResult {
  const found = listOfItem(state.world, itemId)
  if (!found) return fail(state, SHORTLIST_ERRORS.noItem)
  if (!architectOwnsList(state, actor.userId, found.list)) return fail(state, ERRORS.role)
  if (found.item.status !== 'pending' && found.item.status !== 'declined') return fail(state, SHORTLIST_ERRORS.noteLocked)
  const next = editNote(found.list, itemId, clean(note, 1000))
  return next === found.list ? ok(state) : ok(withList(state, next))
}

/** Sends the chosen shortlisted items (or every shortlisted item, with null) to the client, with a message. */
export function sendToClient(state: AppData, actor: Actor, projectId: string, itemIds: string[] | null, message: string): ActionResult<number> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const list = projectWishlist(state.world, projectId)
  if (!list) return fail(state, SHORTLIST_ERRORS.nothingToSend)
  const chosen = itemIds === null ? null : new Set(itemIds)
  const sendable = (it: WishlistItem) => {
    if (it.status !== 'pending' || (chosen && !chosen.has(it.id))) return false
    const lot = lotByPublicId(state.world, it.publicId)
    return !!lot && projectCanSee(state.world, p, lot) && isLotAvailable(state, lot, projectId)
  }
  const going = list.items.filter(sendable)
  if (going.length === 0) return fail(state, SHORTLIST_ERRORS.nothingToSend)
  const text = clean(message, 1000)
  const next: Wishlist = { ...list, items: list.items.map((it) => (sendable(it) ? { ...it, status: 'sent' as const, sentOn: a.today, sentMessage: text || null } : it)) }
  let s = withList(state, next)
  const what = going.length === 1 ? titleOf(s, going[0].publicId) : plural(going.length, 'material')
  s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `sent ${what} to the client for approval`, href: `/app/projects/${projectId}/approvals` })
  s = notify(s, {
    orgIds: [p.clientOrgId],
    kind: 'sent_to_client',
    title: `${plural(going.length, 'material')} to approve on ${p.name}`,
    body: text ? `${a.user.name}: ${text}` : `Sent by ${a.user.name}, ${a.org.name}.`,
    href: `/app/projects/${projectId}/approvals`,
    at: a.now,
    actorUserId: a.user.id,
  })
  return ok(s, going.length)
}

/** The client approves or declines an item sent to them, with an optional note. */
export function decideItem(state: AppData, actor: Actor, projectId: string, itemId: string, decision: 'approved' | 'declined', note: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectClient(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const list = projectWishlist(state.world, projectId)
  const item = list?.items.find((x) => x.id === itemId)
  if (!list || !item) return fail(state, SHORTLIST_ERRORS.noItem)
  if (item.status !== 'sent') return fail(state, SHORTLIST_ERRORS.notSent)
  const lot = lotByPublicId(state.world, item.publicId)
  if (!lot || !projectCanSee(state.world, p, lot)) return fail(state, SHORTLIST_ERRORS.revoked)
  if (!isLotAvailable(state, lot, projectId)) return fail(state, SHORTLIST_ERRORS.notAvailable)
  const text = clean(note, 1000)
  let s = withList(state, decideWish(list, itemId, decision, text, a.today))
  const title = titleOf(s, item.publicId)
  const word = decision === 'approved' ? 'approved' : 'declined'
  s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `${word} ${title}`, href: `/app/projects/${projectId}/shortlist` })
  s = notify(s, {
    orgIds: [p.architectOrgId, p.consultantOrgId],
    kind: 'client_decision',
    title: `${a.org.name} ${word} ${title}`,
    body: text ? `${a.user.name}: ${text}` : `On ${p.name}.`,
    href: `/app/projects/${projectId}/shortlist`,
    at: a.now,
    actorUserId: a.user.id,
  })
  return ok(s)
}

/** A declined item goes back to the shortlist with the architect's new note, ready to send again. */
export function reopenItem(state: AppData, actor: Actor, itemId: string, note: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const found = listOfItem(state.world, itemId)
  if (!found) return fail(state, SHORTLIST_ERRORS.noItem)
  if (!architectOwnsList(state, actor.userId, found.list)) return fail(state, ERRORS.role)
  if (found.item.status !== 'declined') return fail(state, SHORTLIST_ERRORS.notDeclined)
  let s = withList(state, reopenWish(found.list, itemId, clean(note, 1000)))
  if (found.list.projectId) {
    const p = s.world.projects[found.list.projectId]
    s = log(s, { at: a.now, orgIds: projectOrgIds(p), projectId: p.id, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `reopened ${titleOf(s, found.item.publicId)}`, href: `/app/projects/${p.id}/shortlist` })
  }
  return ok(s)
}
