// Granular structure (owner-surveyor design 14.4.3): each element of a building with a material and a system from a
// fixed table, so records stay comparable and searchable. Reference data, no state.
import type { StructuralElementKind, StructuralMaterial } from '../types'

export const ELEMENT_ORDER: StructuralElementKind[] = ['frame', 'floors', 'roof', 'stability', 'foundations', 'facade']

export const ELEMENT_LABELS: Record<StructuralElementKind, string> = {
  frame: 'Frame',
  floors: 'Floor slabs',
  roof: 'Roof structure',
  stability: 'Stability system',
  foundations: 'Foundations',
  facade: 'Facade',
}

/** Lower case nouns for the summary when no system is chosen. */
export const ELEMENT_NOUNS: Record<StructuralElementKind, string> = {
  frame: 'frame',
  floors: 'floor slabs',
  roof: 'roof',
  stability: 'stability system',
  foundations: 'foundations',
  facade: 'facade',
}

export const MATERIAL_LABELS: Record<StructuralMaterial, string> = {
  steel: 'Steel',
  concrete_in_situ: 'In situ concrete',
  concrete_precast: 'Precast concrete',
  composite: 'Steel and concrete composite',
  timber: 'Timber',
  masonry: 'Masonry',
  aluminium_glass: 'Aluminium and glass',
  stone: 'Stone',
  other: 'Other',
}

export type StructureSystem = { id: string; kind: StructuralElementKind; material: StructuralMaterial; label: string; short: string }

export const STRUCTURE_SYSTEMS: StructureSystem[] = [
  { id: 'frame_steel_bolted', kind: 'frame', material: 'steel', label: 'Steel beams and columns, bolted connections', short: 'bolted steel frame' },
  { id: 'frame_steel_welded', kind: 'frame', material: 'steel', label: 'Steel beams and columns, welded connections', short: 'welded steel frame' },
  { id: 'frame_steel_portal', kind: 'frame', material: 'steel', label: 'Steel portal frame', short: 'steel portal frame' },
  { id: 'frame_rc_beam', kind: 'frame', material: 'concrete_in_situ', label: 'In situ concrete beams and columns', short: 'in situ concrete frame' },
  { id: 'frame_rc_flat', kind: 'frame', material: 'concrete_in_situ', label: 'In situ flat slab and columns', short: 'flat slab concrete frame' },
  { id: 'frame_precast', kind: 'frame', material: 'concrete_precast', label: 'Precast concrete beams and columns', short: 'precast concrete frame' },
  { id: 'frame_glulam', kind: 'frame', material: 'timber', label: 'Glulam posts and beams', short: 'glulam frame' },
  { id: 'frame_masonry', kind: 'frame', material: 'masonry', label: 'Loadbearing masonry walls', short: 'loadbearing masonry' },
  { id: 'floors_composite', kind: 'floors', material: 'composite', label: 'Composite slab on profiled metal deck', short: 'composite slabs on metal deck' },
  { id: 'floors_hollowcore', kind: 'floors', material: 'concrete_precast', label: 'Precast hollowcore planks', short: 'hollowcore planks' },
  { id: 'floors_rc_flat', kind: 'floors', material: 'concrete_in_situ', label: 'In situ flat slab', short: 'in situ flat slabs' },
  { id: 'floors_rc_beam', kind: 'floors', material: 'concrete_in_situ', label: 'In situ beam and slab', short: 'in situ beam and slab floors' },
  { id: 'floors_clt', kind: 'floors', material: 'timber', label: 'Cross-laminated timber panels', short: 'CLT floor panels' },
  { id: 'floors_joists', kind: 'floors', material: 'timber', label: 'Timber joists and boards', short: 'timber joist floors' },
  { id: 'roof_steel_deck', kind: 'roof', material: 'steel', label: 'Steel beams with metal deck', short: 'steel roof with metal deck' },
  { id: 'roof_steel_truss', kind: 'roof', material: 'steel', label: 'Steel trusses and purlins', short: 'steel roof trusses' },
  { id: 'roof_rc', kind: 'roof', material: 'concrete_in_situ', label: 'Concrete roof slab', short: 'concrete roof slab' },
  { id: 'roof_timber', kind: 'roof', material: 'timber', label: 'Timber rafters or trusses', short: 'timber roof' },
  { id: 'stab_cores', kind: 'stability', material: 'concrete_in_situ', label: 'Concrete cores', short: 'concrete cores' },
  { id: 'stab_bracing', kind: 'stability', material: 'steel', label: 'Steel cross bracing', short: 'steel bracing' },
  { id: 'stab_moment', kind: 'stability', material: 'steel', label: 'Moment-resisting frame', short: 'moment frames' },
  { id: 'stab_masonry', kind: 'stability', material: 'masonry', label: 'Masonry shear walls', short: 'masonry shear walls' },
  { id: 'fdn_piles', kind: 'foundations', material: 'concrete_in_situ', label: 'Piles with pile caps', short: 'piled foundations' },
  { id: 'fdn_pads', kind: 'foundations', material: 'concrete_in_situ', label: 'Pad footings', short: 'pad footings' },
  { id: 'fdn_raft', kind: 'foundations', material: 'concrete_in_situ', label: 'Raft', short: 'raft foundation' },
  { id: 'fdn_strip', kind: 'foundations', material: 'concrete_in_situ', label: 'Strip footings', short: 'strip footings' },
  { id: 'fac_unitised', kind: 'facade', material: 'aluminium_glass', label: 'Unitised curtain wall', short: 'unitised curtain wall' },
  { id: 'fac_stick', kind: 'facade', material: 'aluminium_glass', label: 'Stick curtain wall', short: 'stick curtain wall' },
  { id: 'fac_stone', kind: 'facade', material: 'stone', label: 'Stone cladding on fixings', short: 'stone cladding' },
  { id: 'fac_precast', kind: 'facade', material: 'concrete_precast', label: 'Precast concrete panels', short: 'precast concrete panels' },
  { id: 'fac_brick', kind: 'facade', material: 'masonry', label: 'Brick outer leaf', short: 'brick outer leaf' },
  { id: 'fac_rainscreen', kind: 'facade', material: 'other', label: 'Rainscreen cladding', short: 'rainscreen cladding' },
]

export const MAX_STRUCTURE_ELEMENTS = 12

/** Notes on one element are capped at this many characters. */
export const STRUCTURE_NOTE_MAX = 200

export function structureSystemById(id: string): StructureSystem | null {
  return STRUCTURE_SYSTEMS.find((s) => s.id === id) ?? null
}
