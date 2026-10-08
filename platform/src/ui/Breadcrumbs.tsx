// Breadcrumbs: where you are, each level a link, the last one the current page.
import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cx } from './cx'

export type Crumb = { label: ReactNode; href?: string }

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const inRouter = useInRouterContext()
  return (
    <nav aria-label="Breadcrumb" className={cx('min-w-0', className)}>
      <ol className="m-0 flex min-w-0 list-none items-center gap-1 p-0 text-base">
        {items.map((c, i) => {
          const last = i === items.length - 1
          const cls = 'truncate rounded-sm px-1 py-0.5 text-muted transition-colors hover:bg-hover hover:text-ink max-sm:py-3'
          return (
            <li key={i} className={cx('flex min-w-0 items-center gap-1', i < items.length - 2 && 'max-sm:hidden')}>
              {last ? (
                <span aria-current="page" className="truncate px-1 font-medium text-ink">
                  {c.label}
                </span>
              ) : c.href !== undefined && inRouter ? (
                <Link to={c.href} className={cls}>
                  {c.label}
                </Link>
              ) : c.href !== undefined ? (
                <a href={c.href} className={cls}>
                  {c.label}
                </a>
              ) : (
                <span className="truncate px-1 text-muted">{c.label}</span>
              )}
              {!last ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-faint" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
