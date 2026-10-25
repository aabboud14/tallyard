// View helpers for the architect's marketplace screens (brief/09-V1-PRODUCT.md sections 3.3, 6 and 13.4, 13.9, 13.10).
// Pure: World in, plain values out. The screens format what these return; they never count or compare.
import type { Availability, PublicListing, World } from '../../domain/types'
import type { BrowseFilters, BrowseSort, Fit, Typology, WishStatus } from '../../domain/v1types'
import { NO_FILTERS } from '../../domain/v1types'
import { browseView, saveTargetsFor, type SaveTarget } from '../v1selectors'
import { generalWishlist, lotByPublicIdOrNull, projectWishlist } from '../v1actions'
import * as f from '../../domain/format'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { RAISED_FLOOR_PANEL_M2 } from '../../domain/reference/families'
import { carbonAvoided, type CarbonResult } from '../../domain/engines/carbon'
import { guidePrice, type GuidePrice } from '../../domain/engines/pricing'
import { factorQty } from '../../domain/engines/measures'

/** Short words for the fit tag on a card: the start of each fixed phrase (TIMELINE_TEXT), which stays on the listing and the wish list. */
export const FIT_TAG: Record<Fit, string> = { now: 'Available now', in_time: 'Available in time', tight: 'Tight', late: 'Not available in time' }

export type Tone = 'teal' | 'survey' | 'oxide'

/** Teal when it fits, survey yellow when tight, oxide when late (docs/DESIGN.md). */
export function fitTone(fit: Fit): Tone {
  return fit === 'late' ? 'oxide' : fit === 'tight' ? 'survey' : 'teal'
}

/** The storage line under a fit: months held in storage before the start, or nothing for a late lot. */
export function storageText(storageMonths: number | null): string | null {
  if (storageMonths === null) return null
  if (storageMonths === 0) return 'No storage before the start.'
  return `About ${f.months(storageMonths)} in storage before the start.`
}

/** The availability window for the timeline strip, or null for a lot in stock. */
export function stripWindow(a: Availability): { start: string; end: string } | null {
  return a.kind === 'window' ? { start: a.windowStart, end: a.windowEnd } : null
}

export type TypologyCounts = Record<Typology | 'all', number>

/** How many listings each typology chip would show, with every other filter as it stands. */
export function typologyCounts(world: World, personaId: string, filters: BrowseFilters, sort: BrowseSort, projectId: string | null): TypologyCounts {
  const n = (typology: Typology | null) => browseView(world, personaId, { ...filters, typology }, sort, projectId).cards.length
  return { all: n(null), structure: n('structure'), envelope: n('envelope'), finishes: n('finishes') }
}

/** Filters set in the "More filters" panel: everything except the typology chips. */
export function moreFilterCount(filters: BrowseFilters): number {
  return (['family', 'availableBy', 'condition', 'region', 'band', 'fitsStartDate'] as const).filter((k) => filters[k] !== null).length
}

export function anyFilter(filters: BrowseFilters): boolean {
  return (Object.keys(NO_FILTERS) as (keyof BrowseFilters)[]).some((k) => filters[k] !== null)
}

export type SaveMenuRow = SaveTarget & {
  /** The wish list item to remove when the row is saved; null when not saved. */
  itemId: string | null
  status: WishStatus | null
  /** One click adds when not saved, removes when saved. False when neither is allowed. */
  canToggle: boolean
  /** Why the row is disabled, or the item's state; null when there is nothing to say. */
  note: string | null
}

export const SAVE_NOTES = {
  approved: 'Approved by the client. It cannot be removed.',
  sent: 'Sent to the client. Clicking removes it from their approvals.',
} as const

/** The save popover for a listing: each of the architect's projects, then Saved. Empty for every other role. */
export function saveMenuFor(world: World, personaId: string, publicId: string): SaveMenuRow[] {
  const targets = saveTargetsFor(world, personaId, publicId)
  if (targets.length === 0) return []
  const orgId = world.personas[personaId]?.orgId ?? ''
  return targets.map((t) => {
    const list = t.projectId === null ? generalWishlist(world, orgId) : projectWishlist(world, t.projectId)
    const item = list?.items.find((it) => it.publicId === publicId) ?? null
    if (item) {
      const approved = item.status === 'approved'
      return { ...t, itemId: item.id, status: item.status, canToggle: !approved, note: approved ? SAVE_NOTES.approved : item.status === 'sent' ? SAVE_NOTES.sent : null }
    }
    return { ...t, itemId: null, status: null, canToggle: t.allowed, note: t.allowed ? null : t.reason }
  })
}

/** Whether the listing sits on any of the practice's lists. */
export function isSavedAnywhere(rows: SaveMenuRow[]): boolean {
  return rows.some((r) => r.saved)
}

/** Whether a public ID names a lot shared in confidence (never open, never private). */
export function isSharedLot(world: World, publicId: string): boolean {
  return lotByPublicIdOrNull(world, publicId)?.visibility === 'matched_only'
}

/**
 * The working behind "How this is calculated" on a listing, rebuilt from public fields only: the same functions
 * toPublicListing uses, at the listing's public quantity and the marketplace's standard haul.
 */
export function listingCalc(l: PublicListing): { carbon: CarbonResult | null; guide: GuidePrice } {
  const areaM2 = l.family === 'raised_floor' ? l.quantity.value * RAISED_FLOOR_PANEL_M2 : l.quantity.unit === 'm2' ? l.quantity.value : null
  const qty = factorQty(l.family, { units: l.quantity.value, massT: l.massT, pieces: l.quantity.pieces, areaM2, volumeM3: null })
  const carbon = l.carbon ? carbonAvoided({ family: l.family, sourceType: l.sourceType, baselineQty: qty, baselineMassT: l.massT, reuseQty: qty, reuseMassT: l.massT, reuseKm: A.listingKm }, A) : null
  return { carbon, guide: guidePrice(l.family, l.condition, l.testStatus, l.price.signal, A) }
}
