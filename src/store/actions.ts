// Store actions as pure functions on the world. Every figure comes from a domain function.
import type { Deal, Destination, InventoryItem, LocationLevel, Lot, PlanItem, Project, Spec, TimingLevel, Visibility, World, Photo, Quantity, Condition, Recoverability } from '../domain/types'
import { DEFAULT_ASSUMPTIONS as A, facilityById, FACILITIES, HAULIERS } from '../domain/reference/assumptions'
import { FAMILIES } from '../domain/reference/families'
import { DEMO_TODAY } from '../domain/constants'
import { sectionOrThrow } from '../domain/reference/sections'
import { listingsVisibleToProject, listingFor, lotsVisibleToProject } from '../domain/visibility'
import { matchSchedule, storageRange } from '../domain/engines/matcher'
import { buyerPackage, sellerPackage, confirmedStorageMonths, loadsFor } from '../domain/engines/package'
import { negotiate } from '../domain/engines/negotiation'
import { agencyRevenue } from '../domain/engines/revenue'
import { logisticsQuotes } from '../domain/engines/logistics'
import { steelAllocationCarbon, confirmedHubKm } from '../domain/engines/carbon'
import { piecesMeasures, steelMassT } from '../domain/engines/measures'
import { parseSchedule } from '../domain/engines/schedule'
import { parseBillCells, editRow } from '../domain/engines/billImport'
import { SAMPLE_SCHEDULE_CSV } from '../domain/reference/samples'
import type { Cell } from '../domain/engines/billImport'
import { LABELS } from '../domain/reference/labels'
import { ORG_IDS } from '../domain/seed/world'

export function lotOf(world: World, itemId: string): Lot {
  const lot = Object.values(world.lots).find((l) => l.itemId === itemId)
  if (!lot) throw new Error('No lot for item')
  return lot
}

export function lotByPublicId(world: World, publicId: string): Lot {
  const lot = Object.values(world.lots).find((l) => l.publicId === publicId)
  if (!lot) throw new Error('No lot ' + publicId)
  return lot
}

function nextTag(world: World, buildingId: string): string {
  const tags = Object.values(world.items).filter((i) => i.buildingId === buildingId).map((i) => i.tag)
  const prefix = tags[0]?.split('-')[0] ?? 'TH'
  const max = Math.max(0, ...tags.map((t) => Number(t.split('-')[1]) || 0))
  return `${prefix}-${String(max + 1).padStart(2, '0')}`
}

export type CaptureInput = {
  buildingId: string
  spec: Spec
  quantity: Quantity
  condition: Condition
  recoverability: Recoverability
  location: string
  notes: string
  capturedBy: string
  photos: Photo[]
  /** The surveyor's expected availability (ISO date). Defaults to the building's dismantling start. */
  expectedAvailableFrom?: string | null
}

/** 02 section 4, rule 1: a new item and its private lot. */
export function captureItem(world: World, input: CaptureInput): { world: World; itemId: string; tag: string } {
  const w = structuredClone(world)
  const building = w.buildings[input.buildingId]
  const itemId = w.itemIdPool.shift()
  const publicId = w.publicIdPool.shift()
  if (!itemId || !publicId) throw new Error('The pool of IDs for new items is used up')
  const tag = nextTag(w, input.buildingId)
  const expectedAvailableFrom = input.expectedAvailableFrom ?? building.programme.dismantlingStart
  const item: InventoryItem = {
    id: itemId,
    buildingId: input.buildingId,
    tag,
    family: input.spec.family,
    spec: input.spec,
    quantity: input.quantity,
    condition: input.condition,
    recoverability: input.recoverability,
    testStatus: 'untested',
    grade: input.spec.family === 'steel_section' ? 'unknown' : null,
    location: input.location,
    photos: input.photos,
    notes: input.notes,
    capturedBy: input.capturedBy,
    capturedOn: DEMO_TODAY,
    expectedAvailableFrom,
  }
  w.items[itemId] = item
  const lotId = 'lot_' + itemId.slice(4)
  w.lots[lotId] = {
    id: lotId,
    itemId,
    publicId,
    visibility: 'private',
    piecesOnOffer: input.quantity.kind === 'pieces' ? input.quantity.pieces : null,
    shareOnOffer: 1,
    availableFrom: expectedAvailableFrom,
    inStock: null,
    listedMonth: null,
    askPerUnit: null,
    reservePerUnit: null,
    sold: false,
  }
  return { world: w, itemId, tag }
}

export function addPhoto(world: World, itemId: string, photo: Photo): World {
  const w = structuredClone(world)
  w.items[itemId].photos.push(photo)
  return w
}

export function setPhotoPublic(world: World, itemId: string, photoId: string, isPublic: boolean): World {
  const w = structuredClone(world)
  const p = w.items[itemId].photos.find((x) => x.id === photoId)
  if (p) p.isPublic = isPublic
  return w
}

export function setDisclosure(world: World, buildingId: string, patch: { locationLevel?: LocationLevel; timingLevel?: TimingLevel }): World {
  const w = structuredClone(world)
  Object.assign(w.buildings[buildingId], patch)
  return w
}

/** Reset to defaults: region, quarter and all photos private. Visibility, ask and reserve are left alone. */
export function resetDisclosureDefaults(world: World, buildingId: string): World {
  const w = structuredClone(world)
  const b = w.buildings[buildingId]
  b.locationLevel = 'region'
  b.timingLevel = 'quarter'
  for (const item of Object.values(w.items)) if (item.buildingId === buildingId) for (const p of item.photos) p.isPublic = false
  return w
}

export function publishLot(world: World, lotId: string, input: { visibility: Exclude<Visibility, 'private'>; ask: number; reserve: number }): World {
  const w = structuredClone(world)
  const lot = w.lots[lotId]
  if (input.reserve > input.ask) throw new Error('The reserve cannot be above the ask')
  lot.visibility = input.visibility
  lot.askPerUnit = input.ask
  lot.reservePerUnit = input.reserve
  lot.listedMonth = DEMO_TODAY.slice(0, 7)
  return w
}

export function loadSampleSchedule(world: World, projectId: string): World {
  const w = structuredClone(world)
  const p = w.projects[projectId]
  p.requirements = parseSchedule(SAMPLE_SCHEDULE_CSV, p.keyDates.steelNeedBy)
  return runMatcher(w, projectId)
}

/** Members already secured through confirmed deals, by requirement reference (rule 13). */
export function securedByRef(world: World, project: Project): Record<string, number> {
  const out: Record<string, number> = {}
  for (const d of Object.values(world.deals)) {
    if (d.projectId !== project.id) continue
    out[d.requirementRef] = (out[d.requirementRef] ?? 0) + d.pieces
  }
  return out
}

export function runMatcher(world: World, projectId: string): World {
  const w = structuredClone(world)
  const p = w.projects[projectId]
  const previousOpenOnly = p.matchResult?.openOnly ?? null
  const listings = listingsVisibleToProject(w, p, A)
  const result = matchSchedule(p.requirements, listings, DEMO_TODAY, A, { secured: securedByRef(w, p) })
  if (p.termsAccepted) {
    const openOnly = matchSchedule(p.requirements, listings.filter((l) => l.sharing === 'open'), DEMO_TODAY, A, { secured: securedByRef(w, p) })
    result.openOnly = previousOpenOnly ?? openOnly.matched
  }
  p.matchResult = result
  return w
}

export function acceptTerms(world: World, projectId: string): World {
  const w = structuredClone(world)
  const p = w.projects[projectId]
  const openOnly = p.matchResult?.matched ?? null
  p.termsAccepted = true
  if (p.matchResult) {
    const w2 = runMatcher(w, projectId)
    w2.projects[projectId].matchResult!.openOnly = openOnly
    return w2
  }
  return w
}

export function requirementOf(project: Project, ref: string) {
  const r = project.requirements.find((x) => x.ref === ref)
  if (!r) throw new Error('No requirement ' + ref)
  return r
}

/** Baseline quantity of an allocation: pieces at the required length and kg per metre (F2 rule 1). */
export function baselineMassFor(project: Project, ref: string, pieces: number): number {
  const r = requirementOf(project, ref)
  return steelMassT(pieces, r.lengthM, sectionOrThrow(r.designation).massKgM)
}

export function storageMonthsEstimate(world: World, project: Project, publicId: string, ref: string): number {
  const lot = lotByPublicId(world, publicId)
  const listing = listingFor(world, lot.id, A)
  return storageRange(listing, requirementOf(project, ref).needBy, DEMO_TODAY).max
}

function eligibleFacilities(family: InventoryItem['family']) {
  const need = FAMILIES[family].storage
  return FACILITIES.filter((f) => need === 'open_or_covered' || f.type === 'covered')
}

export function estimateFor(world: World, project: Project, item: PlanItem, facilityId: string | null, testing: boolean) {
  const lot = lotByPublicId(world, item.lotPublicId)
  const inv = world.items[lot.itemId]
  const m = piecesMeasures(inv, item.pieces)
  const price = item.agreedPricePerUnit ?? listingFor(world, lot.id, A).price.guide
  const deal = item.dealId ? world.deals[item.dealId] : null
  const storageMonths = deal ? deal.storageMonths : storageMonthsEstimate(world, project, item.lotPublicId, item.requirementRef)
  const facility = facilityId ? facilityById(facilityId) : null
  return buyerPackage(
    {
      family: inv.family,
      pieces: item.pieces,
      units: m.units,
      massT: m.massT,
      baselineQty: baselineMassFor(project, item.requirementRef, item.pieces),
      pricePerUnit: price,
      testing,
      route: 'hub',
      facility,
      kmToProject: facility ? project.hubDistancesKm[facility.id] : 0,
      storageMonths,
      bookedOutbound: deal?.booking?.amount ?? null,
    },
    A,
  )
}

/** Rule 6: add an allocation to the reuse plan with the default package. */
export function addToPlan(world: World, projectId: string, publicId: string, ref: string): World {
  const w = structuredClone(world)
  const p = w.projects[projectId]
  if (p.planItems.some((i) => i.lotPublicId === publicId && i.requirementRef === ref)) return world
  const alloc = p.matchResult?.results.find((r) => r.ref === ref)?.allocations.find((a) => a.publicId === publicId)
  if (!alloc) throw new Error('No such allocation')
  const lot = lotByPublicId(w, publicId)
  const inv = w.items[lot.itemId]
  const testing = !(inv.testStatus === 'tested' || inv.testStatus === 'certified')
  const id = `plan_${p.planItems.length + 1}_${publicId}`
  const draft: PlanItem = { id, lotPublicId: publicId, pieces: alloc.pieces, requirementRef: ref, pkg: { route: 'hub', facilityId: null, testing, facilityFixed: false }, status: 'planned', negotiation: null, agreedPricePerUnit: null, dealId: null }
  if (lot.inStock?.hubId) {
    draft.pkg.facilityId = lot.inStock.hubId
    draft.pkg.facilityFixed = true
  } else {
    const ranked = eligibleFacilities(inv.family)
      .map((f) => ({ f, total: estimateFor(w, p, draft, f.id, testing).total }))
      .sort((x, y) => x.total - y.total || p.hubDistancesKm[x.f.id] - p.hubDistancesKm[y.f.id] || x.f.id.localeCompare(y.f.id))
    draft.pkg.facilityId = ranked[0].f.id
  }
  p.planItems.push(draft)
  return w
}

export function setPlanPackage(world: World, projectId: string, planItemId: string, patch: { facilityId?: string; testing?: boolean }): World {
  const w = structuredClone(world)
  const item = w.projects[projectId].planItems.find((i) => i.id === planItemId)!
  if (item.status !== 'planned') return world
  if (patch.facilityId !== undefined && !item.pkg.facilityFixed) item.pkg.facilityId = patch.facilityId
  if (patch.testing !== undefined) item.pkg.testing = patch.testing
  return w
}

export function sellerIsSimulated(world: World, publicId: string): boolean {
  const lot = lotByPublicId(world, publicId)
  return world.buildings[world.items[lot.itemId].buildingId].ownerOrgId === ORG_IDS.ostlea
}

/** Rule 9: one negotiation run per plan item. */
export function startNegotiation(world: World, projectId: string, planItemId: string, mandate: { open: number; max: number }): World {
  const w = structuredClone(world)
  const item = w.projects[projectId].planItems.find((i) => i.id === planItemId)!
  if (item.negotiation) return world
  if (!sellerIsSimulated(w, item.lotPublicId)) throw new Error(LABELS.L24)
  const lot = lotByPublicId(w, item.lotPublicId)
  const family = w.items[lot.itemId].family
  if (lot.askPerUnit === null || lot.reservePerUnit === null) throw new Error('The lot has no ask and reserve')
  if (mandate.open > mandate.max) throw new Error('The opening bid cannot be above the maximum')
  const r = negotiate({ ask: lot.askPerUnit, reserve: lot.reservePerUnit, open: mandate.open, max: mandate.max, tick: FAMILIES[family].tick }, A)
  item.negotiation = { buyer: mandate, log: r.log, outcome: r.outcome }
  if (r.outcome.agreed) {
    item.status = 'agreed_in_principle'
    item.agreedPricePerUnit = r.outcome.price
  } else {
    item.status = 'no_agreement'
  }
  return w
}

/** Rule 10: the buyer's approval creates the offer on the seller's side. */
export function buyerApprove(world: World, projectId: string, planItemId: string): World {
  const w = structuredClone(world)
  const item = w.projects[projectId].planItems.find((i) => i.id === planItemId)!
  if (item.status !== 'agreed_in_principle') return world
  item.status = 'awaiting_seller'
  return w
}

export type Offer = { projectId: string; planItem: PlanItem }

export function offersAwaiting(world: World): Offer[] {
  const out: Offer[] = []
  for (const p of Object.values(world.projects)) for (const i of p.planItems) if (i.status === 'awaiting_seller') out.push({ projectId: p.id, planItem: i })
  return out
}

/** Rules 10 to 12: the seller's approval confirms the deal. */
export function sellerApprove(world: World, projectId: string, planItemId: string): { world: World; dealId: string } {
  const w = structuredClone(world)
  const p = w.projects[projectId]
  const item = p.planItems.find((i) => i.id === planItemId)!
  if (item.status !== 'awaiting_seller' || item.agreedPricePerUnit === null) throw new Error('Nothing to approve')
  const lot = lotByPublicId(w, item.lotPublicId)
  const inv = w.items[lot.itemId]
  const building = w.buildings[inv.buildingId]
  const facility = facilityById(item.pkg.facilityId!)
  const m = piecesMeasures(inv, item.pieces)
  const req = requirementOf(p, item.requirementRef)
  const handoverDate = lot.availableFrom ?? DEMO_TODAY
  const storageMonths = confirmedStorageMonths(handoverDate, req.needBy, DEMO_TODAY)
  const baselineMassT = baselineMassFor(p, item.requirementRef, item.pieces)
  const buyer = buyerPackage({ family: inv.family, pieces: item.pieces, units: m.units, massT: m.massT, baselineQty: baselineMassT, pricePerUnit: item.agreedPricePerUnit, testing: item.pkg.testing, route: 'hub', facility, kmToProject: p.hubDistancesKm[facility.id], storageMonths }, A)
  const seller = sellerPackage({ family: inv.family, units: m.units, massT: m.massT, pricePerUnit: item.agreedPricePerUnit, route: 'hub', facility, kmSourceToHub: building.distancesKm[facility.id] ?? 0, inStock: lot.inStock ? { since: lot.inStock.since } : null, dealDate: DEMO_TODAY }, A)
  const carbon = steelAllocationCarbon(baselineMassT, m.massT, confirmedHubKm(p.hubDistancesKm[facility.id], A), A)
  const dealId = `deal_${Object.keys(w.deals).length + 1}_${item.lotPublicId}`
  const ownerOrg = building.ownerOrgId ? w.orgs[building.ownerOrgId] : null
  const ownerPersona = Object.values(w.personas).find((x) => x.orgId === building.ownerOrgId)
  // Brief 09 section 13.2: the buyer contact is the client, never the architect.
  const clientOrg = w.orgs[p.clientOrgId]
  const clientPersona = [...p.teamPersonaIds.map((id) => w.personas[id]), ...Object.values(w.personas)].find((x) => x?.orgId === p.clientOrgId)
  const deal: Deal = {
    id: dealId,
    projectId,
    planItemId,
    lotId: lot.id,
    lotPublicId: item.lotPublicId,
    pieces: item.pieces,
    massT: m.massT,
    units: m.units,
    agreedPricePerUnit: item.agreedPricePerUnit,
    status: 'confirmed',
    dealDate: DEMO_TODAY,
    handoverDate,
    hubId: facility.id,
    testing: item.pkg.testing,
    needBy: req.needBy,
    storageMonths,
    buyerLines: buyer.lines,
    sellerLines: seller.lines,
    buyerTotal: buyer.total,
    costNew: buyer.costNew,
    sellerNet: seller.net,
    scrapValue: seller.scrapValue,
    premium: seller.premium,
    upliftVsScrap: seller.upliftVsScrap,
    commission: seller.commission,
    inbound: seller.inbound,
    outboundEstimate: buyer.outbound,
    booking: null,
    avoidedT: carbon.avoided,
    avoidedPercent: carbon.percent,
    baselineMassT,
    requirementRef: item.requirementRef,
    exchanged: {
      buyerOrg: clientOrg.name,
      buyerContact: clientPersona ? `${clientPersona.name}, ${clientOrg.name}` : clientOrg.name,
      sellerOrg: ownerOrg?.name ?? '',
      sellerContact: ownerPersona?.name ?? '',
    },
  }
  w.deals[dealId] = deal
  item.status = 'confirmed'
  item.dealId = dealId
  if (lot.piecesOnOffer !== null) lot.piecesOnOffer = Math.max(0, lot.piecesOnOffer - item.pieces)
  else lot.shareOnOffer = 0
  if ((lot.piecesOnOffer !== null && lot.piecesOnOffer === 0) || lot.shareOnOffer === 0) lot.sold = true
  const rev = agencyRevenue({ commission: seller.commission, storage: buyer.storage, handlingIn: seller.handlingIn, handlingOut: buyer.handlingOut, sellerStorage: seller.sellerStorage, testing: buyer.testing, inbound: seller.inbound, outbound: buyer.outbound }, A)
  w.ledger.unshift(
    { id: `${dealId}_commission`, label: 'Commission', amount: rev.commission, kind: 'deal', note: null, publicId: item.lotPublicId },
    { id: `${dealId}_brokerage`, label: 'Storage brokerage', amount: rev.storageBrokerage, kind: 'deal', note: null, publicId: item.lotPublicId },
    { id: `${dealId}_referral`, label: 'Testing referral', amount: rev.testingReferral, kind: 'deal', note: null, publicId: item.lotPublicId },
    { id: `${dealId}_transport`, label: 'Transport margin', amount: rev.transportMargin, kind: 'deal', note: LABELS.L31, publicId: item.lotPublicId },
  )
  return { world: w, dealId }
}

/** Rule 14: the logistics agent quotes the hub to project leg. */
export function arrangeDelivery(world: World, dealId: string): World {
  const w = structuredClone(world)
  const d = w.deals[dealId]
  if (d.booking) return world
  const p = w.projects[d.projectId]
  const { quotes, chosen } = logisticsQuotes(HAULIERS, loadsFor(d.massT, A), p.hubDistancesKm[d.hubId], DEMO_TODAY, d.needBy)
  d.booking = { haulier: chosen?.haulier ?? '', amount: chosen?.amount ?? d.outboundEstimate, deliveryDate: '', quotes }
  return w
}

export function approveBooking(world: World, dealId: string): World {
  const w = structuredClone(world)
  const d = w.deals[dealId]
  if (!d.booking || d.booking.deliveryDate) return world
  d.booking.deliveryDate = d.needBy
  const line = d.buyerLines.find((l) => l.id === 'delivery')
  if (line) line.amount = d.booking.amount
  const sum = d.buyerLines.reduce((s, l) => s + l.amount, 0)
  d.buyerTotal = Math.round(sum * 100) / 100
  // Transport margin uses the booked quote once a booking exists.
  const rev = agencyRevenue({ commission: d.commission, storage: 0, handlingIn: 0, handlingOut: 0, sellerStorage: 0, testing: 0, inbound: d.inbound, outbound: d.booking.amount }, A)
  const t = w.ledger.find((l) => l.id === `${dealId}_transport`)
  if (t) t.amount = rev.transportMargin
  return w
}

export function loadSampleBillCells(world: World, engagementId: string, cells: Cell[][]): World {
  const w = structuredClone(world)
  w.engagements[engagementId].bill = parseBillCells(cells)
  return w
}

export function editBillRow(world: World, engagementId: string, row: number, patch: { stream?: string | null; destination?: Destination | null }): World {
  const w = structuredClone(world)
  const bill = w.engagements[engagementId].bill
  if (!bill) return world
  bill.rows = bill.rows.map((r) => (r.row === row ? editRow(r, patch) : r))
  return w
}

export function canProjectSee(world: World, project: Project, publicId: string): boolean {
  const lot = Object.values(world.lots).find((l) => l.publicId === publicId)
  if (!lot) return false
  return lotsVisibleToProject(world, project).includes(lot.id)
}
