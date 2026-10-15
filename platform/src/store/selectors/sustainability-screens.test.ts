// The figures and states the client and consultant screens draw: goal meters, the client home's tiles and timeline,
// the reservation and carbon bars, the requirement filters and the compliance figures. Merrowgate Wharf, fixture date.
import { describe, expect, it } from 'vitest'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import { FORBIDDEN } from '../../ui/testing'
import { setGoalTarget } from '../actions/sustainability'
import type { AppData } from '../types'
import { goalRows, requirementsView } from './sustainability'
import { reservationsView, approvalsView } from './client'
import { projectCarbon } from './project'
import { complianceView } from './consultant'
import {
  approvalsStrip,
  carbonBars,
  clientHomeView,
  complianceFigures,
  goalInputText,
  goalMeter,
  meterMax,
  ratingState,
  readyText,
  requirementFilters,
  reservationCarbonRows,
  reservationCostBars,
  scaleValueText,
} from './sustainability-screens'

const KILNWORTH_ID = 'prj_w7kq2m'

function rows(s: AppData = fresh()) {
  return goalRows(s, viewer(U.marcus), MERROWGATE_ID)!
}

function row(id: string, s?: AppData) {
  return rows(s).find((r) => r.id === id)!
}

function lotStrings(s: AppData): string[] {
  const out = new Set<string>()
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) out.add(x)
  }
  return [...out]
}

describe('a goal against its target', () => {
  it('reads a rating one level short as near, further as off target, and met as good', () => {
    expect(ratingState(4, 4)).toBe('good')
    expect(ratingState(3, 4)).toBe('warning')
    expect(ratingState(2, 4)).toBe('critical')
    expect(ratingState(null, 4)).toBe('neutral')
    expect(ratingState(3, null)).toBe('neutral')
  })

  it('puts the right end of a meter a little past the larger of target and result, or at twice the result with no target', () => {
    expect(meterMax(0.25, 0.199)).toBe(0.5)
    expect(meterMax(150, 47.8)).toBe(200)
    expect(meterMax(950, 820)).toBe(1000)
    expect(meterMax(null, 0.024)).toBe(0.1)
    expect(meterMax(null, null)).toBe(1)
  })

  it('shows content by value off target against the 25% override', () => {
    const m = goalMeter(row('content_by_value'))
    expect(m).toMatchObject({ target: 0.25, max: 0.5, state: 'critical', stateText: 'Off target', targetText: 'Aim at least 25%', valueText: '19.9%', axis: { start: '0%', end: '50%' } })
    expect(m.value).toBeCloseTo(0.1991, 4)
  })

  it('shows upfront carbon on target under its at-most benchmark, and avoided carbon in whole tonnes', () => {
    expect(goalMeter(row('upfront_carbon'))).toMatchObject({ value: 820, target: 950, state: 'good', targetText: 'Aim at most 950 kgCO2e per m2' })
    const c = goalMeter(row('avoided_carbon'))
    expect(c).toMatchObject({ target: 150, max: 200, state: 'critical', targetText: 'Aim at least 150 tCO2e', axis: { start: '0 tCO2e', end: '200 tCO2e' } })
    expect(scaleValueText({ id: 'avoided_carbon' }, 47.8)).toBe('47.8 tCO2e')
  })

  it('shows ratings by level: BREEAM Very good near Excellent, WELL Silver met, LEED not targeted', () => {
    expect(goalMeter(row('breeam'))).toMatchObject({ value: 3, max: 5, target: 4, state: 'warning', valueText: 'Very good', targetText: 'Aim Excellent', axis: { start: 'Pass', end: 'Outstanding' } })
    expect(goalMeter(row('well'))).toMatchObject({ value: 2, target: 2, state: 'good' })
    expect(goalMeter(row('leed'))).toMatchObject({ target: null, state: 'neutral', stateText: 'Not targeted', targetText: null })
  })

  it('moves with a new target', () => {
    const s = must(setGoalTarget(fresh(), actor(U.marcus), MERROWGATE_ID, 'content_by_value', 0.19, '')).state
    expect(goalMeter(row('content_by_value', s)).state).toBe('good')
  })

  it('writes a stored value back as a form reads it', () => {
    expect(goalInputText({ id: 'content_by_value' }, 0.25)).toBe('25')
    expect(goalInputText({ id: 'content_by_value' }, 0.205)).toBe('20.5')
    expect(goalInputText({ id: 'avoided_carbon' }, 150)).toBe('150')
    expect(goalInputText({ id: 'upfront_carbon' }, 950)).toBe('950')
    expect(goalInputText({ id: 'breeam' }, 'Excellent')).toBe('Excellent')
    expect(goalInputText({ id: 'breeam' }, null)).toBe('')
  })
})

describe('the client home', () => {
  it('gives each tile its state against the targets', () => {
    const v = clientHomeView(fresh(), viewer(U.isla))!
    expect(v.tiles.saving).toMatchObject({ state: 'good', stateLabel: 'Cheaper than new', valueText: '£179,265' })
    expect(v.tiles.carbon).toMatchObject({ state: 'critical', stateLabel: 'Off target' })
    expect(v.tiles.carbon.ring).toMatchObject({ max: 150, centre: '32%' })
    expect(v.tiles.carbon.bar).toMatchObject({ max: 200, target: 150 })
    expect(v.tiles.reuse).toMatchObject({ state: 'warning', stateLabel: 'Near target', aimText: '20%' })
    expect(v.tiles.reuse.ring?.centre).toBe('100%')
  })

  it('lays out the two projects on the timeline with their marker dates, and no axis dates', () => {
    const v = clientHomeView(fresh(), viewer(U.isla))!
    expect(v.timeline.rows.map((r) => r.id).sort()).toEqual([KILNWORTH_ID, MERROWGATE_ID].sort())
    const k = v.timeline.rows.find((r) => r.id === KILNWORTH_ID)!
    expect(k.siteStartDate).toMatch(/^\d{1,2} [A-Z][a-z]{2} 2027$/)
    expect(k.completionDate).toMatch(/2028$/)
    expect(v.timeline.ticks.every((t) => !/\d{4}-\d{2}/.test(t.iso))).toBe(true)
    expect(Object.keys(v.sketches).sort()).toEqual([KILNWORTH_ID, MERROWGATE_ID].sort())
  })

  it('counts reservations to request, with the seller and reserved, and the activity for the collapsed panel', () => {
    const v = clientHomeView(fresh(), viewer(U.isla))!
    expect(v.reservationCounts).toEqual({ pending: 1, reserved: 0, toRequest: 1 })
    expect(v.todoCounts).toEqual({ total: 4, overdue: 0 })
    expect(v.activitySummary.count).toBe(v.activity.length)
  })

  it('is for clients only and carries no seller-private string or forbidden character', () => {
    const s = fresh()
    expect(clientHomeView(s, viewer(U.priya))).toBeNull()
    expect(clientHomeView(s, viewer(U.marcus))).toBeNull()
    const json = JSON.stringify(clientHomeView(s, viewer(U.isla)))
    for (const x of lotStrings(s)) expect(json, x).not.toContain(x)
    expect(json).not.toMatch(FORBIDDEN)
  })
})

describe('approvals and reservations', () => {
  it('sums up the approvals strip in words', () => {
    const v = approvalsView(fresh(), viewer(U.isla), MERROWGATE_ID)!
    const strip = approvalsStrip(v)
    expect(strip.waiting).toEqual({ count: 1, sub: 'Indicative £11,926, saving £283 against new' })
    expect(strip.approved.count).toBe(2)
    expect(strip.avoidedIfApprovedT).toBeCloseTo(20.7, 1)
  })

  it('puts every package and its cost new on one scale with the same new as a tick', () => {
    const v = reservationsView(fresh(), viewer(U.isla), MERROWGATE_ID)!
    const c = reservationCostBars(v.summary)
    expect(c.bars.map((b) => b.label)).toEqual(['Reserved', 'With the seller', 'To request'])
    for (const b of c.bars) {
      expect(b.value).toBeLessThanOrEqual(c.max)
      expect(b.costNew).toBeLessThanOrEqual(c.max)
    }
    expect(c.bars[1]).toMatchObject({ valueText: '£41,391', sub: '1 material, saving £8,343' })
    expect(c.bars[0].sub).toBe('None')
    expect(c.ticks.map((t) => t.label)).toEqual(['£0', '£25,000', '£50,000'])
    expect(c.total).toMatchObject({ valueText: '£50,872', count: 2 })
    expect(reservationCarbonRows(v.summary).map((r) => r.carbonText)).toEqual(['0.0 tCO2e', '84.4 tCO2e', '16.4 tCO2e'])
  })
})

describe('carbon, certification, requirements and compliance', () => {
  it('scales each carbon chart to its own largest line and marks declined', () => {
    const b = carbonBars(projectCarbon(fresh(), viewer(U.priya), MERROWGATE_ID)!)
    expect(b.status.items.map((i) => i.key)).toEqual(['pending', 'sent', 'approved', 'declined'])
    expect(b.status.items.find((i) => i.key === 'declined')!.muted).toBe(true)
    expect(b.status.max).toBeGreaterThanOrEqual(Math.max(...b.status.items.map((i) => i.value)))
    expect(b.typology.items.map((i) => i.label)).toEqual(['Structure', 'Envelope', 'Finishes'])
  })

  it('says how many credits are ready', () => {
    expect(readyText(0, 0)).toBe('Nothing targeted')
    expect(readyText(1, 4)).toBe('1 of 4 ready')
  })

  it('filters the requirements by status, with counts', () => {
    const v = requirementsView(fresh(), viewer(U.isla), MERROWGATE_ID)!
    const f = Object.fromEntries(requirementFilters(v.rows).map((x) => [x.key, x.count]))
    expect(f).toEqual({ all: 10, at_risk: 1, open: 10, evidence_ready: 0, not_applicable: 0 })
  })

  it('reads content by value near the 20% aim on the compliance page', () => {
    const c = complianceFigures(complianceView(fresh(), viewer(U.marcus), MERROWGATE_ID)!)
    expect(c.content).toMatchObject({ state: 'warning', stateText: 'Near target', targetText: 'Aim at least 20%', valueText: '19.91%', withApprovedText: '20.29%' })
    expect(c.contribution.items.length).toBeGreaterThan(0)
    for (const it of c.contribution.items) expect(it.value).toBeLessThanOrEqual(c.contribution.max)
  })
})
