// Resolve a building, project or engagement from the route, behind the access check (brief/09-V1-PRODUCT.md sections 4 and 13.13).
// A record is returned only when the persona may open it; an unknown ID and a forbidden one look the same.
import { useParams } from 'react-router'
import { useStore } from '../store/store'
import { canAccess, type AccessTarget } from '../domain/access'
import type { Project, SourceBuilding, WasteEngagement, World } from '../domain/types'

export { NotAvailable } from '../components/shell/NotAvailable'

export type Resolved<T> = { id: string; record: T | null; allowed: boolean }

/** The pure part of the hooks: check access first, then look the record up. */
export function resolveParam<T>(world: World, personaId: string, id: string | undefined, target: (id: string) => AccessTarget, pick: (world: World, id: string) => T | undefined): Resolved<T> {
  if (!id) return { id: '', record: null, allowed: false }
  const allowed = canAccess(world, personaId, target(id))
  return { id, record: allowed ? (pick(world, id) ?? null) : null, allowed }
}

export function useProjectParam(): Resolved<Project> {
  const { projectId } = useParams()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  return resolveParam(world, personaId, projectId, (id) => ({ projectId: id }), (w, id) => w.projects[id])
}

export function useBuildingParam(): Resolved<SourceBuilding> {
  const { buildingId } = useParams()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  return resolveParam(world, personaId, buildingId, (id) => ({ buildingId: id }), (w, id) => w.buildings[id])
}

export function useEngagementParam(): Resolved<WasteEngagement> {
  const { engagementId } = useParams()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  return resolveParam(world, personaId, engagementId, (id) => ({ engagementId: id }), (w, id) => w.engagements[id])
}
