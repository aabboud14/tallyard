// The top of every page: optional breadcrumbs, a title with a subtitle, actions on the right, a meta row
// (pills, avatars) and a tabs slot that sits on the bottom rule.
import type { ReactNode } from 'react'
import { cx } from './cx'

export type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** A row under the title: pills, facts, avatars. */
  meta?: ReactNode
  /** Usually <Tabs />. */
  tabs?: ReactNode
  breadcrumbs?: ReactNode
  /** A visual before the title, for example an avatar or a material thumbnail. */
  leading?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, actions, meta, tabs, breadcrumbs, leading, className }: PageHeaderProps) {
  return (
    <header className={cx('flex flex-col', tabs ? 'border-b border-line' : null, className)}>
      {breadcrumbs ? <div className="mb-3">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-semibold text-ink">{title}</h1>
            {subtitle ? <p className="m-0 mt-1 text-base text-muted">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">{meta}</div> : null}
      {tabs ? <div className="mt-5">{tabs}</div> : null}
    </header>
  )
}
