// A client that does not use the product yet (round 2 follow-up, audit note C3). When an architect names a new
// client, nobody can accept the project until someone from that organisation joins, so the architect gives a contact
// email: an invite tied to the project. Opening its link, or signing up with that email, joins the client
// organisation instead of starting a new one, and the request to accept the project waits on the new person's home.
// In the sandbox no email is sent: the architect copies the link.
import type { Project } from '../../domain/types'
import { PRODUCT_NAME } from '../../domain/constants'
import { isEmail, normaliseEmail } from '../../sandbox/accounts'
import type { ActionResult, Actor, AppData, Invite } from '../types'
import { ERRORS, isProjectArchitect, usersOfOrg } from '../access'
import { mint } from '../ids'
import { log } from '../notifications'
import { acting, fail, ok } from './common'

export const CLIENT_INVITE_ERRORS = {
  email: "Enter the client contact's email address.",
  linked: 'The client has already accepted this project.',
  hasMembers: `Someone from this organisation already uses ${PRODUCT_NAME} and can accept the request on Project requests.`,
  taken: 'This email belongs to someone in another organisation. Choose that organisation as the client instead.',
} as const

/** The pending invite that asks someone from the project's client organisation to join and answer, if any. */
export function pendingClientInvite(state: AppData, project: Project): Invite | null {
  return Object.values(state.invites).find((i) => i.status === 'pending' && i.projectId === project.id && i.orgId === project.clientOrgId) ?? null
}

/** A pending client invite addressed to this email, with the organisation and project it joins. */
export function clientInviteForEmail(state: AppData, email: string): { invite: Invite; orgName: string; projectName: string; architectName: string } | null {
  if (!isEmail(email)) return null
  const key = normaliseEmail(email)
  const invite = Object.values(state.invites)
    .filter((i) => i.status === 'pending' && !!i.projectId && normaliseEmail(i.email) === key)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
  if (!invite) return null
  const p = state.world.projects[invite.projectId!]
  if (!p || p.clientOrgId !== invite.orgId) return null
  return { invite, orgName: state.world.orgs[invite.orgId]?.name ?? '', projectName: p.name, architectName: state.world.orgs[p.architectOrgId]?.name ?? '' }
}

/**
 * Whether this email has a pending invite to answer a project request, and nothing more: the open sign-up page uses
 * it, so whoever types an address learns no organisation, project or practice name. The names show only through the
 * invite link (inviteDetails), which is the proof that the person was sent it.
 */
export function hasClientInvite(state: AppData, email: string): boolean {
  return clientInviteForEmail(state, email) !== null
}

/** Why an invite to this email cannot be made for the project's client; null when it can. No permission checks. */
export function clientInviteProblem(state: AppData, project: Project, email: string): string | null {
  if (!isEmail(email)) return CLIENT_INVITE_ERRORS.email
  if (project.clientLink.status === 'accepted') return CLIENT_INVITE_ERRORS.linked
  if (usersOfOrg(state, project.clientOrgId).length > 0) return CLIENT_INVITE_ERRORS.hasMembers
  if (Object.values(state.users).some((u) => normaliseEmail(u.email) === normaliseEmail(email))) return CLIENT_INVITE_ERRORS.taken
  return null
}

/**
 * Issues the invite (an earlier pending one for the project is revoked, so only the newest link works) and logs it
 * for the practice. The caller has checked the request with clientInviteProblem. Returns the token.
 */
export function issueClientInvite(state: AppData, project: Project, email: string, by: { userId: string; name: string; now: string }): { state: AppData; token: string } {
  const before = pendingClientInvite(state, project)
  let s = state
  if (before) s = { ...s, invites: { ...s.invites, [before.token]: { ...before, status: 'revoked' } } }
  const m = mint(s, 'inv', (id) => !!s.invites[id])
  const invite: Invite = { token: m.id, orgId: project.clientOrgId, email: normaliseEmail(email), invitedByUserId: by.userId, createdAt: by.now, status: 'pending', acceptedUserId: null, projectId: project.id }
  s = { ...m.state, invites: { ...m.state.invites, [m.id]: invite } }
  const clientName = s.world.orgs[project.clientOrgId]?.name ?? 'the client'
  s = log(s, { at: by.now, orgIds: [project.architectOrgId], projectId: project.id, buildingId: null, actorUserId: by.userId, actor: by.name, text: `${before ? 'sent a new invite' : 'invited'} ${invite.email} to join ${clientName} and answer the request`, href: `/app/projects/${project.id}` })
  return { state: s, token: m.id }
}

/** The architect invites (or invites again) a contact at a client organisation nobody uses yet. Returns the token. */
export function inviteClientContact(state: AppData, actor: Actor, projectId: string, email: string): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const p = state.world.projects[projectId]
  if (!p) return fail(state, ERRORS.noProject)
  if (!isProjectArchitect(state, actor.userId, projectId)) return fail(state, ERRORS.role)
  const problem = clientInviteProblem(state, p, email)
  if (problem) return fail(state, problem)
  const r = issueClientInvite(state, p, email, { userId: a.user.id, name: a.user.name, now: a.now })
  return ok(r.state, r.token)
}
