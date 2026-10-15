// A project's sustainability record, read defensively (an older record may lack it), and the few facts every reader
// shares: the requirements that apply, each goal's effective target, whether a scheme is targeted, and the project's
// reclaimed materials as the certification mapping sees them. Items come from the public listing only (P3).
import type { Project, World } from '../domain/types'
import type { GoalId, ProjectSustainability } from '../domain/sustainabilityTypes'
import { requirementById, suggestedRequirementIds, type PlanningRequirement } from '../domain/reference/requirements'
import { goalDef } from '../domain/reference/goals'
import { schemeDef, type SchemeId } from '../domain/reference/certification'
import { defaultTarget, effectiveTarget, type GoalTarget } from '../domain/engines/goals'
import type { MappedItem } from '../domain/engines/certification'
import type { AppData } from './types'
import { listingOf, lotByPublicId, projectWishlist } from './lots'

export const EMPTY_SUSTAINABILITY: ProjectSustainability = { goals: {}, actuals: {}, requirements: {}, credits: {}, statement: null }

export function sustainabilityOf(state: AppData, projectId: string): ProjectSustainability {
  const r = state.sustainability?.[projectId]
  if (!r) return EMPTY_SUSTAINABILITY
  return { goals: r.goals ?? {}, actuals: r.actuals ?? {}, requirements: r.requirements ?? {}, credits: r.credits ?? {}, statement: r.statement ?? null }
}

/** The state with the project's record changed by fn; the same state when fn changes nothing. */
export function withSustainability(state: AppData, projectId: string, fn: (r: ProjectSustainability) => ProjectSustainability): AppData {
  const before = sustainabilityOf(state, projectId)
  const after = fn(before)
  if (after === before) return state
  return { ...state, sustainability: { ...(state.sustainability ?? {}), [projectId]: after } }
}

/** The one reader of the requirements dataset for a project: the architect's choice, else the suggested ones while they have not chosen. Unknown ids are dropped. */
export function applicableRequirements(project: Project): PlanningRequirement[] {
  const chosen = project.planningRequirementIds ?? []
  const ids = chosen.length > 0 || project.requirementsReviewed ? chosen : suggestedRequirementIds(project.region, project.localAuthority)
  return ids.map((id) => requirementById(id, project.region, project.localAuthority)).filter((r): r is PlanningRequirement => r !== null)
}

/** A goal's default from the requirements, with the consultant's override applied. */
export function goalTargets(state: AppData, project: Project, goalId: GoalId): { dflt: GoalTarget; target: GoalTarget } {
  const dflt = defaultTarget(goalDef(goalId), { requirementIds: applicableRequirements(project).map((r) => r.id), projectType: project.projectType })
  return { dflt, target: effectiveTarget(dflt, sustainabilityOf(state, project.id).goals[goalId]) }
}

/** A rating scheme is targeted while its rating goal is; circular economy while content by value is targeted or Policy SI 7 applies. */
export function schemeTargeted(state: AppData, project: Project, scheme: SchemeId): boolean {
  const def = schemeDef(scheme)
  if (def.ratingGoal) return goalTargets(state, project, def.ratingGoal).target.value !== null
  if (goalTargets(state, project, 'content_by_value').target.value !== null) return true
  return applicableRequirements(project).some((r) => r.id === 'lp-si7')
}

function approvedIds(world: World, project: Project): string[] {
  return (projectWishlist(world, project.id)?.items ?? []).filter((i) => i.status === 'approved').map((i) => i.publicId)
}

/** True when the public ID is one of the project's earlier deals or an approved item on its shortlist. */
export function isProjectMaterial(world: World, project: Project, publicId: string): boolean {
  return project.seededDeals.some((d) => d.publicId === publicId) || approvedIds(world, project).includes(publicId)
}

/** The project's reclaimed materials for the certification mapping: earlier deals, reserved and approved, from the public listing. */
export function mappedItems(state: AppData, project: Project): MappedItem[] {
  const out: MappedItem[] = []
  const seen = new Set<string>()
  const add = (publicId: string, fallback: { description: string; family: MappedItem['family'] }, status: MappedItem['status']) => {
    if (seen.has(publicId)) return
    seen.add(publicId)
    const lot = lotByPublicId(state.world, publicId)
    const l = lot ? listingOf(state.world, lot) : null
    out.push({ publicId, description: l?.title ?? fallback.description, family: l?.family ?? fallback.family, status, eraBand: l?.eraBand ?? null, testStatus: l?.testStatus ?? null })
  }
  for (const d of project.seededDeals) add(d.publicId, { description: d.description, family: d.family }, 'Confirmed')
  const accepted = new Set(Object.values(state.reservations).filter((r) => r.projectId === project.id && r.status === 'accepted').map((r) => r.publicId))
  for (const r of Object.values(state.reservations)) {
    if (r.projectId !== project.id || r.status !== 'accepted') continue
    const lot = state.world.lots[r.lotId]
    if (lot) add(r.publicId, { description: listingOf(state.world, lot).title, family: listingOf(state.world, lot).family }, 'Reserved')
  }
  for (const publicId of approvedIds(state.world, project)) {
    if (accepted.has(publicId)) continue
    const lot = lotByPublicId(state.world, publicId)
    if (lot) add(publicId, { description: listingOf(state.world, lot).title, family: listingOf(state.world, lot).family }, 'Approved')
  }
  return out
}

/** The one source of a project's numeric targets for every dashboard: 0 when a goal is not targeted. */
export function effectiveTargets(state: AppData, projectId: string): { contentByValue: number; avoidedCarbonT: number } {
  const p = state.world.projects[projectId]
  if (!p) return { contentByValue: 0, avoidedCarbonT: 0 }
  const num = (goalId: GoalId) => {
    const v = goalTargets(state, p, goalId).target.value
    return typeof v === 'number' ? v : 0
  }
  return { contentByValue: num('content_by_value'), avoidedCarbonT: num('avoided_carbon') }
}

/** For the project tabs: whether the statement waits for the client's review, and how many requirements are at risk. */
export function sustainabilityBadges(state: AppData, project: Project): { statementForReview: boolean; requirementsAtRisk: number } {
  const r = sustainabilityOf(state, project.id)
  return { statementForReview: r.statement?.status === 'ready_for_review', requirementsAtRisk: applicableRequirements(project).filter((q) => r.requirements[q.id]?.status === 'at_risk').length }
}
