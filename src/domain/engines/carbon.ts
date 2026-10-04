// F2. Upfront carbon avoided against buying new (A1-A4), simplified method.
import type { FamilyId, InventoryItem, SourceType } from '../types'
import { FAMILIES } from '../reference/families'
import type { Assumptions } from '../reference/assumptions'
import { factorQty, itemMeasures } from './measures'

export type CarbonInputs = {
  family: FamilyId
  sourceType: SourceType
  baselineQty: number
  baselineMassT: number
  reuseQty: number
  reuseMassT: number
  reuseKm: number
}

export type CarbonResult = {
  inputs: CarbonInputs
  k: number
  factorNew: number
  factorReuse: number
  newKm: number
  road: number
  a13New: number
  a4New: number
  a13Reuse: number
  a4Reuse: number
  avoided: number
  percent: number
}

export function carbonAvoided(inputs: CarbonInputs, a: Assumptions): CarbonResult | null {
  if (inputs.sourceType === 'unused_surplus') return null
  const f = FAMILIES[inputs.family]
  const k = f.factorBasis === 't' ? 1 : 0.001
  const a13New = inputs.baselineQty * f.factorNew * k
  const a4New = inputs.baselineMassT * a.newKm * a.road
  const a13Reuse = inputs.reuseQty * f.factorReuse * k
  const a4Reuse = inputs.reuseMassT * inputs.reuseKm * a.road
  const avoided = a13New + a4New - (a13Reuse + a4Reuse)
  const percent = avoided / (a13New + a4New)
  return { inputs, k, factorNew: f.factorNew, factorReuse: f.factorReuse, newKm: a.newKm, road: a.road, a13New, a4New, a13Reuse, a4Reuse, avoided, percent }
}

/** An item or listing: baseline is the reclaimed quantity itself, at the listing distance. */
export function itemCarbon(item: InventoryItem, sourceType: SourceType, a: Assumptions, reuseKm = a.listingKm): CarbonResult | null {
  const m = itemMeasures(item)
  const qty = factorQty(item.family, m)
  return carbonAvoided({ family: item.family, sourceType, baselineQty: qty, baselineMassT: m.massT, reuseQty: qty, reuseMassT: m.massT, reuseKm }, a)
}

/** Steel from a matcher allocation: baseline is the required members, reclaimed is the allocated pieces. */
export function steelAllocationCarbon(baselineMassT: number, stockMassT: number, reuseKm: number, a: Assumptions): CarbonResult {
  const r = carbonAvoided({ family: 'steel_section', sourceType: 'deconstruction', baselineQty: baselineMassT, baselineMassT, reuseQty: stockMassT, reuseMassT: stockMassT, reuseKm }, a)
  if (!r) throw new Error('Steel always has a carbon result')
  return r
}

/** Distance for a confirmed deal via a hub: the inbound allowance plus the real hub to project distance. */
export function confirmedHubKm(kmHubToProject: number, a: Assumptions): number {
  return a.hubAllowanceKm + kmHubToProject
}
