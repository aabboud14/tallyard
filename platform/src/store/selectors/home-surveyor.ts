// The site surveyor's dashboard: appointments by client, each building drawn from its survey, surveys by status
// and the last capture. Built on surveyorHome; it reads only the buildings the surveyor is appointed to.
import type { Typology } from '../../domain/v1types'
import { buildingSketch, type BuildingSketch } from '../../domain/sketch'
import { formatDate } from '../../domain/dates'
import type { AppData, SurveyStatus, Viewer } from '../types'
import { itemsOf } from './owner'
import { surveyorHome, type SurveyorHome } from './surveyor'
import { activitySummary, typologyCounts, type ActivitySummary, type MetricTone } from './dashboard'

export type SurveyorDashboard = SurveyorHome & {
  metrics: { byStatus: Record<SurveyStatus, number>; lastCaptureText: string | null; openTone: MetricTone }
  /** By building ID. */
  extras: Record<string, { sketch: BuildingSketch; byTypology: Record<Typology, number> }>
  activitySummary: ActivitySummary
}

/** The surveyor's dashboard; null for anyone who is not a site surveyor. */
export function surveyorDashboard(state: AppData, viewer: Viewer): SurveyorDashboard | null {
  const home = surveyorHome(state, viewer)
  if (!home) return null
  const byStatus: Record<SurveyStatus, number> = { not_started: 0, in_progress: 0, submitted: 0 }
  const extras: SurveyorDashboard['extras'] = {}
  let last: string | null = null
  for (const g of home.appointments) {
    for (const row of g.buildings) {
      byStatus[row.status] += 1
      if (row.lastCaptureOn && (last === null || row.lastCaptureOn > last)) last = row.lastCaptureOn
      const b = state.world.buildings[row.id]
      const families = itemsOf(state, row.id).map((i) => i.family)
      extras[row.id] = { sketch: buildingSketch({ id: row.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '' }, families), byTypology: typologyCounts(families) }
    }
  }
  const open = byStatus.not_started + byStatus.in_progress
  return {
    ...home,
    metrics: { byStatus, lastCaptureText: last ? formatDate(last.slice(0, 10)) : null, openTone: open > 0 ? 'warning' : 'neutral' },
    extras,
    activitySummary: activitySummary(home.activity),
  }
}
