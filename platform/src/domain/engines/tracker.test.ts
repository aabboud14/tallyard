import { describe, it, expect } from 'vitest'
import { addDays } from '../dates'
import { rankTodos, trackerSummary, type Todo } from './tracker'

describe('requirement roll-up', () => {
  it('leaves out what does not apply', () => {
    expect(trackerSummary(['evidence_ready', 'at_risk', 'not_started', 'not_applicable', 'in_progress'])).toEqual({ total: 4, ready: 1, atRisk: 1, inProgress: 1, notStarted: 1, notApplicable: 1, share: 0.25 })
    expect(trackerSummary([])).toEqual({ total: 0, ready: 0, atRisk: 0, inProgress: 0, notStarted: 0, notApplicable: 0, share: 0 })
  })
})

describe('the to-do list', () => {
  const today = '2026-10-08'
  const todo = (id: string, due: string | null, since: string | null): Todo => ({ id, kind: 'approve', title: `Item ${id}`, detail: '', projectId: 'p', projectName: 'P', href: '/', since, due })

  it('overdue first, then by due date, then the oldest without a due date', () => {
    const r = rankTodos([todo('d', null, addDays(today, -1)), todo('b', addDays(today, 3), addDays(today, -4)), todo('c', null, addDays(today, -5)), todo('a', addDays(today, -2), addDays(today, -9))], today)
    expect(r.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(r.map((x) => x.whenText)).toEqual(['Overdue by 2 days', 'Due in 3 days', '5 days ago', 'Yesterday'])
    expect(r.map((x) => x.overdue)).toEqual([true, false, false, false])
    expect(r[2].ageDays).toBe(5)
  })

  it('words for one day and today', () => {
    const r = rankTodos([todo('a', addDays(today, -1), null), todo('b', today, null), todo('c', addDays(today, 1), null), todo('d', null, today), todo('e', null, null)], today)
    expect(r.map((x) => x.whenText)).toEqual(['Overdue by 1 day', 'Due today', 'Due tomorrow', 'Today', ''])
  })

  it('ties go by title', () => {
    const r = rankTodos([{ ...todo('x', null, today), title: 'Zinc' }, { ...todo('y', null, today), title: 'Ash' }], today)
    expect(r.map((x) => x.title)).toEqual(['Ash', 'Zinc'])
  })
})
