// The project programme (review of 14 October 2026): RIBA Plan of Work 2020 stages from five stored design stage
// starts, site start and practical completion. Stages 5 to 7 follow from those dates, so the stored shape always
// gives contiguous stages. Pure: today comes in as an argument, never from the clock.
import type { ProgrammeDates, StageStarts } from '../types'
import type { Parameter } from '../reference/assumptions'
import { RIBA_STAGES } from '../reference/policy'
import { addDays, daysBetween, fromUtcMs, maxDate, monthWindow, toUtcMs } from '../dates'

/** Typical lengths of stages 0 to 4 in days (4, 8, 12, 16 and 20 weeks). Placeholders. */
export const DESIGN_STAGE_DAYS = [28, 56, 84, 112, 140] as const
/** Default length from site start to practical completion, when no date is given. */
export const CONSTRUCTION_DAYS = 540
/** Stage 6, Handover, lasts this long after practical completion. */
export const HANDOVER_DAYS = 365
/**
 * The whole programme runs this far past practical completion, so the start of Handover shows and the design
 * stages keep most of the width. Stage 6 runs on past the right edge, drawn open like stage 7.
 */
export const SHOWN_AFTER_COMPLETION_DAYS = 120

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

/**
 * A month line on the axis. tier says from which plot width a label shows, as an index into AXIS_LABEL_TIERS: tier 0
 * shows at every width, a higher tier only on a wider plot, so labels never run into each other. 0 when unlabelled.
 */
export type AxisTick = { iso: string; at: number; label: string | null; major: boolean; tier: number }
/**
 * startLabel names the month at the left edge, for example 'Sep 2025', when the first tick there carries no label of
 * its own (a long axis labels only Januaries), so the first band never floats without a date. Null otherwise.
 */
export type ProgrammeAxis = { start: string; end: string; spanDays: number; ticks: AxisTick[]; startLabel: string | null }

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

/**
 * The chart's date range: the whole programme, or from this month. It ends with the month of the last of practical
 * completion plus SHOWN_AFTER_COMPLETION_DAYS, the date materials are needed and every availability window.
 */
export function programmeRange(p: ProgrammeDates, today: string, materialsFrom: string, windowEnds: string[], range: 'whole' | 'ahead'): { start: string; end: string } {
  const first = daysBetween(p.stageStarts[0], today) < 0 ? today : p.stageStarts[0]
  const start = monthWindow(range === 'whole' ? first : today).start
  const last = [materialsFrom, ...windowEnds].reduce((m, d) => maxDate(m, d), addDays(p.practicalCompletion, SHOWN_AFTER_COMPLETION_DAYS))
  return { start, end: monthWindow(last).end }
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Plot widths in px from which each tier of axis labels shows. Tier 0 fits the narrowest plot, on a 360 px phone;
 * the chart shows a higher tier with a container query at the same width, so the two must match.
 */
export const AXIS_LABEL_TIERS = [280, 440, 640, 840] as const
/** A generous width per character of an axis label (11 px Inter measures 6.7 px or less), its padding and the least gap between two labels. */
export const AXIS_LABEL_CHAR_PX = 7.2
export const AXIS_LABEL_PAD_PX = 4
export const AXIS_LABEL_GAP_PX = 6
/** Up to three years the axis names months; beyond, only years. */
const MONTH_LABELS_UP_TO = 36
/** Labels on every month, each quarter, each half year or each year. Each step refines the next, so tiers stay regular. */
const LABEL_STEPS = [1, 3, 6, 12] as const

/** Where a label sits in px on a plot of the given width: it starts at its month line, after its padding. */
export function axisLabelExtent(at: number, label: string, widthPx: number): { from: number; to: number } {
  const from = at * widthPx
  return { from, to: from + AXIS_LABEL_PAD_PX + label.length * AXIS_LABEL_CHAR_PX }
}

/** Whether labels, in order along the axis, all fit inside the plot with the least gap between neighbours. */
function labelsFit(ticks: { at: number; label: string }[], widthPx: number): boolean {
  let lastEnd = -Infinity
  for (const t of ticks) {
    const e = axisLabelExtent(t.at, t.label, widthPx)
    if (e.to > widthPx || e.from < lastEnd + AXIS_LABEL_GAP_PX) return false
    lastEnd = e.to
  }
  return true
}

/**
 * Month ticks from start to end. Up to three years the labels are months, with the year on the first label and on
 * each January ('Oct 2026', 'Jan 2027', 'Apr'); beyond three years, years only ('2027'). Labels are thinned for each
 * width tier so none ever runs into another or past the right edge: tier 0 keeps the Januaries that fit on a phone,
 * then the first month if it fits beside them (otherwise startLabel names it), and each tier adds the densest step of
 * aligned months that fits at its width. A month shown without its year always follows a label of the same year (or
 * the start of the axis, which startLabel names), so the year of every label can be read at every width.
 */
export function programmeAxis(start: string, end: string): ProgrammeAxis {
  const spanDays = Math.max(1, daysBetween(start, end))
  const firsts: string[] = []
  let d = monthWindow(start).start
  if (daysBetween(start, d) < 0) d = addDays(monthWindow(start).end, 1)
  while (daysBetween(d, end) >= 0) {
    firsts.push(d)
    d = addDays(monthWindow(d).end, 1)
  }
  const monthsOnly = firsts.length <= MONTH_LABELS_UP_TO
  const at = (iso: string) => Math.min(1, Math.max(0, daysBetween(start, iso) / spanDays))
  const month = (iso: string) => Number(iso.slice(5, 7))
  // Every month that may carry a label, with its text: the first month and Januaries carry the year.
  const text = (iso: string, i: number): string | null => {
    const m = month(iso)
    const year = iso.slice(0, 4)
    if (!monthsOnly) return m === 1 ? year : null
    return (i === 0 && at(iso) === 0) || m === 1 ? `${MONTHS_SHORT[m - 1]} ${year}` : MONTHS_SHORT[m - 1]
  }
  const firstIsLabel = firsts.length > 0 && at(firsts[0]) === 0
  const all = firsts.map((iso, i) => ({ i, at: at(iso), label: text(iso, i), year: iso.slice(0, 4), withYear: !monthsOnly || (i === 0 && firstIsLabel) || month(iso) === 1 }))
  type Candidate = { i: number; at: number; label: string; year: string; withYear: boolean }
  const labelled = all.filter((c): c is Candidate => c.label !== null)
  const januaries = labelled.filter((c) => month(firsts[c.i]) === 1)
  const tierOf = new Map<number, number>()
  const shownAt = () => labelled.filter((c) => tierOf.has(c.i))
  /**
   * Keeps, left to right, each label whose year can be read: one that carries its year, or a month that follows a
   * label of the same year. Before any label the start of the axis counts, as startLabel or the first label names it.
   */
  const yearsReadable = (candidates: Candidate[]): Candidate[] => {
    const kept: Candidate[] = []
    for (const c of candidates) {
      const previousYear = kept.length > 0 ? kept[kept.length - 1].year : start.slice(0, 4)
      if (tierOf.has(c.i) || c.withYear || c.year === previousYear) kept.push(c)
    }
    return kept
  }
  /** Adds each candidate, left to right, that fits between the labels already shown at this width. */
  const addGreedily = (candidates: Candidate[], tier: number) => {
    for (const c of candidates) {
      if (tierOf.has(c.i)) continue
      const shown = shownAt()
      const before = shown.filter((x) => x.i < c.i).slice(-1)
      const after = shown.filter((x) => x.i > c.i).slice(0, 1)
      if (labelsFit([...before, c, ...after], AXIS_LABEL_TIERS[tier])) tierOf.set(c.i, tier)
    }
  }
  // Each January comes first, kept left to right when it fits on a phone, so a year is never left unnamed. The first
  // month follows only if it fits beside them; otherwise it stays off the axis and startLabel names it. Then, at each
  // tier from the phone up, the densest step of aligned months that fits with every label already shown and keeps
  // every year readable, and any January that still fits.
  addGreedily(januaries, 0)
  if (firstIsLabel && labelled[0]?.i === 0) addGreedily([labelled[0]], 0)
  for (let tier = 0; tier < AXIS_LABEL_TIERS.length; tier++) {
    const width = AXIS_LABEL_TIERS[tier]
    // The label on the first month stays; a month it would run into, or one that would run past the right edge, is
    // left out rather than ruling out the step.
    const lead = labelled.find((c) => c.i === 0 && tierOf.has(0))
    const clearOfLead = (c: Candidate) => labelsFit([c], width) && (!lead || c === lead || labelsFit([lead, c], width))
    for (const step of monthsOnly ? LABEL_STEPS : []) {
      // The first month is shown at tier 0 or never: once startLabel names it, the axis does not repeat it.
      const aligned = (c: Candidate) => c.i !== 0 && (month(firsts[c.i]) - 1) % step === 0 && clearOfLead(c)
      const shown = yearsReadable(labelled.filter((c) => tierOf.has(c.i) || aligned(c)))
      if (labelsFit(shown, width)) {
        for (const c of shown) if (!tierOf.has(c.i)) tierOf.set(c.i, tier)
        break
      }
    }
    addGreedily(januaries, tier)
  }
  const ticks: AxisTick[] = firsts.map((iso, i) => {
    const t = tierOf.get(i)
    return { iso, at: at(iso), label: t === undefined ? null : all[i].label, major: (month(iso) - 1) % 3 === 0, tier: t ?? 0 }
  })
  const first = ticks[0]
  const startLabel = first && first.at === 0 && first.label !== null && first.tier === 0 ? null : `${MONTHS_SHORT[month(start) - 1]} ${start.slice(0, 4)}`
  return { start, end, spanDays, ticks, startLabel }
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
  { id: 'programme.handover', group: GROUP, label: 'Stage 6, Handover, length', value: String(HANDOVER_DAYS), unit: `days of stage 6 after practical completion; the whole programme chart shows its first ${SHOWN_AFTER_COMPLETION_DAYS}`, source: SOURCE, status: 'placeholder' },
]
