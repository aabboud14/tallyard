// Activity rows grouped by day for the activity feeds: "Today", "Yesterday", then the date. Rows arrive newest
// first and keep that order inside each day.
import type { AppData, Viewer } from '../types'
import { projectSide } from '../access'
import { activityFor, dayLabel, type ActivityRow } from './common'

export type ActivityDay = { label: string; rows: ActivityRow[] }

export function activityByDay(rows: ActivityRow[], now: string): ActivityDay[] {
  const days: ActivityDay[] = []
  for (const r of rows) {
    const label = dayLabel(r.at, now)
    const last = days[days.length - 1]
    if (last && last.label === label) last.rows.push(r)
    else days.push({ label, rows: [r] })
  }
  return days
}

/** A project's activity by day for the viewer, or null when they do not work on it. */
export function projectActivityDays(state: AppData, viewer: Viewer, projectId: string): { days: ActivityDay[]; total: number } | null {
  if (!projectSide(state, viewer.userId, projectId)) return null
  const rows = activityFor(state, viewer, { projectId }, 500)
  return { days: activityByDay(rows, viewer.now), total: rows.length }
}
