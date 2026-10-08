// Route guards. Signed-out visitors to the app go to sign in and come back after; signed-in visitors to the sign-in
// pages go to their home; a route the person may not open renders a calm page with no data.
import { useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSession, useView } from '../store'
import { routeAccess } from '../store/selectors/nav'
import { NoAccess, AppNotFound } from './NoAccess'
import { justSignedOut, safeNext, signInHref } from './next'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  if (!user) return <Navigate to={justSignedOut() ? '/signin' : signInHref(location.pathname, location.search)} replace />
  return <>{children}</>
}

/**
 * Sign in, sign up and password reset: a person who arrives signed in goes straight to where they were going. A
 * person who signs in on the page is sent on by the page itself (to their home, or onboarding).
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const location = useLocation()
  const [arrivedSignedIn] = useState(() => user !== null)
  if (arrivedSignedIn) return <Navigate to={safeNext(new URLSearchParams(location.search).get('next'))} replace />
  return <>{children}</>
}

/** Checks the current app route against the person's workspace and records. */
export function AccessGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const access = useView(routeAccess, pathname)
  if (access === 'forbidden') return <NoAccess />
  if (access === 'not_found') return <AppNotFound />
  return <>{children}</>
}
