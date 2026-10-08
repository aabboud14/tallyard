// The inbox: notifications for the organisation, grouped by day, filtered by kind or unread, with read state per
// person. Opening one marks it read and goes to the record.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BellOff, Check, CheckCheck, Settings2 } from 'lucide-react'
import { act, selectors, useSession, useView } from '../../store'
import type { InboxFilter, InboxItem } from '../../store/selectors/notifications'
import { Badge, Button, Card, cx, EmptyState, IconButton, PageHeader, toast } from '../../ui'
import { Page } from '../../app/Page'
import { KindIcon } from './kit'

export function Notifications() {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const v = useView(selectors.inboxView, filter)
  const { org } = useSession()
  const navigate = useNavigate()
  if (!v) return null
  const open = (n: InboxItem) => {
    if (n.unread) act.readNotification(n.id)
    navigate(n.href)
  }
  const readAll = () => {
    const r = act.readAllNotifications()
    if (r.ok) toast.success('All marked as read', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <Page width="narrow" testId="notifications">
      <PageHeader
        title="Notifications"
        subtitle={org ? `Updates for ${org.name}, in the app only.` : undefined}
        actions={
          <>
            <Button asChild variant="ghost" icon={Settings2}>
              <Link to="/app/settings/notifications">Preferences</Link>
            </Button>
            <Button icon={CheckCheck} onClick={readAll} disabled={v.unread === 0} data-testid="read-all">
              Mark all as read
            </Button>
          </>
        }
      />
      <div className="-mx-4 mt-6 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0" role="toolbar" aria-label="Filter notifications">
        <div className="flex w-max gap-1.5">
          {v.filters.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={v.filter === x.id}
              onClick={() => setFilter(x.id)}
              className={cx(
                'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium ring-1 ring-inset transition-colors max-sm:h-11',
                v.filter === x.id ? 'bg-ink text-white ring-ink' : 'bg-surface text-ink-soft ring-line hover:bg-subtle hover:text-ink',
              )}
              data-testid={`filter-${x.id}`}
            >
              {x.label}
              <span className={cx('tabular-nums', v.filter === x.id ? 'text-white/70' : 'text-faint')}>{x.count}</span>
            </button>
          ))}
        </div>
      </div>

      {v.empty ? (
        <EmptyState
          variant="page"
          icon={v.filter === 'unread' ? CheckCheck : BellOff}
          title={v.filter === 'unread' ? 'You are all caught up' : v.total === 0 ? 'No notifications yet' : 'Nothing of this kind'}
          text={v.filter === 'unread' ? 'Everything here has been read.' : v.total === 0 ? 'Decisions, requests and new materials for your work appear here.' : 'Choose another filter to see more.'}
          testId="notifications-empty"
        />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {v.groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="m-0 mb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted">{g.label}</h2>
              <Card>
                <ul className="m-0 list-none divide-y divide-line-soft p-0">
                  {g.items.map((n) => (
                    <li key={n.id} className={cx('group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-page sm:px-5', n.unread && 'bg-brand-50/30')} data-testid={`notification-${n.id}`}>
                      <KindIcon kind={n.kind} unread={n.unread} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 flex items-start gap-2">
                          <button type="button" onClick={() => open(n)} className={cx('text-left text-base outline-none after:absolute after:inset-0 after:content-[""]', n.unread ? 'font-semibold text-ink' : 'font-medium text-ink-soft')}>
                            {n.title}
                          </button>
                          {n.count > 1 ? <Badge tone="outline">{n.count}</Badge> : null}
                        </p>
                        <p className="m-0 mt-0.5 text-sm text-ink-soft">{n.body}</p>
                        <p className="m-0 mt-1 text-xs text-muted">
                          {n.kindLabel} · {n.timeAgo}
                        </p>
                      </div>
                      <div className="relative z-[1] flex shrink-0 items-center gap-1">
                        {n.unread ? (
                          <>
                            <IconButton icon={Check} label="Mark as read" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100" onClick={() => act.readNotification(n.id)} />
                            <span aria-hidden="true" className="size-2 rounded-full bg-brand-600" />
                            <span className="sr-only">Unread</span>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}

export default Notifications
