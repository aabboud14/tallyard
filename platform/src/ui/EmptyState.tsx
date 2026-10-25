// A considered empty state: a quiet icon or a line spot, a title, one line of help and the next action.
// No frames, rings or gradient tiles around the icon.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'
import { SpotIllustration } from './illustration/spots'
import type { SpotKind } from './illustration/spotKinds'

export type EmptyStateProps = {
  icon?: LucideIcon
  /** A line spot in place of the icon, for the page and card variants. */
  illustration?: SpotKind
  title: ReactNode
  text?: ReactNode
  /** One or two buttons. */
  action?: ReactNode
  /** `page` for a whole screen, `card` inside a card, `inline` for a compact left-aligned note. */
  variant?: 'page' | 'card' | 'inline'
  className?: string
  testId?: string
}

export function EmptyState({ icon: Icon, illustration, title, text, action, variant = 'card', className, testId }: EmptyStateProps) {
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
    <div data-testid={testId} className={cx('flex flex-col items-center px-6 text-center', variant === 'page' ? 'py-16' : 'py-10', className)}>
      {illustration ? <SpotIllustration kind={illustration} className="mb-4 h-[88px] w-[120px]" /> : Icon ? <Icon aria-hidden="true" className="mb-3 size-6 text-faint" /> : null}
      <h3 className={cx('m-0 font-semibold text-ink', variant === 'page' ? 'text-xl' : 'text-lg')}>{title}</h3>
      {text ? <p className="m-0 mt-1.5 max-w-sm text-base text-muted">{text}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  )
}
