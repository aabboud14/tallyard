// The command palette's index: pages, projects, buildings and materials the viewer may open, and a ranked search.
import type { AppData, Viewer } from '../types'
import { buildingsOfUser, projectSide, projectsOfUser, roleOfUser } from '../access'
import { listingOf, marketplaceListings } from '../lots'
import { familyLabel } from './common'
import { navModel, type NavItem } from './nav'
import { sharedGroups } from './discover'
import { itemsOf } from './owner'
import { titleFor } from '../../domain/reference/families'

export type SearchKind = 'page' | 'project' | 'building' | 'material' | 'item'

export type SearchEntry = { id: string; kind: SearchKind; label: string; sublabel: string; href: string; keywords: string }

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = { page: 'Pages', project: 'Projects', building: 'Buildings', material: 'Materials', item: 'Inventory' }

function flatten(items: NavItem[], parent: string | null, out: SearchEntry[]): void {
  for (const it of items) {
    if (it.soon) continue
    const label = parent ? `${parent}, ${it.label}` : it.label
    if (!it.id.startsWith('project-') && !it.id.startsWith('building-') && !it.id.startsWith('client-')) out.push({ id: `page:${it.id}`, kind: 'page', label: it.label, sublabel: parent ?? 'Go to', href: it.href, keywords: label.toLowerCase() })
    flatten(it.children, it.children.length ? it.label : parent, out)
  }
}

/** Everything the palette can jump to, for this viewer. Materials come from public listings only. */
export function searchIndex(state: AppData, viewer: Viewer): SearchEntry[] {
  const nav = navModel(state, viewer)
  if (!nav) return []
  const out: SearchEntry[] = []
  for (const s of nav.sections) flatten(s.items, null, out)
  flatten(nav.footer, null, out)
  out.push({ id: 'page:notifications', kind: 'page', label: 'Notifications', sublabel: 'Go to', href: '/app/notifications', keywords: 'notifications inbox' })
  for (const p of projectsOfUser(state, viewer.userId)) {
    const client = state.world.orgs[p.clientOrgId]?.name ?? ''
    out.push({ id: `project:${p.id}`, kind: 'project', label: p.name, sublabel: client, href: `/app/projects/${p.id}`, keywords: `${p.name} ${client} ${p.region} ${p.localAuthority}`.toLowerCase() })
  }
  for (const b of buildingsOfUser(state, viewer.userId)) {
    out.push({ id: `building:${b.id}`, kind: 'building', label: b.name, sublabel: b.address, href: `/app/buildings/${b.id}`, keywords: `${b.name} ${b.address} ${b.localAuthority}`.toLowerCase() })
    for (const i of itemsOf(state, b.id)) {
      const title = titleFor(i.spec)
      out.push({ id: `item:${i.id}`, kind: 'item', label: `${i.tag}, ${title}`, sublabel: b.name, href: `/app/buildings/${b.id}/inventory/${i.id}`, keywords: `${i.tag} ${title} ${familyLabel(i.family)}`.toLowerCase() })
    }
  }
  const role = roleOfUser(state, viewer.userId)
  if (role === 'architect' || role === 'client' || role === 'consultant') {
    const seen = new Set<string>()
    const add = (title: string, publicId: string, family: Parameters<typeof familyLabel>[0], location: string) => {
      if (seen.has(publicId)) return
      seen.add(publicId)
      out.push({ id: `material:${publicId}`, kind: 'material', label: title, sublabel: `${familyLabel(family)}, ${location}`, href: `/app/discover/${publicId}`, keywords: `${title} ${publicId} ${familyLabel(family)} ${location}`.toLowerCase() })
    }
    for (const l of marketplaceListings(state)) add(l.title, l.publicId, l.family, l.location.label)
    for (const g of sharedGroups(state, viewer)) for (const c of g.cards) add(c.title, c.publicId, c.family, c.locationLabel)
    // Reserved materials stay findable for the project that holds them.
    for (const r of Object.values(state.reservations)) {
      if (r.status !== 'accepted' || !projectSide(state, viewer.userId, r.projectId)) continue
      const l = listingOf(state.world, state.world.lots[r.lotId])
      add(l.title, l.publicId, l.family, l.location.label)
    }
  }
  return out
}

/** Entries whose words all appear, best first: label starts, then label contains, then keywords. */
export function searchEntries(index: SearchEntry[], query: string, limit = 20): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return index.filter((e) => e.kind === 'page' || e.kind === 'project' || e.kind === 'building').slice(0, limit)
  const words = q.split(/\s+/)
  const scored = index
    .filter((e) => words.every((w) => e.keywords.includes(w) || e.label.toLowerCase().includes(w)))
    .map((e) => {
      const label = e.label.toLowerCase()
      const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2
      return { e, score }
    })
  scored.sort((a, b) => a.score - b.score || a.e.label.localeCompare(b.e.label, 'en-GB'))
  return scored.slice(0, limit).map((x) => x.e)
}
