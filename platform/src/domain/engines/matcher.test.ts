import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { DEMO_TODAY } from '../constants'
import { createSeed, itemByTag, lotForItem, MERROWGATE_ID, TIVERNE_ID } from '../seed/world'
import { listingsVisibleToProject } from '../visibility'
import { matchSchedule, MATCH_REASONS } from './matcher'
import type { World } from '../types'

function publishTh01(w: World) {
  const lot = lotForItem(w, itemByTag(w, 'TH-01').id)
  lot.visibility = 'open'
  lot.listedMonth = '2026-10'
  lot.askPerUnit = 800
  lot.reservePerUnit = 730
}

function run(w: World, terms: boolean, options = {}) {
  const p = { ...w.projects[MERROWGATE_ID], termsAccepted: terms }
  return matchSchedule(p.requirements, listingsVisibleToProject(w, p, A), DEMO_TODAY, A, options)
}

function allocs(r: ReturnType<typeof matchSchedule>, ref: string) {
  return r.results.find((x) => x.ref === ref)!.allocations.map((a) => [a.publicId, a.pieces, a.overSpecKgM, a.offcutM, a.gradeFlag, a.storageMin, a.storageMax])
}

describe('B7 schedule matching (F7), Merrowgate Wharf', () => {
  const w = createSeed()
  publishTh01(w)
  const r = run(w, true)
  it('B7.1 R1 52 of 52', () => expect(allocs(r, 'R1')).toEqual([['L-9F4CQQ', 48, 0.0, 0.3, true, 13, 16], ['L-NHZ32R', 4, 0.0, 1.8, false, 19, 19]]))
  it('B7.2 R2 12 of 12', () => expect(allocs(r, 'R2')).toEqual([['L-WPX5A6', 12, 0.0, 0.6, true, 13, 16]]))
  it('B7.3 R3 10 of 10', () => expect(allocs(r, 'R3')).toEqual([['L-MNY55K', 10, 0.0, 0.2, true, 10, 13]]))
  it('B7.4 R4 8 of 8', () => expect(allocs(r, 'R4')).toEqual([['L-6DN4K3', 8, 7.7, 0.8, false, 17, 18]]))
  it('B7.5 R5 0 of 6 with the length reason', () => {
    const r5 = r.results.find((x) => x.ref === 'R5')!
    expect(r5.allocations).toEqual([])
    expect(r5.matched).toBe(0)
    expect(r5.reason).toBe(MATCH_REASONS.long(9.5))
    expect(r5.reason).toBe('No stock long enough (longest visible in this serial size is 9.5 m)')
  })
  it('B7.6 R6 14 of 14', () => expect(allocs(r, 'R6')).toEqual([['L-FQK92P', 14, 6.0, 0.5, true, 13, 16]]))
  it('B7.7 summary', () => {
    expect(r.lines).toBe(6)
    expect(r.members).toBe(102)
    expect(r.matched).toBe(96)
    closeTo(r.coverage * 100, 94.1176, 4)
    closeTo(r.baselineMassT, 47.0957, 4)
    closeTo(r.stockMassT, 51.295, 3)
    closeTo(r.offcutMassT, 3.29378, 5)
    closeTo(r.avoidedT, 79.7105, 4)
    expect(r.results.map((x) => x.ref)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6'])
    for (const ref of ['R1', 'R2', 'R3', 'R4', 'R6']) expect(r.results.find((x) => x.ref === ref)!.reason).toBeNull()
  })
  it('B7.8 variant: after step 3, terms not accepted', () => {
    const v = run(w, false)
    expect(allocs(v, 'R1').map((a) => [a[0], a[1]])).toEqual([['L-9F4CQQ', 48], ['L-NHZ32R', 4]])
    expect(allocs(v, 'R4').map((a) => [a[0], a[1]])).toEqual([['L-6DN4K3', 8]])
    expect(v.matched).toBe(60)
    expect(v.members).toBe(102)
    for (const ref of ['R2', 'R3', 'R5', 'R6']) expect(v.results.find((x) => x.ref === ref)!.matched).toBe(0)
  })
  it('B7.9 variant: at the start, terms accepted', () => {
    const w0 = createSeed()
    const v = run(w0, true)
    expect(allocs(v, 'R1').map((a) => [a[0], a[1]])).toEqual([['L-NHZ32R', 16], ['L-6DN4K3', 2]])
    expect(v.results.find((x) => x.ref === 'R1')!.reason).toBe(MATCH_REASONS.stock)
    expect(v.results.map((x) => x.matched)).toEqual([18, 12, 10, 8, 0, 14])
    expect(v.matched).toBe(62)
  })
  it('B7.10 variant: at the start, terms not accepted', () => {
    const v = run(createSeed(), false)
    expect(v.results.map((x) => x.matched)).toEqual([18, 0, 0, 8, 0, 0])
    expect(v.matched).toBe(26)
  })
  it('B7.11 variant: allowUnknownGrade false, terms accepted', () => {
    const v = run(w, true, { allowUnknownGrade: false })
    expect(allocs(v, 'R1').map((a) => [a[0], a[1]])).toEqual([['L-NHZ32R', 16], ['L-6DN4K3', 2]])
    expect(allocs(v, 'R4').map((a) => [a[0], a[1]])).toEqual([['L-6DN4K3', 8]])
    for (const ref of ['R2', 'R3', 'R6']) expect(v.results.find((x) => x.ref === ref)!.reason).toBe(MATCH_REASONS.grade)
    expect(v.matched).toBe(26)
  })
  it('B7.12 variant: after the TH-01 deal is confirmed, terms accepted', () => {
    const w2 = createSeed()
    publishTh01(w2)
    const lot = lotForItem(w2, itemByTag(w2, 'TH-01').id)
    lot.piecesOnOffer = 0
    const p = { ...w2.projects[MERROWGATE_ID], termsAccepted: true }
    const v = matchSchedule(p.requirements, listingsVisibleToProject(w2, p, A), DEMO_TODAY, A, { secured: { R1: 48 } })
    expect(v.results.find((x) => x.ref === 'R1')!.required).toBe(4)
    expect(allocs(v, 'R1').map((a) => [a[0], a[1]])).toEqual([['L-NHZ32R', 4]])
    expect(v.results.map((x) => x.matched)).toEqual([4, 12, 10, 8, 0, 14])
    expect(v.members).toBe(54)
    expect(v.matched).toBe(48)
  })
  it('B7.13 Tiverne House is in Central London and its lots are shared in confidence', () => {
    expect(w.buildings[TIVERNE_ID].region).toBe('Central London')
    const shared = listingsVisibleToProject(w, { ...w.projects[MERROWGATE_ID], termsAccepted: true }, A).filter((l) => l.sharing === 'in_confidence')
    expect(shared.map((l) => l.publicId).sort()).toEqual(['L-2R8X5N', 'L-775DW8', 'L-FQK92P', 'L-MNY55K', 'L-WPX5A6'])
  })
})
