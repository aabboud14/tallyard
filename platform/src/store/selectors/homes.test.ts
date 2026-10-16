import { describe, expect, it } from 'vitest'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import { createOwnerProject } from '../actions/owner'
import { architectHome } from './architect'
import { ownerDashboard } from './home-owner'
import { surveyorDashboard } from './home-surveyor'
import { consultantDashboard } from './home-consultant'
import { AMBREY_ID } from '../../sandbox/seed-owner-surveyor'
import { formatDate } from '../../domain/dates'

describe('owner dashboard', () => {
  it('counts items by typology across the buildings, with drawings and the programme', () => {
    const d = ownerDashboard(fresh(), viewer(U.tom))!
    const sum = Object.values(d.metrics.byTypology).reduce((a, b) => a + b, 0)
    expect(sum).toBe(d.stats.itemsSurveyed)
    expect(d.metrics.listed).toBe(d.stats.listed + d.stats.shared)
    expect(d.metrics.requestTone).toBe('warning')
    for (const c of d.buildingCards) {
      expect(c.sketch.state).toBe('existing')
      expect(c.programmeText).toMatch(/^Dismantling starts |^Programme not set$/)
    }
    for (const r of d.requests) expect(d.requestThumbs[r.id].publicId).toBe(r.publicId)
    expect(d.activitySummary.count).toBe(d.activity.length)
    expect(ownerDashboard(fresh(), viewer(U.dana))).toBeNull()
  })

  it('names each card by kind and draws the owner New projects going up, with their site start', () => {
    const s0 = fresh()
    const before = ownerDashboard(s0, viewer(U.tom))!
    expect(before.buildingCards.every((c) => c.kindLabel === 'Donor building')).toBe(true)
    expect(before.newProjectCards).toEqual([])
    const input = { name: 'Wexcombe House', projectType: 'office' as const, localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: ORG_IDS.oriel }
    const r = must(createOwnerProject(s0, actor(U.tom), input))
    const after = ownerDashboard(r.state, viewer(U.tom))!
    expect(after.newProjectCards).toHaveLength(1)
    const card = after.newProjectCards[0]
    expect(card).toMatchObject({ id: r.value, name: 'Wexcombe House', kindLabel: 'New project' })
    expect(card.sketch.state).toBe('proposed')
    expect(card.programmeText).toMatch(/^Site start /)
  })
})

describe('programme stage on the project cards', () => {
  it('gives the architect and consultant cards the stage the programme dates place today in', () => {
    const s = fresh()
    const a = architectHome(s, viewer(U.priya))!
    const merrow = a.projects.find((p) => p.id === MERROWGATE_ID)!
    expect(merrow.plannedStage).toBe(2)
    const c = consultantDashboard(s, viewer(U.marcus))!
    expect(c.rows.find((r) => r.id === MERROWGATE_ID)!.plannedStage).toBe(2)
  })
})

describe('surveyor dashboard', () => {
  it('counts surveys by status and draws each building', () => {
    const d = surveyorDashboard(fresh(), viewer(U.dana))!
    expect(d.metrics.byStatus).toEqual({ not_started: 0, in_progress: 1, submitted: 1 })
    expect(d.metrics.openTone).toBe('warning')
    expect(d.metrics.lastCaptureText).not.toBeNull()
    const ids = d.appointments.flatMap((g) => g.buildings.map((b) => b.id))
    expect(Object.keys(d.extras).sort()).toEqual([...ids].sort())
    for (const id of ids) expect(d.extras[id].sketch.state).toBe('existing')
    expect(surveyorDashboard(fresh(), viewer(U.tom))).toBeNull()
  })

  it("counts the firm's work at buildings not yet linked in items and the last capture, and names their open surveys", () => {
    const s = fresh()
    const d = surveyorDashboard(s, viewer(U.dana))!
    const appointed = d.appointments.flatMap((g) => g.buildings)
    const ambrey = d.unlinked.find((b) => b.id === AMBREY_ID)!
    expect(ambrey.itemCount).toBe(2)
    expect(d.stats.unlinkedItems).toBe(2)
    expect(d.stats.itemsCaptured).toBe(appointed.reduce((n, b) => n + b.itemCount, 0) + 2)
    // Ambrey House holds the latest capture, so the tile reads its date.
    const latest = [...appointed, ...d.unlinked].map((b) => b.lastCaptureOn ?? '').sort().at(-1)!
    expect(ambrey.lastCaptureOn).toBe(latest)
    expect(d.metrics.lastCaptureText).toBe(formatDate(latest.slice(0, 10)))
    expect(d.metrics.itemsSubText).toBe(`Last on ${formatDate(latest.slice(0, 10))}, including 2 at a building not yet linked`)
    // One appointed survey is open; Ambrey's, which cannot be submitted until the owner confirms it, is told apart.
    expect(d.metrics.byStatus).toEqual({ not_started: 0, in_progress: 1, submitted: 1 })
    expect(d.metrics.open).toBe(1)
    expect(d.metrics.openSubText).toBe('Plus 1 at a building not yet linked')
  })
})

describe('consultant dashboard', () => {
  it('reads each project against its targets', () => {
    const d = consultantDashboard(fresh(), viewer(U.marcus))!
    const merrow = d.rows.find((r) => r.id === MERROWGATE_ID)!
    expect(merrow.content.targetText).toBe('25.0%')
    expect(['met', 'below']).toContain(merrow.content.status)
    expect(['met', 'below']).toContain(merrow.carbon.status)
    // Round 2 (client-consultant design 11 and open questions): Carbon is now Sustainability, and the card links to Sustainability, Goals and targets and Certification.
    expect(merrow.links.map((l) => l.id)).toEqual(['sustainability', 'targets', 'certification'])
    expect(merrow.sketch.state).toBe('proposed')
    const sallow = d.rows.find((r) => r.id === SALLOW_ID)!
    // Round 2 (client-consultant design 1 and 12): targets come from effectiveTargets, so Sallow Court and Ferrymoor Yard carry the
    // 20% content default from the requirements that apply to them; with no bill of materials yet they read no_data.
    expect(sallow.content.targetText).toBe('20.0%')
    expect(sallow.content.status).toBe('no_data')
    expect(sallow.content.statusText).toBe('No result yet')
    expect(sallow.carbon.status).toBe('no_target')
    // Round 2 follow-up (audit of 16 October, note 43): Targets met counts every goal with a target, as Goals and
    // targets lists them: six on Merrowgate, three on Sallow Court and three on Ferrymoor Yard.
    expect(d.metrics.targetsSet).toBe(12)
    expect(d.metrics.targetsScopeText).toBe('Across 12 goals on 3 projects')
    expect(d.metrics.withTargets).toBe(3)
    expect(d.metrics.carbonTargetT).toBe(150)
    expect(d.metrics.billsReviewed).toBe(d.engagements.filter((e) => e.hasBill).length)
    expect(consultantDashboard(fresh(), viewer(U.priya))).toBeNull()
  })
})
