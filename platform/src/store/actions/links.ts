// Share links (owner-surveyor design 14.4.6): an owner sends a revocable link to chosen shared lots of one building.
// Anyone signed in who accepts the link's confidentiality terms sees those lots as public listings, and their
// projects can shortlist them. The owner learns only how many organisations opened the link and their types.
import type { ShareLink } from '../../domain/types'
import { orgTypeLabel } from '../../sandbox/accounts'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, isBuildingOwner } from '../access'
import { mint } from '../ids'
import { acceptedReservation } from '../lots'
import { log, notify, plural } from '../notifications'
import { acting, clean, fail, ok, withWorld } from './common'

export const LINK_ERRORS = {
  lots: 'Choose at least one shared lot.',
  notShared: 'Only shared lots can go in a link. Share them in Listings first.',
  reserved: 'A reserved lot cannot be shared by link.',
  noLink: 'This link is no longer active.',
} as const

export type ShareLinkInput = { buildingId: string; lotIds: string[]; label: string }

/** "An architecture practice", "A developer or client". */
export function orgTypePhrase(type: string): string {
  const label = orgTypeLabel(type).toLowerCase()
  return `${/^[aeiou]/.test(label) ? 'An' : 'A'} ${label}`
}

/** The owner makes a link to some of a building's shared lots. Returns the link ID, which is its address. */
export function createShareLink(state: AppData, actor: Actor, input: ShareLinkInput): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const b = state.world.buildings[input.buildingId]
  if (!b) return fail(state, ERRORS.noBuilding)
  if (!isBuildingOwner(state, actor.userId, input.buildingId)) return fail(state, ERRORS.role)
  const lotIds = [...new Set(input.lotIds)]
  if (lotIds.length === 0) return fail(state, LINK_ERRORS.lots)
  for (const id of lotIds) {
    const lot = state.world.lots[id]
    if (!lot || state.world.items[lot.itemId]?.buildingId !== b.id) return fail(state, LINK_ERRORS.lots)
    if (lot.visibility !== 'matched_only') return fail(state, LINK_ERRORS.notShared)
    if (acceptedReservation(state, id)) return fail(state, LINK_ERRORS.reserved)
  }
  const m = mint(state, 'lnk', (id) => !!state.world.shareLinks[id])
  const label = clean(input.label, 80) || `${plural(lotIds.length, 'lot')} from ${b.name}`
  const link: ShareLink = { id: m.id, ownerOrgId: a.org.id, buildingId: b.id, lotIds, label, createdAt: a.now, createdByPersonaId: a.persona.id, revokedAt: null, opens: [] }
  const w = structuredClone(m.state.world)
  w.shareLinks[link.id] = link
  let s = withWorld(m.state, w)
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: b.id, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `created a share link for ${plural(lotIds.length, 'lot')}`, href: `/app/buildings/${b.id}/sharing` })
  return ok(s, link.id)
}

/** Anyone signed in accepts the link's terms and opens it. The owner hears of the first open by each organisation, blind. */
export function openShareLink(state: AppData, actor: Actor, linkId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const link = state.world.shareLinks[linkId]
  if (!link || link.revokedAt !== null) return fail(state, LINK_ERRORS.noLink)
  if (link.ownerOrgId === a.org.id || link.opens.some((o) => o.orgId === a.org.id)) return ok(state)
  const w = structuredClone(state.world)
  w.shareLinks[linkId].opens.push({ orgId: a.org.id, at: a.now })
  let s = withWorld(state, w)
  // No person and no organisation name: only the type of the organisation that opened it.
  s = notify(s, {
    orgIds: [link.ownerOrgId],
    kind: 'link_opened',
    title: 'Your share link was opened',
    body: `${orgTypePhrase(a.org.type)} opened ${link.label}.`,
    href: `/app/buildings/${link.buildingId}/sharing`,
    at: a.now,
    actorUserId: null,
    key: `link:${link.id}`,
    fold: (count) => ({ title: 'Your share link was opened', body: `${count} organisations opened ${link.label}.` }),
  })
  return ok(s)
}

/** The owner withdraws a link. Its lots leave every opener's view and projects at once. */
export function revokeShareLink(state: AppData, actor: Actor, linkId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const link = state.world.shareLinks[linkId]
  if (!link) return fail(state, LINK_ERRORS.noLink)
  if (a.role !== 'owner' || link.ownerOrgId !== a.org.id) return fail(state, ERRORS.role)
  if (link.revokedAt !== null) return ok(state)
  const w = structuredClone(state.world)
  w.shareLinks[linkId].revokedAt = a.now
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: [a.org.id], buildingId: link.buildingId, projectId: null, actorUserId: a.user.id, actor: a.user.name, text: `revoked the share link ${link.label}`, href: `/app/buildings/${link.buildingId}/sharing` })
  s = notify(s, { orgIds: link.opens.map((o) => o.orgId), kind: 'lots_shared', title: 'A shared link was withdrawn', body: 'Lots shared with you by link are no longer available. Any you saved show as no longer shared.', href: '/app/home', at: a.now, actorUserId: null })
  return ok(s)
}
