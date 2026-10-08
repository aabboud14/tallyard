// Dialog (centred) and Sheet (from the right, the left or the bottom), both on the radix dialog: focus is trapped
// inside, Escape and the close button dismiss, and focus returns to whatever opened it.
import type { ReactNode } from 'react'
import { Dialog as D } from 'radix-ui'
import { X } from 'lucide-react'
import { cx } from './cx'

export const DialogClose = D.Close

type BaseProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** An element that opens the dialog, for uncontrolled use. */
  trigger?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  testId?: string
  /** Hide the title visually (it stays the accessible name). */
  hideTitle?: boolean
}

function CloseButton({ testId }: { testId?: string }) {
  return (
    <D.Close asChild>
      <button
        type="button"
        aria-label="Close"
        data-testid={testId ? `${testId}-close` : undefined}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-600 max-sm:size-11"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </D.Close>
  )
}

const overlay = 'fixed inset-0 z-50 bg-[rgb(28_25_23/0.32)] backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out'

export type DialogProps = BaseProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }

const dialogSizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' }

export function Dialog({ open, onOpenChange, trigger, title, description, children, footer, size = 'md', testId, hideTitle = false }: DialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          data-testid={testId}
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
          className={cx(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[min(88dvh,800px)] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-overlay outline-none',
            'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
            dialogSizes[size],
          )}
        >
          <div className={cx('flex shrink-0 items-start justify-between gap-4 px-5 pt-5', hideTitle ? 'pb-0' : 'pb-1')}>
            <div className="min-w-0">
              <D.Title className={cx('m-0 text-lg font-semibold text-ink', hideTitle && 'sr-only')}>{title}</D.Title>
              {description !== undefined ? <D.Description className="m-0 mt-1 text-base text-muted">{description}</D.Description> : null}
            </div>
            <div className="-mr-1.5 -mt-1">
              <CloseButton testId={testId} />
            </div>
          </div>
          {children !== undefined ? <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">{children}</div> : <div className="pb-4" />}
          {footer ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-page/70 px-5 py-3.5">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

export type SheetProps = BaseProps & { side?: 'right' | 'left' | 'bottom'; width?: 'md' | 'lg'; bodyClassName?: string }

const sheetPlace = {
  right: 'inset-y-0 right-0 h-full w-full border-l data-[state=open]:animate-sheet-right-in data-[state=closed]:animate-sheet-right-out',
  left: 'inset-y-0 left-0 h-full w-[min(320px,88vw)] border-r data-[state=open]:animate-sheet-left-in data-[state=closed]:animate-sheet-left-out',
  bottom: 'inset-x-0 bottom-0 max-h-[90dvh] w-full rounded-t-2xl border-t data-[state=open]:animate-sheet-bottom-in data-[state=closed]:animate-sheet-bottom-out',
}

export function Sheet({ open, onOpenChange, trigger, title, description, children, footer, side = 'right', width = 'md', testId, hideTitle = false, bodyClassName }: SheetProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          data-testid={testId}
          data-side={side}
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
          className={cx('fixed z-50 flex flex-col border-line bg-surface shadow-overlay outline-none', sheetPlace[side], side === 'right' && (width === 'lg' ? 'sm:max-w-[560px]' : 'sm:max-w-[440px]'))}
        >
          {side === 'bottom' ? <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-line-strong" /> : null}
          <div className={cx('flex shrink-0 items-start justify-between gap-4 border-b border-line-soft px-5', side === 'bottom' ? 'pb-3 pt-2' : 'py-3.5')}>
            <div className="min-w-0 pt-1">
              <D.Title className={cx('m-0 text-lg font-semibold text-ink', hideTitle && 'sr-only')}>{title}</D.Title>
              {description !== undefined ? <D.Description className="m-0 mt-0.5 text-base text-muted">{description}</D.Description> : null}
            </div>
            <div className="-mr-1.5">
              <CloseButton testId={testId} />
            </div>
          </div>
          <div className={cx('min-h-0 flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>
          {footer ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line-soft bg-page/70 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
