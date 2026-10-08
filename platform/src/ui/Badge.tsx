// Small labels: Badge (square, for counts and tags), Pill (round, with a dot or icon), and the two status pills
// the product uses everywhere: StatusPill for shortlist items and FitPill for the timeline check.
import type { ComponentProps, ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'
import type { Fit } from '../domain/v1types'
import { TIMELINE_TEXT } from '../domain/reference/labels'
import { cx } from './cx'
import { FIT, STATUS, type ItemStatus, type Tone } from './labels'

export type { ItemStatus, Tone } from './labels'

const badgeTones: Record<Tone | 'outline' | 'solid', string> = {
  neutral: 'bg-subtle text-ink-soft ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  info: 'bg-info-soft text-info-strong ring-info-line',
  warning: 'bg-warning-soft text-warning ring-warning-line',
  danger: 'bg-danger-soft text-danger ring-danger-line',
  outline: 'bg-surface text-ink-soft ring-line',
  solid: 'bg-ink text-white ring-ink',
}

export function Badge({ tone = 'neutral', icon: Icon, className, children, ...rest }: ComponentProps<'span'> & { tone?: Tone | 'outline' | 'solid'; icon?: LucideIcon }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium tabular-nums ring-1 ring-inset [&_svg]:size-3',
        badgeTones[tone],
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

const pillTones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-subtle text-ink-soft ring-line', dot: 'bg-faint' },
  brand: { pill: 'bg-brand-50 text-brand-700 ring-brand-100', dot: 'bg-brand-500' },
  info: { pill: 'bg-info-soft text-info-strong ring-info-line', dot: 'bg-info' },
  warning: { pill: 'bg-warning-soft text-warning ring-warning-line', dot: 'bg-[#d97706]' },
  danger: { pill: 'bg-danger-soft text-danger ring-danger-line', dot: 'bg-danger' },
}

export type PillProps = ComponentProps<'span'> & { tone?: Tone; dot?: boolean; icon?: LucideIcon; size?: 'sm' | 'md' }

export function Pill({ tone = 'neutral', dot = false, icon: Icon, size = 'md', className, children, ...rest }: PillProps) {
  const t = pillTones[tone]
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'h-5 gap-1 px-2 text-xs [&_svg]:size-3' : 'h-6 gap-1.5 px-2.5 text-sm [&_svg]:size-3.5',
        t.pill,
        className,
      )}
      {...rest}
    >
      {dot ? <span aria-hidden="true" className={cx('size-1.5 shrink-0 rounded-full', t.dot)} /> : null}
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

export function StatusPill({ status, size = 'md', className }: { status: ItemStatus; size?: 'sm' | 'md'; className?: string }) {
  const s = STATUS[status]
  return (
    <Pill tone={s.tone} dot size={size} className={className} data-status={status === 'pending' ? 'shortlisted' : status}>
      {s.label}
    </Pill>
  )
}

/** The timeline check for one material against one project start date. The full sentence is the accessible name. */
export function FitPill({ fit, size = 'md', className }: { fit: Fit; size?: 'sm' | 'md'; className?: string }) {
  const f = FIT[fit]
  return (
    <Pill tone={f.tone} icon={f.icon} size={size} className={className} data-fit={fit} title={TIMELINE_TEXT[fit]} aria-label={`Timeline check: ${TIMELINE_TEXT[fit]}`}>
      <span aria-hidden="true">{f.label}</span>
    </Pill>
  )
}

export const METHODOLOGY_HREF = '/app/help/methodology'

/** The marker on every indicative figure (P4): links to Help, Methodology. */
export function IndicativeMarker({ href = METHODOLOGY_HREF, label = 'Indicative', className }: { href?: string; label?: ReactNode; className?: string }) {
  const inRouter = useInRouterContext()
  const cls = cx(
    'relative inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted max-sm:after:absolute max-sm:after:-inset-x-1 max-sm:after:-inset-y-3.5 underline decoration-line-strong decoration-dotted underline-offset-[3px] transition-colors hover:text-ink hover:decoration-muted [&_svg]:size-3',
    className,
  )
  const body = (
    <>
      <Info aria-hidden="true" />
      {label}
    </>
  )
  const title = 'Indicative figure. See how it is worked out.'
  return inRouter ? (
    <Link to={href} className={cls} title={title}>
      {body}
    </Link>
  ) : (
    <a href={href} className={cls} title={title}>
      {body}
    </a>
  )
}
