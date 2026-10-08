// The left rail, the role homes and the role names, built from the world and the persona (brief/09-V1-PRODUCT.md section 4).
// Labels come from the world; routes carry opaque IDs only, never names.
import type { World } from '../domain/types'
import { buildingsFor, clientsFor, engagementsFor, projectsFor, roleOf, type Role } from '../domain/access'

export type NavItem = {
  label: string
  to: string
  testId: string
  /** A version 2 entry: greyed with a "V2" tag, still navigable. */
  v2?: boolean
  /** A folder holds child items; its `to` is the folder's home. */
  children?: NavItem[]
}

/** A rail section. A null title renders the items under a plain divider. */
export type NavSection = { title: string | null; items: NavItem[] }

export const ROLE_ORDER: Role[] = ['surveyor', 'seller', 'architect', 'client', 'consultant', 'operator']

export const ROLE_NAMES: Record<Role, string> = {
  surveyor: 'Site surveyor',
  seller: 'Asset owner',
  architect: 'Architect',
  client: 'Asset owner, client',
  consultant: 'Sustainability consultant',
  operator: 'Platform operator',
}

/** The persona's role, or null for a persona the world does not hold. */
export function roleFor(world: World, personaId: string): Role | null {
  try {
    return roleOf(world, personaId)
  } catch {
    return null
  }
}

/** How the product names the persona's role. The buying owner reads "Asset owner, client of" and their projects. */
export function roleTitle(world: World, personaId: string): string {
  const role = roleFor(world, personaId)
  if (!role) return ''
  if (role !== 'client') return ROLE_NAMES[role]
  const names = projectsFor(world, personaId).map((p) => p.name)
  return names.length ? 'Asset owner, client of ' + joinNames(names) : 'Asset owner, client'
}

function joinNames(names: string[]): string {
  if (names.length < 2) return names.join('')
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
}

function leaf(label: string, to: string, testId: string, v2 = false): NavItem {
  return v2 ? { label, to, testId, v2 } : { label, to, testId }
}

const ARCHITECT_PROJECT = [
  { label: 'Wish list', path: 'wishlist' },
  { label: 'Spec sheet', path: 'spec' },
  { label: 'Match schedule', path: 'match', v2: true },
]
const CLIENT_PROJECT = [
  { label: 'Approvals', path: 'approvals' },
  { label: 'Match schedule (advanced)', path: 'match' },
  { label: 'Reuse plan', path: 'plan' },
  { label: 'Deals', path: 'deals' },
]
const CONSULTANT_PROJECT = [
  { label: 'Compliance', path: 'compliance' },
  { label: 'Wish list review', path: 'review' },
]
const SURVEYOR_BUILDING = [
  { label: 'Inventory', path: 'inventory' },
  { label: 'Capture', path: 'capture' },
]
const SELLER_BUILDING = [
  { label: 'Inventory', path: 'inventory' },
  { label: 'Priority', path: 'priority' },
  { label: 'Listings and visibility', path: 'listings' },
]

type Child = { label: string; path: string; v2?: boolean }

function folder(label: string, base: string, id: string, kind: 'project' | 'building', children: Child[]): NavItem {
  return {
    label,
    to: kind === 'project' ? base : base + '/' + children[0].path,
    testId: `nav-${kind}-${id}`,
    children: children.map((c) => leaf(c.label, `${base}/${c.path}`, `nav-${id}-${c.path}`, c.v2 === true)),
  }
}

function projectFolders(world: World, personaId: string, children: Child[]): NavItem[] {
  return projectsFor(world, personaId).map((p) => folder(p.name, `/projects/${p.id}`, p.id, 'project', children))
}

/** The rail for the persona, from access.ts and the world. Empty for a persona the world does not hold. */
export function railFor(world: World, personaId: string): NavSection[] {
  const role = roleFor(world, personaId)
  switch (role) {
    case 'surveyor':
      return [
        {
          title: 'Clients',
          items: clientsFor(world, personaId).map(({ org, buildings }) => ({
            label: org.name,
            to: `/buildings/${buildings[0].id}/${SURVEYOR_BUILDING[0].path}`,
            testId: `nav-client-${org.id}`,
            children: buildings.map((b) => folder(b.name, `/buildings/${b.id}`, b.id, 'building', SURVEYOR_BUILDING)),
          })),
        },
      ]
    case 'seller':
      return [
        { title: 'Buildings', items: buildingsFor(world, personaId).map((b) => folder(b.name, `/buildings/${b.id}`, b.id, 'building', SELLER_BUILDING)) },
        { title: null, items: [leaf('Offers and deals', '/offers', 'nav-offers')] },
      ]
    case 'architect':
      return [
        { title: 'Marketplace', items: [leaf('Browse', '/market', 'nav-browse'), leaf('Shared with you', '/market/shared', 'nav-shared'), leaf('Saved', '/saved', 'nav-saved')] },
        { title: 'Projects', items: [...projectFolders(world, personaId, ARCHITECT_PROJECT), leaf('New project', '/projects/new', 'nav-new-project')] },
      ]
    case 'client':
      return [{ title: 'Projects', items: projectFolders(world, personaId, CLIENT_PROJECT) }]
    case 'consultant':
      return [
        { title: 'Projects', items: projectFolders(world, personaId, CONSULTANT_PROJECT) },
        {
          title: 'Engagements',
          items: engagementsFor(world, personaId).map((e) => ({
            label: e.name,
            to: `/engagements/${e.id}/waste`,
            testId: `nav-engagement-${e.id}`,
            children: [leaf('Waste and reuse', `/engagements/${e.id}/waste`, `nav-${e.id}-waste`)],
          })),
        },
      ]
    case 'operator':
      return [{ title: 'Platform', items: [leaf('Ledger', '/operator/ledger', 'nav-ledger'), leaf('Model comparison', '/operator/models', 'nav-models')] }]
    default:
      return []
  }
}

/** Where a project folder opens for the role, or null when the role has no project screens. */
export function projectHomeFor(role: Role | null, projectId: string): string | null {
  if (role === 'architect') return `/projects/${projectId}/wishlist`
  if (role === 'client') return `/projects/${projectId}/approvals`
  if (role === 'consultant') return `/projects/${projectId}/compliance`
  return null
}

/** The screen a persona lands on after picking a role, in rail order. */
export function homeFor(world: World, personaId: string): string {
  const role = roleFor(world, personaId)
  const project = projectsFor(world, personaId)[0]
  const building = buildingsFor(world, personaId)[0]
  switch (role) {
    case 'architect':
      return '/market'
    case 'client':
      return project ? `/projects/${project.id}/approvals` : '/market'
    case 'consultant': {
      if (project) return `/projects/${project.id}/compliance`
      const engagement = engagementsFor(world, personaId)[0]
      return engagement ? `/engagements/${engagement.id}/waste` : '/about'
    }
    case 'surveyor':
      return building ? `/buildings/${building.id}/capture` : '/about'
    case 'seller':
      return building ? `/buildings/${building.id}/inventory` : '/offers'
    case 'operator':
      return '/operator/ledger'
    default:
      return '/'
  }
}

function matches(to: string, pathname: string): boolean {
  return pathname === to || pathname.startsWith(to + '/')
}

function leaves(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => (i.children ? leaves(i.children) : [i]))
}

/** The one leaf that is active for the path: the longest `to` that equals or contains it. */
export function activeLeaf(sections: NavSection[], pathname: string): NavItem | null {
  let best: NavItem | null = null
  for (const item of leaves(sections.flatMap((s) => s.items))) {
    if (matches(item.to, pathname) && (!best || item.to.length > best.to.length)) best = item
  }
  return best
}

/** True when the item is the active leaf or a folder that holds it. */
export function holdsActive(item: NavItem, active: NavItem | null): boolean {
  if (!active) return false
  if (item === active) return true
  return (item.children ?? []).some((c) => holdsActive(c, active))
}

/** The labels from the section down to the active leaf, for the phone menu button. */
export function trailFor(sections: NavSection[], pathname: string): string[] {
  const active = activeLeaf(sections, pathname)
  if (!active) return []
  for (const s of sections) {
    const path = pathTo(s.items, active)
    if (path) return [...(s.title ? [s.title] : []), ...path]
  }
  return []
}

function pathTo(items: NavItem[], target: NavItem): string[] | null {
  for (const i of items) {
    if (i === target) return [i.label]
    if (i.children) {
      const rest = pathTo(i.children, target)
      if (rest) return [i.label, ...rest]
    }
  }
  return null
}
