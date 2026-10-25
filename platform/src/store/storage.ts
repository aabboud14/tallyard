// Browser storage that never throws. Every call is wrapped and mirrored in memory, so the app works in private
// windows, with storage blocked, and in tests (adapted from the demo's src/store/safeStorage.ts).
import type { StateStorage } from 'zustand/middleware'

/** Every key this app keeps in the browser starts with this, whichever build wrote it. */
export const APP_PREFIX = 'tallyard-platform-'
/** The prefix of the per-viewer keys (session, panels, the photo database). Unchanged since the first build. */
export const STORAGE_PREFIX = `${APP_PREFIX}v1`
/**
 * The persisted data's version. Raising it starts a fresh sandbox, and also moves the data to its own key, so a
 * tab of an older build still open in the same browser keeps writing to its own key and the two never reseed each
 * other in a loop (round 2 audit, 16 October 2026).
 */
export const STATE_VERSION = 2
export const STATE_KEY = stateKey(STATE_VERSION)
/** Kept across versions, so a sample account stays signed in after an upgrade (sample user IDs never change). */
export const SESSION_KEY = `${STORAGE_PREFIX}-session`

/** The key that holds the persisted data of a given version. */
export function stateKey(version: number): string {
  return `${APP_PREFIX}v${version}-state`
}

/** The keys earlier builds kept their data under, oldest first. */
export function legacyStateKeys(): string[] {
  return Array.from({ length: STATE_VERSION - 1 }, (_, i) => stateKey(i + 1))
}

type Area = 'local' | 'session'

const memory: Record<Area, Map<string, string>> = { local: new Map(), session: new Map() }

function area(kind: Area): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function readKey(kind: Area, key: string): string | null {
  try {
    const v = area(kind)?.getItem(key) ?? null
    if (v !== null) return v
  } catch {
    // fall through to memory
  }
  return memory[kind].get(key) ?? null
}

export function writeKey(kind: Area, key: string, value: string): void {
  memory[kind].set(key, value)
  try {
    area(kind)?.setItem(key, value)
  } catch {
    // kept in memory only
  }
}

export function removeKey(kind: Area, key: string): void {
  memory[kind].delete(key)
  try {
    area(kind)?.removeItem(key)
  } catch {
    // nothing to remove
  }
}

/** Removes every key of this app, and only those, whichever build wrote them. */
export function clearAppKeys(): void {
  for (const kind of ['local', 'session'] as const) {
    for (const k of [...memory[kind].keys()]) if (k.startsWith(APP_PREFIX)) memory[kind].delete(k)
    try {
      const s = area(kind)
      if (!s) continue
      const keys: string[] = []
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)
        if (k && k.startsWith(APP_PREFIX)) keys.push(k)
      }
      for (const k of keys) s.removeItem(k)
    } catch {
      // nothing to clear
    }
  }
}

/** The persisted store's storage: localStorage with a memory mirror. */
export const safeStorage: StateStorage = {
  getItem: (name) => readKey('local', name),
  setItem: (name, value) => writeKey('local', name, value),
  removeItem: (name) => removeKey('local', name),
}
