// The donor building owner's dashboard: the owner's own buildings drawn from their surveys, items by typology,
// what is listed, and requests awaiting a decision. Built on ownerHome; buyers stay blind through requestRows.
import type { Typology } from '../../domain/v1types'
import { buildingSketch, projectSketch, type BuildingSketch } from '../../domain/sketch'
import { formatDate } from '../../domain/dates'
import type { AppData, Viewer } from '../types'
import { projectWishlist } from '../lots'
import { itemsOf, ownerHome, priorityFor, type BuildingCard, type OwnerHome, type OwnerProjectRow } from './owner'
import { buildingRequirementsRollup, type BuildingRequirementsRollup } from './buildingRequirements'
import { shortlistRows } from './shortlist'
import { activitySummary, awaitingState, typologyCounts, type ActivitySummary, type MetricTone, type ThumbMaterial, type TileState } from './dashboard'

export type OwnerBuildingCard = BuildingCard & { kindLabel: 'Donor building'; sketch: BuildingSketch; byTypology: Record<Typology, number>; programmeText: string; requirements: BuildingRequirementsRollup | null }

/** One of the owner's New projects, drawn going up from its live shortlist's public cards, with its site start. */
export type OwnerProjectCard = OwnerProjectRow & { kindLabel: 'New project'; sketch: BuildingSketch; programmeText: string }

export type OwnerDashboard = OwnerHome & {
  metrics: {
    byTypology: Record<Typology, number>
    listed: number
    /**
     * The Items surveyed tile's line: 'Across 2 donor buildings. 6 offered: 1 published, 5 shared, 0 reserved'.
     * Offered counts published and shared lots, so shared lots are not read as on the marketplace.
     */
    itemsSub: string
    /** Items kept private across the donor buildings, for the visibility chart beside published and shared. */
    privateCount: number
    /** Reservation requests and building confirmations waiting on the owner, together. */
    awaiting: number
    requestTone: MetricTone
    requestState: TileState | null
    /**
     * What the donor buildings could fetch, less the cost of careful removal, if recovered as each recovery plan ranks
     * (the Recovery plan's own figure, summed). Indicative.
     */
    recoverableValue: number
    /** Items the recovery plans say are worth recovering, and all items. */
    recoverCount: number
  }
  buildingCards: OwnerBuildingCard[]
  newProjectCards: OwnerProjectCard[]
  /** The owner's own item behind each request on the home, by request ID. */
  requestThumbs: Record<string, ThumbMaterial>
  activitySummary: ActivitySummary
}

/** The owner's dashboard; null for anyone who is not an asset owner. */
export function ownerDashboard(state: AppData, viewer: Viewer): OwnerDashboard | null {
  const home = ownerHome(state, viewer)
  if (!home) return null
  const byTypology: Record<Typology, number> = { structure: 0, envelope: 0, finishes: 0 }
  const buildingCards = home.buildings.map((c) => {
    const b = state.world.buildings[c.id]
    const families = itemsOf(state, c.id).map((i) => i.family)
    const counts = typologyCounts(families)
    for (const t of Object.keys(counts) as Typology[]) byTypology[t] += counts[t]
    const start = b?.programme.dismantlingStart ?? null
    return {
      ...c,
      kindLabel: 'Donor building' as const,
      sketch: buildingSketch({ id: c.id, storeys: b?.storeys ?? null, structureType: b?.structureType ?? '', structure: b?.structure ?? [] }, families),
      byTypology: counts,
      programmeText: start ? `Dismantling starts ${formatDate(start)}` : 'Programme not set',
      requirements: b ? buildingRequirementsRollup(state, b) : null,
    }
  })
  const newProjectCards: OwnerProjectCard[] = home.newProjects.map((row) => {
    const p = state.world.projects[row.id]
    const list = projectWishlist(state.world, p.id)
    // Families from the live shortlist's public cards only (P3).
    const families = (list ? shortlistRows(state, viewer, list, p) : []).flatMap((r) => (r.card && r.status !== 'declined' ? [r.card.family] : []))
    return { ...row, kindLabel: 'New project' as const, sketch: projectSketch(p, families), programmeText: `Site start ${formatDate(p.programme.siteStart)}` }
  })
  const requestThumbs: Record<string, ThumbMaterial> = {}
  for (const r of home.requests) {
    const item = state.world.items[r.itemId]
    if (item) requestThumbs[r.id] = { publicId: r.publicId, spec: item.spec, title: r.title }
  }
  const awaiting = home.stats.requestsAwaiting + home.stats.claimsAwaiting
  let recoverableValue = 0
  let recoverCount = 0
  for (const c of home.buildings) {
    const plan = priorityFor(state, c.id)
    recoverableValue += plan.recoverableNetValue
    recoverCount += plan.rows.filter((r) => r.route === 'recover').length
  }
  return {
    ...home,
    metrics: {
      byTypology,
      listed: home.stats.listed + home.stats.shared,
      itemsSub: `Across ${home.stats.donorBuildings} ${home.stats.donorBuildings === 1 ? 'donor building' : 'donor buildings'}. ${home.stats.listed + home.stats.shared} offered: ${home.stats.listed} published, ${home.stats.shared} shared, ${home.stats.reserved} reserved`,
      privateCount: home.buildings.reduce((n, c) => n + c.counts.private, 0),
      awaiting,
      requestTone: awaiting > 0 ? 'warning' : 'neutral',
      requestState: awaitingState(awaiting),
      recoverableValue,
      recoverCount,
    },
    buildingCards,
    newProjectCards,
    requestThumbs,
    activitySummary: activitySummary(home.activity),
  }
}
