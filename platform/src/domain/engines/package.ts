// F8. Package costs: buyer side, seller side, direct route and the owner's holding view.
import type { CostLine, Facility, FamilyId } from '../types'
import { FAMILIES } from '../reference/families'
import type { Assumptions } from '../reference/assumptions'
import { roundPence, sumPence } from '../money'
import { daysBetween, maxDate, monthsCeil } from '../dates'

export function loadsFor(massT: number, a: Assumptions): number {
  return Math.ceil(massT / a.payloadT - 1e-9)
}

/** leg(km) = loads * (haulFixed + haulPerKm * km), rounded to pence. */
export function legCost(massT: number, km: number, a: Assumptions): number {
  return roundPence(loadsFor(massT, a) * (a.haulFixed + a.haulPerKm * km))
}

export function testingCost(pieces: number, massT: number, testing: boolean, a: Assumptions): number {
  if (!testing) return 0
  return roundPence(a.ndtFee * pieces + a.destructiveFee * Math.ceil(massT / a.destructiveBatchT - 1e-9))
}

export type BuyerInputs = {
  family: FamilyId
  pieces: number
  units: number
  massT: number
  baselineQty: number
  pricePerUnit: number
  testing: boolean
  route: 'hub' | 'direct'
  facility: Facility | null
  /** Hub to project for the hub route; source to project for the direct route. */
  kmToProject: number
  storageMonths: number
  /** A booked outbound quote replaces the estimate. */
  bookedOutbound?: number | null
}

export type BuyerPackage = {
  lines: CostLine[]
  material: number
  testing: number
  storage: number
  handlingOut: number
  outbound: number
  total: number
  costNew: number
  saving: number
  savingPercent: number
  breakEvenMonths: number | null
  storageMonths: number
  loads: number
  pricePerUnit: number
}

export function buyerPackage(i: BuyerInputs, a: Assumptions): BuyerPackage {
  const f = FAMILIES[i.family]
  const material = roundPence(i.units * i.pricePerUnit)
  const testing = testingCost(i.pieces, i.massT, i.testing, a)
  const loads = loadsFor(i.massT, a)
  const outbound = i.bookedOutbound ?? legCost(i.massT, i.kmToProject, a)
  let storage = 0
  let handlingOut = 0
  if (i.route === 'hub' && i.facility) {
    storage = roundPence(i.facility.storageRate * i.massT * i.storageMonths)
    handlingOut = roundPence(i.facility.handlingRate * i.massT)
  }
  const total = sumPence([material, testing, storage, handlingOut, outbound])
  const costNew = roundPence(i.baselineQty * f.newPrice)
  const saving = roundPence(costNew - total)
  const savingPercent = costNew > 0 ? saving / costNew : 0
  const breakEvenMonths = i.route === 'hub' && i.facility ? (costNew - material - testing - handlingOut - outbound) / (i.facility.storageRate * i.massT) : null
  const lines: CostLine[] = [
    { id: 'material', label: 'Material', amount: material },
    { id: 'testing', label: 'Testing', amount: testing },
  ]
  if (i.route === 'hub') {
    lines.push({ id: 'storage', label: `Storage, ${i.storageMonths} ${i.storageMonths === 1 ? 'month' : 'months'}`, amount: storage })
    lines.push({ id: 'handlingOut', label: 'Handling out', amount: handlingOut })
  }
  lines.push({ id: 'delivery', label: 'Delivery to site', amount: outbound })
  return { lines, material, testing, storage, handlingOut, outbound, total, costNew, saving, savingPercent, breakEvenMonths, storageMonths: i.storageMonths, loads, pricePerUnit: i.pricePerUnit }
}

export type SellerInputs = {
  family: FamilyId
  units: number
  massT: number
  pricePerUnit: number
  route: 'hub' | 'direct'
  facility: Facility | null
  kmSourceToHub: number
  inStock: { since: string } | null
  dealDate: string
}

export type SellerPackage = {
  lines: CostLine[]
  material: number
  commission: number
  inbound: number
  handlingIn: number
  sellerStorage: number
  sellerStorageMonths: number
  net: number
  scrapValue: number
  premium: number
  upliftVsScrap: number
}

export function sellerPackage(i: SellerInputs, a: Assumptions): SellerPackage {
  const f = FAMILIES[i.family]
  const material = roundPence(i.units * i.pricePerUnit)
  const commission = roundPence(a.commissionRate * material)
  let inbound = 0
  let handlingIn = 0
  let sellerStorage = 0
  let sellerStorageMonths = 0
  if (i.route === 'hub' && i.facility) {
    if (i.inStock) {
      sellerStorageMonths = monthsCeil(daysBetween(i.inStock.since, i.dealDate))
      sellerStorage = roundPence(i.facility.storageRate * i.massT * sellerStorageMonths)
    } else {
      inbound = legCost(i.massT, i.kmSourceToHub, a)
      handlingIn = roundPence(i.facility.handlingRate * i.massT)
    }
  }
  const net = roundPence(material - commission - inbound - handlingIn - sellerStorage)
  const scrapValue = roundPence(i.units * f.scrapValue)
  const premium = roundPence(i.units * f.recoveryPremium)
  const upliftVsScrap = roundPence(net - scrapValue - premium)
  const lines: CostLine[] = [
    { id: 'material', label: 'Material', amount: material },
    { id: 'commission', label: 'Commission', amount: -commission },
  ]
  if (i.route === 'hub') {
    if (i.inStock) lines.push({ id: 'sellerStorage', label: `Storage at hub, ${sellerStorageMonths} ${sellerStorageMonths === 1 ? 'month' : 'months'}`, amount: -sellerStorage })
    else {
      lines.push({ id: 'inbound', label: 'Inbound haulage to hub', amount: -inbound })
      lines.push({ id: 'handlingIn', label: 'Handling in', amount: -handlingIn })
    }
  }
  return { lines, material, commission, inbound, handlingIn, sellerStorage, sellerStorageMonths, net, scrapValue, premium, upliftVsScrap }
}

/** Storage months after confirmation: from the handover date (or the demo date if later) to the need-by date. */
export function confirmedStorageMonths(handoverDate: string, needBy: string, demoDate: string): number {
  return monthsCeil(daysBetween(maxDate(handoverDate, demoDate), needBy))
}

export type HoldingView = SellerPackage & { facility: Facility; holdMonths: number | null }

/** Owner's holding view: as if the whole lot were sold today via the default hub (or the nearest covered store). */
export function holdingView(i: Omit<SellerInputs, 'route'> & { facility: Facility }, a: Assumptions): HoldingView {
  const s = sellerPackage({ ...i, route: 'hub' }, a)
  const holdMonths = s.upliftVsScrap > 0 ? s.upliftVsScrap / (i.facility.storageRate * i.massT) : null
  return { ...s, facility: i.facility, holdMonths }
}
