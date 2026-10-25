// A section that opens and closes, remembered per panel id in this browser (usePersistentToggle). The header is
// one full-width button, 44 px tall on phones, with aria-expanded and aria-controls. While closed, an optional
// one-line summary shows in the header. Used for Recent activity on every dashboard and the project overview.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { cx } from './cx'
import { usePersistentToggle } from './usePersistentToggle'

export type CollapsiblePanelProps = {
  /** Remembered under this id, for example "home-activity-client" or "project-activity". */
  id: string
  title: ReactNode
  /** One line shown while closed, for example "12 updates. Latest, 2 hours ago: Isla approved 2 items". */
  summary?: ReactNode
  /** A count beside the title. */
  count?: number
  icon?: LucideIcon
  defaultOpen?: boolean
  /** Controls beside the header button, for example an "All activity" link. */
  actions?: ReactNode
  /** Draw a card border around the panel. */
  bordered?: boolean
  className?: string
  testId?: string
  /** Test id of the toggle button. */
  toggleTestId?: string
  children: ReactNode
}

export function CollapsiblePanel({ id, title, summary, count, icon: Icon, defaultOpen = false, actions, bordered = true, className, testId, toggleTestId, children }: CollapsiblePanelProps) {
  const [open, , toggle] = usePersistentToggle(id, defaultOpen)
  const bodyId = `${id}-body`
  return (
    <section data-testid={testId} data-open={open} className={cx('min-w-0', bordered && 'rounded-lg border border-line bg-surface', className)}>
      <div className="flex min-w-0 items-center gap-2 pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={toggle}
          data-testid={toggleTestId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-4 py-2.5 text-left outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:min-h-12 sm:px-5"
        >
          {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-muted" /> : null}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2">
              <span className="truncate text-base font-semibold text-ink">{title}</span>
              {count !== undefined ? <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-subtle px-1.5 text-2xs font-medium tabular-nums text-muted ring-1 ring-inset ring-line-soft">{count}</span> : null}
            </span>
            {!open && summary ? <span className="mt-0.5 truncate text-sm text-muted">{summary}</span> : null}
          </span>
          <ChevronDown aria-hidden="true" className={cx('size-4 shrink-0 text-muted transition-transform duration-150', open && 'rotate-180')} />
        </button>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </div>
      <div id={bodyId} hidden={!open} className={cx(bordered && 'border-t border-line-soft', 'px-4 py-4 sm:px-5')}>
        {open ? children : null}
      </div>
    </section>
  )
}
