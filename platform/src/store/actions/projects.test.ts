import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U } from '../../test/fixtures'
import { acceptTerms, createProject, decideClientLink, editSpecClauseNote, editSpecHeader, PROJECT_ERRORS, projectRecord, requestClientLink, setProjectConsultant, setProjectProgramme, setProjectRequirements, updateProject, validateNewProject, type NewProjectInput } from './projects'
import { saveToProject, sendToClient, SHORTLIST_ERRORS } from './shortlist'
import { projectWishlist } from '../lots'
import { ERRORS, projectsOfUser } from '../access'
import { PROGRAMME_ERRORS } from '../../domain/engines/programme'
import type { AppData } from '../types'
import { FERRYMOOR_ID, MERROWGATE_ID, ORG_IDS, SALLOW_ID } from '../../domain/seed/world'
import { V1_ASSUMPTIONS } from '../../domain/reference/v1assumptions'

const base: NewProjectInput = { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: ORG_IDS.halewick }

describe('createProject', () => {
  it('builds a full project with an empty shortlist, reusing a developer client by name', () => {
    const s0 = fresh()
    const r = must(createProject(s0, actor(U.priya), base))
    const p = r.state.world.projects[r.value]
    expect(r.value).toMatch(/^prj_[a-z0-9]{6}$/)
    expect(p.clientOrgId).toBe(ORG_IDS.lantern)
    expect(p.architectOrgId).toBe(ORG_IDS.oriel)
    expect(p.blind).toEqual({ orgType: 'Design team', projectType: 'residential project' })
    expect(p.keyDates).toEqual({ planningSubmission: '2027-09-06', steelNeedBy: '2027-09-06' })
    expect(p.hubDistancesKm).toEqual(V1_ASSUMPTIONS.regionHubKm['Inner London East'])
    expect(p.ribaStage).toBe(2)
    expect(projectWishlist(r.state.world, r.value)!.items).toEqual([])
    // Spec change, review of 14 October 2026: Lantern Quay is asked to accept, and Isla does not see the project until it does.
    const asked = r.state.notifications.find((n) => n.orgId === ORG_IDS.lantern && n.kind === 'team')!
    expect(asked.title).toBe('Studio Oriel asked to add you as client on Corbel Yard')
    expect(asked.href).toBe('/app/projects/requests')
    expect(p.clientLink.status).toBe('pending')
    expect(projectsOfUser(r.state, U.isla).map((x) => x.id)).not.toContain(r.value)
    expect(r.state.notifications.some((n) => n.orgId === ORG_IDS.halewick)).toBe(true)
  })

  it('creates a new client organisation for a new name, and never reuses a seller', () => {
    const s0 = fresh()
    const r = must(createProject(s0, actor(U.priya), { ...base, client: { name: 'Ostlea Estates' } }))
    const p = r.state.world.projects[r.value]
    expect(p.clientOrgId).not.toBe(ORG_IDS.ostlea)
    expect(r.state.world.orgs[p.clientOrgId]).toEqual({ id: p.clientOrgId, name: 'Ostlea Estates', type: 'Developer' })
  })

  it('validates every field', () => {
    expect(validateNewProject({ ...base, name: ' ', projectType: null, region: 'Mars', ribaStage: 9, startDate: '2026-02-30' }, '2026-10-08').map((x) => x[0])).toEqual(['name', 'projectType', 'region', 'ribaStage', 'startDate'])
    expect(validateNewProject({ ...base, startDate: '2026-10-01' }, '2026-10-08')).toEqual([['startDate', PROJECT_ERRORS.pastDate]])
    const s0 = fresh()
    refused(s0, createProject(s0, actor(U.priya), { ...base, name: 'Merrowgate Wharf' }), PROJECT_ERRORS.duplicateName)
    refused(s0, createProject(s0, actor(U.priya), { ...base, client: { name: 'Studio Oriel' } }), PROJECT_ERRORS.clientNotBuyer)
    refused(s0, createProject(s0, actor(U.priya), { ...base, client: { orgId: ORG_IDS.ostlea } }), PROJECT_ERRORS.clientNotBuyer)
    refused(s0, createProject(s0, actor(U.priya), { ...base, consultantOrgId: ORG_IDS.ostlea }), PROJECT_ERRORS.consultant)
    refused(s0, createProject(s0, actor(U.isla), base), ERRORS.role)
  })

  it('an existing client of the practice can be chosen by ID', () => {
    const s0 = fresh()
    const r = must(createProject(s0, actor(U.priya), { ...base, client: { orgId: ORG_IDS.quillon }, consultantOrgId: null }))
    expect(r.state.world.projects[r.value].clientOrgId).toBe(ORG_IDS.quillon)
    expect(r.state.world.projects[r.value].consultantOrgId).toBe('')
  })
})

describe('project edits, terms, consultant and specification notes', () => {
  it('a new start date moves the need-by date the seller sees', () => {
    const s0 = fresh()
    const r = must(updateProject(s0, actor(U.priya), SALLOW_ID, { startDate: '2028-03-06', ribaStage: 2 }))
    expect(r.state.world.projects[SALLOW_ID].keyDates.steelNeedBy).toBe('2028-03-06')
    expect(r.state.world.projects[SALLOW_ID].ribaStage).toBe(2)
    refused(s0, updateProject(s0, actor(U.isla), MERROWGATE_ID, { name: 'X' }), ERRORS.role)
    refused(s0, updateProject(s0, actor(U.priya), SALLOW_ID, { name: 'Ferrymoor Yard' }), PROJECT_ERRORS.duplicateName)
  })

  it('terms are accepted once per project, by the architect or the client', () => {
    const s0 = fresh()
    const r = must(acceptTerms(s0, actor(U.priya), FERRYMOOR_ID))
    expect(r.state.world.projects[FERRYMOOR_ID].termsAccepted).toBe(true)
    expect(acceptTerms(r.state, actor(U.priya), FERRYMOOR_ID).state).toBe(r.state)
    refused(s0, acceptTerms(s0, actor(U.marcus), FERRYMOOR_ID), ERRORS.role)
    must(acceptTerms(s0, actor(U.isla), MERROWGATE_ID))
  })

  it('the architect sets or clears the consultant', () => {
    const s0 = fresh()
    const r = must(setProjectConsultant(s0, actor(U.priya), SALLOW_ID, null))
    expect(r.state.world.projects[SALLOW_ID].consultantOrgId).toBe('')
    expect(r.state.world.projects[SALLOW_ID].teamOrgIds).toEqual([ORG_IDS.oriel])
    refused(s0, setProjectConsultant(s0, actor(U.priya), SALLOW_ID, ORG_IDS.lantern), PROJECT_ERRORS.consultant)
  })

  it('specification notes belong to the architect', () => {
    const s0 = fresh()
    let s = must(editSpecHeader(s0, actor(U.priya), MERROWGATE_ID, 'Issued for stage 2 review.')).state
    s = must(editSpecClauseNote(s, actor(U.priya), MERROWGATE_ID, 'L-NHZ32R', 'Engineer to confirm splice details.')).state
    expect(s.specs[MERROWGATE_ID].header).toBe('Issued for stage 2 review.')
    expect(s.specs[MERROWGATE_ID].clauseNotes['L-NHZ32R']).toBe('Engineer to confirm splice details.')
    s = must(editSpecClauseNote(s, actor(U.priya), MERROWGATE_ID, 'L-NHZ32R', '')).state
    expect(s.specs[MERROWGATE_ID].clauseNotes).toEqual({})
    refused(s0, editSpecHeader(s0, actor(U.isla), MERROWGATE_ID, 'x'), ERRORS.role)
  })
})

/** Priya creates Corbel Yard for Lantern Quay Developments. */
function corbel(input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(fresh(), actor(U.priya), { ...base, ...input }))
  return { state: r.state, id: r.value }
}

describe('createProject: programme, requirements, type and location', () => {
  it('suggests the programme from today, the stage and site start', () => {
    const { state, id } = corbel()
    expect(state.world.projects[id].programme).toEqual({ stageStarts: ['2026-07-16', '2026-08-13', '2026-10-08', '2026-12-30', '2027-04-20'], siteStart: '2027-09-06', practicalCompletion: '2029-02-27', source: 'suggested' })
    expect(state.world.projects[id].startDate).toBe('2027-09-06')
    const later = corbel({ siteStart: '2027-09-06', startDate: '2027-11-01', practicalCompletion: '2029-01-05' })
    expect(later.state.world.projects[later.id].programme.siteStart).toBe('2027-09-06')
    expect(later.state.world.projects[later.id].programme.practicalCompletion).toBe('2029-01-05')
    expect(later.state.world.projects[later.id].keyDates.steelNeedBy).toBe('2027-11-01')
  })

  it('keeps only the requirements that apply to the location', () => {
    const none = corbel()
    expect(none.state.world.projects[none.id].planningRequirementIds).toEqual([])
    expect(none.state.world.projects[none.id].requirementsReviewed).toBe(false)
    const some = corbel({ requirementIds: ['la-camden-cc1', 'lp-si7', 'nppf', 'lp-si7'] })
    expect(some.state.world.projects[some.id].planningRequirementIds).toEqual(['nppf', 'lp-si7'])
    expect(some.state.world.projects[some.id].requirementsReviewed).toBe(true)
  })

  it('keeps the type description only for Other, and never gives it to the seller', () => {
    const other = corbel({ projectType: 'other', projectTypeOther: '  Rooftop lido and spa  ' })
    expect(other.state.world.projects[other.id].projectTypeOther).toBe('Rooftop lido and spa')
    expect(other.state.world.projects[other.id].blind).toEqual({ orgType: 'Design team', projectType: 'other project' })
    const mixed = corbel({ projectType: 'mixed_use', projectTypeOther: 'Ignored' })
    expect(mixed.state.world.projects[mixed.id].projectTypeOther).toBe('')
    expect(mixed.state.world.projects[mixed.id].blind.projectType).toBe('mixed use project')
  })

  it('refuses a local authority outside the region, and a site start too soon for the remaining stages', () => {
    const s0 = fresh()
    refused(s0, createProject(s0, actor(U.priya), { ...base, localAuthority: 'Camden' }), PROJECT_ERRORS.localAuthority)
    expect(validateNewProject({ ...base, localAuthority: 'Camden' }, '2026-10-08')).toEqual([['localAuthority', PROJECT_ERRORS.localAuthority]])
    expect(validateNewProject({ ...base, region: 'South East', localAuthority: 'St Albans' }, '2026-10-08')).toEqual([])
    refused(s0, createProject(s0, actor(U.priya), { ...base, startDate: '2026-10-09' }), PROGRAMME_ERRORS.tooSoon)
    expect(validateNewProject({ ...base, startDate: '2026-10-09' }, '2026-10-08')).toEqual([['siteStart', PROGRAMME_ERRORS.tooSoon]])
  })

  it('needs materials between site start and practical completion', () => {
    expect(validateNewProject({ ...base, siteStart: '2027-10-04' }, '2026-10-08')).toEqual([['startDate', PROGRAMME_ERRORS.materials]])
    expect(validateNewProject({ ...base, practicalCompletion: '2027-09-06' }, '2026-10-08')).toEqual([['practicalCompletion', PROGRAMME_ERRORS.completion]])
    expect(validateNewProject({ ...base, siteStart: '2027-02-30' }, '2026-10-08')).toEqual([['siteStart', PROJECT_ERRORS.badDate]])
  })

  it('logs the creation to the practice and the consultant, and the request to the client only', () => {
    const { state, id } = corbel()
    const created = state.activity.find((e) => e.projectId === id && e.text === 'created the project')!
    expect(created.orgIds).toEqual([ORG_IDS.oriel, ORG_IDS.halewick])
    const asked = state.activity.find((e) => e.text === 'asked to add you as client on Corbel Yard')!
    expect(asked).toMatchObject({ orgIds: [ORG_IDS.lantern], projectId: null, actor: 'Priya Nair', href: '/app/projects/requests' })
    expect(state.notifications.find((n) => n.orgId === ORG_IDS.lantern && n.kind === 'team')!.body).toBe('Accept to see the project and approve materials for it.')
    const withNote = corbel({ clientMessage: 'Our new scheme in Hackney.' })
    expect(withNote.state.notifications.find((n) => n.orgId === ORG_IDS.lantern && n.kind === 'team')!.body).toBe('Priya Nair: Our new scheme in Hackney.')
    expect(withNote.state.world.projects[withNote.id].clientLink.message).toBe('Our new scheme in Hackney.')
  })

  it('projectRecord builds the record the action stores', () => {
    const { state, id } = corbel()
    const p = state.world.projects[id]
    const rebuilt = projectRecord({
      id,
      name: p.name,
      clientOrgId: p.clientOrgId,
      architectOrgId: p.architectOrgId,
      createdByPersonaId: p.createdBy!,
      consultantOrgId: p.consultantOrgId,
      projectType: p.projectType,
      projectTypeOther: '',
      region: p.region,
      localAuthority: p.localAuthority,
      ribaStage: p.ribaStage,
      startDate: p.startDate,
      programme: p.programme,
      clientLink: p.clientLink,
      requirementIds: [],
      description: '',
    })
    expect(rebuilt).toEqual(p)
  })
})

describe('decideClientLink', () => {
  it('Isla accepts: she sees the project, the practice is told and the activity reaches Lantern Quay', () => {
    const { state, id } = corbel()
    const r = must(decideClientLink(state, actor(U.isla), id, 'accepted', ''))
    expect(r.state.world.projects[id].clientLink).toMatchObject({ status: 'accepted', decidedOn: '2026-10-08' })
    expect(projectsOfUser(r.state, U.isla).map((x) => x.id)).toContain(id)
    const told = r.state.notifications.find((n) => n.orgId === ORG_IDS.oriel && n.title === 'Lantern Quay Developments accepted Corbel Yard')!
    expect(told.href).toBe(`/app/projects/${id}`)
    expect(r.state.activity.find((e) => e.projectId === id && e.text === 'accepted the project as client')!.orgIds).toContain(ORG_IDS.lantern)
  })

  it('answers once, and only the client organisation answers', () => {
    const { state, id } = corbel()
    const r = must(decideClientLink(state, actor(U.isla), id, 'accepted', ''))
    refused(r.state, decideClientLink(r.state, actor(U.isla), id, 'declined', ''), PROJECT_ERRORS.notPending)
    for (const who of [U.priya, U.tom, U.marcus]) refused(state, decideClientLink(state, actor(who), id, 'accepted', ''), ERRORS.role)
    refused(state, decideClientLink(state, actor(U.isla), 'prj_nothere', 'accepted', ''), ERRORS.noProject)
  })

  it('a decline reaches the architect under the organisation, with the note and no person', () => {
    const { state, id } = corbel()
    const r = must(decideClientLink(state, actor(U.isla), id, 'declined', 'We have another practice on this.'))
    expect(r.state.world.projects[id].clientLink).toMatchObject({ status: 'declined', decisionNote: 'We have another practice on this.' })
    const told = r.state.notifications.find((n) => n.orgId === ORG_IDS.oriel && n.title === 'Lantern Quay Developments declined Corbel Yard')!
    expect(told.body).toBe('Their note: We have another practice on this.')
    expect(JSON.stringify(told)).not.toContain('Isla')
    const line = r.state.activity.find((e) => e.text === 'declined the project')!
    expect(line).toMatchObject({ actor: 'Lantern Quay Developments', actorUserId: null, orgIds: [ORG_IDS.oriel] })
    expect(projectsOfUser(r.state, U.isla).map((x) => x.id)).not.toContain(id)
    const plain = must(decideClientLink(state, actor(U.isla), id, 'declined', ''))
    expect(plain.state.notifications.find((n) => n.title === 'Lantern Quay Developments declined Corbel Yard')!.body).toBe('Ask again or choose another client from the project overview.')
  })
})

describe('requestClientLink', () => {
  it('after a decline the architect asks another client, or the same one again', () => {
    const { state, id } = corbel()
    const declined = must(decideClientLink(state, actor(U.isla), id, 'declined', '')).state
    const quillon = must(requestClientLink(declined, actor(U.priya), id, { orgId: ORG_IDS.quillon }, 'Would you take this on?')).state
    expect(quillon.world.projects[id].clientOrgId).toBe(ORG_IDS.quillon)
    expect(quillon.world.projects[id].developerOrgId).toBe(ORG_IDS.quillon)
    expect(quillon.world.projects[id].clientLink).toMatchObject({ status: 'pending', message: 'Would you take this on?' })
    expect(quillon.notifications[0]).toMatchObject({ orgId: ORG_IDS.quillon, title: 'Studio Oriel asked to add you as client on Corbel Yard' })
    expect(quillon.activity.some((e) => e.text === 'asked Quillon Homes to join as client' && e.orgIds.includes(ORG_IDS.oriel) && !e.orgIds.includes(ORG_IDS.quillon))).toBe(true)
    refused(quillon, requestClientLink(quillon, actor(U.priya), id, { orgId: ORG_IDS.quillon }, ''), PROJECT_ERRORS.alreadyPending)
    const again = must(requestClientLink(declined, actor(U.priya), id, { orgId: ORG_IDS.lantern }, ''))
    expect(again.state.world.projects[id].clientLink.status).toBe('pending')
  })

  it('cannot change a client that accepted, and only the architect asks', () => {
    const { state, id } = corbel()
    refused(state, requestClientLink(state, actor(U.priya), id, { orgId: ORG_IDS.lantern }, ''), PROJECT_ERRORS.alreadyPending)
    const accepted = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    refused(accepted, requestClientLink(accepted, actor(U.priya), id, { orgId: ORG_IDS.quillon }, ''), PROJECT_ERRORS.linked)
    refused(state, requestClientLink(state, actor(U.marcus), id, { orgId: ORG_IDS.quillon }, ''), ERRORS.role)
  })

  it('a new client name gets a new client organisation', () => {
    const { state, id } = corbel()
    const r = must(requestClientLink(state, actor(U.priya), id, { name: 'Reed Holdings' }, ''))
    const org = r.state.world.orgs[r.state.world.projects[id].clientOrgId]
    expect(org).toMatchObject({ name: 'Reed Holdings', type: 'Developer' })
  })
})

describe('sending for approval waits for the client', () => {
  it('is refused while the link is pending and works once accepted', () => {
    const { state, id } = corbel()
    const saved = must(saveToProject(state, actor(U.priya), 'L-9F4CQQ', id)).state
    refused(saved, sendToClient(saved, actor(U.priya), id, null, ''), SHORTLIST_ERRORS.clientNotLinked)
    const accepted = must(decideClientLink(saved, actor(U.isla), id, 'accepted', '')).state
    expect(must(sendToClient(accepted, actor(U.priya), id, null, '')).value).toBe(1)
  })
})

describe('setProjectProgramme', () => {
  it('sets the programme, refuses materials outside it and changes nothing for the same input', () => {
    const { state, id } = corbel()
    const p = state.world.projects[id]
    const input = { ribaStage: 2, programme: { stageStarts: p.programme.stageStarts, siteStart: p.programme.siteStart, practicalCompletion: p.programme.practicalCompletion }, startDate: '2027-10-04' }
    const r = must(setProjectProgramme(state, actor(U.priya), id, input))
    const next = r.state.world.projects[id]
    expect(next.programme.source).toBe('set')
    expect(next.startDate).toBe('2027-10-04')
    expect(next.keyDates.steelNeedBy).toBe('2027-10-04')
    expect(r.state.activity[0]).toMatchObject({ projectId: id, text: 'updated the programme' })
    expect(setProjectProgramme(r.state, actor(U.priya), id, input).state).toBe(r.state)
    refused(state, setProjectProgramme(state, actor(U.priya), id, { ...input, startDate: '2027-09-01' }), PROGRAMME_ERRORS.materials)
    refused(state, setProjectProgramme(state, actor(U.priya), id, { ...input, ribaStage: 8 }), PROJECT_ERRORS.stage)
    refused(state, setProjectProgramme(state, actor(U.isla), id, input), ERRORS.role)
  })
})

describe('setProjectRequirements', () => {
  it('saves applicable IDs in dataset order, counts an empty list as reviewed, and a move prunes them', () => {
    const { state, id } = corbel()
    refused(state, setProjectRequirements(state, actor(U.priya), id, ['la-camden-cc1']), PROJECT_ERRORS.requirement)
    const chosen = must(setProjectRequirements(state, actor(U.priya), id, ['la-hackney-lp33', 'nppf', 'lp-si7'])).state
    expect(chosen.world.projects[id].planningRequirementIds).toEqual(['nppf', 'lp-si7', 'la-hackney-lp33'])
    expect(chosen.activity[0].text).toBe('chose 3 planning and sustainability requirements')
    const cleared = must(setProjectRequirements(state, actor(U.priya), id, [])).state
    expect(cleared.world.projects[id].requirementsReviewed).toBe(true)
    expect(cleared.activity[0].text).toBe('cleared the planning and sustainability requirements')
    const moved = must(updateProject(chosen, actor(U.priya), id, { region: 'South East', localAuthority: 'Reading' })).state
    expect(moved.world.projects[id].planningRequirementIds).toEqual(['nppf'])
  })
})

describe('updateProject in round 2', () => {
  it('validates the local authority with the region, keeps Other text and holds materials inside the programme', () => {
    const s0 = fresh()
    refused(s0, updateProject(s0, actor(U.priya), SALLOW_ID, { localAuthority: 'Hackney' }), PROJECT_ERRORS.localAuthority)
    refused(s0, updateProject(s0, actor(U.priya), SALLOW_ID, { region: 'Inner London East' }), PROJECT_ERRORS.localAuthority)
    must(updateProject(s0, actor(U.priya), SALLOW_ID, { region: 'Inner London East', localAuthority: 'Hackney' }))
    refused(s0, updateProject(s0, actor(U.priya), SALLOW_ID, { startDate: '2027-06-01' }), PROGRAMME_ERRORS.materials)
    const other = must(updateProject(s0, actor(U.priya), SALLOW_ID, { projectType: 'other', projectTypeOther: 'Data centre' })).state
    expect(other.world.projects[SALLOW_ID].projectTypeOther).toBe('Data centre')
    const back = must(updateProject(other, actor(U.priya), SALLOW_ID, { projectType: 'hotel' })).state
    expect(back.world.projects[SALLOW_ID].projectTypeOther).toBe('')
  })
})
