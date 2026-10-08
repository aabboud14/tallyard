// Notifications and activity, written by actions. Each is addressed to organisations, in words each may read.
import type { ActivityEntry, AppData, AppNotification, NotificationKind } from './types'
import { mint } from './ids'

export type NotifyInput = {
  orgIds: string[]
  kind: NotificationKind
  title: string
  body: string
  href: string
  at: string
  actorUserId: string | null
  /** Folds repeats with the same key on the same day into one notification. */
  key?: string | null
  /** The title and body for a folded notification that now counts `count` events. */
  fold?: (count: number) => { title: string; body: string }
}

/** Adds one notification per organisation, newest first. The actor's own copy is already read. */
export function notify(state: AppData, n: NotifyInput): AppData {
  let s = state
  const actorOrg = n.actorUserId ? (state.users[n.actorUserId]?.orgId ?? null) : null
  for (const orgId of [...new Set(n.orgIds.filter((x) => x))]) {
    const readBy = actorOrg === orgId && n.actorUserId ? [n.actorUserId] : []
    const key = n.key ?? null
    const day = n.at.slice(0, 10)
    const existing = key ? s.notifications.find((x) => x.orgId === orgId && x.key === key && x.at.slice(0, 10) === day) : undefined
    if (existing && n.fold) {
      const count = existing.count + 1
      const { title, body } = n.fold(count)
      const updated: AppNotification = { ...existing, title, body, at: n.at, count, readBy, href: n.href }
      s = { ...s, notifications: [updated, ...s.notifications.filter((x) => x.id !== existing.id)] }
      continue
    }
    const m = mint(s, 'ntf', (id) => s.notifications.some((x) => x.id === id))
    s = m.state
    const item: AppNotification = { id: m.id, orgId, kind: n.kind, title: n.title, body: n.body, href: n.href, at: n.at, actorUserId: n.actorUserId, readBy, key, count: 1 }
    s = { ...s, notifications: [item, ...s.notifications] }
  }
  return s
}

export type LogInput = Omit<ActivityEntry, 'id'>

/** Adds an activity entry, newest first. */
export function log(state: AppData, entry: LogInput): AppData {
  const m = mint(state, 'act', (id) => state.activity.some((x) => x.id === id))
  const item: ActivityEntry = { ...entry, id: m.id, orgIds: [...new Set(entry.orgIds.filter((x) => x))] }
  return { ...m.state, activity: [item, ...m.state.activity] }
}

/** Marks one notification read for one person. */
export function markRead(state: AppData, userId: string, notificationId: string): AppData {
  const n = state.notifications.find((x) => x.id === notificationId)
  if (!n || n.readBy.includes(userId)) return state
  return { ...state, notifications: state.notifications.map((x) => (x.id === notificationId ? { ...x, readBy: [...x.readBy, userId] } : x)) }
}

/** Marks every notification of the person's organisation read for them. */
export function markAllRead(state: AppData, userId: string): AppData {
  const orgId = state.users[userId]?.orgId
  if (!orgId || !state.notifications.some((x) => x.orgId === orgId && !x.readBy.includes(userId))) return state
  return { ...state, notifications: state.notifications.map((x) => (x.orgId === orgId && !x.readBy.includes(userId) ? { ...x, readBy: [...x.readBy, userId] } : x)) }
}

/** "A", "A and B", "A, B and C". */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** "1 material" or "3 materials". */
export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}
