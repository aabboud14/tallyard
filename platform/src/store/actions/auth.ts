// Sign-up, invites and password reset as pure state changes. Hashing happens before these run (session.ts).
import type { Org, Persona } from '../../domain/types'
import type { ActionResult, AppData, User } from '../types'
import { AVATAR_COLOURS } from '../types'
import { defaultNotificationPrefs, isEmail, normaliseEmail, resolveOrgType } from '../../sandbox/accounts'
import { mint } from '../ids'
import { notify } from '../notifications'
import { clean, fail, ok, withWorld } from './common'

export const AUTH_ERRORS = {
  mismatch: 'That email and password do not match.',
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  taken: 'An account with this email already exists. Sign in instead.',
  password: 'Use at least 8 characters for your password.',
  orgName: 'Enter your organisation name.',
  orgType: 'Choose what kind of organisation you are.',
  noAccount: 'We could not find an account with that email.',
  noInvite: 'This invite link is not valid.',
  usedInvite: 'This invite has already been used or was revoked.',
  notSample: 'Only the sample accounts can be switched to.',
} as const

export const MIN_PASSWORD = 8

export function validatePassword(password: string): string | null {
  return password.length >= MIN_PASSWORD ? null : AUTH_ERRORS.password
}

export function findUserByEmail(state: AppData, email: string): User | null {
  const key = normaliseEmail(email)
  return Object.values(state.users).find((u) => normaliseEmail(u.email) === key) ?? null
}

/** `orgType` may be the world's type ('Architect'), the workspace role ('architect') or the label. */
export type SignUpFields = { name: string; email: string; password: string; orgName: string; orgType: string }

/** Every sign-up field error at once, in form order. */
export function validateSignUp(state: AppData, f: SignUpFields): [keyof SignUpFields, string][] {
  const out: [keyof SignUpFields, string][] = []
  if (!f.name.trim()) out.push(['name', AUTH_ERRORS.name])
  if (!isEmail(f.email)) out.push(['email', AUTH_ERRORS.email])
  else if (findUserByEmail(state, f.email)) out.push(['email', AUTH_ERRORS.taken])
  const pw = validatePassword(f.password)
  if (pw) out.push(['password', pw])
  if (!f.orgName.trim()) out.push(['orgName', AUTH_ERRORS.orgName])
  if (!resolveOrgType(f.orgType)) out.push(['orgType', AUTH_ERRORS.orgType])
  return out
}

function colourFor(seq: number) {
  return AVATAR_COLOURS[seq % AVATAR_COLOURS.length]
}

function addPerson(state: AppData, input: { name: string; email: string; title: string; orgId: string; salt: string; passwordHash: string; now: string }): { state: AppData; userId: string } {
  const pm = mint(state, 'per', (id) => !!state.world.personas[id])
  const um = mint(pm.state, 'usr', (id) => !!pm.state.users[id])
  let s = um.state
  const persona: Persona = { id: pm.id, name: input.name, orgId: input.orgId, role: input.title, tier: 'active' }
  const w = structuredClone(s.world)
  w.personas[pm.id] = persona
  s = withWorld(s, w)
  const user: User = {
    id: um.id,
    email: normaliseEmail(input.email),
    name: input.name,
    title: input.title,
    personaId: pm.id,
    orgId: input.orgId,
    salt: input.salt,
    passwordHash: input.passwordHash,
    avatarColour: colourFor(s.seq),
    createdAt: input.now,
    sample: false,
    notificationPrefs: defaultNotificationPrefs(),
  }
  return { state: { ...s, users: { ...s.users, [um.id]: user } }, userId: um.id }
}

/** A new person with a new organisation. Returns the user ID. The password was hashed by the caller. */
export function signUpState(state: AppData, f: Omit<SignUpFields, 'password'> & { salt: string; passwordHash: string; now: string }): ActionResult<string> {
  const invalid = validateSignUp(state, { ...f, password: 'x'.repeat(MIN_PASSWORD) })
  if (invalid.length > 0) return fail(state, invalid[0][1])
  const om = mint(state, 'org', (id) => !!state.world.orgs[id])
  let s = om.state
  const org: Org = { id: om.id, name: clean(f.orgName, 120), type: resolveOrgType(f.orgType)! }
  const w = structuredClone(s.world)
  w.orgs[om.id] = org
  s = withWorld(s, w)
  s = { ...s, orgProfiles: { ...s.orgProfiles, [om.id]: { address: '' } } }
  const r = addPerson(s, { name: clean(f.name, 80), email: f.email, title: '', orgId: om.id, salt: f.salt, passwordHash: f.passwordHash, now: f.now })
  return ok(r.state, r.userId)
}

/** The invite behind a token, when it can still be used. */
export function openInvite(state: AppData, token: string): { ok: true; orgId: string; email: string } | { ok: false; error: string } {
  const inv = state.invites[token]
  if (!inv) return { ok: false, error: AUTH_ERRORS.noInvite }
  if (inv.status !== 'pending') return { ok: false, error: AUTH_ERRORS.usedInvite }
  return { ok: true, orgId: inv.orgId, email: inv.email }
}

/** Joins the invite's organisation as a new person. Returns the user ID. */
export function acceptInviteState(state: AppData, token: string, f: { name: string; salt: string; passwordHash: string; now: string }): ActionResult<string> {
  const inv = openInvite(state, token)
  if (!inv.ok) return fail(state, inv.error)
  if (!f.name.trim()) return fail(state, AUTH_ERRORS.name)
  if (findUserByEmail(state, inv.email)) return fail(state, AUTH_ERRORS.taken)
  const r = addPerson(state, { name: clean(f.name, 80), email: inv.email, title: '', orgId: inv.orgId, salt: f.salt, passwordHash: f.passwordHash, now: f.now })
  let s: AppData = { ...r.state, invites: { ...r.state.invites, [token]: { ...r.state.invites[token], status: 'accepted', acceptedUserId: r.userId } } }
  const orgName = s.world.orgs[inv.orgId]?.name ?? ''
  s = notify(s, { orgIds: [inv.orgId], kind: 'team', title: `${s.users[r.userId].name} joined ${orgName}`, body: `They accepted the invite sent to ${inv.email}.`, href: '/app/settings/team', at: f.now, actorUserId: r.userId })
  return ok(s, r.userId)
}

/** Sets a new password for the account with this email. */
export function resetPasswordState(state: AppData, email: string, salt: string, passwordHash: string): ActionResult {
  const u = findUserByEmail(state, email)
  if (!u) return fail(state, AUTH_ERRORS.noAccount)
  return ok({ ...state, users: { ...state.users, [u.id]: { ...u, salt, passwordHash } } })
}
