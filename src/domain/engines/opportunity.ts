// Carbon opportunity by bill of materials line: where reuse could save carbon, what is secured, what remains.
// Uses F2 with the family's factors; the potential assumes the whole line were reclaimed at the listing distance.
import type { BillLine, FamilyId } from '../types'
import { FAMILIES, RAISED_FLOOR_PANEL_M2 } from '../reference/families'
import type { Assumptions } from '../reference/assumptions'
import { carbonAvoided } from './carbon'

export type OpportunityRow = { line: BillLine; potentialT: number | null; securedT: number; remainingT: number | null; securedShare: number }

/** Quantity in the factor basis and mass for a line quantity in the family's pricing unit. */
export function lineQuantities(family: FamilyId, units: number): { qty: number; massT: number } {
  const f = FAMILIES[family]
  switch (family) {
    case 'steel_section':
      return { qty: units, massT: units }
    case 'raised_floor':
      return { qty: units * RAISED_FLOOR_PANEL_M2, massT: (units * (f.unitMassKg ?? 0)) / 1000 }
    case 'clay_brick':
      return { qty: (units * (f.unitMassKg ?? 0)) / 1000, massT: (units * (f.unitMassKg ?? 0)) / 1000 }
    case 'timber_joist':
      return { qty: (units * (f.densityKgM3 ?? 0)) / 1000, massT: (units * (f.densityKgM3 ?? 0)) / 1000 }
    default: {
      const massT = (units * (f.arealDensityKgM2 ?? 0)) / 1000
      return { qty: f.factorBasis === 't' ? massT : units, massT }
    }
  }
}

export function carbonOpportunity(lines: BillLine[], securedAvoidedByFamily: Partial<Record<FamilyId, number>>, securedByFamily: Partial<Record<FamilyId, number>>, a: Assumptions): { rows: OpportunityRow[]; potentialTotal: number; securedTotal: number } {
  const rows: OpportunityRow[] = lines.map((line) => {
    if (!line.family || !line.lineQty) return { line, potentialT: null, securedT: 0, remainingT: null, securedShare: 0 }
    const q = lineQuantities(line.family, line.lineQty)
    const r = carbonAvoided({ family: line.family, sourceType: 'deconstruction', baselineQty: q.qty, baselineMassT: q.massT, reuseQty: q.qty, reuseMassT: q.massT, reuseKm: a.listingKm }, a)
    const potentialT = r ? r.avoided : null
    const securedT = securedAvoidedByFamily[line.family] ?? 0
    const securedShare = Math.min(1, (securedByFamily[line.family] ?? 0) / line.lineQty)
    return { line, potentialT, securedT, remainingT: potentialT === null ? null : Math.max(0, potentialT - securedT), securedShare }
  })
  return { rows, potentialTotal: rows.reduce((s, r) => s + (r.potentialT ?? 0), 0), securedTotal: rows.reduce((s, r) => s + r.securedT, 0) }
}
