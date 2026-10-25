// A keyboard key, for shortcut hints.
import type { ComponentProps } from 'react'
import { cx } from './cx'

export function Kbd({ className, ...rest }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-surface px-1 font-sans text-[11px] font-medium leading-none text-muted shadow-[0_1px_0_var(--color-line)]',
        className,
      )}
      {...rest}
    />
  )
}
