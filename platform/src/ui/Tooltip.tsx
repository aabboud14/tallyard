// A short label on hover and keyboard focus. Each tooltip carries its own provider so it works anywhere.
import type { ReactNode } from 'react'
import { Tooltip as T } from 'radix-ui'
import { cx } from './cx'

export function Tooltip({ content, children, side = 'top', align = 'center', delay = 300, className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end'; delay?: number; className?: string }) {
  return (
    <T.Provider delayDuration={delay} skipDelayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={8}
            className={cx(
              'z-[70] max-w-64 rounded-md bg-ink px-2 py-1 text-xs font-medium leading-4 text-white shadow-md',
              'data-[state=delayed-open]:animate-fade-in data-[state=instant-open]:animate-fade-in data-[state=closed]:animate-fade-out',
              className,
            )}
          >
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  )
}
