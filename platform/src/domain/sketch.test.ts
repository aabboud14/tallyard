import { describe, expect, it } from 'vitest'
import { FAMILY_IDS } from './reference/families'
import { buildingSketch, facadeOf, frameFromText, projectSketch, rankFamilies, sketchUse } from './sketch'
import { fresh } from '../test/fixtures'
import { MERROWGATE_ID, TIVERNE_ID } from './seed/world'
import { listingOf, lotByPublicId, projectWishlist } from '../store/lots'
import type { FamilyId } from './types'

describe('sketch', () => {
  it('maps every family to a facade or to nothing', () => {
    expect(Object.fromEntries(FAMILY_IDS.map((f) => [f, facadeOf(f)]))).toEqual({
      steel_section: null,
      curtain_wall: 'glass',
      precast_cladding: 'precast',
      stone_cladding: 'stone',
      clay_brick: 'brick',
      raised_floor: null,
      timber_joist: 'timber',
    })
  })

  it('reads the frame from the structure type, first rule first', () => {
    expect(frameFromText('Steel frame with composite slabs, stone and precast cladding')).toBe('steel')
    expect(frameFromText('Load-bearing brick')).toBe('masonry')
    expect(frameFromText('Reinforced concrete frame')).toBe('concrete')
    expect(frameFromText('Glulam and CLT')).toBe('timber')
    expect(frameFromText('')).toBe('unknown')
  })

  it('draws known project types as themselves and anything else as other', () => {
    expect(sketchUse('office')).toBe('office')
    expect(sketchUse('hotel')).toBe('hotel')
    expect(sketchUse('residential')).toBe('residential')
    expect(sketchUse('Logistics warehouse')).toBe('industrial')
    expect(sketchUse('education')).toBe('other')
  })

  it('ranks families by count, ties in the reference order', () => {
    const fams: FamilyId[] = ['clay_brick', 'steel_section', 'clay_brick', 'curtain_wall', 'steel_section', 'raised_floor']
    expect(rankFamilies(fams)).toEqual(['steel_section', 'clay_brick', 'curtain_wall', 'raised_floor'])
    expect(rankFamilies([])).toEqual([])
  })

  it('draws the seed projects and buildings from their records', () => {
    const s = fresh()
    const p = s.world.projects[MERROWGATE_ID]
    const families = projectWishlist(s.world, MERROWGATE_ID)!.items.map((i) => listingOf(s.world, lotByPublicId(s.world, i.publicId)!).family)
    const m = projectSketch(p, families)
    expect(m.frame).toBe('steel')
    expect(m.state).toBe('proposed')
    expect(m.use).toBe('office')
    expect(m.facades.length).toBeLessThanOrEqual(3)
    expect(m.label).toBe('Illustration of an office project, drawn from its shortlisted materials')
    expect(projectSketch(p, []).label).toBe('Illustration of an office project')
    const b = s.world.buildings[TIVERNE_ID]
    const t = buildingSketch(b, ['stone_cladding', 'precast_cladding', 'curtain_wall', 'steel_section', 'stone_cladding'])
    expect(t).toMatchObject({ storeys: 7, frame: 'steel', state: 'existing', facades: ['stone', 'glass', 'precast'] })
    expect(t.label).toBe('Illustration of a 7 storey building, drawn from its survey')
    expect(buildingSketch({ id: 'b', storeys: null, structureType: '' }, []).label).toBe('Illustration of a building, drawn from its survey')
  })

  it('never calls a drawing a photo', () => {
    const labels = [projectSketch({ id: 'p', name: 'P', projectType: 'hotel' }, ['curtain_wall']).label, buildingSketch({ id: 'b', storeys: 3, structureType: 'Steel' }, ['clay_brick']).label]
    for (const l of labels) expect(l).not.toMatch(/photo/i)
  })
})
