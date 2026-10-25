// Which lots a project or the open market can see (02 section 4, rule 5; 04 section 2).
import type { Project, PublicListing, ShareLink, World } from './types'
import type { Assumptions } from './reference/assumptions'
import { toPublicListing } from './privacy/publicListing'

export function listingFor(world: World, lotId: string, a: Assumptions): PublicListing {
  const lot = world.lots[lotId]
  const item = world.items[lot.itemId]
  const building = world.buildings[item.buildingId]
  return toPublicListing(lot, item, building, world.snapshot, a)
}

/** The link's lots still shared or published, from the link owner's own buildings, in the link's order. Empty when revoked. */
export function activeLinkLots(world: World, link: ShareLink): string[] {
  if (link.revokedAt !== null) return []
  return link.lotIds.filter((id) => {
    const lot = world.lots[id]
    if (!lot || lot.visibility === 'private') return false
    const item = world.items[lot.itemId]
    const owner = item ? (world.buildings[item.buildingId]?.ownerOrgId ?? null) : null
    return owner !== null && owner === link.ownerOrgId
  })
}

/** Lots an organisation reaches through the share links it has opened. */
export function lotsSharedByLinkWithOrg(world: World, orgId: string): string[] {
  if (!orgId) return []
  const out = new Set<string>()
  for (const link of Object.values(world.shareLinks ?? {})) {
    if (!link.opens.some((o) => o.orgId === orgId)) continue
    for (const id of activeLinkLots(world, link)) out.add(id)
  }
  return [...out]
}

/**
 * Open lots, plus matched-only lots from owners who approved the project once the terms are accepted, plus
 * matched-only lots that the project's architect or client reached through a share link (the link has its own terms).
 */
export function lotsVisibleToProject(world: World, project: Project): string[] {
  const byLink = new Set([...lotsSharedByLinkWithOrg(world, project.architectOrgId), ...lotsSharedByLinkWithOrg(world, project.clientOrgId)])
  return Object.values(world.lots)
    .filter((lot) => {
      if (lot.visibility === 'open') return true
      if (lot.visibility !== 'matched_only') return false
      if (byLink.has(lot.id)) return true
      if (!project.termsAccepted) return false
      const owner = world.buildings[world.items[lot.itemId].buildingId].ownerOrgId
      return owner !== null && project.approvedByOwnerOrgIds.includes(owner)
    })
    .map((l) => l.id)
}

export function listingsVisibleToProject(world: World, project: Project, a: Assumptions): PublicListing[] {
  return lotsVisibleToProject(world, project).map((id) => listingFor(world, id, a))
}

/** Browse: open lots with status Available, sorted by public ID. */
export function browseListings(world: World, a: Assumptions): PublicListing[] {
  return Object.values(world.lots)
    .filter((l) => l.visibility === 'open')
    .map((l) => listingFor(world, l.id, a))
    .filter((l) => l.status === 'Available')
    .sort((x, y) => (x.publicId < y.publicId ? -1 : x.publicId > y.publicId ? 1 : 0))
}

/** A listing by public ID, if the project can see it (open, or shared in confidence). */
export function listingForProject(world: World, project: Project | null, publicId: string, a: Assumptions): PublicListing | null {
  const lot = Object.values(world.lots).find((l) => l.publicId === publicId)
  if (!lot) return null
  const visible = project ? lotsVisibleToProject(world, project) : Object.values(world.lots).filter((l) => l.visibility === 'open').map((l) => l.id)
  if (!visible.includes(lot.id)) return null
  return listingFor(world, lot.id, a)
}
