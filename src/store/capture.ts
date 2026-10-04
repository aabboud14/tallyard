// Turns an Assist result plus the surveyor's choices into a capture input.
import type { AssistResult } from '../domain/engines/assist'
import type { Condition, Recoverability, Spec, Quantity } from '../domain/types'
import type { CaptureInput } from './actions'

export type CaptureChoices = { buildingId: string; condition: Condition; recoverability?: Recoverability; capturedBy: string; notes: string; location?: string }

export function specFromAssist(r: AssistResult): Spec | null {
  switch (r.family) {
    case 'steel_section':
      return r.section && r.lengthM !== null ? { family: 'steel_section', designation: r.section, lengthM: r.lengthM } : null
    case 'curtain_wall':
      return r.panelWidthM !== null && r.panelHeightM !== null ? { family: 'curtain_wall', system: 'Unitised', panelWidthM: r.panelWidthM, panelHeightM: r.panelHeightM } : null
    case 'precast_cladding':
      return { family: 'precast_cladding', thicknessMm: r.thicknessMm ?? 0 }
    case 'stone_cladding':
      return { family: 'stone_cladding', stone: 'Portland', thicknessMm: r.thicknessMm ?? 0 }
    case 'clay_brick':
      return { family: 'clay_brick', brickType: 'facing', mortar: r.recoverability === 'A' ? 'lime mortar' : 'cement mortar' }
    case 'raised_floor':
      return { family: 'raised_floor', panelSize: r.panelWidthM && r.panelHeightM ? `${Math.round(r.panelWidthM * 1000)} by ${Math.round(r.panelHeightM * 1000)}` : '600 by 600' }
    case 'timber_joist':
      return { family: 'timber_joist', species: 'softwood' }
    default:
      return null
  }
}

export function quantityFromAssist(r: AssistResult): Quantity | null {
  switch (r.family) {
    case 'steel_section':
    case 'curtain_wall':
    case 'clay_brick':
    case 'raised_floor':
      return r.pieces !== null ? { kind: 'pieces', pieces: r.pieces } : null
    case 'precast_cladding':
    case 'stone_cladding':
      return r.areaM2 !== null ? { kind: 'area', areaM2: r.areaM2 } : null
    case 'timber_joist':
      return r.volumeM3 !== null ? { kind: 'volume', volumeM3: r.volumeM3 } : null
    default:
      return null
  }
}

export function captureInputFromAssist(r: AssistResult, c: CaptureChoices): Omit<CaptureInput, 'photos'> {
  const spec = specFromAssist(r)
  const quantity = quantityFromAssist(r)
  if (!spec || !quantity) throw new Error('The description is missing a required field')
  return {
    buildingId: c.buildingId,
    spec,
    quantity,
    condition: c.condition,
    recoverability: c.recoverability ?? r.recoverability ?? 'B',
    location: c.location ?? r.location ?? '',
    notes: c.notes,
    capturedBy: c.capturedBy,
  }
}
