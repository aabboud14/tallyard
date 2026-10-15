// The client's home as a dashboard (client-consultant design, section 5.4): indicative cost, saving against new,
// avoided carbon secured and reuse by value across the client's projects; a derived to-do list; the programme across
// projects; sustainability tracking; and the project cards. Every figure is indicative and comes from the package
// engine, the public listings and the project's own records.
import type { FamilyId } from '../../domain/types'
import type { Typology } from '../../domain/v1types'
import { byStage, financeTotals, portfolioContent, seededDealLine, type FinanceLine, type FinanceStage } from '../../domain/engines/finance'
import { goalProgress, sumTargets, type GoalProgress } from '../../domain/engines/goals'
import { APPROVAL_DUE_DAYS, dueAfter, rankTodos, REVIEW_DUE_DAYS, type RankedTodo, type Todo } from '../../domain/engines/tracker'
import { goalDef } from '../../domain/reference/goals'
import { typologyOf } from '../../domain/engines/typology'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import * as f from '../../domain/format'
import type { AppData, Viewer } from '../types'
import { isProjectClient, projectsOfUser, roleOfUser } from '../access'
import { applicableRequirements, sustainabilityOf } from '../sustainabilityRecord'
import { todayOf, type ActivityRow } from './common'
import { approvalsView, clientHome, reservationGroup, reservationsView, type ClientHome } from './client'
import { projectMetrics, type ProjectMetrics } from './consultant'
import { goalRows, sustainabilityTracking, type TrackingRow } from './sustainability'
import { programmeOf, type ClientProgramme } from './portfolio'

type ProjectContent = ProjectMetrics['secured']

/** A material for a project card's thumbnail, from the public listing. */
export type ThumbMaterial = { publicId: string; family: FamilyId; typology: Typology }

export type ClientDashboard = {
  greeting: string
  dateText: string
  metrics: {
    cost: { total: number; count: number; projects: number; byStage: { key: FinanceStage; label: string; total: number }[] }
    saving: { amount: number; percent: number; costNew: number; text: string; negative: boolean }
    carbon: { securedT: number; approvedT: number; targetT: number; progress: GoalProgress }
    reuse: { reuse: number | null; content: number | null; aim: number; progress: GoalProgress }
  }
  todos: RankedTodo[]
  programme: ClientProgramme
  tracking: TrackingRow[]
  projects: (ClientHome['projects'][number] & { costText: string | null; thumbs: ThumbMaterial[] })[]
  reservations: ClientHome['reservations']
  activity: ActivityRow[]
}

const STAGE_LABELS: { key: FinanceStage; label: string }[] = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'requested', label: 'With the seller' },
  { key: 'to_request', label: 'Approved' },
]

export function clientDashboard(state: AppData, viewer: Viewer): ClientDashboard | null {
  if (roleOfUser(state, viewer.userId) !== 'client') return null
  const home = clientHome(state, viewer)!
  const today = todayOf(viewer)
  const projects = projectsOfUser(state, viewer.userId).filter((p) => isProjectClient(state, viewer.userId, p.id))
  const lines: FinanceLine[] = []
  const linesByProject: Record<string, FinanceLine[]> = {}
  const todos: Todo[] = []
  const thumbs: Record<string, ThumbMaterial[]> = {}
  let securedT = 0
  let approvedT = 0
  const carbonRows: { actual: number | null; target: number | null }[] = []
  const contents: ProjectContent[] = []
  for (const p of projects) {
    const own: FinanceLine[] = p.seededDeals.map(seededDealLine)
    const res = reservationsView(state, viewer, p.id)!
    for (const r of res.rows) {
      const g = reservationGroup(r)
      if (g) own.push({ key: r.publicId, stage: g, total: r.estimate.total, costNew: r.estimate.costNew, avoidedT: r.card.avoidedT, massT: r.card.massT })
      if (r.canRequest) {
        const declined = r.reservation?.status === 'declined'
        const withdrawn = r.reservation?.status === 'withdrawn'
        if (declined || withdrawn)
          todos.push({ id: `request_again-${p.id}-${r.publicId}`, kind: 'request_again', title: `Choose again for ${r.title}`, detail: `${p.name}. ${declined ? 'The seller declined' : 'You withdrew the request'}`, projectId: p.id, projectName: p.name, href: `/app/projects/${p.id}/reservations`, since: r.reservation?.decidedAt ?? r.reservation?.requestedAt ?? null, due: null })
        else
          todos.push({ id: `reserve-${p.id}-${r.publicId}`, kind: 'reserve', title: `Request a reservation for ${r.title}`, detail: `${p.name}. Approved`, projectId: p.id, projectName: p.name, href: `/app/projects/${p.id}/reservations`, since: approvalsView(state, viewer, p.id)!.history.find((h) => h.publicId === r.publicId)?.decidedOn ?? null, due: null })
      }
    }
    const appr = approvalsView(state, viewer, p.id)!
    for (const w of appr.waiting) {
      todos.push({ id: `approve-${p.id}-${w.publicId}`, kind: 'approve', title: `Approve or decline ${w.title}`, detail: `${p.name}. Sent by ${appr.architectName}`, projectId: p.id, projectName: p.name, href: `/app/projects/${p.id}/approvals`, since: w.sentOn, due: w.sentOn ? dueAfter(w.sentOn, APPROVAL_DUE_DAYS) : null })
    }
    const record = sustainabilityOf(state, p.id)
    if (record.statement?.status === 'ready_for_review') {
      const consultant = state.world.orgs[p.consultantOrgId]?.name ?? 'the consultant'
      const sentAt = record.statement.sentAt
      todos.push({ id: `review_statement-${p.id}`, kind: 'review_statement', title: 'Review the circular economy statement', detail: `${p.name}. Sent by ${consultant}`, projectId: p.id, projectName: p.name, href: `/app/projects/${p.id}/sustainability#statement`, since: sentAt, due: sentAt ? dueAfter(sentAt, REVIEW_DUE_DAYS) : null })
    }
    for (const r of applicableRequirements(p)) {
      const t = record.requirements[r.id]
      if (t?.status !== 'at_risk') continue
      const by = t.updatedByUserId ? (state.users[t.updatedByUserId]?.name ?? 'someone who has left') : 'the team'
      todos.push({ id: `requirement_at_risk-${p.id}-${r.id}`, kind: 'requirement_at_risk', title: `Check ${r.title}: at risk`, detail: `${p.name}. Marked by ${by}`, projectId: p.id, projectName: p.name, href: `/app/projects/${p.id}/requirements`, since: t.updatedAt, due: null })
    }
    lines.push(...own)
    linesByProject[p.id] = own
    const m = projectMetrics(state, viewer, p.id)!
    securedT += m.avoidedSecuredT
    approvedT += m.avoidedApprovedT
    contents.push(m.secured)
    const goal = goalRows(state, viewer, p.id)!.find((g) => g.id === 'avoided_carbon')!
    carbonRows.push({ actual: typeof goal.actual === 'number' ? goal.actual : null, target: typeof goal.target === 'number' ? goal.target : null })
    thumbs[p.id] = m.items.map((i) => ({ publicId: i.publicId, family: i.family, typology: typologyOf(i.family) }))
  }
  const totals = financeTotals(lines)
  const stages = byStage(lines)
  const target = sumTargets(carbonRows)
  const content = portfolioContent(contents)
  const contentDef = goalDef('content_by_value')
  return {
    greeting: home.greeting,
    dateText: home.dateText,
    metrics: {
      cost: { total: totals.total, count: totals.count, projects: Object.values(linesByProject).filter((x) => x.length > 0).length, byStage: STAGE_LABELS.map((s) => ({ key: s.key, label: s.label, total: stages[s.key].total })) },
      saving: { amount: totals.saving, percent: totals.savingPercent, costNew: totals.costNew, text: totals.saving < 0 ? 'Costs more than buying new' : `${f.percent(totals.savingPercent)} less than buying new`, negative: totals.saving < 0 },
      carbon: { securedT, approvedT, targetT: target.target, progress: goalProgress(goalDef('avoided_carbon'), target.target > 0 ? target.target : null, target.actual) },
      reuse: { reuse: content ? content.reuse : null, content: content ? content.percent : null, aim: A.contentAim, progress: goalProgress(contentDef, A.contentAim, content ? content.percent : null) },
    },
    todos: rankTodos(todos, today),
    programme: programmeOf(projects, today),
    tracking: projects.map((p) => sustainabilityTracking(state, viewer, p.id)!),
    projects: home.projects.map((card) => {
      const own = linesByProject[card.id] ?? []
      return { ...card, costText: own.length > 0 ? f.moneyWhole(financeTotals(own).total) : null, thumbs: thumbs[card.id] ?? [] }
    }),
    reservations: home.reservations,
    activity: home.activity,
  }
}
