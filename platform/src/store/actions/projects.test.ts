import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U } from '../../test/fixtures'
import { acceptTerms, createProject, editSpecClauseNote, editSpecHeader, PROJECT_ERRORS, setProjectConsultant, updateProject, validateNewProject, type NewProjectInput } from './projects'
import { projectWishlist } from '../lots'
import { ERRORS } from '../access'
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
    // Isla now sees it; she is told.
    expect(r.state.notifications.some((n) => n.orgId === ORG_IDS.lantern && n.title === 'Studio Oriel added you as client')).toBe(true)
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
