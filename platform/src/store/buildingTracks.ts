// A donor building's requirement tracking (review of 16 October 2026): the requirements that apply before demolition
// at its location, from the one dataset, and the status and evidence the owner and the surveyor keep for each.
// Read defensively: a sandbox stored before the tracking existed has no record.
import type { SourceBuilding } from '../domain/types'
import type { RequirementTrack } from '../domain/sustainabilityTypes'
import { donorRequirementsFor, type PlanningRequirement } from '../domain/reference/requirements'
import type { AppData } from './types'

/** The requirements a donor building tracks, in dataset order: national, London, then local. */
export function buildingRequirements(b: Pick<SourceBuilding, 'region' | 'localAuthority'>): PlanningRequirement[] {
  return donorRequirementsFor(b.region, b.localAuthority).flatMap((g) => g.items)
}

/** The building's tracks by requirement ID; {} when it has none. */
export function buildingTracksOf(state: AppData, buildingId: string): Record<string, RequirementTrack> {
  return state.buildingTracks?.[buildingId] ?? {}
}

/** The track for one requirement, or a fresh one that has not started. */
export function buildingTrackOf(state: AppData, buildingId: string, requirementId: string): RequirementTrack {
  return buildingTracksOf(state, buildingId)[requirementId] ?? { requirementId, status: 'not_started', evidence: [], updatedAt: null, updatedByUserId: null }
}

/** The state with one track replaced. */
export function withBuildingTrack(state: AppData, buildingId: string, track: RequirementTrack): AppData {
  const all = state.buildingTracks ?? {}
  return { ...state, buildingTracks: { ...all, [buildingId]: { ...(all[buildingId] ?? {}), [track.requirementId]: track } } }
}
