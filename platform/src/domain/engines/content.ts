// F4. Reused and recycled content by value.
import type { BillLine, FamilyId } from '../types'
import { roundPence } from '../money'

export type ContentLine = { line: BillLine; s: number; contribution: number; points: number; reusedPercent: number; recycledPercent: number; reusedAndRecycledValue: number }

export type ContentResult = { percent: number; withoutReuse: number; totalValue: number; totalContribution: number; lines: ContentLine[] }

export function contentByValue(lines: BillLine[], securedByFamily: Partial<Record<FamilyId, number>>): ContentResult {
  const totalValue = lines.reduce((s, l) => s + l.valueGbp, 0)
  const out: ContentLine[] = lines.map((l) => {
    const secured = l.family ? (securedByFamily[l.family] ?? 0) : 0
    const s = l.family && l.lineQty ? Math.min(1, secured / l.lineQty) : 0
    const contribution = l.valueGbp * (s + (1 - s) * l.recycledShare)
    const points = totalValue > 0 ? (100 * l.valueGbp * s * (1 - l.recycledShare)) / totalValue : 0
    return { line: l, s, contribution, points, reusedPercent: s, recycledPercent: (1 - s) * l.recycledShare, reusedAndRecycledValue: roundPence(contribution) }
  })
  const totalContribution = out.reduce((s, l) => s + l.contribution, 0)
  const withoutReuse = totalValue > 0 ? lines.reduce((s, l) => s + l.valueGbp * l.recycledShare, 0) / totalValue : 0
  return { percent: totalValue > 0 ? totalContribution / totalValue : 0, withoutReuse, totalValue, totalContribution, lines: out }
}
