// React glue: the data, the viewer and memoised view models. Screens call useView(selector, ...args).
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { AppData, Viewer } from './types'
import { useApp } from './app'
import { useSessionId } from './sessionId'
import { nowIso } from '../sandbox/clock'

/** The data part of the store, stable until any of it changes. */
export function useData(): AppData {
  return useApp(
    useShallow((s) => ({
      version: s.version,
      seededOn: s.seededOn,
      seq: s.seq,
      world: s.world,
      users: s.users,
      invites: s.invites,
      notifications: s.notifications,
      activity: s.activity,
      reservations: s.reservations,
      surveys: s.surveys,
      specs: s.specs,
      orgProfiles: s.orgProfiles,
      ui: s.ui,
    })),
  )
}

function minute(): string {
  return nowIso().slice(0, 16) + ':00.000Z'
}

/** Now, to the minute, refreshed every 30 seconds so relative times stay right. */
export function useNow(): string {
  const [now, setNow] = useState(minute)
  useEffect(() => {
    const t = setInterval(() => setNow(minute()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

/** The signed-in person as a viewer, or null when signed out. */
export function useViewer(): Viewer | null {
  const userId = useSessionId((s) => s.userId)
  const exists = useApp((s) => (userId ? !!s.users[userId] : false))
  const now = useNow()
  return useMemo(() => (userId && exists ? { userId, now } : null), [userId, exists, now])
}

/**
 * A view model for the signed-in person, memoised on the data, the viewer and the arguments.
 * Null when signed out. Arguments must be plain JSON values (strings, numbers, booleans, null, plain objects).
 */
export function useView<T, A extends unknown[]>(selector: (s: AppData, v: Viewer, ...args: A) => T, ...args: A): T | null {
  const data = useData()
  const viewer = useViewer()
  const key = JSON.stringify(args)
  return useMemo(() => (viewer ? selector(data, viewer, ...(JSON.parse(key) as A)) : null), [data, viewer, selector, key])
}
