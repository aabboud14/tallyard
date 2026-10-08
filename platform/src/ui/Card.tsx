// Surfaces: Card and its parts, Stat tiles, Callout notes and a DescriptionList for key facts.
import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CircleAlert, Info, TriangleAlert, CircleCheck } from 'lucide-react'
import { cx } from './cx'
import { IndicativeMarker, type Tone } from './Badge'

export type CardProps = Omit<ComponentProps<'div'>, 'ref'> & {
  /** Lifts on hover; use when the whole card is a link. */
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: 'div' | 'section' | 'article' | 'li'
}

const pads = { none: '', sm: 'p-3', md: 'p-4 sm:p-5', lg: 'p-5 sm:p-6' }

export function Card({ interactive = false, padding = 'none', as = 'div', className, ...rest }: CardProps) {
  // The element changes; the props are the same for each of these block elements.
  const As = as as 'div'
  return (
    <As
      className={cx(
        'relative min-w-0 rounded-lg border border-line bg-surface shadow-sm',
        interactive && 'transition-[box-shadow,border-color,transform] duration-200 ease-out hover:border-line-strong hover:shadow-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-brand-600',
        pads[padding],
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ title, description, actions, icon: Icon, className, titleAs: H = 'h2' }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; icon?: LucideIcon; className?: string; titleAs?: 'h2' | 'h3' }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" /> : null}
        <div className="min-w-0">
          <H className="m-0 truncate text-base font-semibold text-ink">{title}</H>
          {description ? <p className="m-0 mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cx('px-4 py-4 sm:px-5', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cx('flex flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-page/60 px-4 py-3 sm:px-5 rounded-b-lg', className)} {...rest} />
}

export type StatProps = {
  label: ReactNode
  value: ReactNode
  /** Unit or secondary value beside the figure, smaller. */
  unit?: ReactNode
  sub?: ReactNode
  icon?: LucideIcon
  /** Adds the Indicative marker with its link to the methodology (P4). */
  indicative?: boolean
  className?: string
  /** Render without the card border, for use inside another surface. */
  bare?: boolean
}

export function Stat({ label, value, unit, sub, icon: Icon, indicative = false, className, bare = false }: StatProps) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-2', !bare && 'rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink-soft">
          {Icon ? (
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-subtle text-muted ring-1 ring-inset ring-line-soft">
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
          ) : null}
          <span className="truncate">{label}</span>
        </div>
        {indicative ? <IndicativeMarker /> : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums text-ink">{value}</span>
        {unit ? <span className="text-base font-medium text-muted">{unit}</span> : null}
      </div>
      {sub ? <div className="text-sm text-muted">{sub}</div> : null}
    </div>
  )
}

const calloutTones: Record<Tone, { box: string; icon: LucideIcon; iconCls: string }> = {
  neutral: { box: 'border-line bg-subtle/70', icon: Info, iconCls: 'text-muted' },
  brand: { box: 'border-brand-100 bg-brand-50', icon: CircleCheck, iconCls: 'text-brand-600' },
  info: { box: 'border-info-line bg-info-soft', icon: Info, iconCls: 'text-info' },
  warning: { box: 'border-warning-line bg-warning-soft/70', icon: TriangleAlert, iconCls: 'text-warning' },
  danger: { box: 'border-danger-line bg-danger-soft/70', icon: CircleAlert, iconCls: 'text-danger' },
}

export function Callout({ tone = 'neutral', title, children, icon, action, className, role }: { tone?: Tone; title?: ReactNode; children?: ReactNode; icon?: LucideIcon; action?: ReactNode; className?: string; role?: 'alert' | 'status' }) {
  const t = calloutTones[tone]
  const Icon = icon ?? t.icon
  return (
    <div role={role} className={cx('flex items-start gap-3 rounded-lg border px-3.5 py-3 text-base', t.box, className)}>
      <Icon aria-hidden="true" className={cx('mt-0.5 size-4 shrink-0', t.iconCls)} />
      <div className="min-w-0 flex-1">
        {title ? <p className="m-0 font-medium text-ink">{title}</p> : null}
        {children ? <div className={cx('text-ink-soft', title ? 'mt-0.5' : null)}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}

export type DescriptionItem = { label: ReactNode; value: ReactNode; hint?: ReactNode }

/** Key facts as label and value rows. `rows` puts the label on the left; `grid` stacks them in columns. */
export function DescriptionList({ items, layout = 'rows', columns = 2, className }: { items: DescriptionItem[]; layout?: 'rows' | 'grid'; columns?: 2 | 3 | 4; className?: string }) {
  if (layout === 'grid') {
    return (
      <dl className={cx('m-0 grid grid-cols-2 gap-x-6 gap-y-4', columns === 3 && 'sm:grid-cols-3', columns === 4 && 'sm:grid-cols-4', className)}>
        {items.map((it, i) => (
          <div key={i} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-sm text-muted">{it.label}</dt>
            <dd className="m-0 break-words font-medium tabular-nums text-ink">{it.value}</dd>
            {it.hint ? <dd className="m-0 text-xs text-muted">{it.hint}</dd> : null}
          </div>
        ))}
      </dl>
    )
  }
  return (
    <dl className={cx('m-0 divide-y divide-line-soft', className)}>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-muted">{it.label}</dt>
          <dd className="m-0 min-w-0 break-words text-right font-medium tabular-nums text-ink">
            {it.value}
            {it.hint ? <span className="block text-xs font-normal text-muted">{it.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
