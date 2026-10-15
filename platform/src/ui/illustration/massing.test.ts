import { describe, expect, it } from 'vitest'
import { buildingSketch, projectSketch, type BuildingSketch, type SketchUse } from '../../domain/sketch'
import { massingFor, massingPoints, SKETCH_BOARD } from './massing'

const USES: SketchUse[] = ['office', 'hotel', 'residential', 'industrial', 'other']
const TYPE_FOR: Record<SketchUse, string> = { office: 'office', hotel: 'hotel', residential: 'residential', industrial: 'warehouse', other: 'education' }

function sketches(): BuildingSketch[] {
  const out: BuildingSketch[] = []
  for (const use of USES) {
    for (let i = 0; i < 12; i++) out.push(projectSketch({ id: `p-${use}-${i}`, name: 'P', projectType: TYPE_FOR[use] }, ['steel_section', 'curtain_wall', 'clay_brick', 'stone_cladding']))
    for (const storeys of [null, 1, 2, 7, 12, 30]) out.push({ ...buildingSketch({ id: `b-${use}-${storeys}`, storeys, structureType: 'Steel frame', use }, ['precast_cladding']) })
  }
  return out
}

describe('massing', () => {
  it('gives the same massing for the same sketch', () => {
    const s = projectSketch({ id: 'p1', name: 'Merrowgate Wharf', projectType: 'office' }, ['steel_section', 'stone_cladding'])
    expect(massingFor(s)).toEqual(massingFor({ ...s }))
  })

  it('clamps recorded storeys to between 2 and 12', () => {
    expect(massingFor(buildingSketch({ id: 'b', storeys: 30, structureType: '' }, [])).storeys).toBe(12)
    expect(massingFor(buildingSketch({ id: 'b', storeys: 1, structureType: '' }, [])).storeys).toBe(2)
    expect(massingFor(buildingSketch({ id: 'b', storeys: 7, structureType: '' }, [])).storeys).toBe(7)
  })

  it('draws unrecorded storeys within the range for the use', () => {
    const range: Record<SketchUse, [number, number]> = { office: [6, 9], hotel: [7, 10], residential: [4, 6], industrial: [2, 3], other: [3, 5] }
    for (const use of USES) {
      for (let i = 0; i < 20; i++) {
        const n = massingFor(projectSketch({ id: `x${i}`, name: 'P', projectType: TYPE_FOR[use] }, [])).storeys
        expect(n).toBeGreaterThanOrEqual(range[use][0])
        expect(n).toBeLessThanOrEqual(range[use][1])
      }
    }
  })

  it('keeps every drawn point inside the board for every use and state', () => {
    for (const s of sketches()) {
      for (const [x, y] of massingPoints(massingFor(s))) {
        expect(x, `${s.seed} x`).toBeGreaterThanOrEqual(0)
        expect(x, `${s.seed} x`).toBeLessThanOrEqual(SKETCH_BOARD.width)
        expect(y, `${s.seed} y`).toBeGreaterThanOrEqual(0)
        expect(y, `${s.seed} y`).toBeLessThanOrEqual(SKETCH_BOARD.height)
      }
    }
  })

  it('puts a crane on proposed projects only and scaffold on existing buildings only', () => {
    const p = massingFor(projectSketch({ id: 'p', name: 'P', projectType: 'hotel' }, []))
    const b = massingFor(buildingSketch({ id: 'b', storeys: 5, structureType: 'Steel' }, []))
    expect([p.crane, p.scaffold]).toEqual([true, false])
    expect([b.crane, b.scaffold]).toEqual([false, true])
  })

  it('bands the facades bottom to top, one block per facade, covering every storey', () => {
    const m = massingFor(buildingSketch({ id: 'b', storeys: 7, structureType: 'Steel' }, ['stone_cladding', 'curtain_wall', 'precast_cladding']))
    expect(m.blocks.map((b) => b.facade)).toEqual(['glass', 'precast', 'stone'])
    expect(m.blocks.reduce((n, b) => n + b.storeys, 0)).toBe(7)
    expect(massingFor(buildingSketch({ id: 'b', storeys: 3, structureType: '' }, [])).blocks.map((b) => b.facade)).toEqual(['plain'])
  })
})
