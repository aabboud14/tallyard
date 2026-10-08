// Where the viewer is, as breadcrumbs for the top bar and a title for the browser tab. Names come only from
// records the viewer may open: a route they cannot open reads as its section alone.
import type { AppData, Viewer } from '../types'
import { buildingSide, projectSide } from '../access'
import { listingOf, lotByPublicId } from '../lots'
import { projectTabs } from './project'
import { buildingTabs } from './owner'
import { routeAccess } from './nav'

export type AppCrumb = { label: string; href: string | null }

export type PageLocation = { crumbs: AppCrumb[]; title: string }

export const SETTINGS_SECTION_LABELS: Record<string, string> = { profile: 'Profile', organisation: 'Organisation', team: 'Team', notifications: 'Notifications', sandbox: 'Sandbox' }

export const HELP_TOPIC_LABELS: Record<string, string> = { 'getting-started': 'Getting started', methodology: 'Methodology', 'version-2': 'Version 2' }

const SECTION_LABELS: Record<string, string> = {
  home: 'Home',
  discover: 'Discover',
  saved: 'Saved',
  projects: 'Projects',
  buildings: 'Buildings',
  requests: 'Requests',
  engagements: 'Engagements',
  notifications: 'Notifications',
  settings: 'Settings',
  help: 'Help',
}

/** "version-2" reads "Version 2"; "getting-started" reads "Getting started". */
export function slugLabel(slug: string): string {
  const words = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

function crumb(label: string, href: string | null = null): AppCrumb {
  return { label, href }
}

/** The breadcrumbs and tab title for an app route. The last crumb is the current page and carries no link. */
export function pageLocation(state: AppData, viewer: Viewer, pathname: string): PageLocation {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const [, section = 'home', id, tab, sub] = parts
  const access = routeAccess(state, viewer, pathname)
  const sectionLabel = SECTION_LABELS[section] ?? slugLabel(section)
  const sectionHref = section === 'engagements' ? null : `/app/${section}`
  const done = (crumbs: AppCrumb[]): PageLocation => {
    const last = crumbs[crumbs.length - 1]
    const shown = crumbs.map((c, i) => (i === crumbs.length - 1 ? { ...c, href: null } : c))
    return { crumbs: shown, title: last ? last.label : 'Home' }
  }
  if (!SECTION_LABELS[section] || access === 'not_found') return done([crumb('Page not found')])
  if (id === undefined || access !== 'ok') return done([crumb(sectionLabel, sectionHref)])

  if (section === 'discover') {
    const lot = lotByPublicId(state.world, id)
    return done([crumb(sectionLabel, sectionHref), crumb(lot ? listingOf(state.world, lot).title : id)])
  }
  if (section === 'projects') {
    if (id === 'new') return done([crumb(sectionLabel, sectionHref), crumb('New project')])
    const p = state.world.projects[id]
    const side = projectSide(state, viewer.userId, id)
    if (!p || !side) return done([crumb(sectionLabel, sectionHref)])
    const base = [crumb(sectionLabel, sectionHref), crumb(p.name, `/app/projects/${id}`)]
    if (tab === undefined) return done(base)
    const t = projectTabs(state, side, p).find((x) => x.id === tab)
    return done([...base, crumb(t ? t.label : slugLabel(tab))])
  }
  if (section === 'buildings') {
    const b = state.world.buildings[id]
    const side = buildingSide(state, viewer.userId, id)
    if (!b || !side) return done([crumb(sectionLabel, sectionHref)])
    const base = [crumb(sectionLabel, sectionHref), crumb(b.name, `/app/buildings/${id}`)]
    if (tab === undefined) return done(base)
    const t = buildingTabs(side, id).find((x) => x.id === tab)
    const tabCrumb = crumb(t ? t.label : slugLabel(tab), `/app/buildings/${id}/${tab}`)
    if (tab === 'inventory' && sub !== undefined) {
      const item = state.world.items[sub]
      return done([...base, tabCrumb, crumb(item ? item.tag : sub)])
    }
    return done([...base, tabCrumb])
  }
  if (section === 'engagements') {
    const e = state.world.engagements[id]
    return done([crumb(sectionLabel), crumb(e ? e.name : id, null), ...(tab ? [crumb(slugLabel(tab))] : [])])
  }
  if (section === 'settings') return done([crumb(sectionLabel, '/app/settings/profile'), crumb(SETTINGS_SECTION_LABELS[id] ?? slugLabel(id))])
  if (section === 'help') return done([crumb(sectionLabel, sectionHref), crumb(HELP_TOPIC_LABELS[id] ?? slugLabel(id))])
  return done([crumb(sectionLabel, sectionHref)])
}
