import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed, itemByTag, lotForItem } from '../seed/world'
import { guidePrice, signalForRatio, signalForLot, sellerMandate, buyerMandate, marketSignal } from './pricing'
import { itemMeasures } from './measures'
import type { Condition, TestStatus, Signal, FamilyId } from '../types'

const w = createSeed()

describe('B5 price guidance (F5)', () => {
  const cases: [string, FamilyId, Condition, TestStatus, Signal, number, number, number, number, { scrapValue?: number; capRatio?: number }][] = [
    ['P1', 'steel_section', 'A', 'untested', 'high', 770.4, 770, 715, 825, {}],
    ['P2', 'steel_section', 'A', 'tested', 'high', 856.0, 855, 795, 915, {}],
    ['P3', 'precast_cladding', 'B', 'untested', 'low', 36.9619, 37, 34, 40, {}],
    ['P4', 'steel_section', 'C', 'untested', 'low', 535.68, 600, 560, 640, { scrapValue: 600 }],
    ['P5', 'steel_section', 'A', 'tested', 'high', 856.0, 800, 745, 855, { capRatio: 0.8 }],
    ['P6', 'steel_section', 'A', 'tested', 'balanced', 800.0, 800, 745, 855, {}],
    ['P7', 'steel_section', 'A', 'untested', 'low', 669.6, 670, 625, 715, {}],
    ['P8', 'raised_floor', 'B', 'untested', 'balanced', 3.6432, 3.6, 3.3, 3.9, {}],
    ['P9', 'clay_brick', 'B', 'untested', 'balanced', 0.9853, 0.99, 0.92, 1.06, {}],
    ['P10', 'curtain_wall', 'B', 'untested', 'low', 77.004, 77, 72, 82, {}],
    ['P11', 'stone_cladding', 'A', 'untested', 'balanced', 162.0, 162, 151, 173, {}],
    ['P12', 'clay_brick', 'A', 'certified', 'high', 1.337, 1.02, 0.95, 1.09, { capRatio: 1.2 }],
    ['P13', 'timber_joist', 'B', 'inspected', 'balanced', 353.97, 355, 330, 380, {}],
  ]
  for (const [id, fam, cond, test, sig, raw, guide, low, high, o] of cases) {
    it(`B5.${id} ${fam} ${cond} ${test} ${sig}`, () => {
      const r = guidePrice(fam, cond, test, sig, A, o)
      closeTo(r.raw, raw, 4)
      expect(r.guide).toBe(guide)
      expect(r.low).toBe(low)
      expect(r.high).toBe(high)
    })
  }
  it('B5.14 signal boundaries', () => {
    expect(signalForRatio(0.5)).toBe('balanced')
    expect(signalForRatio(1.5)).toBe('balanced')
    expect(signalForRatio(1.501)).toBe('high')
    expect(signalForRatio(0.499)).toBe('low')
    expect(marketSignal({ supply: {}, demand: { x: 10 }, lotPublicIds: [] }, 'x', null).signal).toBe('high')
  })

  const seeded: [string, Signal, number][] = [
    ['TH-01', 'high', 770], ['TH-02', 'balanced', 720], ['TH-03', 'balanced', 660], ['TH-04', 'low', 615], ['TH-05', 'balanced', 660], ['TH-06', 'high', 770],
    ['TH-07', 'balanced', 162], ['TH-08', 'low', 77], ['TH-09', 'low', 37], ['TH-10', 'balanced', 0.99], ['TH-11', 'balanced', 3.6],
    ['OS-11', 'high', 855], ['OS-12', 'high', 855], ['OS-14', 'high', 855], ['OS-28', 'high', 855], ['OS-13', 'balanced', 735], ['OS-15', 'low', 615], ['OS-16', 'low', 650],
    ['OS-17', 'low', 780], ['OS-18', 'high', 168], ['OS-19', 'balanced', 1.13], ['OS-20', 'balanced', 355], ['OS-23', 'balanced', 3.6], ['OS-24', 'low', 77], ['OS-25', 'low', 37],
    ['OS-26', 'balanced', 0.86], ['OS-27', 'high', 770],
  ]
  for (const [tag, sig, guide] of seeded) {
    it(`B5.15 ${tag} guide ${guide} with ${sig}`, () => {
      const item = itemByTag(w, tag)
      const lot = lotForItem(w, item.id)
      const s = signalForLot(w.snapshot, item.spec, lot.publicId, itemMeasures(item).units)
      expect(s.signal).toBe(sig)
      expect(guidePrice(item.family, item.condition, item.testStatus, s.signal, A).guide).toBe(guide)
    })
  }
  it('B5.16 TH-12 is Low demand at 670', () => {
    const s = signalForLot(w.snapshot, { family: 'steel_section', designation: 'UC 203x203x46', lengthM: 3.2 }, 'L-GMXG69', 4.4256)
    expect(s.signal).toBe('low')
    expect(guidePrice('steel_section', 'A', 'untested', s.signal, A).guide).toBe(670)
  })
  it('B5.17 snapshot check values', () => {
    closeTo(w.snapshot.supply['UB 457x191'], 16.222, 3)
    closeTo(w.snapshot.demand['UB 457x191'], 68.491, 3)
    closeTo(w.snapshot.supply['UB 406x178'] ?? 0, 0, 3)
    closeTo(w.snapshot.demand['UB 406x178'], 66.308, 3)
    closeTo(w.snapshot.supply['clay_brick'], 63000, 0)
    closeTo(w.snapshot.demand['raised_floor'], 7000, 0)
  })
  it('B5.18 seller mandates for Tiverne House (205 days to clear-by)', () => {
    const exp: Record<string, [number, number]> = { 'TH-01': [800, 730], 'TH-02': [750, 685], 'TH-03': [685, 625], 'TH-04': [640, 585], 'TH-05': [685, 625], 'TH-06': [800, 730], 'TH-07': [168, 154], 'TH-08': [80, 73], 'TH-09': [38, 35], 'TH-10': [1.03, 0.94], 'TH-11': [3.7, 3.4] }
    for (const [tag, [ask, reserve]] of Object.entries(exp)) {
      const item = itemByTag(w, tag)
      const lot = lotForItem(w, item.id)
      const s = signalForLot(w.snapshot, item.spec, lot.publicId, itemMeasures(item).units)
      const gp = guidePrice(item.family, item.condition, item.testStatus, s.signal, A)
      const m = sellerMandate(gp.guide, gp.tick, 205, A)
      expect([tag, m.ask, m.reserve]).toEqual([tag, ask, reserve])
    }
  })
  it('B5.19 urgency steps', () => {
    const steps: [number, number, number][] = [[205, 800, 730], [121, 800, 730], [120, 770, 700], [60, 770, 700], [59, 720, 660]]
    for (const [days, ask, reserve] of steps) {
      const m = sellerMandate(770, 5, days, A)
      expect([days, m.ask, m.reserve]).toEqual([days, ask, reserve])
    }
  })
  it('B5.20 buyer mandates', () => {
    expect(buyerMandate(770, 5, A)).toEqual({ open: 700, max: 780 })
    expect(buyerMandate(720, 5, A)).toEqual({ open: 655, max: 725 })
    expect(buyerMandate(3.6, 0.1, A)).toEqual({ open: 3.3, max: 3.6 })
  })
})
