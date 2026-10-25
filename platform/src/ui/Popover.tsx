// Popover: a floating panel anchored to a trigger, with a soft shadow. Focus moves inside; Escape closes.
import type { ComponentProps } from 'react'
import { Popover as P } from 'radix-ui'
import { cx } from './cx'

export const Popover = P.Root
export const PopoverTrigger = P.Trigger
export const PopoverAnchor = P.Anchor
export const PopoverClose = P.Close

export function PopoverContent({ className, align = 'start', sideOffset = 6, children, ...rest }: ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cx(
          'z-[60] w-72 max-w-[calc(100vw-24px)] rounded-lg border border-line bg-surface p-3 text-base text-ink shadow-pop outline-none',
          'origin-(--radix-popover-content-transform-origin) data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          className,
        )}
        {...rest}
      >
        {children}
      </P.Content>
    </P.Portal>
  )
}
