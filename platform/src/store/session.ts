// Sign-in for the sandbox (BRIEF section 2). Passwords are hashed with WebCrypto before any comparison or store.
import { useMemo } from 'react'
import type { Org, Persona } from '../domain/types'
import type { PlatformRole, User } from './types'
import { useApp, getData } from './app'
import { roleForOrgType, hashPassword, newSalt, sampleAccountByUserId } from '../sandbox/accounts'
import { nowIso } from '../sandbox/clock'
import { getSessionUserId, replaceSessionUserId, setSessionUserId, useSessionId } from './sessionId'
import { acceptInviteState, AUTH_ERRORS, findUserByEmail, openInvite, resetPasswordState, signUpState, validatePassword, validateSignUp, type SignUpFields } from './actions/auth'
import { inviteDetails, sampleAccountCards } from './selectors/settings'

export type AuthResult = { error: string | null; fieldErrors: Partial<Record<string, string>> }

const OK: AuthResult = { error: null, fieldErrors: {} }

function failed(error: string, field?: string): AuthResult {
  return { error, fieldErrors: field ? { [field]: error } : {} }
}

/** Signs in with email and password. "Remember me" keeps the session after the browser closes. */
export async function signIn(email: string, password: string, remember: boolean): Promise<AuthResult> {
  const user = findUserByEmail(getData(), email)
  if (!user) return failed(AUTH_ERRORS.mismatch)
  const hash = await hashPassword(password, user.salt)
  if (hash !== user.passwordHash) return failed(AUTH_ERRORS.mismatch)
  setSessionUserId(user.id, remember)
  return OK
}

/** Creates a person and their organisation, then signs them in. */
export async function signUp(input: SignUpFields, remember = true): Promise<AuthResult> {
  const invalid = validateSignUp(getData(), input)
  if (invalid.length > 0) return { error: invalid[0][1], fieldErrors: Object.fromEntries(invalid) }
  const salt = newSalt()
  const passwordHash = await hashPassword(input.password, salt)
  const r = signUpState(getData(), { name: input.name, email: input.email, orgName: input.orgName, orgType: input.orgType, salt, passwordHash, now: nowIso() })
  if (r.error || !r.value) return failed(r.error ?? AUTH_ERRORS.email)
  useApp.getState().commit(r.state)
  setSessionUserId(r.value, remember)
  return OK
}

export function signOut(): void {
  setSessionUserId(null, false)
}

/** The sandbox account switcher: moves straight to another sample account. */
export function switchAccount(userId: string): AuthResult {
  if (!sampleAccountByUserId(userId) || !getData().users[userId]) return failed(AUTH_ERRORS.notSample)
  if (getSessionUserId()) replaceSessionUserId(userId)
  else setSessionUserId(userId, true)
  return OK
}

/** In the sandbox no email is sent: this checks the account exists so the page can offer the reset there and then. */
export function requestPasswordReset(email: string): AuthResult {
  if (!findUserByEmail(getData(), email)) return failed(AUTH_ERRORS.noAccount, 'email')
  return OK
}

/** Sets a new password and signs in. */
export async function resetPassword(email: string, newPassword: string): Promise<AuthResult> {
  const bad = validatePassword(newPassword)
  if (bad) return failed(bad, 'password')
  const salt = newSalt()
  const passwordHash = await hashPassword(newPassword, salt)
  const r = resetPasswordState(getData(), email, salt, passwordHash)
  if (r.error) return failed(r.error, 'email')
  useApp.getState().commit(r.state)
  const user = findUserByEmail(r.state, email)
  if (user) setSessionUserId(user.id, false)
  return OK
}

/** Joins the organisation behind an invite link as a new person, and signs in. */
export async function acceptInvite(token: string, input: { name: string; password: string }): Promise<AuthResult> {
  const inv = openInvite(getData(), token)
  if (!inv.ok) return failed(inv.error)
  if (!input.name.trim()) return failed(AUTH_ERRORS.name, 'name')
  const bad = validatePassword(input.password)
  if (bad) return failed(bad, 'password')
  const salt = newSalt()
  const passwordHash = await hashPassword(input.password, salt)
  const r = acceptInviteState(getData(), token, { name: input.name, salt, passwordHash, now: nowIso() })
  if (r.error || !r.value) return failed(r.error ?? AUTH_ERRORS.noInvite)
  useApp.getState().commit(r.state)
  setSessionUserId(r.value, true)
  return OK
}

export type Session = {
  user: User | null
  persona: Persona | null
  org: Org | null
  role: PlatformRole | null
  signIn: typeof signIn
  signUp: typeof signUp
  signOut: typeof signOut
  switchAccount: typeof switchAccount
  requestPasswordReset: typeof requestPasswordReset
  resetPassword: typeof resetPassword
  acceptInvite: typeof acceptInvite
}

/** The signed-in person, their persona, organisation and role, and the sign-in functions. */
export function useSession(): Session {
  const userId = useSessionId((s) => s.userId)
  const user = useApp((s) => (userId ? (s.users[userId] ?? null) : null))
  const personas = useApp((s) => s.world.personas)
  const orgs = useApp((s) => s.world.orgs)
  return useMemo(() => {
    const persona = user ? (personas[user.personaId] ?? null) : null
    const org = user ? (orgs[user.orgId] ?? null) : null
    return {
      user,
      persona,
      org,
      role: org ? roleForOrgType(org.type) : null,
      signIn,
      signUp,
      signOut,
      switchAccount,
      requestPasswordReset,
      resetPassword,
      acceptInvite,
    }
  }, [user, personas, orgs])
}

/** The invite page's details, read without a session; or why the link cannot be used. */
export function inviteInfo(token: string) {
  return inviteDetails(getData(), token)
}

/** The sample accounts for the sign-in page. */
export function sampleAccounts() {
  return sampleAccountCards(getData())
}
