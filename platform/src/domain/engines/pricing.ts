// F5. Price guidance, market signal and suggested mandates.
import type { Condition, FamilyId, MarketSnapshot, Signal, Spec, TestStatus } from '../types'
import { FAMILIES } from '../reference/families'
import { serialKey } from '../reference/sections'
import type { Assumptions } from '../reference/assumptions'
import { roundToTick } from '../money'

export function snapshotKey(spec: Spec): string {
  return spec.family === 'steel_section' ? serialKey(spec.designation) : spec.family
}

export function signalForRatio(ratio: number | null): Signal {
  if (ratio === null) return 'high'
  if (ratio < 0.5) return 'low'
  if (ratio <= 1.5) return 'balanced'
  return 'high'
}

/** The signal for a key. ownQty is added to supply for anything not in the snapshot. */
export function marketSignal(snapshot: MarketSnapshot, key: string, ownQty: number | null): { ratio: number | null; signal: Signal } {
  const supply = (snapshot.supply[key] ?? 0) + (ownQty ?? 0)
  const demand = snapshot.demand[key] ?? 0
  if (supply <= 0) return { ratio: null, signal: 'high' }
  const ratio = demand / supply
  return { ratio, signal: signalForRatio(ratio) }
}

export function signalForLot(snapshot: MarketSnapshot, spec: Spec, publicId: string, ownUnits: number): { ratio: number | null; signal: Signal } {
  const inSnapshot = snapshot.lotPublicIds.includes(publicId)
  return marketSignal(snapshot, snapshotKey(spec), inSnapshot ? null : ownUnits)
}

export type PriceLine = { label: string; value: string; multiplier: number | null }

export type GuidePrice = {
  raw: number
  guide: number
  low: number
  high: number
  signal: Signal
  newPrice: number
  baseReuseRatio: number
  conditionFactor: number
  testFactor: number
  signalFactor: number
  scrapValue: number
  capRatio: number
  tick: number
}

export function guidePrice(
  family: FamilyId,
  condition: Condition,
  testStatus: TestStatus,
  signal: Signal,
  a: Assumptions,
  overrides: { scrapValue?: number; capRatio?: number } = {},
): GuidePrice {
  const f = FAMILIES[family]
  const scrapValue = overrides.scrapValue ?? f.scrapValue
  const capRatio = overrides.capRatio ?? f.capRatio
  const conditionFactor = a.conditionFactor[condition]
  const testFactor = a.testFactor[testStatus]
  const signalFactor = a.signalFactor[signal]
  const raw = f.newPrice * f.baseReuseRatio * conditionFactor * testFactor * signalFactor
  const guide = roundToTick(Math.min(Math.max(raw, scrapValue), capRatio * f.newPrice), f.tick)
  const low = roundToTick(guide * (1 - a.rangeFactor), f.tick)
  const high = roundToTick(guide * (1 + a.rangeFactor), f.tick)
  return { raw, guide, low, high, signal, newPrice: f.newPrice, baseReuseRatio: f.baseReuseRatio, conditionFactor, testFactor, signalFactor, scrapValue, capRatio, tick: f.tick }
}

export function urgencyFor(daysToClearBy: number | null, a: Assumptions): number {
  if (daysToClearBy === null) return a.urgency.far
  if (daysToClearBy > a.urgency.farFromDays - 1) return a.urgency.far
  if (daysToClearBy >= a.urgency.midFromDays) return a.urgency.mid
  return a.urgency.near
}

/** Seller's suggested mandate, private to the seller. */
export function sellerMandate(guide: number, tick: number, daysToClearBy: number | null, a: Assumptions): { ask: number; reserve: number; urgency: number } {
  const urgency = urgencyFor(daysToClearBy, a)
  return {
    ask: roundToTick(guide * a.mandate.askMultiplier * urgency, tick),
    reserve: roundToTick(guide * a.mandate.reserveMultiplier * urgency, tick),
    urgency,
  }
}

/** Buyer's suggested mandate, private to the buyer. */
export function buyerMandate(guide: number, tick: number, a: Assumptions): { open: number; max: number } {
  return { open: roundToTick(guide * a.mandate.openMultiplier, tick), max: roundToTick(guide * a.mandate.maxMultiplier, tick) }
}
