import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { portfolioTimeline, type ProgrammeInput } from './portfolio'

const today = '2026-10-07'
const row: ProgrammeInput = { id: 'p1', name: 'One', stages: [{ stage: 4, start: '2026-04-27', end: '2027-01-29' }], siteStart: '2027-02-01', completion: '2028-06-30', materialsFrom: '2027-02-15' }

describe('the programme across projects', () => {
  it('places one row on a shared axis', () => {
    const t = portfolioTimeline([row], today)
    expect(t.start).toBe('2026-04-01')
    expect(t.end).toBe('2028-09-30')
    expect(t.spanDays).toBe(913)
    closeTo(t.today, 0.20701, 5)
    const r = t.rows[0]
    closeTo(r.siteStart!, 0.33516, 5)
    closeTo(r.completion!, 0.89923, 5)
    expect(r.segments).toHaveLength(1)
    closeTo(r.segments[0].from, 0.02848, 5)
    closeTo(r.segments[0].to, 0.33187, 5)
    expect(r.segments[0].state).toBe('current')
    expect(r.currentStage).toBe(4)
    expect(r.hasProgramme).toBe(true)
  })

  it('a row with no programme has only the materials date', () => {
    const t = portfolioTimeline([{ id: 'p2', name: 'Two', stages: [], siteStart: null, completion: null, materialsFrom: '2027-06-01' }], today)
    expect(t.rows[0]).toMatchObject({ hasProgramme: false, segments: [], siteStart: null, completion: null, currentStage: null })
    expect(t.rows[0].materialsFrom).toBeGreaterThan(t.today)
  })

  it('two rows share one scale, and stages are done, current or ahead', () => {
    const other: ProgrammeInput = {
      id: 'p2',
      name: 'Two',
      stages: [
        { stage: 0, start: '2025-09-01', end: '2025-11-30' },
        { stage: 1, start: '2025-12-01', end: '2026-05-31' },
        { stage: 2, start: '2026-06-01', end: '2026-11-01' },
        { stage: 3, start: '2026-11-02', end: '2027-01-31' },
        { stage: 7, start: '2030-01-01', end: '2030-12-31' },
      ],
      siteStart: '2027-11-01',
      completion: '2029-06-29',
      materialsFrom: '2028-04-03',
    }
    const t = portfolioTimeline([row, other], today)
    expect(t.start).toBe('2025-09-01')
    expect(t.end).toBe('2029-09-30')
    expect(t.rows[1].segments.map((s) => [s.stage, s.state])).toEqual([
      [0, 'done'],
      [1, 'done'],
      [2, 'current'],
      [3, 'ahead'],
    ])
    expect(t.rows[1].currentStage).toBe(2)
    expect(t.rows[0].segments[0].from).toBeGreaterThan(0)
    expect(t.ticks[0]).toMatchObject({ iso: '2025-09-01', at: 0 })
    // Over three years of months, only Januaries are labelled.
    expect(t.ticks.filter((x) => x.label).map((x) => x.label)).toEqual(['Jan 2026', 'Jan 2027', 'Jan 2028', 'Jan 2029'])
  })

  it('labels every month on a short axis, the first with its year', () => {
    const t = portfolioTimeline([{ id: 'p', name: 'P', stages: [], siteStart: null, completion: null, materialsFrom: '2027-01-15' }], '2026-10-07')
    expect(t.ticks.map((x) => x.label)).toEqual(['Oct 2026', 'Nov', 'Dec', 'Jan 2027', 'Feb', 'Mar', 'Apr'])
  })
})
