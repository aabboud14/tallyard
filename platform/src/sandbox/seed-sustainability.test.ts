import { describe, it, expect } from 'vitest'
import { firstRun } from './seed'
import { MERROWGATE_ID, ORG_IDS } from '../domain/seed/world'
import { KILNWORTH_ID, TESSALY_ORG_ID } from './seed-portfolio'
import { U, viewer } from '../test/fixtures'
import { projectsOfUser } from '../store/access'
import { sustainabilityOf } from '../store/sustainabilityRecord'
import * as sel from '../store/selectors'
import { validateProgramme } from '../domain/engines/programme'

const s = firstRun('2026-10-08', '2026-10-08T09:00:00.000Z')

describe('the sustainability seed', () => {
  it('holds records for Merrowgate Wharf only', () => {
    expect(Object.keys(s.sustainability)).toEqual([MERROWGATE_ID])
    const r = sustainabilityOf(s, MERROWGATE_ID)
    expect(Object.keys(r.goals).sort()).toEqual(['avoided_carbon', 'breeam', 'content_by_value', 'leed', 'well'])
    expect(r.goals.content_by_value!.value).toBe(s.world.projects[MERROWGATE_ID].targets.contentByValue)
    expect(r.goals.avoided_carbon!.value).toBe(s.world.projects[MERROWGATE_ID].targets.avoidedCarbonT)
    expect(Object.keys(r.requirements).sort()).toEqual(['breeam-nc', 'lp-si2', 'lp-si7'])
    expect(r.requirements['lp-si7'].evidence).toHaveLength(2)
    expect(r.credits['well-x01']).toMatchObject({ targeted: true, status: 'at_risk' })
    expect(r.statement).toMatchObject({ status: 'ready_for_review', sentByUserId: U.marcus })
  })

  it('the approach edit is not stale on a fresh sandbox', () => {
    const approach = sel.statementView(s, viewer(U.marcus), MERROWGATE_ID)!.sections.find((x) => x.id === 'approach')!
    expect(approach).toMatchObject({ edited: true, stale: false })
  })

  it("Kilnworth Place is in Isla's projects and not in Priya's or Marcus's", () => {
    expect(projectsOfUser(s, U.isla).map((p) => p.name)).toEqual(['Merrowgate Wharf', 'Kilnworth Place'])
    expect(projectsOfUser(s, U.priya).map((p) => p.id)).not.toContain(KILNWORTH_ID)
    expect(projectsOfUser(s, U.marcus).map((p) => p.id)).not.toContain(KILNWORTH_ID)
    const k = s.world.projects[KILNWORTH_ID]
    expect(k).toMatchObject({ architectOrgId: TESSALY_ORG_ID, clientOrgId: ORG_IDS.lantern, consultantOrgId: '', ribaStage: 4, giaM2: 7400, projectType: 'residential', localAuthority: 'Tower Hamlets', createdBy: null })
    expect(k.clientLink.status).toBe('accepted')
    expect(k.programme.source).toBe('set')
    expect(validateProgramme(k.programme, k.startDate)).toEqual([])
    expect(k.planningRequirementIds).toEqual(expect.arrayContaining(['lp-si7', 'gla-ces', 'la-tower-hamlets']))
    expect(s.world.orgs[TESSALY_ORG_ID]).toEqual({ id: TESSALY_ORG_ID, name: 'Tessaly Architects', type: 'Architect' })
    expect(Object.values(s.users).some((u) => u.orgId === TESSALY_ORG_ID)).toBe(false)
  })

  it("Isla's unread count stays at 1, and the history is in place", () => {
    expect(sel.inboxView(s, viewer(U.isla)).unread).toBe(1)
    const review = s.notifications.find((n) => n.kind === 'sustainability')!
    expect(review).toMatchObject({ orgId: ORG_IDS.lantern, title: 'Circular economy statement ready for review', readBy: [U.isla] })
    const texts = s.activity.filter((a) => a.projectId === MERROWGATE_ID && a.actorUserId === U.marcus).map((a) => a.text)
    expect(texts).toEqual(['sent the circular economy statement to Lantern Quay Developments for review', 'marked BREEAM New Construction as at risk', 'recorded upfront carbon, modules A1 to A5: 820 kgCO2e per m2', 'set the targets for Merrowgate Wharf'])
    expect(s.activity.find((a) => a.projectId === KILNWORTH_ID)).toMatchObject({ actor: 'Tessaly Architects', text: 'added Lantern Quay Developments as the client on Kilnworth Place' })
  })
})
