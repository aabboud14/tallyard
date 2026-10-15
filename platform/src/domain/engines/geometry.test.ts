import { describe, it, expect } from 'vitest'
import type { PublicListing } from '../types'
import type { GeometryFile } from '../v1types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { LABELS } from '../reference/labels'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { lotPrivateStrings } from '../privacy/privateStrings'
import { dxfFor, geometryFilename, iProfile, meshFor, NO_SECTION_SIZE, objFor, PLACEHOLDER_NOTE, profileOf, type ModelGeometry } from './geometry'
import type { Mesh } from './view3d'

const w = createSeed()
const all = Object.values(w.lots).map((lot) => listingFor(w, lot.id, A))
const L = (publicId: string): PublicListing => all.find((l) => l.publicId === publicId)!

function file(g: GeometryFile): { filename: string; mime: string; text: string } {
  if (g.kind !== 'file') throw new Error('expected a file, got: ' + g.reason)
  return g
}

/** Group code and value pairs, checking the file alternates integer codes and values. */
function dxfPairs(text: string): [number, string][] {
  const lines = text.replace(/\n$/, '').split('\n')
  expect(lines.length % 2).toBe(0)
  const pairs: [number, string][] = []
  for (let i = 0; i < lines.length; i += 2) {
    expect(lines[i], `line ${i + 1}`).toMatch(/^\s*-?\d+$/)
    pairs.push([Number(lines[i]), lines[i + 1]])
  }
  return pairs
}

function dxfVertices(text: string): [number, number][] {
  const pairs = dxfPairs(text)
  const out: [number, number][] = []
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][0] !== 0 || pairs[i][1] !== 'VERTEX') continue
    let x = NaN
    let y = NaN
    for (let j = i + 1; j < pairs.length && pairs[j][0] !== 0; j++) {
      if (pairs[j][0] === 10) x = Number(pairs[j][1])
      if (pairs[j][0] === 20) y = Number(pairs[j][1])
    }
    out.push([x, y])
  }
  return out
}

function extents(v: [number, number][]): { w: number; h: number; cx: number; cy: number } {
  const xs = v.map((p) => p[0])
  const ys = v.map((p) => p[1])
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2 }
}

function objCounts(text: string): { v: number; f: number; vs: number[][] } {
  const lines = text.split('\n')
  const vs = lines.filter((l) => l.startsWith('v ')).map((l) => l.slice(2).split(' ').map(Number))
  return { v: vs.length, f: lines.filter((l) => l.startsWith('f ')).length, vs }
}

describe('dxfFor', () => {
  it('draws UB 457x191x67 as a closed 12 vertex I profile, 189.9 by 453.4 mm, centred on the origin', () => {
    const g = file(dxfFor(L('L-9F4CQQ')))
    expect(g.filename).toBe('L-9F4CQQ-UB-457x191x67.dxf')
    expect(g.mime).toBe('application/dxf')
    const v = dxfVertices(g.text)
    expect(v).toHaveLength(12)
    const e = extents(v)
    expect(e.w).toBeCloseTo(189.9, 6)
    expect(e.h).toBeCloseTo(453.4, 6)
    expect(e.cx).toBeCloseTo(0, 6)
    expect(e.cy).toBeCloseTo(0, 6)
    // The web is tw wide: 8.5 mm.
    const webXs = [...new Set(v.map((p) => Math.abs(p[0])))].sort((a, b) => a - b)
    expect(webXs).toEqual([4.25, 94.95])
  })

  it('is DXF R12 text with a header, a closed polyline, a sequence end and EOF', () => {
    const pairs = dxfPairs(file(dxfFor(L('L-9F4CQQ'))).text)
    const seq = pairs.filter((p) => p[0] === 0).map((p) => p[1])
    expect(seq[0]).toBe('SECTION')
    expect(seq).toEqual(['SECTION', 'ENDSEC', 'SECTION', 'POLYLINE', ...Array(12).fill('VERTEX'), 'SEQEND', 'ENDSEC', 'EOF'])
    expect(pairs).toContainEqual([2, 'HEADER'])
    expect(pairs).toContainEqual([2, 'ENTITIES'])
    expect(pairs).toContainEqual([1, 'AC1009'])
    const poly = pairs.findIndex((p) => p[0] === 0 && p[1] === 'POLYLINE')
    const firstVertex = pairs.findIndex((p) => p[0] === 0 && p[1] === 'VERTEX')
    expect(pairs.slice(poly, firstVertex)).toContainEqual([70, '1'])
    expect(pairs.slice(poly, firstVertex)).toContainEqual([66, '1'])
  })

  it('opens with comment lines carrying L20, L42, the units and the square corner note for steel', () => {
    const pairs = dxfPairs(file(dxfFor(L('L-9F4CQQ'))).text)
    const comments = pairs.filter((p) => p[0] === 999).map((p) => p[1])
    expect(pairs[0]).toEqual([999, LABELS.L20])
    expect(pairs[1]).toEqual([999, LABELS.L42])
    expect(pairs[2]).toEqual([999, 'Units: millimetres'])
    expect(comments).toContain('Square corners, root radius omitted')
    expect(file(dxfFor(L('L-A945G6'))).text).not.toContain('root radius')
  })

  it('draws the rectangles from the recorded dimensions', () => {
    const size = (id: string) => {
      const e = extents(dxfVertices(file(dxfFor(L(id))).text))
      return [Math.round(e.w * 1000) / 1000, Math.round(e.h * 1000) / 1000]
    }
    expect(size('L-9XXQC3')).toEqual([1500, 3300]) // curtain wall 1.5 m by 3.3 m
    expect(size('L-8N33X4')).toEqual([1500, 3600])
    expect(size('L-J4WX28')).toEqual([1000, 150]) // precast, 1 m wide section by the thickness
    expect(size('L-Q23X7N')).toEqual([1000, 50]) // stone
    expect(size('L-A945G6')).toEqual([215, 65]) // brick face
    expect(size('L-6VWCWH')).toEqual([600, 600]) // raised floor
    expect(dxfVertices(file(dxfFor(L('L-6VWCWH'))).text)).toHaveLength(4)
  })

  it('cannot draw timber joists: no recorded section size', () => {
    expect(dxfFor(L('L-CJGQP7'))).toEqual({ kind: 'unavailable', reason: NO_SECTION_SIZE })
    expect(NO_SECTION_SIZE).toBe('No recorded section size')
  })

  it('names files from public fields only', () => {
    expect(file(dxfFor(L('L-A945G6'))).filename).toBe('L-A945G6-Clay-brick.dxf')
    expect(file(dxfFor(L('L-9XXQC3'))).filename).toBe('L-9XXQC3-Curtain-wall-panel.dxf')
    expect(file(objFor(L('L-6VWCWH'))).filename).toBe('L-6VWCWH-Raised-access-floor-panel.obj')
  })
})

describe('objFor', () => {
  it('extrudes the steel profile along its length: 24 vertices, 18 faces, 7,500 mm', () => {
    const g = file(objFor(L('L-9F4CQQ')))
    expect(g.filename).toBe('L-9F4CQQ-UB-457x191x67.obj')
    expect(g.mime).toBe('model/obj')
    const c = objCounts(g.text)
    expect(c.v).toBe(24)
    expect(c.f).toBe(12 + 3 + 3)
    expect(Math.max(...c.vs.map((v) => v[2]))).toBe(7500)
    expect(Math.min(...c.vs.map((v) => v[2]))).toBe(0)
  })

  it('makes boxes of 8 vertices and 6 faces for the other families', () => {
    for (const id of ['L-9XXQC3', 'L-J4WX28', 'L-Q23X7N', 'L-A945G6', 'L-6VWCWH']) {
      const c = objCounts(file(objFor(L(id))).text)
      expect([id, c.v, c.f]).toEqual([id, 8, 6])
    }
    const depth = (id: string) => Math.max(...objCounts(file(objFor(L(id))).text).vs.map((v) => v[2]))
    expect(depth('L-9XXQC3')).toBe(150)
    expect(depth('L-A945G6')).toBe(102.5)
    expect(depth('L-6VWCWH')).toBe(32)
    expect(depth('L-J4WX28')).toBe(1000)
  })

  it('states the placeholder depths in a comment', () => {
    expect(file(objFor(L('L-9XXQC3'))).text).toMatch(/^# Panel depth 150 mm in the 3D file is a placeholder/m)
    expect(file(objFor(L('L-6VWCWH'))).text).toMatch(/^# Panel depth 32 mm in the 3D file is a placeholder/m)
  })

  it('references only vertices that exist', () => {
    for (const id of ['L-9F4CQQ', 'L-A945G6']) {
      const text = file(objFor(L(id))).text
      const n = objCounts(text).v
      for (const line of text.split('\n').filter((l) => l.startsWith('f '))) {
        for (const k of line.slice(2).split(' ').map(Number)) expect(k >= 1 && k <= n).toBe(true)
      }
    }
  })

  it('opens with comment lines carrying L20 and L42', () => {
    const lines = file(objFor(L('L-9F4CQQ'))).text.split('\n')
    expect(lines[0]).toBe('# ' + LABELS.L20)
    expect(lines[1]).toBe('# ' + LABELS.L42)
    expect(lines).toContain('# Square corners, root radius omitted')
  })

  it('cannot model timber joists', () => {
    expect(objFor(L('L-CJGQP7'))).toEqual({ kind: 'unavailable', reason: 'No recorded section size' })
  })
})

describe('geometry files', () => {
  it('give an I profile of 12 corners for any section', () => {
    expect(iProfile(100, 50, 5, 8).points).toHaveLength(12)
  })

  it('carry L20 and L42 and no private string of any seed lot', () => {
    for (const lot of Object.values(w.lots)) {
      const item = w.items[lot.itemId]
      const l = listingFor(w, lot.id, A)
      for (const g of [dxfFor(l), objFor(l)]) {
        if (g.kind !== 'file') continue
        expect(g.text).toContain(LABELS.L20)
        expect(g.text).toContain(LABELS.L42)
        for (const s of lotPrivateStrings(lot, item, w.buildings[item.buildingId], w)) {
          expect(g.text).not.toContain(s)
          expect(g.filename).not.toContain(s)
        }
      }
    }
  })
})

function model(id: string): ModelGeometry {
  const m = meshFor(L(id))
  if ('unavailable' in m) throw new Error('expected a model, got: ' + m.unavailable)
  return m
}

function bounds(m: Mesh): { lo: number[]; hi: number[]; size: number[] } {
  const lo = [0, 1, 2].map((k) => Math.min(...m.vertices.map((v) => v[k])))
  const hi = [0, 1, 2].map((k) => Math.max(...m.vertices.map((v) => v[k])))
  return { lo, hi, size: [0, 1, 2].map((k) => Math.round((hi[k] - lo[k]) * 1000) / 1000) }
}

/** The sum over fan triangles of a . (b x c) / 6: positive when every face winds outward. */
function signedVolume(m: Mesh): number {
  let v = 0
  for (const f of m.faces) {
    const a = m.vertices[f[0]]
    for (let i = 1; i + 1 < f.length; i++) {
      const b = m.vertices[f[i]]
      const c = m.vertices[f[i + 1]]
      v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
    }
  }
  return v
}

describe('profileOf', () => {
  it('gives the profile behind every geometry file, or why there is none', () => {
    const p = profileOf(L('L-9F4CQQ'))
    if ('unavailable' in p) throw new Error(p.unavailable)
    expect(p.points).toHaveLength(12)
    expect(p.depthMm).toBe(7500)
    expect(profileOf(L('L-CJGQP7'))).toEqual({ unavailable: NO_SECTION_SIZE })
  })
})

describe('meshFor', () => {
  it('builds UB 457x191x67 as the OBJ prism, lying along X with the web upright, plus a 1,000 mm close-up', () => {
    const m = model('L-9F4CQQ')
    expect(m.mesh.vertices).toHaveLength(24)
    expect(m.mesh.faces).toHaveLength(18)
    const b = bounds(m.mesh)
    expect(b.size).toEqual([7500, 453.4, 189.9])
    expect(b.lo[1]).toBe(0)
    expect(b.lo[0] + b.hi[0]).toBeCloseTo(0, 6)
    expect(b.lo[2] + b.hi[2]).toBeCloseTo(0, 6)
    expect(m.lengthMm).toBe(7500)
    expect(m.closeUpMm).toBe(1000)
    expect(bounds(m.closeUp!).size).toEqual([1000, 453.4, 189.9])
    expect(m.closeUp!.faces).toEqual(m.mesh.faces)
    expect(m.placeholderNote).toBeNull()
  })

  it('stands panels up, lays floors flat and keeps bricks face on', () => {
    const cw = model('L-9XXQC3')
    expect(bounds(cw.mesh).size).toEqual([1500, 3300, 150])
    expect(cw.closeUp).toBeNull()
    expect(cw.closeUpMm).toBeNull()
    expect(cw.placeholderNote).toBe(PLACEHOLDER_NOTE)
    expect(PLACEHOLDER_NOTE).toBe('Panel depth is a placeholder, not a recorded dimension.')
    expect(bounds(model('L-J4WX28').mesh).size).toEqual([1000, 1000, 150])
    expect(bounds(model('L-6VWCWH').mesh).size).toEqual([600, 32, 600])
    expect(model('L-6VWCWH').placeholderNote).toBe(PLACEHOLDER_NOTE)
    expect(bounds(model('L-A945G6').mesh).size).toEqual([215, 65, 102.5])
    expect(model('L-A945G6').placeholderNote).toBeNull()
    for (const id of ['L-9XXQC3', 'L-J4WX28', 'L-6VWCWH', 'L-A945G6']) expect(bounds(model(id).mesh).lo[1]).toBe(0)
  })

  it('winds every face outward: the signed volume is positive for every mesh', () => {
    for (const l of all) {
      const m = meshFor(l)
      if ('unavailable' in m) continue
      expect(signedVolume(m.mesh), l.publicId).toBeGreaterThan(0)
      if (m.closeUp) expect(signedVolume(m.closeUp), l.publicId).toBeGreaterThan(0)
    }
    expect(signedVolume(model('L-9F4CQQ').mesh)).toBeCloseTo((2 * 189.9 * 12.7 + (453.4 - 25.4) * 8.5) * 7500, 0)
    expect((2 * 189.9 * 12.7 + (453.4 - 25.4) * 8.5) * 7500).toBeCloseTo(63_460_950, 3)
  })

  it('cannot model timber joists', () => {
    expect(meshFor(L('L-CJGQP7'))).toEqual({ unavailable: 'No recorded section size' })
  })

  it('names the IFC file like the others', () => {
    expect(geometryFilename(L('L-9F4CQQ'), 'ifc')).toBe('L-9F4CQQ-UB-457x191x67.ifc')
  })
})
