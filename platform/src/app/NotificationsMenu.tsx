// The bell: the unread count on the button, and a popover inbox with the latest notifications. Opening one marks
// it read and goes to its page; "Mark all read" clears the count.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { NOTIFICATION_ICONS } from './notificationIcons'
import { act, useView } from '../store'
import { bellView, type InboxItem } from '../store/selectors/notifications'
import { Button, cx, Popover, PopoverContent, PopoverTrigger } from '../ui'

export function NotificationRow({ n, onOpen, compact = false }: { n: InboxItem; onOpen: (n: InboxItem) => void; compact?: boolean }) {
  const Icon = NOTIFICATION_ICONS[n.kind]
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      data-testid="notification-row"
      data-unread={n.unread || undefined}
      className={cx('group flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left outline-none transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600', compact ? '' : 'sm:px-3')}
    >
      <span className={cx('relative mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', n.unread ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-subtle text-muted ring-line-soft')}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cx('text-base leading-5', n.unread ? 'font-medium text-ink' : 'text-ink-soft')}>
          {n.title}
          {n.count > 1 ? <span className="ml-1.5 text-sm font-normal text-muted">{n.count} times</span> : null}
        </span>
        <span className="line-clamp-2 text-sm text-muted">{n.body}</span>
        <span className="text-xs text-faint">{n.timeAgo}</span>
      </span>
      {n.unread ? <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" /> : <span className="mt-2 size-2 shrink-0" />}
    </button>
  )
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const bell = useView(bellView, 8)
  if (!bell) return null
  const openOne = (n: InboxItem) => {
    if (n.unread) act.readNotification(n.id)
    setOpen(false)
    navigate(n.href)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="notifications-button"
          aria-label={bell.unread > 0 ? `Notifications, ${bell.unread} unread` : 'Notifications'}
          className="relative inline-flex size-9 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600 data-[state=open]:bg-hover data-[state=open]:text-ink max-sm:size-11"
        >
          <Bell aria-hidden="true" className="size-[18px]" />
          {bell.unread > 0 ? (
            <span data-testid="unread-count" className="absolute right-0.5 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none tabular-nums text-white ring-2 ring-surface max-sm:right-1.5 max-sm:top-1.5">
              {bell.unread > 9 ? '9+' : bell.unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0" data-testid="notifications-popover">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-base font-semibold text-ink">Notifications</h2>
            {bell.unread > 0 ? <span className="rounded-full bg-brand-50 px-1.5 text-xs font-medium tabular-nums text-brand-700 ring-1 ring-inset ring-brand-100">{bell.unread} new</span> : null}
          </div>
          <Button variant="ghost" size="sm" icon={CheckCheck} disabled={bell.unread === 0} onClick={() => act.readAllNotifications()} data-testid="mark-all-read">
            Mark all read
          </Button>
        </div>
        {bell.items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-subtle text-muted ring-1 ring-inset ring-line-soft">
              <BellOff aria-hidden="true" className="size-5" />
            </span>
            <p className="m-0 mt-3 font-medium text-ink">You are all caught up</p>
            <p className="m-0 mt-1 text-sm text-muted">Decisions, shares and requests on your work will appear here.</p>
          </div>
        ) : (
          <div className="max-h-[min(440px,60dvh)] overflow-y-auto overscroll-contain p-1.5">
            {bell.items.map((n) => (
              <NotificationRow key={n.id} n={n} onOpen={openOne} compact />
            ))}
          </div>
        )}
        <div className="border-t border-line-soft p-1.5">
          <Link to="/app/notifications" onClick={() => setOpen(false)} className="flex h-9 items-center justify-center rounded-md text-sm font-medium text-ink-soft transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600">
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
