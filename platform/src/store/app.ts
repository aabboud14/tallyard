// The persisted app store (BRIEF section 12). It holds the data only; every change goes through a pure action
// or a pure world update. The first visit seeds the sandbox; a stored state from another version re-seeds.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { World } from '../domain/types'
import type { ActionResult, Actor, AppData, UiState } from './types'
import { firstRun } from '../sandbox/seed'
import { nowIso, today } from '../sandbox/clock'
import { safeStorage, STATE_KEY } from './storage'
import { clearPhotos } from './photos'
import { getSessionUserId, setSessionUserId } from './sessionId'
import { ERRORS } from './access'

export const STATE_VERSION = 1

export type Outcome<V> = { ok: boolean; error: string | null; value: V | null; undo: () => void }

export type AppStore = AppData & {
  /** Runs a pure world update. */
  apply: (fn: (w: World) => World) => void
  /** Runs an action as the signed-in person, now. Stores the new state when it succeeds. */
  run: <V, A extends unknown[]>(action: (s: AppData, actor: Actor, ...args: A) => ActionResult<V>, ...args: A) => Outcome<V>
  /** Replaces the data, for actions run outside a session (sign-up, invites, password reset). */
  commit: (next: AppData) => void
  setUi: (patch: Partial<UiState>) => void
  /** The project Discover checks fit against, for the signed-in person. */
  setCheckingProject: (projectId: string | null) => void
  resetSandbox: () => Promise<void>
}

const DATA_KEYS = ['version', 'seededOn', 'seq', 'world', 'users', 'invites', 'notifications', 'activity', 'reservations', 'surveys', 'specs', 'orgProfiles', 'ui'] as const satisfies readonly (keyof AppData)[]

/** The data part of the store, without the functions. */
export function dataOf(s: AppData): AppData {
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as AppData
}

function looksValid(x: unknown): x is AppData {
  if (!x || typeof x !== 'object') return false
  const d = x as Partial<AppData>
  return d.version === STATE_VERSION && !!d.world && !!d.users && Array.isArray(d.notifications) && Array.isArray(d.activity) && !!d.reservations && !!d.ui
}

function fresh(): AppData {
  return firstRun(today(), nowIso())
}

function sameData(a: AppData, b: AppData): boolean {
  return DATA_KEYS.every((k) => a[k] === b[k])
}

const noop = () => {}

export const useApp = create<AppStore>()(
  persist(
    (set, get) => ({
      ...fresh(),
      apply: (fn) => {
        const world = fn(get().world)
        if (world !== get().world) set({ world })
      },
      run: (action, ...args) => {
        const userId = getSessionUserId()
        const before = dataOf(get())
        if (!userId || !before.users[userId]) return { ok: false, error: ERRORS.signedOut, value: null, undo: noop }
        const r = action(before, { userId, now: nowIso() }, ...args)
        if (r.error) return { ok: false, error: r.error, value: null, undo: noop }
        if (r.state === before || sameData(r.state, before)) return { ok: true, error: null, value: r.value, undo: noop }
        const after = r.state
        set(after)
        const undo = () => {
          // Only while nothing else has changed since, so an undo never throws away later work.
          if (sameData(dataOf(get()), after)) set(before)
        }
        return { ok: true, error: null, value: r.value, undo }
      },
      commit: (next) => set(dataOf(next)),
      setUi: (patch) => set({ ui: { ...get().ui, ...patch } }),
      setCheckingProject: (projectId) => {
        const userId = getSessionUserId()
        if (!userId) return
        set({ ui: { ...get().ui, checkingProjectId: { ...get().ui.checkingProjectId, [userId]: projectId } } })
      },
      resetSandbox: async () => {
        await clearPhotos()
        const next = fresh()
        set(next)
        const userId = getSessionUserId()
        if (userId && !next.users[userId]) setSessionUserId(null, false)
      },
    }),
    {
      name: STATE_KEY,
      version: STATE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => dataOf(s),
      // Any other version, or a damaged record, starts a fresh sandbox.
      migrate: () => fresh(),
      merge: (persisted, current) => (looksValid(persisted) ? { ...current, ...dataOf(persisted) } : current),
    },
  ),
)

/** The current data, outside React. */
export function getData(): AppData {
  return dataOf(useApp.getState())
}

// Another tab of the same sandbox saved: pick up its state, so two tabs never overwrite each other's work.
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('storage', (e) => {
      if (e.key === STATE_KEY) void useApp.persist.rehydrate()
    })
  } catch {
    // no storage events in this environment
  }
}
