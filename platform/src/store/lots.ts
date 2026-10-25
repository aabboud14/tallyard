// Lots as the platform sees them: the world's visibility rules plus reservations on top.
// A lot with an accepted reservation is held for that project and leaves the marketplace for everyone else.
import type { Lot, Project, PublicListing, World } from '../domain/types'
import type { Wishlist, WishlistItem } from '../domain/v1types'
import { DEFAULT_ASSUMPTIONS as A } from '../domain/reference/assumptions'
import { listingFor, lotsVisibleToProject } from '../domain/visibility'
import type { AppData, Reservation } from './types'

export const LOT_ERRORS = {
  noLot: 'This listing is not available.',
  notShared: 'Not shared with this project.',
  notAvailable: 'No longer available.',
  reserved: 'Reserved by another buyer.',
  sharedToSaved: 'Shared in confidence with a project. It can be saved only to a project it is shared with.',
  noProject: 'That project could not be found.',
} as const

export function lotByPublicId(world: World, publicId: string): Lot | null {
  return Object.values(world.lots).find((l) => l.publicId === publicId) ?? null
}

export function lotOfItem(world: World, itemId: string): Lot | null {
  return Object.values(world.lots).find((l) => l.itemId === itemId) ?? null
}

/** The only way the buyer side reads a lot: its public projection. */
export function listingOf(world: World, lot: Lot): PublicListing {
  return listingFor(world, lot.id, A)
}

export function ownerOrgOfLot(world: World, lot: Lot): string | null {
  const item = world.items[lot.itemId]
  return item ? (world.buildings[item.buildingId]?.ownerOrgId ?? null) : null
}

export function reservationsForLot(state: AppData, lotId: string): Reservation[] {
  return Object.values(state.reservations).filter((r) => r.lotId === lotId)
}

/** The accepted reservation holding this lot, if any. */
export function acceptedReservation(state: AppData, lotId: string): Reservation | null {
  return reservationsForLot(state, lotId).find((r) => r.status === 'accepted') ?? null
}

export function projectCanSee(world: World, project: Project, lot: Lot): boolean {
  return lotsVisibleToProject(world, project).includes(lot.id)
}

/** Still on offer, and not held for another project. With a project, a lot held for that project counts as available to it. */
export function isLotAvailable(state: AppData, lot: Lot, projectId: string | null): boolean {
  if (listingOf(state.world, lot).status !== 'Available') return false
  const held = acceptedReservation(state, lot.id)
  return !held || (projectId !== null && held.projectId === projectId)
}

/** Open lots on the marketplace that are available and not held for anyone. */
export function marketplaceListings(state: AppData): PublicListing[] {
  return Object.values(state.world.lots)
    .filter((l) => l.visibility === 'open' && isLotAvailable(state, l, null))
    .map((l) => listingOf(state.world, l))
    .sort((x, y) => (x.publicId < y.publicId ? -1 : x.publicId > y.publicId ? 1 : 0))
}

/** The project's shortlist (its wish list), if it has one. */
export function projectWishlist(world: World, projectId: string): Wishlist | null {
  const p = world.projects[projectId]
  if (!p) return null
  return Object.values(world.wishlists).find((l) => l.projectId === projectId && l.orgId === p.architectOrgId) ?? null
}

/** The practice's Saved list, with no project, if it has one. */
export function generalWishlist(world: World, orgId: string): Wishlist | null {
  return Object.values(world.wishlists).find((l) => l.projectId === null && l.orgId === orgId) ?? null
}

/** The list holding a shortlist item. Item IDs carry their list's suffix, so they are unique across lists. */
export function listOfItem(world: World, itemId: string): { list: Wishlist; item: WishlistItem } | null {
  for (const list of Object.values(world.wishlists)) {
    const item = list.items.find((x) => x.id === itemId)
    if (item) return { list, item }
  }
  return null
}

function suffix(id: string): string {
  const i = id.indexOf('_')
  return i < 0 ? id : id.slice(i + 1)
}

/** The ID a project's or practice's list takes when it is first needed. */
export function listIdFor(orgId: string, projectId: string | null): string {
  return projectId === null ? `wl_${suffix(orgId)}` : `wl_${suffix(projectId)}`
}

/** Why a lot cannot go on a list, or null when it can. */
export function saveBlock(state: AppData, lot: Lot | null, projectId: string | null): string | null {
  if (!lot || lot.visibility === 'private') return LOT_ERRORS.noLot
  if (projectId === null) {
    if (lot.visibility !== 'open') return LOT_ERRORS.sharedToSaved
  } else {
    const p = state.world.projects[projectId]
    if (!p) return LOT_ERRORS.noProject
    if (!projectCanSee(state.world, p, lot)) return LOT_ERRORS.notShared
  }
  if (listingOf(state.world, lot).status !== 'Available') return LOT_ERRORS.notAvailable
  if (!isLotAvailable(state, lot, projectId)) return LOT_ERRORS.reserved
  return null
}
