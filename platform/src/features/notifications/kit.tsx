// Small pieces shared by the client, owner, surveyor and consultant screens: the activity feed, a strip of figures
// in one surface, a quiet list row, and the icon for each kind of notification.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { Bell, Building2, Camera, CheckCheck, ClipboardCheck, EyeOff, FolderInput, Handshake, Inbox, PackagePlus, Share2, UserPlus } from 'lucide-react'
import type { NotificationKind } from '../../store'
import type { ActivityRow } from '../../store/selectors/common'
import { Avatar, cx, EmptyState, IndicativeMarker } from '../../ui'

/** Actors written in place of a name, so neither side learns who the other is. */
const BLIND_ACTORS = new Set(['A buyer', 'The buyer', 'The seller'])

export function ActivityFeed({ rows, emptyText = 'Nothing has happened here yet.', compact = false, testId }: { rows: ActivityRow[]; emptyText?: string; compact?: boolean; testId?: string }) {
  if (rows.length === 0) return <EmptyState variant="inline" icon={Bell} title="No activity yet" text={emptyText} testId={testId} />
  return (
    <ol data-testid={testId} className="relative m-0 flex list-none flex-col p-0">
      {rows.map((r, i) => {
        const body = (
          <>
            <span className="font-medium text-ink">{r.actor}</span> <span className="text-ink-soft">{r.text}</span>
          </>
        )
        return (
          <li key={r.id} className={cx('relative flex gap-3', compact ? 'pb-3.5 last:pb-0' : 'pb-5 last:pb-0')}>
            {i < rows.length - 1 ? <span aria-hidden="true" className="absolute left-3 top-7 -bottom-0.5 w-px bg-line-soft" /> : null}
            {BLIND_ACTORS.has(r.actor) ? (
              <span aria-hidden="true" className="relative mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-subtle text-muted ring-2 ring-surface">
                <EyeOff className="size-3" />
              </span>
            ) : (
              <Avatar name={r.actor} size="sm" decorative className="relative mt-0.5 ring-2 ring-surface" />
            )}
            <div className="min-w-0 flex-1 text-base leading-5">
              {r.href ? (
                <Link to={r.href} className="rounded-sm hover:underline hover:decoration-line-strong hover:underline-offset-4">
                  {body}
                </Link>
              ) : (
                <p className="m-0">{body}</p>
              )}
              <p className="m-0 mt-0.5 text-xs text-muted">{r.timeAgo}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export type StripItem = { label: ReactNode; value: ReactNode; unit?: ReactNode; sub?: ReactNode; indicative?: boolean; tone?: 'default' | 'attention'; testId?: string; href?: string }

const COLS: Record<number, string> = { 1: 'grid-cols-1!', 2: '', 3: 'sm:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'sm:grid-cols-3 lg:grid-cols-5', 6: 'sm:grid-cols-3 lg:grid-cols-6' }

/** Several figures in one surface, divided by hairlines. Two columns on a phone, up to six across. */
export function StatStrip({ items, className }: { items: StripItem[]; className?: string }) {
  const cols = COLS[Math.min(items.length, 6)] ?? COLS[6]
  return (
    <dl className={cx('m-0 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface shadow-sm', cols, className)}>
      {items.map((it, i) => {
        const inner = (
          <>
            <dt className="truncate text-sm text-muted">{it.label}</dt>
            <dd className="m-0 mt-1.5 flex items-baseline gap-1.5">
              <span className={cx('text-2xl font-semibold tabular-nums', it.tone === 'attention' ? 'text-brand-700' : 'text-ink')}>{it.value}</span>
              {it.unit ? <span className="text-sm font-medium text-muted">{it.unit}</span> : null}
            </dd>
            {it.sub || it.indicative ? (
              <dd className="relative z-[1] m-0 mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                {it.sub ? <span className="min-w-0">{it.sub}</span> : null}
                {it.indicative ? <IndicativeMarker className="shrink-0" /> : null}
              </dd>
            ) : null}
          </>
        )
        return (
          <div key={i} data-testid={it.testId} className="relative -mb-px -mr-px min-w-0 border-b border-r border-line-soft px-4 py-4 sm:px-5">
            {it.href ? (
              <Link to={it.href} className="block rounded-sm after:absolute after:inset-0 after:content-[''] hover:[&_dt]:text-ink">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        )
      })}
    </dl>
  )
}

const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  lots_shared: Share2,
  sent_to_client: ClipboardCheck,
  client_decision: CheckCheck,
  reservation_requested: Inbox,
  reservation_decided: Handshake,
  survey_submitted: FolderInput,
  item_captured: Camera,
  new_fit: PackagePlus,
  appointed: Building2,
  team: UserPlus,
}

export function KindIcon({ kind, unread = false, className }: { kind: NotificationKind; unread?: boolean; className?: string }) {
  const Icon = KIND_ICONS[kind]
  return (
    <span aria-hidden="true" className={cx('inline-flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', unread ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-subtle text-muted ring-line-soft', className)}>
      <Icon className="size-4" />
    </span>
  )
}

/** A label above a small group of facts or controls inside a card. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('m-0 text-xs font-medium uppercase tracking-[0.06em] text-muted', className)}>{children}</p>
}
