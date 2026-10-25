import { describe, it } from 'vitest'
import { closeTo, pence } from '../../test/helpers'
import { createSeed, MERROWGATE_ID } from '../seed/world'
import { contentByValue } from './content'

const lines = createSeed().projects[MERROWGATE_ID].billOfMaterials

describe('B4 reused and recycled content by value (F4), Merrowgate Wharf', () => {
  it('B4.1 every reused fraction 0', () => {
    const r = contentByValue(lines, {})
    pence(r.totalContribution, 2058220)
    closeTo(r.percent * 100, 17.6208, 4)
    closeTo(r.totalValue, 11680600, 0)
  })
  it('B4.2 at the start (stone and raised floor secured)', () => {
    const r = contentByValue(lines, { stone_cladding: 520, raised_floor: 3800 })
    pence(r.totalContribution, 2325660)
    closeTo(r.percent * 100, 19.9104, 4)
  })
  it('B4.3 after the TH-01 deal', () => {
    const r = contentByValue(lines, { stone_cladding: 520, raised_floor: 3800, steel_section: 23.18976 })
    pence(r.totalContribution, 2343052.32)
    closeTo(r.percent * 100, 20.0593, 4)
    const pt = (id: string) => r.lines.find((l) => l.line.id === id)!.points
    closeTo(pt('bom08'), 2.0033, 4)
    closeTo(pt('bom10'), 0.2863, 4)
    closeTo(pt('bom03'), 0.1489, 4)
    closeTo(r.withoutReuse * 100 + pt('bom08') + pt('bom10') + pt('bom03'), 20.0593, 4)
    closeTo(r.lines.find((l) => l.line.id === 'bom10')!.s, 0.124183, 6)
    closeTo(r.lines.find((l) => l.line.id === 'bom03')!.s, 0.020165, 6)
  })
})
