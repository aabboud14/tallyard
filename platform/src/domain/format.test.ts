import { describe, it, expect } from 'vitest'
import * as f from './format'

describe('B14 formatting', () => {
  it('B14.1 money', () => expect(f.money(21227.74)).toBe('£21,227.74'))
  it('B14.2 unit price, steel', () => expect(f.unitPrice(740, 'steel_section')).toBe('£740 per tonne'))
  it('B14.3 unit price, raised floor', () => expect(f.unitPrice(3.6, 'raised_floor')).toBe('£3.60 per panel'))
  it('B14.4 unit price, brick', () => expect(f.unitPrice(0.99, 'clay_brick')).toBe('£0.99 per brick'))
  it('B14.5 bill of materials value', () => expect(f.moneyWhole(1150000)).toBe('£1,150,000'))
  it('B14.6 mass, marketplace', () => expect(f.massT(24.156)).toBe('24.16 t'))
  it('B14.7 mass, waste', () => expect(f.massWaste(11369.2)).toBe('11,369.2 t'))
  it('B14.8 carbon', () => expect(f.carbon(41.003723)).toBe('41.0 tCO2e'))
  it('B14.9 percent', () => expect(f.percent(0.084611)).toBe('8.5%'))
  it('B14.10 content by value', () => expect(f.percent2(0.200593)).toBe('20.06%'))
  it('B14.11 contribution', () => expect(f.contribution(0.001489)).toBe('+0.15'))
  it('signed points read the same as a contribution', () => {
    expect(f.signedPoints(0.1489)).toBe('+0.15')
    expect(f.signedPoints(-2.004)).toBe('-2.00')
    expect(f.signedPoints(0)).toBe('+0.00')
  })
  it('B14.12 break-even', () => expect(f.months1(36.2066)).toBe('36.2 months'))
  it('B14.13 intensity', () => expect(f.intensity(0.718671)).toBe('0.72 t per m2 GIA'))
  it('B14.14 score', () => expect(f.score(68.705)).toBe('68.7'))
  it('B14.15 date', () => expect(f.date('2027-03-15')).toBe('15 March 2027'))
  it('B14.16 quarter', () => expect(f.quarter('2027-03-15')).toBe('Q1 2027'))
  it('B14.17 month', () => expect(f.month('2026-11-15')).toBe('November 2026'))
  it('B14.18 saving, negative', () => expect(f.savingShort(-591.7)).toBe('Costs £591.70 more than new'))
  it('B14.19 saving with percent', () => {
    expect(f.saving(983.7, 0.04242)).toBe('Saving £983.70 (4.2%)')
    expect(f.saving(-3134.37, -0.13516)).toBe('Costs £3,134.37 more than new (13.5%)')
  })
  it('B14.20 months and quantities', () => {
    expect(f.months(13)).toBe('13 months')
    expect(f.quantity(48, 'pieces')).toBe('48 pieces')
    expect(f.quantity(20000, 'brick')).toBe('20,000 bricks')
    expect(f.quantity(3000, 'panel')).toBe('3,000 panels')
    expect(f.quantity(600, 'm2')).toBe('600 m2')
  })
})
