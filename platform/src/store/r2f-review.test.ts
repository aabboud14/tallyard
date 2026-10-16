// Round 2 follow-up, review of the client_consultant fixes (16 October 2026): an edit after sending keeps the
// statement with the client; a consultancy that has not joined is never named as the one setting targets; the
// Projects list names its goals as Goals and targets does; the Team card keeps a consultancy's decline note; the
// invite link names the project and the open sign-up page names nothing.
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, U, viewer } from '../test/fixtures'
import { MERROWGATE_ID, ORG_IDS } from '../domain/seed/world'
import { goalDef } from '../domain/reference/goals'
import type { AppData } from './types'
import { createProject, decideClientLink, type NewProjectInput } from './actions/projects'
import { decideConsultantLink } from './actions/consultant'
import { editStatementSection, resetStatementSection, sendStatementForReview } from './actions/sustainability'
import { clientInviteForEmail, hasClientInvite, pendingClientInvite } from './actions/clientInvite'
import { inviteDetails } from './selectors/settings'
import { createInvite } from './actions/team'
import { CONSULTANT_GOAL_LABELS, consultantProjectSummaries } from './selectors/consultant-projects'
import { sustainabilityOf } from './sustainabilityRecord'
import * as sel from './selectors'

const M = MERROWGATE_ID
const LATER = '2026-10-09T10:00:00.000Z'

const TAMSIN: NewProjectInput = { name: 'Tamsin Wharf', client: { orgId: ORG_IDS.lantern }, projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', consultantOrgId: ORG_IDS.halewick }

function tamsinAccepted(): { state: AppData; id: string } {
  const r = must(createProject(fresh(), actor(U.priya), TAMSIN))
  return { state: must(decideClientLink(r.state, actor(U.isla), r.value, 'accepted', '')).state, id: r.value }
}

const reviewTodo = (s: AppData) => sel.clientDashboard(s, viewer(U.isla))!.todos.find((t) => t.kind === 'review_statement' && t.projectId === M)

describe('an edit after sending keeps the statement with the client', () => {
  it('send, edit: the client still reads the sent sections and keeps the review to-do', () => {
    // Send a fresh copy first, so the seeded snapshot is the live text.
    const sent = must(sendStatementForReview(must(editStatementSection(fresh(), actor(U.marcus), M, 'carbon', 'First words on carbon.', 'g')).state, actor(U.marcus), M)).state
    const before = sel.statementView(sent, viewer(U.isla), M)!
    expect(before.sections.find((x) => x.id === 'carbon')!.text).toBe('First words on carbon.')
    expect(reviewTodo(sent)).toBeDefined()

    const edited = must(editStatementSection(sent, actor(U.marcus, LATER), M, 'carbon', 'Second words on carbon.', 'g')).state
    expect(sustainabilityOf(edited, M).statement!.status).toBe('ready_for_review')
    const isla = sel.statementView(edited, viewer(U.isla), M)!
    expect(isla.sections.map((x) => x.text)).toEqual(before.sections.map((x) => x.text))
    expect(isla.canReview).toBe(true)
    expect(isla.changedSinceSent).toMatch(/^This is the version sent on 8 October 2026\. Halewick Sustainability has updated the statement since/)
    expect(reviewTodo(edited)).toBeDefined()
    expect(sel.sustainabilityView(edited, viewer(U.isla), M)!.statement).toMatchObject({ status: 'ready_for_review', canReview: true })

    const marcus = sel.statementView(edited, viewer(U.marcus), M)!
    expect(marcus.sections.find((x) => x.id === 'carbon')!.text).toBe('Second words on carbon.')
    expect(marcus).toMatchObject({ canSend: true, sendLabel: 'Send the updated statement', changedSinceSent: 'Sent on 8 October 2026. Send the updated statement so Lantern Quay Developments reviews the latest version.' })
    expect(sel.sustainabilityView(edited, viewer(U.marcus), M)!.statement!.changedSinceSent).toBe(true)

    // A reset after sending keeps it with the client too.
    const reset = must(resetStatementSection(edited, actor(U.marcus, LATER), M, 'carbon')).state
    expect(sustainabilityOf(reset, M).statement!.status).toBe('ready_for_review')
    expect(sel.statementView(reset, viewer(U.isla), M)!.sections.find((x) => x.id === 'carbon')!.text).toBe('First words on carbon.')

    // Resending replaces what the client reads.
    const resent = must(sendStatementForReview(edited, actor(U.marcus, LATER), M)).state
    expect(sel.statementView(resent, viewer(U.isla), M)!.sections.find((x) => x.id === 'carbon')!.text).toBe('Second words on carbon.')
    expect(sel.statementView(resent, viewer(U.isla), M)!.changedSinceSent).toBeNull()
  })
})

describe("the statement's own words", () => {
  it('counts the circular economy measures besides the statement and knows a request is with the seller', () => {
    const v = sel.statementView(fresh(), viewer(U.marcus), M)!
    const text = (id: string) => v.sections.find((x) => x.id === id)!.text
    expect(text('certification')).toContain('Circular economy: 3 measures targeted besides this statement, 2 in progress and 1 not started.')
    expect(text('next_steps')).toContain('Request a reservation for 1 approved material; 1 more is with the seller.')
    expect(text('content')).toContain('19.9% with what is secured and 20.3% with the approved materials. Without reuse it would be 17.6%.')
  })
})

describe('a consultancy that has not joined is not named as setting targets', () => {
  it('reads waiting, then declined, then the name once it joins, on the tab, the tracking and the overview', () => {
    const { state, id } = tamsinAccepted()
    expect(sel.sustainabilityView(state, viewer(U.isla), id)!.targetsNote).toBe('Halewick Sustainability has not accepted the project yet. Defaults from the requirements are shown.')
    expect(sel.sustainabilityTracking(state, viewer(U.isla), id)!.consultantName).toBe('Halewick Sustainability, waiting to accept')
    expect(sel.projectHeader(state, viewer(U.isla), id)).toMatchObject({ consultantName: '', consultantLinkText: 'Halewick Sustainability, waiting to accept' })
    expect(sel.statementView(state, viewer(U.isla), id)!.subtitle).toMatch(/^Prepared for Lantern Quay Developments, /)

    const declined = must(decideConsultantLink(state, actor(U.marcus), id, 'declined', 'Fully booked this quarter.')).state
    expect(sel.sustainabilityView(declined, viewer(U.isla), id)!.targetsNote).toBe('Halewick Sustainability declined to join. Defaults from the requirements are shown.')
    expect(sel.sustainabilityTracking(declined, viewer(U.isla), id)!.consultantName).toBe('Halewick Sustainability, declined')
    expect(sel.projectHeader(declined, viewer(U.isla), id)!.consultantLinkText).toBe('Halewick Sustainability, declined')

    const joined = must(decideConsultantLink(state, actor(U.marcus), id, 'accepted', '')).state
    expect(sel.sustainabilityView(joined, viewer(U.isla), id)!.targetsNote).toBe('Targets are set by Halewick Sustainability.')
    expect(sel.sustainabilityTracking(joined, viewer(U.isla), id)!.consultantName).toBe('Halewick Sustainability')
    expect(sel.projectHeader(joined, viewer(U.isla), id)).toMatchObject({ consultantName: 'Halewick Sustainability', consultantLinkText: null })
  })

  it('a project with no consultancy still says none is appointed', () => {
    const r = must(createProject(fresh(), actor(U.priya), { ...TAMSIN, consultantOrgId: null }))
    const s = must(decideClientLink(r.state, actor(U.isla), r.value, 'accepted', '')).state
    expect(sel.sustainabilityView(s, viewer(U.isla), r.value)!.targetsNote).toBe('No consultant appointed yet. Defaults from the requirements are shown.')
    expect(sel.sustainabilityTracking(s, viewer(U.isla), r.value)!.consultantName).toBeNull()
  })
})

describe("the consultancy's decline note stays on the Team card", () => {
  it('gives the date and the note beside Ask again', () => {
    const { state, id } = tamsinAccepted()
    const declined = must(decideConsultantLink(state, actor(U.marcus), id, 'declined', 'Fully booked this quarter.')).state
    const section = sel.projectTeam(declined, viewer(U.priya), id)!.sections.find((x) => x.roleLabel === 'Sustainability consultant')!
    expect(section.note).toBe('Halewick Sustainability declined to join this project on 8 October 2026. Their note: "Fully booked this quarter." Ask again or choose another consultancy.')
    const plain = must(decideConsultantLink(state, actor(U.marcus), id, 'declined', '')).state
    expect(sel.projectTeam(plain, viewer(U.priya), id)!.sections.find((x) => x.roleLabel === 'Sustainability consultant')!.note).toBe('Halewick Sustainability declined to join this project on 8 October 2026. Ask again or choose another consultancy.')
  })
})

describe('the Projects list names its goals as Goals and targets does', () => {
  it('takes both labels from the goal definitions', () => {
    const m = consultantProjectSummaries(fresh(), viewer(U.marcus))![M]
    expect(CONSULTANT_GOAL_LABELS).toEqual({ content: goalDef('content_by_value').label, carbon: goalDef('avoided_carbon').label })
    expect(m.content.label).toBe('Reused and recycled content by value')
    expect(m.carbon.label).toBe('Upfront carbon avoided by reuse')
  })
})

describe('invites to answer a project request', () => {
  it('the link names the project and the practice; the open sign-up page learns only that an invite exists', () => {
    const r = must(createProject(fresh(), actor(U.priya), { ...TAMSIN, name: 'Pellow Row', client: { name: 'Harrowgate Homes' }, consultantOrgId: null, clientEmail: 'ada.quist@harrowgate.example' }))
    const inv = pendingClientInvite(r.state, r.state.world.projects[r.value])!
    expect(inviteDetails(r.state, inv.token)).toMatchObject({ orgName: 'Harrowgate Homes', email: 'ada.quist@harrowgate.example', project: { projectName: 'Pellow Row', architectName: 'Studio Oriel' } })
    expect(hasClientInvite(r.state, 'Ada.Quist@harrowgate.example')).toBe(true)
    expect(hasClientInvite(r.state, 'someone@harrowgate.example')).toBe(false)
    expect(typeof hasClientInvite(r.state, 'ada.quist@harrowgate.example')).toBe('boolean')
    expect(clientInviteForEmail(r.state, 'someone@harrowgate.example')).toBeNull()
  })

  it('a team invite carries no project', () => {
    const r = must(createInvite(fresh(), actor(U.priya), 'new.colleague@studio-oriel.example'))
    expect(inviteDetails(r.state, r.value)).toMatchObject({ orgName: 'Studio Oriel', project: null })
    expect(hasClientInvite(r.state, 'new.colleague@studio-oriel.example')).toBe(false)
  })
})
