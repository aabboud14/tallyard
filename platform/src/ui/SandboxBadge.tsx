// The one sandbox marker in the chrome (P1): sample data that stays in this browser.
import { FlaskConical } from 'lucide-react'
import { cx } from './cx'
import { Tooltip } from './Tooltip'

export const SANDBOX_LINE = 'Sample data that stays in this browser.'

export function SandboxBadge({ className, href }: { className?: string; href?: string }) {
  const body = (
    <>
      <FlaskConical aria-hidden="true" className="size-3" />
      Sandbox
    </>
  )
  const cls = cx(
    'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-warning-soft/70 px-2.5 text-xs font-medium text-warning ring-1 ring-inset ring-warning-line transition-colors hover:bg-warning-soft',
    className,
  )
  return (
    <Tooltip content={SANDBOX_LINE} side="bottom">
      {href ? (
        <a href={href} className={cls} aria-label={`Sandbox. ${SANDBOX_LINE}`} data-testid="sandbox-badge">
          {body}
        </a>
      ) : (
        <span tabIndex={0} className={cls} aria-label={`Sandbox. ${SANDBOX_LINE}`} data-testid="sandbox-badge">
          {body}
        </span>
      )}
    </Tooltip>
  )
}
