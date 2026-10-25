// Geometry from the recorded dimensions (brief/09-V1-PRODUCT.md sections 5.7 and 13.8).
// DXF R12: the 2D profile as one closed polyline. OBJ: the same profile extruded. Millimetres. Public fields only.
import type { PublicListing } from '../types'
import type { GeometryFile } from '../v1types'
import { FAMILIES } from '../reference/families'
import { findSection } from '../reference/sections'
import { LABELS } from '../reference/labels'

type Pt = [number, number]

/** A closed outline, anticlockwise, with convex cap pieces as indices into the outline. */
type Profile = { points: Pt[]; caps: number[][]; depthMm: number; notes: string[] }

export const NO_SECTION_SIZE = 'No recorded section size'
export const UNKNOWN_SECTION = 'Section not in the section table'
export const PLACEHOLDER_DEPTH = { curtain_wall: 150, raised_floor: 32 } as const
const BRICK = { length: 215, height: 65, bed: 102.5 } as const
const SAMPLE_MM = 1000

function rect(w: number, h: number): { points: Pt[]; caps: number[][] } {
  return {
    points: [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ],
    caps: [[0, 1, 2, 3]],
  }
}

/** An I profile centred on the origin: 12 corners, square (no root radius). */
export function iProfile(h: number, b: number, tw: number, tf: number): { points: Pt[]; caps: number[][] } {
  const x = b / 2
  const w = tw / 2
  const y = h / 2
  const yi = h / 2 - tf
  const points: Pt[] = [
    [-x, -y],
    [x, -y],
    [x, -yi],
    [w, -yi],
    [w, yi],
    [x, yi],
    [x, y],
    [-x, y],
    [-x, yi],
    [-w, yi],
    [-w, -yi],
    [-x, -yi],
  ]
  // Bottom flange, web, top flange: each convex, sharing whole edges.
  return { points, caps: [[0, 1, 2, 3, 10, 11], [10, 3, 4, 9], [9, 4, 5, 6, 7, 8]] }
}

function panelSizeMm(panelSize: string): [number, number] {
  const m = /(\d+(?:\.\d+)?)\s*by\s*(\d+(?:\.\d+)?)/.exec(panelSize)
  return m ? [Number(m[1]), Number(m[2])] : [600, 600]
}

function profileFor(l: PublicListing): Profile | { unavailable: string } {
  const s = l.spec
  switch (s.family) {
    case 'steel_section': {
      const sec = findSection(s.designation)
      if (!sec) return { unavailable: UNKNOWN_SECTION }
      return { ...iProfile(sec.h, sec.b, sec.tw, sec.tf), depthMm: s.lengthM * 1000, notes: ['Square corners, root radius omitted', `Section ${sec.designation}, h ${sec.h} by b ${sec.b}, web ${sec.tw}, flange ${sec.tf}`] }
    }
    case 'curtain_wall':
      return { ...rect(s.panelWidthM * 1000, s.panelHeightM * 1000), depthMm: PLACEHOLDER_DEPTH.curtain_wall, notes: ['Panel face, width by height', `Panel depth ${PLACEHOLDER_DEPTH.curtain_wall} mm in the 3D file is a placeholder, not a recorded dimension`] }
    case 'precast_cladding':
    case 'stone_cladding':
      return { ...rect(SAMPLE_MM, s.thicknessMm), depthMm: SAMPLE_MM, notes: [`Section through a ${SAMPLE_MM} mm wide sample at the recorded thickness. No panel size is recorded`] }
    case 'clay_brick':
      return { ...rect(BRICK.length, BRICK.height), depthMm: BRICK.bed, notes: [`Stretcher face ${BRICK.length} mm by ${BRICK.height} mm, bed depth ${BRICK.bed} mm`] }
    case 'raised_floor': {
      const [w, h] = panelSizeMm(s.panelSize)
      return { ...rect(w, h), depthMm: PLACEHOLDER_DEPTH.raised_floor, notes: [`Panel ${w} mm by ${h} mm`, `Panel depth ${PLACEHOLDER_DEPTH.raised_floor} mm in the 3D file is a placeholder, not a recorded dimension`] }
    }
    case 'timber_joist':
      return { unavailable: NO_SECTION_SIZE }
  }
}

/** Up to three decimals, no trailing zeros, never "-0". */
function num(x: number): string {
  const r = Math.round(x * 1000) / 1000
  return r === 0 ? '0' : String(r)
}

function slug(text: string): string {
  return text
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function geometryFilename(l: PublicListing, ext: 'dxf' | 'obj'): string {
  const name = l.spec.family === 'steel_section' ? l.spec.designation : FAMILIES[l.family].label
  return `${slug(l.publicId)}-${slug(name)}.${ext}`
}

function commentLines(l: PublicListing, p: Profile): string[] {
  return [LABELS.L20, LABELS.L42, 'Units: millimetres', ...p.notes, `${l.publicId}, ${l.title}`]
}

export function dxfFor(l: PublicListing): GeometryFile {
  const p = profileFor(l)
  if ('unavailable' in p) return { kind: 'unavailable', reason: p.unavailable }
  const out: string[] = []
  const pair = (code: number, value: string) => out.push(String(code), value)
  for (const c of commentLines(l, p)) pair(999, c)
  pair(0, 'SECTION')
  pair(2, 'HEADER')
  pair(9, '$ACADVER')
  pair(1, 'AC1009')
  pair(9, '$EXTMIN')
  pair(10, num(Math.min(...p.points.map((q) => q[0]))))
  pair(20, num(Math.min(...p.points.map((q) => q[1]))))
  pair(30, '0')
  pair(9, '$EXTMAX')
  pair(10, num(Math.max(...p.points.map((q) => q[0]))))
  pair(20, num(Math.max(...p.points.map((q) => q[1]))))
  pair(30, '0')
  pair(0, 'ENDSEC')
  pair(0, 'SECTION')
  pair(2, 'ENTITIES')
  pair(0, 'POLYLINE')
  pair(8, 'PROFILE')
  pair(66, '1')
  pair(10, '0')
  pair(20, '0')
  pair(30, '0')
  pair(70, '1')
  for (const [x, y] of p.points) {
    pair(0, 'VERTEX')
    pair(8, 'PROFILE')
    pair(10, num(x))
    pair(20, num(y))
    pair(30, '0')
  }
  pair(0, 'SEQEND')
  pair(8, 'PROFILE')
  pair(0, 'ENDSEC')
  pair(0, 'EOF')
  return { kind: 'file', filename: geometryFilename(l, 'dxf'), mime: 'application/dxf', text: out.join('\n') + '\n' }
}

export function objFor(l: PublicListing): GeometryFile {
  const p = profileFor(l)
  if ('unavailable' in p) return { kind: 'unavailable', reason: p.unavailable }
  const n = p.points.length
  const out: string[] = commentLines(l, p).map((c) => `# ${c}`)
  out.push(`# Profile in the x y plane, extruded ${num(p.depthMm)} mm along z`)
  out.push(`o ${slug(l.publicId)}`)
  for (const [x, y] of p.points) out.push(`v ${num(x)} ${num(y)} 0`)
  for (const [x, y] of p.points) out.push(`v ${num(x)} ${num(y)} ${num(p.depthMm)}`)
  // OBJ indices are 1-based. Bottom vertices 1..n, top n+1..2n.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    out.push(`f ${i + 1} ${j + 1} ${n + j + 1} ${n + i + 1}`)
  }
  for (const cap of p.caps) out.push('f ' + [...cap].reverse().map((i) => i + 1).join(' '))
  for (const cap of p.caps) out.push('f ' + cap.map((i) => n + i + 1).join(' '))
  return { kind: 'file', filename: geometryFilename(l, 'obj'), mime: 'model/obj', text: out.join('\n') + '\n' }
}
