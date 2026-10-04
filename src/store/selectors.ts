// Derived views. Screens format what these return and never calculate.
import type { Deal, InventoryItem, Lot, PlanItem, Project, PublicListing, World, FamilyId, CustodyEvent } from '../domain/types'
import { DEFAULT_ASSUMPTIONS as A, facilityById, FACILITIES } from '../domain/reference/assumptions'
import { FAMILIES } from '../domain/reference/families'
import { DEMO_TODAY } from '../domain/constants'
import { daysBetween } from '../domain/dates'
import { itemMeasures, lotMeasures, factorQty } from '../domain/engines/measures'
import { itemCarbon, carbonAvoided, type CarbonResult } from '../domain/engines/carbon'
import { guidePrice, signalForLot, sellerMandate, buyerMandate, type GuidePrice } from '../domain/engines/pricing'
import { priorityRanking, type PriorityResult } from '../domain/engines/priority'
import { holdingView, type HoldingView, type BuyerPackage } from '../domain/engines/package'
import { disclosureScore, type Disclosure } from '../domain/engines/disclosure'
import { contentByValue, type ContentResult } from '../domain/engines/content'
import { wasteRates, reuseCarbonBenefit, type WasteRates, type ReuseCarbonRow } from '../domain/engines/waste'
import { agencyRevenue, principalModel, forwardSale, type AgencyRevenue, type PrincipalModel } from '../domain/engines/revenue'
import { buyerCustody } from '../domain/engines/custody'
import { toPublicListing } from '../domain/privacy/publicListing'
import { toBlindBuyer } from '../domain/privacy/blindBuyer'
import { browseListings, listingFor, listingForProject } from '../domain/visibility'
import { confidenceCounts, sumOfRows } from '../domain/engines/billImport'
import { lotOf, lotByPublicId, estimateFor, offersAwaiting, sellerIsSimulated, baselineMassFor, requirementOf, type Offer } from './actions'
import { FAMILIES as FAM } from '../domain/reference/families'

export { lotOf, lotByPublicId, offersAwaiting, sellerIsSimulated, estimateFor }

export type ItemView = {
  item: InventoryItem
  lot: Lot
  measures: ReturnType<typeof itemMeasures>
  guide: GuidePrice
  carbon: CarbonResult | null
  listing: PublicListing
  holding: HoldingView | null
  sellerMandate: { ask: number; reserve: number; urgency: number }
  buyerMandate: { open: number; max: number }
  daysToClearBy: number | null
}

export function buildingItems(world: World, buildingId: string): InventoryItem[] {
  return Object.values(world.items).filter((i) => i.buildingId === buildingId).sort((a, b) => a.tag.localeCompare(b.tag, 'en-GB', { numeric: true }))
}

export function itemView(world: World, itemId: string): ItemView {
  const item = world.items[itemId]
  const lot = lotOf(world, itemId)
  const building = world.buildings[item.buildingId]
  const measures = itemMeasures(item)
  const { signal } = signalForLot(world.snapshot, item.spec, lot.publicId, measures.units)
  const guide = guidePrice(item.family, item.condition, item.testStatus, signal, A)
  const carbon = itemCarbon(item, building.sourceType, A)
  const listing = toPublicListing(lot, item, building, world.snapshot, A)
  const daysToClearBy = building.programme.clearBy ? daysBetween(DEMO_TODAY, building.programme.clearBy) : null
  const fam = FAMILIES[item.family]
  let facility = building.defaultHubId ? facilityById(building.defaultHubId) : null
  if (fam.storage === 'covered_only') {
    const covered = FACILITIES.filter((f) => f.type === 'covered').sort((x, y) => (building.distancesKm[x.id] ?? 0) - (building.distancesKm[y.id] ?? 0))
    facility = covered[0] ?? null
  }
  const holding = facility
    ? holdingView({ family: item.family, units: measures.units, massT: measures.massT, pricePerUnit: guide.guide, facility, kmSourceToHub: building.distancesKm[facility.id] ?? 0, inStock: lot.inStock ? { since: lot.inStock.since } : null, dealDate: DEMO_TODAY }, A)
    : null
  return { item, lot, measures, guide, carbon, listing, holding, sellerMandate: sellerMandate(guide.guide, guide.tick, daysToClearBy, A), buyerMandate: buyerMandate(guide.guide, guide.tick, A), daysToClearBy }
}

export function priorityFor(world: World, buildingId: string): PriorityResult {
  const items = buildingItems(world, buildingId)
  const building = world.buildings[buildingId]
  const publicIds = Object.fromEntries(items.map((i) => [i.id, lotOf(world, i.id).publicId]))
  return priorityRanking(items, publicIds, building.sourceType, world.snapshot, A)
}

/** The disclosure score for a building as it would stand with a lot published at a chosen visibility. */
export function disclosureFor(world: World, buildingId: string, pending: { lotId: string; visibility: 'open' | 'matched_only' } | null, override?: { locationLevel?: 'region' | 'local_authority'; timingLevel?: 'quarter' | 'month' }): Disclosure {
  const b = world.buildings[buildingId]
  const open = Object.values(world.lots).filter((l) => {
    const item = world.items[l.itemId]
    if (item.buildingId !== buildingId) return false
    if (pending && l.id === pending.lotId) return pending.visibility === 'open'
    return l.visibility === 'open'
  })
  return disclosureScore(
    {
      locationLevel: override?.locationLevel ?? b.locationLevel,
      timingLevel: override?.timingLevel ?? b.timingLevel,
      openLots: open.map((l) => {
        const item = world.items[l.itemId]
        const steel = item.spec.family === 'steel_section' ? item.spec : null
        return { isSteel: item.family === 'steel_section', sectionType: steel ? (steel.designation.startsWith('UC') ? 'UC' : 'UB') : null, designation: steel?.designation ?? null, lengthM: steel?.lengthM ?? null, hasPublicPhoto: item.photos.some((p) => p.isPublic) }
      }),
    },
    A,
  )
}

/** The market preview: the real projection as it would stand with the chosen visibility. */
export function previewListing(world: World, lotId: string, visibility: 'open' | 'matched_only'): PublicListing {
  const lot = { ...world.lots[lotId], visibility, listedMonth: world.lots[lotId].listedMonth ?? DEMO_TODAY.slice(0, 7) }
  const item = world.items[lot.itemId]
  return toPublicListing(lot, item, world.buildings[item.buildingId], world.snapshot, A)
}

export function approvedProjectsBlind(world: World, ownerOrgId: string) {
  return Object.values(world.projects).filter((p) => p.approvedByOwnerOrgIds.includes(ownerOrgId)).map((p) => toBlindBuyer(p))
}

export { browseListings, listingFor, listingForProject }

export type PlanItemView = {
  item: PlanItem
  listing: PublicListing
  requirement: ReturnType<typeof requirementOf>
  estimate: BuyerPackage
  comparison: { facilityId: string; name: string; total: number; saving: number; savingPercent: number }[]
  storageRange: { min: number; max: number } | null
  carbon: CarbonResult
  sellerSimulated: boolean
  suggestedMandate: { open: number; max: number }
  deal: Deal | null
}

export function planItemView(world: World, projectId: string, planItemId: string): PlanItemView {
  const p = world.projects[projectId]
  const item = p.planItems.find((i) => i.id === planItemId)!
  const lot = lotByPublicId(world, item.lotPublicId)
  const listing = listingFor(world, lot.id, A)
  const inv = world.items[lot.itemId]
  const estimate = estimateFor(world, p, item, item.pkg.facilityId, item.pkg.testing)
  const fam = FAM[inv.family]
  const eligible = item.pkg.facilityFixed ? FACILITIES.filter((f) => f.id === item.pkg.facilityId) : FACILITIES.filter((f) => fam.storage === 'open_or_covered' || f.type === 'covered')
  const comparison = eligible.map((f) => {
    const e = estimateFor(world, p, item, f.id, item.pkg.testing)
    return { facilityId: f.id, name: f.name, total: e.total, saving: e.saving, savingPercent: e.savingPercent }
  })
  const alloc = p.matchResult?.results.find((r) => r.ref === item.requirementRef)?.allocations.find((a) => a.publicId === item.lotPublicId)
  const deal = item.dealId ? world.deals[item.dealId] : null
  const baseline = baselineMassFor(p, item.requirementRef, item.pieces)
  const stock = lotMeasures(inv, { ...lot, piecesOnOffer: item.pieces, shareOnOffer: 1 }).massT
  const carbon = deal
    ? carbonAvoided({ family: 'steel_section', sourceType: 'deconstruction', baselineQty: baseline, baselineMassT: baseline, reuseQty: stock, reuseMassT: stock, reuseKm: A.hubAllowanceKm + p.hubDistancesKm[deal.hubId] }, A)!
    : carbonAvoided({ family: 'steel_section', sourceType: 'deconstruction', baselineQty: baseline, baselineMassT: baseline, reuseQty: stock, reuseMassT: stock, reuseKm: A.listingKm }, A)!
  return {
    item,
    listing,
    requirement: requirementOf(p, item.requirementRef),
    estimate,
    comparison,
    storageRange: alloc ? { min: alloc.storageMin, max: alloc.storageMax } : null,
    carbon,
    sellerSimulated: sellerIsSimulated(world, item.lotPublicId),
    suggestedMandate: buyerMandate(listing.price.guide, fam.tick, A),
    deal,
  }
}

export type OfferView = Offer & { blind: ReturnType<typeof toBlindBuyer>; listing: PublicListing; sellerFigures: { net: number; upliftVsScrap: number; lines: { label: string; amount: number }[] }; hubName: string; price: number; pieces: number; massT: number; family: FamilyId }

export function offerViews(world: World, ownerOrgId: string): OfferView[] {
  return offersAwaiting(world)
    .filter((o) => {
      const lot = lotByPublicId(world, o.planItem.lotPublicId)
      return world.buildings[world.items[lot.itemId].buildingId].ownerOrgId === ownerOrgId
    })
    .map((o) => {
      const p = world.projects[o.projectId]
      const lot = lotByPublicId(world, o.planItem.lotPublicId)
      const inv = world.items[lot.itemId]
      const building = world.buildings[inv.buildingId]
      const facility = facilityById(o.planItem.pkg.facilityId!)
      const m = lotMeasures(inv, { ...lot, piecesOnOffer: o.planItem.pieces, shareOnOffer: 1 })
      const s = holdingView({ family: inv.family, units: m.units, massT: m.massT, pricePerUnit: o.planItem.agreedPricePerUnit!, facility, kmSourceToHub: building.distancesKm[facility.id] ?? 0, inStock: lot.inStock ? { since: lot.inStock.since } : null, dealDate: DEMO_TODAY }, A)
      return { ...o, blind: toBlindBuyer(p), listing: listingFor(world, lot.id, A), sellerFigures: { net: s.net, upliftVsScrap: s.upliftVsScrap, lines: s.lines }, hubName: facility.name, price: o.planItem.agreedPricePerUnit!, pieces: o.planItem.pieces, massT: m.massT, family: inv.family }
    })
}

export function sellerDeals(world: World, ownerOrgId: string): Deal[] {
  return Object.values(world.deals).filter((d) => world.buildings[world.items[world.lots[d.lotId].itemId].buildingId].ownerOrgId === ownerOrgId)
}

export function buyerDeals(world: World, projectId: string): Deal[] {
  return Object.values(world.deals).filter((d) => d.projectId === projectId)
}

export type BuyerDealView = {
  deal: Deal
  listing: PublicListing
  saving: number
  savingPercent: number
  breakEvenMonths: number | null
  custody: CustodyEvent[]
  hubName: string
  booked: boolean
}

export function buyerDealView(world: World, dealId: string): BuyerDealView {
  const deal = world.deals[dealId]
  const p = world.projects[deal.projectId]
  const item = p.planItems.find((i) => i.id === deal.planItemId)!
  const est = estimateFor(world, p, item, deal.hubId, deal.testing)
  return {
    deal,
    listing: listingFor(world, deal.lotId, A),
    saving: est.saving,
    savingPercent: est.savingPercent,
    breakEvenMonths: est.breakEvenMonths,
    custody: buyerCustody(deal.dealDate, deal.handoverDate, deal.testing, deal.booking?.deliveryDate || null, DEMO_TODAY),
    hubName: facilityById(deal.hubId).name,
    booked: !!deal.booking?.deliveryDate,
  }
}

export type ComplianceView = {
  project: Project
  secured: ContentResult
  withPlan: ContentResult
  securedByFamily: Partial<Record<FamilyId, number>>
  avoidedT: number
  reclaimedMassT: number
  reusedItems: { publicId: string; listing: PublicListing | null; description: string; quantityLabel: string; massT: number; status: string; handoverDate: string; avoidedT: number; seeded: boolean; hubId: string; provenance: string; carbon: { baselineQty: number; basis: string; factorNew: number; a13New: number; a4New: number; reuseQty: number; factorReuse: number; a13Reuse: number; a4Reuse: number } | null }[]
}

export function complianceView(world: World, projectId: string): ComplianceView {
  const p = world.projects[projectId]
  const securedByFamily: Partial<Record<FamilyId, number>> = {}
  const add = (f: FamilyId, q: number) => {
    securedByFamily[f] = (securedByFamily[f] ?? 0) + q
  }
  for (const s of p.seededDeals) add(s.family, s.quantityUnits)
  const deals = buyerDeals(world, projectId)
  for (const d of deals) add('steel_section', d.baselineMassT)
  const planned: Partial<Record<FamilyId, number>> = { ...securedByFamily }
  for (const i of p.planItems) {
    if (i.status === 'confirmed' || i.status === 'no_agreement') continue
    planned.steel_section = (planned.steel_section ?? 0) + baselineMassFor(p, i.requirementRef, i.pieces)
  }
  const avoidedT = p.seededDeals.reduce((s, d) => s + d.avoidedT, 0) + deals.reduce((s, d) => s + d.avoidedT, 0)
  const reclaimedMassT = p.seededDeals.reduce((s, d) => s + d.massT, 0) + deals.reduce((s, d) => s + d.massT, 0)
  const reusedItems: ComplianceView['reusedItems'] = p.seededDeals.map((s) => {
    const lot = Object.values(world.lots).find((l) => l.publicId === s.publicId) ?? null
    const listing = lot ? listingFor(world, lot.id, A) : null
    const inv = lot ? world.items[lot.itemId] : null
    let carbon: ComplianceView['reusedItems'][number]['carbon'] = null
    if (inv) {
      const m = itemMeasures(inv)
      const r = carbonAvoided({ family: inv.family, sourceType: world.buildings[inv.buildingId].sourceType, baselineQty: factorQty(inv.family, m), baselineMassT: m.massT, reuseQty: factorQty(inv.family, m), reuseMassT: m.massT, reuseKm: A.hubAllowanceKm + p.hubDistancesKm[s.hubId] }, A)
      if (r) carbon = { baselineQty: r.inputs.baselineQty, basis: FAMILIES[inv.family].factorBasis, factorNew: r.factorNew, a13New: r.a13New, a4New: r.a4New, reuseQty: r.inputs.reuseQty, factorReuse: r.factorReuse, a13Reuse: r.a13Reuse, a4Reuse: r.a4Reuse }
    }
    return { publicId: s.publicId, listing, description: s.description, quantityLabel: s.quantityLabel, massT: s.massT, status: 'Confirmed', handoverDate: s.confirmedOn, avoidedT: s.avoidedT, seeded: true, hubId: s.hubId, provenance: 'Held by the platform, withheld by seller', carbon }
  })
  for (const d of deals) {
    const listing = listingFor(world, d.lotId, A)
    const inv = world.items[world.lots[d.lotId].itemId]
    const r = carbonAvoided({ family: 'steel_section', sourceType: 'deconstruction', baselineQty: d.baselineMassT, baselineMassT: d.baselineMassT, reuseQty: d.massT, reuseMassT: d.massT, reuseKm: A.hubAllowanceKm + p.hubDistancesKm[d.hubId] }, A)!
    reusedItems.push({ publicId: d.lotPublicId, listing, description: listing.title, quantityLabel: `${d.pieces} pieces`, massT: d.massT, status: 'Confirmed', handoverDate: d.handoverDate, avoidedT: d.avoidedT, seeded: false, hubId: d.hubId, provenance: 'Held by the platform, withheld by seller', carbon: { baselineQty: r.inputs.baselineQty, basis: FAMILIES[inv.family].factorBasis, factorNew: r.factorNew, a13New: r.a13New, a4New: r.a4New, reuseQty: r.inputs.reuseQty, factorReuse: r.factorReuse, a13Reuse: r.a13Reuse, a4Reuse: r.a4Reuse } })
  }
  return { project: p, secured: contentByValue(p.billOfMaterials, securedByFamily), withPlan: contentByValue(p.billOfMaterials, planned), securedByFamily, avoidedT, reclaimedMassT, reusedItems }
}

export type WasteView = {
  rates: WasteRates
  benefit: { rows: ReuseCarbonRow[]; total: number }
  counts: { high: number; medium: number; low: number; edited: number }
  rowsRead: number
  titleRows: number
  totalRows: number
  statedTotal: number | null
  statedTotalMatches: boolean
  sum: number
}

export function wasteView(world: World, engagementId: string): WasteView | null {
  const e = world.engagements[engagementId]
  if (!e.bill) return null
  return {
    rates: wasteRates(e.bill.rows, e.giaM2),
    benefit: reuseCarbonBenefit(e.bill.rows, A),
    counts: confidenceCounts(e.bill),
    rowsRead: e.bill.rows.length,
    titleRows: e.bill.titleRows,
    totalRows: e.bill.totalRows,
    statedTotal: e.bill.statedTotal,
    statedTotalMatches: e.bill.statedTotalMatches,
    sum: sumOfRows(e.bill),
  }
}

export type LedgerView = { dealGroups: { publicId: string; lines: { label: string; amount: number; note: string | null }[]; total: number }[]; seeded: { label: string; amount: number; note: string | null }[]; toDate: number; subscriptions: number }

export function ledgerView(world: World): LedgerView {
  const groups = new Map<string, LedgerView['dealGroups'][number]>()
  for (const l of world.ledger) {
    if (l.kind !== 'deal') continue
    const g = groups.get(l.publicId!) ?? { publicId: l.publicId!, lines: [], total: 0 }
    g.lines.push({ label: l.label, amount: l.amount, note: l.note })
    g.total = Math.round((g.total + l.amount) * 100) / 100
    groups.set(l.publicId!, g)
  }
  const seeded = world.ledger.filter((l) => l.kind === 'seed').map((l) => ({ label: l.label, amount: l.amount, note: l.note }))
  const toDate = Math.round(world.ledger.filter((l) => l.kind !== 'subscription').reduce((s, l) => s + l.amount, 0) * 100) / 100
  const subscriptions = world.ledger.filter((l) => l.kind === 'subscription').reduce((s, l) => s + l.amount, 0)
  return { dealGroups: [...groups.values()], seeded, toDate, subscriptions }
}

export type ModelView = { publicId: string; agency: AgencyRevenue; principal: PrincipalModel; forward: { matchingFee: number; total: number }; storageMonths: number; hubName: string }

export function modelViews(world: World): ModelView[] {
  return Object.values(world.deals).map((d) => {
    const inv = world.items[world.lots[d.lotId].itemId]
    const facility = facilityById(d.hubId)
    const amount = (lines: { id: string; amount: number }[], id: string) => Math.abs(lines.find((l) => l.id === id)?.amount ?? 0)
    const storage = amount(d.buyerLines, 'storage')
    const handlingOut = amount(d.buyerLines, 'handlingOut')
    const testing = amount(d.buyerLines, 'testing')
    const handlingIn = amount(d.sellerLines, 'handlingIn')
    const sellerStorage = amount(d.sellerLines, 'sellerStorage')
    const outbound = d.booking?.deliveryDate ? d.booking.amount : d.outboundEstimate
    const agency = agencyRevenue({ commission: d.commission, storage, handlingIn, handlingOut, sellerStorage, testing, inbound: d.inbound, outbound }, A)
    const { signal } = signalForLot(world.snapshot, inv.spec, d.lotPublicId, itemMeasures(inv).units)
    const principal = principalModel({ family: inv.family, units: d.units, condition: inv.condition, signal, testing, storage, handlingIn, handlingOut, inbound: d.inbound, agencyTotal: agency.total }, A)
    const material = amount(d.buyerLines, 'material')
    return { publicId: d.lotPublicId, agency, principal, forward: forwardSale(material, agency.total, A), storageMonths: d.storageMonths, hubName: facility.name }
  })
}
