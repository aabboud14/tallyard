// The sustainability consultant's dashboard: each project against the targets set at inception (reused content
// by value and avoided carbon, read through effectiveTargets), drawn from its shortlist's public cards, plus waste engagements. Indicative.
import * as f from '../../domain/format'
import { projectSketch, type BuildingSketch } from '../../domain/sketch'
import { stageOn } from '../../domain/engines/programme'
import type { AppData, Viewer } from '../types'
import { projectWishlist } from '../lots'
import { todayOf } from './common'
import { shortlistRows } from './shortlist'
import { consultantHome, type ConsultantHome } from './consultant'
import { projectTabs } from './project'
import { effectiveTargets } from './sustainability'
import { niceMax } from '../../domain/engines/chartScale'
import { metricState, type MetricState } from '../../domain/engines/metricState'
import { activitySummary, targetProgress, targetsMetState, targetState, type ActivitySummary, type TargetProgress, type TileState } from './dashboard'

/** A meter's scale and state: value and target on one scale whose right end is a round figure at least both. */
export type TargetMeterView = { value: number; max: number; target: number | null; state: MetricState }

export type TargetRowView = TargetProgress & { actualText: string; targetText: string | null; statusText: string; meter: TargetMeterView; /** The target in round words, for the meter: "Aim at least 25%". */ aimText: string | null }

export type ConsultantDashboard = ConsultantHome & {
  metrics: {
    withTargets: number
    carbonTargetT: number
    carbonShare: number
    carbonValueText: string
    targetsMet: number
    targetsSet: number
    /** Set targets the figures fall short of; the rest of the unmet ones have no figure yet. */
    targetsBelow: number
    /** Set targets with no figure yet (no bill of materials). */
    targetsWaiting: number
    billsReviewed: number
    /** Approved avoided carbon on the targeted projects, the figure the ring and its state read. */
    carbonApprovedT: number
    carbonState: TileState | null
    targetsState: TileState | null
  }
  rows: {
    id: string
    name: string
    clientName: string
    stage: number
    /** The RIBA stage the programme dates place today in (round 2); null before stage 0 starts. */
    plannedStage: number | null
    href: string
    sketch: BuildingSketch
    links: { id: string; label: string; href: string }[]
    content: TargetRowView
    carbon: TargetRowView
  }[]
  activitySummary: ActivitySummary
}

/** The tabs a project card links to; the sidebar folder shows all of them (client-consultant design, open questions). */
const CARD_LINKS: string[] = ['sustainability', 'targets', 'certification']

const STATUS_TEXT: Record<TargetProgress['status'], string> = { met: 'Target met', below: 'Below target', no_target: 'No target set', no_data: 'No bill of materials yet' }

/** Headroom above the larger of figure and target, so the target tick sits inside the meter. */
const METER_HEADROOM = 1.1

function targetRow(actual: number | null, target: number, format: (x: number) => string, round: (x: number) => string): TargetRowView {
  const p = targetProgress(actual, target)
  const value = actual ?? 0
  const meter: TargetMeterView = {
    value,
    max: niceMax(Math.max(value, target > 0 ? target : 0) * METER_HEADROOM),
    target: target > 0 ? target : null,
    // No figure yet reads as no state, not as off target.
    state: actual === null ? 'neutral' : metricState(value, target > 0 ? target : null, 'at_least'),
  }
  return { ...p, actualText: actual === null ? 'Not known' : format(actual), targetText: target > 0 ? format(target) : null, statusText: STATUS_TEXT[p.status], meter, aimText: target > 0 ? `Aim at least ${round(target)}` : null }
}

/** The consultant's dashboard; null for anyone who is not a sustainability consultant. */
export function consultantDashboard(state: AppData, viewer: Viewer): ConsultantDashboard | null {
  const home = consultantHome(state, viewer)
  if (!home) return null
  let carbonTargetT = 0
  let approvedAgainstTargetT = 0
  let withTargets = 0
  let targetsSet = 0
  let targetsMet = 0
  let targetsBelow = 0
  const rows = home.projects.map((c) => {
    const p = state.world.projects[c.id]
    // The consultant's overrides, or the defaults from the requirements (client-consultant design: the one source of targets).
    const targets = effectiveTargets(state, p.id)
    const content = targetRow(c.contentPercent, targets.contentByValue, f.percent, (x) => `${f.number(x * 100, 0)}%`)
    const carbon = targetRow(c.avoidedApprovedT, targets.avoidedCarbonT, f.carbon, (x) => `${f.number(x, 0)} tCO2e`)
    if (targets.contentByValue > 0 || targets.avoidedCarbonT > 0) withTargets += 1
    for (const t of [content, carbon]) {
      if (t.status === 'no_target') continue
      targetsSet += 1
      if (t.status === 'met') targetsMet += 1
      if (t.status === 'below') targetsBelow += 1
    }
    if (targets.avoidedCarbonT > 0) {
      carbonTargetT += targets.avoidedCarbonT
      approvedAgainstTargetT += c.avoidedApprovedT
    }
    // Families from the live shortlist's public cards only.
    const list = projectWishlist(state.world, p.id)
    const families = (list ? shortlistRows(state, viewer, list, p) : []).flatMap((r) => (r.card && r.status !== 'declined' ? [r.card.family] : []))
    return {
      id: c.id,
      name: c.name,
      clientName: c.clientName,
      stage: c.stage,
      plannedStage: stageOn(p.programme, todayOf(viewer)),
      href: c.href,
      sketch: projectSketch(p, families),
      links: projectTabs(state, 'consultant', p)
        .filter((t) => CARD_LINKS.includes(t.id))
        .map((t) => ({ id: t.id, label: t.label, href: t.href })),
      content,
      carbon,
    }
  })
  return {
    ...home,
    metrics: {
      withTargets,
      carbonTargetT,
      carbonShare: targetProgress(approvedAgainstTargetT, carbonTargetT).share,
      carbonValueText: f.number(approvedAgainstTargetT, 1),
      targetsMet,
      targetsSet,
      targetsBelow,
      targetsWaiting: targetsSet - targetsMet - targetsBelow,
      billsReviewed: home.engagements.filter((e) => e.hasBill).length,
      carbonApprovedT: approvedAgainstTargetT,
      carbonState: targetState(approvedAgainstTargetT, carbonTargetT),
      targetsState: targetsMetState(targetsMet, targetsBelow, targetsSet),
    },
    rows,
    activitySummary: activitySummary(home.activity),
  }
}
