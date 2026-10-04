// The market snapshot (06 section A5): fixed at seed time, never from live state.
import type { InventoryItem, Lot, MarketSnapshot, Requirement, FamilyId } from '../types'
import { sectionOrThrow, serialKey } from '../reference/sections'
import { itemMeasures } from '../engines/measures'
import { snapshotKey } from '../engines/pricing'
import { steelMassT } from '../engines/measures'

export type DemandLine = { kind: 'steel'; designation: string; lengthM: number; count: number } | { kind: 'family'; family: FamilyId; units: number }

export function buildSnapshot(openLots: { lot: Lot; item: InventoryItem }[], demand: DemandLine[]): MarketSnapshot {
  const supply: Record<string, number> = {}
  const lotPublicIds: string[] = []
  for (const { lot, item } of openLots) {
    if (lot.visibility !== 'open' || lot.sold) continue
    const key = snapshotKey(item.spec)
    supply[key] = (supply[key] ?? 0) + itemMeasures(item).units
    lotPublicIds.push(lot.publicId)
  }
  const dem: Record<string, number> = {}
  for (const d of demand) {
    if (d.kind === 'steel') {
      const key = serialKey(d.designation)
      dem[key] = (dem[key] ?? 0) + steelMassT(d.count, d.lengthM, sectionOrThrow(d.designation).massKgM)
    } else {
      dem[d.family] = (dem[d.family] ?? 0) + d.units
    }
  }
  return { supply, demand: dem, lotPublicIds }
}

export function demandFromRequirements(reqs: Requirement[]): DemandLine[] {
  return reqs.map((r) => ({ kind: 'steel', designation: r.designation, lengthM: r.lengthM, count: r.count }))
}
