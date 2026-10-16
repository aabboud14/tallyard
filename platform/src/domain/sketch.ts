// What a generated thumbnail draws for a project or a building: its use, its frame, its storeys when recorded and
// the facade materials taken from its families. Pure and deterministic. The drawing itself lives in the design
// system; this only decides what to draw and how to name it for screen readers. Nothing here is a photograph.
import type { FamilyId, StructuralElement, StructuralMaterial } from './types'
import { FAMILY_IDS } from './reference/families'

export type FacadeKind = 'brick' | 'stone' | 'glass' | 'precast' | 'timber'

export type SketchUse = 'office' | 'hotel' | 'residential' | 'industrial' | 'other'

export type SketchFrame = 'steel' | 'concrete' | 'timber' | 'masonry' | 'unknown'

export type BuildingSketch = {
  /** Seeds the drawing's variation (an ID), so the same record always draws the same way. */
  seed: string
  use: SketchUse
  storeys: number | null
  frame: SketchFrame
  facades: FacadeKind[]
  /**
   * Where the facades come from: the materials on the shortlist or in the inventory, or, for a project whose
   * shortlist shows nothing seen from outside (steel, raised floors or nothing yet), the facade typical of its use.
   * A typical facade is never a shortlisted material, and the label says so.
   */
  facadeSource: 'materials' | 'use' | 'none'
  /** A building coming down (existing) or a project going up (proposed). */
  state: 'existing' | 'proposed'
  /** The accessible name of the drawing. */
  label: string
}

const FACADE_OF: Record<FamilyId, FacadeKind | null> = {
  clay_brick: 'brick',
  stone_cladding: 'stone',
  curtain_wall: 'glass',
  precast_cladding: 'precast',
  timber_joist: 'timber',
  steel_section: null,
  raised_floor: null,
}

/** The facade a family shows on the drawing, or null for a family that is not seen from outside. */
export function facadeOf(family: FamilyId): FacadeKind | null {
  return FACADE_OF[family]
}

const FRAME_WORDS: [RegExp, SketchFrame][] = [
  [/steel/i, 'steel'],
  [/concrete|precast|reinforced/i, 'concrete'],
  [/timber|glulam|clt/i, 'timber'],
  [/brick|masonry|load-bearing/i, 'masonry'],
]

/** The frame a recorded structure type describes, by the first rule that matches. */
export function frameFromText(structureType: string): SketchFrame {
  for (const [re, frame] of FRAME_WORDS) if (re.test(structureType)) return frame
  return 'unknown'
}

const FRAME_OF_MATERIAL: Record<StructuralMaterial, SketchFrame> = {
  steel: 'steel',
  concrete_in_situ: 'concrete',
  concrete_precast: 'concrete',
  composite: 'concrete',
  timber: 'timber',
  masonry: 'masonry',
  aluminium_glass: 'unknown',
  stone: 'masonry',
  other: 'unknown',
}

/**
 * The frame a building is drawn with: the material of its recorded frame element when there is one (round 2
 * granular structure), else the frame its structure text describes.
 */
export function frameOfBuilding(structure: StructuralElement[], structureType: string): SketchFrame {
  const frame = structure.find((e) => e.kind === 'frame' && e.material !== null)
  const fromElement = frame?.material ? FRAME_OF_MATERIAL[frame.material] : 'unknown'
  return fromElement !== 'unknown' ? fromElement : frameFromText(structureType)
}

/** The massing a project type is drawn with. Types the drawing does not know are drawn as other. */
export function sketchUse(projectType: string): SketchUse {
  const t = projectType.trim().toLowerCase()
  if (t === 'office' || t === 'hotel' || t === 'residential') return t
  if (/industr|warehouse|logistic/.test(t)) return 'industrial'
  return 'other'
}

/** Distinct families, most frequent first, ties in the reference order. */
export function rankFamilies(families: FamilyId[]): FamilyId[] {
  const counts = new Map<FamilyId, number>()
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1)
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || FAMILY_IDS.indexOf(a) - FAMILY_IDS.indexOf(b))
}

/** Up to three facades from the families, most frequent first. */
function facadesFrom(families: FamilyId[]): FacadeKind[] {
  const out: FacadeKind[] = []
  for (const f of rankFamilies(families)) {
    const kind = facadeOf(f)
    if (kind && !out.includes(kind)) out.push(kind)
    if (out.length === 3) break
  }
  return out
}

const USE_WORDS: Record<SketchUse, string> = { office: 'an office', hotel: 'a hotel', residential: 'a residential', industrial: 'an industrial', other: 'a' }

/** The facade a project of each use is typically drawn with when its shortlist shows no facade material. */
const TYPICAL_FACADE: Record<SketchUse, FacadeKind> = { office: 'glass', residential: 'brick', hotel: 'stone', industrial: 'precast', other: 'brick' }

/** The facade typical of a use, for a project whose shortlist has nothing seen from outside. */
export function typicalFacade(use: SketchUse): FacadeKind {
  return TYPICAL_FACADE[use]
}

const TYPICAL_WORDS: Record<SketchUse, string> = { office: 'a typical office facade', hotel: 'a typical hotel facade', residential: 'a typical residential facade', industrial: 'a typical industrial facade', other: 'a typical facade' }

/**
 * A project going up, drawn from the families on its shortlist (public listings only). When none of them is seen
 * from outside, the drawing takes the facade typical of the project's use, so no project is drawn as a blank box,
 * and the label says the facade is typical rather than shortlisted.
 */
export function projectSketch(p: { id: string; name: string; projectType: string }, families: FamilyId[]): BuildingSketch {
  const use = sketchUse(p.projectType)
  const frame: SketchFrame = families.includes('steel_section') ? 'steel' : families.includes('timber_joist') ? 'timber' : 'unknown'
  const base = `Illustration of ${USE_WORDS[use]} project`
  const fromMaterials = facadesFrom(families)
  const typical = fromMaterials.length === 0
  const facades = typical ? [typicalFacade(use)] : fromMaterials
  const label = families.length > 0 ? (typical ? `${base}, drawn from its shortlisted materials and ${TYPICAL_WORDS[use]}` : `${base}, drawn from its shortlisted materials`) : `${base} with ${TYPICAL_WORDS[use]}`
  return { seed: p.id, use, storeys: null, frame, facades, facadeSource: typical ? 'use' : 'materials', state: 'proposed', label }
}

/**
 * A building coming down, drawn from its survey: storeys, frame and the families in its inventory. A use, when the
 * record has one, picks the massing; without one it is drawn as other.
 */
export function buildingSketch(b: { id: string; storeys: number | null; structureType: string; structure?: StructuralElement[]; use?: string | null }, families: FamilyId[]): BuildingSketch {
  const label = b.storeys !== null ? `Illustration of a ${b.storeys} storey building, drawn from its survey` : 'Illustration of a building, drawn from its survey'
  const facades = facadesFrom(families)
  return { seed: b.id, use: sketchUse(b.use ?? ''), storeys: b.storeys, frame: frameOfBuilding(b.structure ?? [], b.structureType), facades, facadeSource: facades.length > 0 ? 'materials' : 'none', state: 'existing', label }
}
