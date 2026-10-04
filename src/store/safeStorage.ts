// A localStorage wrapper that never throws. Every call catches and mirrors to a Map,
// so the app works in private windows, on file:// with storage blocked, and in tests.
import type { StateStorage } from 'zustand/middleware'

const memory = new Map<string, string>()

function probe(): boolean {
  try {
    const key = '__tallyard_probe__'
    window.localStorage.setItem(key, '1')
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export const storageAvailable = typeof window !== 'undefined' && probe()

export const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      const v = window.localStorage.getItem(name)
      if (v !== null) return v
    } catch {
      // fall through to memory
    }
    return memory.get(name) ?? null
  },
  setItem: (name, value) => {
    memory.set(name, value)
    try {
      window.localStorage.setItem(name, value)
    } catch {
      // kept in memory only
    }
  },
  removeItem: (name) => {
    memory.delete(name)
    try {
      window.localStorage.removeItem(name)
    } catch {
      // nothing to remove
    }
  },
}
