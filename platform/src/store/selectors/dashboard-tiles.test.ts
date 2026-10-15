// The tile states and the figures the round 2 dashboards added for their screens: each tile's state against its
// target, the owner's combined awaiting count, the surveyor's drawings of buildings not yet linked and the
// consultant's target meters.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { niceMax } from '../../domain/engines/chartScale'
import { awaitingState, fitState, NO_RESULT_TEXT, programmeState, targetsMetState, targetState, targetStatusText, waitingState } from './dashboard'
import { architectHome } from './architect'
import { ownerDashboard } from './home-owner'
import { surveyorDashboard } from './home-surveyor'
import { consultantDashboard } from './home-consultant'

describe('tile states', () => {
  it('reads the fit of materials: late wins, then tight, then all in time; nothing gives no state', () => {
    expect(fitState({ now: 1, in_time: 2, tight: 1, late: 1 })).toEqual({ state: 'critical', label: '1 arriving late' })
    expect(fitState({ now: 1, in_time: 2, tight: 3, late: 0 })).toEqual({ state: 'warning', label: '3 tight for time' })
    expect(fitState({ now: 1, in_time: 0, tight: 0, late: 0 })).toEqual({ state: 'good', label: 'All in time' })
    expect(fitState({ now: 0, in_time: 0, tight: 0, late: 0 })).toBeNull()
  })

  it('warns only when something has waited a week or more', () => {
    expect(waitingState(2, 7)).toEqual({ state: 'warning', label: 'Over a week' })
    expect(waitingState(2, 6)).toBeNull()
    expect(waitingState(0, null)).toBeNull()
  })

  it('reads the programme: any project behind is a warning, otherwise on programme', () => {
    expect(programmeState(['on', 'ahead'])).toEqual({ state: 'good', label: 'On programme' })
    expect(programmeState(['on', 'behind'])).toEqual({ state: 'warning', label: '1 project behind programme' })
    expect(programmeState(['behind', 'behind'])).toEqual({ state: 'warning', label: '2 projects behind programme' })
    expect(programmeState(['not_started'])).toBeNull()
    expect(programmeState([])).toBeNull()
  })

  it('reads a figure against a target in the words of metricState, and nothing without a target', () => {
    expect(targetState(150, 150)).toEqual({ state: 'good', label: 'On target' })
    expect(targetState(140, 150)).toEqual({ state: 'warning', label: 'Near target' })
    expect(targetState(100, 150)).toEqual({ state: 'critical', label: 'Off target' })
    expect(targetState(100, 0)).toBeNull()
  })

  it('counts targets on, near and off target and waiting for a figure, in the words of metricState', () => {
    expect(targetsMetState({ good: 2, warning: 0, critical: 0, set: 2 })).toEqual({ state: 'good', label: 'All on target' })
    expect(targetsMetState({ good: 0, warning: 2, critical: 0, set: 4 })).toEqual({ state: 'warning', label: '2 near target' })
    expect(targetsMetState({ good: 0, warning: 1, critical: 2, set: 4 })).toEqual({ state: 'critical', label: '2 off target' })
    expect(targetsMetState({ good: 1, warning: 0, critical: 0, set: 3 })).toEqual({ state: 'neutral', label: '2 with no result yet' })
    expect(targetsMetState({ good: 0, warning: 0, critical: 0, set: 0 })).toBeNull()
  })

  it('words one target the way its meter does, with one phrase for no figure yet', () => {
    expect(targetStatusText(0.25, 0.25)).toBe('On target')
    expect(targetStatusText(0.23, 0.25)).toBe('Near target')
    expect(targetStatusText(0.199, 0.25)).toBe('Off target')
    expect(targetStatusText(null, 0.25)).toBe(NO_RESULT_TEXT)
    expect(NO_RESULT_TEXT).toBe('No result yet')
    expect(targetStatusText(null, 0)).toBe('No target set')
    expect(targetStatusText(4, 0)).toBe('No target set')
  })

  it('asks for a decision while anything waits', () => {
    expect(awaitingState(2)).toEqual({ state: 'warning', label: 'Needs a decision' })
    expect(awaitingState(0)).toBeNull()
  })
})

describe('architect home tiles', () => {
  it('gives each tile its state from the seed', () => {
    const h = architectHome(fresh(), viewer(U.priya))!
    expect(h.metrics.programme).toEqual({ behind: 0, state: { state: 'good', label: 'On programme' } })
    const sum = h.projects.reduce((n, p) => n + p.fits.now + p.fits.in_time + p.fits.tight + p.fits.late, 0)
    const t = h.metrics.timing.fits
    expect(t.now + t.in_time + t.tight + t.late).toBe(sum)
    expect(h.metrics.timing.state).toEqual({ state: 'good', label: 'All in time' })
    expect(h.metrics.waiting.state).toEqual({ state: 'warning', label: 'Over a week' })
    // Only Merrowgate Wharf carries a carbon target (150 tCO2e); its approved 100.8 tCO2e is off target.
    expect(h.metrics.carbon.targetT).toBe(150)
    expect(h.metrics.carbon.state).toEqual({ state: 'critical', label: 'Off target' })
    expect(h.carbonAxisMax).toBe(niceMax(h.carbonScaleMax))
    expect(h.carbonAxisMax).toBeGreaterThanOrEqual(h.carbonScaleMax)
  })
})

describe('owner dashboard tiles', () => {
  it('adds the building confirmations to the requests waiting, and counts private items', () => {
    const d = ownerDashboard(fresh(), viewer(U.tom))!
    expect(d.metrics.awaiting).toBe(d.stats.requestsAwaiting + d.stats.claimsAwaiting)
    expect(d.metrics.awaiting).toBe(2)
    expect(d.metrics.requestState).toEqual({ state: 'warning', label: 'Needs a decision' })
    expect(d.metrics.privateCount).toBe(d.buildingCards.reduce((n, c) => n + c.counts.private, 0))
    expect(d.metrics.privateCount + d.stats.listed + d.stats.shared + d.stats.reserved).toBe(d.stats.itemsSurveyed)
  })
})

describe('surveyor dashboard tiles', () => {
  it('draws the buildings not yet linked apart from the appointments, and reads the open surveys', () => {
    const d = surveyorDashboard(fresh(), viewer(U.dana))!
    expect(Object.keys(d.unlinkedExtras)).toEqual(d.unlinked.map((b) => b.id))
    for (const b of d.unlinked) expect(d.unlinkedExtras[b.id].sketch.state).toBe('existing')
    expect(d.metrics.open).toBe(1)
    expect(d.metrics.openState).toEqual({ state: 'warning', label: 'In progress' })
  })
})

describe('consultant dashboard tiles', () => {
  it('scales each target meter to a round figure above the target, with the state and the aim in words', () => {
    const d = consultantDashboard(fresh(), viewer(U.marcus))!
    const merrow = d.rows.find((r) => r.id === MERROWGATE_ID)!
    expect(merrow.content.meter.target).toBe(0.25)
    expect(merrow.content.meter.max).toBe(0.5)
    expect(merrow.content.meter.state).toBe('critical')
    expect(merrow.content.aimText).toBe('Aim at least 25%')
    expect(merrow.carbon.meter).toMatchObject({ target: 150, max: 200, state: 'critical' })
    expect(merrow.carbon.aimText).toBe('Aim at least 150 tCO2e')
    const sallow = d.rows.find((r) => r.id === SALLOW_ID)!
    // No bill yet: no state, not off target. No carbon target: no tick.
    expect(sallow.content.meter.state).toBe('neutral')
    expect(sallow.carbon.meter.target).toBeNull()
    expect(sallow.carbon.aimText).toBeNull()
    expect(d.metrics.targetsBelow).toBe(2)
    expect(d.metrics.targetsWaiting).toBe(2)
    expect(d.metrics.targetsMet + d.metrics.targetsBelow + d.metrics.targetsWaiting).toBe(d.metrics.targetsSet)
    // Both Merrowgate targets are more than 10% short, so they read off target on the tile as on the meters.
    expect([d.metrics.targetsNear, d.metrics.targetsOff]).toEqual([0, 2])
    expect(d.metrics.targetsState).toEqual({ state: 'critical', label: '2 off target' })
    expect(merrow.content.statusText).toBe('Off target')
    expect(merrow.carbon.statusText).toBe('Off target')
    expect(sallow.content.statusText).toBe('No result yet')
    expect(sallow.carbon.statusText).toBe('No target set')
    expect(d.metrics.targetsSetText).toBe('3 with a content target, 1 with a carbon target')
    expect(d.metrics.carbonState).toEqual({ state: 'critical', label: 'Off target' })
  })
})
