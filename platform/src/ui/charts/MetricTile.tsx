// Dashboard metric tiles. Colour carries meaning: a tile is coloured by its state against a target (good,
// warning, critical, neutral), always with an icon and a word, never by what kind of metric it is. The figure
// stays ink. An optional chart sits on the right when the tile is wide enough; the whole tile can be a link.
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, useInRouterContext } from 'react-router'
import { cx } from '../cx'
import { IndicativeMarker } from '../Badge'
import { StateLine } from '../Card'
import { MARK, METRIC_STATE, type MetricState } from '../labels'

/** Two tiles across on phones, four from 1280 px. */
export function MetricGrid({ children, className, label, testId }: { children: ReactNode; className?: string; /** Names the group of figures. */ label?: string; testId?: string }) {
  return (
    <div role={label ? 'group' : undefined} aria-label={label} data-testid={testId} className={cx('grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4', className)}>
      {children}
    </div>
  )
}

export type MetricTileProps = {
  label: string
  value: ReactNode
  unit?: ReactNode
  /** One quiet line under the figure. */
  sub?: ReactNode
  icon?: LucideIcon
  /** State against a target, from a pure domain function. Leave out when no target applies. */
  state?: MetricState
  /** Overrides the state's words, for example "Over a week". */
  stateLabel?: string
  /** A Donut, ProgressRing or small bar, shown on the right when the tile is at least 19rem wide. */
  chart?: ReactNode
  /** Content under the tile body, for example a Legend. */
  footer?: ReactNode
  /** Adds the Indicative marker with its link to the methodology (P4). */
  indicative?: boolean
  /** Makes the whole tile a link, named by its label. */
  href?: string
  testId?: string
  className?: string
}

const STATE_BORDER: Record<MetricState, string | null> = { good: null, warning: 'border-warning-line', critical: 'border-danger-line', neutral: null }

export function MetricTile({ label, value, unit, sub, icon: Icon, state, stateLabel, chart, footer, indicative = false, href, testId, className }: MetricTileProps) {
  const inRouter = useInRouterContext()
  const linkCls = 'rounded-sm outline-none after:absolute after:inset-0 after:z-[1] after:rounded-lg after:content-[""] hover:text-ink'
  const labelNode = href ? (
    inRouter ? (
      <Link to={href} className={linkCls}>
        {label}
      </Link>
    ) : (
      <a href={href} className={linkCls}>
        {label}
      </a>
    )
  ) : (
    label
  )
  return (
    <div
      data-testid={testId}
      data-state={state}
      className={cx(
        '@container relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-line bg-surface p-3.5 sm:p-5',
        state ? STATE_BORDER[state] : null,
        href && 'transition-colors duration-150 hover:border-line-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-600',
        className,
      )}
    >
      {state && state !== 'neutral' ? <span aria-hidden="true" data-part="state-rule" className="absolute inset-x-0 top-0 h-0.5" style={{ background: MARK[METRIC_STATE[state].tone] }} /> : null}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-start gap-1.5 text-sm font-medium text-ink-soft">
            {Icon ? <Icon aria-hidden="true" className="mt-[3px] size-3.5 shrink-0 text-faint" /> : null}
            <span className="min-w-0 break-words">{labelNode}</span>
          </div>
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <span className="min-w-0 text-2xl font-semibold text-ink @[15rem]:text-3xl">{value}</span>
            {unit ? <span className="text-base font-medium text-muted">{unit}</span> : null}
          </div>
          {state ? <StateLine state={state} label={stateLabel} /> : null}
          {sub ? <div className="text-sm text-muted">{sub}</div> : null}
        </div>
        {chart ? <div className="hidden @[19rem]:block">{chart}</div> : null}
      </div>
      {footer || indicative ? (
        <div className="relative z-[2] flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          {footer ? <div className="min-w-0">{footer}</div> : <span />}
          {indicative ? <IndicativeMarker /> : null}
        </div>
      ) : null}
    </div>
  )
}
