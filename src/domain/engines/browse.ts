// Browse filters, sorts and filter options over public listings (brief/09-V1-PRODUCT.md section 13.9). Pure.
import type { Condition, FamilyId, PublicListing } from '../types'
import type { BrowseFilters, BrowseSort } from '../v1types'
import { DEMO_TODAY } from '../constants'
import { addDays, formatQuarter, isOnOrBefore, quarterWindow } from '../dates'
import { FAMILY_IDS } from '../reference/families'
import { V1_ASSUMPTIONS } from '../reference/v1assumptions'
import { typologyOf } from './typology'
import { sustainabilityBand } from './band'
import { timelineFit } from './timeline'

export function filterListings(listings: PublicListing[], f: BrowseFilters, today: string = DEMO_TODAY, tightDays: number = V1_ASSUMPTIONS.timeline.tightDays): PublicListing[] {
  return listings.filter((l) => {
    if (f.typology !== null && typologyOf(l.family) !== f.typology) return false
    if (f.family !== null && l.family !== f.family) return false
    if (f.availableBy !== null && l.availability.kind === 'window' && !isOnOrBefore(l.availability.windowStart, f.availableBy)) return false
    if (f.condition !== null && l.condition !== f.condition) return false
    if (f.region !== null && l.location.label !== f.region) return false
    if (f.band !== null && sustainabilityBand(l.carbon).band !== f.band) return false
    if (f.fitsStartDate !== null && timelineFit(l.availability, f.fitsStartDate, today, tightDays).fit === 'late') return false
    return true
  })
}

function byPublicId(a: PublicListing, b: PublicListing): number {
  return a.publicId < b.publicId ? -1 : a.publicId > b.publicId ? 1 : 0
}

/** A new sorted array: newest listed, most carbon avoided (nothing claimed last) or lowest guide price; ties by public ID. */
export function sortListings(listings: PublicListing[], sort: BrowseSort): PublicListing[] {
  const out = [...listings]
  if (sort === 'newest') {
    out.sort((a, b) => (a.listedMonth < b.listedMonth ? 1 : a.listedMonth > b.listedMonth ? -1 : 0) || byPublicId(a, b))
  } else if (sort === 'carbon') {
    out.sort((a, b) => {
      if (a.carbon === null && b.carbon === null) return byPublicId(a, b)
      if (a.carbon === null) return 1
      if (b.carbon === null) return -1
      return b.carbon.avoidedT - a.carbon.avoidedT || byPublicId(a, b)
    })
  } else {
    out.sort((a, b) => a.price.guide - b.price.guide || byPublicId(a, b))
  }
  return out
}

export type AvailabilityOption = { value: string; label: string }

export type BrowseOptions = {
  families: FamilyId[]
  regions: string[]
  conditions: Condition[]
  /** The next six quarter starts after today, for "available by". */
  availability: AvailabilityOption[]
}

/** The first days of the next `count` quarters after `today`. */
export function nextQuarterStarts(today: string = DEMO_TODAY, count = 6): AvailabilityOption[] {
  const out: AvailabilityOption[] = []
  let start = addDays(quarterWindow(today).end, 1)
  for (let i = 0; i < count; i++) {
    out.push({ value: start, label: formatQuarter(start) })
    start = addDays(quarterWindow(start).end, 1)
  }
  return out
}

export function filterOptions(listings: PublicListing[], today: string = DEMO_TODAY): BrowseOptions {
  const families = FAMILY_IDS.filter((id) => listings.some((l) => l.family === id))
  const regions = [...new Set(listings.map((l) => l.location.label))].sort((a, b) => a.localeCompare(b, 'en-GB'))
  const conditions = (['A', 'B', 'C'] as Condition[]).filter((c) => listings.some((l) => l.condition === c))
  return { families, regions, conditions, availability: nextQuarterStarts(today) }
}
