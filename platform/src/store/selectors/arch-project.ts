// The project's own fields for the architect's edit form; null for anyone who cannot edit it.
import type { ProjectType } from '../../domain/v1types'
import type { AppData, Viewer } from '../types'
import { isProjectArchitect } from '../access'

export type ProjectFields = { name: string; projectType: ProjectType; ribaStage: number; startDate: string; region: string; localAuthority: string; description: string }

export function projectFields(state: AppData, viewer: Viewer, projectId: string): ProjectFields | null {
  if (!isProjectArchitect(state, viewer.userId, projectId)) return null
  const p = state.world.projects[projectId]
  return { name: p.name, projectType: p.projectType, ribaStage: p.ribaStage, startDate: p.startDate, region: p.region, localAuthority: p.localAuthority, description: p.description }
}
