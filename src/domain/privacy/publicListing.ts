// The only way a PublicListing is made (04 section 1). Buyer-facing code reads nothing else.
import type { Availability, InventoryItem, Lot, MarketSnapshot, PublicListing, SourceBuilding } from '../types'
import type { Assumptions } from '../reference/assumptions'
import { FAMILIES, titleFor } from '../reference/families'
import { facilityById } from '../reference/assumptions'
import { monthWindow, quarterWindow, formatMonth, formatQuarter } from '../dates'
import { itemMeasures, lotMeasures } from '../engines/measures'
import { guidePrice, signalForLot } from '../engines/pricing'
import { carbonAvoided } from '../engines/carbon'
import { factorQty } from '../engines/measures'

export const PUBLIC_LISTING_KEYS = [
  'publicId',
  'sharing',
  'family',
  'title',
  'spec',
  'quantity',
  'massT',
  'condition',
  'testStatus',
  'grade',
  'sourceType',
  'sellerType',
  'eraBand',
  'location',
  'availability',
  'collectionHubId',
  'listedMonth',
  'status',
  'price',
  'carbon',
  'photos',
] as const

export function availabilityFor(lot: Lot, building: SourceBuilding): Availability {
  if (lot.availableFrom === null) return { kind: 'now' }
  if (building.timingLevel === 'month') {
    const w = monthWindow(lot.availableFrom)
    return { kind: 'window', level: 'month', label: formatMonth(lot.availableFrom), windowStart: w.start, windowEnd: w.end }
  }
  const w = quarterWindow(lot.availableFrom)
  return { kind: 'window', level: 'quarter', label: formatQuarter(lot.availableFrom), windowStart: w.start, windowEnd: w.end }
}

export function toPublicListing(lot: Lot, item: InventoryItem, building: SourceBuilding, snapshot: MarketSnapshot, a: Assumptions): PublicListing {
  const f = FAMILIES[item.family]
  const onOffer = lotMeasures(item, lot)
  const full = itemMeasures(item)
  const { signal } = signalForLot(snapshot, item.spec, lot.publicId, full.units)
  const gp = guidePrice(item.family, item.condition, item.testStatus, signal, a)
  const hubId = lot.inStock?.hubId ?? null
  const region = hubId ? facilityById(hubId).region : building.region
  const location = building.locationLevel === 'local_authority' && !hubId ? { level: 'local_authority' as const, label: building.localAuthority } : { level: 'region' as const, label: region }
  const sold = lot.sold || (lot.piecesOnOffer !== null ? lot.piecesOnOffer <= 0 : lot.shareOnOffer <= 0)
  const isSteel = item.family === 'steel_section'
  const carbonResult = carbonAvoided(
    { family: item.family, sourceType: building.sourceType, baselineQty: factorQty(item.family, onOffer), baselineMassT: onOffer.massT, reuseQty: factorQty(item.family, onOffer), reuseMassT: onOffer.massT, reuseKm: a.listingKm },
    a,
  )
  return {
    publicId: lot.publicId,
    sharing: lot.visibility === 'open' ? 'open' : 'in_confidence',
    family: item.family,
    title: titleFor(item.spec),
    spec: item.spec,
    quantity: { value: onOffer.units, unit: f.unit, pieces: f.countable ? onOffer.pieces : null },
    massT: onOffer.massT,
    condition: item.condition,
    testStatus: item.testStatus,
    grade: isSteel ? (item.grade ?? 'unknown') : null,
    sourceType: building.sourceType,
    sellerType: building.sellerType,
    eraBand: isSteel && building.sourceType === 'deconstruction' ? building.eraBand : null,
    location,
    availability: availabilityFor(lot, building),
    collectionHubId: hubId,
    listedMonth: lot.listedMonth ?? '',
    status: sold ? 'No longer available' : 'Available',
    price: { guide: gp.guide, low: gp.low, high: gp.high, signal },
    carbon: carbonResult ? { avoidedT: carbonResult.avoided, percent: carbonResult.percent } : null,
    photos: item.photos.filter((p) => p.isPublic).map((p) => ({ id: p.id, src: p.src })),
  }
}
