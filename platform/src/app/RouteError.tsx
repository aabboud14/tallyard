// What a page shows if it fails to load or throws: a plain message, a way to try again and a way home. A stale
// deployment chunk reloads the page once.
import { useEffect } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { House, RotateCw, TriangleAlert } from 'lucide-react'
import { Button, EmptyState } from '../ui'

const RELOADED = 'tallyard-platform-v1-reloaded'

function isChunkError(e: unknown): boolean {
  return e instanceof Error && /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(e.message)
}

/** Inside the app shell (`inShell`) the message takes the page's place; elsewhere it fills the window. */
export function RouteError({ inShell = false }: { inShell?: boolean }) {
  const error = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404

  useEffect(() => {
    if (!isChunkError(error)) return
    try {
      if (sessionStorage.getItem(RELOADED)) return
      sessionStorage.setItem(RELOADED, '1')
      window.location.reload()
    } catch {
      // storage blocked: show the message instead
    }
  }, [error])

  return (
    <div className={inShell ? 'flex min-h-[60vh] items-center justify-center px-4 py-12' : 'flex min-h-dvh items-center justify-center bg-page px-4'} data-testid="route-error">
      <EmptyState
        variant="page"
        icon={TriangleAlert}
        title={missing ? 'Page not found' : 'Something went wrong'}
        text={missing ? 'The page you were looking for does not exist or has moved.' : 'This page could not be shown. Try again, and if it keeps happening, reset the sandbox from Settings.'}
        action={
          <>
            {missing ? null : (
              <Button variant="primary" icon={RotateCw} onClick={() => window.location.reload()}>
                Try again
              </Button>
            )}
            <Button asChild icon={House}>
              <Link to="/app/home">Go to home</Link>
            </Button>
          </>
        }
      />
    </div>
  )
}
