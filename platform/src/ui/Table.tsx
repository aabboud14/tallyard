// Data tables: a bordered surface that scrolls sideways inside itself (never the page), sortable header cells
// with aria-sort, numeric cells right-aligned in tabular figures, and a compact density for ledgers.
import type { ComponentProps, ReactNode } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cx } from './cx'

export type SortDirection = 'asc' | 'desc' | null

export function Table({ density = 'default', className, children, caption, bare = false, ...rest }: ComponentProps<'table'> & { density?: 'default' | 'compact'; caption?: ReactNode; bare?: boolean }) {
  return (
    <div className={cx('relative w-full min-w-0 overflow-x-auto', !bare && 'rounded-lg border border-line bg-surface shadow-sm', className)} data-density={density}>
      <table
        className={cx(
          'w-full border-separate border-spacing-0 text-left text-base tabular-nums',
          density === 'compact' ? '[&_td]:h-9 [&_td]:py-1.5 [&_th]:h-8' : '[&_td]:h-12 [&_td]:py-2.5 [&_th]:h-9',
        )}
        {...rest}
      >
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function THead({ className, ...rest }: ComponentProps<'thead'>) {
  return <thead className={cx('[&_th]:border-b [&_th]:border-line [&_th]:bg-page/70 first:[&_th]:rounded-tl-lg last:[&_th]:rounded-tr-lg', className)} {...rest} />
}

export function TBody({ className, ...rest }: ComponentProps<'tbody'>) {
  return <tbody className={cx('[&_tr:last-child_td]:border-b-0', className)} {...rest} />
}

export function TR({ className, interactive = false, selected = false, ...rest }: ComponentProps<'tr'> & { interactive?: boolean; selected?: boolean }) {
  return (
    <tr
      aria-selected={selected || undefined}
      className={cx('[&_td]:border-b [&_td]:border-line-soft', interactive && 'cursor-pointer transition-colors hover:bg-page', selected && 'bg-brand-50/60 hover:bg-brand-50', className)}
      {...rest}
    />
  )
}

type Align = 'left' | 'right' | 'center'
const alignCls: Record<Align, string> = { left: 'text-left', right: 'text-right', center: 'text-center' }

export type THProps = ComponentProps<'th'> & {
  align?: Align
  /** Current sort on this column. Pass `onSort` to make the header a button. */
  sort?: SortDirection
  onSort?: () => void
}

export function TH({ align = 'left', sort, onSort, className, children, ...rest }: THProps) {
  const ariaSort = onSort ? (sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none') : undefined
  const SortIcon = sort === 'asc' ? ChevronUp : sort === 'desc' ? ChevronDown : ChevronsUpDown
  return (
    <th scope="col" aria-sort={ariaSort} className={cx('whitespace-nowrap px-3 text-xs font-medium text-muted first:pl-4 last:pr-4', alignCls[align], className)} {...rest}>
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={cx(
            'group -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 font-medium hover:text-ink max-sm:min-h-11 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-600',
            sort ? 'text-ink' : null,
            align === 'right' && 'flex-row-reverse',
          )}
        >
          {children}
          <SortIcon aria-hidden="true" className={cx('size-3.5', sort ? 'text-ink' : 'text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100')} />
        </button>
      ) : (
        children
      )}
    </th>
  )
}

export function TD({ align = 'left', muted = false, className, ...rest }: ComponentProps<'td'> & { align?: Align; muted?: boolean }) {
  return <td className={cx('px-3 align-middle first:pl-4 last:pr-4', alignCls[align], muted ? 'text-muted' : 'text-ink', className)} {...rest} />
}
