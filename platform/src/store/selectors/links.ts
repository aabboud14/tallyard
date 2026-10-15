// Share links (owner-surveyor design 14.4.7): the owner's list on the Sharing tab, blind about who opened each link,
// and the link page for anyone signed in. What openers see comes only from toPublicListing (via listingOf); they
// never see the owner's own name for the link.
import { formatDate } from '../../domain/dates'
import { titleFor } from '../../domain/reference/families'
import { activeLinkLots } from '../../domain/visibility'
import { orgTypeLabel } from '../../sandbox/accounts'
import type { AppData, Viewer } from '../types'
import { isBuildingOwner, projectSide, projectsOfUser, roleOfUser } from '../access'
import { acceptedReservation, isLotAvailable, listingOf } from '../lots'
import { listingCard, todayOf, type ListingCard } from './common'
import { itemQuantityText } from './owner'

export type ShareLinkRow = {
  id: string
  label: string
  href: string
  lotCount: number
  activeLotCount: number
  createdText: string
  createdByName: string
  status: 'active' | 'revoked'
  statusLabel: string
  revokedText: string | null
  openedText: string
  canRevoke: boolean
}

const TYPE_PLURALS: Record<string, string> = {
  'architecture practice': 'architecture practices',
  'developer or client': 'developers or clients',
  'donor building owner': 'donor building owners',
  'surveying or deconstruction firm': 'surveying or deconstruction firms',
  'sustainability consultancy': 'sustainability consultancies',
}

function typePlural(label: string, n: number): string {
  return n === 1 ? label : (TYPE_PLURALS[label] ?? `${label}s`)
}

/**
 * Who opened a link, by organisation type only: 'Not opened yet', 'Opened by 1 organisation (architecture practice)',
 * or 'Opened by 3 organisations (2 architecture practices, 1 developer or client)', types by count then by name.
 */
export function openedText(typeLabels: string[]): string {
  if (typeLabels.length === 0) return 'Not opened yet'
  if (typeLabels.length === 1) return `Opened by 1 organisation (${typeLabels[0]})`
  const counts = new Map<string, number>()
  for (const t of typeLabels) counts.set(t, (counts.get(t) ?? 0) + 1)
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en-GB')).map(([t, n]) => `${n} ${typePlural(t, n)}`)
  const n = typeLabels.length
  return `Opened by ${n} ${n === 1 ? 'organisation' : 'organisations'} (${parts.join(', ')})`
}

export type ShareLinksView = { rows: ShareLinkRow[]; eligible: { lotId: string; tag: string; title: string; quantityText: string; reserved: boolean }[]; canCreate: boolean }

/** The building's share links for its owner, newest first, and the shared lots a new link can hold. */
export function shareLinksView(state: AppData, viewer: Viewer, buildingId: string): ShareLinksView | null {
  if (!isBuildingOwner(state, viewer.userId, buildingId)) return null
  const orgId = state.users[viewer.userId].orgId
  const rows = Object.values(state.world.shareLinks)
    .filter((l) => l.buildingId === buildingId && l.ownerOrgId === orgId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .map((l) => {
      const active = l.revokedAt === null
      return {
        id: l.id,
        label: l.label,
        href: `/app/links/${l.id}`,
        lotCount: l.lotIds.length,
        activeLotCount: activeLinkLots(state.world, l).length,
        createdText: formatDate(l.createdAt.slice(0, 10)),
        createdByName: state.world.personas[l.createdByPersonaId]?.name ?? '',
        status: active ? ('active' as const) : ('revoked' as const),
        statusLabel: active ? 'Active' : 'Revoked',
        revokedText: l.revokedAt ? formatDate(l.revokedAt.slice(0, 10)) : null,
        openedText: openedText(l.opens.map((o) => orgTypeLabel(state.world.orgs[o.orgId]?.type ?? '').toLowerCase())),
        canRevoke: active,
      }
    })
  const eligible = Object.values(state.world.lots)
    .filter((lot) => lot.visibility === 'matched_only' && state.world.items[lot.itemId]?.buildingId === buildingId)
    .map((lot) => {
      const item = state.world.items[lot.itemId]
      return { lotId: lot.id, tag: item.tag, title: titleFor(item.spec), quantityText: itemQuantityText(item), reserved: !!acceptedReservation(state, lot.id) }
    })
    .sort((a, b) => a.tag.localeCompare(b.tag, 'en-GB', { numeric: true }))
  return { rows, eligible, canCreate: eligible.some((e) => !e.reserved) }
}

export type LinkView =
  | { state: 'inactive' }
  | { state: 'preview'; count: number; cards: ListingCard[] }
  | { state: 'terms'; count: number }
  | { state: 'open'; count: number; cards: ListingCard[]; materialLinks: boolean }

/**
 * The link page for anyone signed in: inactive when revoked or unknown; the owner's own organisation sees a preview;
 * everyone else first accepts the terms, then sees the lots as public listings.
 */
/** The link page's title, which the breadcrumb follows: the owner's organisation previews its own link. */
export const LINK_PAGE_TITLES = { preview: 'Your share link', other: 'Shared with you by link' } as const

export function linkPageTitle(state: AppData, viewer: Viewer, linkId: string): string {
  const link = state.world.shareLinks[linkId]
  const orgId = state.users[viewer.userId]?.orgId
  return link && link.revokedAt === null && orgId && link.ownerOrgId === orgId ? LINK_PAGE_TITLES.preview : LINK_PAGE_TITLES.other
}

export function linkView(state: AppData, viewer: Viewer, linkId: string): LinkView {
  const link = state.world.shareLinks[linkId]
  const user = state.users[viewer.userId]
  if (!link || link.revokedAt !== null || !user) return { state: 'inactive' }
  const today = todayOf(viewer)
  const role = roleOfUser(state, viewer.userId)
  const savedOrg = role === 'architect' ? user.orgId : null
  const lots = activeLinkLots(state.world, link)
    .map((id) => state.world.lots[id])
    .filter((lot) => isLotAvailable(state, lot, null))
  const cards = () => lots.map((lot) => listingCard(state, listingOf(state.world, lot), null, today, savedOrg))
  if (link.ownerOrgId === user.orgId) return { state: 'preview', count: lots.length, cards: cards() }
  if (!link.opens.some((o) => o.orgId === user.orgId)) return { state: 'terms', count: lots.length }
  const clientSide = role === 'owner' && projectsOfUser(state, viewer.userId).some((p) => projectSide(state, viewer.userId, p.id) === 'client')
  const materialLinks = role === 'architect' || role === 'client' || role === 'consultant' || clientSide
  return { state: 'open', count: lots.length, cards: cards(), materialLinks }
}
