// The strings that must never reach the other side (04 section 4). Used by tests and the end-to-end checks.
import type { InventoryItem, Lot, Project, SourceBuilding, World } from '../types'
import { dateFormats } from '../dates'

export function lotPrivateStrings(lot: Lot, item: InventoryItem, building: SourceBuilding, world: World): string[] {
  const out: string[] = []
  if (building.ownerOrgId) {
    out.push(building.name)
    const street = building.address.replace(/^\d+\s+/, '').split(',')[0]
    if (street) out.push(street)
    out.push(building.postcodeDistrict)
    if (building.locationLevel !== 'local_authority') out.push(building.localAuthority)
    out.push(world.orgs[building.ownerOrgId].name)
    out.push(...building.tenants)
    for (const p of Object.values(world.personas)) if (p.orgId === building.ownerOrgId) out.push(p.name)
    if (building.surveyedBy) out.push(building.surveyedBy.personaName, building.surveyedBy.orgName)
    const dates = [building.programme.stripOutStart, building.programme.dismantlingStart, building.programme.clearBy]
    for (const d of dates) if (d) out.push(...dateFormats(d))
  }
  out.push(item.tag)
  if (lot.availableFrom) out.push(...dateFormats(lot.availableFrom))
  return out.filter((s) => s.length > 0)
}

export function projectPrivateStrings(project: Project, world: World): string[] {
  const out = [project.name, world.orgs[project.developerOrgId].name]
  for (const id of project.teamOrgIds) out.push(world.orgs[id].name)
  for (const id of project.teamPersonaIds) out.push(world.personas[id].name)
  out.push(project.postcodeDistrict, project.localAuthority)
  out.push(...dateFormats(project.keyDates.steelNeedBy))
  return out
}

export const INTERNAL_ID = /\b(bld|itm)_[A-Za-z0-9]{6}\b/
