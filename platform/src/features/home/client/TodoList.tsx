// The client's to-do list: approvals, reservations, the statement review and requirements at risk, derived from the
// records so each item clears itself once it is done. Overdue items come first and read in the warning colour.
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { CheckCheck, ChevronRight, FileText, ListChecks, RotateCcw, Send, TriangleAlert } from 'lucide-react'
import type { RankedTodo, TodoKind } from '../../../domain/engines/tracker'
import { cx, Pill } from '../../../ui'

const ICON: Record<TodoKind, LucideIcon> = { approve: CheckCheck, reserve: Send, request_again: RotateCcw, review_statement: FileText, requirement_at_risk: TriangleAlert }
const KIND: Record<TodoKind, string> = { approve: 'Approval', reserve: 'Reservation', request_again: 'Reservation', review_statement: 'Review', requirement_at_risk: 'Requirement' }

export function TodoList({ todos, overdue }: { todos: RankedTodo[]; overdue: number }) {
  return (
    <section aria-labelledby="todo-title" data-testid="client-todo" className="flex min-w-0 flex-col rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <h2 id="todo-title" className="m-0 flex items-center gap-2 text-base font-semibold text-ink">
          <ListChecks aria-hidden="true" className="size-4 text-muted" />
          To do
          <Pill size="sm" tone={todos.length > 0 ? 'info' : 'neutral'} data-testid="todo-count">
            {todos.length}
          </Pill>
        </h2>
        {overdue > 0 ? (
          <Pill size="sm" tone="warning" icon={TriangleAlert}>
            {overdue} overdue
          </Pill>
        ) : null}
      </div>
      {todos.length === 0 ? (
        <div className="flex flex-1 items-center gap-3 px-4 py-6 sm:px-5" data-testid="todo-empty">
          <CheckCheck aria-hidden="true" className="size-5 shrink-0 text-brand-600" />
          <p className="m-0 text-sm text-muted">Nothing to do. Approvals and reviews appear here.</p>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-soft p-0">
          {todos.map((t) => {
            const Icon = ICON[t.kind]
            const warn = t.overdue || t.kind === 'requirement_at_risk'
            return (
              <li key={t.id} data-testid={`todo-${t.id}`} className="relative">
                <Link to={t.href} className="group flex min-h-14 items-start gap-3 px-4 py-3 outline-none transition-colors hover:bg-page focus-visible:bg-page focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 sm:px-5">
                  <span aria-hidden="true" className={cx('mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset', warn ? 'bg-warning-soft text-warning ring-warning-line' : 'bg-subtle text-ink-soft ring-line-soft')}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium text-ink sm:truncate">{t.title}</span>
                    <span className="block truncate text-sm text-muted">
                      <span className="sr-only">{KIND[t.kind]}. </span>
                      {t.detail}
                    </span>
                    <span className={cx('block text-sm tabular-nums sm:hidden', t.overdue ? 'font-medium text-warning' : 'text-ink-soft')}>{t.whenText}</span>
                  </span>
                  <span aria-hidden="true" className={cx('mt-0.5 shrink-0 whitespace-nowrap text-sm tabular-nums max-sm:hidden', t.overdue ? 'font-medium text-warning' : t.due ? 'text-ink-soft' : 'text-muted')}>{t.whenText}</span>
                  <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 max-sm:hidden" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

