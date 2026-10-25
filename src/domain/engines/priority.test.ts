import { describe, it, expect } from 'vitest'
import { closeTo, pence } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed, TIVERNE_ID, lotForItem } from '../seed/world'
import { priorityRanking } from './priority'
import type { InventoryItem } from '../types'

function tiverneWithTh12() {
  const w = createSeed()
  const th12: InventoryItem = {
    id: 'itm_q7m2kd',
    buildingId: TIVERNE_ID,
    tag: 'TH-12',
    family: 'steel_section',
    spec: { family: 'steel_section', designation: 'UC 203x203x46', lengthM: 3.2 },
    quantity: { kind: 'pieces', pieces: 30 },
    condition: 'A',
    recoverability: 'A',
    testStatus: 'untested',
    grade: 'unknown',
    location: 'roof plant room',
    photos: [],
    notes: '',
    capturedBy: 'Dana Kowalski',
    capturedOn: '2026-10-07',
    expectedAvailableFrom: '2027-01-25',
  }
  w.items[th12.id] = th12
  w.lots['lot_q7m2kd'] = { id: 'lot_q7m2kd', itemId: th12.id, publicId: 'L-GMXG69', visibility: 'private', piecesOnOffer: 30, shareOnOffer: 1, availableFrom: '2027-01-25', inStock: null, listedMonth: null, askPerUnit: null, reservePerUnit: null, sold: false }
  const items = Object.values(w.items).filter((i) => i.buildingId === TIVERNE_ID)
  const publicIds = Object.fromEntries(items.map((i) => [i.id, lotForItem(w, i.id).publicId]))
  return priorityRanking(items, publicIds, 'deconstruction', w.snapshot, A)
}

const expected: [number, string, number, number, number, string, number, string][] = [
  [1, 'TH-02', 720, 31332.42, 84.4212, 'balanced', 68.705, 'recover'],
  [2, 'TH-06', 770, 23539.97, 58.7618, 'high', 63.94, 'recover'],
  [3, 'TH-07', 162, 55200.0, 5.112, 'balanced', 57.817, 'recover'],
  [4, 'TH-01', 770, 16426.08, 41.0037, 'high', 52.474, 'recover'],
  [5, 'TH-08', 77, 17690.4, 78.0947, 'low', 50.571, 'recover'],
  [6, 'TH-04', 615, 21357.0, 69.0525, 'low', 46.015, 'recover'],
  [7, 'TH-05', 660, 13864.13, 41.2873, 'balanced', 44.718, 'recover'],
  [8, 'TH-03', 660, 13790.06, 41.0667, 'balanced', 40.586, 'recover'],
  [9, 'TH-11', 3.6, 7200.0, 34.1804, 'balanced', 37.364, 'recover'],
  [10, 'TH-09', 37, -26220.0, 72.0067, 'low', 27.588, 'recycle'],
  [11, 'TH-10', 0.99, 12800.0, 9.9109, 'balanced', 24.797, 'recycle'],
  [12, 'TH-12', 670, 2566.85, 7.5123, 'low', 14.53, 'recover'],
]

describe('B6 deconstruction priority (F6)', () => {
  const r = tiverneWithTh12()
  for (const [rank, tag, guide, net, carbon, signal, score, route] of expected) {
    it(`B6.${rank} ${tag} score ${score}`, () => {
      const row = r.rows[rank - 1]
      expect(row.tag).toBe(tag)
      expect(row.guide).toBe(guide)
      pence(row.netValue, net)
      closeTo(row.carbon, carbon, 4)
      expect(row.signal).toBe(signal)
      closeTo(row.score, score, 3)
      expect(row.route).toBe(route)
    })
  }
  it('B6.13 recoverable net value and top three share', () => {
    pence(r.recoverableNetValue, 202966.91)
    closeTo(r.topThreeShare * 100, 54.2, 1)
  })
  it('B6.14 score parts', () => {
    const th02 = r.rows[0]
    closeTo(th02.parts.netValue, 22.7047, 4)
    closeTo(th02.parts.carbon, 30.0, 4)
    closeTo(th02.parts.demand, 10.0, 4)
    closeTo(th02.parts.ease, 6.0, 4)
    const th01 = r.rows[3]
    closeTo(th01.parts.netValue, 11.903, 4)
    closeTo(th01.parts.carbon, 14.5711, 4)
    closeTo(th01.parts.demand, 20.0, 4)
    closeTo(th01.parts.ease, 6.0, 4)
  })
})
