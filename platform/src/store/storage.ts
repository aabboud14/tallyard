// Browser storage that never throws. Every call is wrapped and mirrored in memory, so the app works in private
// windows, with storage blocked, and in tests (adapted from the demo's src/store/safeStorage.ts).
import type { StateStorage } from 'zustand/middleware'

export const STORAGE_PREFIX = 'tallyard-platform-v1'
export const STATE_KEY = `${STORAGE_PREFIX}-state`
export const SESSION_KEY = `${STORAGE_PREFIX}-session`

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

/** Removes every key of this app, and only those. */
export function clearAppKeys(): void {
  for (const kind of ['local', 'session'] as const) {
    for (const k of [...memory[kind].keys()]) if (k.startsWith(STORAGE_PREFIX)) memory[kind].delete(k)
    try {
      const s = area(kind)
      if (!s) continue
      const keys: string[] = []
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i)
        if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k)
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
