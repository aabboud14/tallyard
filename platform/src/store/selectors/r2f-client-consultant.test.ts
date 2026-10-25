// Round 2 follow-up (audit of 16 October 2026, package client_consultant): the developer's tracking table, the
// consultant home against the Goals and targets tab, and the consultant's own project pages.
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import { FINANCE_CAVEAT, RESERVATIONS_FINANCE_CAVEAT } from '../../domain/reference/sustainabilityCopy'
import { approvalsView, reservationsView } from './client'
import { KILNWORTH_ID } from '../../sandbox/seed-portfolio'
import { goalDef } from '../../domain/reference/goals'
import { goalState, ratingState } from '../../domain/engines/goals'
import { sendStatementForReview, setGoalTarget } from '../actions/sustainability'
import { consultantDashboard } from './home-consultant'
import { goalMeter, reservationCostBars, savingWholeText } from './sustainability-screens'
import * as sel from '.'

const M = MERROWGATE_ID
const K = KILNWORTH_ID

describe('one judgement of a goal against its target (note 36)', () => {
  it('rates a level one short as near, further as off, and figures by metricState', () => {
    const breeam = goalDef('breeam')
    expect(goalState(breeam, 'Excellent', 'Very good')).toBe('warning')
    expect(goalState(breeam, 'Excellent', 'Good')).toBe('critical')
    expect(goalState(breeam, 'Excellent', 'Outstanding')).toBe('good')
    expect(goalState(breeam, null, 'Good')).toBe('neutral')
    expect(goalState(goalDef('content_by_value'), 0.25, 0.1991)).toBe('critical')
    expect(goalState(goalDef('upfront_carbon'), 950, 820)).toBe('good')
    expect(goalState(goalDef('upfront_carbon'), 950, 1000)).toBe('warning')
    expect(ratingState(3, 4)).toBe('warning')
  })

  it("marks Merrowgate's BREEAM near target and WELL on target on the developer's tracking, as on the Sustainability tab", () => {
    const s = fresh()
    const row = sel.sustainabilityTracking(s, viewer(U.isla), M)!
    expect(row.schemes.breeam.state).toEqual({ state: 'warning', label: 'Near target' })
    expect(row.schemes.well.state).toEqual({ state: 'good', label: 'On target' })
    expect(row.schemes.leed.state).toBeNull()
    const tab = sel.sustainabilityView(s, viewer(U.isla), M)!
    expect(goalMeter(tab.goals.find((g) => g.id === 'breeam')!).stateText).toBe(row.schemes.breeam.state!.label)
    expect(goalMeter(tab.goals.find((g) => g.id === 'well')!).stateText).toBe(row.schemes.well.state!.label)
  })

  it('shows Kilnworth Place, with no consultant, the targets that apply in every scheme column', () => {
    const row = sel.sustainabilityTracking(fresh(), viewer(U.isla), K)!
    expect(row.consultantName).toBeNull()
    for (const id of ['breeam', 'leed', 'well'] as const) expect(row.schemes[id]).toMatchObject({ targetText: 'Not targeted', state: null })
  })

  it("ends the client's targets note with one full stop", () => {
    const s = fresh()
    expect(sel.sustainabilityView(s, viewer(U.isla), M)!.targetsNote).toBe('Targets are set by Halewick Sustainability.')
    expect(sel.sustainabilityView(s, viewer(U.isla), K)!.targetsNote).not.toMatch(/\.\.$/)
  })
})

describe('the consultant home reads the goal rows (note 43)', () => {
  it('names each meter as Goals and targets does and measures carbon on secured materials', () => {
    const d = consultantDashboard(fresh(), viewer(U.marcus))!
    const merrow = d.rows.find((r) => r.id === M)!
    expect(merrow.content.label).toBe(goalDef('content_by_value').label)
    expect(merrow.content.label).toBe('Reused and recycled content by value')
    expect(merrow.carbon.label).toBe(goalDef('avoided_carbon').label)
    expect(merrow.carbon.actualText).toBe('47.8 tCO2e')
    expect(d.metrics.carbonValueText).toBe('47.8')
    expect(d.metrics.carbonApprovedT).toBeCloseTo(100.8227, 3)
  })

  it('follows an override of avoided carbon to 80 tCO2e with the same status as the Goals and targets tab', () => {
    const s = must(setGoalTarget(fresh(), actor(U.marcus), M, 'avoided_carbon', 80, '')).state
    const d = consultantDashboard(s, viewer(U.marcus))!
    const merrow = d.rows.find((r) => r.id === M)!
    const goal = sel.goalRows(s, viewer(U.marcus), M)!.find((g) => g.id === 'avoided_carbon')!
    expect(goal.progress.status).toBe('below')
    expect(merrow.carbon.status).toBe(goal.progress.status)
    expect(merrow.carbon.meter.state).toBe(goalMeter(goal).state)
    expect(merrow.carbon.aimText).toBe('Aim at least 80 tCO2e')
    expect(d.metrics.carbonState).toEqual({ state: 'critical', label: 'Off target' })
  })

  it('follows an override of reused and recycled content to 10% and reads it met, as the tab does', () => {
    const s = must(setGoalTarget(fresh(), actor(U.marcus), M, 'content_by_value', 0.1, '')).state
    const merrow = consultantDashboard(s, viewer(U.marcus))!.rows.find((r) => r.id === M)!
    const goal = sel.goalRows(s, viewer(U.marcus), M)!.find((g) => g.id === 'content_by_value')!
    expect(merrow.content.status).toBe('met')
    expect(goal.progress.status).toBe('met')
    expect(merrow.content.aimText).toBe('Aim at least 10%')
  })

  it('counts every goal with a target in Targets met, judged as each goal row', () => {
    const d = consultantDashboard(fresh(), viewer(U.marcus))!
    // Merrowgate: upfront carbon and WELL met; content and carbon off target; BREEAM near; diversion waits for a result.
    expect(d.metrics.targetsMet).toBe(2)
    expect(d.metrics.targetsNear).toBe(1)
    expect(d.metrics.targetsOff).toBe(2)
  })
})

describe('the statement the client reviews is the one that was sent (note 44)', () => {
  it('shows the client the frozen version, dated when it was sent', () => {
    const s = fresh()
    const isla = sel.statementView(s, viewer(U.isla), M)!
    const marcus = sel.statementView(s, viewer(U.marcus), M)!
    expect(isla.sections.map((x) => x.text)).toEqual(marcus.sections.map((x) => x.text))
    expect(isla.subtitle).toBe('Prepared by Halewick Sustainability for Lantern Quay Developments, 7 October 2026')
    expect(marcus.subtitle).toBe('Prepared by Halewick Sustainability for Lantern Quay Developments, 8 October 2026')
    expect(isla.changedSinceSent).toBeNull()
    expect(marcus).toMatchObject({ changedSinceSent: null, canSend: false, sendLabel: 'Sent for review' })
  })

  it('keeps the sent text when a target changes, tells both sides, and lets the consultant send the update', () => {
    const changed = must(setGoalTarget(fresh(), actor(U.marcus), M, 'content_by_value', 0.3, '')).state
    const isla = sel.statementView(changed, viewer(U.isla), M)!
    const content = isla.sections.find((x) => x.id === 'content')!.text
    expect(content).toContain('this project targets at least 25%')
    expect(content).not.toContain('30%')
    // Round 2 follow-up review: long dates as in the subtitle, and words that also fit an edit of the text.
    expect(isla.changedSinceSent).toBe('This is the version sent on 7 October 2026. Halewick Sustainability has updated the statement since, so ask them for the latest if you need it.')
    expect(isla.status).toBe('ready_for_review')
    const marcus = sel.statementView(changed, viewer(U.marcus), M)!
    expect(marcus.sections.find((x) => x.id === 'content')!.text).toContain('this project targets at least 30%')
    expect(marcus).toMatchObject({ canSend: true, sendLabel: 'Send the updated statement' })
    // Round 2 follow-up review: the callout's title already says it changed, so the body does not repeat it.
    expect(marcus.changedSinceSent).toBe('Sent on 7 October 2026. Send the updated statement so Lantern Quay Developments reviews the latest version.')
    expect(sel.sustainabilityView(changed, viewer(U.marcus), M)!.statement!.changedSinceSent).toBe(true)
    expect(sel.sustainabilityView(changed, viewer(U.isla), M)!.statement!.changedSinceSent).toBe(false)

    const resent = must(sendStatementForReview(changed, actor(U.marcus, '2026-10-08T11:00:00.000Z'), M)).state
    const after = sel.statementView(resent, viewer(U.isla), M)!
    expect(after.sections.find((x) => x.id === 'content')!.text).toContain('this project targets at least 30%')
    expect(after.changedSinceSent).toBeNull()
    expect(after.subtitle).toMatch(/8 October 2026$/)
    expect(resent.notifications[0]).toMatchObject({ title: 'Updated circular economy statement ready for review', orgId: ORG_IDS.lantern })
    // Nothing has changed since: sending again does nothing.
    expect(sendStatementForReview(resent, actor(U.marcus), M).state).toBe(resent)
  })

  it('reads a statement never sent as a draft to the consultant and not sent yet to the client', () => {
    const s = fresh()
    expect(sel.sustainabilityTracking(s, viewer(U.isla), K)!.circular.statementLabel).toBe('Not sent yet')
    const sallow = sel.sustainabilityView(s, viewer(U.marcus), SALLOW_ID)!
    expect(sallow.statement!.label).toBe('Draft')
    expect(sallow.schemes.find((x) => x.scheme === 'circular')!.circular!.statement).toBeNull()
  })
})

describe('the statement reads as a statement from the project records (note 44)', () => {
  it("leaves out the statement's own measure, names WELL X01 at risk, and asks for a WELL target where WELL is required", () => {
    const s = fresh()
    const merrow = sel.statementView(s, viewer(U.marcus), M)!
    const cert = merrow.sections.find((x) => x.id === 'certification')!.text
    expect(cert).not.toContain('Statement')
    expect(cert).toContain('WELL: 3 credits targeted, 1 in progress, 1 at risk and 1 not started. At risk: X01, material restrictions (precondition).')
    const steps = merrow.sections.find((x) => x.id === 'next_steps')!.text
    // Round 2 follow-up review: UB 533x210x92 already has a reservation request with the seller.
    expect(steps).toContain('Request a reservation for 1 approved material; 1 more is with the seller.')
    expect(steps).not.toContain('Reserve the 2 approved materials')
    expect(steps).toContain('Resolve WELL X01, material restrictions (precondition), which is at risk.')
    const ferry = sel.statementView(s, viewer(U.marcus), FERRYMOOR_ID)!
    expect(ferry.sections.find((x) => x.id === 'next_steps')!.text).toContain('Set a target for WELL certification, as WELL Building Standard is recorded as a requirement.')
    expect(ferry.sections.find((x) => x.id === 'carbon')!.text).not.toContain('0.0 tCO2e')
  })
})

describe('reservations and approvals money (note 40 polish)', () => {
  it('gives the Reservations cost card its own caveat and whole pounds on its total', () => {
    const s = fresh()
    const r = reservationsView(s, viewer(U.isla), M)!
    expect(r.caveat).toBe(RESERVATIONS_FINANCE_CAVEAT)
    expect(r.caveat).not.toContain('Earlier deals count at the agreed material price')
    expect(approvalsView(s, viewer(U.isla), M)!.caveat).toBe(FINANCE_CAVEAT)
    expect(reservationCostBars(r.summary).total.savingText).toBe('Saving £8,525 (14.4%)')
    expect(savingWholeText(-200.4, -0.2)).toBe('Costs £200 more than new (20.0%)')
    expect(savingWholeText(8343.41)).toBe('Saving £8,343')
  })
})
