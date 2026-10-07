// A side or bottom sheet on the radix dialog: focus is trapped inside, Escape and the close button dismiss it.
import type { ReactNode } from 'react'
import { Dialog } from 'radix-ui'
import { cx } from '../ui'
import { Close } from './icons'

export function Sheet({ open, onOpenChange, title, description, side = 'right', children, footer, testId }: { open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; description?: ReactNode; side?: 'right' | 'bottom'; children: ReactNode; footer?: ReactNode; testId?: string }) {
  const place =
    side === 'right'
      ? 'inset-y-0 right-0 h-full w-[min(420px,100vw)] border-l'
      : 'inset-x-0 bottom-0 max-h-[85vh] w-full rounded-t-md border-t'
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content
          className={cx('fixed z-50 flex flex-col border-rule bg-panel shadow-[0_0_0_1px_rgba(20,32,43,0.04),0_24px_48px_-24px_rgba(20,32,43,0.35)] focus:outline-none', place)}
          data-testid={testId}
          data-side={side}
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
        >
          {side === 'bottom' ? <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-rule" aria-hidden="true" /> : null}
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule-soft px-4 py-2">
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm text-ink-soft hover:bg-steel-tint hover:text-ink" data-testid={testId ? `${testId}-close` : undefined}>
                <Close />
              </button>
            </Dialog.Close>
          </header>
          {description !== undefined ? <Dialog.Description className="px-4 pt-3 text-sm text-mill-text">{description}</Dialog.Description> : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer ? <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-rule-soft px-4 py-3">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
