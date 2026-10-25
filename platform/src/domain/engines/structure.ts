// Granular structure (owner-surveyor design 14.4.4): choices filtered by element and material, the check and clean-up
// of a structure record, and the one-line summary the overview shows. Pure.
import type { StructuralElement, StructuralElementKind, StructuralMaterial } from '../types'
import { ELEMENT_NOUNS, ELEMENT_ORDER, MATERIAL_LABELS, MAX_STRUCTURE_ELEMENTS, STRUCTURE_NOTE_MAX, STRUCTURE_SYSTEMS, structureSystemById, type StructureSystem } from '../reference/structure'

export const STRUCTURE_ERRORS = {
  tooMany: `A building can have up to ${MAX_STRUCTURE_ELEMENTS} structural elements.`,
  mismatch: 'Choose a system that matches the element and material.',
} as const

/** The materials offered for an element: those of its systems in table order, then 'other' if not already there. */
export function materialsFor(kind: StructuralElementKind): StructuralMaterial[] {
  const out: StructuralMaterial[] = []
  for (const s of STRUCTURE_SYSTEMS) if (s.kind === kind && !out.includes(s.material)) out.push(s.material)
  if (!out.includes('other')) out.push('other')
  return out
}

/** The systems of an element with that material; every system of the element when the material is not chosen. */
export function systemsFor(kind: StructuralElementKind, material: StructuralMaterial | null): StructureSystem[] {
  return STRUCTURE_SYSTEMS.filter((s) => s.kind === kind && (material === null || s.material === material))
}

/**
 * The structure as it is stored: notes trimmed and capped, empty rows dropped, a system's material filled in, sorted
 * by element order (stable within an element). An error when there are too many rows or a system does not match.
 */
export function normaliseStructure(elements: StructuralElement[]): { elements: StructuralElement[]; error: string | null } {
  const kept: StructuralElement[] = []
  for (const e of elements) {
    const note = e.note.trim().slice(0, STRUCTURE_NOTE_MAX)
    if (e.material === null && e.systemId === null && note === '') continue
    let material = e.material
    if (e.systemId !== null) {
      const sys = structureSystemById(e.systemId)
      if (!sys || sys.kind !== e.kind || (material !== null && sys.material !== material)) return { elements: [], error: STRUCTURE_ERRORS.mismatch }
      material = sys.material
    }
    kept.push({ kind: e.kind, material, systemId: e.systemId, note })
  }
  if (kept.length > MAX_STRUCTURE_ELEMENTS) return { elements: [], error: STRUCTURE_ERRORS.tooMany }
  const order = (k: StructuralElementKind) => ELEMENT_ORDER.indexOf(k)
  const sorted = kept.map((e, i) => ({ e, i })).sort((a, b) => order(a.e.kind) - order(b.e.kind) || a.i - b.i).map((x) => x.e)
  return { elements: sorted, error: null }
}

/** One element in words: its system's short name, else its material and element, else nothing. */
function elementText(e: StructuralElement): string {
  const sys = e.systemId ? structureSystemById(e.systemId) : null
  if (sys) return sys.short
  if (e.material) return `${MATERIAL_LABELS[e.material].toLowerCase()} ${ELEMENT_NOUNS[e.kind]}`
  return ''
}

/** "Bolted steel frame, composite slabs on metal deck, concrete cores", in element order; '' when nothing renders. */
export function structureSummary(elements: StructuralElement[]): string {
  const order = (k: StructuralElementKind) => ELEMENT_ORDER.indexOf(k)
  const parts = elements
    .map((e, i) => ({ e, i }))
    .sort((a, b) => order(a.e.kind) - order(b.e.kind) || a.i - b.i)
    .map((x) => elementText(x.e))
    .filter((t) => t !== '')
  const text = parts.join(', ')
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}
