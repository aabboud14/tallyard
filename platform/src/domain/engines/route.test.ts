import { describe, it, expect } from 'vitest'
import { FAMILY_IDS } from '../reference/families'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed, TIVERNE_ID, lotForItem } from '../seed/world'
import { priorityRanking } from './priority'
import { decisionTreeRoute } from './route'

describe('decisionTreeRoute', () => {
  it('maps recover to reuse for every family', () => {
    for (const id of FAMILY_IDS) expect(decisionTreeRoute(id, 'recover')).toBe('reuse')
  })

  it('maps recycle to recycle for steel and curtain wall, downcycle for the others', () => {
    expect(decisionTreeRoute('steel_section', 'recycle')).toBe('recycle')
    expect(decisionTreeRoute('curtain_wall', 'recycle')).toBe('recycle')
    expect(decisionTreeRoute('stone_cladding', 'recycle')).toBe('downcycle')
    expect(decisionTreeRoute('precast_cladding', 'recycle')).toBe('downcycle')
    expect(decisionTreeRoute('clay_brick', 'recycle')).toBe('downcycle')
    expect(decisionTreeRoute('raised_floor', 'recycle')).toBe('downcycle')
    expect(decisionTreeRoute('timber_joist', 'recycle')).toBe('downcycle')
  })

  it('never assigns upcycle or scrap', () => {
    for (const id of FAMILY_IDS) for (const r of ['recover', 'recycle'] as const) expect(['upcycle', 'scrap']).not.toContain(decisionTreeRoute(id, r))
  })

  it('reads the Tiverne House ranking: TH-09 and TH-10 downcycle, TH-02 reuse', () => {
    const w = createSeed()
    const items = Object.values(w.items).filter((i) => i.buildingId === TIVERNE_ID)
    const publicIds = Object.fromEntries(items.map((i) => [i.id, lotForItem(w, i.id).publicId]))
    const result = priorityRanking(items, publicIds, w.buildings[TIVERNE_ID].sourceType, w.snapshot, A)
    const step = (tag: string) => {
      const row = result.rows.find((r) => r.tag === tag)!
      return decisionTreeRoute(items.find((i) => i.id === row.itemId)!.family, row.route)
    }
    expect(step('TH-09')).toBe('downcycle')
    expect(step('TH-10')).toBe('downcycle')
    expect(step('TH-02')).toBe('reuse')
  })
})
