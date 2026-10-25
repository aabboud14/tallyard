// What the client and consultant screens draw (round 2, client-consultant design section 7): the state of each goal
// against its target, the scales of the bars and rings, the client home's tile states, sketches and timeline rows,
// and the filters on Requirements. Built on the view models in client-dashboard.ts, client.ts, project.ts and
// sustainability.ts, so the screens only format (P2). Pure.
import type { GoalValue } from '../../domain/sustainabilityTypes'
import type { StatementStatus, TrackStatus } from '../../domain/sustainabilityTypes'
import { goalDef } from '../../domain/reference/goals'
import { goalState, goalValueText } from '../../domain/engines/goals'
import { metricState, METRIC_STATE_WORDS, type MetricState } from '../../domain/engines/metricState'
import { niceMax, ticks } from '../../domain/engines/chartScale'
import type { BuildingSketch } from '../../domain/sketch'
import { formatDateShort } from '../../domain/dates'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import type { ProjectSide } from '../access'
import { inSentence, statementStatusText } from '../../domain/reference/sustainabilityCopy'
import { activitySummary, type ActivitySummary, type ThumbMaterial } from './dashboard'
import { clientProjectVisual } from './project-visuals'
import { clientDashboard, type ClientDashboard } from './client-dashboard'
import { programmeInput } from './portfolio'
import type { ReservationGroup, ReservationsView, ApprovalsView } from './client'
import type { ProjectCarbon } from './project'
import type { ComplianceView } from './consultant'
import type { GoalRow, SchemeSummaryView } from './sustainability'

// ---------- One goal against its target ----------

/** Everything a TargetMeter needs for one goal. */
export type GoalMeter = {
  value: number
  max: number
  target: number | null
  valueText: string
  /** "Aim at least 25%", "Aim at most 950 kgCO2e per m2" or "Aim Excellent". */
  targetText: string | null
  state: MetricState
  stateText: string
  axis: { start: string; end: string }
}

// The rating rule lives with the goals engine so the meters, the tracking table and the consultant home share it.
export { RATING_NEAR_LEVELS, ratingState } from '../../domain/engines/goals'

/** The right end of a meter: a nice number a little past the larger of the target and the result. */
export function meterMax(target: number | null, actual: number | null): number {
  // With no target, the result sits at about half the scale so a bar never reads as full.
  const top = target === null ? (actual ?? 0) * 2 : Math.max(target, actual ?? 0)
  return top > 0 ? niceMax(top * 1.05) : 1
}

/** A goal value for a target or an axis end: whole tonnes read without a decimal ("150 tCO2e"). */
export function scaleValueText(row: Pick<GoalRow, 'id'>, v: number): string {
  const def = goalDef(row.id)
  if (def.unit === 'tCO2e' && Number.isInteger(v)) return `${f.number(v, 0)} tCO2e`
  return goalValueText(def, v)
}

function numberOrNull(v: GoalValue | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function goalMeter(row: GoalRow): GoalMeter {
  const notTargeted = row.source === 'override' && row.target === null
  if (row.scale) {
    const level = (v: GoalValue | null) => (v === null ? null : row.scale!.indexOf(String(v)) + 1 || null)
    const t = level(row.target)
    const a = level(row.actual)
    const state = goalState(goalDef(row.id), row.target, row.actual)
    return {
      value: a ?? 0,
      max: row.scale.length,
      target: t,
      valueText: row.actual === null ? 'No result yet' : String(row.actual),
      targetText: t === null ? null : `Aim ${row.target}`,
      state,
      stateText: state === 'neutral' ? (notTargeted ? 'Not targeted' : row.statusText) : METRIC_STATE_WORDS[state],
      axis: { start: row.scale[0], end: row.scale[row.scale.length - 1] },
    }
  }
  const t = numberOrNull(row.target)
  const a = numberOrNull(row.actual)
  const max = meterMax(t, a)
  const state = goalState(goalDef(row.id), t, a)
  return {
    value: a ?? 0,
    max,
    target: t,
    valueText: row.actualText,
    targetText: t === null ? null : `Aim ${row.direction === 'at_least' ? 'at least' : 'at most'} ${scaleValueText(row, t)}`,
    state,
    stateText: state === 'neutral' ? (notTargeted ? 'Not targeted' : row.statusText) : METRIC_STATE_WORDS[state],
    axis: { start: scaleValueText(row, 0), end: scaleValueText(row, max) },
  }
}

/** A stored value as it reads in a form field: "25" for 25%, "150" tonnes, "950", or the level. Blank when not set. */
export function goalInputText(row: Pick<GoalRow, 'id'>, value: GoalValue | null): string {
  if (value === null) return ''
  const def = goalDef(row.id)
  if (def.unit === 'rating') return String(value)
  const n = Number(value)
  const text = def.unit === 'ratio' ? f.fixed(n * 100, 1) : def.unit === 'tCO2e' ? f.fixed(n, 1) : f.fixed(n, 0)
  return text.endsWith('.0') ? text.slice(0, -2) : text
}

/** The unit shown beside the field for a goal. */
export const GOAL_INPUT_UNIT = { ratio: '%', tCO2e: 'tCO2e', kgCO2e_m2: 'kgCO2e per m2 GIA', rating: '' } as const

export function goalInputUnit(row: Pick<GoalRow, 'id'>): string {
  return GOAL_INPUT_UNIT[goalDef(row.id).unit]
}

// ---------- The client home ----------

export type TileReading = { state: MetricState; stateLabel: string }
/** A thin bar for a narrow tile: the figure against a scale, with the target tick. */
export type TileBar = { value: number; max: number; target: number; valueText: string; targetText: string }

export type ClientTimelineRow = ClientDashboard['programme']['rows'][number] & { siteStartDate: string | null; completionDate: string | null; materialsFromDate: string }

export type ClientCardExtra = {
  materials: ThumbMaterial[]
  /** 'Office, Newham', or 'Office' when no local authority is recorded. */
  placeText: string
  /**
   * Null once the client has materials to see (sent or approved). Before that: 'Shortlisting under way' while the
   * architect holds shortlisted materials not yet sent, 'Being set up' while the programme is still suggested, and
   * 'Nothing shortlisted yet' after that. Read from the rows the client can see, never the architect's pending ones.
   */
  status: { kind: 'shortlisting' | 'setting_up' | 'no_shortlist'; label: string } | null
}

/** The line above a client project card's name: its type, then its local authority when one is recorded. */
export function clientPlaceText(typeLabel: string, localAuthority: string): string {
  return [typeLabel, localAuthority.trim()].filter((x) => x.length > 0).join(', ')
}

export type ClientHomeView = ClientDashboard & {
  tiles: {
    saving: TileReading & { valueText: string; ring: { value: number; max: number; centre: string } | null }
    carbon: TileReading & { ring: { value: number; max: number; valueText: string; centre: string } | null; bar: TileBar | null }
    /** state and stateLabel judge content by value (the line under the reuse figure), not the reuse figure itself. */
    reuse: TileReading & { aimText: string | null; contentText: string | null; ring: { value: number; max: number; valueText: string; centre: string } | null; bar: TileBar | null }
  }
  reservationCounts: { pending: number; reserved: number; toRequest: number }
  timeline: { ticks: { iso: string; at: number; label: string | null }[]; today: number; todayText: string; rows: ClientTimelineRow[] }
  sketches: Record<string, BuildingSketch>
  /** Per project card: the swatches, the type and place line, and a pill while nothing is shortlisted yet. */
  cardExtras: Record<string, ClientCardExtra>
  activitySummary: ActivitySummary
  todoCounts: { total: number; overdue: number }
}

/** Share of a whole, for the figure in the middle of a ring: "32%". */
function ringCentre(value: number, max: number): string {
  return max > 0 ? `${f.fixed(Math.min(1, value / max) * 100, 0)}%` : ''
}

/** The reuse tile's state line: it judges recycled content against the aim, so it says so. */
export function reuseStateLabel(content: number | null, state: MetricState): string {
  if (content === null) return 'No bill yet'
  if (state === 'neutral') return 'No content aim set'
  return `Recycled content ${METRIC_STATE_WORDS[state].toLowerCase()}`
}

/** The reuse tile's content line: the measure named as everywhere else, against the project aim. */
export function reuseContentText(content: number | null, aim: number | null): string | null {
  if (content === null) return null
  return aim === null ? `${f.percent(content)} reused and recycled by value, no aim set` : `${f.percent(content)} reused and recycled by value, aim ${f.fixed(aim * 100, 0)}%`
}

/** The client's dashboard with the state of each tile, the drawn thumbnails and the timeline's marker dates. */
export function clientHomeView(state: AppData, viewer: Viewer): ClientHomeView | null {
  const d = clientDashboard(state, viewer)
  if (!d) return null
  const m = d.metrics
  const carbonTarget = m.carbon.targetT > 0 ? m.carbon.targetT : null
  const carbonState = metricState(m.carbon.securedT, carbonTarget, 'at_least')
  const reuseAim = m.reuse.aim > 0 ? m.reuse.aim : null
  const reuseState: MetricState = m.reuse.content === null ? 'neutral' : metricState(m.reuse.content, reuseAim, 'at_least')
  const projects = d.projects.map((card) => state.world.projects[card.id]).filter((p) => !!p)
  // Drawn the same way for every role (projectVisual), so a project looks the same to its client and its architect.
  const sketches: Record<string, BuildingSketch> = {}
  const cardExtras: Record<string, ClientCardExtra> = {}
  for (const card of d.projects) {
    const p = state.world.projects[card.id]
    // The same drawing as every role; swatches and status only from what the client can see.
    const visual = p ? clientProjectVisual(state, viewer, card.id) : null
    if (!p || !visual) continue
    sketches[card.id] = visual.sketch
    const status: ClientCardExtra['status'] =
      visual.sentOrApproved > 0
        ? null
        : visual.pendingWithArchitect > 0
          ? { kind: 'shortlisting', label: 'Shortlisting under way' }
          : p.programme.source === 'set'
            ? { kind: 'no_shortlist', label: 'Nothing shortlisted yet' }
            : { kind: 'setting_up', label: 'Being set up' }
    cardExtras[card.id] = { materials: visual.materials, placeText: clientPlaceText(card.typeLabel, card.localAuthority), status }
  }
  const rows: ClientTimelineRow[] = d.programme.rows.map((r) => {
    const p = projects.find((x) => x.id === r.id)
    const input = p ? programmeInput(p) : null
    return {
      ...r,
      siteStartDate: input?.siteStart ? formatDateShort(input.siteStart) : null,
      completionDate: input?.completion ? formatDateShort(input.completion) : null,
      materialsFromDate: input ? formatDateShort(input.materialsFrom) : '',
    }
  })
  return {
    ...d,
    tiles: {
      saving: {
        ...(m.saving.negative ? { state: 'warning' as const, stateLabel: 'Costs more than new' } : { state: 'good' as const, stateLabel: 'Cheaper than new' }),
        valueText: f.moneyWhole(Math.abs(m.saving.amount)),
        ring: m.saving.costNew > 0 && !m.saving.negative ? { value: m.saving.amount, max: m.saving.costNew, centre: ringCentre(m.saving.amount, m.saving.costNew) } : null,
      },
      carbon: {
        state: carbonState,
        stateLabel: METRIC_STATE_WORDS[carbonState],
        ring: carbonTarget === null ? null : { value: m.carbon.securedT, max: carbonTarget, valueText: `${f.number(m.carbon.securedT, 1)} of ${f.number(carbonTarget, 0)} tCO2e`, centre: ringCentre(m.carbon.securedT, carbonTarget) },
        bar: carbonTarget === null ? null : { value: m.carbon.securedT, max: meterMax(carbonTarget, m.carbon.securedT), target: carbonTarget, valueText: `${f.number(m.carbon.securedT, 1)} tCO2e secured`, targetText: `Target ${f.number(carbonTarget, 0)} tCO2e` },
      },
      reuse: {
        state: reuseState,
        // The state judges recycled content (the sub line), not the reuse figure above it, so it names what it judges.
        stateLabel: reuseStateLabel(m.reuse.content, reuseState),
        aimText: reuseAim === null ? null : `${f.fixed(reuseAim * 100, 0)}%`,
        contentText: reuseContentText(m.reuse.content, reuseAim),
        ring: m.reuse.content === null || reuseAim === null ? null : { value: m.reuse.content, max: reuseAim, valueText: `${f.percent(m.reuse.content)} of the ${f.percent(reuseAim)} aim`, centre: ringCentre(m.reuse.content, reuseAim) },
        bar: m.reuse.content === null || reuseAim === null ? null : { value: m.reuse.content, max: meterMax(reuseAim, m.reuse.content), target: reuseAim, valueText: `${f.percent(m.reuse.content)} reused and recycled`, targetText: `Aim at least ${f.fixed(reuseAim * 100, 0)}%` },
      },
    },
    reservationCounts: {
      pending: d.reservations.filter((r) => r.status === 'pending').length,
      reserved: d.reservations.filter((r) => r.status === 'accepted').length,
      toRequest: d.todos.filter((t) => t.kind === 'reserve' || t.kind === 'request_again').length,
    },
    // Ticks carry a key only: their dates stay out of the view model (P3).
    timeline: { ticks: d.programme.ticks.map((t, i) => ({ iso: `tick-${i}`, at: t.at, label: t.label })), today: d.programme.today, todayText: d.programme.todayText, rows },
    sketches,
    cardExtras,
    activitySummary: activitySummary(d.activity),
    todoCounts: { total: d.todos.length, overdue: d.todos.filter((t) => t.overdue).length },
  }
}

// ---------- Approvals and reservations ----------

/** The three tiles over the approvals: waiting, approved and the carbon of what is waiting. */
export function approvalsStrip(v: ApprovalsView): { waiting: { count: number; sub: string }; approved: { count: number; sub: string }; avoidedIfApprovedT: number } {
  const sub = (t: ApprovalsView['finance']['waiting']) => (t.count === 0 ? 'Nothing here yet' : `Indicative ${f.moneyWhole(t.total)}, ${t.saving < 0 ? `costs ${f.moneyWhole(-t.saving)} more than new` : `saving ${f.moneyWhole(t.saving)} against new`}`)
  return { waiting: { count: v.finance.waiting.count, sub: sub(v.finance.waiting) }, approved: { count: v.finance.approved.count, sub: sub(v.finance.approved) }, avoidedIfApprovedT: v.finance.waiting.avoidedT }
}

/**
 * A saving in whole pounds, for summary lines beside whole-pound totals: "Saving £8,525 (14.4%)", or "Costs £200
 * more than new". The package panels keep pence; a summary line never mixes the two.
 */
export function savingWholeText(amount: number, ratio: number | null = null): string {
  const share = ratio === null ? '' : ` (${f.percent(Math.abs(ratio))})`
  return amount < 0 ? `Costs ${f.moneyWhole(-amount)} more than new${share}` : `Saving ${f.moneyWhole(amount)}${share}`
}

export const RESERVATION_GROUP_LABELS: Record<ReservationGroup, string> = { reserved: 'Reserved', requested: 'With the seller', to_request: 'To request' }
const GROUPS: ReservationGroup[] = ['reserved', 'requested', 'to_request']

export type ReservationCostBar = { key: ReservationGroup; label: string; count: number; value: number; valueText: string; sub: string; costNew: number; costNewText: string }

/** The cost card: package totals by group against the same new, on one scale. */
export function reservationCostBars(s: ReservationsView['summary']): { bars: ReservationCostBar[]; max: number; ticks: { value: number; label: string }[]; total: { valueText: string; savingText: string; count: number } } {
  const top = Math.max(0, ...GROUPS.flatMap((g) => [s.cost[g].total, s.cost[g].costNew]))
  const max = niceMax(top)
  const bars = GROUPS.map((g): ReservationCostBar => {
    const t = s.cost[g]
    return {
      key: g,
      label: RESERVATION_GROUP_LABELS[g],
      count: t.count,
      value: t.total,
      valueText: f.moneyWhole(t.total),
      sub: t.count === 0 ? 'None' : `${t.count} ${t.count === 1 ? 'material' : 'materials'}, ${t.saving < 0 ? `costs ${f.moneyWhole(-t.saving)} more than new` : `saving ${f.moneyWhole(t.saving)}`}`,
      costNew: t.costNew,
      costNewText: `The same new ${f.moneyWhole(t.costNew)}`,
    }
  })
  return {
    bars,
    max,
    ticks: ticks(top, 2).map((v) => ({ value: v, label: f.moneyWhole(v) })),
    total: { valueText: f.moneyWhole(s.total.total), savingText: savingWholeText(s.total.saving, s.total.savingPercent), count: s.total.count },
  }
}

/** The carbon card's rows: avoided carbon and mass by group. */
export function reservationCarbonRows(s: ReservationsView['summary']): { key: ReservationGroup; label: string; count: number; carbonText: string; massText: string }[] {
  return GROUPS.map((g) => ({ key: g, label: RESERVATION_GROUP_LABELS[g], count: s.carbon[g].count, carbonText: f.carbon(s.carbon[g].avoidedT), massText: f.massT(s.carbon[g].massT) }))
}

// ---------- Carbon by status and by typology ----------

export type CarbonBars = { items: { key: string; label: string; value: number; valueText: string; sub: string; muted: boolean }[]; max: number; ticks: { value: number; label: string }[] }

function barsOf(lines: ProjectCarbon['byStatus']): CarbonBars {
  const top = Math.max(0, ...lines.map((l) => l.avoidedT))
  return {
    items: lines.map((l) => ({ key: l.key, label: l.label, value: l.avoidedT, valueText: f.carbon(l.avoidedT), sub: `${l.count} ${l.count === 1 ? 'material' : 'materials'}, ${f.massT(l.massT)}`, muted: l.key === 'declined' })),
    max: niceMax(top),
    ticks: ticks(top).map((v) => ({ value: v, label: f.number(v, 0) })),
  }
}

/** The two carbon charts of the Sustainability tab, each on its own scale. */
export function carbonBars(c: ProjectCarbon): { status: CarbonBars; typology: CarbonBars } {
  return { status: barsOf(c.byStatus), typology: barsOf(c.byTypology) }
}

// ---------- Certification and requirements ----------

/** The pill tone of each statement status: draft quiet, with the client blue, reviewed green. */
export const STATEMENT_TONE: Record<StatementStatus, 'neutral' | 'info' | 'brand'> = { draft: 'neutral', ready_for_review: 'info', reviewed: 'brand' }

/** The order statuses read in on a bar: done first, then working, then at risk, then not started. */
export const TRACK_BAR_ORDER: readonly TrackStatus[] = ['evidence_ready', 'in_progress', 'at_risk', 'not_started', 'not_applicable']

/** "2 of 4 ready" or "Nothing targeted". */
export function readyText(ready: number, targeted: number): string {
  return targeted === 0 ? 'Nothing targeted' : `${ready} of ${targeted} ready`
}

/** A scheme card's words: the target, the latest level (for the circular measures, the statement) and the readiness. */
export function schemeCard(s: SchemeSummaryView, side: ProjectSide = 'consultant'): { targetText: string; latestLabel: string; predictedText: string; latestLine: string; readyText: string; atRiskText: string | null } {
  const circular = s.scheme === 'circular' ? s.circular : null
  const statement = circular ? statementStatusText(side, circular.statement) : null
  return {
    targetText: circular ? (circular.contentTarget > 0 ? `Content by value at least ${f.fixed(circular.contentTarget * 100, 0)}%` : 'Content by value not targeted') : (s.ratingTarget ?? 'Not targeted'),
    latestLabel: circular ? 'Statement' : 'Latest',
    predictedText: statement ?? (s.ratingPredicted ? `Predicted ${s.ratingPredicted}` : 'No prediction yet'),
    /** The latest in one phrase, for a one-line summary. */
    latestLine: statement ? `Statement ${inSentence(statement)}` : s.ratingPredicted ? `Predicted ${s.ratingPredicted}` : 'No prediction yet',
    readyText: readyText(s.ready, s.targeted),
    atRiskText: s.atRisk > 0 ? `${s.atRisk} at risk` : null,
  }
}

export type RequirementFilterKey = 'all' | 'at_risk' | 'open' | 'evidence_ready' | 'not_applicable'

const OPEN: readonly TrackStatus[] = ['not_started', 'in_progress', 'at_risk']

/** The filter chips on Requirements, with their counts and the requirements each one shows. */
export function requirementFilters(rows: { id: string; status: TrackStatus }[]): { key: RequirementFilterKey; label: string; count: number; ids: string[] }[] {
  const of = (test: (s: TrackStatus) => boolean) => rows.filter((r) => test(r.status)).map((r) => r.id)
  const chips: [RequirementFilterKey, string, string[]][] = [
    ['all', 'All', rows.map((r) => r.id)],
    ['at_risk', 'At risk', of((s) => s === 'at_risk')],
    ['open', 'Open', of((s) => OPEN.includes(s))],
    ['evidence_ready', 'Evidence ready', of((s) => s === 'evidence_ready')],
    ['not_applicable', 'Not applicable', of((s) => s === 'not_applicable')],
  ]
  return chips.map(([key, label, ids]) => ({ key, label, count: ids.length, ids }))
}

// ---------- Compliance ----------

export type ComplianceFigures = {
  content: {
    /** "Secured against the project target", or against the policy aim when the project has no target of its own. */
    label: string
    value: number
    withApproved: number
    max: number
    target: number
    valueText: string
    withApprovedText: string
    targetText: string
    /** The policy aim as a second mark, when the project target differs from it. */
    reference: { value: number; text: string } | null
    state: MetricState
    stateText: string
    axis: { start: string; end: string }
  } | null
  contribution: { items: { key: string; label: string; value: number; valueText: string }[]; max: number }
}

/**
 * Content by value against the project's own target (BRIEF 14.2: effectiveTargets is the one source of project
 * targets), with the policy aim as a second mark; and each bill line's points from reuse, for the compliance page.
 */
export function complianceFigures(c: ComplianceView): ComplianceFigures {
  const lines = c.secured.lines.filter((l) => l.line.family !== null)
  const names = new Map(c.billLines.map((b) => [b.id, b.name]))
  const items = lines.map((l) => ({ key: l.line.id, label: names.get(l.line.id) ?? l.line.element, value: l.points, valueText: `${f.signedPoints(l.points)} points` }))
  const contribution = { items, max: niceMax(Math.max(0, ...items.map((i) => i.value))) }
  if (!c.hasBill) return { content: null, contribution }
  const secured = c.secured.percent
  const projectTarget = c.targets.contentByValue > 0 ? c.targets.contentByValue : null
  const target = projectTarget ?? c.aim
  const pct = (x: number) => `${f.fixed(x * 100, 0)}%`
  const max = meterMax(Math.max(target, c.aim), Math.max(secured, c.withApproved.percent))
  const state = metricState(secured, target, 'at_least')
  return {
    content: {
      label: projectTarget === null ? 'Secured against the policy aim' : 'Secured against the project target',
      value: secured,
      withApproved: c.withApproved.percent,
      max,
      target,
      valueText: f.percent2(secured),
      withApprovedText: f.percent2(c.withApproved.percent),
      targetText: projectTarget === null ? `Policy aim at least ${pct(c.aim)}` : `Target at least ${pct(projectTarget)}`,
      reference: projectTarget !== null && Math.abs(projectTarget - c.aim) > 1e-9 ? { value: c.aim, text: `Policy aim ${pct(c.aim)}` } : null,
      state,
      stateText: METRIC_STATE_WORDS[state],
      axis: { start: '0%', end: `${f.fixed(max * 100, 0)}%` },
    },
    contribution,
  }
}
