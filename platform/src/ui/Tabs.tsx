// Tabs for routes (each tab is a link, the active one marked as the current page) and a SegmentedControl
// for switching a view in place (cards or table, board or list).
import type { ReactNode } from 'react'
import { Link, useInRouterContext } from 'react-router'
import { ToggleGroup } from 'radix-ui'
import type { LucideIcon } from 'lucide-react'
import { cx } from './cx'

export type TabItem = {
  label: ReactNode
  /** A route. The tab renders as a link. */
  href?: string
  /** For tabs that are not routes: renders a button. */
  onSelect?: () => void
  active?: boolean
  count?: number
  icon?: LucideIcon
  /** Extra mark after the label, for example a "Soon" pill. */
  adornment?: ReactNode
  disabled?: boolean
  testId?: string
}

export function Tabs({ items, label, className, size = 'md' }: { items: TabItem[]; label: string; className?: string; size?: 'sm' | 'md' }) {
  const inRouter = useInRouterContext()
  return (
    <nav aria-label={label} className={cx('-mb-px min-w-0', className)}>
      <ul className="m-0 flex list-none items-stretch gap-5 overflow-x-auto p-0 scrollbar-none sm:gap-6">
        {items.map((t, i) => {
          const Icon = t.icon
          const cls = cx(
            'group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-sm outline-offset-[-2px] transition-colors duration-150',
            size === 'sm' ? 'h-9 text-sm max-sm:h-11' : 'h-11 text-base',
            t.active ? 'font-medium text-ink' : 'text-muted hover:text-ink',
            t.disabled && 'pointer-events-none opacity-50',
            'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors',
            t.active ? 'after:bg-ink' : 'after:bg-transparent hover:after:bg-line-strong',
          )
          const body = (
            <>
              {Icon ? <Icon aria-hidden="true" className={cx('size-4', t.active ? 'text-ink' : 'text-faint group-hover:text-muted')} /> : null}
              <span>{t.label}</span>
              {t.count !== undefined ? (
                <span className={cx('inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums', t.active ? 'bg-ink text-white' : 'bg-subtle text-muted ring-1 ring-inset ring-line-soft')}>{t.count}</span>
              ) : null}
              {t.adornment}
            </>
          )
          return (
            <li key={i} className="flex">
              {t.href !== undefined && inRouter ? (
                <Link to={t.href} aria-current={t.active ? 'page' : undefined} aria-disabled={t.disabled || undefined} className={cls} data-testid={t.testId}>
                  {body}
                </Link>
              ) : t.href !== undefined ? (
                <a href={t.href} aria-current={t.active ? 'page' : undefined} className={cls} data-testid={t.testId}>
                  {body}
                </a>
              ) : (
                <button type="button" onClick={t.onSelect} aria-current={t.active ? 'true' : undefined} disabled={t.disabled} className={cls} data-testid={t.testId}>
                  {body}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export type SegmentItem = { value: string; label: string; icon?: LucideIcon; iconOnly?: boolean }

export function SegmentedControl({ items, value, onValueChange, label, size = 'md', className }: { items: SegmentItem[]; value: string; onValueChange: (v: string) => void; label: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onValueChange(v)
      }}
      aria-label={label}
      className={cx('inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-subtle p-0.5 ring-1 ring-inset ring-line-soft', className)}
    >
      {items.map((it) => {
        const Icon = it.icon
        return (
          <ToggleGroup.Item
            key={it.value}
            value={it.value}
            aria-label={it.iconOnly ? it.label : undefined}
            title={it.iconOnly ? it.label : undefined}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 rounded-md font-medium text-muted transition-[background-color,color,box-shadow] duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_2px_rgb(28_25_23/0.08),0_0_0_1px_rgb(28_25_23/0.04)] [&_svg]:size-4',
              size === 'sm' ? 'h-7 px-2 text-sm' : 'h-8 px-2.5 text-sm',
              it.iconOnly && (size === 'sm' ? 'w-7 px-0 max-sm:min-w-11' : 'w-8 px-0 max-sm:min-w-11'),
              'max-sm:min-h-11',
            )}
          >
            {Icon ? <Icon aria-hidden="true" /> : null}
            {it.iconOnly ? null : it.label}
          </ToggleGroup.Item>
        )
      })}
    </ToggleGroup.Root>
  )
}
