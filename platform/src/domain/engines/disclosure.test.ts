import { describe, it, expect } from 'vitest'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { disclosureScore, type DisclosureLot, INFERENCES } from './disclosure'

function lots(n: number, frame: boolean, photo: boolean): DisclosureLot[] {
  const out: DisclosureLot[] = []
  for (let i = 0; i < n; i++) {
    const uc = frame && i === 1
    out.push({ isSteel: true, sectionType: uc ? 'UC' : 'UB', designation: uc ? 'UC 305x305x118' : 'UB 457x191x67', lengthM: 7.5, hasPublicPhoto: photo && i === 0 })
  }
  return out
}

const cases: [string, 'region' | 'local_authority', 'quarter' | 'month', number, boolean, boolean, number, string][] = [
  ['B10.1', 'region', 'quarter', 0, false, false, 10, 'Low'],
  ['B10.2', 'region', 'quarter', 1, false, false, 10, 'Low'],
  ['B10.3', 'local_authority', 'quarter', 1, false, false, 25, 'Medium'],
  ['B10.4', 'region', 'month', 1, false, false, 20, 'Low'],
  ['B10.5', 'local_authority', 'month', 1, false, false, 35, 'Medium'],
  ['B10.6', 'local_authority', 'month', 1, false, true, 45, 'High'],
  ['B10.7', 'region', 'quarter', 2, false, false, 20, 'Low'],
  ['B10.8', 'region', 'quarter', 2, true, false, 35, 'Medium'],
  ['B10.9', 'region', 'quarter', 4, true, false, 45, 'High'],
  ['B10.10', 'region', 'quarter', 3, true, true, 45, 'High'],
  ['B10.11', 'local_authority', 'month', 6, true, true, 80, 'High'],
]

describe('B10 disclosure score (F10) and P9', () => {
  for (const [id, loc, tim, n, frame, photo, score, band] of cases) {
    it(`${id} ${loc}, ${tim}, ${n} lots, frame ${frame}, photo ${photo}`, () => {
      const r = disclosureScore({ locationLevel: loc, timingLevel: tim, openLots: lots(n, frame, photo) }, A)
      expect(r.score).toBe(score)
      expect(r.band).toBe(band)
    })
  }
  it('B10.12 lists what an outsider could infer', () => {
    const r = disclosureScore({ locationLevel: 'local_authority', timingLevel: 'month', openLots: lots(1, false, true) }, A)
    expect(r.inferences).toEqual([INFERENCES.localAuthority, INFERENCES.month, INFERENCES.photo])
    const none = disclosureScore({ locationLevel: 'region', timingLevel: 'quarter', openLots: lots(1, false, false) }, A)
    expect(none.inferences).toEqual([INFERENCES.none])
    expect(r.blocksPublishing).toBe(true)
    expect(none.blocksPublishing).toBe(false)
  })
  it('B10.13 three distinct section and length combinations count as a frame pattern', () => {
    const three: DisclosureLot[] = [
      { isSteel: true, sectionType: 'UB', designation: 'UB 457x191x67', lengthM: 7.5, hasPublicPhoto: false },
      { isSteel: true, sectionType: 'UB', designation: 'UB 533x210x92', lengthM: 9.0, hasPublicPhoto: false },
      { isSteel: true, sectionType: 'UB', designation: 'UB 406x178x60', lengthM: 6.0, hasPublicPhoto: false },
    ]
    expect(disclosureScore({ locationLevel: 'region', timingLevel: 'quarter', openLots: three }, A).score).toBe(35)
  })
})
