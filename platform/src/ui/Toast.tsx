// Toasts: call toast() from anywhere; mount <Toaster /> once at the root. Announced politely, dismissed after a
// few seconds, swipe or Escape, with an optional cheap action such as Undo.
import { useSyncExternalStore } from 'react'
import { Toast as T } from 'radix-ui'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cx } from './cx'
import { dismissToast, snapshot, subscribe } from './toastStore'

const ICONS = {
  default: null,
  success: { Icon: CircleCheck, cls: 'text-brand-600' },
  error: { Icon: CircleAlert, cls: 'text-danger' },
  info: { Icon: Info, cls: 'text-info' },
} as const

export function Toaster() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot)
  return (
    <T.Provider swipeDirection="right" label="Notification">
      {list.map((t) => {
        const icon = ICONS[t.tone ?? 'default']
        return (
          <T.Root
            key={t.id}
            open={t.open}
            onOpenChange={(o) => {
              if (!o) dismissToast(t.id)
            }}
            duration={t.duration ?? (t.action ? 8000 : 5000)}
            data-testid="toast"
            className={cx(
              'group pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border border-line bg-surface py-3 pl-3.5 pr-10 shadow-pop',
              'data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out',
              'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-toast-out',
            )}
          >
            {icon ? <icon.Icon aria-hidden="true" className={cx('mt-0.5 size-4 shrink-0', icon.cls)} /> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <T.Title className="text-base font-medium text-ink">{t.title}</T.Title>
              {t.description ? <T.Description className="text-sm text-muted">{t.description}</T.Description> : null}
            </div>
            {t.action ? (
              <T.Action
                altText={t.action.label}
                onClick={t.action.onClick}
                className="-my-0.5 inline-flex h-7 shrink-0 items-center rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-ink shadow-xs hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 max-sm:h-10"
              >
                {t.action.label}
              </T.Action>
            ) : null}
            <T.Close aria-label="Dismiss" className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-md text-faint transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600">
              <X aria-hidden="true" className="size-3.5" />
            </T.Close>
          </T.Root>
        )
      })}
      <T.Viewport className="fixed bottom-0 right-0 z-[100] m-0 flex w-full max-w-[400px] list-none flex-col gap-2 p-4 outline-none sm:bottom-2 sm:right-2" />
    </T.Provider>
  )
}
