// The inbox: notifications addressed to the viewer's organisation, grouped by day, with read state per person.
import type { AppData, AppNotification, NotificationKind, PlatformRole, Viewer } from '../types'
import { NOTIFICATION_KINDS } from '../types'
import { roleOfUser } from '../access'
import { dayLabel, timeAgo } from './common'

export const NOTIFICATION_KIND_INFO: Record<NotificationKind, { label: string; description: string; roles: PlatformRole[] }> = {
  lots_shared: { label: 'Lots shared with a project', description: 'An asset owner shares lots in confidence with one of your projects.', roles: ['architect', 'client'] },
  sent_to_client: { label: 'Materials sent for approval', description: 'The architect sends materials for your approval.', roles: ['client'] },
  client_decision: { label: 'Client decisions', description: 'The client approves or declines a material.', roles: ['architect', 'consultant'] },
  reservation_requested: { label: 'Reservation requests', description: 'A buyer asks to reserve one of your lots.', roles: ['owner'] },
  reservation_decided: { label: 'Reservation decisions', description: 'The seller accepts or declines a reservation.', roles: ['client', 'architect'] },
  survey_submitted: { label: 'Surveys submitted', description: 'A surveyor submits the survey of one of your buildings.', roles: ['owner'] },
  item_captured: { label: 'New items captured', description: 'A surveyor captures items in one of your buildings.', roles: ['owner'] },
  new_fit: { label: 'New materials for your projects', description: 'A material is published that is available in time for one of your projects.', roles: ['architect'] },
  appointed: { label: 'Survey appointments', description: 'An owner appoints you to survey a building.', roles: ['surveyor'] },
  team: { label: 'Team and projects', description: 'Someone joins your organisation, or you are added to a project.', roles: ['architect', 'client', 'owner', 'surveyor', 'consultant'] },
}

export type InboxItem = { id: string; kind: NotificationKind; kindLabel: string; title: string; body: string; href: string; at: string; timeAgo: string; unread: boolean; count: number }

export type InboxFilter = 'all' | 'unread' | NotificationKind

export type InboxView = {
  groups: { label: string; items: InboxItem[] }[]
  unread: number
  total: number
  filter: InboxFilter
  filters: { id: InboxFilter; label: string; count: number }[]
  empty: boolean
}

function visible(state: AppData, viewer: Viewer): AppNotification[] {
  const u = state.users[viewer.userId]
  if (!u) return []
  return state.notifications.filter((n) => n.orgId === u.orgId && u.notificationPrefs[n.kind] !== false)
}

function item(n: AppNotification, viewer: Viewer): InboxItem {
  return { id: n.id, kind: n.kind, kindLabel: NOTIFICATION_KIND_INFO[n.kind].label, title: n.title, body: n.body, href: n.href, at: n.at, timeAgo: timeAgo(n.at, viewer.now), unread: !n.readBy.includes(viewer.userId), count: n.count }
}

export function unreadCount(state: AppData, viewer: Viewer): number {
  return visible(state, viewer).filter((n) => !n.readBy.includes(viewer.userId)).length
}

export function inboxView(state: AppData, viewer: Viewer, filter: InboxFilter = 'all'): InboxView {
  const all = visible(state, viewer).map((n) => item(n, viewer))
  const shown = all.filter((n) => (filter === 'all' ? true : filter === 'unread' ? n.unread : n.kind === filter))
  const groups: InboxView['groups'] = []
  for (const n of shown) {
    const label = dayLabel(n.at, viewer.now)
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(n)
    else groups.push({ label, items: [n] })
  }
  const kinds = NOTIFICATION_KINDS.filter((k) => all.some((n) => n.kind === k))
  return {
    groups,
    unread: all.filter((n) => n.unread).length,
    total: all.length,
    filter,
    filters: [
      { id: 'all', label: 'All', count: all.length },
      { id: 'unread', label: 'Unread', count: all.filter((n) => n.unread).length },
      ...kinds.map((k) => ({ id: k as InboxFilter, label: NOTIFICATION_KIND_INFO[k].label, count: all.filter((n) => n.kind === k).length })),
    ],
    empty: shown.length === 0,
  }
}

/** The bell: unread count and the latest few. */
export function bellView(state: AppData, viewer: Viewer, limit = 8): { unread: number; items: InboxItem[] } {
  const all = visible(state, viewer).map((n) => item(n, viewer))
  return { unread: all.filter((n) => n.unread).length, items: all.slice(0, limit) }
}

/** The kinds a person can switch on or off, for their role. */
export function notificationSettings(state: AppData, viewer: Viewer): { kind: NotificationKind; label: string; description: string; on: boolean }[] {
  const u = state.users[viewer.userId]
  const role = roleOfUser(state, viewer.userId)
  if (!u || !role) return []
  return NOTIFICATION_KINDS.filter((k) => NOTIFICATION_KIND_INFO[k].roles.includes(role)).map((k) => ({ kind: k, label: NOTIFICATION_KIND_INFO[k].label, description: NOTIFICATION_KIND_INFO[k].description, on: u.notificationPrefs[k] !== false }))
}
