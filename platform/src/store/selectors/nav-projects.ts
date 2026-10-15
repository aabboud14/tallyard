// The sidebar's projects, arranged as the person chose: by name (the default), grouped under each client, or by
// recent activity, optionally for one client only. Pure: the caller supplies the projects and the view.
import type { NavProjectView } from '../types'

export type NavProjectInput = { id: string; name: string; clientOrgId: string; clientName: string; lastActivityAt: string | null }

export type NavProjectGroup = { label: string | null; clientOrgId: string | null; ids: string[] }

export type ArrangedProjects = {
  groups: NavProjectGroup[]
  /** The distinct clients, by name, with how many projects each has. */
  clients: { orgId: string; name: string; count: number }[]
  /** The view actually applied: an unknown client reads as no filter. */
  effective: NavProjectView
  shown: number
  hidden: number
}

/** Names in reading order: case and accents ignored, numbers by value. */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, 'en-GB', { sensitivity: 'base', numeric: true })
}

function byName<T extends { name: string; id: string }>(a: T, b: T): number {
  return compareNames(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export function arrangeNavProjects(projects: NavProjectInput[], view: NavProjectView): ArrangedProjects {
  const counts = new Map<string, { orgId: string; name: string; count: number }>()
  for (const p of projects) {
    const c = counts.get(p.clientOrgId)
    if (c) c.count += 1
    else counts.set(p.clientOrgId, { orgId: p.clientOrgId, name: p.clientName, count: 1 })
  }
  const clients = [...counts.values()].sort((a, b) => compareNames(a.name, b.name) || (a.orgId < b.orgId ? -1 : 1))
  const clientOrgId = view.clientOrgId !== null && counts.has(view.clientOrgId) ? view.clientOrgId : null
  const effective: NavProjectView = { order: view.order, clientOrgId }
  const kept = clientOrgId === null ? projects : projects.filter((p) => p.clientOrgId === clientOrgId)
  let groups: NavProjectGroup[]
  if (view.order === 'client') {
    groups = clients
      .filter((c) => kept.some((p) => p.clientOrgId === c.orgId))
      .map((c) => ({ label: c.name, clientOrgId: c.orgId, ids: kept.filter((p) => p.clientOrgId === c.orgId).sort(byName).map((p) => p.id) }))
  } else if (view.order === 'recent') {
    const sorted = [...kept].sort((a, b) => {
      if (a.lastActivityAt !== b.lastActivityAt) {
        if (a.lastActivityAt === null) return 1
        if (b.lastActivityAt === null) return -1
        return a.lastActivityAt < b.lastActivityAt ? 1 : -1
      }
      return byName(a, b)
    })
    groups = [{ label: null, clientOrgId: null, ids: sorted.map((p) => p.id) }]
  } else {
    groups = [{ label: null, clientOrgId: null, ids: [...kept].sort(byName).map((p) => p.id) }]
  }
  return { groups, clients, effective, shown: kept.length, hidden: projects.length - kept.length }
}
