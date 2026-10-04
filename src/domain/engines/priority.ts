// F6. Deconstruction priority for a building's inventory.
import type { InventoryItem, MarketSnapshot, Signal, SourceType } from '../types'
import { FAMILIES } from '../reference/families'
import type { Assumptions } from '../reference/assumptions'
import { roundPence } from '../money'
import { itemMeasures } from './measures'
import { guidePrice, signalForLot } from './pricing'
import { itemCarbon } from './carbon'

export type PriorityRow = {
  itemId: string
  tag: string
  guide: number
  netValue: number
  carbon: number
  signal: Signal
  ease: number
  score: number
  parts: { netValue: number; carbon: number; demand: number; ease: number }
  route: 'recover' | 'recycle'
  reason: string | null
}

export type PriorityResult = { rows: PriorityRow[]; recoverableNetValue: number; topThreeShare: number; maxNetValue: number; maxCarbon: number }

const EASE = { A: 1.0, B: 0.6, C: 0.2 } as const
const DEMAND = { low: 0, balanced: 0.5, high: 1 } as const

export const RECYCLE_COST = 'Recycle rather than recover: careful removal would cost more than it would fetch.'
export const RECYCLE_INTACT = 'Recycle rather than recover: unlikely to come out intact.'

function naturalTag(a: string, b: string): number {
  return a.localeCompare(b, 'en-GB', { numeric: true })
}

export function priorityRanking(items: InventoryItem[], publicIds: Record<string, string>, sourceType: SourceType, snapshot: MarketSnapshot, a: Assumptions): PriorityResult {
  const w = a.priorityWeights
  const base = items.map((item) => {
    const f = FAMILIES[item.family]
    const m = itemMeasures(item)
    const { signal } = signalForLot(snapshot, item.spec, publicIds[item.id] ?? '', m.units)
    const gp = guidePrice(item.family, item.condition, item.testStatus, signal, a)
    const netValue = roundPence(m.units * gp.guide - m.units * f.recoveryPremium)
    const carbon = itemCarbon(item, sourceType, a)?.avoided ?? 0
    return { item, guide: gp.guide, netValue, carbon, signal, ease: EASE[item.recoverability] }
  })
  const maxNetValue = Math.max(0, ...base.map((b) => b.netValue))
  const maxCarbon = Math.max(0, ...base.map((b) => b.carbon))
  const rows: PriorityRow[] = base.map((b) => {
    const pNet = maxNetValue > 0 ? (100 * w.netValue * Math.max(b.netValue, 0)) / maxNetValue : 0
    const pCarbon = maxCarbon > 0 ? (100 * w.carbon * Math.max(b.carbon, 0)) / maxCarbon : 0
    const pDemand = 100 * w.demand * DEMAND[b.signal]
    const pEase = 100 * w.ease * b.ease
    const score = pNet + pCarbon + pDemand + pEase
    const route: 'recover' | 'recycle' = b.netValue <= 0 || b.item.recoverability === 'C' ? 'recycle' : 'recover'
    const reason = route === 'recycle' ? (b.netValue <= 0 ? RECYCLE_COST : RECYCLE_INTACT) : null
    return { itemId: b.item.id, tag: b.item.tag, guide: b.guide, netValue: b.netValue, carbon: b.carbon, signal: b.signal, ease: b.ease, score, parts: { netValue: pNet, carbon: pCarbon, demand: pDemand, ease: pEase }, route, reason }
  })
  rows.sort((x, y) => y.score - x.score || y.netValue - x.netValue || naturalTag(x.tag, y.tag))
  const recover = rows.filter((r) => r.route === 'recover')
  const recoverableNetValue = roundPence(recover.reduce((s, r) => s + r.netValue, 0))
  const topThree = roundPence(recover.slice(0, 3).reduce((s, r) => s + r.netValue, 0))
  const topThreeShare = recoverableNetValue > 0 ? topThree / recoverableNetValue : 0
  return { rows, recoverableNetValue, topThreeShare, maxNetValue, maxCarbon }
}
