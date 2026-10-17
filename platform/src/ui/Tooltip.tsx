// A short label on hover and keyboard focus. Each tooltip carries its own provider so it works anywhere. Tooltips do
// not open on touch: a tap focuses the trigger (and a menu it opens hands focus back to it when it closes), so a
// tooltip that opened on that focus would stay over the page until the next tap elsewhere. After a touch or pen press
// the focus that follows is ignored; a key press or a mouse makes the tooltip open again as usual.
import { useRef, useState, type ReactNode } from 'react'
import { Tooltip as T } from 'radix-ui'
import { cx } from './cx'

export function Tooltip({ content, children, side = 'top', align = 'center', delay = 300, className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end'; delay?: number; className?: string }) {
  const [open, setOpen] = useState(false)
  const touched = useRef(false)
  return (
    <T.Provider delayDuration={delay} skipDelayDuration={200}>
      <T.Root open={open} onOpenChange={(next) => setOpen(next && touched.current ? false : next)}>
        <T.Trigger
          asChild
          onPointerDown={(e) => {
            touched.current = e.pointerType === 'touch' || e.pointerType === 'pen'
            if (touched.current) setOpen(false)
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse') touched.current = false
          }}
          onKeyDown={() => {
            touched.current = false
          }}
        >
          {children}
        </T.Trigger>
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
