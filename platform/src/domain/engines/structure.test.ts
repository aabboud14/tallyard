import { describe, it, expect } from 'vitest'
import type { StructuralElement } from '../types'
import { materialsFor, normaliseStructure, structureSummary, systemsFor, STRUCTURE_ERRORS } from './structure'
import { TIVERNE_STRUCTURE } from '../../sandbox/seed-owner-surveyor'

const row = (x: Partial<StructuralElement> & Pick<StructuralElement, 'kind'>): StructuralElement => ({ material: null, systemId: null, note: '', ...x })

describe('structureSummary', () => {
  it('is empty for no elements', () => {
    expect(structureSummary([])).toBe('')
  })

  it('reads the Tiverne House elements in order', () => {
    expect(structureSummary(TIVERNE_STRUCTURE)).toBe('Bolted steel frame, composite slabs on metal deck, concrete cores, stone cladding, precast concrete panels, unitised curtain wall')
  })

  it('uses the material and the element when no system is chosen', () => {
    expect(structureSummary([row({ kind: 'roof', material: 'timber' })])).toBe('Timber roof')
  })

  it('puts the frame before the facade whatever the input order', () => {
    expect(structureSummary([row({ kind: 'facade', systemId: 'fac_brick', material: 'masonry' }), row({ kind: 'frame', systemId: 'frame_glulam', material: 'timber' })])).toBe('Glulam frame, brick outer leaf')
  })

  it('skips a row with nothing to say', () => {
    expect(structureSummary([row({ kind: 'roof', note: 'Not inspected' })])).toBe('')
  })
})

describe('normaliseStructure', () => {
  it('refuses a system of another element', () => {
    expect(normaliseStructure([row({ kind: 'floors', systemId: 'frame_steel_bolted' })]).error).toBe(STRUCTURE_ERRORS.mismatch)
  })

  it('refuses a system of another material', () => {
    expect(normaliseStructure([row({ kind: 'frame', material: 'timber', systemId: 'frame_steel_bolted' })]).error).toBe(STRUCTURE_ERRORS.mismatch)
  })

  it('refuses an unknown system', () => {
    expect(normaliseStructure([row({ kind: 'frame', systemId: 'frame_bamboo' })]).error).toBe(STRUCTURE_ERRORS.mismatch)
  })

  it("fills the material from the system", () => {
    const r = normaliseStructure([row({ kind: 'frame', systemId: 'frame_steel_bolted' })])
    expect(r.error).toBeNull()
    expect(r.elements).toEqual([{ kind: 'frame', material: 'steel', systemId: 'frame_steel_bolted', note: '' }])
  })

  it('refuses thirteen rows', () => {
    const rows = Array.from({ length: 13 }, () => row({ kind: 'facade', material: 'stone' }))
    expect(normaliseStructure(rows).error).toBe('A building can have up to 12 structural elements.')
    expect(normaliseStructure(rows.slice(0, 12)).error).toBeNull()
  })

  it('trims a 300 character note to 200', () => {
    const r = normaliseStructure([row({ kind: 'roof', note: 'x'.repeat(300) })])
    expect(r.elements[0].note).toHaveLength(200)
  })

  it('drops an all-empty row and sorts by element, keeping order within one', () => {
    const r = normaliseStructure([row({ kind: 'facade', material: 'stone' }), row({ kind: 'roof' }), row({ kind: 'frame', material: 'steel' }), row({ kind: 'facade', material: 'masonry', note: '  rear  ' })])
    expect(r.elements.map((e) => [e.kind, e.material, e.note])).toEqual([
      ['frame', 'steel', ''],
      ['facade', 'stone', ''],
      ['facade', 'masonry', 'rear'],
    ])
  })
})

describe('choices', () => {
  it('offers the materials of each element in table order, then other', () => {
    expect(materialsFor('stability')).toEqual(['concrete_in_situ', 'steel', 'masonry', 'other'])
    expect(materialsFor('facade')).toEqual(['aluminium_glass', 'stone', 'concrete_precast', 'masonry', 'other'])
  })

  it('filters systems by material', () => {
    expect(systemsFor('frame', 'steel').map((s) => s.id)).toEqual(['frame_steel_bolted', 'frame_steel_welded', 'frame_steel_portal'])
    expect(systemsFor('roof', null)).toHaveLength(4)
    expect(systemsFor('roof', 'other')).toEqual([])
  })
})
