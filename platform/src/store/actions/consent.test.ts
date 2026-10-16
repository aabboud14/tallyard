// Round 2 follow-up (audit of 16 October 2026): the consultancy's consent to a project (note C2) and a new client
// that does not use the product yet (note C3).
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, refused, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import type { AppData } from '../types'
import { ERRORS, projectsOfUser } from '../access'
import { createProject, decideClientLink, requestClientLink, setProjectConsultant, type NewProjectInput } from './projects'
import { CONSULTANT_LINK_ERRORS, decideConsultantLink } from './consultant'
import { CLIENT_INVITE_ERRORS, clientInviteForEmail, inviteClientContact, pendingClientInvite } from './clientInvite'
import { signUpState, validateSignUp } from './auth'
import { setGoalTarget } from './sustainability'
import { consultantLinkRequests, pendingConsultantRequestCount, waitingRequestForPath } from '../selectors/consultant-requests'
import * as sel from '../selectors'

const TAMSIN: NewProjectInput = { name: 'Tamsin Wharf', client: { orgId: ORG_IDS.lantern }, projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', consultantOrgId: ORG_IDS.halewick }

function tamsin(s: AppData = fresh(), input: Partial<NewProjectInput> = {}): { state: AppData; id: string } {
  const r = must(createProject(s, actor(U.priya), { ...TAMSIN, ...input }))
  return { state: r.state, id: r.value }
}

function added(before: AppData, after: AppData) {
  return after.notifications.filter((n) => !before.notifications.includes(n))
}

describe("the consultancy's consent (note C2)", () => {
  it('keeps a project from its consultancy until the client accepts, then asks the consultancy', () => {
    const s0 = fresh()
    const { state, id } = tamsin(s0)
    expect(state.world.projects[id].consultantLink).toMatchObject({ status: 'pending', requestedByPersonaId: expect.any(String) })
    expect(added(s0, state).some((n) => n.orgId === ORG_IDS.halewick)).toBe(false)
    expect(state.activity.filter((e) => e.orgIds.includes(ORG_IDS.halewick) && e.projectId === id)).toEqual([])
    expect(projectsOfUser(state, U.marcus).map((p) => p.id)).not.toContain(id)
    expect(sel.routeAccess(state, viewer(U.marcus), `/app/projects/${id}`)).toBe('forbidden')
    expect(consultantLinkRequests(state, viewer(U.marcus))!.pending).toEqual([])
    // Nothing of the project reaches Marcus's workspace before the client agrees.
    expect(JSON.stringify([sel.navModel(state, viewer(U.marcus)), sel.consultantHome(state, viewer(U.marcus)), sel.projectsListView(state, viewer(U.marcus))])).not.toContain('Tamsin Wharf')
    // Isla is told who the architect proposes.
    expect(sel.clientLinkRequests(state, viewer(U.isla))!.pending[0].proposedConsultant).toBe('Halewick Sustainability')
    // A consultancy cannot answer before the client has.
    refused(state, decideConsultantLink(state, actor(U.marcus), id, 'accepted', ''), CONSULTANT_LINK_ERRORS.noClient)

    const accepted = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    const asked = added(state, accepted).find((n) => n.orgId === ORG_IDS.halewick)!
    expect(asked).toMatchObject({ title: 'Studio Oriel asked to add you as sustainability consultant on Tamsin Wharf', href: '/app/projects/requests', kind: 'team' })
    expect(sel.routeAccess(accepted, viewer(U.marcus), `/app/projects/${id}`)).toBe('forbidden')
    expect(sel.routeAccess(accepted, viewer(U.marcus), '/app/projects/requests')).toBe('ok')
    expect(pendingConsultantRequestCount(accepted, ORG_IDS.halewick)).toBe(1)
    const req = consultantLinkRequests(accepted, viewer(U.marcus))!.pending[0]
    expect(req).toMatchObject({ projectId: id, projectName: 'Tamsin Wharf', architectName: 'Studio Oriel', clientName: 'Lantern Quay Developments', requestedBy: 'Priya Nair', status: 'pending', href: null })
    expect(waitingRequestForPath(accepted, viewer(U.marcus), `/app/projects/${id}/targets`)).toEqual({ projectName: 'Tamsin Wharf', href: '/app/projects/requests' })
    const nav = sel.navModel(accepted, viewer(U.marcus))!
    expect(nav.sections.find((x) => x.id === 'projects')!.items.find((i) => i.id === 'project-requests')).toMatchObject({ href: '/app/projects/requests', badge: 1 })
    // The architect sees the consultancy waits; its people do not show.
    const team = sel.projectTeam(accepted, viewer(U.priya), id)!
    expect(team.sections.find((x) => x.roleLabel === 'Sustainability consultant')).toMatchObject({ pending: true, members: [], note: 'Halewick Sustainability has not accepted this project yet. Their people appear here once they do.' })
    expect(sel.projectHeader(accepted, viewer(U.priya), id)!.consultantLinkText).toBe('Halewick Sustainability, waiting to accept')

    const joined = must(decideConsultantLink(accepted, actor(U.marcus), id, 'accepted', '')).state
    expect(projectsOfUser(joined, U.marcus).map((p) => p.id)).toContain(id)
    expect(added(accepted, joined).map((n) => [n.orgId, n.title])).toEqual(
      expect.arrayContaining([
        [ORG_IDS.oriel, 'Halewick Sustainability joined Tamsin Wharf as sustainability consultant'],
        [ORG_IDS.lantern, 'Halewick Sustainability joined Tamsin Wharf as sustainability consultant'],
      ]),
    )
    expect(sel.projectHeader(joined, viewer(U.priya), id)!.consultantName).toBe('Halewick Sustainability')
    must(setGoalTarget(joined, actor(U.marcus), id, 'content_by_value', 0.3, ''))
    refused(joined, decideConsultantLink(joined, actor(U.marcus), id, 'declined', ''), CONSULTANT_LINK_ERRORS.notPending)
  })

  it('a decline goes back to the architect, who may ask again', () => {
    const { state, id } = tamsin()
    const accepted = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    for (const who of [U.priya, U.isla, U.tom]) refused(accepted, decideConsultantLink(accepted, actor(who), id, 'accepted', ''), ERRORS.role)
    const declined = must(decideConsultantLink(accepted, actor(U.marcus), id, 'declined', 'Fully booked until spring.')).state
    const told = added(accepted, declined).find((n) => n.orgId === ORG_IDS.oriel)!
    expect(told).toMatchObject({ title: 'Halewick Sustainability declined Tamsin Wharf', body: 'Their note: Fully booked until spring.' })
    expect(sel.routeAccess(declined, viewer(U.marcus), `/app/projects/${id}`)).toBe('forbidden')
    expect(sel.projectTeam(declined, viewer(U.priya), id)!.sections.find((x) => x.roleLabel === 'Sustainability consultant')).toMatchObject({ declined: true, pending: true })
    expect(consultantLinkRequests(declined, viewer(U.marcus))!.answered[0]).toMatchObject({ status: 'declined' })
    const again = must(setProjectConsultant(declined, actor(U.priya), id, ORG_IDS.halewick)).state
    expect(again.world.projects[id].consultantLink!.status).toBe('pending')
    expect(added(declined, again).some((n) => n.orgId === ORG_IDS.halewick && n.href === '/app/projects/requests')).toBe(true)
  })

  it('a consultancy named later on an accepted project is asked at once; a seeded project needs no answer', () => {
    const s0 = fresh()
    const { state, id } = tamsin(s0, { consultantOrgId: null })
    const accepted = must(decideClientLink(state, actor(U.isla), id, 'accepted', '')).state
    const named = must(setProjectConsultant(accepted, actor(U.priya), id, ORG_IDS.halewick)).state
    expect(added(accepted, named).find((n) => n.orgId === ORG_IDS.halewick)!.title).toBe('Studio Oriel asked to add you as sustainability consultant on Tamsin Wharf')
    expect(sel.routeAccess(s0, viewer(U.marcus), `/app/projects/${MERROWGATE_ID}`)).toBe('ok')
    expect(consultantLinkRequests(s0, viewer(U.marcus))).toEqual({ pending: [], answered: [] })
  })

  it('points a person asked to join to the request instead of a bare refusal', () => {
    const { state, id } = tamsin()
    expect(waitingRequestForPath(state, viewer(U.isla), `/app/projects/${id}`)).toEqual({ projectName: 'Tamsin Wharf', href: '/app/projects/requests' })
    expect(waitingRequestForPath(state, viewer(U.marcus), `/app/projects/${id}`)).toBeNull()
    expect(waitingRequestForPath(state, viewer(U.tom), `/app/projects/${id}`)).toBeNull()
    expect(waitingRequestForPath(state, viewer(U.isla), '/app/projects/prj_nothere')).toBeNull()
  })
})

describe('a new client nobody uses yet (note C3)', () => {
  const PELLOW: Partial<NewProjectInput> = { name: 'Pellow Row', client: { name: 'Harrowgate Homes' }, consultantOrgId: null, clientEmail: 'ada.quist@harrowgate.example' }

  it('invites the contact, who joins the client organisation on sign-up and finds the request on their home', () => {
    const { state, id } = tamsin(fresh(), PELLOW)
    const p = state.world.projects[id]
    const inv = pendingClientInvite(state, p)!
    expect(inv).toMatchObject({ email: 'ada.quist@harrowgate.example', orgId: p.clientOrgId, projectId: id, status: 'pending' })
    expect(sel.clientLinkView(state, viewer(U.priya), id)!.invite).toEqual({ email: 'ada.quist@harrowgate.example', sentText: 'Invite sent to ada.quist@harrowgate.example on 8 October 2026', token: inv.token })
    expect(clientInviteForEmail(state, 'Ada.Quist@harrowgate.example')).toMatchObject({ orgName: 'Harrowgate Homes', projectName: 'Pellow Row', architectName: 'Studio Oriel' })
    // The organisation fields are not needed when joining.
    expect(validateSignUp(state, { name: 'Ada Quist', email: 'ada.quist@harrowgate.example', password: 'longenough', orgName: '', orgType: '' })).toEqual([])

    const r = must(signUpState(state, { name: 'Ada Quist', email: 'ada.quist@harrowgate.example', orgName: '', orgType: '', salt: 's', passwordHash: 'h', now: '2026-10-08T11:00:00.000Z' }))
    const ada = r.value
    const s = r.state
    expect(s.users[ada].orgId).toBe(p.clientOrgId)
    expect(Object.keys(s.world.orgs)).toHaveLength(Object.keys(state.world.orgs).length)
    expect(s.invites[inv.token]).toMatchObject({ status: 'accepted', acceptedUserId: ada })
    expect(added(state, s).some((n) => n.orgId === ORG_IDS.oriel && n.title === 'Ada Quist joined Harrowgate Homes' && n.body === 'They can now accept Pellow Row.')).toBe(true)
    expect(sel.clientLinkRequests(s, viewer(ada))!.pending.map((x) => x.projectId)).toEqual([id])

    // Accepting unlocks sending for approval.
    const accepted = must(decideClientLink(s, actor(ada, '2026-10-08T11:05:00.000Z'), id, 'accepted', '')).state
    expect(sel.clientLinkView(accepted, viewer(U.priya), id)).toBeNull()
    expect(sel.projectSetup(accepted, viewer(U.priya), id)!.steps.find((x) => x.id === 'client')!.state).toBe('done')
  })

  it('sends a new invite in place of the old one, refuses a bad or taken email, and is for the architect only', () => {
    const { state, id } = tamsin(fresh(), { ...PELLOW, clientEmail: '' })
    expect(pendingClientInvite(state, state.world.projects[id])).toBeNull()
    refused(state, inviteClientContact(state, actor(U.priya), id, 'not an email'), CLIENT_INVITE_ERRORS.email)
    refused(state, inviteClientContact(state, actor(U.priya), id, 'isla.brennan@lanternquay.example'), CLIENT_INVITE_ERRORS.taken)
    refused(state, inviteClientContact(state, actor(U.isla), id, 'a@b.example'), ERRORS.role)
    const first = must(inviteClientContact(state, actor(U.priya), id, 'ada.quist@harrowgate.example'))
    const second = must(inviteClientContact(first.state, actor(U.priya), id, 'ada.quist@harrowgate.example'))
    expect(second.state.invites[first.value].status).toBe('revoked')
    expect(pendingClientInvite(second.state, second.state.world.projects[id])!.token).toBe(second.value)
    // A client someone already uses answers on Project requests: no invite.
    const lantern = tamsin(fresh(), { name: 'Corbel Yard', consultantOrgId: null })
    refused(lantern.state, inviteClientContact(lantern.state, actor(U.priya), lantern.id, 'ada.quist@harrowgate.example'), CLIENT_INVITE_ERRORS.hasMembers)
    // Validation on the form.
    const s0 = fresh()
    refused(s0, createProject(s0, actor(U.priya), { ...TAMSIN, ...PELLOW, clientEmail: 'nope' }), CLIENT_INVITE_ERRORS.email)
  })

  it('a change to a new client can carry the contact email too', () => {
    const { state, id } = tamsin(fresh(), { consultantOrgId: null })
    const declined = must(decideClientLink(state, actor(U.isla), id, 'declined', '')).state
    const moved = must(requestClientLink(declined, actor(U.priya), id, { name: 'Harrowgate Homes' }, '', 'ada.quist@harrowgate.example')).state
    expect(pendingClientInvite(moved, moved.world.projects[id])!.email).toBe('ada.quist@harrowgate.example')
  })
})
