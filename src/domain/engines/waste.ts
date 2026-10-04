// F3. Diversion and reuse rates for an imported demolition bill, and the donor-side carbon benefit.
import type { Destination, WasteRow } from '../types'
import { FAMILIES, RAISED_FLOOR_PANEL_M2 } from '../reference/families'
import { STREAM_FAMILY } from '../reference/wasteCodes'
import type { Assumptions } from '../reference/assumptions'

export const EXCAVATION_STREAM = 'soil_stones'

export function isResolved(r: WasteRow): boolean {
  return r.stream !== null && r.destination !== null && r.tonnes !== null
}

export function isHazardous(r: WasteRow): boolean {
  return r.hazardous || r.destination === 'hazardous_disposal'
}

export type WasteRates = {
  totalNonHaz: number
  byDestination: Record<Destination, number>
  diversionRate: number
  reuseRate: number
  shares: Record<Destination, number>
  hazardousT: number
  excavationT: number
  tonnesPerM2: number
  unresolved: { count: number; tonnes: number }
  countedRows: number
}

const DESTS: Destination[] = ['reused_on_site', 'reused_off_site', 'recycled_on_site', 'recycled_off_site', 'recovered', 'landfill', 'hazardous_disposal']

export function wasteRates(rows: WasteRow[], giaM2: number): WasteRates {
  const byDestination = Object.fromEntries(DESTS.map((d) => [d, 0])) as Record<Destination, number>
  let hazardousT = 0
  let excavationT = 0
  let unresolvedCount = 0
  let unresolvedT = 0
  let counted = 0
  for (const r of rows) {
    if (isHazardous(r)) {
      hazardousT += r.tonnes ?? 0
      continue
    }
    if (!isResolved(r)) {
      unresolvedCount += 1
      unresolvedT += r.tonnes ?? 0
      continue
    }
    if (r.stream === EXCAVATION_STREAM) {
      excavationT += r.tonnes ?? 0
      continue
    }
    counted += 1
    byDestination[r.destination!] += r.tonnes!
  }
  const totalNonHaz = DESTS.reduce((s, d) => s + byDestination[d], 0)
  const shares = Object.fromEntries(DESTS.map((d) => [d, totalNonHaz > 0 ? byDestination[d] / totalNonHaz : 0])) as Record<Destination, number>
  return {
    totalNonHaz,
    byDestination,
    diversionRate: totalNonHaz > 0 ? (totalNonHaz - byDestination.landfill) / totalNonHaz : 0,
    reuseRate: totalNonHaz > 0 ? (byDestination.reused_on_site + byDestination.reused_off_site) / totalNonHaz : 0,
    shares,
    hazardousT,
    excavationT,
    tonnesPerM2: giaM2 > 0 ? totalNonHaz / giaM2 : 0,
    unresolved: { count: unresolvedCount, tonnes: unresolvedT },
    countedRows: counted,
  }
}

export function unresolvedNotice(u: { count: number; tonnes: number }): string | null {
  if (u.count === 0) return null
  const t = u.tonnes.toFixed(1)
  return u.count === 1 ? `1 row (${t} t) is not counted until it is reviewed` : `${u.count} rows (${t} t) are not counted until they are reviewed`
}

export type ReuseCarbonRow = { row: number; stream: string; family: string; tonnes: number; quantity: number; basis: 't' | 'm2'; factorNew: number; factorReuse: number; benefit: number }

/** Potential carbon benefit of off-site component reuse, donor side, A1-A3 only (module D). */
export function reuseCarbonBenefit(rows: WasteRow[], _a: Assumptions): { rows: ReuseCarbonRow[]; total: number } {
  const out: ReuseCarbonRow[] = []
  for (const r of rows) {
    if (isHazardous(r) || !isResolved(r) || r.destination !== 'reused_off_site') continue
    const family = r.stream ? STREAM_FAMILY[r.stream] : undefined
    if (!family) continue
    const f = FAMILIES[family]
    const tonnes = r.tonnes!
    let quantity = tonnes
    let benefit: number
    if (f.factorBasis === 't') {
      benefit = tonnes * (f.factorNew - f.factorReuse)
    } else {
      const areal = f.arealDensityKgM2 ?? (f.unitMassKg ?? 0) / RAISED_FLOOR_PANEL_M2
      quantity = (tonnes * 1000) / areal
      benefit = (quantity * (f.factorNew - f.factorReuse)) / 1000
    }
    out.push({ row: r.row, stream: r.stream!, family, tonnes, quantity, basis: f.factorBasis, factorNew: f.factorNew, factorReuse: f.factorReuse, benefit })
  }
  return { rows: out, total: out.reduce((s, x) => s + x.benefit, 0) }
}
