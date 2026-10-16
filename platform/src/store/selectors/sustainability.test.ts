import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { FERRYMOOR_ID, MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { KILNWORTH_ID } from '../../sandbox/seed-portfolio'
import { setGoalTarget, setCreditItem, editStatementSection } from '../actions/sustainability'
import { decideItem } from '../actions/shortlist'
import * as sel from '.'

const M = MERROWGATE_ID

describe('goals and targets on Merrowgate Wharf', () => {
  it("Marcus's goal rows: overrides, defaults, results and progress", () => {
    const rows = sel.goalRows(fresh(), viewer(U.marcus), M)!
    const row = (id: string) => rows.find((r) => r.id === id)!
    expect(row('content_by_value')).toMatchObject({ targetText: '25%', source: 'override', actualText: '19.9%', statusText: 'Below target', tone: 'warning', canEdit: true, canEnterActual: false, defaultText: '20% from Circular Economy Statements guidance', overriddenText: 'Set by Marcus Lindqvist on 29 Aug 2026', overrideNote: 'Set at inception with the client.' })
    expect(row('content_by_value').progress.status).toBe('below')
    closeTo(row('content_by_value').share, 0.7964, 4)
    expect(row('avoided_carbon')).toMatchObject({ targetText: '150.0 tCO2e', actualText: '47.8 tCO2e', actualNote: 'Secured, worked out by Tallyard', indicative: true })
    closeTo(row('avoided_carbon').share, 0.3186, 4)
    expect(row('upfront_carbon')).toMatchObject({ target: 950, source: 'default', actual: 820, statusText: 'Target met', defaultStatus: 'indicative', actualNote: '20 Sep 2026, Stage 2 life cycle assessment', canEnterActual: true })
    expect(row('upfront_carbon').progress).toEqual({ status: 'met', share: 1 })
    expect(row('breeam')).toMatchObject({ target: 'Excellent', actual: 'Very good', statusText: 'Below target' })
    expect(row('leed')).toMatchObject({ target: null, targetText: 'Not targeted', statusText: 'Not targeted on this project' })
    expect(row('reuse_by_value')).toMatchObject({ source: 'none', targetText: 'No target set', defaultText: 'No default' })
    closeTo(row('reuse_by_value').actual as number, 0.0236118, 7)
  })

  it('only the consultant edits; the architect and the client read; anyone else gets nothing', () => {
    const s = fresh()
    expect(sel.goalRows(s, viewer(U.isla), M)!.every((r) => !r.canEdit && !r.canEnterActual)).toBe(true)
    expect(sel.goalRows(s, viewer(U.priya), M)!.every((r) => !r.canEdit)).toBe(true)
    expect(sel.goalRows(s, viewer(U.tom), M)).toBeNull()
    expect(sel.goalsView(s, viewer(U.isla), M)).toBeNull()
    const g = sel.goalsView(s, viewer(U.marcus), M)!
    expect(g.rows).toHaveLength(8)
    expect(g.requirements.map((r) => r.id)).toContain('gla-ces')
  })

  it('effectiveTargets is the one source of targets', () => {
    const s = fresh()
    expect(sel.effectiveTargets(s, M)).toEqual({ contentByValue: 0.25, avoidedCarbonT: 150 })
    // Sallow Court has the statement guidance, so the 20% default applies; no carbon target.
    expect(sel.effectiveTargets(s, SALLOW_ID)).toEqual({ contentByValue: 0.2, avoidedCarbonT: 0 })
    expect(sel.effectiveTargets(s, 'prj_nothere')).toEqual({ contentByValue: 0, avoidedCarbonT: 0 })
    const off = must(setGoalTarget(s, actor(U.marcus), M, 'content_by_value', null, '')).state
    expect(sel.effectiveTargets(off, M).contentByValue).toBe(0)
    expect(sel.complianceView(off, viewer(U.marcus), M)!.targets).toEqual({ contentByValue: 0, avoidedCarbonT: 150 })
  })
})

describe('certification', () => {
  it('BREEAM lists five credits with four targeted; WELL X01 suggests at risk with TH-02 mapped', () => {
    const s = fresh()
    const b = sel.certificationView(s, viewer(U.marcus), M, 'breeam')!
    expect(b.credits).toHaveLength(5)
    expect(b.credits.filter((c) => c.targeted)).toHaveLength(4)
    expect(b.empty).toBe(false)
    const w = sel.certificationView(s, viewer(U.marcus), M, 'well')!
    const x01 = w.credits.find((c) => c.id === 'well-x01')!
    expect(x01.suggested).toEqual({ status: 'at_risk', label: 'At risk', reason: '1 item to screen: built before 1970 or untested' })
    expect(x01.items.filter((i) => i.included).map((i) => i.publicId)).toEqual(['L-WPX5A6'])
    expect(w.matrix.credits.map((c) => c.id)).toEqual(['well-x01', 'well-x02', 'well-x07'])
    expect(w.matrix.included['well-x01:L-WPX5A6']).toBe(true)
    expect(w.matrix.included['well-x01:L-NHZ32R']).toBe(false)
  })

  it('an override changes the mapping, and the summaries count targeted credits', () => {
    let s = fresh()
    s = must(setCreditItem(s, actor(U.marcus), M, 'well-x07', 'L-NHZ32R', false)).state
    const w = sel.certificationView(s, viewer(U.marcus), M, 'well')!
    expect(w.credits.find((c) => c.id === 'well-x07')!.items.find((i) => i.publicId === 'L-NHZ32R')).toMatchObject({ included: false, byDefault: true })
    const sum = sel.certificationSummary(s, viewer(U.isla), M)!
    expect(sum.map((x) => [x.scheme, x.ratingTarget, x.ratingPredicted, x.targeted, x.atRisk])).toEqual([
      ['breeam', 'Excellent', 'Very good', 4, 0],
      ['leed', 'Not targeted', null, 0, 0],
      ['well', 'Silver', 'Silver', 3, 1],
      ['circular', null, null, 4, 0],
    ])
    expect(sel.certificationView(s, viewer(U.isla), M, 'well')).toBeNull()
    expect(sel.certificationSummary(s, viewer(U.tom), M)).toBeNull()
  })
})

describe('the circular economy statement', () => {
  it('Isla can review and not edit; Priya gets nothing', () => {
    const s = fresh()
    const isla = sel.statementView(s, viewer(U.isla), M)!
    expect(isla).toMatchObject({ canReview: true, canEdit: false, canSend: false, statusLabel: 'Ready for your review' })
    expect(isla.sections).toHaveLength(8)
    expect(sel.statementView(s, viewer(U.priya), M)).toBeNull()
  })

  it("Marcus's view: the seeded approach edit, not stale, and the file name", () => {
    const s = fresh()
    const v = sel.statementView(s, viewer(U.marcus), M)!
    expect(v.sections.map((x) => x.id)).toEqual(['context', 'approach', 'reuse', 'content', 'carbon', 'targets', 'certification', 'next_steps'])
    const approach = v.sections.find((x) => x.id === 'approach')!
    expect(approach).toMatchObject({ edited: true, stale: false })
    expect(approach.text).toMatch(/^Lantern Quay Developments has asked the design team/)
    const content = v.sections.find((x) => x.id === 'content')!.text
    for (const p of ['19.91%', '20.29%', '17.62%', '25%']) expect(content).toContain(p)
    const carbon = v.sections.find((x) => x.id === 'carbon')!.text
    expect(carbon).toContain('47.8 tCO2e')
    expect(carbon).toContain('148.6 tCO2e')
    // Round 2 follow-up (audit note 44): the materials are grouped by status and family, without listing codes.
    expect(v.sections.find((x) => x.id === 'reuse')!.text.split('\n')[1]).toBe('Secured through earlier deals or accepted reservations:')
    expect(v.sections.find((x) => x.id === 'reuse')!.text).not.toContain('L-R8Q33F')
    expect(v).toMatchObject({ status: 'ready_for_review', statusLabel: 'With the client for review', canSend: false, fileName: 'merrowgate-wharf-circular-economy-statement-2026-10-08.docx', title: 'Merrowgate Wharf: circular economy statement', subtitle: 'Prepared by Halewick Sustainability for Lantern Quay Developments, 8 October 2026' })
    expect(v.sentText).toBe('Sent to Lantern Quay Developments on 7 Oct 2026')
    expect(v.plainText.startsWith('Merrowgate Wharf: circular economy statement\n')).toBe(true)
    expect(v.docx.sections).toHaveLength(8)
  })

  it('an edited section goes stale when the figures move on', () => {
    let s = fresh()
    const carbon = sel.statementView(s, viewer(U.marcus), M)!.sections.find((x) => x.id === 'carbon')!
    s = must(editStatementSection(s, actor(U.marcus), M, 'carbon', 'Our words.', carbon.generated)).state
    expect(sel.statementView(s, viewer(U.marcus), M)!.sections.find((x) => x.id === 'carbon')!.stale).toBe(false)
    s = must(decideItem(s, actor(U.isla), M, 'wli_hp23zk_3', 'approved', '')).state
    const after = sel.statementView(s, viewer(U.marcus), M)!.sections.find((x) => x.id === 'carbon')!
    expect(after).toMatchObject({ edited: true, stale: true, text: 'Our words.' })
    // A draft stays with the consultant.
    expect(sel.statementView(s, viewer(U.isla), M)!.sections).toEqual([])
  })
})

describe('requirements', () => {
  it('Priya reads; Isla and Marcus edit; links lead where each side can go', () => {
    const s = fresh()
    const priya = sel.requirementsView(s, viewer(U.priya), M)!
    expect(priya.canEdit).toBe(false)
    expect(priya.outputs).toEqual([])
    const isla = sel.requirementsView(s, viewer(U.isla), M)!
    expect(isla.canEdit).toBe(true)
    expect(isla.summary).toMatchObject({ total: 10, atRisk: 1, inProgress: 2, ready: 0 })
    const si7 = isla.rows.find((r) => r.id === 'lp-si7')!
    expect(si7).toMatchObject({ scopeLabel: 'London-wide', status: 'in_progress', statusLabel: 'In progress' })
    expect(si7.evidence.map((e) => [e.by, e.outputLabel, e.outputHref, e.canRemove])).toEqual([
      ['Marcus Lindqvist', null, null, false],
      ['Marcus Lindqvist', 'Circular economy statement', `/app/projects/${M}/sustainability#statement`, false],
    ])
    expect(si7.heldInTallyard).toEqual([
      { label: 'Construction and demolition waste diverted from landfill', value: 'No result yet of 95%', href: `/app/projects/${M}/sustainability` },
      { label: 'Circular economy statement', value: 'Ready for your review', href: `/app/projects/${M}/sustainability#statement` },
    ])
    expect(isla.rows.find((r) => r.id === 'la-newham')!.scopeLabel).toBe('Newham')
    const marcus = sel.requirementsView(s, viewer(U.marcus), M)!
    expect(marcus.rows.find((r) => r.id === 'lp-si7')!.evidence.map((e) => [e.outputHref, e.canRemove])).toEqual([
      [null, true],
      [`/app/projects/${M}/statement`, true],
    ])
    expect(sel.requirementsView(s, viewer(U.tom), M)).toBeNull()
  })
})

describe('the Sustainability tab', () => {
  it('for Priya: no money, no statement card, links for the consultant only', () => {
    const s = fresh()
    const v = sel.sustainabilityView(s, viewer(U.priya), M)!
    expect(JSON.stringify(v)).not.toContain('£')
    expect(v.statement).toBeNull()
    expect(v.links).toEqual({ targets: null, certification: null, statement: null, requirements: `/app/projects/${M}/requirements` })
    expect(v.requirements).toMatchObject({ atRisk: 1, total: 10 })
    expect(v.requirements.atRiskItems.map((x) => x.id)).toEqual(['breeam-nc'])
    closeTo(v.metrics.avoidedSecuredT, 47.7974, 4)
    expect(v.goals.map((g) => g.id)).toEqual(['content_by_value', 'reuse_by_value', 'avoided_carbon', 'upfront_carbon', 'cd_diversion', 'breeam', 'well'])
    expect(v.carbon.header.id).toBe(M)
  })

  it('for Isla, the statement card to review; for Marcus, his links', () => {
    const s = fresh()
    expect(sel.sustainabilityView(s, viewer(U.isla), M)!.statement).toMatchObject({ status: 'ready_for_review', label: 'Ready for your review', canReview: true, href: `/app/projects/${M}/sustainability#statement` })
    const m = sel.sustainabilityView(s, viewer(U.marcus), M)!
    expect(m.statement).toMatchObject({ canReview: false, href: `/app/projects/${M}/statement` })
    expect(m.links.targets).toBe(`/app/projects/${M}/targets`)
  })

  it('Kilnworth Place has no consultant: defaults still show', () => {
    const s = fresh()
    const k = sel.sustainabilityView(s, viewer(U.isla), KILNWORTH_ID)!
    expect(k.targetsNote).toBe('No consultant appointed yet. Defaults from the requirements are shown.')
    expect(k.goals.find((g) => g.id === 'upfront_carbon')).toMatchObject({ target: 850, source: 'default' })
    const t = sel.sustainabilityTracking(s, viewer(U.isla), KILNWORTH_ID)!
    expect(t.consultantName).toBeNull()
    expect(t.schemes.breeam.targetText).toBe('Not targeted')
    expect(sel.sustainabilityTracking(s, viewer(U.priya), M)).toBeNull()
    expect(sel.sustainabilityTracking(s, viewer(U.marcus), FERRYMOOR_ID)!.consultantName).toBe('Halewick Sustainability')
  })
})

describe('approvals and reservations carry costs and carbon for the client', () => {
  it('approvals: the cost panel, the strip of totals and the caveat', () => {
    const a = sel.approvalsView(fresh(), viewer(U.isla), M)!
    expect(a.waiting.map((r) => r.cost.savingText)).toEqual(['Saving £283.18 (2.3%)'])
    expect(a.finance.waiting).toMatchObject({ count: 1, total: 11926.22, costNew: 12209.4, saving: 283.18 })
    expect(a.finance.approved).toMatchObject({ count: 2, total: 50871.69, costNew: 59396.4, saving: 8524.71 })
    closeTo(a.finance.waiting.avoidedT, 20.7249, 4)
    expect(a.caveat).toMatch(/^Indicative\./)
  })

  it('reservations: cost and carbon by group, secured carbon against the target', () => {
    const r = sel.reservationsView(fresh(), viewer(U.isla), M)!
    expect(r.summary.cost.requested).toMatchObject({ count: 1, total: 41390.59, costNew: 49734 })
    expect(r.summary.cost.to_request).toMatchObject({ count: 1, total: 9481.1, costNew: 9662.4 })
    expect(r.summary.cost.reserved.count).toBe(0)
    expect(r.summary.total).toMatchObject({ count: 2, total: 50871.69 })
    closeTo(r.summary.securedProjectT, 47.7974, 4)
    expect(r.summary.carbonGoal).toMatchObject({ id: 'avoided_carbon', target: 150 })
    expect(r.rows.map((x) => x.carbon.percentText)).toEqual(['96.8% less than new', '96.8% less than new'])
  })
})

describe('tabs, routes and where lines lead', () => {
  it('each side gets its tabs; the consultant alone gets targets, certification and the statement', () => {
    const s = fresh()
    const tabs = (u: string) => sel.projectHeader(s, viewer(u), M)!.tabs.map((t) => [t.label, t.badge])
    expect(tabs(U.priya)).toEqual([['Overview', null], ['Shortlist', null], ['Specification', null], ['Sustainability', null], ['Requirements', null], ['Team', null], ['Activity', null], ['Matching', null]])
    expect(tabs(U.isla)).toEqual([['Overview', null], ['Approvals', 1], ['Reservations', null], ['Specification', null], ['Sustainability', 1], ['Requirements', 1], ['Team', null], ['Activity', null]])
    expect(tabs(U.marcus)).toEqual([['Overview', null], ['Sustainability', null], ['Goals and targets', null], ['Certification', null], ['Requirements', 1], ['Circular economy', null], ['Compliance', null], ['Team', null], ['Activity', null]])
    expect(sel.projectOverview(s, viewer(U.marcus), M)!.nextSteps.map((x) => x.id)).toEqual(['targets', 'compliance'])
  })

  it('route access: /carbon opens wherever Sustainability does', () => {
    const s = fresh()
    const r = (u: string, tab: string) => sel.routeAccess(s, viewer(u), `/app/projects/${M}/${tab}`)
    for (const u of [U.priya, U.isla, U.marcus]) {
      expect(r(u, 'sustainability')).toBe('ok')
      expect(r(u, 'carbon')).toBe('ok')
      expect(r(u, 'requirements')).toBe('ok')
    }
    for (const tab of ['targets', 'certification', 'statement']) {
      expect(r(U.marcus, tab)).toBe('ok')
      expect(r(U.isla, tab)).toBe('forbidden')
      expect(r(U.priya, tab)).toBe('forbidden')
    }
    expect(r(U.tom, 'sustainability')).toBe('forbidden')
    expect(sel.routeAccess(s, viewer(U.isla), `/app/projects/${M}/sustainability#statement`)).toBe('ok')
  })

  it("a line on another side's page leads to the same thing in the reader's workspace", () => {
    const s = fresh()
    const h = (u: string, path: string) => sel.hrefForReader(s, u, `/app/projects/${M}${path}`)
    expect(h(U.isla, '/carbon?x=1')).toBe(`/app/projects/${M}/sustainability?x=1`)
    expect(h(U.isla, '/statement')).toBe(`/app/projects/${M}/sustainability#statement`)
    expect(h(U.priya, '/statement')).toBe(`/app/projects/${M}/sustainability`)
    expect(h(U.priya, '/targets')).toBe(`/app/projects/${M}/sustainability`)
    expect(h(U.isla, '/compliance')).toBe(`/app/projects/${M}/sustainability`)
    expect(h(U.marcus, '/statement')).toBe(`/app/projects/${M}/statement`)
    expect(h(U.isla, '/sustainability#statement')).toBe(`/app/projects/${M}/sustainability#statement`)
    expect(h(U.priya, '/requirements')).toBe(`/app/projects/${M}/requirements`)
    expect(h(U.tom, '/sustainability')).toBeNull()
  })
})
