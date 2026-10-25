// The client's indicative package for a lot: storage, testing and delivery to site, from the package engine.
// Built from the public listing and the project's own records only, so nothing of the seller's crosses.
import type { Lot, Project, PublicListing, World } from '../domain/types'
import type { Facility } from '../domain/types'
import { DEFAULT_ASSUMPTIONS as A, FACILITIES, facilityById } from '../domain/reference/assumptions'
import { FAMILIES } from '../domain/reference/families'
import { V1_ASSUMPTIONS } from '../domain/reference/v1assumptions'
import { buyerPackage, type BuyerPackage } from '../domain/engines/package'
import { timelineFit } from '../domain/engines/timeline'
import { listingOf } from './lots'
import type { ReservationEstimate } from './types'

/** Facilities that can hold the family: covered-only families never go to an open yard. */
export function eligibleFacilities(listing: PublicListing): Facility[] {
  const need = FAMILIES[listing.family].storage
  return FACILITIES.filter((f) => need === 'open_or_covered' || f.type === 'covered')
}

/** Road km from a hub to the project: the project's record, else the region table. */
export function hubKm(project: Project, facilityId: string): number {
  return project.hubDistancesKm[facilityId] ?? V1_ASSUMPTIONS.regionHubKm[project.region]?.[facilityId as 'HUB-BARK'] ?? A.listingKm
}

/** Testing is costed for steel that has not been tested or certified. */
export function needsTesting(listing: PublicListing): boolean {
  return listing.family === 'steel_section' && listing.testStatus !== 'tested' && listing.testStatus !== 'certified'
}

function packageAt(listing: PublicListing, project: Project, facility: Facility, storageMonths: number): BuyerPackage {
  const pieces = listing.quantity.pieces ?? 0
  return buyerPackage(
    {
      family: listing.family,
      pieces,
      units: listing.quantity.value,
      massT: listing.massT,
      baselineQty: listing.quantity.value,
      pricePerUnit: listing.price.guide,
      testing: needsTesting(listing),
      route: 'hub',
      facility,
      kmToProject: hubKm(project, facility.id),
      storageMonths,
    },
    A,
  )
}

/** The estimate for the whole lot on offer, at the guide price, via its hub (or the cheapest eligible one). */
export function estimateForListing(listing: PublicListing, project: Project, today: string): ReservationEstimate {
  const fit = timelineFit(listing.availability, project.startDate, today)
  const storageMonths = fit.storageMonths ?? 0
  let facility: Facility
  if (listing.collectionHubId) facility = facilityById(listing.collectionHubId)
  else {
    const ranked = eligibleFacilities(listing)
      .map((f) => ({ f, total: packageAt(listing, project, f, storageMonths).total }))
      .sort((x, y) => x.total - y.total || hubKm(project, x.f.id) - hubKm(project, y.f.id) || x.f.id.localeCompare(y.f.id))
    facility = ranked[0].f
  }
  const pkg = packageAt(listing, project, facility, storageMonths)
  return {
    lines: pkg.lines,
    total: pkg.total,
    costNew: pkg.costNew,
    saving: pkg.saving,
    savingPercent: pkg.savingPercent,
    pricePerUnit: pkg.pricePerUnit,
    storageMonths,
    facilityId: facility.id,
    facilityName: facility.name,
    testing: needsTesting(listing),
    fit: fit.fit,
  }
}

export function estimateForLot(world: World, lot: Lot, project: Project, today: string): ReservationEstimate {
  return estimateForListing(listingOf(world, lot), project, today)
}
