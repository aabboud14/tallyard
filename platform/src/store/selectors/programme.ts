// The project programme for the overview chart, the programme form and the cross-project summaries. Dates are
// the project's own; materials come from the shortlist rows, which read the public listing only (P3).
import type { Project, ProgrammeSource, StageStarts } from '../../domain/types'
import type { Fit, WishStatus } from '../../domain/v1types'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { addDays, daysBetween, formatDate, formatDateShort, formatMonth } from '../../domain/dates'
import { axisAt, programmeAxis, programmeCheck, programmeRange, programmeStages, stageOn, type ProgrammeStatus, type StageSpan } from '../../domain/engines/programme'
import { storageRun } from '../../domain/engines/timelineScale'
import type { AppData, Viewer } from '../types'
import { projectSide } from '../access'
import { projectWishlist } from '../lots'
import { plural } from '../notifications'
import { todayOf } from './common'
import { shortlistRows, type ShortlistRow } from './shortlist'

export type ProgrammeRange = 'whole' | 'ahead'

export type ProgrammeStageBand = {
  stage: number
  /** "Stage 2". */
  label: string
  /** "Concept Design". */
  name: string
  start: string
  end: string | null
  datesText: string
  weeksText: string
  from: number
  to: number
  state: 'past' | 'current' | 'future'
}

export type ProgrammeMilestone = { id: 'site_start' | 'materials' | 'completion'; label: string; date: string; dateText: string; at: number }

export type ProgrammeMaterialRow = {
  itemId: string
  publicId: string
  title: string
  status: WishStatus
  statusLabel: string
  kind: 'now' | 'window'
  from: number
  to: number
  fit: Fit
  fitLabel: string
  windowText: string
  storage: { from: number; to: number } | null
  href: string
}

/**
 * The chart's axis as the screen needs it: positions and labels only. Tick dates stay out of the view model, so a
 * first of the month can never coincide with a seller's private date in a buyer's view (P3).
 */
export type ProgrammeViewAxis = { startText: string; endText: string; spanDays: number; ticks: { at: number; label: string | null; major: boolean }[] }

export type ProgrammeView = {
  range: ProgrammeRange
  axis: ProgrammeViewAxis
  today: { date: string; dateText: string; at: number }
  stages: ProgrammeStageBand[]
  /** "Today: stage 2, Concept Design", or "Programme starts 1 Nov 2026". */
  plannedStageText: string
  check: { status: ProgrammeStatus; label: string; text: string }
  /** Drives the "Suggested dates" pill. */
  source: ProgrammeSource
  /** "materials" is left out when it is the same day as site start. */
  milestones: ProgrammeMilestone[]
  /** Live shortlist rows, from the public listings only. */
  materials: ProgrammeMaterialRow[]
  canEdit: boolean
  /** The chart's accessible description. */
  description: string
}

export const PROGRAMME_CHECK_LABELS: Record<ProgrammeStatus, string> = { on: 'On programme', behind: 'Behind programme', ahead: 'Ahead of programme', not_started: 'Not started' }

const FIT_WORDS: Record<Fit, string> = { now: 'Available now', in_time: 'In time', tight: 'Tight', late: 'Too late' }

/** "Today: stage 2, Concept Design", or when the programme has not started, "Programme starts 1 Nov 2026". */
export function plannedStageText(p: Project, today: string): string {
  const planned = stageOn(p.programme, today)
  return planned === null ? `Programme starts ${formatDateShort(p.programme.stageStarts[0])}` : `Today: stage ${planned}, ${RIBA_STAGES[planned]}`
}

function checkText(status: ProgrammeStatus, planned: number | null, declared: number, startsOn: string): string {
  if (status === 'behind') return `Planned stage ${planned} today. The project is at stage ${declared}.`
  if (status === 'ahead') return `The project is at stage ${declared}, ahead of the planned stage ${planned}.`
  if (status === 'not_started') return `The programme starts ${formatDate(startsOn)}.`
  return ''
}

function weeksText(span: StageSpan): string {
  if (span.end === null) return 'Ongoing'
  return plural(Math.round((daysBetween(span.start, span.end) + 1) / 7), 'week')
}

function liveRows(state: AppData, viewer: Viewer, p: Project): ShortlistRow[] {
  const list = projectWishlist(state.world, p.id)
  return (list ? shortlistRows(state, viewer, list, p) : []).filter((r) => r.card && r.status !== 'declined')
}

/** The overview's programme chart for anyone on the project; null for anyone else. */
export function programmeView(state: AppData, viewer: Viewer, projectId: string, range: ProgrammeRange = 'whole'): ProgrammeView | null {
  const side = projectSide(state, viewer.userId, projectId)
  if (!side) return null
  const p = state.world.projects[projectId]
  const today = todayOf(viewer)
  const rows = liveRows(state, viewer, p)
  const windowEnds = rows.flatMap((r) => (r.card!.listing.availability.kind === 'window' ? [r.card!.listing.availability.windowEnd] : []))
  const { start, end } = programmeRange(p.programme, today, p.startDate, windowEnds, range)
  const axis = programmeAxis(start, end)
  const at = (iso: string) => axisAt(axis, iso)
  const check = programmeCheck(p.programme, p.ribaStage, today)
  const planned = check.planned
  const spans = programmeStages(p.programme)
  const stages: ProgrammeStageBand[] = spans.map((s) => ({
    stage: s.stage,
    label: `Stage ${s.stage}`,
    name: RIBA_STAGES[s.stage] ?? '',
    start: s.start,
    end: s.end,
    datesText: s.end === null ? `From ${formatDateShort(s.start)}` : `${formatDateShort(s.start)} to ${formatDateShort(s.end)}`,
    weeksText: weeksText(s),
    from: at(s.start),
    to: s.end === null ? 1 : at(addDays(s.end, 1)),
    state: planned === null ? 'future' : s.stage < planned ? 'past' : s.stage === planned ? 'current' : 'future',
  }))
  const milestones: ProgrammeMilestone[] = [{ id: 'site_start', label: 'Site start', date: p.programme.siteStart, dateText: formatDate(p.programme.siteStart), at: at(p.programme.siteStart) }]
  if (p.startDate !== p.programme.siteStart) milestones.push({ id: 'materials', label: 'Materials needed on site', date: p.startDate, dateText: formatDate(p.startDate), at: at(p.startDate) })
  milestones.push({ id: 'completion', label: 'Practical completion', date: p.programme.practicalCompletion, dateText: formatDate(p.programme.practicalCompletion), at: at(p.programme.practicalCompletion) })
  const materials: ProgrammeMaterialRow[] = rows.map((r) => {
    const card = r.card!
    const a = card.listing.availability
    const window = a.kind === 'window' ? { start: a.windowStart, end: a.windowEnd } : null
    const fit = card.fit?.fit ?? 'now'
    const run = storageRun(window, fit, today, p.startDate)
    const from = window ? at(window.start) : at(today)
    return {
      itemId: r.itemId,
      publicId: r.publicId,
      title: r.title,
      status: r.status,
      statusLabel: r.statusLabel,
      kind: a.kind,
      from,
      to: window ? Math.max(from, at(addDays(window.end, 1))) : from,
      fit,
      fitLabel: FIT_WORDS[fit],
      windowText: card.availabilityText,
      storage: run ? { from: at(run.start), to: at(run.end) } : null,
      href: `/app/discover/${r.publicId}`,
    }
  })
  const plannedText = plannedStageText(p, today)
  const label = PROGRAMME_CHECK_LABELS[check.status]
  const description = [
    `Programme for ${p.name}, ${formatMonth(start)} to ${formatMonth(end)}.`,
    `${plannedText}.`,
    `${label}.`,
    `Site start ${formatDate(p.programme.siteStart)}, practical completion ${formatDate(p.programme.practicalCompletion)}.`,
    materials.length === 0 ? 'No materials on the programme.' : `${plural(materials.length, 'material')}: ${materials.map((m) => `${m.title}, ${m.windowText}, ${m.fitLabel.toLowerCase()}`).join('; ')}.`,
  ].join(' ')
  return {
    range,
    axis: { startText: formatMonth(start), endText: formatMonth(end), spanDays: axis.spanDays, ticks: axis.ticks.map((t) => ({ at: t.at, label: t.label, major: t.major })) },
    today: { date: today, dateText: formatDate(today), at: at(today) },
    stages,
    plannedStageText: plannedText,
    check: { status: check.status, label, text: checkText(check.status, planned, p.ribaStage, p.programme.stageStarts[0]) },
    source: p.programme.source,
    milestones,
    materials,
    canEdit: side === 'architect',
    description,
  }
}

export type ProgrammeSummary = {
  projectId: string
  name: string
  stages: StageSpan[]
  plannedStage: number | null
  declaredStage: number
  siteStart: string
  practicalCompletion: string
  materialsFrom: string
  source: ProgrammeSource
}

/** For the client's parallel timeline and the consultant. Pure, with no viewer: callers pass projects the person may open. */
export function projectProgrammeSummary(p: Project, today: string): ProgrammeSummary {
  return {
    projectId: p.id,
    name: p.name,
    stages: programmeStages(p.programme),
    plannedStage: stageOn(p.programme, today),
    declaredStage: p.ribaStage,
    siteStart: p.programme.siteStart,
    practicalCompletion: p.programme.practicalCompletion,
    materialsFrom: p.startDate,
    source: p.programme.source,
  }
}

export type ProgrammeForm = {
  ribaStage: number
  stageStarts: StageStarts
  siteStart: string
  practicalCompletion: string
  startDate: string
  stageOptions: { value: number; label: string }[]
  today: string
}

/** The programme form's current values, for the project's architect only. */
export function programmeForm(state: AppData, viewer: Viewer, projectId: string): ProgrammeForm | null {
  if (projectSide(state, viewer.userId, projectId) !== 'architect') return null
  const p = state.world.projects[projectId]
  return {
    ribaStage: p.ribaStage,
    stageStarts: [...p.programme.stageStarts],
    siteStart: p.programme.siteStart,
    practicalCompletion: p.programme.practicalCompletion,
    startDate: p.startDate,
    stageOptions: RIBA_STAGES.map((name, i) => ({ value: i, label: `${i}, ${name}` })),
    today: todayOf(viewer),
  }
}
