// A calm page for an address that does not exist.
import { Link } from 'react-router'
import { ArrowLeft, Compass } from 'lucide-react'
import { PRODUCT_NAME } from '../../domain/constants'
import { Button, Logo } from '../../ui'

export function NotFound({ homeHref = '/', homeLabel = 'Go to home' }: { homeHref?: string; homeLabel?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page" data-testid="not-found">
      <header className="px-4 py-5 sm:px-8">
        <Link to="/" className="inline-flex items-center rounded-md max-sm:min-h-11" aria-label={`${PRODUCT_NAME} home`}>
          <Logo size="sm" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="relative mb-6">
            <div aria-hidden="true" className="absolute -inset-3 rounded-[18px] border border-line-soft" />
            <div aria-hidden="true" className="absolute -inset-6 rounded-[24px] border border-line-soft/60" />
            <div className="relative flex size-12 items-center justify-center rounded-xl border border-line bg-gradient-to-b from-surface to-subtle text-ink-soft shadow-sm">
              <Compass aria-hidden="true" className="size-5" />
            </div>
          </div>
          <p className="m-0 text-sm font-medium text-muted">Error 404</p>
          <h1 className="m-0 mt-2 text-3xl font-semibold text-ink">Page not found</h1>
          <p className="m-0 mt-3 text-md text-ink-soft">The page you were looking for does not exist or has moved. Check the address, or head back and find it from there.</p>
          <Button asChild variant="primary" icon={ArrowLeft} className="mt-8">
            <Link to={homeHref}>{homeLabel}</Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
