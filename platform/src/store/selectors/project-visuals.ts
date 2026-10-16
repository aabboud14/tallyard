// The drawing for each project the person works on: a building going up, drawn from the families on its live
// shortlist, with up to three material swatches. Built from the shortlist rows' public cards only (P3).
import type { BuildingSketch } from '../../domain/sketch'
import { projectSketch } from '../../domain/sketch'
import type { AppData, Viewer } from '../types'
import { projectSide, projectsOfUser } from '../access'
import { projectWishlist } from '../lots'
import { shortlistRows, type ShortlistRow } from './shortlist'
import { thumbsOf, type ThumbMaterial } from './dashboard'

export type ProjectVisual = { sketch: BuildingSketch; materials: ThumbMaterial[] }

/**
 * The one way a project is drawn, for every role: the families of every live (not declined) row on its shortlist,
 * from the public cards, and up to three swatches. Screens that already hold the rows pass them here.
 */
export function visualFromRows(p: { id: string; name: string; projectType: string }, rows: ShortlistRow[]): ProjectVisual {
  const families = rows.flatMap((r) => (r.card && r.status !== 'declined' ? [r.card.family] : []))
  return { sketch: projectSketch(p, families), materials: thumbsOf(rows) }
}

function visualOf(state: AppData, viewer: Viewer, projectId: string): ProjectVisual {
  const p = state.world.projects[projectId]
  const list = projectWishlist(state.world, projectId)
  return visualFromRows(p, list ? shortlistRows(state, viewer, list, p) : [])
}

/** One project's drawing, for anyone on the project; null for anyone else. */
export function projectVisual(state: AppData, viewer: Viewer, projectId: string): ProjectVisual | null {
  if (!projectSide(state, viewer.userId, projectId)) return null
  return visualOf(state, viewer, projectId)
}

/** Every project's drawing, keyed by project, for the projects list. */
export function projectVisuals(state: AppData, viewer: Viewer): Record<string, ProjectVisual> {
  return Object.fromEntries(projectsOfUser(state, viewer.userId).map((p) => [p.id, visualOf(state, viewer, p.id)]))
}
