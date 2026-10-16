// Round 2, project setup and timeline: the programme chart, requirements, setup checklist, client link requests,
// the sidebar item and route, and what an architect sees of a client that has not accepted. fresh() is the seed
// shifted by one day (today 8 October 2026).
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, NOW, U, viewer } from '../../test/fixtures'
import * as sel from '.'
import { createProject, decideClientLink, setProjectProgramme, setProjectRequirements, type NewProjectInput } from '../actions/projects'
import { saveToProject } from '../actions/shortlist'
import { signUpState } from '../actions/auth'
import { pageLocation } from './arch-breadcrumbs'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import { CONSTRUCTION_DAYS, PROGRAMME_PARAMETER_ROWS } from '../../domain/engines/programme'
import { REQUIREMENTS_NOTE } from '../../domain/reference/requirements'
import type { AppData } from '../types'

const base: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: ORG_IDS.halewick }

function corbel(s0: AppData = fresh(), input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(s0, actor(U.priya), { ...base, ...input }))
  return { state: r.state, id: r.value }
}

describe('programmeView', () => {
  it("draws Merrowgate Wharf's whole programme for Priya", () => {
    const v = sel.programmeView(fresh(), viewer(U.priya), MERROWGATE_ID, 'whole')!
    expect(v.range).toBe('whole')
    expect(v.stages).toHaveLength(8)
    expect(v.stages.filter((b) => b.state === 'current').map((b) => b.stage)).toEqual([2])
    expect(v.stages.filter((b) => b.state === 'past').map((b) => b.stage)).toEqual([0, 1])
    for (let i = 0; i < 7; i++) expect(Math.abs(v.stages[i].to - v.stages[i + 1].from)).toBeLessThan(1e-9)
    expect(v.stages[7]).toMatchObject({ end: null, weeksText: 'Ongoing', to: 1 })
    expect(v.stages[0]).toMatchObject({ label: 'Stage 0', name: 'Strategic Definition', weeksText: '13 weeks' })
    expect(v.check).toEqual({ status: 'on', label: 'On programme', text: '' })
    expect(v.plannedStageText).toBe('Today: stage 2, Concept Design')
    expect(v.milestones.map((m) => m.id)).toEqual(['site_start', 'materials', 'completion'])
    expect(v.materials).toHaveLength(4)
    for (const m of v.materials) {
      expect(m.from).toBeGreaterThanOrEqual(0)
      expect(m.to).toBeGreaterThanOrEqual(m.from)
      expect(m.to).toBeLessThanOrEqual(1)
      expect(m.href).toBe(`/app/marketplace/${m.publicId}?project=${MERROWGATE_ID}`)
      expect(m.windowShort).toMatch(/^(Available now|Expected [A-Z][a-z]{2}( \d{4})?( to [A-Z][a-z]{2})? \d{4})$/)
    }
    expect(v.today.at).toBeCloseTo(402 / 1855, 9)
    expect(v.axis).toMatchObject({ startText: 'September 2025', endText: 'September 2030', spanDays: 1855 })
    expect(v.axis.ticks.filter((t) => t.label).map((t) => t.label)).toEqual(['2026', '2027', '2028', '2029', '2030'])
    expect(v.axis.startLabel).toBe('Sep 2025')
    expect(v.source).toBe('set')
    expect(v.canEdit).toBe(true)
    expect(v.description).toContain('Today: stage 2, Concept Design')
  })

  it('from today starts this month', () => {
    const v = sel.programmeView(fresh(), viewer(U.priya), MERROWGATE_ID, 'ahead')!
    expect(v.axis.startText).toBe('October 2026')
    expect(v.axis.startLabel).toBe('Oct 2026')
    expect(v.stages[0].from).toBe(0)
    expect(v.stages.find((b) => b.state === 'current')!.from).toBe(0)
  })

  it('leaves materials out of the milestones when they are needed at site start', () => {
    const { state, id } = corbel()
    const v = sel.programmeView(state, viewer(U.priya), id)!
    expect(v.milestones.map((m) => m.id)).toEqual(['site_start', 'completion'])
    expect(v.source).toBe('suggested')
    expect(v.materials).toEqual([])
  })

  it('compares the declared stage with the planned one', () => {
    const s = fresh()
    const behind = { ...s, world: { ...s.world, projects: { ...s.world.projects, [MERROWGATE_ID]: { ...s.world.projects[MERROWGATE_ID], ribaStage: 1 } } } }
    expect(sel.programmeView(behind, viewer(U.priya), MERROWGATE_ID)!.check).toEqual({ status: 'behind', label: 'Behind programme', text: 'Planned stage 2 today. The project is at stage 1.' })
    const ahead = { ...s, world: { ...s.world, projects: { ...s.world.projects, [MERROWGATE_ID]: { ...s.world.projects[MERROWGATE_ID], ribaStage: 3 } } } }
    expect(sel.programmeView(ahead, viewer(U.priya), MERROWGATE_ID)!.check.text).toBe('The project is at stage 3, ahead of the planned stage 2.')
  })

  it('is for people on the project; only the architect edits', () => {
    const s = fresh()
    expect(sel.programmeView(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
    expect(sel.programmeView(s, viewer(U.isla), SALLOW_ID)).toBeNull()
    expect(sel.programmeView(s, viewer(U.isla), MERROWGATE_ID)!.canEdit).toBe(false)
    expect(sel.programmeView(s, viewer(U.marcus), MERROWGATE_ID)!.canEdit).toBe(false)
    expect(sel.programmeForm(s, viewer(U.isla), MERROWGATE_ID)).toBeNull()
    const form = sel.programmeForm(s, viewer(U.priya), MERROWGATE_ID)!
    expect(form.ribaStage).toBe(2)
    expect(form.stageOptions).toHaveLength(8)
    expect(form.startDate).toBe(s.world.projects[MERROWGATE_ID].startDate)
  })

  it('summarises a programme for the cross-project timelines', () => {
    const s = fresh()
    const sum = sel.projectProgrammeSummary(s.world.projects[FERRYMOOR_ID], '2026-10-08')
    expect(sum).toMatchObject({ projectId: FERRYMOOR_ID, name: 'Ferrymoor Yard', plannedStage: 3, declaredStage: 3, source: 'set' })
    expect(sum.stages).toHaveLength(8)
  })
})

describe('requirements views', () => {
  it('offers the choices for a location with the suggested ones and the note', () => {
    const c = sel.requirementChoices('Central London', 'Camden', ['lp-si7'])
    expect(c.groups.map((g) => g.level)).toEqual(['national', 'london', 'local'])
    expect(c.suggestedIds).toContain('la-camden-cc1')
    expect(c.note).toBe(REQUIREMENTS_NOTE)
    const si7 = c.groups[1].rows.find((r) => r.id === 'lp-si7')!
    expect(si7).toMatchObject({ code: 'Policy SI 7', title: 'Reducing waste and supporting the circular economy', kindLabel: 'Planning policy', selected: true, suggested: true })
  })

  it("shows a project's chosen requirements to everyone on it; the architect edits", () => {
    const s = fresh()
    const v = sel.projectRequirementsView(s, viewer(U.priya), MERROWGATE_ID)!
    expect(v.locationText).toBe('Newham, Inner London East')
    expect(v.selected.map((r) => r.id)).toEqual(s.world.projects[MERROWGATE_ID].planningRequirementIds)
    expect(v.reviewed).toBe(true)
    expect(v.canEdit).toBe(true)
    expect(sel.projectRequirementsView(s, viewer(U.isla), MERROWGATE_ID)!.canEdit).toBe(false)
    expect(sel.projectRequirementsView(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })

  it('lists the programme placeholders and the references in Help, Methodology', () => {
    const m = sel.methodologyView()
    expect(m.groups.find((g) => g.group === 'Programme suggestions')!.rows).toEqual(PROGRAMME_PARAMETER_ROWS)
    expect(m.references.length).toBeGreaterThan(10)
    expect(m.references.every((r) => r.status === 'Indicative summary')).toBe(true)
  })
})

describe('projectSetup', () => {
  it('is hidden on the seeded projects', () => {
    const s = fresh()
    for (const id of [MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID]) expect(sel.projectSetup(s, viewer(U.priya), id)!.visible).toBe(false)
    expect(sel.projectSetup(s, viewer(U.isla), MERROWGATE_ID)).toBeNull()
  })

  it('walks a new project through its steps', () => {
    const { state, id } = corbel()
    const setup = sel.projectSetup(state, viewer(U.priya), id)!
    expect(setup.steps.map((x) => [x.id, x.state])).toEqual([
      ['programme', 'current'],
      ['client', 'waiting'],
      ['requirements', 'todo'],
      // Round 2 follow-up (audit of 16 October, note C2): the consultancy named on the form waits to be asked
      // until the client accepts, so the step waits instead of reading done.
      ['consultant', 'waiting'],
      ['shortlist', 'todo'],
      ['send', 'waiting'],
    ])
    expect([setup.done, setup.total, setup.visible]).toEqual([0, 6, true])
    expect(setup.steps.find((x) => x.id === 'consultant')!.text).toBe('Halewick Sustainability is asked once the client accepts.')
    expect(setup.nextText).toBe('Next: check the programme')
    expect(setup.focusId).toBe('programme')
    expect(setup.steps.map((x) => x.short)).toEqual(['Programme', 'Client', 'Requirements', 'Consultant', 'Shortlist', 'Send'])
    // The Indicative marker beside the step says it once; the text does not repeat it.
    expect(setup.steps[0].text).toBe('Suggested from your site start and typical stage lengths. Confirm the dates or edit them.')
    expect(setup.steps[0].action).toEqual({ label: 'Edit programme', href: null, intent: 'edit_programme' })
    expect(setup.steps[0].secondary).toEqual({ label: 'Keep these dates', intent: 'keep_programme' })
    expect(setup.steps.filter((x) => x.optional).map((x) => x.id)).toEqual(['requirements', 'consultant'])
    const p = state.world.projects[id]
    const kept = must(setProjectProgramme(state, actor(U.priya), id, { ribaStage: p.ribaStage, programme: p.programme, startDate: p.startDate })).state
    const after = sel.projectSetup(kept, viewer(U.priya), id)!
    expect(after.steps.find((x) => x.state === 'current')!.id).toBe('requirements')
    expect(after.nextText).toBe('Next: choose planning and sustainability requirements')
    expect(after.focusId).toBe('requirements')
  })

  it('flags a declined client, and hides once programme, client and shortlist are done', () => {
    const { state, id } = corbel()
    const declined = must(decideClientLink(state, actor(U.isla), id, 'declined', '')).state
    expect(sel.projectSetup(declined, viewer(U.priya), id)!.steps[1]).toMatchObject({ state: 'attention', action: { label: 'Ask again', intent: 'change_client' } })
    // The programme step still comes first, so it leads; the declined client is flagged in its own tile.
    expect(sel.projectSetup(declined, viewer(U.priya), id)!.focusId).toBe('programme')
    let s = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    const p = s.world.projects[id]
    s = must(setProjectProgramme(s, actor(U.priya), id, { ribaStage: p.ribaStage, programme: p.programme, startDate: p.startDate })).state
    expect(sel.projectSetup(s, viewer(U.priya), id)!.steps.find((x) => x.id === 'send')!.state).toBe('todo')
    s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', id)).state
    expect(sel.projectSetup(s, viewer(U.priya), id)!.visible).toBe(false)
  })

  it('leads with the waiting client once everything the architect can do is done', () => {
    const { state, id } = corbel()
    const p = state.world.projects[id]
    let s = must(setProjectProgramme(state, actor(U.priya), id, { ribaStage: p.ribaStage, programme: p.programme, startDate: p.startDate })).state
    s = must(setProjectRequirements(s, actor(U.priya), id, [])).state
    s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', id)).state
    const setup = sel.projectSetup(s, viewer(U.priya), id)!
    expect(setup.steps.map((x) => [x.id, x.state])).toEqual([
      ['programme', 'done'],
      ['client', 'waiting'],
      ['requirements', 'done'],
      // Round 2 follow-up (audit of 16 October, note C2): the consultancy named on the form waits to be asked
      // until the client accepts, so the step waits instead of reading done.
      ['consultant', 'waiting'],
      ['shortlist', 'done'],
      ['send', 'waiting'],
    ])
    expect(setup.visible).toBe(true)
    expect(setup.focusId).toBe('client')
  })

  it('shows on the projects list for the architect while it is visible', () => {
    const { state, id } = corbel()
    const row = sel.projectsListView(state, viewer(U.priya)).rows.find((r) => r.id === id)!
    // Round 2 follow-up (note C2): the consultant step waits for the client, so none of the six is done yet.
    expect(row.setup).toEqual({ done: 0, total: 6, nextText: 'Next: check the programme' })
    expect(row.linkStatus).toBe('pending')
    expect(sel.projectsListView(state, viewer(U.priya)).rows.find((r) => r.id === MERROWGATE_ID)!.setup).toBeNull()
    // Round 2 follow-up (note C2): Marcus has no row for the project at all until Lantern Quay and Halewick accept,
    // which is stricter than a row with no setup.
    expect(sel.projectsListView(state, viewer(U.marcus)).rows.find((r) => r.id === id)).toBeUndefined()
  })
})

describe('the client link', () => {
  it('Isla sees a pending request, then it moves to answered', () => {
    const { state, id } = corbel(fresh(), { clientMessage: 'Our new scheme in Hackney.' })
    const before = sel.clientLinkRequests(state, viewer(U.isla))!
    expect(before.pending).toHaveLength(1)
    expect(before.pending[0]).toMatchObject({ projectId: id, projectName: 'Corbel Yard', architectName: 'Studio Oriel', requestedBy: 'Priya Nair', requestedText: '8 October 2026', message: 'Our new scheme in Hackney.', typeLabel: 'Residential', locationText: 'Hackney, Inner London East', stageText: 'RIBA Stage 2, Concept Design', siteStartText: '6 September 2027', status: 'pending', href: null })
    expect(before.answered).toEqual([])
    const after = sel.clientLinkRequests(must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state, viewer(U.isla))!
    expect(after.pending).toEqual([])
    expect(after.answered).toHaveLength(1)
    expect(after.answered[0]).toMatchObject({ status: 'accepted', statusText: 'Accepted 8 October 2026', href: `/app/projects/${id}` })
    expect(sel.clientLinkRequests(state, viewer(U.priya))).toBeNull()
    expect(sel.clientLinkRequests(fresh(), viewer(U.isla))).toEqual({ pending: [], answered: [] })
  })

  it('gives the architect the client organisation only, until it accepts', () => {
    const { state, id } = corbel()
    // Round 2 follow-up (audit note C3): the view also carries the invite to a client nobody uses yet; none here.
    expect(sel.clientLinkView(state, viewer(U.priya), id)).toEqual({ status: 'pending', clientName: 'Lantern Quay Developments', clientHasMembers: true, requestedText: 'Asked on 8 October 2026', decidedText: null, note: null, canChange: true, invite: null })
    const declined = must(decideClientLink(state, actor(U.isla), id, 'declined', 'Not for us.')).state
    expect(sel.clientLinkView(declined, viewer(U.priya), id)).toMatchObject({ status: 'declined', decidedText: 'Declined on 8 October 2026', note: 'Not for us.' })
    expect(sel.clientLinkView(state, viewer(U.marcus), id)).toBeNull()
    expect(sel.clientLinkView(fresh(), viewer(U.priya), MERROWGATE_ID)).toBeNull()
    const newClient = corbel(fresh(), { name: 'Wexcombe House', client: { name: 'Reed Holdings' } })
    expect(sel.clientLinkView(newClient.state, viewer(U.priya), newClient.id)!.clientHasMembers).toBe(false)
  })

  it('the overview carries the programme, requirements, setup and link, and holds sending until the client accepts', () => {
    const { state, id } = corbel()
    const saved = must(saveToProject(state, actor(U.priya), 'L-9F4CQQ', id)).state
    const o = sel.projectOverview(saved, viewer(U.priya), id)!
    expect(o.programme.stages).toHaveLength(8)
    expect(o.requirements.reviewed).toBe(false)
    expect(o.setup!.visible).toBe(true)
    expect(o.link!.status).toBe('pending')
    expect(o.nextSteps.some((x) => x.id === 'send')).toBe(false)
    expect(o.activityTotal).toBe(sel.activityFor(saved, viewer(U.priya), { projectId: id }, 1000).length)
    const accepted = must(decideClientLink(saved, actor(U.isla), id, 'accepted', '')).state
    const o2 = sel.projectOverview(accepted, viewer(U.priya), id)!
    expect(o2.link).toBeNull()
    expect(o2.nextSteps.some((x) => x.id === 'send')).toBe(true)
    expect(sel.projectOverview(fresh(), viewer(U.isla), MERROWGATE_ID)!.setup).toBeNull()
  })

  it("the sidebar shows Project requests while one waits, and the route is the client's", () => {
    const { state, id } = corbel()
    const items = (s: AppData) => sel.navModel(s, viewer(U.isla))!.sections[1].items
    const req = items(state).find((i) => i.id === 'project-requests')!
    expect(req).toMatchObject({ label: 'Project requests', href: '/app/projects/requests', icon: 'Inbox', badge: 1 })
    // Round 2 (BRIEF 14.2): Kilnworth Place is seeded as Lantern Quay's second project.
    expect(items(state).map((i) => i.label)).toEqual(['Kilnworth Place', 'Merrowgate Wharf', 'Project requests'])
    const answered = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    expect(items(answered).map((i) => i.label)).toEqual(['Corbel Yard', 'Kilnworth Place', 'Merrowgate Wharf'])
    // With nothing waiting, the answered request is still a click away from the projects list.
    expect(sel.projectsListView(fresh(), viewer(U.isla)).requestsHref).toBeNull()
    expect(sel.projectsListView(state, viewer(U.isla)).requestsHref).toBe('/app/projects/requests')
    expect(sel.projectsListView(answered, viewer(U.isla)).requestsHref).toBe('/app/projects/requests')
    expect(sel.projectsListView(answered, viewer(U.priya)).requestsHref).toBeNull()
    expect(sel.routeAccess(state, viewer(U.isla), '/app/projects/requests')).toBe('ok')
    expect(sel.routeAccess(state, viewer(U.isla), '/app/projects/requests/x')).toBe('not_found')
    expect(sel.routeAccess(state, viewer(U.priya), '/app/projects/requests')).toBe('forbidden')
    expect(sel.routeAccess(state, viewer(U.tom), '/app/projects/requests')).toBe('forbidden')
    expect(sel.routeAccess(state, viewer(U.isla), `/app/projects/${id}`)).toBe('forbidden')
    expect(pageLocation(state, viewer(U.isla), '/app/projects/requests')).toEqual({ crumbs: [{ label: 'Projects', href: '/app/projects' }, { label: 'Project requests', href: null }], title: 'Project requests' })
    expect(sel.hrefForReader(state, U.isla, '/app/projects/requests')).toBe('/app/projects/requests')
    expect(sel.hrefForReader(state, U.priya, '/app/projects/requests')).toBeNull()
    const n = sel.inboxView(state, viewer(U.isla)).groups[0].items[0]
    expect(n).toMatchObject({ title: 'Studio Oriel asked to add you as client on Corbel Yard', href: '/app/projects/requests', kind: 'team' })
    expect(sel.notificationSettings(state, viewer(U.isla)).find((x) => x.kind === 'team')!.description).toBe('Someone joins your organisation, an architect asks to add you to a project, or a client answers your request.')
  })

  it("hides the client's people from an architect until the client accepts", () => {
    const s0 = fresh()
    const jo = must(signUpState(s0, { name: 'Jo Park', email: 'jo@park.example', orgName: 'Park Studio', orgType: 'Architect', salt: 's', passwordHash: 'h', now: NOW }))
    const created = must(createProject(jo.state, actor(jo.value), { ...base, consultantOrgId: null }))
    const id = created.value
    const v = viewer(jo.value)
    for (const view of [sel.projectTeam(created.state, v, id), sel.projectHeader(created.state, v, id), sel.projectOverview(created.state, v, id)]) {
      const text = JSON.stringify(view)
      expect(text).not.toContain('Isla Brennan')
      expect(text).not.toContain('isla.brennan@lanternquay.example')
    }
    const team = sel.projectTeam(created.state, v, id)!
    expect(team.sections[0]).toMatchObject({ roleLabel: 'Client', orgName: 'Lantern Quay Developments', members: [], pending: true })
    expect(sel.projectHeader(created.state, v, id)!.linkStatus).toBe('pending')
    const accepted = must(decideClientLink(created.state, actor(U.isla), id, 'accepted', '')).state
    const after = sel.projectTeam(accepted, v, id)!
    expect(after.sections[0].pending).toBe(false)
    expect(after.sections[0].members.map((m) => m.name)).toContain('Isla Brennan')
    expect(sel.projectHeader(accepted, v, id)!.team.map((t) => t.name)).toContain('Isla Brennan')
  })
})

describe('project header, list and options', () => {
  it('adds the programme facts to the header', () => {
    const h = sel.projectHeader(fresh(), viewer(U.priya), MERROWGATE_ID)!
    expect(h).toMatchObject({ siteStartText: '2 November 2027', completionText: '30 June 2029', plannedStageText: 'Today: stage 2, Concept Design', linkStatus: 'accepted' })
  })

  it('shows the description of an Other type to the team', () => {
    const { state, id } = corbel(fresh(), { projectType: 'other', projectTypeOther: 'Data centre' })
    expect(sel.projectHeader(state, viewer(U.priya), id)!.typeLabel).toBe('Data centre')
  })

  it('offers thirteen types, the dates the form needs and each region authorities', () => {
    const o = sel.newProjectOptions(fresh(), viewer(U.priya))!
    expect(o.types).toHaveLength(13)
    expect(o.types[o.types.length - 1]).toEqual({ value: 'other', label: 'Other' })
    expect(o.today).toBe('2026-10-08')
    expect(o.typicalCompletionDays).toBe(CONSTRUCTION_DAYS)
    // Changed 16 October 2026 (recording audit, notes 20 and C7): the choices also carry every authority by region, this region first.
    const central = sel.localAuthorityChoices('Central London')
    expect(central).toMatchObject({ options: ['City of London', 'Westminster', 'Camden', 'Islington', 'Kensington and Chelsea', 'Lambeth', 'Southwark'], allowsOther: false, london: true })
    expect(central.groups[0]).toEqual({ label: 'Central London', items: central.options })
    expect(central.groups.map((g) => g.label)).toHaveLength(15)
    expect(central.groups.flatMap((g) => g.items)).toContain('Merton')
    expect(sel.localAuthorityChoices('South East')).toMatchObject({ allowsOther: true, london: false })
  })
})
