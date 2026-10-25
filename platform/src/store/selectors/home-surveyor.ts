// The site surveyor's dashboard: appointments by client, each building drawn from its survey, surveys by status
// and the last capture. Built on surveyorHome; it reads only the buildings the surveyor is appointed to.
import type { Typology } from '../../domain/v1types'
import { buildingSketch, type BuildingSketch } from '../../domain/sketch'
import { formatDate } from '../../domain/dates'
import type { AppData, SurveyStatus, Viewer } from '../types'
import { itemsOf } from './owner'
import { surveyorHome, type SurveyorHome } from './surveyor'
import { contractorOnly } from './nav'
import { activitySummary, typologyCounts, type ActivitySummary, type MetricTone, type TileState } from './dashboard'
import { buildingRequirementsRollup, type BuildingRequirementsRollup } from './buildingRequirements'
import { buildingSide } from '../access'

export type SurveyorDashboard = SurveyorHome & {
  /**
   * byStatus and open count the appointed buildings. The last capture also reads the firm's buildings no owner has
   * confirmed yet, and the sub-lines say what those add: their items and their surveys, which stay open until linked.
   */
  metrics: { byStatus: Record<SurveyStatus, number>; lastCaptureText: string | null; openTone: MetricTone; open: number; openState: TileState | null; itemsSubText: string; openSubText: string }
  /** By building ID. requirements is null where the firm only dates availability as contractor. */
  extras: Record<string, { sketch: BuildingSketch; byTypology: Record<Typology, number>; requirements: BuildingRequirementsRollup | null }>
  /** The same, by building ID, for the firm's own buildings no owner has confirmed yet. */
  unlinkedExtras: Record<string, { sketch: BuildingSketch; byTypology: Record<Typology, number>; requirements: BuildingRequirementsRollup | null }>
  activitySummary: ActivitySummary
  /**
   * For a firm that only dates buildings as their deconstruction contractor (it surveys none and added none): the
   * home shows the buildings to date and the dates set, not capture and survey counts. Null for every other firm.
   */
  contractorTiles: { buildings: number; dated: number; items: number; undated: number; undatedState: TileState | null; buildingsSubText: string; datedSubText: string; undatedSubText: string } | null
  /** A firm with no buildings at all, appointed or its own: the home leads with the first steps instead of zero tiles. */
  firstRun: boolean
}

/** The surveyor's dashboard; null for anyone who is not a site surveyor. */
export function surveyorDashboard(state: AppData, viewer: Viewer): SurveyorDashboard | null {
  const home = surveyorHome(state, viewer)
  if (!home) return null
  const byStatus: Record<SurveyStatus, number> = { not_started: 0, in_progress: 0, submitted: 0 }
  // Requirement tracking for the buildings the firm surveys; a contractor alone does not track them.
  const rollup = (id: string): BuildingRequirementsRollup | null => {
    const b = state.world.buildings[id]
    return b && buildingSide(state, viewer.userId, id) === 'surveyor' ? buildingRequirementsRollup(state, b) : null
  }
  const extras: SurveyorDashboard['extras'] = {}
  let last: string | null = null
  for (const g of home.appointments) {
    for (const row of g.buildings) {
      byStatus[row.status] += 1
      if (row.lastCaptureOn && (last === null || row.lastCaptureOn > last)) last = row.lastCaptureOn
      const b = state.world.buildings[row.id]
      const families = itemsOf(state, row.id).map((i) => i.family)
      extras[row.id] = { sketch: buildingSketch({ id: row.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '', structure: b?.structure ?? [] }, families), byTypology: typologyCounts(families), requirements: rollup(row.id) }
    }
  }
  // The firm's own buildings no owner has confirmed yet are drawn too; they do not count as appointments.
  const unlinkedExtras: SurveyorDashboard['unlinkedExtras'] = {}
  for (const row of home.unlinked) {
    if (row.lastCaptureOn && (last === null || row.lastCaptureOn > last)) last = row.lastCaptureOn
    const b = state.world.buildings[row.id]
    const families = itemsOf(state, row.id).map((i) => i.family)
    unlinkedExtras[row.id] = { sketch: buildingSketch({ id: row.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '', structure: b?.structure ?? [] }, families), byTypology: typologyCounts(families), requirements: rollup(row.id) }
  }
  // A building no owner has confirmed cannot be submitted yet, so its survey is always open; it is told apart.
  const unlinkedOpen = home.unlinked.length
  const open = byStatus.not_started + byStatus.in_progress
  const lastCaptureText = last ? formatDate(last.slice(0, 10)) : null
  const unlinkedItems = home.stats.unlinkedItems
  const notLinked = (n: number) => (n === 1 ? 'a building not yet linked' : 'buildings not yet linked')
  const itemsSubText = !lastCaptureText ? 'Nothing captured yet' : unlinkedItems > 0 ? `Last on ${lastCaptureText}, including ${unlinkedItems} at ${notLinked(home.unlinked.length)}` : `Last on ${lastCaptureText}`
  const appointed = byStatus.not_started + byStatus.in_progress + byStatus.submitted
  // 'Every survey submitted' only when there are surveys to have submitted.
  const openSubText = unlinkedOpen > 0 ? `Plus ${unlinkedOpen} at ${notLinked(unlinkedOpen)}` : open > 0 ? 'Not yet submitted to the owner' : appointed > 0 ? 'Every survey submitted' : 'No surveys yet'
  let contractorTiles: SurveyorDashboard['contractorTiles'] = null
  if (contractorOnly(state, viewer)) {
    const rows = home.appointments.flatMap((g) => g.buildings).filter((b) => b.setsDates)
    const dated = rows.reduce((n, b) => n + b.datedCount, 0)
    const items = rows.reduce((n, b) => n + b.itemCount, 0)
    const waiting = rows.filter((b) => b.datedCount < b.itemCount).length
    contractorTiles = {
      buildings: rows.length,
      dated,
      items,
      undated: items - dated,
      undatedState: items - dated > 0 ? { state: 'warning', label: 'To do' } : null,
      undatedSubText: items - dated === 0 ? 'Nothing waiting on you' : 'Items with no expected date yet',
      buildingsSubText: waiting === 0 ? 'Every building dated' : `${waiting} ${waiting === 1 ? 'building' : 'buildings'} with items still to date`,
      datedSubText: items === 0 ? 'No items recorded yet' : `Of ${items} ${items === 1 ? 'item' : 'items'}. The owner decides what buyers see`,
    }
  }
  return {
    ...home,
    contractorTiles,
    metrics: { byStatus, lastCaptureText, openTone: open > 0 ? 'warning' : 'neutral', open, openState: open > 0 ? { state: 'warning', label: 'In progress' } : null, itemsSubText, openSubText },
    extras,
    unlinkedExtras,
    activitySummary: activitySummary(home.activity),
    firstRun: appointed === 0 && home.unlinked.length === 0,
  }
}

// ---------- Survey steps ----------

/** 'waiting': a step another party has to take, asked for and not answered yet (the owner's confirmation). */
export type SurveyStepState = 'done' | 'current' | 'waiting' | 'todo'
export type SurveyStep = { key: 'appointed' | 'added' | 'owner' | 'in_progress' | 'submitted'; label: string; state: SurveyStepState }

const APPOINTED_ORDER = { not_started: 0, in_progress: 1, submitted: 2 } as const

/**
 * The steps of a survey on the surveyor home, with exactly one current step at most: the firm's own next step.
 * An appointed building reads Appointed, Capturing, Submitted. A building the firm added itself reads Added, then the
 * owner's confirmation, then Capturing and Submitted: capturing can start meanwhile and is the current step until the
 * survey is submitted, while the owner's confirmation reads 'waiting' as long as the request is open (and 'todo'
 * before one is sent or after a decline). Submitting waits for the link, so it is never done here.
 */
export function surveySteps(status: SurveyStatus, claimStatus: 'linked' | 'not_linked' | 'pending' | 'declined' | null): SurveyStep[] {
  if (claimStatus === null || claimStatus === 'linked') {
    const order = APPOINTED_ORDER[status]
    const state = (at: number): SurveyStepState => (at < order || (at === order && status === 'submitted') ? 'done' : at === order ? 'current' : 'todo')
    return [
      { key: 'appointed', label: 'Appointed', state: state(0) },
      { key: 'in_progress', label: 'Capturing', state: state(1) },
      { key: 'submitted', label: 'Submitted', state: state(2) },
    ]
  }
  return [
    { key: 'added', label: 'Added', state: 'done' },
    { key: 'owner', label: 'Owner confirms', state: claimStatus === 'pending' ? 'waiting' : 'todo' },
    { key: 'in_progress', label: 'Capturing', state: status === 'submitted' ? 'done' : 'current' },
    { key: 'submitted', label: 'Submitted', state: 'todo' },
  ]
}
