// IFC4 Reference View export as STEP text (feedback/r2-design/marketplace-material.md section 3.5), so Revit and
// other BIM tools can place the element. Millimetres, deterministic GlobalIds, public fields only: no price, no
// seller, no location.
import type { FamilyId, PublicListing } from '../types'
import type { GeometryFile } from '../v1types'
import { PRODUCT_NAME } from '../constants'
import { FAMILIES } from '../reference/families'
import { findSection } from '../reference/sections'
import { LABELS, TEST_STATUS_LABELS } from '../reference/labels'
import { geometryFilename, NO_SECTION_SIZE, profileOf, UNKNOWN_SECTION, type Profile } from './geometry'
import { gradeText } from './specSheet'

export const IFC_MIME = 'application/x-step'

const GUID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$'

export const IFC_GUID_ROLES = ['project', 'site', 'building', 'storey', 'agg1', 'agg2', 'agg3', 'element', 'contain', 'mat', 'pset', 'defpset'] as const
type GuidRole = (typeof IFC_GUID_ROLES)[number]

function fnv1a(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** 22 characters of the IFC base64 alphabet from 128 bits of four FNV-1a hashes. Deterministic. */
export function ifcGuid(key: string): string {
  let bits = ''
  for (let i = 0; i < 4; i++) bits += fnv1a(`${key}:${i}`).toString(2).padStart(32, '0')
  let out = GUID_ALPHABET[parseInt(bits.slice(0, 2), 2)]
  for (let k = 2; k < 128; k += 6) out += GUID_ALPHABET[parseInt(bits.slice(k, k + 6), 2)]
  return out
}

/** A STEP string literal: quoted, ' and \ doubled, anything outside printable ASCII as \X2\hhhh\X0\. */
export function stepString(s: string): string {
  let out = ''
  for (const ch of s) {
    if (ch === "'") out += "''"
    else if (ch === '\\') out += '\\\\'
    else {
      const code = ch.charCodeAt(0)
      if (ch.length === 1 && code >= 32 && code <= 126) out += ch
      else {
        let hex = ''
        for (let i = 0; i < ch.length; i++) hex += ch.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')
        out += `\\X2\\${hex}\\X0\\`
      }
    }
  }
  return `'${out}'`
}

/** A STEP real: up to 3 decimals, a trailing "." on integers ("7500."), never "-0.". */
export function stepReal(x: number): string {
  const r = Math.round(x * 1000) / 1000
  if (r === 0) return '0.'
  return Number.isInteger(r) ? `${r}.` : String(r)
}

type Placement = { element: string; type: string; axis: [number, number, number]; ref: [number, number, number]; profile: string; profileY: number }

const MATERIAL_CATEGORY: Record<FamilyId, string> = {
  steel_section: 'steel',
  curtain_wall: 'glass',
  precast_cladding: 'concrete',
  stone_cladding: 'stone',
  clay_brick: 'brick',
  raised_floor: 'composite',
  timber_joist: 'wood',
}

const SOURCE_TEXT = { deconstruction: 'Reclaimed from deconstruction', unused_surplus: 'Unused surplus', fit_out_strip: 'Reclaimed from a fit-out strip' } as const

function size(p: Profile): { w: number; h: number } {
  const xs = p.points.map((q) => q[0])
  const ys = p.points.map((q) => q[1])
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

function rectangle(name: string, w: number, h: number): string {
  return `IFCRECTANGLEPROFILEDEF(.AREA.,${stepString(name)},#26,${stepReal(w)},${stepReal(h)})`
}

function placementFor(l: PublicListing, p: Profile): Placement | { unavailable: string } {
  const s = l.spec
  const { w, h } = size(p)
  switch (s.family) {
    case 'steel_section': {
      const sec = findSection(s.designation)
      if (!sec) return { unavailable: UNKNOWN_SECTION }
      const profile = `IFCISHAPEPROFILEDEF(.AREA.,${stepString(sec.designation)},#26,${stepReal(sec.b)},${stepReal(sec.h)},${stepReal(sec.tw)},${stepReal(sec.tf)},$,$,$)`
      return sec.type === 'UC'
        ? { element: 'IFCCOLUMN', type: '.COLUMN.', axis: [0, 0, 1], ref: [1, 0, 0], profile, profileY: 0 }
        : { element: 'IFCBEAM', type: '.BEAM.', axis: [1, 0, 0], ref: [0, 1, 0], profile, profileY: 0 }
    }
    case 'curtain_wall':
      return { element: 'IFCPLATE', type: '.CURTAIN_PANEL.', axis: [0, -1, 0], ref: [1, 0, 0], profile: rectangle('Panel', w, h), profileY: h / 2 }
    case 'precast_cladding':
    case 'stone_cladding':
      return { element: 'IFCCOVERING', type: '.CLADDING.', axis: [0, 0, 1], ref: [1, 0, 0], profile: rectangle('Sample section', w, h), profileY: 0 }
    case 'clay_brick':
      return { element: 'IFCBUILDINGELEMENTPROXY', type: '.ELEMENT.', axis: [0, -1, 0], ref: [1, 0, 0], profile: rectangle('Brick face', w, h), profileY: h / 2 }
    case 'raised_floor':
      return { element: 'IFCCOVERING', type: '.FLOORING.', axis: [0, 0, 1], ref: [1, 0, 0], profile: rectangle('Panel', w, h), profileY: 0 }
    case 'timber_joist':
      return { unavailable: NO_SECTION_SIZE }
  }
}

function direction(v: [number, number, number]): string {
  return `IFCDIRECTION((${v.map(stepReal).join(',')}))`
}

function properties(l: PublicListing, p: Profile): string[] {
  const label = (name: string, value: string) => `IFCPROPERTYSINGLEVALUE(${stepString(name)},$,IFCLABEL(${stepString(value)}),$)`
  const text = (name: string, value: string) => `IFCPROPERTYSINGLEVALUE(${stepString(name)},$,IFCTEXT(${stepString(value)}),$)`
  const out = [`IFCPROPERTYSINGLEVALUE('Public ID',$,IFCIDENTIFIER(${stepString(l.publicId)}),$)`, label('Title', l.title), label('Condition', l.condition), label('Test status', TEST_STATUS_LABELS[l.testStatus])]
  if (l.family === 'steel_section') out.push(label('Steel grade', gradeText(l)))
  out.push(label('Source', SOURCE_TEXT[l.sourceType]))
  out.push(text('Geometry note', p.notes.join('. ')))
  out.push(text('Data status', LABELS.L20))
  return out
}

/** The IFC4 file of a listing: site, building and storey, one extruded element, its material and a property set. */
export function ifcFor(l: PublicListing, today: string): GeometryFile {
  const p = profileOf(l)
  if ('unavailable' in p) return { kind: 'unavailable', reason: p.unavailable }
  const pl = placementFor(l, p)
  if ('unavailable' in pl) return { kind: 'unavailable', reason: pl.unavailable }
  const g = (role: GuidRole) => stepString(ifcGuid(`${l.publicId}:${role}`))
  const filename = geometryFilename(l, 'ifc')
  const data: string[] = [
    `IFCPROJECT(${g('project')},$,${stepString(`${l.publicId} ${l.title}`)},${stepString(LABELS.L20)},$,$,$,(#10),#2)`,
    'IFCUNITASSIGNMENT((#3,#4,#5))',
    'IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)',
    'IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)',
    'IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)',
    'IFCCARTESIANPOINT((0.,0.,0.))',
    'IFCDIRECTION((0.,0.,1.))',
    'IFCDIRECTION((1.,0.,0.))',
    'IFCAXIS2PLACEMENT3D(#6,$,$)',
    "IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#9,$)",
    "IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#10,$,.MODEL_VIEW.,$)",
    'IFCLOCALPLACEMENT($,#9)',
    `IFCSITE(${g('site')},$,'Site',$,$,#12,$,$,.ELEMENT.,$,$,$,$,$)`,
    'IFCLOCALPLACEMENT(#12,#9)',
    `IFCBUILDING(${g('building')},$,'Building',$,$,#14,$,$,.ELEMENT.,$,$,$)`,
    'IFCLOCALPLACEMENT(#14,#9)',
    `IFCBUILDINGSTOREY(${g('storey')},$,'Level 0',$,$,#16,$,$,.ELEMENT.,0.)`,
    `IFCRELAGGREGATES(${g('agg1')},$,$,$,#1,(#13))`,
    `IFCRELAGGREGATES(${g('agg2')},$,$,$,#13,(#15))`,
    `IFCRELAGGREGATES(${g('agg3')},$,$,$,#15,(#17))`,
    direction(pl.axis),
    direction(pl.ref),
    'IFCAXIS2PLACEMENT3D(#6,#21,#22)',
    'IFCLOCALPLACEMENT(#16,#23)',
    `IFCCARTESIANPOINT((0.,${stepReal(pl.profileY)}))`,
    'IFCAXIS2PLACEMENT2D(#25,$)',
    pl.profile,
    `IFCEXTRUDEDAREASOLID(#27,#9,#7,${stepReal(p.depthMm)})`,
    "IFCSHAPEREPRESENTATION(#11,'Body','SweptSolid',(#28))",
    'IFCPRODUCTDEFINITIONSHAPE($,$,(#29))',
    `${pl.element}(${g('element')},$,${stepString(l.title)},${stepString(LABELS.L42)},'Reclaimed',#24,#30,${stepString(l.publicId)},${pl.type})`,
    `IFCRELCONTAINEDINSPATIALSTRUCTURE(${g('contain')},$,$,$,(#31),#17)`,
    `IFCMATERIAL(${stepString(FAMILIES[l.family].label)},$,${stepString(MATERIAL_CATEGORY[l.family])})`,
    `IFCRELASSOCIATESMATERIAL(${g('mat')},$,$,$,(#31),#33)`,
  ]
  const props = properties(l, p)
  const first = data.length + 1
  data.push(...props)
  const ids = props.map((_, i) => `#${first + i}`)
  const pset = data.length + 1
  data.push(`IFCPROPERTYSET(${g('pset')},$,'Reclaimed material',$,(${ids.join(',')}))`)
  data.push(`IFCRELDEFINESBYPROPERTIES(${g('defpset')},$,$,$,(#31),#${pset})`)
  const lines = [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');",
    `FILE_NAME(${stepString(filename)},${stepString(`${today}T00:00:00`)},(''),(''),${stepString(`${PRODUCT_NAME} geometry export`)},${stepString(PRODUCT_NAME)},'');`,
    "FILE_SCHEMA(('IFC4'));",
    'ENDSEC;',
    'DATA;',
    ...data.map((d, i) => `#${i + 1}=${d};`),
    'ENDSEC;',
    'END-ISO-10303-21;',
  ]
  return { kind: 'file', filename, mime: IFC_MIME, text: lines.join('\n') + '\n' }
}
