// Tabs for routes (each tab is a link, the active one marked as the current page) and a SegmentedControl
// for switching a view in place (cards or table, board or list).
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useInRouterContext } from 'react-router'
import { ToggleGroup } from 'radix-ui'
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
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

/** Which ends of a sideways scroller have more to show. */
function useOverflowEdges(ref: RefObject<HTMLElement | null>, key: string): { left: boolean; right: boolean } {
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => {
      const left = el.scrollLeft > 1
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
    }
    // The current tab starts in view, however far along the strip it sits.
    const active = el.querySelector<HTMLElement>('[aria-current]')
    if (active && el.scrollWidth > el.clientWidth) {
      const a = active.getBoundingClientRect()
      const box = el.getBoundingClientRect()
      if (a.left < box.left || a.right > box.right) el.scrollLeft += a.left - box.left - (box.width - a.width) / 2
    }
    read()
    el.addEventListener('scroll', read, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read)
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', read)
      ro?.disconnect()
    }
  }, [ref, key])
  return edges
}

const EDGE = 'absolute inset-y-0 z-[1] flex w-9 items-center justify-center bg-surface text-muted hover:text-ink max-sm:w-11'

/**
 * Route tabs in one row that scrolls sideways when it is too long, with a chevron at each end that has more.
 * With wrapOnPhone, the tabs wrap onto a second row below 640 px instead (a short, fixed set such as schemes).
 */
export function Tabs({ items, label, className, size = 'md', wrapOnPhone = false }: { items: TabItem[]; label: string; className?: string; size?: 'sm' | 'md'; wrapOnPhone?: boolean }) {
  const inRouter = useInRouterContext()
  const list = useRef<HTMLUListElement>(null)
  const edges = useOverflowEdges(list, items.map((t) => `${String(t.href)}:${t.active ? 1 : 0}`).join('|'))
  const nudge = (dir: -1 | 1) => {
    const el = list.current
    if (el) el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.6), behavior: 'smooth' })
  }
  return (
    <nav aria-label={label} className={cx('relative -mb-px min-w-0', className)}>
      {edges.left ? (
        <button type="button" tabIndex={-1} aria-label="Show earlier tabs" onClick={() => nudge(-1)} className={cx(EDGE, 'left-0 border-r border-line-soft')} data-part="tabs-scroll-left">
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {edges.right ? (
        <button type="button" tabIndex={-1} aria-label="Show more tabs" onClick={() => nudge(1)} className={cx(EDGE, 'right-0 border-l border-line-soft')} data-part="tabs-scroll-right">
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <ul ref={list} className={cx('m-0 flex list-none items-stretch gap-5 overflow-x-auto p-0 scrollbar-none sm:gap-6', wrapOnPhone && 'max-sm:flex-wrap max-sm:gap-x-5 max-sm:gap-y-0')}>
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
              'inline-flex items-center justify-center gap-1.5 rounded-md font-medium text-muted transition-[background-color,color,box-shadow] duration-150 hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 data-[state=on]:bg-surface data-[state=on]:text-ink data-[state=on]:shadow-[0_1px_2px_rgb(28_25_23/0.08),0_0_0_1px_rgb(28_25_23/0.04)] [&_svg]:size-4',
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
