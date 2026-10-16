import { describe, it, expect } from 'vitest'
import { createSeed, FERRYMOOR_ID, MERROWGATE_ID, SALLOW_ID } from '../seed/world'
import type { ProgrammeDates } from '../types'
import { DEMO_TODAY } from '../constants'
import { addDays } from '../dates'
import {
  axisAt,
  CONSTRUCTION_DAYS,
  defaultCompletion,
  DESIGN_STAGE_DAYS,
  AXIS_LABEL_TIERS,
  axisLabelExtent,
  HANDOVER_DAYS,
  PROGRAMME_ERRORS,
  PROGRAMME_PARAMETER_ROWS,
  programmeAxis,
  programmeCheck,
  programmeRange,
  programmeStages,
  SHOWN_AFTER_COMPLETION_DAYS,
  stageOn,
  suggestProgramme,
  validateProgramme,
} from './programme'

// Reference values from createSeed(), not shifted.
const w = createSeed()
const merrowgate = w.projects[MERROWGATE_ID].programme

describe('programmeStages', () => {
  it('gives contiguous spans from the stored dates', () => {
    const spans = programmeStages(merrowgate)
    expect(spans).toHaveLength(8)
    expect(spans[0]).toEqual({ stage: 0, start: '2025-09-01', end: '2025-11-30' })
    expect(spans[2]).toEqual({ stage: 2, start: '2026-06-01', end: '2026-11-01' })
    expect(spans[4]).toEqual({ stage: 4, start: '2027-02-01', end: '2027-10-31' })
    expect(spans[5]).toEqual({ stage: 5, start: '2027-11-01', end: '2029-06-28' })
    expect(spans[6]).toEqual({ stage: 6, start: '2029-06-29', end: '2030-06-28' })
    expect(spans[7]).toEqual({ stage: 7, start: '2030-06-29', end: null })
  })
})

describe('stageOn', () => {
  it('finds the planned stage on a date', () => {
    expect(stageOn(merrowgate, '2025-08-31')).toBeNull()
    expect(stageOn(merrowgate, '2026-06-01')).toBe(2)
    expect(stageOn(merrowgate, '2027-10-31')).toBe(4)
    expect(stageOn(merrowgate, '2027-11-01')).toBe(5)
    expect(stageOn(merrowgate, '2029-06-29')).toBe(6)
    expect(stageOn(merrowgate, '2030-06-29')).toBe(7)
  })
})

describe('suggestProgramme', () => {
  it('shares the time to site start between the remaining design stages', () => {
    expect(suggestProgramme('2026-10-08', 2, '2027-11-01')).toEqual({ stageStarts: ['2026-07-16', '2026-08-13', '2026-10-08', '2027-01-13', '2027-05-22'], siteStart: '2027-11-01', practicalCompletion: '2029-04-24' })
    expect(suggestProgramme('2026-10-08', 2, '2027-09-06')).toEqual({ stageStarts: ['2026-07-16', '2026-08-13', '2026-10-08', '2026-12-30', '2027-04-20'], siteStart: '2027-09-06', practicalCompletion: '2029-02-27' })
  })

  it('needs at least a day for each remaining design stage', () => {
    expect(suggestProgramme('2026-10-08', 0, '2026-10-12')).toBeNull()
    expect(suggestProgramme('2026-10-08', 0, '2026-10-13')!.stageStarts).toEqual(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'])
  })

  it('starts the current stage today and goes back by the typical lengths', () => {
    expect(suggestProgramme('2026-10-08', 4, '2027-01-04')!.stageStarts).toEqual(['2026-01-01', '2026-01-29', '2026-03-26', '2026-06-18', '2026-10-08'])
  })

  it('from stage 5, places stage 4 its typical length before site start, whatever today is', () => {
    expect(suggestProgramme('2026-10-08', 5, '2026-06-01', '2027-12-17')).toEqual({ stageStarts: ['2025-04-07', '2025-05-05', '2025-06-30', '2025-09-22', '2026-01-12'], siteStart: '2026-06-01', practicalCompletion: '2027-12-17' })
  })

  it('always gives a programme that validates', () => {
    for (let stage = 0; stage <= 7; stage++) {
      for (const siteStart of ['2026-10-20', '2027-03-01', '2028-06-05']) {
        const p = suggestProgramme('2026-10-08', stage, siteStart)
        if (p) expect(validateProgramme(p, siteStart), `${stage} ${siteStart}`).toEqual([])
      }
    }
  })

  it('defaults practical completion to the typical construction length', () => {
    expect(defaultCompletion('2027-11-01')).toBe('2029-04-24')
    expect(CONSTRUCTION_DAYS).toBe(540)
    expect(DESIGN_STAGE_DAYS).toEqual([28, 56, 84, 112, 140])
    expect(HANDOVER_DAYS).toBe(365)
  })
})

describe('validateProgramme', () => {
  const base: ProgrammeDates = { stageStarts: ['2026-01-05', '2026-03-02', '2026-06-01', '2026-10-05', '2027-02-01'], siteStart: '2027-06-07', practicalCompletion: '2028-12-01' }
  const starts = (i: number, d: string) => base.stageStarts.map((x, j) => (j === i ? d : x)) as ProgrammeDates['stageStarts']

  it('accepts the seeded programmes', () => {
    for (const id of [MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID]) expect(validateProgramme(w.projects[id].programme, w.projects[id].startDate)).toEqual([])
    expect(validateProgramme(base)).toEqual([])
  })
  it('needs each stage to start after the one before', () => {
    expect(validateProgramme({ ...base, stageStarts: starts(1, '2026-01-05') })).toEqual([['stage1', PROGRAMME_ERRORS.order]])
  })
  it('needs site start after the start of stage 4, and completion after site start', () => {
    expect(validateProgramme({ ...base, siteStart: '2027-02-01' })).toEqual([['siteStart', PROGRAMME_ERRORS.siteStart]])
    expect(validateProgramme({ ...base, practicalCompletion: base.siteStart })).toEqual([['practicalCompletion', PROGRAMME_ERRORS.completion]])
  })
  it('refuses dates that do not exist', () => {
    expect(validateProgramme({ ...base, stageStarts: starts(2, '2026-02-30') })).toEqual([['stage2', PROGRAMME_ERRORS.badDate]])
    expect(validateProgramme(base, 'soon')).toEqual([['startDate', PROGRAMME_ERRORS.badDate]])
  })
  it('needs materials between site start and practical completion', () => {
    expect(validateProgramme(base, '2027-06-06')).toEqual([['startDate', PROGRAMME_ERRORS.materials]])
    expect(validateProgramme(base, '2028-12-02')).toEqual([['startDate', PROGRAMME_ERRORS.materials]])
    expect(validateProgramme(base, '2027-06-07')).toEqual([])
    expect(validateProgramme(base, '2028-12-01')).toEqual([])
  })
})

describe('programmeCheck', () => {
  it('compares the planned stage today with the declared one', () => {
    expect(programmeCheck(merrowgate, 2, DEMO_TODAY)).toEqual({ status: 'on', planned: 2, declared: 2 })
    expect(programmeCheck(merrowgate, 1, DEMO_TODAY)).toEqual({ status: 'behind', planned: 2, declared: 1 })
    expect(programmeCheck(merrowgate, 3, DEMO_TODAY)).toEqual({ status: 'ahead', planned: 2, declared: 3 })
    expect(programmeCheck(merrowgate, 0, '2025-08-31')).toEqual({ status: 'not_started', planned: null, declared: 0 })
  })
  it('reads On programme for every seeded project on 7 October 2026', () => {
    for (const p of Object.values(w.projects)) expect(programmeCheck(p.programme, p.ribaStage, DEMO_TODAY).status, p.name).toBe('on')
  })
})

/** The first of the month a whole number of months after a first of the month. */
function addMonths(firstOfMonth: string, months: number): string {
  const y = Number(firstOfMonth.slice(0, 4))
  const m = Number(firstOfMonth.slice(5, 7)) - 1 + months
  return `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}-01`
}

describe('programmeRange and programmeAxis', () => {
  it('covers the whole programme, or from this month', () => {
    // Practical completion is 29 June 2029; the axis runs SHOWN_AFTER_COMPLETION_DAYS on, to the end of October 2029.
    expect(SHOWN_AFTER_COMPLETION_DAYS).toBe(120)
    expect(programmeRange(merrowgate, DEMO_TODAY, '2028-04-03', [], 'whole')).toEqual({ start: '2025-09-01', end: '2029-10-31' })
    expect(programmeRange(merrowgate, DEMO_TODAY, '2028-04-03', [], 'ahead')).toEqual({ start: '2026-10-01', end: '2029-10-31' })
    expect(programmeRange(merrowgate, DEMO_TODAY, '2028-04-03', ['2031-02-10'], 'whole').end).toBe('2031-02-28')
    expect(programmeRange(merrowgate, '2025-03-15', '2028-04-03', [], 'whole').start).toBe('2025-03-01')
  })

  it('labels years on a long axis and keeps positions between 0 and 1', () => {
    const axis = programmeAxis('2025-09-01', '2030-09-30')
    expect(axis.ticks.filter((t) => t.label).map((t) => t.label)).toEqual(['2026', '2027', '2028', '2029', '2030'])
    expect(axis.ticks).toHaveLength(61)
    expect(axis.ticks.every((t) => t.at >= 0 && t.at <= 1)).toBe(true)
    expect(axis.ticks.filter((t) => t.major).every((t) => ['01', '04', '07', '10'].includes(t.iso.slice(5, 7)))).toBe(true)
    expect(axisAt(axis, '2020-01-01')).toBe(0)
    expect(axisAt(axis, '2035-01-01')).toBe(1)
    expect(axisAt(axis, '2026-10-08')).toBeCloseTo(402 / 1855, 12)
  })

  it('labels every month on an axis of a year or less', () => {
    const axis = programmeAxis('2026-10-01', '2027-09-30')
    expect(axis.ticks).toHaveLength(12)
    expect(axis.ticks[0].label).toBe('Oct 2026')
    expect(axis.ticks[1].label).toBe('Nov')
    expect(axis.ticks.find((t) => t.iso === '2027-01-01')!.label).toBe('Jan 2027')
  })

  it('labels months, never quarters, on an axis of up to three years', () => {
    const axis = programmeAxis('2026-10-01', '2028-09-30')
    expect(axis.ticks.filter((t) => t.label).map((t) => t.label)).toEqual(['Oct 2026', 'Jan 2027', 'Apr', 'Jul', 'Oct', 'Jan 2028', 'Apr', 'Jul'])
    // On a phone the first month, the Januaries and the half years show; the quarters come in on wider plots.
    expect(axis.ticks.filter((t) => t.label && t.tier === 0).map((t) => t.label)).toEqual(['Oct 2026', 'Jul', 'Jan 2028', 'Jul'])
  })

  it('never labels a quarter, for any span from 1 to 60 months', () => {
    for (const startMonth of ['01', '03', '07', '10', '12'])
      for (let months = 1; months <= 60; months++) {
        const start = `2026-${startMonth}-01`
        const end = addDays(addMonths(start, months), -1)
        for (const t of programmeAxis(start, end).ticks) expect(t.label ?? '', `${start} for ${months} months`).not.toMatch(/Q[1-4]/)
      }
  })

  it('never lets two labels run into each other or past the right edge, at any plot width', () => {
    for (const startMonth of ['01', '04', '09', '11'])
      for (let months = 1; months <= 72; months++) {
        const start = `2026-${startMonth}-01`
        const axis = programmeAxis(start, addDays(addMonths(start, months), -1))
        for (let width = AXIS_LABEL_TIERS[0]; width <= 1600; width += 20) {
          const shown = axis.ticks.filter((t) => t.label !== null && AXIS_LABEL_TIERS[t.tier] <= width)
          let lastEnd = -Infinity
          for (const t of shown) {
            const e = axisLabelExtent(t.at, t.label!, width)
            expect(e.from, `${start}, ${months} months, ${width} px, ${t.label}`).toBeGreaterThan(lastEnd)
            expect(e.to).toBeLessThanOrEqual(width)
            lastEnd = e.to
          }
          // The year is always readable: the left edge, or the first label shown, names it.
          if (axis.startLabel === null) expect(shown[0]?.label ?? '').toMatch(/\d{4}/)
        }
      }
  })

  it('names the month at the left edge when the first tick has no label', () => {
    // Merrowgate Wharf's whole programme labels only Januaries, so September 2025 needs its own label.
    expect(programmeAxis('2025-09-01', '2030-09-30').startLabel).toBe('Sep 2025')
    // Corbel Yard style: a programme that starts in July.
    expect(programmeAxis('2026-07-01', '2030-03-31').startLabel).toBe('Jul 2026')
    // The first tick already carries a label: nothing to add. Up to three years that is the first month itself.
    expect(programmeAxis('2026-11-01', '2028-09-30').startLabel).toBeNull()
    expect(programmeAxis('2026-11-01', '2028-09-30').ticks[0]).toMatchObject({ label: 'Nov 2026', tier: 0 })
    expect(programmeAxis('2027-01-01', '2031-06-30').startLabel).toBeNull()
    expect(programmeAxis('2026-10-01', '2027-09-30').startLabel).toBeNull()
    expect(programmeAxis('2026-10-01', '2028-09-30').startLabel).toBeNull()
  })
})

describe('PROGRAMME_PARAMETER_ROWS', () => {
  it('lists the typical lengths as placeholders', () => {
    expect(PROGRAMME_PARAMETER_ROWS).toHaveLength(7)
    expect(PROGRAMME_PARAMETER_ROWS.every((r) => r.status === 'placeholder' && r.group === 'Programme suggestions')).toBe(true)
    expect(PROGRAMME_PARAMETER_ROWS[2]).toMatchObject({ id: 'programme.stage2', label: 'Stage 2, Concept Design, typical length', value: '84' })
  })
})
