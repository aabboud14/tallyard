// F12. Platform revenue and business models.
import type { Condition, FamilyId, Signal } from '../types'
import type { Assumptions } from '../reference/assumptions'
import { FAMILIES } from '../reference/families'
import { roundPence, sumPence } from '../money'
import { guidePrice } from './pricing'

export type AgencyInputs = { commission: number; storage: number; handlingIn: number; handlingOut: number; sellerStorage: number; testing: number; inbound: number; outbound: number }

export type AgencyRevenue = { commission: number; storageBrokerage: number; testingReferral: number; transportMargin: number; total: number }

export function agencyRevenue(i: AgencyInputs, a: Assumptions): AgencyRevenue {
  const commission = i.commission
  const storageBrokerage = roundPence(a.brokerageRate * (i.storage + i.handlingIn + i.handlingOut + i.sellerStorage))
  const testingReferral = roundPence(a.referralRate * i.testing)
  const transportMargin = roundPence(a.transportMarginRate * (i.inbound + i.outbound))
  return { commission, storageBrokerage, testingReferral, transportMargin, total: sumPence([commission, storageBrokerage, testingReferral, transportMargin]) }
}

export type PrincipalInputs = { family: FamilyId; units: number; condition: Condition; signal: Signal; testing: number; storage: number; handlingIn: number; handlingOut: number; inbound: number; agencyTotal: number }

export type PrincipalModel = { purchase: number; testedGuide: number; sale: number; costs: number; margin: number; capital: number; returnRatio: number; multiple: number; candidateToBuy: boolean }

export function principalModel(i: PrincipalInputs, a: Assumptions): PrincipalModel {
  const f = FAMILIES[i.family]
  const purchase = roundPence(a.principalBuyRatio * f.newPrice * i.units)
  const testedGuide = guidePrice(i.family, i.condition, 'tested', i.signal, a).guide
  const sale = roundPence(i.units * testedGuide)
  const costs = sumPence([i.testing, i.storage, i.handlingIn, i.handlingOut, i.inbound])
  const margin = roundPence(sale - purchase - costs)
  const capital = roundPence(purchase + costs)
  const returnRatio = capital > 0 ? margin / capital : 0
  const multiple = i.agencyTotal > 0 ? margin / i.agencyTotal : 0
  const candidateToBuy = i.signal === 'high' && margin >= a.hybridMultiple * i.agencyTotal
  return { purchase, testedGuide, sale, costs, margin, capital, returnRatio, multiple, candidateToBuy }
}

export function forwardSale(material: number, agencyTotal: number, a: Assumptions): { matchingFee: number; total: number } {
  const matchingFee = roundPence(a.matchingFeeRate * material)
  return { matchingFee, total: roundPence(agencyTotal + matchingFee) }
}
