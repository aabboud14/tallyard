// The project programme for the overview chart, the programme form and the cross-project summaries. Dates are
// the project's own; materials come from the shortlist rows, which read the public listing only (P3).
import type { ProgrammeDates, Project, ProgrammeSource, StageStarts } from '../../domain/types'
import type { Fit, WishStatus } from '../../domain/v1types'
import { RIBA_STAGES } from '../../domain/reference/policy'
import { addDays, daysBetween, formatDate, formatDateShort, formatMonth } from '../../domain/dates'
import { axisAt, PROGRAMME_ERRORS, programmeAxis, programmeCheck, programmeRange, programmeStages, stageOn, suggestProgramme, validateProgramme, type ProgrammeField, type ProgrammeStatus, type StageSpan } from '../../domain/engines/programme'
import { storageRun } from '../../domain/engines/timelineScale'
import type { AppData, Viewer } from '../types'
import { canEditProgramme, projectSide } from '../access'
import { projectWishlist } from '../lots'
import { materialHref } from '../paths'
import { plural } from '../notifications'
import { todayOf } from './common'
import { shortlistRows, type ShortlistRow } from './shortlist'
import { canOpenMaterial } from './discover'

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
  /** "Stage 2, Concept Design, 1 Jun 2026 to 1 Nov 2026": the band's hover text. */
  hoverText: string
  weeksText: string
  from: number
  to: number
  state: 'past' | 'current' | 'future'
  /**
   * False when the stage falls wholly outside the axis, for example an earlier stage on 'From today', or covers less
   * than MIN_BAND_SHARE of it (a sliver), unless it is today's stage. The description still lists a sliver.
   */
  visible: boolean
  /** Where the band's name sits: at its start, or at its end for a band in the right half, so a name wider than its band runs into the chart rather than off its edge. */
  nameAlign: 'start' | 'end'
  /** True when the stage runs on past the right edge (stage 6 on the whole programme, and stage 7): drawn with an open edge. */
  open: boolean
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
  /** "Expected Jan to Mar 2027", for the chart's label column. */
  windowShort: string
  storage: { from: number; to: number } | null
  /** The material page, or null when the viewer cannot open it (a confidential lot, for the consultant). */
  href: string | null
}

/**
 * The chart's axis as the screen needs it: positions and labels only. Tick dates stay out of the view model, so a
 * first of the month can never coincide with a seller's private date in a buyer's view (P3).
 */
export type ProgrammeViewAxis = {
  startText: string
  endText: string
  spanDays: number
  /** tier: from which plot width the label shows (an index into AXIS_LABEL_TIERS), so labels never collide. */
  ticks: { at: number; label: string | null; major: boolean; tier: number }[]
  /** 'Sep 2025' at the left edge when the first tick has no label. */
  startLabel: string | null
}

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
  /** The pill beside the title while the dates wait for someone to keep them: "Suggested dates" or "Client's dates"; null once set. */
  sourceLabel: string | null
  /** "materials" is left out when it is the same day as site start. */
  milestones: ProgrammeMilestone[]
  /** Live shortlist rows, from the public listings only. */
  materials: ProgrammeMaterialRow[]
  /** The architect, or the client while no architect is appointed. */
  canEdit: boolean
  /** 'Keep these dates' on the card: the dates are suggested, or the client's, and the viewer can confirm them. */
  canKeep: boolean
  /** The source pill's tooltip, worded for whoever is looking. */
  suggestedText: string
  /** The line under the chart: where the stages come from and whose dates they are. */
  footerText: string
  /** The materials lane when nothing is shortlisted, worded for whoever is looking. */
  emptyText: string
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

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

const STAGES_SOURCE = 'Stages from the RIBA Plan of Work 2020.'

/** A band narrower than this share of the axis is a sliver: it is not drawn, unless it is today's stage. */
export const MIN_BAND_SHARE = 0.015

const SOURCE_LABELS: Record<ProgrammeSource, string | null> = { suggested: 'Suggested dates', client: "Client's dates", set: null }

/**
 * The card's words for whoever is looking: whose dates they are, what the source pill means and what fills the
 * empty materials lane. A New project with no architect yet names no architect; dates the client set before an
 * architect was appointed stay the client's until the architect keeps or edits them.
 */
function programmeWords(p: Project, side: 'architect' | 'client' | 'consultant', canEdit: boolean): { suggestedText: string; footerText: string; emptyText: string } {
  const architect = !!p.architectOrgId
  const source = p.programme.source
  let whose: string
  let suggestedText: string
  if (source === 'suggested') {
    whose = canEdit ? 'Suggested dates until you keep or edit them.' : architect ? 'Suggested dates until the architect confirms them.' : 'Suggested dates until an architect is appointed.'
    suggestedText = canEdit
      ? 'Worked out from your site start and typical stage lengths. Keep them or edit them to match your plan.'
      : architect
        ? 'Worked out from the site start and typical stage lengths, until the architect confirms them.'
        : 'Worked out from the site start and typical stage lengths, until an architect is appointed.'
  } else if (source === 'client') {
    whose = canEdit ? "The client's dates until you keep or edit them." : side === 'client' ? 'Your dates until the architect confirms them.' : "The client's dates until the architect confirms them."
    suggestedText = canEdit
      ? 'The client set these dates before you were appointed. Keep them or edit them to match your plan.'
      : side === 'client'
        ? 'You set these dates before the architect was appointed. They are yours until the architect confirms them.'
        : 'The client set these dates before the architect was appointed, until the architect confirms them.'
  } else {
    whose = architect ? "Dates are the architect's plan." : canEdit ? 'Dates are your plan until an architect is appointed.' : "Dates are the client's plan until an architect is appointed."
    suggestedText = ''
  }
  const footerText = `${STAGES_SOURCE} ${whose} Indicative.`
  const emptyText =
    side === 'architect'
      ? 'No materials on the programme yet. Shortlist materials and each one appears here against your programme.'
      : architect
        ? 'Materials appear here as the architect shortlists them.'
        : 'Materials appear here once an architect is appointed and shortlists them.'
  return { suggestedText, footerText, emptyText }
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
  const stages: ProgrammeStageBand[] = spans.map((s) => {
    const datesText = s.end === null ? `From ${formatDateShort(s.start)}` : `${formatDateShort(s.start)} to ${formatDateShort(s.end)}`
    const name = RIBA_STAGES[s.stage] ?? ''
    const from = at(s.start)
    const to = s.end === null ? 1 : at(addDays(s.end, 1))
    const state: ProgrammeStageBand['state'] = planned === null ? 'future' : s.stage < planned ? 'past' : s.stage === planned ? 'current' : 'future'
    return {
      stage: s.stage,
      label: `Stage ${s.stage}`,
      name,
      start: s.start,
      end: s.end,
      datesText,
      hoverText: `Stage ${s.stage}, ${name}, ${s.end === null ? lowerFirst(datesText) : datesText}`,
      weeksText: weeksText(s),
      from,
      to,
      state,
      visible: to > from && (state === 'current' || to - from >= MIN_BAND_SHARE),
      nameAlign: (from + to) / 2 > 0.5 ? 'end' : 'start',
      open: s.end === null || daysBetween(axis.end, s.end) > 0,
    }
  })
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
      windowShort: card.availabilityShort,
      storage: run ? { from: at(run.start), to: at(run.end) } : null,
      href: canOpenMaterial(state, viewer, r.publicId) ? materialHref(r.publicId, p.id) : null,
    }
  })
  const plannedText = plannedStageText(p, today)
  const label = PROGRAMME_CHECK_LABELS[check.status]
  const canEdit = canEditProgramme(state, viewer.userId, projectId)
  const words = programmeWords(p, side, canEdit)
  const description = [
    `Programme for ${p.name}, ${formatMonth(start)} to ${formatMonth(end)}.`,
    `${plannedText}.`,
    `${label}.`,
    `Site start ${formatDate(p.programme.siteStart)}, practical completion ${formatDate(p.programme.practicalCompletion)}.`,
    `Stages: ${stages.filter((b) => b.to > b.from).map((b) => b.hoverText).join('; ')}.`,
    materials.length === 0 ? 'No materials on the programme.' : `${plural(materials.length, 'material')}: ${materials.map((m) => `${m.title}, ${m.windowText}, ${m.fitLabel.toLowerCase()}`).join('; ')}.`,
  ].join(' ')
  return {
    range,
    axis: { startText: formatMonth(start), endText: formatMonth(end), spanDays: axis.spanDays, ticks: axis.ticks.map((t) => ({ at: t.at, label: t.label, major: t.major, tier: t.tier })), startLabel: axis.startLabel },
    today: { date: today, dateText: formatDate(today), at: at(today) },
    stages,
    plannedStageText: plannedText,
    check: { status: check.status, label, text: checkText(check.status, planned, p.ribaStage, p.programme.stageStarts[0]) },
    source: p.programme.source,
    sourceLabel: SOURCE_LABELS[p.programme.source],
    milestones,
    materials,
    canEdit,
    canKeep: canEdit && p.programme.source !== 'set',
    ...words,
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

/** The programme form's current values, for whoever may set the programme (canEditProgramme). */
export function programmeForm(state: AppData, viewer: Viewer, projectId: string): ProgrammeForm | null {
  if (!canEditProgramme(state, viewer.userId, projectId)) return null
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

// ---------- The programme dialog: live lengths, field errors and suggested dates ----------

/** The programme dialog's values as typed: ISO strings, possibly empty or half typed. */
export type ProgrammeDraft = { ribaStage: number; stageStarts: StageStarts; siteStart: string; practicalCompletion: string; startDate: string }

export type ProgrammeDraftRow = { stage: number; field: ProgrammeField; label: string; name: string; start: string; lengthText: string }

export type ProgrammeDraftView = {
  /** Stages 0 to 4, each with its start and its length until the next stage starts ('' while a date is missing). */
  rows: ProgrammeDraftRow[]
  /** Stage 5, site start to practical completion, as a length. */
  constructionText: string
  /** The first problem on each field, from validateProgramme. */
  errors: Partial<Record<ProgrammeField, string>>
  valid: boolean
}

function lengthText(start: string, end: string): string {
  const days = daysBetween(start, end) + 1
  if (!Number.isFinite(days) || days <= 0) return ''
  return days < 14 ? plural(days, 'day') : plural(Math.round(days / 7), 'week')
}

const isIso = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s

/** What the programme dialog shows as the architect types: each stage's length and the errors on each field. */
export function programmeDraftView(d: ProgrammeDraft): ProgrammeDraftView {
  const dates: ProgrammeDates = { stageStarts: d.stageStarts, siteStart: d.siteStart, practicalCompletion: d.practicalCompletion }
  const errors: Partial<Record<ProgrammeField, string>> = {}
  for (const [field, message] of validateProgramme(dates, d.startDate)) if (!errors[field]) errors[field] = message
  const ends = [d.stageStarts[1], d.stageStarts[2], d.stageStarts[3], d.stageStarts[4], d.siteStart]
  const rows: ProgrammeDraftRow[] = d.stageStarts.map((start, i) => ({
    stage: i,
    field: `stage${i}` as ProgrammeField,
    label: `Stage ${i}`,
    name: RIBA_STAGES[i],
    start,
    lengthText: isIso(start) && isIso(ends[i]) ? lengthText(start, addDays(ends[i], -1)) : '',
  }))
  const constructionText = isIso(d.siteStart) && isIso(d.practicalCompletion) ? lengthText(d.siteStart, addDays(d.practicalCompletion, -1)) : ''
  return { rows, constructionText, errors, valid: Object.keys(errors).length === 0 }
}

/** 'Suggest stage dates': the five stage starts from today, the stage, site start and practical completion, or why not. */
export function suggestedStageStarts(today: string, ribaStage: number, siteStart: string, practicalCompletion: string): { stageStarts: StageStarts } | { error: string } {
  if (!isIso(siteStart)) return { error: PROGRAMME_ERRORS.badDate }
  const dates = suggestProgramme(today, ribaStage, siteStart, isIso(practicalCompletion) ? practicalCompletion : null)
  if (!dates) return { error: PROGRAMME_ERRORS.tooSoon }
  return { stageStarts: dates.stageStarts }
}
