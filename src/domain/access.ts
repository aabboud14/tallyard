// Who may open which private record (brief/09-V1-PRODUCT.md sections 5.2 and 13.13).
// Access follows the persona's organisation: owners and surveyors reach buildings, architects, clients and
// consultants reach projects, consultants and owners reach waste engagements. The operator reaches none.
import type { Org, Persona, Project, SourceBuilding, WasteEngagement, World } from './types'

export type Role = 'surveyor' | 'seller' | 'architect' | 'client' | 'consultant' | 'operator'

export type AccessTarget = { buildingId: string } | { projectId: string } | { engagementId: string }

/** Organisation type in the seed, mapped to the role it plays in version 1.0. */
const ROLE_BY_ORG_TYPE: Record<string, Role> = {
  'Deconstruction contractor': 'surveyor',
  'Asset owner': 'seller',
  Architect: 'architect',
  Developer: 'client',
  'Sustainability consultant': 'consultant',
  Platform: 'operator',
}

function personaOf(world: World, personaId: string): Persona | null {
  return world.personas[personaId] ?? null
}

function orgOf(world: World, personaId: string): Org | null {
  const p = personaOf(world, personaId)
  return p ? (world.orgs[p.orgId] ?? null) : null
}

/** The persona's role, from the type of their organisation. Throws for an unknown persona or organisation type. */
export function roleOf(world: World, personaId: string): Role {
  const org = orgOf(world, personaId)
  if (!org) throw new Error('No persona ' + personaId)
  const role = ROLE_BY_ORG_TYPE[org.type]
  if (!role) throw new Error('No role for organisation type ' + org.type)
  return role
}

/** The organisation whose private records this persona may open, or null for the operator. */
function accessOrgId(world: World, personaId: string): string | null {
  const org = orgOf(world, personaId)
  if (!org || ROLE_BY_ORG_TYPE[org.type] === 'operator') return null
  return org.id
}

/** Buildings the persona's organisation owns or is appointed to survey, in seed order. */
export function buildingsFor(world: World, personaId: string): SourceBuilding[] {
  const orgId = accessOrgId(world, personaId)
  if (!orgId) return []
  return Object.values(world.buildings).filter((b) => b.ownerOrgId === orgId || b.surveyorOrgId === orgId)
}

/** The surveyor's view of buildingsFor: each owning client with its buildings, in seed order. */
export function clientsFor(world: World, personaId: string): { org: Org; buildings: SourceBuilding[] }[] {
  const out: { org: Org; buildings: SourceBuilding[] }[] = []
  for (const b of buildingsFor(world, personaId)) {
    if (!b.ownerOrgId) continue
    const group = out.find((g) => g.org.id === b.ownerOrgId)
    if (group) group.buildings.push(b)
    else out.push({ org: world.orgs[b.ownerOrgId], buildings: [b] })
  }
  return out
}

/** Projects where the persona's organisation is the architect, the client or the consultant, in seed order. */
export function projectsFor(world: World, personaId: string): Project[] {
  const orgId = accessOrgId(world, personaId)
  if (!orgId) return []
  return Object.values(world.projects).filter((p) => p.architectOrgId === orgId || p.clientOrgId === orgId || p.consultantOrgId === orgId)
}

/** Waste engagements where the persona's organisation is the consultant or the building owner. */
export function engagementsFor(world: World, personaId: string): WasteEngagement[] {
  const orgId = accessOrgId(world, personaId)
  if (!orgId) return []
  return Object.values(world.engagements).filter((e) => e.consultantOrgId === orgId || e.ownerOrgId === orgId)
}

/** The check every screen makes before it resolves a building, project or engagement from the URL. */
export function canAccess(world: World, personaId: string, target: AccessTarget): boolean {
  if ('buildingId' in target) return buildingsFor(world, personaId).some((b) => b.id === target.buildingId)
  if ('projectId' in target) return projectsFor(world, personaId).some((p) => p.id === target.projectId)
  return engagementsFor(world, personaId).some((e) => e.id === target.engagementId)
}
