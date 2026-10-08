// Where to go after signing in.

/** A safe place to return to after sign in: an app path on this site, never another origin. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/app') || next.startsWith('//')) return '/app/home'
  return next
}

/** The sign-in address that returns here afterwards. */
export function signInHref(pathname: string, search: string): string {
  const here = `${pathname}${search}`
  return here === '/app' || here === '/app/' || here === '/app/home' ? '/signin' : `/signin?next=${encodeURIComponent(here)}`
}

let signedOutAt = Number.NEGATIVE_INFINITY

/** Marks a sign-out the person asked for, so the guard does not offer to return to the page they left. */
export function noteSignOut(): void {
  signedOutAt = performance.now()
}

/** True just after a deliberate sign-out. */
export function justSignedOut(): boolean {
  return performance.now() - signedOutAt < 3000
}
