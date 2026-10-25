// The client's indicative costs and savings, and reuse by value (client-consultant design, section 3.1). Every
// amount is rounded to pence when it is created; totals are sums of rounded amounts.
import type { SeededDeal } from '../types'
import { FAMILIES } from '../reference/families'
import { roundPence, sumPence } from '../money'
import type { ContentResult } from './content'

/** Earlier deals, accepted reservations, open requests, approved and not requested, and waiting for a decision. */
export type FinanceStage = 'confirmed' | 'reserved' | 'requested' | 'to_request' | 'waiting'
export const FINANCE_STAGES: readonly FinanceStage[] = ['confirmed', 'reserved', 'requested', 'to_request', 'waiting']

export type FinanceLine = { key: string; stage: FinanceStage; total: number; costNew: number; avoidedT: number | null; massT: number }
export type FinanceTotals = { count: number; total: number; costNew: number; saving: number; savingPercent: number; avoidedT: number; massT: number }

export function financeTotals(lines: FinanceLine[]): FinanceTotals {
  const total = sumPence(lines.map((l) => l.total))
  const costNew = sumPence(lines.map((l) => l.costNew))
  const saving = roundPence(costNew - total)
  return {
    count: lines.length,
    total,
    costNew,
    saving,
    savingPercent: costNew > 0 ? saving / costNew : 0,
    avoidedT: lines.reduce((s, l) => s + (l.avoidedT ?? 0), 0),
    massT: lines.reduce((s, l) => s + l.massT, 0),
  }
}

export function byStage(lines: FinanceLine[]): Record<FinanceStage, FinanceTotals> {
  return Object.fromEntries(FINANCE_STAGES.map((st) => [st, financeTotals(lines.filter((l) => l.stage === st))])) as Record<FinanceStage, FinanceTotals>
}

/** An earlier deal at its agreed material price, against the same quantity new. */
export function seededDealLine(d: SeededDeal): FinanceLine {
  return { key: d.publicId, stage: 'confirmed', total: roundPence(d.materialGbp), costNew: roundPence(d.quantityUnits * FAMILIES[d.family].newPrice), avoidedT: d.avoidedT, massT: d.massT }
}

/** The reused share of the bill of materials by value: recycled content left out. */
export function reuseByValue(r: ContentResult): number {
  if (r.totalValue <= 0) return 0
  return r.lines.reduce((s, l) => s + l.line.valueGbp * l.s, 0) / r.totalValue
}

/** Content by value and reuse by value across projects, weighted by each bill's value; null with no bill at all. */
export function portfolioContent(results: ContentResult[]): { percent: number; reuse: number; totalValue: number } | null {
  const withBill = results.filter((r) => r.totalValue > 0)
  if (withBill.length === 0) return null
  const totalValue = withBill.reduce((s, r) => s + r.totalValue, 0)
  const contribution = withBill.reduce((s, r) => s + r.totalContribution, 0)
  const reused = withBill.reduce((s, r) => s + r.lines.reduce((x, l) => x + l.line.valueGbp * l.s, 0), 0)
  return { percent: contribution / totalValue, reuse: reused / totalValue, totalValue }
}

/**
 * The content aim across projects, read from each project's own target (effectiveTargets), weighted by its bill's
 * value like portfolioContent, so the portfolio figure is judged against the aims the projects carry. Projects with
 * no bill or no aim are left out; 0 when none has both (no aim set).
 */
export function portfolioAim(rows: { totalValue: number; aim: number }[]): number {
  const kept = rows.filter((r) => r.totalValue > 0 && r.aim > 0)
  const value = kept.reduce((s, r) => s + r.totalValue, 0)
  return value > 0 ? kept.reduce((s, r) => s + r.aim * r.totalValue, 0) / value : 0
}
