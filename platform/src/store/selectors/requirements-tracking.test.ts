// Requirements across the software (recording audit of 16 October 2026, notes 20, 41 and C1): a project left
// unreviewed tracks the suggestions and every screen says so; an explicit empty choice is kept; the client table and
// the consultant cards name the place; and a donor building tracks what applies before demolition, for its owner and
// its surveyor only.
import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, refused, U, viewer } from '../../test/fixtures'
import * as sel from '.'
import { createProject, type NewProjectInput } from '../actions/projects'
import { addBuildingRequirementEvidence, BUILDING_REQUIREMENT_ERRORS, removeBuildingRequirementEvidence, setBuildingRequirementStatus } from '../actions/buildingRequirements'
import { ERRORS } from '../access'
import { SUSTAINABILITY_ERRORS } from '../actions/sustainability'
import { HARROWDEN_ID, MERROWGATE_ID, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { FENNICK_ID } from '../../sandbox/seed-owner-surveyor'
import { suggestedRequirementIds } from '../../domain/reference/requirements'
import { FORBIDDEN } from '../../ui/testing'
import type { AppData } from '../types'

const base: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null }

function corbel(input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(fresh(), actor(U.priya), { ...base, ...input }))
  return { state: r.state, id: r.value }
}

describe('a project whose requirements nobody has chosen yet', () => {
  it('tracks the suggestions, and the card, the tab and the checklist all say so', () => {
    const { state, id } = corbel()
    const v = sel.projectRequirementsView(state, viewer(U.priya), id)!
    const suggested = suggestedRequirementIds('Central London', 'Camden')
    expect(v.reviewed).toBe(false)
    expect(v.selected).toEqual([])
    expect(v.tracked.map((r) => r.id)).toEqual(suggested)
    expect(v.suggestedOnly).toBe(true)
    expect(v.trackedText).toBe('10 suggested for Camden, Central London')
    expect(v.suggestedNote).toBe('No requirements chosen yet. Pick the policies and standards to track for this location. Until then, the 10 suggested ones are tracked.')
    expect(v.canEdit).toBe(true)
    expect(v.canTrack).toBe(false)
    // The Requirements tab tracks the same ten.
    expect(sel.requirementsView(state, viewer(U.priya), id)!.rows.map((r) => r.id)).toEqual(suggested)
    // The checklist step stays to do, and says the suggestions are tracked meanwhile.
    const step = sel.projectSetup(state, viewer(U.priya), id)!.steps.find((s) => s.id === 'requirements')!
    expect(step.text).toBe('10 suggested requirements are tracked until you review them.')
    expect(step.action).toMatchObject({ label: 'Review requirements', intent: 'requirements' })
    expect(JSON.stringify(v)).not.toMatch(FORBIDDEN)
  })

  it('keeps an explicit empty choice from the form as chosen, so nothing is tracked', () => {
    const { state, id } = corbel({ requirementIds: [] })
    const p = state.world.projects[id]
    expect(p.requirementsReviewed).toBe(true)
    const v = sel.projectRequirementsView(state, viewer(U.priya), id)!
    expect(v.tracked).toEqual([])
    expect(v.suggestedOnly).toBe(false)
    expect(v.suggestedNote).toBeNull()
  })

  it('reads chosen ones as chosen, with the client and consultant tracking and the architect reading', () => {
    const s = fresh()
    const priya = sel.projectRequirementsView(s, viewer(U.priya), MERROWGATE_ID)!
    expect(priya).toMatchObject({ suggestedOnly: false, trackedText: '10 chosen for Newham, Inner London East', canEdit: true, canTrack: false, suggestedNote: null })
    expect(priya.tracked.map((r) => r.id)).toEqual(priya.selected.map((r) => r.id))
    expect(sel.projectRequirementsView(s, viewer(U.isla), MERROWGATE_ID)).toMatchObject({ canEdit: false, canTrack: true })
    expect(sel.projectRequirementsView(s, viewer(U.marcus), MERROWGATE_ID)).toMatchObject({ canEdit: false, canTrack: true })
  })
})

describe('where the requirements come from', () => {
  it('names the borough and region on the client table row', () => {
    expect(sel.sustainabilityTracking(fresh(), viewer(U.isla), MERROWGATE_ID)!.locationText).toBe('Newham, Inner London East')
  })
})

describe('requirements on a donor building', () => {
  it('lists what applies before Tiverne House comes down, with the seeded statuses', () => {
    const s = fresh()
    const v = sel.buildingRequirementsView(s, viewer(U.tom), TIVERNE_ID)!
    expect(v.locationText).toBe('City of London, Central London')
    expect(v.rows.map((r) => [r.id, r.status])).toEqual([
      ['dem-notice', 'not_started'],
      ['lp-si7-pda', 'in_progress'],
      ['lp-si7-diversion', 'at_risk'],
      ['la-city-of-london-carbon-options', 'evidence_ready'],
    ])
    const options = v.rows.find((r) => r.id === 'la-city-of-london-carbon-options')!
    expect(options).toMatchObject({ code: 'Carbon options', title: 'Carbon Options guidance', scopeLabel: 'City of London', placeholder: false })
    expect(options.evidence[0]).toMatchObject({ by: 'Tom Ashby', canRemove: true })
    expect(v.rows[0]).toMatchObject({ placeholder: true, scopeLabel: 'National' })
    expect(v.summary).toMatchObject({ total: 4, ready: 1, atRisk: 1, inProgress: 1 })
    expect(v.readyText).toBe('1 of 4 ready')
    expect(v.introText).toBe('What applies before Tiverne House comes down in City of London, Central London. You and your surveyor keep the status and the evidence current.')
    expect(JSON.stringify(v)).not.toMatch(FORBIDDEN)
    // The surveyor reads the same, and may not remove the owner's evidence.
    const dana = sel.buildingRequirementsView(s, viewer(U.dana), TIVERNE_ID)!
    expect(dana.rows.find((r) => r.id === 'la-city-of-london-carbon-options')!.evidence[0].canRemove).toBe(false)
    expect(dana.introText).toMatch(/You and the owner keep/)
  })

  it('is for the owner and the surveyor only', () => {
    const s = fresh()
    const lee = addTestUser(s, { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    expect(sel.buildingRequirementsView(lee.state, viewer(lee.userId), TIVERNE_ID)).toBeNull()
    expect(sel.buildingRequirementsView(s, viewer(U.priya), TIVERNE_ID)).toBeNull()
    expect(sel.buildingRequirementsView(s, viewer(U.marcus), TIVERNE_ID)).toBeNull()
    expect(sel.routeAccess(s, viewer(U.tom), `/app/buildings/${TIVERNE_ID}/requirements`)).toBe('ok')
    expect(sel.routeAccess(s, viewer(U.dana), `/app/buildings/${TIVERNE_ID}/requirements`)).toBe('ok')
    expect(sel.routeAccess(lee.state, viewer(lee.userId), `/app/buildings/${TIVERNE_ID}/requirements`)).toBe('forbidden')
    refused(lee.state, setBuildingRequirementStatus(lee.state, actor(lee.userId), TIVERNE_ID, 'dem-notice', 'in_progress'), ERRORS.role)
    refused(s, setBuildingRequirementStatus(s, actor(U.isla), TIVERNE_ID, 'dem-notice', 'in_progress'), ERRORS.role)
  })

  it('lets the surveyor mark one at risk, which tells the owner, and both keep evidence', () => {
    const s0 = fresh()
    refused(s0, setBuildingRequirementStatus(s0, actor(U.dana), TIVERNE_ID, 'la-camden-cc1', 'at_risk'), BUILDING_REQUIREMENT_ERRORS.noRequirement)
    const r = must(setBuildingRequirementStatus(s0, actor(U.dana), TIVERNE_ID, 'dem-notice', 'at_risk')).state
    expect(sel.buildingRequirementsView(r, viewer(U.tom), TIVERNE_ID)!.rows[0]).toMatchObject({ status: 'at_risk', updatedText: 'Updated by Dana Kowalski on 8 Oct 2026' })
    expect(r.notifications[0]).toMatchObject({ orgId: ORG_IDS.ostlea, kind: 'sustainability', title: 'Demolition notice and site waste plan is at risk on Tiverne House', href: `/app/buildings/${TIVERNE_ID}/requirements` })
    expect(r.activity[0]).toMatchObject({ buildingId: TIVERNE_ID, text: 'marked Demolition notice and site waste plan as at risk on Tiverne House' })
    // The same status twice changes nothing.
    expect(setBuildingRequirementStatus(r, actor(U.dana), TIVERNE_ID, 'dem-notice', 'at_risk').state).toBe(r)
    refused(r, addBuildingRequirementEvidence(r, actor(U.tom), TIVERNE_ID, 'lp-si7-diversion', '   '), SUSTAINABILITY_ERRORS.emptyEvidence)
    const added = must(addBuildingRequirementEvidence(s0, actor(U.tom), TIVERNE_ID, 'dem-notice', 'Notice sent to the City on 1 October.'))
    const row = sel.buildingRequirementsView(added.state, viewer(U.tom), TIVERNE_ID)!.rows[0]
    expect(row.status).toBe('in_progress')
    expect(row.evidence.map((e) => e.text)).toEqual(['Notice sent to the City on 1 October.'])
    refused(added.state, removeBuildingRequirementEvidence(added.state, actor(U.dana), TIVERNE_ID, 'dem-notice', added.value), SUSTAINABILITY_ERRORS.notAuthor)
    const removed = must(removeBuildingRequirementEvidence(added.state, actor(U.tom), TIVERNE_ID, 'dem-notice', added.value)).state
    expect(sel.buildingRequirementsView(removed, viewer(U.tom), TIVERNE_ID)!.rows[0].evidence).toEqual([])
  })

  it('reads defensively a sandbox stored before the tracking existed', () => {
    const s = { ...fresh(), buildingTracks: undefined } as unknown as AppData
    expect(sel.buildingRequirementsView(s, viewer(U.tom), TIVERNE_ID)!.summary.ready).toBe(0)
    expect(must(setBuildingRequirementStatus(s, actor(U.tom), TIVERNE_ID, 'dem-notice', 'in_progress')).state.buildingTracks[TIVERNE_ID]['dem-notice'].status).toBe('in_progress')
  })

  it('shows the roll-up on the owner and surveyor homes', () => {
    const s = fresh()
    const owner = sel.ownerDashboard(s, viewer(U.tom))!
    expect(owner.buildingCards.find((b) => b.id === TIVERNE_ID)!.requirements).toMatchObject({ readyText: '1 of 4 ready', atRisk: 1, href: `/app/buildings/${TIVERNE_ID}/requirements` })
    const surveyor = sel.surveyorDashboard(s, viewer(U.dana))!
    expect(surveyor.extras[TIVERNE_ID].requirements).toMatchObject({ readyText: '1 of 4 ready', atRisk: 1 })
    // Harrowden Court in Ealing tracks the national item, the London Plan items and a local placeholder.
    expect(surveyor.extras[HARROWDEN_ID].requirements).toMatchObject({ total: 4, ready: 0, atRisk: 0 })
  })
})

describe('a change of place in the new project form', () => {
  it('says the new suggestions are ticked, and what was ticked and stops applying', () => {
    const m = sel.requirementsAfterMove(['nppf', 'nzcbs', 'la-camden-cc1', 'la-camden-cpg'], { region: 'Central London', localAuthority: 'Camden' }, { region: 'Outer London West', localAuthority: 'Merton' }, { ticked: true })
    // The London items applied in Camden too and were left unticked, so they stay unticked; Merton's local plan is new.
    expect(m.preselect).toEqual(['nppf', 'nzcbs', 'la-merton'])
    expect(m.text).toBe('2 ticked requirements no longer apply to Merton, Outer London West. 1 more is suggested there and now ticked.')
  })
})
