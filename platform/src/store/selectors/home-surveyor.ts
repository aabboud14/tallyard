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
  /**
   * byStatus and open count the appointed buildings. The last capture also reads the firm's buildings no owner has
   * confirmed yet, and the sub-lines say what those add: their items and their surveys, which stay open until linked.
   */
  metrics: { byStatus: Record<SurveyStatus, number>; lastCaptureText: string | null; openTone: MetricTone; open: number; openState: TileState | null; itemsSubText: string; openSubText: string }
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
    if (row.lastCaptureOn && (last === null || row.lastCaptureOn > last)) last = row.lastCaptureOn
    const b = state.world.buildings[row.id]
    const families = itemsOf(state, row.id).map((i) => i.family)
    unlinkedExtras[row.id] = { sketch: buildingSketch({ id: row.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '', structure: b?.structure ?? [] }, families), byTypology: typologyCounts(families) }
  }
  // A building no owner has confirmed cannot be submitted yet, so its survey is always open; it is told apart.
  const unlinkedOpen = home.unlinked.length
  const open = byStatus.not_started + byStatus.in_progress
  const lastCaptureText = last ? formatDate(last.slice(0, 10)) : null
  const unlinkedItems = home.stats.unlinkedItems
  const notLinked = (n: number) => (n === 1 ? 'a building not yet linked' : 'buildings not yet linked')
  const itemsSubText = !lastCaptureText ? 'Nothing captured yet' : unlinkedItems > 0 ? `Last on ${lastCaptureText}, including ${unlinkedItems} at ${notLinked(home.unlinked.length)}` : `Last on ${lastCaptureText}`
  const openSubText = unlinkedOpen > 0 ? `Plus ${unlinkedOpen} at ${notLinked(unlinkedOpen)}` : open > 0 ? 'Not yet submitted to the owner' : 'Every survey submitted'
  return {
    ...home,
    metrics: { byStatus, lastCaptureText, openTone: open > 0 ? 'warning' : 'neutral', open, openState: open > 0 ? { state: 'warning', label: 'In progress' } : null, itemsSubText, openSubText },
    extras,
    unlinkedExtras,
    activitySummary: activitySummary(home.activity),
  }
}
