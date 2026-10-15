// The strings that must never reach the other side (04 section 4). Used by tests and the end-to-end checks.
import type { InventoryItem, Lot, Project, SourceBuilding, World } from '../types'
import { dateFormats } from '../dates'

export function lotPrivateStrings(lot: Lot, item: InventoryItem, building: SourceBuilding, world: World): string[] {
  const out: string[] = []
  const orgName = (id: string | null) => (id ? (world.orgs[id]?.name ?? '') : '')
  const people = (id: string | null) => (id ? Object.values(world.personas).filter((p) => p.orgId === id).map((p) => p.name) : [])
  // Round 2: a building a surveying firm added before its owner confirmed it is just as private.
  if (building.ownerOrgId || building.createdByOrgId) {
    out.push(building.name)
    const street = building.address.replace(/^\d+\s+/, '').split(',')[0]
    if (street) out.push(street)
    out.push(building.postcodeDistrict)
    if (building.locationLevel !== 'local_authority') out.push(building.localAuthority)
    if (building.ownerOrgId) {
      out.push(orgName(building.ownerOrgId))
      out.push(...people(building.ownerOrgId))
    }
    out.push(...building.tenants)
    if (building.surveyedBy) out.push(building.surveyedBy.personaName, building.surveyedBy.orgName)
    if (building.createdByOrgId) out.push(orgName(building.createdByOrgId))
    if (building.contractorOrgId) out.push(orgName(building.contractorOrgId), ...people(building.contractorOrgId))
    const dates = [building.programme.stripOutStart, building.programme.dismantlingStart, building.programme.clearBy]
    for (const d of dates) if (d) out.push(...dateFormats(d))
  }
  out.push(item.tag)
  if (lot.availableFrom) out.push(...dateFormats(lot.availableFrom))
  // Version 1.0: the surveyor's expected date is private on every lot. Month strings are left out on purpose:
  // they are substrings of public quarter windows and rendered dates.
  if (item.expectedAvailableFrom) out.push(...dateFormats(item.expectedAvailableFrom))
  // Round 2: the contractor's date is private too; the owner decides the lot date.
  if (item.contractorAvailableFrom) out.push(...dateFormats(item.contractorAvailableFrom))
  return [...new Set(out.filter((s) => s.length > 0))]
}

export function projectPrivateStrings(project: Project, world: World): string[] {
  // Round 2: a project may have no architect yet (architectOrgId ''), so names are read with care.
  const orgName = (id: string) => world.orgs[id]?.name ?? ''
  const out = [project.name, orgName(project.developerOrgId), orgName(project.clientOrgId), orgName(project.architectOrgId)]
  for (const id of project.teamOrgIds) out.push(orgName(id))
  for (const id of project.teamPersonaIds) out.push(world.personas[id]?.name ?? '')
  out.push(project.postcodeDistrict, project.localAuthority)
  out.push(...dateFormats(project.keyDates.steelNeedBy))
  // Version 1.0: the construction start is private; a seller sees at most the need-by quarter from toBlindBuyer.
  out.push(...dateFormats(project.startDate))
  // Round 2: the free type description and the notes between architect and client stay with the project team.
  out.push(project.projectTypeOther, project.clientLink.message, project.clientLink.decisionNote)
  return [...new Set(out.filter((s) => s.length > 0))]
}

export const INTERNAL_ID = /\b(bld|itm)_[A-Za-z0-9]{6}\b/
