// Who the signed-in person is in the world, and what they may open. Built on src/domain/access.ts.
import type { Org, Persona, Project, SourceBuilding } from '../domain/types'
import { canAccess } from '../domain/access'
import { roleForOrgType } from '../sandbox/accounts'
import type { AppData, PlatformRole, User } from './types'

export const ERRORS = {
  signedOut: 'Sign in to continue.',
  role: 'Your workspace cannot do this.',
  noAccess: 'You do not have access to this.',
  noProject: 'That project could not be found.',
  noBuilding: 'That building could not be found.',
  noItem: 'That item could not be found.',
  noLot: 'This listing is not available.',
} as const

export function userOf(state: AppData, userId: string): User | null {
  return state.users[userId] ?? null
}

export function personaOfUser(state: AppData, userId: string): Persona | null {
  const u = userOf(state, userId)
  return u ? (state.world.personas[u.personaId] ?? null) : null
}

export function orgOfUser(state: AppData, userId: string): Org | null {
  const u = userOf(state, userId)
  return u ? (state.world.orgs[u.orgId] ?? null) : null
}

export function roleOfUser(state: AppData, userId: string): PlatformRole | null {
  const org = orgOfUser(state, userId)
  return org ? roleForOrgType(org.type) : null
}

export function roleOfOrg(state: AppData, orgId: string): PlatformRole | null {
  const org = state.world.orgs[orgId]
  return org ? roleForOrgType(org.type) : null
}

/** The people in an organisation, oldest first. */
export function usersOfOrg(state: AppData, orgId: string): User[] {
  return Object.values(state.users)
    .filter((u) => u.orgId === orgId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.name.localeCompare(b.name, 'en-GB')))
}

function personaOpens(state: AppData, userId: string, target: { projectId: string } | { buildingId: string } | { engagementId: string }): boolean {
  const u = userOf(state, userId)
  if (!u || !state.world.personas[u.personaId]) return false
  return canAccess(state.world, u.personaId, target)
}

export type ProjectSide = 'architect' | 'client' | 'consultant'

/** How the person sits on a project: its architect practice, its client or its consultant; null otherwise. */
export function projectSide(state: AppData, userId: string, projectId: string): ProjectSide | null {
  const p = state.world.projects[projectId]
  const u = userOf(state, userId)
  if (!p || !u || !personaOpens(state, userId, { projectId })) return null
  const role = roleOfUser(state, userId)
  if (role === 'architect' && p.architectOrgId === u.orgId) return 'architect'
  if (role === 'client' && p.clientOrgId === u.orgId) return 'client'
  if (role === 'consultant' && p.consultantOrgId === u.orgId) return 'consultant'
  return null
}

export function isProjectArchitect(state: AppData, userId: string, projectId: string): boolean {
  return projectSide(state, userId, projectId) === 'architect'
}

export function isProjectClient(state: AppData, userId: string, projectId: string): boolean {
  return projectSide(state, userId, projectId) === 'client'
}

export function isProjectConsultant(state: AppData, userId: string, projectId: string): boolean {
  return projectSide(state, userId, projectId) === 'consultant'
}

/** The projects the person works on, in their own role, in seed order. */
export function projectsOfUser(state: AppData, userId: string): Project[] {
  return Object.values(state.world.projects).filter((p) => projectSide(state, userId, p.id) !== null)
}

export type BuildingSide = 'owner' | 'surveyor'

/** How the person sits on a building: its owner or its appointed surveyor; null otherwise. */
export function buildingSide(state: AppData, userId: string, buildingId: string): BuildingSide | null {
  const b = state.world.buildings[buildingId]
  const u = userOf(state, userId)
  if (!b || !u || !personaOpens(state, userId, { buildingId })) return null
  const role = roleOfUser(state, userId)
  if (role === 'owner' && b.ownerOrgId === u.orgId) return 'owner'
  if (role === 'surveyor' && b.surveyorOrgId === u.orgId) return 'surveyor'
  return null
}

export function isBuildingOwner(state: AppData, userId: string, buildingId: string): boolean {
  return buildingSide(state, userId, buildingId) === 'owner'
}

/** The buildings the person owns or surveys, in seed order. */
export function buildingsOfUser(state: AppData, userId: string): SourceBuilding[] {
  return Object.values(state.world.buildings).filter((b) => buildingSide(state, userId, b.id) !== null)
}

export function canOpenEngagement(state: AppData, userId: string, engagementId: string): boolean {
  return roleOfUser(state, userId) === 'consultant' && personaOpens(state, userId, { engagementId })
}

/** The organisations working on a project: architect, client and consultant, without blanks or repeats. */
export function projectOrgIds(project: Project): string[] {
  return [...new Set([project.architectOrgId, project.clientOrgId, project.consultantOrgId].filter((x) => x))]
}

/** The organisations working on a building: its owner and its surveyor. */
export function buildingOrgIds(building: SourceBuilding): string[] {
  return [...new Set([building.ownerOrgId, building.surveyorOrgId].filter((x): x is string => !!x))]
}
