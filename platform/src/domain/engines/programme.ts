// The project programme (review of 14 October 2026): RIBA Plan of Work 2020 stages from five stored design stage
// starts, site start and practical completion. Stages 5 to 7 follow from those dates, so the stored shape always
// gives contiguous stages. Pure: today comes in as an argument, never from the clock.
import type { ProgrammeDates, StageStarts } from '../types'
import type { Parameter } from '../reference/assumptions'
import { RIBA_STAGES } from '../reference/policy'
import { addDays, daysBetween, formatQuarter, fromUtcMs, maxDate, monthWindow, toUtcMs } from '../dates'

/** Typical lengths of stages 0 to 4 in days (4, 8, 12, 16 and 20 weeks). Placeholders. */
export const DESIGN_STAGE_DAYS = [28, 56, 84, 112, 140] as const
/** Default length from site start to practical completion, when no date is given. */
export const CONSTRUCTION_DAYS = 540
/** Stage 6 is drawn for this long after practical completion. */
export const HANDOVER_DAYS = 365
/** Stage 7 is visible this far on the chart. */
export const USE_STUB_DAYS = 90

/** A stage's dates, inclusive; end is null for stage 7, which is open-ended. */
export type StageSpan = { stage: number; start: string; end: string | null }

export const PROGRAMME_ERRORS = {
  badDate: 'Enter a valid date.',
  order: 'Each stage must start after the one before.',
  siteStart: 'Site start must be after the start of stage 4.',
  completion: 'Practical completion must be after site start.',
  materials: 'Materials must be needed between site start and practical completion.',
  tooSoon: 'Site start is too soon for the remaining design stages.',
} as const

export type ProgrammeField = 'stage0' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'siteStart' | 'practicalCompletion' | 'startDate'

export type ProgrammeStatus = 'on' | 'behind' | 'ahead' | 'not_started'
export type ProgrammeCheck = { status: ProgrammeStatus; planned: number | null; declared: number }

export type AxisTick = { iso: string; at: number; label: string | null; major: boolean }
export type ProgrammeAxis = { start: string; end: string; spanDays: number; ticks: AxisTick[] }

/** A strict ISO calendar date: the right shape and a real day. */
function isRealDate(s: string): boolean {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return fromUtcMs(toUtcMs(s)) === s
}

/** Every stage of the programme in order: 0 to 4 from the stored starts, 5 from site start, 6 from practical completion, 7 after handover. */
export function programmeStages(p: ProgrammeDates): StageSpan[] {
  const s = p.stageStarts
  const spans: StageSpan[] = []
  for (let i = 0; i < 4; i++) spans.push({ stage: i, start: s[i], end: addDays(s[i + 1], -1) })
  spans.push({ stage: 4, start: s[4], end: addDays(p.siteStart, -1) })
  spans.push({ stage: 5, start: p.siteStart, end: addDays(p.practicalCompletion, -1) })
  spans.push({ stage: 6, start: p.practicalCompletion, end: addDays(p.practicalCompletion, HANDOVER_DAYS - 1) })
  spans.push({ stage: 7, start: addDays(p.practicalCompletion, HANDOVER_DAYS), end: null })
  return spans
}

/** The planned stage on a date, or null before stage 0 starts. */
export function stageOn(p: ProgrammeDates, date: string): number | null {
  let found: number | null = null
  for (const span of programmeStages(p)) if (daysBetween(span.start, date) >= 0) found = span.stage
  return found
}

/** Practical completion when none is given: CONSTRUCTION_DAYS after site start. */
export function defaultCompletion(siteStart: string): string {
  return addDays(siteStart, CONSTRUCTION_DAYS)
}

/** Each earlier stage start, going back from a known start by the typical stage lengths. */
function fillBack(starts: string[], from: number): void {
  for (let i = from - 1; i >= 0; i--) starts[i] = addDays(starts[i + 1], -DESIGN_STAGE_DAYS[i])
}

/**
 * Suggested dates for a new project, from today, the declared stage, site start and typical stage lengths.
 * Before site start the current stage starts today and the remaining design stages share the time to site start in
 * proportion to their typical lengths. From stage 5, stage 4 is placed its typical length before site start.
 * Null when site start leaves less than a day for each remaining design stage.
 */
export function suggestProgramme(today: string, stage: number, siteStart: string, practicalCompletion?: string | null): ProgrammeDates | null {
  const pc = practicalCompletion ?? defaultCompletion(siteStart)
  const starts: string[] = ['', '', '', '', '']
  if (stage >= 5) {
    starts[4] = addDays(siteStart, -DESIGN_STAGE_DAYS[4])
    fillBack(starts, 4)
  } else {
    const current = Math.max(0, Math.floor(stage))
    const t = daysBetween(today, siteStart)
    if (t < 5 - current) return null
    starts[current] = today
    fillBack(starts, current)
    let w = 0
    for (let i = current; i <= 4; i++) w += DESIGN_STAGE_DAYS[i]
    let used = 0
    for (let i = current; i < 4; i++) {
      const d = Math.min(Math.max(1, Math.floor((t * DESIGN_STAGE_DAYS[i]) / w)), t - used - (4 - i))
      starts[i + 1] = addDays(starts[i], d)
      used += d
    }
  }
  return { stageStarts: starts as StageStarts, siteStart, practicalCompletion: pc }
}

/** Every problem with a programme, by field, in form order. With materialsFrom, it must fall within construction. */
export function validateProgramme(p: ProgrammeDates, materialsFrom?: string): [ProgrammeField, string][] {
  const out: [ProgrammeField, string][] = []
  const fields: [ProgrammeField, string][] = [
    ...p.stageStarts.map((d, i) => [`stage${i}` as ProgrammeField, d] as [ProgrammeField, string]),
    ['siteStart', p.siteStart],
    ['practicalCompletion', p.practicalCompletion],
  ]
  const ok = new Set<ProgrammeField>()
  for (const [f, d] of fields) {
    if (isRealDate(d)) ok.add(f)
    else out.push([f, PROGRAMME_ERRORS.badDate])
  }
  const after = (a: string, b: string) => daysBetween(a, b) > 0
  for (let i = 0; i < 4; i++) {
    const a = `stage${i}` as ProgrammeField
    const b = `stage${i + 1}` as ProgrammeField
    if (ok.has(a) && ok.has(b) && !after(p.stageStarts[i], p.stageStarts[i + 1])) out.push([b, PROGRAMME_ERRORS.order])
  }
  if (ok.has('stage4') && ok.has('siteStart') && !after(p.stageStarts[4], p.siteStart)) out.push(['siteStart', PROGRAMME_ERRORS.siteStart])
  if (ok.has('siteStart') && ok.has('practicalCompletion') && !after(p.siteStart, p.practicalCompletion)) out.push(['practicalCompletion', PROGRAMME_ERRORS.completion])
  if (materialsFrom !== undefined) {
    if (!isRealDate(materialsFrom)) out.push(['startDate', PROGRAMME_ERRORS.badDate])
    else if (ok.has('siteStart') && ok.has('practicalCompletion')) {
      if (daysBetween(p.siteStart, materialsFrom) < 0 || daysBetween(materialsFrom, p.practicalCompletion) < 0) out.push(['startDate', PROGRAMME_ERRORS.materials])
    }
  }
  return out
}

/** The planned stage today against the stage the architect declares. */
export function programmeCheck(p: ProgrammeDates, declaredStage: number, today: string): ProgrammeCheck {
  const planned = stageOn(p, today)
  const status: ProgrammeStatus = planned === null ? 'not_started' : planned === declaredStage ? 'on' : declaredStage < planned ? 'behind' : 'ahead'
  return { status, planned, declared: declaredStage }
}

/** The chart's date range: the whole programme, or from this month; to the end of the month of the last thing drawn. */
export function programmeRange(p: ProgrammeDates, today: string, materialsFrom: string, windowEnds: string[], range: 'whole' | 'ahead'): { start: string; end: string } {
  const first = daysBetween(p.stageStarts[0], today) < 0 ? today : p.stageStarts[0]
  const start = monthWindow(range === 'whole' ? first : today).start
  const last = [materialsFrom, ...windowEnds].reduce((m, d) => maxDate(m, d), addDays(p.practicalCompletion, HANDOVER_DAYS + USE_STUB_DAYS))
  return { start, end: monthWindow(last).end }
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Month ticks from start to end, labelled by the span: every month up to a year, quarters up to three years, then years. */
export function programmeAxis(start: string, end: string): ProgrammeAxis {
  const spanDays = Math.max(1, daysBetween(start, end))
  const firsts: string[] = []
  let d = monthWindow(start).start
  if (daysBetween(start, d) < 0) d = addDays(monthWindow(start).end, 1)
  while (daysBetween(d, end) >= 0) {
    firsts.push(d)
    d = addDays(monthWindow(d).end, 1)
  }
  const months = firsts.length
  const at = (iso: string) => Math.min(1, Math.max(0, daysBetween(start, iso) / spanDays))
  const ticks: AxisTick[] = firsts.map((iso, i) => {
    const m = Number(iso.slice(5, 7))
    const year = iso.slice(0, 4)
    let label: string | null
    if (months <= 12) label = i === 0 || m === 1 ? `${MONTHS_SHORT[m - 1]} ${year}` : MONTHS_SHORT[m - 1]
    else if (months <= 36) label = (m - 1) % 3 === 0 ? formatQuarter(iso) : null
    else label = m === 1 ? year : null
    return { iso, at: at(iso), label, major: (m - 1) % 3 === 0 }
  })
  return { start, end, spanDays, ticks }
}

/** A date's position along the axis, from 0 to 1. */
export function axisAt(axis: ProgrammeAxis, iso: string): number {
  return Math.min(1, Math.max(0, daysBetween(axis.start, iso) / axis.spanDays))
}

const GROUP = 'Programme suggestions'
const SOURCE = 'Sample durations, to be validated with practices'

export const PROGRAMME_PARAMETER_ROWS: Parameter[] = [
  ...DESIGN_STAGE_DAYS.map((days, i) => ({ id: `programme.stage${i}`, group: GROUP, label: `Stage ${i}, ${RIBA_STAGES[i]}, typical length`, value: String(days), unit: 'days, for suggested dates', source: SOURCE, status: 'placeholder' as const })),
  { id: 'programme.construction', group: GROUP, label: 'Construction, site start to practical completion', value: String(CONSTRUCTION_DAYS), unit: 'days from site start to practical completion, when no date is given', source: SOURCE, status: 'placeholder' },
  { id: 'programme.handover', group: GROUP, label: 'Stage 6, Handover, shown on the programme', value: String(HANDOVER_DAYS), unit: 'days of stage 6 shown after practical completion', source: SOURCE, status: 'placeholder' },
]
