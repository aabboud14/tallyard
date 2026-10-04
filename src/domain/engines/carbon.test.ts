import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed, itemByTag } from '../seed/world'
import { carbonAvoided, itemCarbon, steelAllocationCarbon, confirmedHubKm, type CarbonResult } from './carbon'

const w = createSeed()

function check(r: CarbonResult | null, e: { a13New: number; a4New: number; a13Reuse: number; a4Reuse: number; avoided: number; percent: number }) {
  expect(r).not.toBeNull()
  closeTo(r!.a13New, e.a13New, 4)
  closeTo(r!.a4New, e.a4New, 4)
  closeTo(r!.a13Reuse, e.a13Reuse, 4)
  closeTo(r!.a4Reuse, e.a4Reuse, 4)
  closeTo(r!.avoided, e.avoided, 4)
  closeTo(r!.percent * 100, e.percent, 1)
}

const R1 = 23.18976

describe('B2 upfront carbon avoided (F2)', () => {
  it('B2.1 TH-01 at listing, 50 km', () => check(itemCarbon(itemByTag(w, 'TH-01'), 'deconstruction', A), { a13New: 42.0314, a4New: 0.3087, a13Reuse: 1.2078, a4Reuse: 0.1286, avoided: 41.0037, percent: 96.8 }))
  it('B2.2 TH-01 plan item allocated to R1, 50 km', () => check(steelAllocationCarbon(R1, 24.156, 50, A), { a13New: 40.3502, a4New: 0.2964, a13Reuse: 1.2078, a4Reuse: 0.1286, avoided: 39.3101, percent: 96.7 }))
  it('B2.3 TH-01 deal via Tilbury (25 + 31 km)', () => check(steelAllocationCarbon(R1, 24.156, confirmedHubKm(31, A), A), { a13New: 40.3502, a4New: 0.2964, a13Reuse: 1.2078, a4Reuse: 0.1441, avoided: 39.2947, percent: 96.7 }))
  it('B2.4 TH-01 deal via Barking (25 + 14 km)', () => check(steelAllocationCarbon(R1, 24.156, confirmedHubKm(14, A), A), { a13New: 40.3502, a4New: 0.2964, a13Reuse: 1.2078, a4Reuse: 0.1003, avoided: 39.3384, percent: 96.8 }))
  it('B2.5 TH-01 deal direct (9 km)', () => check(steelAllocationCarbon(R1, 24.156, 9, A), { a13New: 40.3502, a4New: 0.2964, a13Reuse: 1.2078, a4Reuse: 0.0232, avoided: 39.4156, percent: 97.0 }))
  it('B2.6 TH-08 at listing', () => check(itemCarbon(itemByTag(w, 'TH-08'), 'deconstruction', A), { a13New: 84.24, a4New: 0.2961, a13Reuse: 6.318, a4Reuse: 0.1234, avoided: 78.0947, percent: 92.4 }))
  it('B2.7 TH-11 at listing', () => check(itemCarbon(itemByTag(w, 'TH-11'), 'deconstruction', A), { a13New: 43.2, a4New: 0.4601, a13Reuse: 9.288, a4Reuse: 0.1917, avoided: 34.1804, percent: 78.3 }))
  it('B2.8 TH-12 at listing', () => {
    const r = carbonAvoided({ family: 'steel_section', sourceType: 'deconstruction', baselineQty: 4.4256, baselineMassT: 4.4256, reuseQty: 4.4256, reuseMassT: 4.4256, reuseKm: 50 }, A)
    check(r, { a13New: 7.7005, a4New: 0.0566, a13Reuse: 0.2213, a4Reuse: 0.0236, avoided: 7.5123, percent: 96.8 })
  })
  it('B2.9 OS-21 deal via Barking', () => {
    const r = carbonAvoided({ family: 'stone_cladding', sourceType: 'deconstruction', baselineQty: 57.2, baselineMassT: 57.2, reuseQty: 57.2, reuseMassT: 57.2, reuseKm: confirmedHubKm(14, A) }, A)
    check(r, { a13New: 4.576, a4New: 0.731, a13Reuse: 0.572, a4Reuse: 0.2376, avoided: 4.4974, percent: 84.7 })
  })
  it('B2.10 OS-22 deal via Park Royal', () => {
    const r = carbonAvoided({ family: 'raised_floor', sourceType: 'fit_out_strip', baselineQty: 1368, baselineMassT: 45.6, reuseQty: 1368, reuseMassT: 45.6, reuseKm: confirmedHubKm(24, A) }, A)
    check(r, { a13New: 54.72, a4New: 0.5828, a13Reuse: 11.7648, a4Reuse: 0.238, avoided: 43.3, percent: 78.3 })
  })
  it('B2.11 OS-17 unused surplus is null', () => expect(itemCarbon(itemByTag(w, 'OS-17'), 'unused_surplus', A)).toBeNull())
  it('B2.12 matcher summary avoided carbon 79.7105', () => closeTo(steelAllocationCarbon(47.0957, 51.295, 50, A).avoided, 79.7105, 4))
})
