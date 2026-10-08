// The content frame inside the app shell: a centred column with the shell's gutters. `width` picks the measure:
// `default` for workspaces, `wide` for image grids, `narrow` for forms and settings.
import type { ReactNode } from 'react'
import { cx } from '../ui'

const widths = { narrow: 'max-w-[880px]', default: 'max-w-[1240px]', wide: 'max-w-[1480px]' }

export function Page({ children, width = 'default', className, testId }: { children: ReactNode; width?: keyof typeof widths; className?: string; testId?: string }) {
  return (
    <div data-testid={testId} className={cx('mx-auto w-full min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8', widths[width], className)}>
      {children}
    </div>
  )
}

/** A section heading inside a page: a title, an optional line and actions on the right. */
export function SectionTitle({ title, description, actions, className, as: H = 'h2', id }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string; as?: 'h2' | 'h3'; id?: string }) {
  return (
    <div className={cx('mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <H id={id} className="m-0 text-md font-semibold text-ink">
          {title}
        </H>
        {description ? <p className="m-0 mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
