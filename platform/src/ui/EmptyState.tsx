// A considered empty state: an icon in a soft tile, a title, one line of help and the next action.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'

export type EmptyStateProps = {
  icon?: LucideIcon
  title: ReactNode
  text?: ReactNode
  /** One or two buttons. */
  action?: ReactNode
  /** `page` for a whole screen, `card` inside a card, `inline` for a compact left-aligned note. */
  variant?: 'page' | 'card' | 'inline'
  className?: string
  testId?: string
}

export function EmptyState({ icon: Icon, title, text, action, variant = 'card', className, testId }: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div data-testid={testId} className={cx('flex items-start gap-3 rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-3.5', className)}>
        {Icon ? <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint" /> : null}
        <div className="min-w-0 flex-1">
          <p className="m-0 font-medium text-ink">{title}</p>
          {text ? <p className="m-0 mt-0.5 text-sm text-muted">{text}</p> : null}
        </div>
        {action ? <div className="shrink-0 self-center">{action}</div> : null}
      </div>
    )
  }
  return (
    <div data-testid={testId} className={cx('flex flex-col items-center px-6 text-center', variant === 'page' ? 'py-20' : 'py-12', className)}>
      {Icon ? (
        <div className="relative mb-5">
          <div aria-hidden="true" className="absolute -inset-3 rounded-[18px] border border-line-soft" />
          <div aria-hidden="true" className="absolute -inset-6 rounded-[24px] border border-line-soft/60" />
          <div className="relative flex size-12 items-center justify-center rounded-xl border border-line bg-gradient-to-b from-surface to-subtle text-ink-soft shadow-sm">
            <Icon aria-hidden="true" className="size-5" />
          </div>
        </div>
      ) : null}
      <h3 className={cx('m-0 font-semibold text-ink', variant === 'page' ? 'text-xl' : 'text-lg')}>{title}</h3>
      {text ? <p className="m-0 mt-1.5 max-w-sm text-base text-muted">{text}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  )
}
