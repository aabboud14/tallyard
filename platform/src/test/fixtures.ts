// A fresh sandbox at a fixed time, the sample people, and helpers to run actions in tests.
import { expect } from 'vitest'
import { firstRun } from '../sandbox/seed'
import { defaultNotificationPrefs, SAMPLE_ACCOUNTS } from '../sandbox/accounts'
import type { ActionResult, Actor, AppData, User, Viewer } from '../store/types'
import { PERSONA_IDS } from '../domain/seed/world'

export const TODAY = '2026-10-08'
export const SEEDED_AT = '2026-10-08T09:00:00.000Z'
export const NOW = '2026-10-08T10:00:00.000Z'

const byPersona = (id: string) => SAMPLE_ACCOUNTS.find((a) => a.personaId === id)!.userId

/** The sample people's user IDs. */
export const U = {
  priya: byPersona(PERSONA_IDS.priya),
  isla: byPersona(PERSONA_IDS.isla),
  tom: byPersona(PERSONA_IDS.tom),
  dana: byPersona(PERSONA_IDS.dana),
  marcus: byPersona(PERSONA_IDS.marcus),
}

export function fresh(): AppData {
  return firstRun(TODAY, SEEDED_AT)
}

export function actor(userId: string, now: string = NOW): Actor {
  return { userId, now }
}

export function viewer(userId: string, now: string = NOW): Viewer {
  return { userId, now }
}

/** The new state of an action that must succeed. */
export function must<V>(r: ActionResult<V>): { state: AppData; value: V } {
  expect(r.error, r.error ?? '').toBeNull()
  return { state: r.state, value: r.value as V }
}

/** An action that must fail with this error and change nothing. */
export function refused<V>(before: AppData, r: ActionResult<V>, error?: string): void {
  expect(r.error).not.toBeNull()
  if (error) expect(r.error).toBe(error)
  expect(r.state).toBe(before)
}

/** A person added straight to an existing organisation (one with no sample person, such as a contractor). Returns the user ID. */
export function addTestUser(state: AppData, input: { orgId: string; name: string; email: string; now?: string }): { state: AppData; userId: string } {
  const personaId = `per_t${Object.keys(state.world.personas).length.toString().padStart(5, '0')}`
  const userId = `usr_t${Object.keys(state.users).length.toString().padStart(5, '0')}`
  const world = structuredClone(state.world)
  world.personas[personaId] = { id: personaId, name: input.name, orgId: input.orgId, role: '', tier: 'active' }
  const user: User = {
    id: userId,
    email: input.email.trim().toLowerCase(),
    name: input.name,
    title: '',
    personaId,
    orgId: input.orgId,
    salt: 's',
    passwordHash: 'h',
    avatarColour: 'slate',
    createdAt: input.now ?? NOW,
    sample: false,
    notificationPrefs: defaultNotificationPrefs(),
  }
  return { state: { ...state, world, users: { ...state.users, [userId]: user } }, userId }
}
