import { describe, it, expect } from 'vitest'
import type { PublicListing } from '../types'
import type { GeometryFile } from '../v1types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { LABELS } from '../reference/labels'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { lotPrivateStrings } from '../privacy/privateStrings'
import { IFC_GUID_ROLES, IFC_MIME, ifcFor, ifcGuid, stepReal, stepString } from './ifc'

const TODAY = '2026-10-08'
const w = createSeed()
const all = Object.values(w.lots).map((lot) => listingFor(w, lot.id, A))
const L = (publicId: string): PublicListing => all.find((l) => l.publicId === publicId)!

function file(g: GeometryFile): { filename: string; mime: string; text: string } {
  if (g.kind !== 'file') throw new Error('expected a file, got: ' + g.reason)
  return g
}

function lines(text: string): string[] {
  return text.replace(/\n$/, '').split('\n')
}

function dataLines(text: string): string[] {
  const ls = lines(text)
  return ls.slice(ls.indexOf('DATA;') + 1, ls.lastIndexOf('ENDSEC;'))
}

/** The entities by id: name and the raw argument text. */
function entities(text: string): Map<number, { name: string; args: string }> {
  const out = new Map<number, { name: string; args: string }>()
  for (const line of dataLines(text)) {
    const m = /^#(\d+)=([A-Z0-9]+)\((.*)\);$/.exec(line)
    if (!m) throw new Error('not an entity line: ' + line)
    out.set(Number(m[1]), { name: m[2], args: m[3] })
  }
  return out
}

/** Top-level attributes, respecting quotes ('' inside a string) and parentheses. */
function splitArgs(args: string): string[] {
  const out: string[] = []
  let depth = 0
  let quoted = false
  let cur = ''
  for (let i = 0; i < args.length; i++) {
    const ch = args[i]
    if (quoted) {
      cur += ch
      if (ch === "'") {
        if (args[i + 1] === "'") {
          cur += "'"
          i++
        } else quoted = false
      }
      continue
    }
    if (ch === "'") quoted = true
    else if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

/** References outside quoted strings. */
function refs(args: string): number[] {
  const bare = args.replace(/'(?:[^']|'')*'/g, "''")
  return [...bare.matchAll(/#(\d+)/g)].map((m) => Number(m[1]))
}

const ATTRIBUTE_COUNTS: Record<string, number> = {
  IFCPROJECT: 9,
  IFCSITE: 14,
  IFCBUILDING: 12,
  IFCBUILDINGSTOREY: 10,
  IFCBEAM: 9,
  IFCCOLUMN: 9,
  IFCPLATE: 9,
  IFCCOVERING: 9,
  IFCBUILDINGELEMENTPROXY: 9,
  IFCISHAPEPROFILEDEF: 10,
  IFCRECTANGLEPROFILEDEF: 5,
  IFCEXTRUDEDAREASOLID: 4,
  IFCGEOMETRICREPRESENTATIONCONTEXT: 6,
  IFCGEOMETRICREPRESENTATIONSUBCONTEXT: 10,
  IFCRELAGGREGATES: 6,
  IFCRELCONTAINEDINSPATIALSTRUCTURE: 6,
  IFCRELASSOCIATESMATERIAL: 6,
  IFCRELDEFINESBYPROPERTIES: 6,
  IFCPROPERTYSINGLEVALUE: 4,
  IFCPROPERTYSET: 5,
  IFCSIUNIT: 4,
  IFCMATERIAL: 3,
  IFCUNITASSIGNMENT: 1,
  IFCCARTESIANPOINT: 1,
  IFCDIRECTION: 1,
  IFCAXIS2PLACEMENT3D: 3,
  IFCAXIS2PLACEMENT2D: 2,
  IFCLOCALPLACEMENT: 2,
  IFCSHAPEREPRESENTATION: 4,
  IFCPRODUCTDEFINITIONSHAPE: 3,
}

const modelled = all.filter((l) => ifcFor(l, TODAY).kind === 'file')

describe('ifcFor', () => {
  it('opens with the exact IFC4 Reference View header', () => {
    const g = file(ifcFor(L('L-9F4CQQ'), TODAY))
    expect(g.filename).toBe('L-9F4CQQ-UB-457x191x67.ifc')
    expect(g.mime).toBe(IFC_MIME)
    expect(IFC_MIME).toBe('application/x-step')
    expect(lines(g.text).slice(0, 7)).toEqual([
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]'),'2;1');",
      "FILE_NAME('L-9F4CQQ-UB-457x191x67.ifc','2026-10-08T00:00:00',(''),(''),'Tallyard geometry export','Tallyard','');",
      "FILE_SCHEMA(('IFC4'));",
      'ENDSEC;',
      'DATA;',
    ])
    expect(lines(g.text).slice(-2)).toEqual(['ENDSEC;', 'END-ISO-10303-21;'])
  })

  it('writes well-formed entity lines, numbered in order, with every reference defined', () => {
    expect(modelled.length).toBeGreaterThan(10)
    for (const l of modelled) {
      const text = file(ifcFor(l, TODAY)).text
      const data = dataLines(text)
      for (const line of data) expect(line).toMatch(/^#\d+=IFC[A-Z0-9]+\(.*\);$/)
      const es = entities(text)
      expect(es.size).toBe(data.length)
      expect([...es.keys()]).toEqual(data.map((_, i) => i + 1))
      for (const e of es.values()) for (const r of refs(e.args)) expect(es.has(r), `#${r} in ${l.publicId}`).toBe(true)
    }
  })

  it('gives every entity its IFC4 attribute count', () => {
    for (const l of modelled) {
      for (const e of entities(file(ifcFor(l, TODAY)).text).values()) {
        expect(ATTRIBUTE_COUNTS[e.name], e.name).toBeDefined()
        expect([l.publicId, e.name, splitArgs(e.args).length]).toEqual([l.publicId, e.name, ATTRIBUTE_COUNTS[e.name]])
      }
    }
  })

  it('places the spatial structure and the element in it', () => {
    const es = entities(file(ifcFor(L('L-9F4CQQ'), TODAY)).text)
    expect(es.get(1)!.name).toBe('IFCPROJECT')
    expect(es.get(13)!.name).toBe('IFCSITE')
    expect(es.get(15)!.name).toBe('IFCBUILDING')
    expect(es.get(17)!.name).toBe('IFCBUILDINGSTOREY')
    expect(es.get(31)!.name).toBe('IFCBEAM')
    expect(es.get(32)).toMatchObject({ name: 'IFCRELCONTAINEDINSPATIALSTRUCTURE' })
    expect(splitArgs(es.get(32)!.args).slice(4)).toEqual(['(#31)', '#17'])
    expect(splitArgs(es.get(31)!.args).slice(5)).toEqual(['#24', '#30', "'L-9F4CQQ'", '.BEAM.'])
  })

  it('models UB 457x191x67 as a beam: an I profile extruded 7,500 mm along X', () => {
    const text = file(ifcFor(L('L-9F4CQQ'), TODAY)).text
    expect(text).toContain('#31=IFCBEAM(')
    expect(text).toContain("#27=IFCISHAPEPROFILEDEF(.AREA.,'UB 457x191x67',#26,189.9,453.4,8.5,12.7,$,$,$);")
    expect(text).toContain('#28=IFCEXTRUDEDAREASOLID(#27,#9,#7,7500.);')
    expect(text).toContain('#21=IFCDIRECTION((1.,0.,0.));')
    expect(text).toContain('#22=IFCDIRECTION((0.,1.,0.));')
    expect(text).toContain("IFCMATERIAL('Structural steel section',$,'steel')")
  })

  it('picks the element and profile by family', () => {
    const t = (id: string) => file(ifcFor(L(id), TODAY)).text
    expect(t('L-2MAC36')).toContain('#31=IFCCOLUMN(')
    expect(t('L-2MAC36')).toContain('.COLUMN.);')
    expect(t('L-2MAC36')).toContain('IFCEXTRUDEDAREASOLID(#27,#9,#7,4200.)')
    expect(t('L-9XXQC3')).toContain('#31=IFCPLATE(')
    expect(t('L-9XXQC3')).toContain('.CURTAIN_PANEL.);')
    expect(t('L-9XXQC3')).toContain("IFCRECTANGLEPROFILEDEF(.AREA.,'Panel',#26,1500.,3300.)")
    expect(t('L-9XXQC3')).toContain('IFCEXTRUDEDAREASOLID(#27,#9,#7,150.)')
    expect(t('L-9XXQC3')).toContain('#25=IFCCARTESIANPOINT((0.,1650.));')
    expect(t('L-9XXQC3')).toContain('#21=IFCDIRECTION((0.,-1.,0.));')
    expect(t('L-Q23X7N')).toContain('.CLADDING.);')
    expect(t('L-Q23X7N')).toContain('1000.,50.)')
    expect(t('L-Q23X7N')).toContain('IFCEXTRUDEDAREASOLID(#27,#9,#7,1000.)')
    expect(t('L-6VWCWH')).toContain('.FLOORING.);')
    expect(t('L-6VWCWH')).toContain('IFCEXTRUDEDAREASOLID(#27,#9,#7,32.)')
    expect(t('L-A945G6')).toContain('#31=IFCBUILDINGELEMENTPROXY(')
    expect(t('L-A945G6')).toContain('215.,65.)')
    expect(t('L-A945G6')).toContain('#25=IFCCARTESIANPOINT((0.,32.5));')
    expect(t('L-A945G6')).toContain('IFCEXTRUDEDAREASOLID(#27,#9,#7,102.5)')
    expect(ifcFor(L('L-CJGQP7'), TODAY)).toEqual({ kind: 'unavailable', reason: 'No recorded section size' })
  })

  it('carries a Reclaimed material property set of public fields', () => {
    const text = file(ifcFor(L('L-9F4CQQ'), TODAY)).text
    const names = dataLines(text)
      .filter((d) => d.includes('IFCPROPERTYSINGLEVALUE('))
      .map((d) => /IFCPROPERTYSINGLEVALUE\('([^']*)'/.exec(d)![1])
    expect(names).toEqual(['Public ID', 'Title', 'Condition', 'Test status', 'Steel grade', 'Source', 'Geometry note', 'Data status'])
    expect(text).toContain("IFCPROPERTYSINGLEVALUE('Public ID',$,IFCIDENTIFIER('L-9F4CQQ'),$)")
    expect(text).toContain("IFCPROPERTYSINGLEVALUE('Test status',$,IFCLABEL('Untested'),$)")
    expect(text).toContain(`IFCPROPERTYSINGLEVALUE('Data status',$,IFCTEXT('${LABELS.L20}'),$)`)
    expect(text).toContain("#43=IFCPROPERTYSET(")
    expect(text).toContain("'Reclaimed material',$,(#35,#36,#37,#38,#39,#40,#41,#42));")
    expect(text).toContain('#44=IFCRELDEFINESBYPROPERTIES(')
    expect(file(ifcFor(L('L-A945G6'), TODAY)).text).not.toContain('Steel grade')
  })

  it('has 12 deterministic GlobalIds in the IFC alphabet', () => {
    const ids = (text: string) => [...text.matchAll(/=IFC[A-Z0-9]+\('([0-9A-Za-z_$]{22})'/g)].map((m) => m[1])
    const a = ids(file(ifcFor(L('L-9F4CQQ'), TODAY)).text)
    expect(a).toHaveLength(12)
    expect(IFC_GUID_ROLES).toHaveLength(12)
    for (const g of a) expect(g).toMatch(/^[0-3][0-9A-Za-z_$]{21}$/)
    expect(new Set(a).size).toBe(12)
    expect(ids(file(ifcFor(L('L-9F4CQQ'), TODAY)).text)).toEqual(a)
    expect(ifcGuid('L-9F4CQQ:project')).toBe(a[0])
    expect(ids(file(ifcFor(L('L-A945G6'), TODAY)).text)[0]).not.toBe(a[0])
  })

  it('carries L20 and L42 and no price, seller, location or private string of any seed lot', () => {
    for (const lot of Object.values(w.lots)) {
      const item = w.items[lot.itemId]
      const l = listingFor(w, lot.id, A)
      const g = ifcFor(l, TODAY)
      if (g.kind !== 'file') continue
      expect(g.text).toContain(LABELS.L20)
      expect(g.text).toContain(LABELS.L42)
      expect(g.text).not.toContain('£')
      expect(g.text).not.toMatch(/price/i)
      expect(g.text).not.toContain(l.sellerType)
      expect(g.text).not.toContain(l.location.label)
      for (const s of lotPrivateStrings(lot, item, w.buildings[item.buildingId], w)) {
        expect(g.text).not.toContain(s)
        expect(g.filename).not.toContain(s)
      }
    }
  })
})

describe('STEP literals', () => {
  it('quotes strings, doubling quotes and backslashes and encoding other characters', () => {
    expect(stepString("Client's")).toBe("'Client''s'")
    expect(stepString('é')).toBe("'\\X2\\00E9\\X0\\'")
    expect(stepString('a\\b')).toBe("'a\\\\b'")
    expect(stepString('')).toBe("''")
  })

  it('writes reals with a trailing point on integers and never minus zero', () => {
    expect(stepReal(7500)).toBe('7500.')
    expect(stepReal(-0)).toBe('0.')
    expect(stepReal(189.9)).toBe('189.9')
    expect(stepReal(-1)).toBe('-1.')
    expect(stepReal(-0.0001)).toBe('0.')
    expect(stepReal(1.23456)).toBe('1.235')
  })
})
