// The catch-all route: a short note and a way back to the start.
import { Link } from 'react-router'
import { PageTitle } from '../ui'

export function NotFound() {
  return (
    <div className="max-w-xl py-10" data-testid="not-found">
      <PageTitle title="Page not found" sub="This address does not match a screen in the prototype." />
      <Link to="/" className="inline-flex min-h-[44px] items-center rounded-sm border border-steel bg-steel px-4 text-sm font-medium text-white no-underline hover:bg-steel-deep" data-testid="not-found-start">
        Go to the start
      </Link>
    </div>
  )
}
