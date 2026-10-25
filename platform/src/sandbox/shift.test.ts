import { describe, it, expect } from 'vitest'
import { addMonthsToKey, monthsBetween, shiftDates, shiftWorld } from './shift'
import { createSeed, itemByTag, lotForItem, MERROWGATE_ID, TIVERNE_ID } from '../domain/seed/world'
import { DEMO_TODAY } from '../domain/constants'

describe('shiftWorld', () => {
  it('moves every ISO date by whole days', () => {
    const w = createSeed()
    const s = shiftWorld(w, DEMO_TODAY, '2026-10-17')
    expect(s.projects[MERROWGATE_ID].startDate).toBe('2028-04-13')
    expect(s.buildings[TIVERNE_ID].programme.clearBy).toBe('2027-05-10')
    const th01 = itemByTag(s, 'TH-01')
    expect(lotForItem(s, th01.id).availableFrom).toBe('2027-03-25')
    expect(th01.capturedOn).toBe('2026-09-24')
    expect(s.buildings[TIVERNE_ID].surveyedBy!.date).toBe('2026-09-24')
  })

  it('moves every YYYY-MM month key by whole months', () => {
    const w = createSeed()
    const s = shiftWorld(w, DEMO_TODAY, '2027-01-02')
    const th02 = lotForItem(s, itemByTag(s, 'TH-02').id)
    expect(th02.listedMonth).toBe('2026-12')
    expect(s.projects[MERROWGATE_ID].startDate).toBe('2028-06-29')
  })

  it('leaves other strings, numbers and keys alone', () => {
    const w = createSeed()
    const s = shiftWorld(w, DEMO_TODAY, '2026-12-25')
    expect(s.buildings[TIVERNE_ID].name).toBe('Tiverne House')
    expect(s.buildings[TIVERNE_ID].yearBuilt).toBe(1984)
    expect(s.buildings[TIVERNE_ID].distancesKm).toEqual(w.buildings[TIVERNE_ID].distancesKm)
    expect(s.engagements).toEqual(w.engagements)
    expect(Object.keys(s.lots)).toEqual(Object.keys(w.lots))
    expect(s.publicIdPool).toEqual(w.publicIdPool)
    expect(shiftDates({ a: 'Q1 2027', b: '2027-01-01T10:00:00Z', c: 2027, d: null }, 5, 1)).toEqual({ a: 'Q1 2027', b: '2027-01-01T10:00:00Z', c: 2027, d: null })
  })

  it('is the identity at zero and never changes its input', () => {
    const w = createSeed()
    const before = JSON.stringify(w)
    expect(shiftWorld(w, DEMO_TODAY, DEMO_TODAY)).toEqual(w)
    shiftWorld(w, DEMO_TODAY, '2027-05-05')
    expect(JSON.stringify(w)).toBe(before)
  })

  it('round trips', () => {
    const w = createSeed()
    expect(shiftWorld(shiftWorld(w, DEMO_TODAY, '2026-11-20'), '2026-11-20', DEMO_TODAY)).toEqual(w)
  })

  it('month arithmetic crosses years', () => {
    expect(addMonthsToKey('2026-11', 3)).toBe('2027-02')
    expect(addMonthsToKey('2027-01', -1)).toBe('2026-12')
    expect(monthsBetween('2026-10-07', '2027-01-31')).toBe(3)
    expect(monthsBetween('2026-10-07', '2026-10-31')).toBe(0)
  })
})
