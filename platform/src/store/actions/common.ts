// Shared plumbing for actions: results, the acting person, and small checks.
import type { Org, Persona, World } from '../../domain/types'
import { fromUtcMs, toUtcMs } from '../../domain/dates'
import type { ActionResult, Actor, AppData, PlatformRole, User } from '../types'
import { ERRORS, orgOfUser, personaOfUser, roleOfUser, userOf } from '../access'

export function ok<V = null>(state: AppData, value: V | null = null): ActionResult<V> {
  return { state, error: null, value }
}

export function fail<V = null>(state: AppData, error: string): ActionResult<V> {
  return { state, error, value: null }
}

export type Acting = { user: User; persona: Persona; org: Org; role: PlatformRole; today: string; now: string }

/** The acting person with their persona, organisation and role, or an error when they cannot act at all. */
export function acting(state: AppData, actor: Actor): Acting | string {
  const user = userOf(state, actor.userId)
  const persona = personaOfUser(state, actor.userId)
  const org = orgOfUser(state, actor.userId)
  const role = roleOfUser(state, actor.userId)
  if (!user || !persona || !org) return ERRORS.signedOut
  if (!role) return ERRORS.role
  return { user, persona, org, role, now: actor.now, today: actor.now.slice(0, 10) }
}

export function withWorld(state: AppData, world: World): AppData {
  return world === state.world ? state : { ...state, world }
}

/** A strict ISO calendar date: the right shape and a real day. */
export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUtcMs(toUtcMs(s)) === s
}

/** Trims and caps free text so a pasted essay cannot bloat the sandbox. */
export function clean(text: string, max = 2000): string {
  return text.trim().slice(0, max)
}
