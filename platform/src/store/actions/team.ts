// Team, profile, organisation and notification settings, and notification read state.
import type { ActionResult, Actor, AppData, AvatarColour, Invite, NotificationKind } from '../types'
import { AVATAR_COLOURS, NOTIFICATION_KINDS } from '../types'
import { ERRORS } from '../access'
import { mint } from '../ids'
import { isEmail, normaliseEmail } from '../../sandbox/accounts'
import { markAllRead, markRead } from '../notifications'
import { acting, clean, fail, ok, withWorld } from './common'

export const TEAM_ERRORS = {
  email: 'Enter a valid email address.',
  member: 'This person is already a member.',
  taken: 'Another account already uses this email.',
  invited: 'This person already has a pending invite.',
  noInvite: 'That invite could not be found.',
  notPending: 'That invite is no longer pending.',
  name: 'Enter a name.',
  orgName: 'Enter the organisation name.',
  colour: 'Choose one of the avatar colours.',
} as const

function userByEmail(state: AppData, email: string) {
  const key = normaliseEmail(email)
  return Object.values(state.users).find((u) => normaliseEmail(u.email) === key) ?? null
}

/** Invites a person by email into the inviter's organisation. Returns the invite token for the copyable link. */
export function createInvite(state: AppData, actor: Actor, email: string): ActionResult<string> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (!isEmail(email)) return fail(state, TEAM_ERRORS.email)
  const key = normaliseEmail(email)
  const existing = userByEmail(state, key)
  if (existing) return fail(state, existing.orgId === a.org.id ? TEAM_ERRORS.member : TEAM_ERRORS.taken)
  if (Object.values(state.invites).some((i) => i.status === 'pending' && i.orgId === a.org.id && normaliseEmail(i.email) === key)) return fail(state, TEAM_ERRORS.invited)
  const m = mint(state, 'inv', (id) => !!state.invites[id])
  const invite: Invite = { token: m.id, orgId: a.org.id, email: key, invitedByUserId: a.user.id, createdAt: a.now, status: 'pending', acceptedUserId: null }
  return ok({ ...m.state, invites: { ...m.state.invites, [m.id]: invite } }, m.id)
}

export function revokeInvite(state: AppData, actor: Actor, token: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const inv = state.invites[token]
  if (!inv || inv.orgId !== a.org.id) return fail(state, TEAM_ERRORS.noInvite)
  if (inv.status !== 'pending') return fail(state, TEAM_ERRORS.notPending)
  return ok({ ...state, invites: { ...state.invites, [token]: { ...inv, status: 'revoked' } } })
}

export type ProfilePatch = { name?: string; title?: string; email?: string; avatarColour?: AvatarColour }

/** The person edits their own profile. A new name follows them into the world's records. */
export function updateProfile(state: AppData, actor: Actor, patch: ProfilePatch): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const next = { ...a.user }
  if (patch.name !== undefined) {
    const name = clean(patch.name, 80)
    if (!name) return fail(state, TEAM_ERRORS.name)
    next.name = name
  }
  if (patch.title !== undefined) next.title = clean(patch.title, 80)
  if (patch.email !== undefined) {
    if (!isEmail(patch.email)) return fail(state, TEAM_ERRORS.email)
    const other = userByEmail(state, patch.email)
    if (other && other.id !== a.user.id) return fail(state, TEAM_ERRORS.taken)
    next.email = normaliseEmail(patch.email)
  }
  if (patch.avatarColour !== undefined) {
    if (!(AVATAR_COLOURS as readonly string[]).includes(patch.avatarColour)) return fail(state, TEAM_ERRORS.colour)
    next.avatarColour = patch.avatarColour
  }
  let s: AppData = { ...state, users: { ...state.users, [a.user.id]: next } }
  if (next.name !== a.persona.name || next.title !== a.persona.role) {
    const w = structuredClone(s.world)
    w.personas[a.persona.id] = { ...w.personas[a.persona.id], name: next.name, role: next.title }
    s = withWorld(s, w)
  }
  return ok(s)
}

/** A member edits their organisation's name and address. The type is fixed: it decides the workspace. */
export function updateOrganisation(state: AppData, actor: Actor, patch: { name?: string; address?: string }): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  let s = state
  if (patch.name !== undefined) {
    const name = clean(patch.name, 120)
    if (!name) return fail(state, TEAM_ERRORS.orgName)
    if (name !== a.org.name) {
      const w = structuredClone(s.world)
      w.orgs[a.org.id] = { ...w.orgs[a.org.id], name }
      s = withWorld(s, w)
    }
  }
  if (patch.address !== undefined) {
    const address = clean(patch.address, 300)
    s = { ...s, orgProfiles: { ...s.orgProfiles, [a.org.id]: { ...(s.orgProfiles[a.org.id] ?? { address: '' }), address } } }
  }
  return ok(s)
}

/** Which events reach the person's inbox. In-app only. */
export function setNotificationPref(state: AppData, actor: Actor, kind: NotificationKind, on: boolean): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  if (!(NOTIFICATION_KINDS as readonly string[]).includes(kind)) return fail(state, ERRORS.role)
  if (a.user.notificationPrefs[kind] === on) return ok(state)
  return ok({ ...state, users: { ...state.users, [a.user.id]: { ...a.user, notificationPrefs: { ...a.user.notificationPrefs, [kind]: on } } } })
}

export function readNotification(state: AppData, actor: Actor, notificationId: string): ActionResult {
  const n = state.notifications.find((x) => x.id === notificationId)
  const u = state.users[actor.userId]
  if (!n || !u || n.orgId !== u.orgId) return fail(state, ERRORS.noAccess)
  return ok(markRead(state, actor.userId, notificationId))
}

export function readAllNotifications(state: AppData, actor: Actor): ActionResult {
  if (!state.users[actor.userId]) return fail(state, ERRORS.signedOut)
  return ok(markAllRead(state, actor.userId))
}
