// The sidebar for each role, with counts for its badges, and the route check every app page makes.
import { DEFAULT_NAV_PROJECT_VIEW, type AppData, type NavProjectView, type PlatformRole, type Viewer } from '../types'
import type { Project } from '../../domain/types'
import { MARKETPLACE_PATH } from '../paths'
import { buildingSide, buildingsOfUser, canCaptureIn, canOpenEngagement, isBuildingContractor, isProjectClient, orgOfUser, projectSide, projectsOfUser, roleOfUser } from '../access'
import { orgTypeLabel, ROLE_LABELS } from '../../sandbox/accounts'
import { projectWishlist } from '../lots'
import { initials } from './common'
import { pendingLinkRequestCount, projectTabs } from './project'
import { pendingConsultantRequestCount } from './consultant-requests'
import { badgedBuildingTabs } from './owner'
import { appointments, NOT_YET_LINKED, unlinkedBuildings } from './surveyor'
import { pendingClaimCount } from './claims'
import { engagementsOf } from './consultant'
import { unreadCount } from './notifications'
import { materialView } from './discover'
import { arrangeNavProjects, type ArrangedProjects } from './nav-projects'

/** Icon names from lucide-react; the shell maps them to components. */
export type NavIcon =
  | 'House'
  | 'Compass'
  | 'Store'
  | 'Bookmark'
  | 'Folder'
  | 'FolderPlus'
  | 'Building2'
  | 'Inbox'
  | 'Users'
  | 'Recycle'
  | 'CircleHelp'
  | 'Settings'
  | 'Plus'
  | 'Bell'
  | 'FileText'
  | 'Camera'

export type NavItem = {
  id: string
  label: string
  href: string
  icon: NavIcon | null
  badge: number | null
  soon: boolean
  children: NavItem[]
  /** A subheading shown before this item: the client's name on the first project of each group in client order. */
  groupLabel: string | null
  /** The client organisation the subheading names, for its test id; null with no subheading. */
  groupId: string | null
}

/** The sidebar's project menu: the order and client filter applied, the clients to filter by, and what is hidden. */
export type NavProjectTools = { kind: 'projects'; view: NavProjectView; clients: ArrangedProjects['clients']; hidden: number; total: number }

export type NavSection = { id: string; title: string | null; items: NavItem[]; tools: NavProjectTools | null }

export type NavModel = {
  /** roleLabel: the workspace in the words of the sign-in sample list (ROLE_LABELS), shown under the organisation. */
  org: { id: string; name: string; typeLabel: string; roleLabel: string; initials: string }
  user: { id: string; name: string; email: string; title: string; initials: string; colour: string; sample: boolean }
  role: PlatformRole
  sections: NavSection[]
  footer: NavItem[]
  unread: number
}

function item(id: string, label: string, href: string, icon: NavIcon | null = null, extra: Partial<Pick<NavItem, 'badge' | 'soon' | 'children' | 'groupLabel' | 'groupId'>> = {}): NavItem {
  return { id, label, href, icon, badge: extra.badge ?? null, soon: extra.soon ?? false, children: extra.children ?? [], groupLabel: extra.groupLabel ?? null, groupId: extra.groupId ?? null }
}

function navSection(id: string, title: string | null, items: NavItem[], tools: NavProjectTools | null = null): NavSection {
  return { id, title, items, tools }
}

/** The person's sidebar project view, or the default: by name, every client. */
export function navProjectViewOf(state: AppData, userId: string): NavProjectView {
  return state.ui.navProjects?.[userId] ?? DEFAULT_NAV_PROJECT_VIEW
}

/** When the viewer's organisation last saw activity on each project, newest first in the log. */
function lastActivityByProject(state: AppData, orgId: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const e of state.activity) {
    if (!e.projectId || !e.orgIds.includes(orgId)) continue
    const seen = out.get(e.projectId)
    if (seen === undefined || e.at > seen) out.set(e.projectId, e.at)
  }
  return out
}

/** The role label for a surveying firm whose only buildings are ones it dates as deconstruction contractor. */
export const CONTRACTOR_ROLE_LABEL = 'Deconstruction contractor'

/**
 * Whether a surveying or deconstruction firm works on buildings only as their contractor (it surveys none and added
 * none): it reads as a deconstruction contractor and has no Capture page to use.
 */
export function contractorOnly(state: AppData, viewer: Viewer): boolean {
  if (roleOfUser(state, viewer.userId) !== 'surveyor') return false
  const sides = buildingsOfUser(state, viewer.userId).map((b) => buildingSide(state, viewer.userId, b.id))
  return sides.length > 0 && sides.every((x) => x === 'contractor')
}

function badge(n: number): number | null {
  return n > 0 ? n : null
}

/** Whether a donor building owner is the client of at least one New project: it then reads the marketplace too. */
export function ownerHasClientProject(state: AppData, userId: string): boolean {
  return roleOfUser(state, userId) === 'owner' && projectsOfUser(state, userId).some((p) => projectSide(state, userId, p.id) === 'client')
}

function pendingRequests(state: AppData, orgId: string): number {
  return Object.values(state.reservations).filter((r) => {
    if (r.status !== 'pending') return false
    const lot = state.world.lots[r.lotId]
    const it = lot ? state.world.items[lot.itemId] : null
    return !!it && state.world.buildings[it.buildingId]?.ownerOrgId === orgId
  }).length
}

export function navModel(state: AppData, viewer: Viewer): NavModel | null {
  const user = state.users[viewer.userId]
  const org = orgOfUser(state, viewer.userId)
  const role = roleOfUser(state, viewer.userId)
  if (!user || !org || !role) return null
  const sections: NavSection[] = []
  const projects = projectsOfUser(state, viewer.userId)
  const lastAt = lastActivityByProject(state, org.id)
  /** The project folders in the person's chosen order, with client subheadings and the menu's figures. */
  const arranged = (list: Project[]): { items: NavItem[]; tools: NavProjectTools } => {
    const a = arrangeNavProjects(
      list.map((p) => ({ id: p.id, name: p.name, clientOrgId: p.clientOrgId, clientName: state.world.orgs[p.clientOrgId]?.name ?? '', lastActivityAt: lastAt.get(p.id) ?? null })),
      navProjectViewOf(state, viewer.userId),
    )
    const byId = new Map(list.map((p) => [p.id, p]))
    const items: NavItem[] = []
    for (const g of a.groups) {
      g.ids.forEach((id, i) => {
        const folder = projectFolder(id, byId.get(id)!.name)
        items.push(i === 0 && g.label !== null ? { ...folder, groupLabel: g.label, groupId: g.clientOrgId } : folder)
      })
    }
    return { items, tools: { kind: 'projects', view: a.effective, clients: a.clients, hidden: a.hidden, total: list.length } }
  }
  const projectFolder = (id: string, name: string) => {
    const side = projectSide(state, viewer.userId, id)!
    const p = state.world.projects[id]
    const tabs = projectTabs(state, side, p).filter((t) => !(side === 'architect' && t.id === 'activity') && !(side === 'client' && (t.id === 'team' || t.id === 'activity')) && !(side === 'consultant' && (t.id === 'team' || t.id === 'activity')))
    const waiting = side === 'client' ? (projectWishlist(state.world, id)?.items.filter((i) => i.status === 'sent').length ?? 0) : 0
    return item(`project-${id}`, name, `/app/projects/${id}`, 'Folder', { badge: badge(waiting), children: tabs.map((t) => item(`project-${id}-${t.id}`, t.label, t.href, null, { badge: t.badge, soon: t.soon })) })
  }
  if (role === 'architect') {
    sections.push(navSection('main', null, [item('home', 'Home', '/app/home', 'House'), item('marketplace', 'Marketplace', MARKETPLACE_PATH, 'Store'), item('saved', 'Saved', '/app/saved', 'Bookmark')]))
    const a = arranged(projects)
    sections.push(navSection('projects', 'Projects', [...a.items, item('new-project', 'New project', '/app/projects/new', 'FolderPlus')], a.tools))
  } else if (role === 'client') {
    sections.push(navSection('main', null, [item('home', 'Home', '/app/home', 'House')]))
    const requests = pendingLinkRequestCount(state, org.id)
    const a = arranged(projects.filter((p) => isProjectClient(state, viewer.userId, p.id)))
    // Project requests shows only while an architect is waiting for an answer.
    sections.push(navSection('projects', 'Projects', requests > 0 ? [...a.items, item('project-requests', 'Project requests', '/app/projects/requests', 'Inbox', { badge: badge(requests) })] : a.items, a.tools))
  } else if (role === 'owner') {
    const buildings = buildingsOfUser(state, viewer.userId)
    const own = projects.filter((p) => isProjectClient(state, viewer.userId, p.id))
    // A donor building owner may build too, so it always reads the marketplace as a client would (audit note C5).
    sections.push(navSection('main', null, [item('home', 'Home', '/app/home', 'House'), item('marketplace', 'Marketplace', MARKETPLACE_PATH, 'Store')]))
    sections.push({
      id: 'buildings',
      title: 'Donor buildings',
      tools: null,
      items: [
        ...buildings.map((b) => item(`building-${b.id}`, b.name, `/app/buildings/${b.id}`, 'Building2', { children: badgedBuildingTabs(state, b, 'owner', { contractor: false }).map((t) => item(`building-${b.id}-${t.id}`, t.label, t.href, null, { badge: t.badge })) })),
        item('new-building', 'Add building', '/app/buildings?new=1', 'Plus'),
      ],
    })
    if (own.length > 0) sections.push(navSection('new-projects', 'New projects', arranged(own).items))
    // Reservation requests and buildings surveyors ask the owner to confirm both wait on Requests.
    sections.push(navSection('trade', null, [item('requests', 'Requests', '/app/requests', 'Inbox', { badge: badge(pendingRequests(state, org.id) + pendingClaimCount(state, org.id)) })]))
  } else if (role === 'surveyor') {
    const buildingItem = (id: string, name: string, href: string) => {
      const side = buildingSide(state, viewer.userId, id)!
      // Overview first, as on the owner's building folders: the Owner, Structure and contractor cards live there.
      const tabs = badgedBuildingTabs(state, state.world.buildings[id], side, { contractor: isBuildingContractor(state, viewer.userId, id) })
      return item(`building-${id}`, name, href, 'Building2', { children: tabs.map((t) => item(`building-${id}-${t.id}`, t.label, t.href, null, { badge: t.badge })) })
    }
    const unlinked = unlinkedBuildings(state, viewer)
    // A firm that only sets dates as a deconstruction contractor has nothing to capture in, so no Capture item.
    sections.push(navSection('main', null, [item('home', 'Home', '/app/home', 'House'), ...(contractorOnly(state, viewer) ? [] : [item('capture', 'Capture', '/app/capture', 'Camera')])]))
    sections.push({
      id: 'clients',
      title: 'Clients',
      tools: null,
      items: [
        ...appointments(state, viewer).map((g) => item(`client-${g.orgId}`, g.clientName, g.buildings[0]?.href ?? '/app/buildings', 'Folder', { children: g.buildings.map((b) => buildingItem(b.id, b.name, b.href)) })),
        ...(unlinked.length > 0 ? [item('client-unlinked', NOT_YET_LINKED, unlinked[0].href, 'Folder', { children: unlinked.map((b) => buildingItem(b.id, b.name, b.href)) })] : []),
        item('new-building', 'Add building', '/app/buildings?new=1', 'Plus'),
      ],
    })
  } else {
    sections.push(navSection('main', null, [item('home', 'Home', '/app/home', 'House')]))
    const a = arranged(projects.filter((p) => projectSide(state, viewer.userId, p.id) === 'consultant'))
    // Project requests shows only while an architect waits for the consultancy's answer, as for a client.
    const requests = pendingConsultantRequestCount(state, org.id)
    sections.push(navSection('projects', 'Projects', requests > 0 ? [...a.items, item('project-requests', 'Project requests', '/app/projects/requests', 'Inbox', { badge: badge(requests) })] : a.items, a.tools))
    sections.push(navSection('engagements', 'Engagements', engagementsOf(state, viewer).map((e) => item(`engagement-${e.id}`, e.name, `/app/engagements/${e.id}/waste`, 'Recycle'))))
  }
  return {
    org: { id: org.id, name: org.name, typeLabel: orgTypeLabel(org.type), roleLabel: role === 'surveyor' && contractorOnly(state, viewer) ? CONTRACTOR_ROLE_LABEL : ROLE_LABELS[role], initials: initials(org.name) },
    user: { id: user.id, name: user.name, email: user.email, title: user.title, initials: initials(user.name), colour: user.avatarColour, sample: user.sample },
    role,
    sections,
    footer: [item('help', 'Help', '/app/help', 'CircleHelp'), item('settings', 'Settings', '/app/settings', 'Settings')],
    unread: unreadCount(state, viewer),
  }
}

export type RouteAccess = 'ok' | 'forbidden' | 'not_found'

const ID = /^[A-Za-z0-9_-]+$/

/** Whether the viewer may open an app route. Unknown and other people's records read the same: forbidden. */
export function routeAccess(state: AppData, viewer: Viewer, pathname: string): RouteAccess {
  const role = roleOfUser(state, viewer.userId)
  if (!role) return 'forbidden'
  // A link may carry a query (?project=) or a section of the page (#statement); the page is the same.
  const parts = pathname.split(/[?#]/)[0].replace(/\/+$/, '').split('/').filter(Boolean)
  if (parts[0] !== 'app') return 'not_found'
  const [, section, id, tab, sub, ...rest] = parts
  const roles = (...rs: PlatformRole[]): RouteAccess => (rs.includes(role) ? 'ok' : 'forbidden')
  if (section === undefined || section === 'home') return id === undefined ? 'ok' : 'not_found'
  if (section === 'notifications') return id === undefined ? 'ok' : 'not_found'
  if (section === 'settings' || section === 'help') return 'ok'
  // Round 2: a donor building owner reads the marketplace and its projects once it is the client of a New project.
  const buyer = (): RouteAccess => (roles('architect', 'client', 'consultant') === 'ok' || ownerHasClientProject(state, viewer.userId) ? 'ok' : 'forbidden')
  // The old Discover address answers exactly as the Marketplace, so its redirect is reached before any refusal.
  // Every donor building owner reads the marketplace, with or without a New project yet (audit note C5).
  const reader = (): RouteAccess => (buyer() === 'ok' || role === 'owner' ? 'ok' : 'forbidden')
  if (section === 'marketplace' || section === 'discover') {
    if (id === undefined) return reader()
    if (tab !== undefined) return 'not_found'
    if (reader() !== 'ok') return 'forbidden'
    return materialView(state, viewer, id, null) ? 'ok' : 'forbidden'
  }
  if (section === 'capture') return id === undefined ? roles('owner', 'surveyor') : 'not_found'
  if (section === 'links') {
    if (id === undefined || tab !== undefined) return 'not_found'
    return ID.test(id) ? 'ok' : 'not_found'
  }
  if (section === 'saved') return id === undefined ? roles('architect') : 'not_found'
  if (section === 'projects') {
    if (id === undefined) return buyer()
    if (id === 'new') return tab === undefined ? roles('architect') : 'not_found'
    if (id === 'requests') return tab === undefined ? roles('client', 'consultant') : 'not_found'
    if (!ID.test(id)) return 'not_found'
    const side = projectSide(state, viewer.userId, id)
    if (!side) return 'forbidden'
    if (tab === undefined) return 'ok'
    if (sub !== undefined) return 'not_found'
    const allowed = projectTabs(state, side, state.world.projects[id]).map((t) => t.id)
    if (!['shortlist', 'specification', 'approvals', 'reservations', 'carbon', 'sustainability', 'targets', 'certification', 'requirements', 'statement', 'compliance', 'team', 'activity', 'matching'].includes(tab)) return 'not_found'
    // /carbon redirects to /sustainability, so it opens wherever Sustainability does.
    return allowed.includes(tab === 'carbon' ? 'sustainability' : tab) ? 'ok' : 'forbidden'
  }
  if (section === 'buildings') {
    if (id === undefined) return roles('owner', 'surveyor')
    if (!ID.test(id)) return 'not_found'
    const side = buildingSide(state, viewer.userId, id)
    if (!side) return 'forbidden'
    if (tab === undefined) return 'ok'
    if (!['inventory', 'capture', 'priorities', 'listings', 'sharing', 'testing', 'requirements', 'availability', 'activity'].includes(tab)) return 'not_found'
    // Everyone with a side on the building reads its activity, filtered to what their organisation may read.
    if (tab === 'activity') return sub === undefined ? 'ok' : 'not_found'
    // The records (inventory, capture, testing) are for the owner and the surveyor; a contractor alone sets dates only.
    const records = canCaptureIn(state, viewer.userId, id)
    if (tab === 'inventory' && sub !== undefined) {
      if (rest.length > 0) return 'not_found'
      return records && state.world.items[sub]?.buildingId === id ? 'ok' : 'forbidden'
    }
    if (sub !== undefined) return 'not_found'
    if (tab === 'inventory' || tab === 'capture' || tab === 'testing' || tab === 'requirements') return records ? 'ok' : 'forbidden'
    if (tab === 'availability') return isBuildingContractor(state, viewer.userId, id) ? 'ok' : 'forbidden'
    return side === 'owner' ? 'ok' : 'forbidden'
  }
  if (section === 'requests') return id === undefined ? roles('owner') : 'not_found'
  if (section === 'engagements') {
    if (id === undefined) return roles('consultant')
    if (sub !== undefined || (tab !== undefined && tab !== 'waste')) return 'not_found'
    return canOpenEngagement(state, viewer.userId, id) ? 'ok' : 'forbidden'
  }
  return 'not_found'
}
