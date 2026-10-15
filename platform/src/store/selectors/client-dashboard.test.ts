import { describe, it, expect } from 'vitest'
import { closeTo, pence } from '../../test/helpers'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { KILNWORTH_ID } from '../../sandbox/seed-portfolio'
import { reviewStatement } from '../actions/sustainability'
import { decideItem } from '../actions/shortlist'
import { withdrawReservation } from '../actions/reservations'
import { clientDashboard } from './client-dashboard'
import { clientProgramme, programmeInput } from './portfolio'

describe("Isla's dashboard", () => {
  it('cost and saving across her projects, from the package engine and the earlier deals', () => {
    const d = clientDashboard(fresh(), viewer(U.isla))!
    pence(d.metrics.cost.total, 155931.69)
    pence(d.metrics.saving.costNew, 335196.4)
    pence(d.metrics.saving.amount, 179264.71)
    expect(d.metrics.saving).toMatchObject({ negative: false, text: '53.5% less than buying new' })
    expect(d.metrics.cost).toMatchObject({ count: 4, projects: 1 })
    expect(d.metrics.cost.byStage.map((x) => [x.label, x.total])).toEqual([
      ['Confirmed', 105060],
      ['Reserved', 0],
      ['With the seller', 41390.59],
      ['Approved', 9481.1],
    ])
  })

  it('avoided carbon secured against the targets, and reuse by value', () => {
    const d = clientDashboard(fresh(), viewer(U.isla))!
    closeTo(d.metrics.carbon.securedT, 47.7974, 4)
    closeTo(d.metrics.carbon.approvedT, 100.8227, 4)
    expect(d.metrics.carbon.targetT).toBe(150)
    expect(d.metrics.carbon.progress.status).toBe('below')
    closeTo(d.metrics.reuse.reuse!, 0.0236, 4)
    closeTo(d.metrics.reuse.content!, 0.1991, 4)
    expect(d.metrics.reuse.aim).toBe(0.2)
  })

  it('the to-do list: approve first, then the statement review, then the oldest without a due date', () => {
    const d = clientDashboard(fresh(), viewer(U.isla))!
    expect(d.todos.map((t) => [t.kind, t.whenText])).toEqual([
      ['approve', 'Due in 6 days'],
      ['review_statement', 'Due in 13 days'],
      ['requirement_at_risk', '9 days ago'],
      ['reserve', '2 days ago'],
    ])
    expect(d.todos[0]).toMatchObject({ title: 'Approve or decline UC 305x305x97, 4.2 m', detail: 'Merrowgate Wharf. Sent by Studio Oriel', href: `/app/projects/${MERROWGATE_ID}/approvals` })
    expect(d.todos[0].id).toContain('L-2MAC36')
    expect(d.todos[1]).toMatchObject({ detail: 'Merrowgate Wharf. Sent by Halewick Sustainability', href: `/app/projects/${MERROWGATE_ID}/sustainability#statement` })
    expect(d.todos[2]).toMatchObject({ title: 'Check BREEAM New Construction: at risk', detail: 'Merrowgate Wharf. Marked by Marcus Lindqvist' })
    expect(d.todos[3].id).toContain('L-NHZ32R')
  })

  it('every to-do clears itself once done', () => {
    let s = fresh()
    s = must(reviewStatement(s, actor(U.isla), MERROWGATE_ID, '')).state
    s = must(decideItem(s, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_3', 'declined', 'Not now.')).state
    const kinds = clientDashboard(s, viewer(U.isla))!.todos.map((t) => t.kind)
    expect(kinds).not.toContain('review_statement')
    expect(kinds).not.toContain('approve')
  })

  it('a withdrawn request asks to choose again', () => {
    let s = fresh()
    const res = Object.values(s.reservations)[0]
    s = must(withdrawReservation(s, actor(U.isla), res.id)).state
    const t = clientDashboard(s, viewer(U.isla))!.todos.find((x) => x.kind === 'request_again')!
    expect(t).toMatchObject({ title: 'Choose again for UB 533x210x92, 9.0 m', detail: 'Merrowgate Wharf. You withdrew the request' })
  })

  it('the programme across projects: two rows, Kilnworth Place at stage 4', () => {
    const d = clientDashboard(fresh(), viewer(U.isla))!
    expect(d.programme.rows.map((r) => r.name)).toEqual(['Merrowgate Wharf', 'Kilnworth Place'])
    const k = d.programme.rows[1]
    expect(k).toMatchObject({ id: KILNWORTH_ID, currentStage: 4, stageText: 'Stage 4, Technical Design', hasProgramme: true, href: `/app/projects/${KILNWORTH_ID}` })
    expect(d.programme.rows[0].currentStage).toBe(2)
    expect(d.programme.today).toBeGreaterThan(0)
    expect(clientProgramme(fresh(), viewer(U.priya))).toBeNull()
  })

  it('tracking: one row per project; Kilnworth has no consultant', () => {
    const d = clientDashboard(fresh(), viewer(U.isla))!
    expect(d.tracking.map((t) => [t.projectName, t.consultantName])).toEqual([
      ['Merrowgate Wharf', 'Halewick Sustainability'],
      ['Kilnworth Place', null],
    ])
    expect(d.tracking[0].circular.statementLabel).toBe('Ready for your review')
    expect(d.projects.map((p) => [p.name, p.costText])).toEqual([
      ['Merrowgate Wharf', '£155,932'],
      ['Kilnworth Place', null],
    ])
    expect(d.projects[0].thumbs.map((t) => t.publicId)).toEqual(['L-R8Q33F', 'L-5APGJ7', 'L-WPX5A6', 'L-NHZ32R'])
  })

  it('only for a client', () => {
    expect(clientDashboard(fresh(), viewer(U.priya))).toBeNull()
    expect(clientDashboard(fresh(), viewer(U.marcus))).toBeNull()
  })
})

describe('the programme adapter', () => {
  it('reads stages 0 to 6, site start, completion and the materials date', () => {
    const p = fresh().world.projects[KILNWORTH_ID]
    const i = programmeInput(p)
    expect(i.stages.map((s) => s.stage)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(i.siteStart).toBe(p.programme.siteStart)
    expect(i.completion).toBe(p.programme.practicalCompletion)
    expect(i.materialsFrom).toBe(p.startDate)
    const none = programmeInput({ ...p, programme: undefined as never })
    expect(none).toMatchObject({ stages: [], siteStart: null, completion: null })
  })
})
