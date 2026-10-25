// Requirement roll-ups and the client's to-do list (client-consultant design, section 3.4). The list is derived from
// the records, so an item clears itself once it is done. Pure: today comes in as an argument.
import type { TrackStatus } from '../sustainabilityTypes'
import { addDays, daysBetween } from '../dates'

export type TrackerSummary = { total: number; ready: number; atRisk: number; inProgress: number; notStarted: number; notApplicable: number; share: number }

/** Counts by status. The total leaves out what does not apply; the share is ready over the total. */
export function trackerSummary(statuses: TrackStatus[]): TrackerSummary {
  const n = (s: TrackStatus) => statuses.filter((x) => x === s).length
  const notApplicable = n('not_applicable')
  const total = statuses.length - notApplicable
  const ready = n('evidence_ready')
  return { total, ready, atRisk: n('at_risk'), inProgress: n('in_progress'), notStarted: n('not_started'), notApplicable, share: total > 0 ? ready / total : 0 }
}

export type TodoKind = 'approve' | 'reserve' | 'request_again' | 'review_statement' | 'requirement_at_risk'

export type Todo = { id: string; kind: TodoKind; title: string; detail: string; projectId: string; projectName: string; href: string; since: string | null; due: string | null }

export type RankedTodo = Todo & { overdue: boolean; ageDays: number | null; whenText: string }

/** Days the client has to decide on a material sent for approval. Equals the dashboards' STALE_SENT_DAYS. */
export const APPROVAL_DUE_DAYS = 7
/** Days the client has to review the circular economy statement. */
export const REVIEW_DUE_DAYS = 14

export function dueAfter(since: string, days: number): string {
  return addDays(since.slice(0, 10), days)
}

function when(t: Todo, today: string, overdue: boolean, ageDays: number | null): string {
  if (t.due !== null) {
    if (overdue) {
      const n = daysBetween(t.due, today)
      return n === 1 ? 'Overdue by 1 day' : `Overdue by ${n} days`
    }
    const n = daysBetween(today, t.due)
    if (n === 0) return 'Due today'
    if (n === 1) return 'Due tomorrow'
    return `Due in ${n} days`
  }
  if (ageDays === null) return ''
  if (ageDays <= 0) return 'Today'
  if (ageDays === 1) return 'Yesterday'
  return `${ageDays} days ago`
}

/** Overdue first, most overdue first; then by due date; then items with no due date, oldest first; then by title. */
export function rankTodos(todos: Todo[], today: string): RankedTodo[] {
  const ranked = todos.map((t): RankedTodo => {
    const overdue = t.due !== null && daysBetween(t.due, today) > 0
    const ageDays = t.since ? daysBetween(t.since.slice(0, 10), today) : null
    return { ...t, overdue, ageDays, whenText: when(t, today, overdue, ageDays) }
  })
  return ranked.sort((a, b) => {
    if (a.due !== null && b.due !== null && a.due !== b.due) return a.due < b.due ? -1 : 1
    if ((a.due === null) !== (b.due === null)) return a.due === null ? 1 : -1
    if (a.due === null && b.due === null) {
      const sa = a.since ?? '9999'
      const sb = b.since ?? '9999'
      if (sa !== sb) return sa < sb ? -1 : 1
    }
    return a.title.localeCompare(b.title, 'en-GB')
  })
}
