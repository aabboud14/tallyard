// Sample materials for the gallery, the landing page and the sign-in panel. Fictional, built from structured
// fields only, so titles match what the product shows. Availability is relative, so the pages never go stale.
import type { Spec } from '../domain/types'
import type { Band, Fit } from '../domain/v1types'
import { titleFor } from '../domain/reference/families'
import { BAND_WORDS, TYPOLOGY_LABELS } from '../domain/reference/labels'
import { typologyOf } from '../domain/engines/typology'

export type SampleMaterial = { publicId: string; spec: Spec; title: string; eyebrow: string; quantity: string; available: string; location: string; fit: Fit; band: Band }

export const BANDS: Record<Band['band'], Band> = {
  high: { band: 'high', segments: 3, word: BAND_WORDS.high },
  medium: { band: 'medium', segments: 2, word: BAND_WORDS.medium },
  low: { band: 'low', segments: 1, word: BAND_WORDS.low },
  none: { band: 'none', segments: 0, word: BAND_WORDS.none },
}

const FAMILY_WORDS: Record<Spec['family'], string> = {
  steel_section: 'Steel section',
  curtain_wall: 'Curtain wall',
  precast_cladding: 'Precast cladding',
  stone_cladding: 'Stone cladding',
  clay_brick: 'Clay brick',
  raised_floor: 'Raised floor',
  timber_joist: 'Timber joist',
}

function sample(publicId: string, spec: Spec, quantity: string, available: string, location: string, fit: Fit, band: Band['band']): SampleMaterial {
  return { publicId, spec, title: titleFor(spec), eyebrow: `${TYPOLOGY_LABELS[typologyOf(spec.family)]}, ${FAMILY_WORDS[spec.family].toLowerCase()}`, quantity, available, location, fit, band: BANDS[band] }
}

export const SAMPLE_MATERIALS: SampleMaterial[] = [
  sample('L-9F4CQQ', { family: 'steel_section', designation: 'UB 457x191x67', lengthM: 7.5 }, '48 pieces', 'In 5 months', 'Central London', 'in_time', 'high'),
  sample('L-A945G6', { family: 'clay_brick', brickType: 'London stock', mortar: 'lime mortar' }, '20,000 bricks', 'Available now', 'East London', 'now', 'high'),
  sample('L-DAXNV3', { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, '600 m2', 'In 3 months', 'Central London', 'in_time', 'medium'),
  sample('L-8N33X4', { family: 'curtain_wall', system: 'Unitised', panelWidthM: 1.5, panelHeightM: 3.6 }, '120 panels', 'In 8 months', 'City of London', 'tight', 'medium'),
  sample('L-PRE001', { family: 'precast_cladding', thicknessMm: 150 }, '86 panels', 'In 11 months', 'South London', 'late', 'low'),
  sample('L-33XJ8M', { family: 'raised_floor', panelSize: '600 by 600' }, '3,000 panels', 'In 4 months', 'Central London', 'in_time', 'medium'),
  sample('L-CJGQP7', { family: 'timber_joist', species: 'pitch pine' }, '140 pieces', 'Available now', 'North London', 'now', 'high'),
  sample('L-K8CGH4', { family: 'steel_section', designation: 'UC 254x254x89', lengthM: 6 }, '24 pieces', 'In 6 months', 'West London', 'in_time', 'high'),
]
