// Waste streams, codes and keywords (06-DATA.md section A7).
import type { Destination, FamilyId } from '../types'

export type Stream = { id: string; code: string | null; label: string }

export const STREAMS: Stream[] = [
  { id: 'concrete', code: '17 01 01', label: 'Concrete' },
  { id: 'brick_block', code: '17 01 02', label: 'Bricks' },
  { id: 'mixed_inert', code: '17 01 07', label: 'Mixed concrete, bricks and tiles' },
  { id: 'timber', code: '17 02 01', label: 'Timber' },
  { id: 'glass', code: '17 02 02', label: 'Glass' },
  { id: 'plastic', code: '17 02 03', label: 'Plastic' },
  { id: 'copper', code: '17 04 01', label: 'Copper' },
  { id: 'aluminium', code: '17 04 02', label: 'Aluminium' },
  { id: 'steel', code: '17 04 05', label: 'Iron and steel' },
  { id: 'mixed_metals', code: '17 04 07', label: 'Mixed metals' },
  { id: 'cables_copper', code: '17 04 11', label: 'Cables' },
  { id: 'soil_stones', code: '17 05 04', label: 'Soil and stones (excavation)' },
  { id: 'insulation', code: '17 06 04', label: 'Insulation' },
  { id: 'asbestos', code: '17 06 05*', label: 'Asbestos-containing materials (hazardous)' },
  { id: 'plasterboard', code: '17 08 02', label: 'Gypsum and plasterboard' },
  { id: 'mixed_cd', code: '17 09 04', label: 'Mixed construction and demolition waste' },
  { id: 'curtain_wall', code: null, label: 'Curtain walling' },
  { id: 'raised_floor', code: null, label: 'Raised access floor panels' },
  { id: 'stone', code: null, label: 'Stone' },
]

export function streamById(id: string): Stream | undefined {
  return STREAMS.find((s) => s.id === id)
}

export function streamLabel(id: string | null): string {
  if (!id) return ''
  return streamById(id)?.label ?? id
}

/** Code lookup ignores the hazardous asterisk; the asterisk is a flag on the row. */
export function streamForCode(code: string): Stream | undefined {
  return STREAMS.find((s) => s.code !== null && s.code.replace('*', '') === code)
}

/** Keyword fallback, first match wins, in this order. `raf` must be a whole word. */
export const STREAM_KEYWORDS: { pattern: RegExp; stream: string }[] = [
  { pattern: /\bcurtain wall/, stream: 'curtain_wall' },
  { pattern: /\braf\b|\braised access/, stream: 'raised_floor' },
  { pattern: /\bstone/, stream: 'stone' },
  { pattern: /\bsteel/, stream: 'steel' },
  { pattern: /\bbrick/, stream: 'brick_block' },
  { pattern: /\bconcrete|\bprecast/, stream: 'concrete' },
  { pattern: /\btimber|\bwood/, stream: 'timber' },
  { pattern: /\bglass/, stream: 'glass' },
  { pattern: /\bplasterboard|\bgypsum/, stream: 'plasterboard' },
]

export const DESTINATIONS: { id: Destination; label: string }[] = [
  { id: 'reused_on_site', label: 'Reused on site' },
  { id: 'reused_off_site', label: 'Reused off site' },
  { id: 'recycled_on_site', label: 'Recycled on site' },
  { id: 'recycled_off_site', label: 'Recycled off site' },
  { id: 'recovered', label: 'Other management (energy recovery, backfill)' },
  { id: 'landfill', label: 'Landfill' },
  { id: 'hazardous_disposal', label: 'Hazardous disposal' },
]

export function destinationLabel(id: Destination | null): string {
  if (!id) return ''
  return DESTINATIONS.find((d) => d.id === id)?.label ?? id
}

/** Stream to marketplace family for the donor-side carbon benefit (F3). */
export const STREAM_FAMILY: Record<string, FamilyId> = {
  steel: 'steel_section',
  brick_block: 'clay_brick',
  curtain_wall: 'curtain_wall',
  stone: 'stone_cladding',
  raised_floor: 'raised_floor',
  timber: 'timber_joist',
}
