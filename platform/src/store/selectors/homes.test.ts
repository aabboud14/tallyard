import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { ownerDashboard } from './home-owner'
import { surveyorDashboard } from './home-surveyor'
import { consultantDashboard } from './home-consultant'

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
})

describe('consultant dashboard', () => {
  it('reads each project against its targets', () => {
    const d = consultantDashboard(fresh(), viewer(U.marcus))!
    const merrow = d.rows.find((r) => r.id === MERROWGATE_ID)!
    expect(merrow.content.targetText).toBe('25.0%')
    expect(['met', 'below']).toContain(merrow.content.status)
    expect(['met', 'below']).toContain(merrow.carbon.status)
    expect(merrow.links.map((l) => l.id)).toEqual(['carbon', 'compliance'])
    expect(merrow.sketch.state).toBe('proposed')
    const sallow = d.rows.find((r) => r.id === SALLOW_ID)!
    expect(sallow.content.status).toBe('no_target')
    expect(sallow.content.statusText).toBe('No target set')
    expect(d.metrics.targetsSet).toBe(2)
    expect(d.metrics.withTargets).toBe(1)
    expect(d.metrics.carbonTargetT).toBe(150)
    expect(d.metrics.billsReviewed).toBe(d.engagements.filter((e) => e.hasBill).length)
    expect(consultantDashboard(fresh(), viewer(U.priya))).toBeNull()
  })
})
