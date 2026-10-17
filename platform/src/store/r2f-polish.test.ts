// The last polish before the platform goes back to the partner (feedback/r2f-polish.md): the rules behind each item,
// tested as pure functions on a fresh sandbox.
import { describe, expect, it } from 'vitest'
import { actor, addTestUser, fresh, must, NOW, U, viewer } from '../test/fixtures'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS, SALLOW_ID, TIVERNE_ID } from '../domain/seed/world'
import { AMBREY_ID, FENNICK_ID } from '../sandbox/seed-owner-surveyor'
import { KILNWORTH_ID } from '../sandbox/seed-portfolio'
import { firstRun } from '../sandbox/seed'
import { LABELS } from '../domain/reference/labels'
import { createOwnerProject } from './actions/owner'
import { createSurveyBuilding, mergeSurveyBuilding, type SurveyBuildingInput } from './actions/claims'
import { createBuilding, type NewBuildingInput } from './actions/owner'
import { captureItem } from './actions/surveyor'
import { signUpState } from './actions/auth'
import { draftFromText } from './capture'
import { overviewLeads, projectOverview, projectsListView } from './selectors/project'
import { consultantStanding, statementLine, sustainabilityView } from './selectors/sustainability'
import { consultantDashboard } from './selectors/home-consultant'
import { surveySteps, type SurveyStep } from './selectors/home-surveyor'
import { mergeCandidates } from './selectors/claims'
import { unlinkedBuildings } from './selectors/surveyor'
import { contractorOnly, DONOR_BUILDINGS, NEW_PROJECTS, navModel } from './selectors/nav'
import { pageLocation } from './selectors/arch-breadcrumbs'
import type { AppData, SurveyStatus } from './types'

describe("the consultant's overview leads with his own section (note 42)", () => {
  it('puts the consultant section first for the consultant and the programme first for every other side', () => {
    expect(overviewLeads('consultant')).toEqual(['consultant', 'programme'])
    expect(overviewLeads('architect')).toEqual(['programme'])
    expect(overviewLeads('client')).toEqual(['programme'])
    const s = fresh()
    expect(projectOverview(s, viewer(U.marcus), MERROWGATE_ID)!.leads).toEqual(['consultant', 'programme'])
    expect(projectOverview(s, viewer(U.priya), MERROWGATE_ID)!.leads).toEqual(['programme'])
    expect(projectOverview(s, viewer(U.isla), MERROWGATE_ID)!.leads).toEqual(['programme'])
  })

  it("keeps the programme first on an owner's New project with no architect, the appoint card straight after it (note 19)", () => {
    expect(overviewLeads('client', true)).toEqual(['programme', 'appoint'])
    const r = must(createOwnerProject(fresh(), actor(U.tom), { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: null }))
    expect(projectOverview(r.state, viewer(U.tom), r.value)!.leads).toEqual(['programme', 'appoint'])
    // Once an architect is appointed the card is gone, and so is its place in the order.
    const appointed = must(createOwnerProject(fresh(), actor(U.tom), { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: ORG_IDS.oriel }))
    expect(projectOverview(appointed.state, viewer(U.tom), appointed.value)!.leads).toEqual(['programme'])
  })
})

describe('the indicative carbon note names the modules in words (copy)', () => {
  it('reads "modules A1 to A4", with no hyphenated range', () => {
    expect(LABELS.L11).toContain('modules A1 to A4')
    for (const text of Object.values(LABELS)) expect(text).not.toMatch(/A\d-A\d/)
  })
})

describe('the statement card says something true when no consultant is appointed (copy)', () => {
  const draft = { status: 'draft' as const, sentText: null, canReview: false, changedSinceSent: false }

  it('tells the client who drafts it, and only when someone does', () => {
    expect(statementLine('client', draft, { kind: 'linked', name: 'Halewick Sustainability' })).toBe('Halewick Sustainability is drafting it. You will be asked to review it.')
    expect(statementLine('client', draft, { kind: 'pending', name: 'Halewick Sustainability' })).toBe('Halewick Sustainability drafts it once they accept the project. You will be asked to review it.')
    for (const c of [{ kind: 'none' as const }, { kind: 'declined' as const, name: 'Halewick Sustainability' }]) {
      const line = statementLine('client', draft, c)
      expect(line).toBe('No sustainability consultant is on this project yet. Once one joins the team, they draft it and you will be asked to review it.')
      expect(line).not.toContain('is drafting it')
    }
  })

  it('reads so on Kilnworth Place, which has no consultant', () => {
    const s = fresh()
    expect(consultantStanding(s, s.world.projects[KILNWORTH_ID])).toEqual({ kind: 'none' })
    const line = sustainabilityView(s, viewer(U.isla), KILNWORTH_ID)!.statement!.line
    expect(line).toContain('No sustainability consultant is on this project yet')
    expect(line).not.toContain('The consultant is drafting it')
    // Merrowgate Wharf's statement waits for Isla's review, as before.
    expect(sustainabilityView(s, viewer(U.isla), MERROWGATE_ID)!.statement!.line).toMatch(/^Sent on .+\. Read it and mark it reviewed, with any comments for the consultant\.$/)
    expect(sustainabilityView(s, viewer(U.marcus), MERROWGATE_ID)!.statement!.line).toMatch(/Waiting for the client's review\.$/)
  })
})

describe('a meter with no result reads the same everywhere (copy)', () => {
  it('shows "No result yet" as the value on the consultant home, as on the other screens', () => {
    const d = consultantDashboard(fresh(), viewer(U.marcus))!
    for (const id of [SALLOW_ID, FERRYMOOR_ID]) {
      const row = d.rows.find((r) => r.id === id)!
      expect(row.content.actualText).toBe('No result yet')
      expect(row.content.statusText).toBe('No result yet')
    }
    expect(JSON.stringify(d)).not.toContain('Not known')
  })
})

describe('a survey has one current step at most (note 10)', () => {
  const statuses: SurveyStatus[] = ['not_started', 'in_progress', 'submitted']
  const claims = [null, 'linked', 'not_linked', 'pending', 'declined'] as const
  const current = (steps: SurveyStep[]) => steps.filter((x) => x.state === 'current').map((x) => x.key)

  it('never marks two steps current, for any survey status and owner confirmation', () => {
    for (const status of statuses) for (const claim of claims) expect(current(surveySteps(status, claim)).length, `${status}, ${claim}`).toBeLessThanOrEqual(1)
  })

  it("reads Ambrey House as Added, Owner confirms waiting, Capturing current, Submitted to do", () => {
    const steps = surveySteps('in_progress', 'pending')
    expect(steps.map((x) => [x.label, x.state])).toEqual([
      ['Added', 'done'],
      ['Owner confirms', 'waiting'],
      ['Capturing', 'current'],
      ['Submitted', 'todo'],
    ])
    // The same before anything is captured: capturing is the firm's next step, the owner's answer is awaited.
    expect(current(surveySteps('not_started', 'pending'))).toEqual(['in_progress'])
    expect(surveySteps('not_started', 'not_linked').find((x) => x.key === 'owner')!.state).toBe('todo')
    expect(surveySteps('in_progress', 'declined').find((x) => x.key === 'owner')!.state).toBe('todo')
  })

  it('keeps the appointed steps as they were', () => {
    expect(surveySteps('not_started', null).map((x) => x.state)).toEqual(['current', 'todo', 'todo'])
    expect(surveySteps('in_progress', 'linked').map((x) => x.state)).toEqual(['done', 'current', 'todo'])
    expect(surveySteps('submitted', null).map((x) => x.state)).toEqual(['done', 'done', 'done'])
  })

  it("gives Dana's seeded Ambrey House, waiting for Tom's confirmation, a single current step", () => {
    const ambrey = unlinkedBuildings(fresh(), viewer(U.dana)).find((b) => b.id === AMBREY_ID)!
    expect(ambrey.claim.status).toBe('pending')
    const steps = surveySteps(ambrey.status, ambrey.claim.status)
    expect(current(steps)).toEqual(['in_progress'])
    expect(steps.find((x) => x.key === 'owner')!.state).toBe('waiting')
  })
})

const CORBEL: SurveyBuildingInput = {
  name: 'Corbel Yard',
  address: '9 Lantry Street, London E1',
  postcodeDistrict: 'E1',
  localAuthority: 'Tower Hamlets',
  region: 'Inner London East',
  yearBuilt: 1988,
  storeys: 5,
  giaM2: 3000,
  structureType: '',
  structure: [],
  stripOutStart: null,
  dismantlingStart: null,
  clearBy: null,
  owner: null,
}

const TOMS_CORBEL: NewBuildingInput = { ...CORBEL, yearBuilt: null, storeys: null, giaM2: null, surveyorOrgId: ORG_IDS.tarnbrook }

function corbels(items: number, mineName = CORBEL.name): { s: AppData; mine: string; toms: string } {
  const a = must(createSurveyBuilding(fresh(), actor(U.dana), { ...CORBEL, name: mineName }))
  let s = a.state
  for (let i = 0; i < items; i++) {
    const d = draftFromText('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
    s = must(captureItem(s, actor(U.dana), { buildingId: a.value, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: 'A', location: d.location, notes: '', photoIds: [], expectedAvailableFrom: null })).state
  }
  const t = must(createBuilding(s, actor(U.tom), TOMS_CORBEL))
  return { s: t.state, mine: a.value, toms: t.value }
}

describe('the merge prompt counts what moves, and an empty merge says so (note 11)', () => {
  it('names the count for one item too', () => {
    const { s } = corbels(1)
    const [c] = mergeCandidates(s, viewer(U.dana))
    expect(c.prompt).toBe('You added Corbel Yard yourself before Ostlea Estates appointed you. Move its 1 captured item here?')
    expect(c.unlinkedPrompt).toBe("Ostlea Estates has since appointed you to Corbel Yard. Move this building's 1 captured item into it?")
  })

  it('logs a merge with nothing captured as a merged record, not as 0 items moved', () => {
    const { s, mine, toms } = corbels(0)
    const r = must(mergeSurveyBuilding(s, actor(U.dana), mine, toms))
    expect(r.value.moved).toBe(0)
    expect(r.state.activity[0]).toMatchObject({ text: 'merged its earlier record of Corbel Yard, with no items captured in it', href: `/app/buildings/${toms}` })
    expect(r.state.activity.some((e) => /moved 0|0 items/.test(e.text))).toBe(false)
  })

  it('names both records when an empty merge joins two names at one address, and the prompt names the appointment', () => {
    const { s, mine, toms } = corbels(0, 'Harrowden Court')
    const c = mergeCandidates(s, viewer(U.dana)).find((x) => x.fromId === mine && x.intoId === toms)!
    expect(c.reason).toBe('address')
    expect(c.prompt).toBe('You added Harrowden Court yourself before Ostlea Estates appointed you. Merge it into Corbel Yard for Ostlea Estates?')
    const r = must(mergeSurveyBuilding(s, actor(U.dana), mine, toms))
    expect(r.state.activity[0].text).toBe('merged the earlier record of Harrowden Court into Corbel Yard, with no items captured in it')
  })
})

describe('a contractor-only firm is not offered Add building where it cannot use it (note 12)', () => {
  it('leaves Add building out of its sidebar, as Capture is, and keeps it for every other firm', () => {
    const { state, userId } = addTestUser(fresh(), { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    expect(contractorOnly(state, viewer(userId))).toBe(true)
    const ids = navModel(state, viewer(userId))!.sections.flatMap((x) => x.items.map((i) => i.id))
    expect(ids).not.toContain('new-building')
    expect(ids).not.toContain('capture')
    const dana = navModel(state, viewer(U.dana))!.sections.flatMap((x) => x.items.map((i) => i.id))
    expect(dana).toContain('new-building')
    expect(dana).toContain('capture')
  })
})

describe("the owner's building breadcrumb reads as the sidebar does (note 13)", () => {
  it('leads with Donor buildings for the owner, Appointments for the surveyor', () => {
    const s = fresh()
    expect(pageLocation(s, viewer(U.tom), `/app/buildings/${TIVERNE_ID}/inventory`).crumbs.map((c) => c.label)).toEqual([DONOR_BUILDINGS, 'Tiverne House', 'Inventory'])
    expect(pageLocation(s, viewer(U.tom), `/app/buildings/${TIVERNE_ID}`).crumbs[0]).toEqual({ label: 'Donor buildings', href: '/app/buildings' })
    expect(navModel(s, viewer(U.tom))!.sections.find((x) => x.id === 'buildings')!.title).toBe(DONOR_BUILDINGS)
    expect(pageLocation(s, viewer(U.dana), `/app/buildings/${TIVERNE_ID}`).crumbs[0].label).toBe('Appointments')
  })

  it("leads the owner's New project pages with New projects, as its sidebar section reads (review)", () => {
    const r = must(createOwnerProject(fresh(), actor(U.tom), { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: null }))
    expect(navModel(r.state, viewer(U.tom))!.sections.find((x) => x.id === 'new-projects')!.title).toBe(NEW_PROJECTS)
    expect(pageLocation(r.state, viewer(U.tom), `/app/projects/${r.value}`).crumbs).toEqual([
      { label: 'New projects', href: '/app/projects' },
      { label: 'Wexcombe House', href: null },
    ])
    // The list page it leads to carries the same heading and tab title.
    expect(projectsListView(r.state, viewer(U.tom)).title).toBe(NEW_PROJECTS)
    expect(pageLocation(r.state, viewer(U.tom), '/app/projects').title).toBe(NEW_PROJECTS)
    // The architect and the client keep Projects.
    expect(projectsListView(fresh(), viewer(U.priya)).title).toBe('Projects')
    expect(pageLocation(fresh(), viewer(U.priya), `/app/projects/${MERROWGATE_ID}`).crumbs[0].label).toBe('Projects')
    expect(pageLocation(fresh(), viewer(U.isla), `/app/projects/${MERROWGATE_ID}`).crumbs[0].label).toBe('Projects')
  })
})

describe('a new client sees no empty Projects heading (note 14)', () => {
  it('leaves out a section with nothing in it, and shows it once there is a project', () => {
    const r = signUpState(fresh(), { name: 'Rowan Hale', email: 'rowan.hale@hale.example', orgName: 'Hale Developments', orgType: 'client', salt: 's', passwordHash: 'h', now: NOW })
    expect(r.error).toBeNull()
    const nav = navModel(r.state, viewer(r.value!))!
    expect(nav.sections.every((x) => x.items.length > 0)).toBe(true)
    expect(nav.sections.map((x) => x.id)).not.toContain('projects')
    expect(navModel(fresh(), viewer(U.isla))!.sections.find((x) => x.id === 'projects')!.items.length).toBeGreaterThan(0)
  })
})

describe('the seed sits relative to the day the sandbox starts (note 17)', () => {
  it('moves Merrowgate Wharf by one day between a sandbox started on 16 and one started on 17 October, by design', () => {
    const on16 = firstRun('2026-10-16').world.projects[MERROWGATE_ID]
    const on17 = firstRun('2026-10-17').world.projects[MERROWGATE_ID]
    expect([on16.programme.siteStart, on16.startDate, on16.programme.practicalCompletion]).toEqual(['2027-11-10', '2028-04-12', '2029-07-08'])
    expect([on17.programme.siteStart, on17.startDate, on17.programme.practicalCompletion]).toEqual(['2027-11-11', '2028-04-13', '2029-07-09'])
  })
})
