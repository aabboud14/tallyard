// The site surveyor's dashboard: appointments by client, each building drawn from its survey, surveys by status
// and the last capture. Built on surveyorHome; it reads only the buildings the surveyor is appointed to.
import type { Typology } from '../../domain/v1types'
import { buildingSketch, type BuildingSketch } from '../../domain/sketch'
import { formatDate } from '../../domain/dates'
import type { AppData, SurveyStatus, Viewer } from '../types'
import { itemsOf } from './owner'
import { surveyorHome, type SurveyorHome } from './surveyor'
import { activitySummary, typologyCounts, type ActivitySummary, type MetricTone, type TileState } from './dashboard'

export type SurveyorDashboard = SurveyorHome & {
  metrics: { byStatus: Record<SurveyStatus, number>; lastCaptureText: string | null; openTone: MetricTone; open: number; openState: TileState | null }
  /** By building ID. */
  extras: Record<string, { sketch: BuildingSketch; byTypology: Record<Typology, number> }>
  /** The same, by building ID, for the firm's own buildings no owner has confirmed yet. */
  unlinkedExtras: Record<string, { sketch: BuildingSketch; byTypology: Record<Typology, number> }>
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
      extras[row.id] = { sketch: buildingSketch({ id: row.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '', structure: b?.structure ?? [] }, families), byTypology: typologyCounts(families) }
    }
  }
  // The firm's own buildings no owner has confirmed yet are drawn too; they do not count as appointments.
  const unlinkedExtras: SurveyorDashboard['unlinkedExtras'] = {}
  for (const row of home.unlinked) {
    const b = state.world.buildings[row.id]
    const families = itemsOf(state, row.id).map((i) => i.family)
    unlinkedExtras[row.id] = { sketch: buildingSketch({ id: row.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '', structure: b?.structure ?? [] }, families), byTypology: typologyCounts(families) }
  }
  const open = byStatus.not_started + byStatus.in_progress
  return {
    ...home,
    metrics: { byStatus, lastCaptureText: last ? formatDate(last.slice(0, 10)) : null, openTone: open > 0 ? 'warning' : 'neutral', open, openState: open > 0 ? { state: 'warning', label: 'In progress' } : null },
    extras,
    unlinkedExtras,
    activitySummary: activitySummary(home.activity),
  }
}
