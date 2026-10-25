import { describe, it, expect } from 'vitest'
import { closeTo, pence } from '../../test/helpers'
import { createSeed, MERROWGATE_ID } from '../seed/world'
import { contentByValue } from './content'
import { byStage, financeTotals, portfolioAim, portfolioContent, reuseByValue, seededDealLine, type FinanceLine } from './finance'

const line = (total: number, costNew: number, stage: FinanceLine['stage'] = 'to_request', avoidedT: number | null = 1, massT = 2): FinanceLine => ({ key: `k${total}`, stage, total, costNew, avoidedT, massT })
const mg = createSeed().projects[MERROWGATE_ID]

describe('finance totals', () => {
  it('sums rounded amounts and works out the saving against new', () => {
    const t = financeTotals([line(41390.59, 49734), line(9481.1, 9662.4)])
    pence(t.total, 50871.69)
    pence(t.costNew, 59396.4)
    pence(t.saving, 8524.71)
    closeTo(t.savingPercent, 0.1435223, 6)
    expect(t.count).toBe(2)
    expect(t.avoidedT).toBe(2)
    expect(t.massT).toBe(4)
  })

  it('of no lines is all zeros with a saving share of 0', () => {
    expect(financeTotals([])).toEqual({ count: 0, total: 0, costNew: 0, saving: 0, savingPercent: 0, avoidedT: 0, massT: 0 })
  })

  it('keeps the sign of a negative saving', () => {
    const t = financeTotals([line(1200, 1000)])
    pence(t.saving, -200)
    closeTo(t.savingPercent, -0.2, 6)
  })

  it('counts a missing avoided carbon as nothing', () => {
    expect(financeTotals([line(10, 20, 'waiting', null)]).avoidedT).toBe(0)
  })

  it('earlier deals count at the agreed material price against the same quantity new', () => {
    const [d1, d2] = mg.seededDeals
    expect(seededDealLine(d1)).toMatchObject({ key: 'L-R8Q33F', stage: 'confirmed', total: 91000, costNew: 234000 })
    expect(seededDealLine(d2)).toMatchObject({ key: 'L-5APGJ7', stage: 'confirmed', total: 14060, costNew: 41800 })
  })

  it("Merrowgate's four lines: two earlier deals, the pending request and the approved lot not yet requested", () => {
    const lines = [...mg.seededDeals.map(seededDealLine), line(41390.59, 49734, 'requested'), line(9481.1, 9662.4, 'to_request')]
    const t = financeTotals(lines)
    pence(t.total, 155931.69)
    pence(t.costNew, 335196.4)
    pence(t.saving, 179264.71)
    const s = byStage(lines)
    pence(s.confirmed.total, 105060)
    pence(s.requested.total, 41390.59)
    pence(s.to_request.total, 9481.1)
    expect(s.reserved.count).toBe(0)
    expect(s.waiting).toEqual(financeTotals([]))
  })
})

describe('reuse by value', () => {
  it("Merrowgate's secured reuse is the stone and raised floor at the value of new", () => {
    const r = contentByValue(mg.billOfMaterials, { stone_cladding: 520, raised_floor: 3800 })
    closeTo(reuseByValue(r), 275800 / 11680600, 7)
    closeTo(reuseByValue(r), 0.0236118, 7)
  })

  it('is 0 without a bill', () => {
    expect(reuseByValue(contentByValue([], { steel_section: 10 }))).toBe(0)
  })

  it('across projects: one result equals its own percent, a zero-value result is ignored, none gives null', () => {
    const r = contentByValue(mg.billOfMaterials, { stone_cladding: 520, raised_floor: 3800 })
    const one = portfolioContent([r])!
    closeTo(one.percent, r.percent, 9)
    closeTo(one.reuse, reuseByValue(r), 9)
    expect(one.totalValue).toBe(r.totalValue)
    const withEmpty = portfolioContent([r, contentByValue([], {})])!
    closeTo(withEmpty.percent, r.percent, 9)
    expect(portfolioContent([])).toBeNull()
    expect(portfolioContent([contentByValue([], {})])).toBeNull()
  })
})

describe('portfolioAim', () => {
  it('weights each project aim by its bill value, leaving out projects with no bill or no aim', () => {
    expect(portfolioAim([{ totalValue: 100, aim: 0.25 }])).toBe(0.25)
    expect(portfolioAim([{ totalValue: 300, aim: 0.25 }, { totalValue: 100, aim: 0.2 }, { totalValue: 0, aim: 0.5 }])).toBeCloseTo(0.2375, 10)
    expect(portfolioAim([{ totalValue: 100, aim: 0.25 }, { totalValue: 100, aim: 0 }])).toBe(0.25)
    expect(portfolioAim([{ totalValue: 0, aim: 0.2 }])).toBe(0)
    expect(portfolioAim([])).toBe(0)
  })
})
