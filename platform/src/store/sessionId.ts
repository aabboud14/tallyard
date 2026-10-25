// Who is signed in on this browser tab. The ID sits in localStorage when "Remember me" is ticked, otherwise in
// sessionStorage, so closing the browser signs out. Kept apart from the app store so both can read it.
import { create } from 'zustand'
import { readKey, removeKey, SESSION_KEY, writeKey } from './storage'

function initial(): string | null {
  return readKey('session', SESSION_KEY) ?? readKey('local', SESSION_KEY)
}

type SessionIdState = { userId: string | null }

export const useSessionId = create<SessionIdState>()(() => ({ userId: initial() }))

export function getSessionUserId(): string | null {
  return useSessionId.getState().userId
}

export function setSessionUserId(userId: string | null, remember: boolean): void {
  removeKey('session', SESSION_KEY)
  removeKey('local', SESSION_KEY)
  if (userId) writeKey(remember ? 'local' : 'session', SESSION_KEY, userId)
  useSessionId.setState({ userId })
}

/** Keeps the current sign-in but changes the person, in the same storage as before. */
export function replaceSessionUserId(userId: string): void {
  const remembered = readKey('local', SESSION_KEY) !== null
  setSessionUserId(userId, remembered)
}

// A remembered sign-in or sign-out in another tab applies here too.
if (typeof window !== 'undefined') {
  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== SESSION_KEY || readKey('session', SESSION_KEY) !== null) return
      useSessionId.setState({ userId: e.newValue })
    })
  } catch {
    // no storage events in this environment
  }
}
