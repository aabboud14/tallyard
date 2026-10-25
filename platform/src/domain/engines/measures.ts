// F1. Mass, and the quantities every engine needs: units in the family's pricing unit,
// mass in tonnes, pieces, area and volume.
import type { InventoryItem, Lot, Quantity, Spec } from '../types'
import { FAMILIES, RAISED_FLOOR_PANEL_M2 } from '../reference/families'
import { sectionOrThrow } from '../reference/sections'

export type Measures = { units: number; massT: number; pieces: number | null; areaM2: number | null; volumeM3: number | null }

export function measuresFor(spec: Spec, quantity: Quantity): Measures {
  const f = FAMILIES[spec.family]
  switch (spec.family) {
    case 'steel_section': {
      if (quantity.kind !== 'pieces') throw new Error('Steel needs pieces')
      const s = sectionOrThrow(spec.designation)
      const massT = (quantity.pieces * spec.lengthM * s.massKgM) / 1000
      return { units: massT, massT, pieces: quantity.pieces, areaM2: null, volumeM3: null }
    }
    case 'curtain_wall': {
      if (quantity.kind !== 'pieces') throw new Error('Curtain wall needs pieces')
      const areaM2 = quantity.pieces * spec.panelWidthM * spec.panelHeightM
      const massT = (areaM2 * (f.arealDensityKgM2 ?? 0)) / 1000
      return { units: areaM2, massT, pieces: quantity.pieces, areaM2, volumeM3: null }
    }
    case 'precast_cladding':
    case 'stone_cladding': {
      if (quantity.kind !== 'area') throw new Error('Cladding needs an area')
      const massT = (quantity.areaM2 * (f.arealDensityKgM2 ?? 0)) / 1000
      return { units: quantity.areaM2, massT, pieces: null, areaM2: quantity.areaM2, volumeM3: null }
    }
    case 'clay_brick': {
      if (quantity.kind !== 'pieces') throw new Error('Bricks need a count')
      const massT = (quantity.pieces * (f.unitMassKg ?? 0)) / 1000
      return { units: quantity.pieces, massT, pieces: quantity.pieces, areaM2: null, volumeM3: null }
    }
    case 'raised_floor': {
      if (quantity.kind !== 'pieces') throw new Error('Raised floor needs a count')
      const massT = (quantity.pieces * (f.unitMassKg ?? 0)) / 1000
      return { units: quantity.pieces, massT, pieces: quantity.pieces, areaM2: quantity.pieces * RAISED_FLOOR_PANEL_M2, volumeM3: null }
    }
    case 'timber_joist': {
      if (quantity.kind !== 'volume') throw new Error('Timber needs a volume')
      const massT = (quantity.volumeM3 * (f.densityKgM3 ?? 0)) / 1000
      return { units: quantity.volumeM3, massT, pieces: null, areaM2: null, volumeM3: quantity.volumeM3 }
    }
  }
}

export function itemMeasures(item: InventoryItem): Measures {
  return measuresFor(item.spec, item.quantity)
}

/** Measures of n pieces of a countable item. */
export function piecesMeasures(item: InventoryItem, pieces: number): Measures {
  return measuresFor(item.spec, { kind: 'pieces', pieces })
}

/** What a lot still has on offer. */
export function lotMeasures(item: InventoryItem, lot: Lot): Measures {
  if (item.quantity.kind === 'pieces') {
    return measuresFor(item.spec, { kind: 'pieces', pieces: lot.piecesOnOffer ?? item.quantity.pieces })
  }
  const full = itemMeasures(item)
  const s = lot.shareOnOffer
  return { units: full.units * s, massT: full.massT * s, pieces: null, areaM2: full.areaM2 === null ? null : full.areaM2 * s, volumeM3: full.volumeM3 === null ? null : full.volumeM3 * s }
}

/** The carbon-factor quantity: tonnes for per-tonne factors, m2 for per-m2 factors. */
export function factorQty(family: Spec['family'], m: Measures): number {
  return FAMILIES[family].factorBasis === 't' ? m.massT : (m.areaM2 ?? 0)
}

/** Mass of steel members: pieces at a length and kg per metre. */
export function steelMassT(pieces: number, lengthM: number, massKgM: number): number {
  return (pieces * lengthM * massKgM) / 1000
}
