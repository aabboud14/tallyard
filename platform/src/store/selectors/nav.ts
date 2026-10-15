// The sidebar for each role, with counts for its badges, and the route check every app page makes.
import type { AppData, PlatformRole, Viewer } from '../types'
import { buildingSide, buildingsOfUser, canCaptureIn, canOpenEngagement, isBuildingContractor, isProjectClient, orgOfUser, projectSide, projectsOfUser, roleOfUser } from '../access'
import { orgTypeLabel } from '../../sandbox/accounts'
import { projectWishlist } from '../lots'
import { initials } from './common'
import { pendingLinkRequestCount, projectTabs } from './project'
import { buildingTabs } from './owner'
import { appointments, NOT_YET_LINKED, unlinkedBuildings } from './surveyor'
import { pendingClaimCount } from './claims'
import { engagementsOf } from './consultant'
import { unreadCount } from './notifications'
import { materialView } from './discover'

/** Icon names from lucide-react; the shell maps them to components. */
export type NavIcon =
  | 'House'
  | 'Compass'
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

export type NavItem = { id: string; label: string; href: string; icon: NavIcon | null; badge: number | null; soon: boolean; children: NavItem[] }

export type NavSection = { id: string; title: string | null; items: NavItem[] }

export type NavModel = {
  org: { id: string; name: string; typeLabel: string; initials: string }
  user: { id: string; name: string; email: string; title: string; initials: string; colour: string; sample: boolean }
  role: PlatformRole
  sections: NavSection[]
  footer: NavItem[]
  unread: number
}

function item(id: string, label: string, href: string, icon: NavIcon | null = null, extra: Partial<Pick<NavItem, 'badge' | 'soon' | 'children'>> = {}): NavItem {
  return { id, label, href, icon, badge: extra.badge ?? null, soon: extra.soon ?? false, children: extra.children ?? [] }
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
  const projectFolder = (id: string, name: string) => {
    const side = projectSide(state, viewer.userId, id)!
    const p = state.world.projects[id]
    const tabs = projectTabs(state, side, p).filter((t) => !(side === 'architect' && t.id === 'activity') && !(side === 'client' && (t.id === 'team' || t.id === 'activity')) && !(side === 'consultant' && (t.id === 'team' || t.id === 'activity')))
    const waiting = side === 'client' ? (projectWishlist(state.world, id)?.items.filter((i) => i.status === 'sent').length ?? 0) : 0
    return item(`project-${id}`, name, `/app/projects/${id}`, 'Folder', { badge: badge(waiting), children: tabs.map((t) => item(`project-${id}-${t.id}`, t.label, t.href, null, { badge: t.badge, soon: t.soon })) })
  }
  if (role === 'architect') {
    sections.push({ id: 'main', title: null, items: [item('home', 'Home', '/app/home', 'House'), item('discover', 'Discover', '/app/discover', 'Compass'), item('saved', 'Saved', '/app/saved', 'Bookmark')] })
    sections.push({ id: 'projects', title: 'Projects', items: [...projects.map((p) => projectFolder(p.id, p.name)), item('new-project', 'New project', '/app/projects/new', 'FolderPlus')] })
  } else if (role === 'client') {
    sections.push({ id: 'main', title: null, items: [item('home', 'Home', '/app/home', 'House')] })
    const requests = pendingLinkRequestCount(state, org.id)
    const folders = projects.filter((p) => isProjectClient(state, viewer.userId, p.id)).map((p) => projectFolder(p.id, p.name))
    // Project requests shows only while an architect is waiting for an answer.
    sections.push({ id: 'projects', title: 'Projects', items: requests > 0 ? [...folders, item('project-requests', 'Project requests', '/app/projects/requests', 'Inbox', { badge: badge(requests) })] : folders })
  } else if (role === 'owner') {
    const buildings = buildingsOfUser(state, viewer.userId)
    const own = projects.filter((p) => isProjectClient(state, viewer.userId, p.id))
    // An owner with a New project reads the marketplace for it, as its client would.
    sections.push({ id: 'main', title: null, items: [item('home', 'Home', '/app/home', 'House'), ...(own.length > 0 ? [item('discover', 'Discover', '/app/discover', 'Compass')] : [])] })
    sections.push({
      id: 'buildings',
      title: 'Donor buildings',
      items: [
        ...buildings.map((b) => item(`building-${b.id}`, b.name, `/app/buildings/${b.id}`, 'Building2', { children: buildingTabs('owner', b.id).map((t) => item(`building-${b.id}-${t.id}`, t.label, t.href)) })),
        item('new-building', 'Add building', '/app/buildings?new=1', 'Plus'),
      ],
    })
    if (own.length > 0) sections.push({ id: 'new-projects', title: 'New projects', items: own.map((p) => projectFolder(p.id, p.name)) })
    // Reservation requests and buildings surveyors ask the owner to confirm both wait on Requests.
    sections.push({ id: 'trade', title: null, items: [item('requests', 'Requests', '/app/requests', 'Inbox', { badge: badge(pendingRequests(state, org.id) + pendingClaimCount(state, org.id)) })] })
  } else if (role === 'surveyor') {
    const buildingItem = (id: string, name: string, href: string) => {
      const side = buildingSide(state, viewer.userId, id)!
      const tabs = buildingTabs(side, id, { contractor: isBuildingContractor(state, viewer.userId, id) }).filter((t) => t.id !== 'overview')
      return item(`building-${id}`, name, href, 'Building2', { children: tabs.map((t) => item(`building-${id}-${t.id}`, t.label, t.href)) })
    }
    const unlinked = unlinkedBuildings(state, viewer)
    sections.push({ id: 'main', title: null, items: [item('home', 'Home', '/app/home', 'House'), item('capture', 'Capture', '/app/capture', 'Camera')] })
    sections.push({
      id: 'clients',
      title: 'Clients',
      items: [
        ...appointments(state, viewer).map((g) => item(`client-${g.orgId}`, g.clientName, g.buildings[0]?.href ?? '/app/buildings', 'Folder', { children: g.buildings.map((b) => buildingItem(b.id, b.name, b.href)) })),
        ...(unlinked.length > 0 ? [item('client-unlinked', NOT_YET_LINKED, unlinked[0].href, 'Folder', { children: unlinked.map((b) => buildingItem(b.id, b.name, b.href)) })] : []),
        item('new-building', 'Add building', '/app/buildings?new=1', 'Plus'),
      ],
    })
  } else {
    sections.push({ id: 'main', title: null, items: [item('home', 'Home', '/app/home', 'House')] })
    sections.push({ id: 'projects', title: 'Projects', items: projects.filter((p) => projectSide(state, viewer.userId, p.id) === 'consultant').map((p) => projectFolder(p.id, p.name)) })
    sections.push({ id: 'engagements', title: 'Engagements', items: engagementsOf(state, viewer).map((e) => item(`engagement-${e.id}`, e.name, `/app/engagements/${e.id}/waste`, 'Recycle')) })
  }
  return {
    org: { id: org.id, name: org.name, typeLabel: orgTypeLabel(org.type), initials: initials(org.name) },
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
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  if (parts[0] !== 'app') return 'not_found'
  const [, section, id, tab, sub, ...rest] = parts
  const roles = (...rs: PlatformRole[]): RouteAccess => (rs.includes(role) ? 'ok' : 'forbidden')
  if (section === undefined || section === 'home') return id === undefined ? 'ok' : 'not_found'
  if (section === 'notifications') return id === undefined ? 'ok' : 'not_found'
  if (section === 'settings' || section === 'help') return 'ok'
  // Round 2: a donor building owner reads the marketplace and its projects once it is the client of a New project.
  const buyer = (): RouteAccess => (roles('architect', 'client', 'consultant') === 'ok' || ownerHasClientProject(state, viewer.userId) ? 'ok' : 'forbidden')
  if (section === 'discover') {
    if (id === undefined) return buyer()
    if (tab !== undefined) return 'not_found'
    if (buyer() !== 'ok') return 'forbidden'
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
    if (id === 'requests') return tab === undefined ? roles('client') : 'not_found'
    if (!ID.test(id)) return 'not_found'
    const side = projectSide(state, viewer.userId, id)
    if (!side) return 'forbidden'
    if (tab === undefined) return 'ok'
    if (sub !== undefined) return 'not_found'
    const allowed = projectTabs(state, side, state.world.projects[id]).map((t) => t.id)
    if (!['shortlist', 'specification', 'approvals', 'reservations', 'carbon', 'compliance', 'team', 'activity', 'matching'].includes(tab)) return 'not_found'
    return allowed.includes(tab) ? 'ok' : 'forbidden'
  }
  if (section === 'buildings') {
    if (id === undefined) return roles('owner', 'surveyor')
    if (!ID.test(id)) return 'not_found'
    const side = buildingSide(state, viewer.userId, id)
    if (!side) return 'forbidden'
    if (tab === undefined) return 'ok'
    if (!['inventory', 'capture', 'priorities', 'listings', 'sharing', 'testing', 'availability'].includes(tab)) return 'not_found'
    // The records (inventory, capture, testing) are for the owner and the surveyor; a contractor alone sets dates only.
    const records = canCaptureIn(state, viewer.userId, id)
    if (tab === 'inventory' && sub !== undefined) {
      if (rest.length > 0) return 'not_found'
      return records && state.world.items[sub]?.buildingId === id ? 'ok' : 'forbidden'
    }
    if (sub !== undefined) return 'not_found'
    if (tab === 'inventory' || tab === 'capture' || tab === 'testing') return records ? 'ok' : 'forbidden'
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
