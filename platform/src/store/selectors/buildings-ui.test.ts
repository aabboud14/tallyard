// The round 2 building screens' extra view models: the header drawing, the holds chart, the structure form, the
// owner's Requests page, the contractor's draft dates and the testing results form.
import { describe, expect, it } from 'vitest'
import { addTestUser, fresh, must, actor, U, viewer } from '../../test/fixtures'
import { itemByTag, TIVERNE_ID, HARROWDEN_ID } from '../../domain/seed/world'
import { AMBREY_ID, FENNICK_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import { decideBuildingClaim } from '../actions/claims'
import { availabilityView } from './contractor'
import { availabilityDraft, blankElement, buildingSketches, buildingVisual, changedDates, fillBlankMonths, holdsChart, requestsPage, structureForm, testingResultsForm } from './buildings-ui'

describe('the building header drawing', () => {
  it('is drawn for each side of the building and for nobody else', () => {
    const s = fresh()
    const v = buildingVisual(s, viewer(U.tom), TIVERNE_ID)!
    expect(v.sketch.seed).toBe(TIVERNE_ID)
    expect(v.sketch.frame).toBe('steel')
    expect(buildingVisual(s, viewer(U.dana), AMBREY_ID)).not.toBeNull()
    expect(buildingVisual(s, viewer(U.priya), TIVERNE_ID)).toBeNull()
    expect(buildingVisual(s, viewer(U.tom), HARROWDEN_ID)).toBeNull()
  })
})

describe('what the building holds', () => {
  it('gives each typology its mass on a nice scale at least the heaviest', () => {
    const c = holdsChart(fresh(), viewer(U.tom), TIVERNE_ID)!
    expect(c.items.map((i) => i.key)).toEqual(['structure', 'envelope', 'finishes'])
    const heaviest = Math.max(...c.items.map((i) => i.value))
    expect(c.max).toBeGreaterThanOrEqual(heaviest)
    expect(c.max).toBeLessThanOrEqual(heaviest * 2.5)
    expect(c.items[0].sub).toMatch(/^\d+ items?$/)
    expect(c.totalText).toMatch(/ across \d+ items$/)
    expect(c.empty).toBe(false)
  })

  it('is empty for a building with nothing captured, and refused to the buying side', () => {
    const s = fresh()
    expect(holdsChart(s, viewer(U.priya), TIVERNE_ID)).toBeNull()
    const ambrey = holdsChart(s, viewer(U.dana), AMBREY_ID)!
    expect(ambrey.itemCount).toBe(2)
  })
})

describe('the structure form', () => {
  it('starts from the recorded elements for the owner and the surveyor', () => {
    const s = fresh()
    const f = structureForm(s, viewer(U.tom), TIVERNE_ID)!
    expect(f.elements.map((e) => e.systemId)).toEqual(['frame_steel_bolted', 'floors_composite', 'stab_cores', 'fac_stone', 'fac_precast', 'fac_unitised'])
    expect(f.notes).toMatch(/^Composite slabs/)
    expect(f.summary).toMatch(/^Bolted steel frame/)
    expect(f.options.map((o) => o.kind)).toEqual(['frame', 'floors', 'roof', 'stability', 'foundations', 'facade'])
    expect(structureForm(s, viewer(U.dana), TIVERNE_ID)).not.toBeNull()
  })

  it('is not offered to a contractor alone', () => {
    const r = addTestUser(fresh(), { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    expect(structureForm(r.state, viewer(r.userId), TIVERNE_ID)).toBeNull()
    expect(blankElement('roof')).toEqual({ kind: 'roof', material: null, systemId: null, note: '' })
  })
})

describe("the owner's Requests page", () => {
  it('counts reservations and buildings waiting, and opens on reservations when both wait', () => {
    const p = requestsPage(fresh(), viewer(U.tom))!
    expect(p.counts.buildings).toBe(1)
    expect(p.claims.waiting.map((c) => c.buildingName)).toEqual(['Ambrey House'])
    expect(p.counts.reservations).toBe(p.reservations.pending.length)
    expect(p.defaultTab).toBe(p.counts.reservations > 0 ? 'reservations' : 'buildings')
  })

  it('moves a confirmed building to the answered list', () => {
    const s0 = fresh()
    const claim = requestsPage(s0, viewer(U.tom))!.claims.waiting[0]
    const s = must(decideBuildingClaim(s0, actor(U.tom), claim.id, 'accepted', '')).state
    const p = requestsPage(s, viewer(U.tom))!
    expect(p.counts.buildings).toBe(0)
    expect(p.claims.answered.map((c) => [c.buildingName, c.statusLabel])).toEqual([['Ambrey House', 'Confirmed']])
  })

  it('is for owners only', () => {
    expect(requestsPage(fresh(), viewer(U.priya))).toBeNull()
    expect(requestsPage(fresh(), viewer(U.dana))).toBeNull()
  })
})

describe("the contractor's draft dates", () => {
  it('sends only what changed, and fills blanks from the programme month', () => {
    const r = addTestUser(fresh(), { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    const v = availabilityView(r.state, viewer(r.userId), TIVERNE_ID)!
    const draft = availabilityDraft(v.rows)
    expect(changedDates(v.rows, draft)).toEqual([])
    const th07 = itemByTag(r.state.world, 'TH-07').id
    const th02 = itemByTag(r.state.world, 'TH-02').id
    expect(changedDates(v.rows, { ...draft, [th07]: '2027-05' })).toEqual([{ itemId: th07, month: '2027-05' }])
    expect(changedDates(v.rows, { ...draft, [th07]: null })).toEqual([{ itemId: th07, month: null }])
    const filled = fillBlankMonths(v.rows, draft, v.defaultMonth)
    expect(filled[th02]).toBe(v.defaultMonth)
    expect(filled[th07]).toBe(draft[th07])
    expect(changedDates(v.rows, filled).length).toBe(v.rows.length - v.datedCount)
  })
})

describe('the testing results form', () => {
  it('offers inspected or tested and steel grades for the seeded coupon tests', () => {
    const s = fresh()
    const owner = testingResultsForm(s, viewer(U.tom), TIVERNE_TESTING_ID)!
    expect(owner.companyName).toBe('Brindmoor Testing')
    expect(owner.statuses.map((x) => x.value)).toEqual(['inspected', 'tested'])
    expect(owner.grades).toBe(true)
    expect(owner.items.map((i) => i.tag)).toEqual(['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'])
    expect(owner.items.every((i) => i.steel && !i.locked)).toBe(true)
    // TH-02 is shared, so the surveyor leaves its result to the owner.
    const dana = testingResultsForm(s, viewer(U.dana), TIVERNE_TESTING_ID)!
    expect(dana.locked).toBe(true)
    expect(dana.items.find((i) => i.tag === 'TH-02')!.locked).toBe(true)
    expect(testingResultsForm(s, viewer(U.priya), TIVERNE_TESTING_ID)).toBeNull()
    expect(testingResultsForm(s, viewer(U.tom), 'tst_none')).toBeNull()
  })
})

describe('the buildings list drawings', () => {
  it("draws only the viewer's own buildings", () => {
    const s = fresh()
    expect(Object.keys(buildingSketches(s, viewer(U.tom)))).toEqual([TIVERNE_ID])
    expect(Object.keys(buildingSketches(s, viewer(U.dana))).sort()).toEqual([AMBREY_ID, HARROWDEN_ID, TIVERNE_ID].sort())
    expect(buildingSketches(s, viewer(U.priya))).toEqual({})
  })
})
