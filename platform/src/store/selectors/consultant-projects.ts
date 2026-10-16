// The consultant's own reading of each project for the Projects list (round 2 follow-up, audit note 42): content
// by value and avoided carbon against the targets, the statement's status and the requirements at risk, in place
// of the client's shortlist and approval counts. Built from the goal rows, so the list, the home and Goals and
// targets agree (P2). No money figure.
import type { MetricState } from '../../domain/engines/metricState'
import type { AppData, Viewer } from '../types'
import { projectSide, projectsOfUser } from '../access'
import { sustainabilityOf } from '../sustainabilityRecord'
import { statementStatusText } from '../../domain/reference/sustainabilityCopy'
import { goalDef } from '../../domain/reference/goals'
import type { StatementStatus } from '../../domain/sustainabilityTypes'
import { goalRows, requirementsRollup, type GoalRow } from './sustainability'
import { goalMeter, STATEMENT_TONE } from './sustainability-screens'

/** One goal in a line: "19.9%", "Aim at least 25%", and its state in words. */
export type ConsultantGoalLine = { label: string; valueText: string; targetText: string | null; state: MetricState; stateText: string }

export type ConsultantProjectSummary = {
  content: ConsultantGoalLine
  carbon: ConsultantGoalLine
  statement: { status: StatementStatus | null; label: string; tone: 'neutral' | 'info' | 'brand'; href: string }
  requirements: { total: number; ready: number; atRisk: number; text: string; href: string }
}

/** The two goals' names, as Goals and targets and the consultant home give them; also the Projects table's headers. */
export const CONSULTANT_GOAL_LABELS = { content: goalDef('content_by_value').label, carbon: goalDef('avoided_carbon').label } as const

function line(label: string, row: GoalRow | undefined): ConsultantGoalLine {
  if (!row) return { label, valueText: 'No result yet', targetText: null, state: 'neutral', stateText: 'No target set' }
  const m = goalMeter(row)
  return { label, valueText: m.valueText, targetText: m.targetText, state: m.state, stateText: m.stateText }
}

/** "1 of 10 ready", or that none are recorded. */
function requirementsText(ready: number, total: number): string {
  return total === 0 ? 'None recorded' : `${ready} of ${total} ready`
}

/** The summary of each project the viewer consults on, by project ID; null for anyone who is not a consultant on any. */
export function consultantProjectSummaries(state: AppData, viewer: Viewer): Record<string, ConsultantProjectSummary> | null {
  const out: Record<string, ConsultantProjectSummary> = {}
  for (const p of projectsOfUser(state, viewer.userId)) {
    if (projectSide(state, viewer.userId, p.id) !== 'consultant') continue
    const rows = goalRows(state, viewer, p.id) ?? []
    const status = sustainabilityOf(state, p.id).statement?.status ?? null
    const req = requirementsRollup(state, p)
    const base = `/app/projects/${p.id}`
    out[p.id] = {
      content: line(CONSULTANT_GOAL_LABELS.content, rows.find((r) => r.id === 'content_by_value')),
      carbon: line(CONSULTANT_GOAL_LABELS.carbon, rows.find((r) => r.id === 'avoided_carbon')),
      statement: { status, label: statementStatusText('consultant', status), tone: STATEMENT_TONE[status ?? 'draft'], href: `${base}/statement` },
      requirements: { total: req.total, ready: req.ready, atRisk: req.atRisk, text: requirementsText(req.ready, req.total), href: `${base}/requirements` },
    }
  }
  return Object.keys(out).length > 0 ? out : null
}
