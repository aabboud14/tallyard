// Contractor bid pack: handling notes generated from structured public fields only (08-TIER2.md section 5).
import type { PublicListing } from '../types'
import { facilityById } from '../reference/assumptions'
import { TEST_STATUS_LABELS } from '../reference/labels'

export function handlingNotes(l: PublicListing, hubId: string | null): string {
  const parts: string[] = []
  parts.push(hubId ? `Lift from the hub (${facilityById(hubId).name})` : 'Collect from the hub')
  switch (l.spec.family) {
    case 'steel_section':
      parts.push(`pieces up to ${l.spec.lengthM.toFixed(1)} m`)
      parts.push('check bolt holes against the connection design')
      if (l.testStatus === 'untested' || l.testStatus === 'inspected') parts.push(`${TEST_STATUS_LABELS[l.testStatus].toLowerCase()}: allow for testing before fabrication`)
      break
    case 'stone_cladding':
      parts.push(`crated stone, ${l.spec.thicknessMm} mm`)
      parts.push('check fixings and returns against the new facade setting-out')
      break
    case 'raised_floor':
      parts.push('palletised panels; new pedestals to be supplied')
      parts.push('check finished floor level and loadings')
      break
    case 'curtain_wall':
      parts.push(`units ${l.spec.panelWidthM} m by ${l.spec.panelHeightM} m, glazed`)
      parts.push('check gaskets and brackets before reinstalling')
      break
    case 'precast_cladding':
      parts.push(`panels ${l.spec.thicknessMm} mm`)
      parts.push('check cast-in fixings against the new frame')
      break
    case 'clay_brick':
      parts.push('palletised, cleaned bricks')
      parts.push('allow for breakage and matching')
      break
    case 'timber_joist':
      parts.push('bundled lengths')
      parts.push('grade before structural use')
      break
  }
  return parts.join('; ')
}
