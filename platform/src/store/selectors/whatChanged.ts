// Help, Updated on 16 October: each change from the 14 October review and where to find it. Changes for the
// viewer's workspace come first, each with a link to a page they can open (their first project or building by
// name, as the sidebar lists them); the other workspaces' changes follow without links.
import type { AppData, PlatformRole, Viewer } from '../types'
import { buildingSide, projectSide, roleOfUser } from '../access'
import { MARKETPLACE_PATH, marketplaceHref } from '../paths'
import { UPGRADE_TITLE } from '../upgrade'
import { routeAccess } from './nav'

export type ChangeLink = { href: string; label: string }

export type ChangeItem = { id: string; title: string; text: string; forText: string; link: ChangeLink | null }

export type WhatChangedView = { title: string; intro: string; yours: ChangeItem[]; others: ChangeItem[] }

type Places = { project: { id: string; name: string } | null; building: { id: string; name: string } | null }

type Change = { id: string; title: string; text: string; roles: PlatformRole[]; places: (p: Places) => (ChangeLink | null)[] }

const PEOPLE: Record<PlatformRole, string> = {
  architect: 'architects',
  client: 'clients',
  owner: 'donor building owners',
  surveyor: 'surveyors',
  consultant: 'sustainability consultants',
}

const ORDER: PlatformRole[] = ['architect', 'client', 'consultant', 'owner', 'surveyor']

function project(p: Places, path: string, label: (name: string) => string): ChangeLink | null {
  return p.project ? { href: `/app/projects/${p.project.id}${path}`, label: label(p.project.name) } : null
}

function building(p: Places, path: string, label: (name: string) => string): ChangeLink | null {
  return p.building ? { href: `/app/buildings/${p.building.id}${path}`, label: label(p.building.name) } : null
}

// Where a change lives when the viewer has no project or building yet.
const PROJECTS: ChangeLink = { href: '/app/projects', label: 'Your projects' }
const BUILDINGS: ChangeLink = { href: '/app/buildings', label: 'Buildings' }

export const ROUND_2_CHANGES: Change[] = [
  {
    id: 'marketplace',
    title: 'Marketplace with category folders',
    text: 'Discover is now the Marketplace. It opens on three folders, Structure, Envelope and Finishes, then the new materials that fit your projects, then every material.',
    roles: ['architect', 'client', 'consultant'],
    places: () => [{ href: MARKETPLACE_PATH, label: 'Open the Marketplace' }],
  },
  {
    id: 'checking',
    title: 'Checking against starts at No project',
    text: 'The strip above the materials shows what you are checking against. Pick a project to see how many arrive in time, and switch on Only show what arrives in time.',
    roles: ['architect', 'client', 'consultant'],
    // The Marketplace already checking against the viewer's first project, so the strip shows its fit straight away.
    places: (p) => [
      p.project ? { href: marketplaceHref(p.project.id), label: `Check against ${p.project.name}` } : null,
      { href: MARKETPLACE_PATH, label: 'Choose a project to check against' },
    ],
  },
  {
    id: 'programme',
    title: 'The programme on the project overview',
    text: 'Each project opens with its programme: the RIBA stages, site start and completion, a line for today, and when each shortlisted material is available.',
    roles: ['architect', 'client', 'consultant'],
    places: (p) => [project(p, '', (n) => `Open ${n}`), PROJECTS],
  },
  {
    id: 'requirements',
    title: 'Requirements from the region and local authority',
    text: 'A project records its region and local authority, which bring in the planning and sustainability requirements that apply. The Requirements tab tracks each one with its status and evidence.',
    roles: ['architect', 'client', 'consultant'],
    places: (p) => [project(p, '/requirements', (n) => `Requirements of ${n}`), PROJECTS],
  },
  {
    id: 'targets',
    title: 'Goals and targets',
    text: 'Each project has targets for reuse, carbon and waste, with defaults from its requirements. The consultant can override any of them, with a reason.',
    roles: ['consultant'],
    places: (p) => [project(p, '/targets', (n) => `Targets of ${n}`), PROJECTS],
  },
  {
    id: 'sustainability',
    title: 'The Sustainability tab',
    text: 'Carbon became Sustainability: avoided carbon and mass by status and typology, against the targets. Consultants also find certification and the circular economy statement there.',
    roles: ['architect', 'client', 'consultant'],
    places: (p) => [project(p, '/sustainability', (n) => `Sustainability of ${n}`), PROJECTS],
  },
  {
    id: 'clients-accept',
    title: 'Clients accept new projects',
    text: 'An architect now asks before adding a client to a project. The client accepts or declines on Project requests, and sees the project only once accepted.',
    roles: ['architect', 'client'],
    places: () => [{ href: '/app/projects/requests', label: 'Project requests' }, { href: '/app/projects/new', label: 'New project' }],
  },
  {
    id: 'sharing',
    title: 'Sharing links',
    text: 'Share chosen lots of a building through a link you can revoke. You see how many organisations opened it and their types, never who.',
    roles: ['owner'],
    places: (p) => [building(p, '/sharing', (n) => `Sharing for ${n}`), BUILDINGS],
  },
  {
    id: 'capture',
    title: 'Capture on its own page',
    text: 'Capture has its own page with a building picker, and a surveyor can add a building before being appointed. The owner confirms the link.',
    roles: ['surveyor', 'owner'],
    places: () => [{ href: '/app/capture', label: 'Open Capture' }],
  },
  {
    id: 'donor-buildings',
    title: 'Donor buildings and the contractor',
    text: 'Asset owners are now donor building owners and Priorities is the Recovery plan. A deconstruction contractor can be invited to a building to set when items come out.',
    roles: ['owner', 'surveyor'],
    places: (p) => [building(p, '', (n) => `Open ${n}`), BUILDINGS],
  },
  {
    id: 'dashboards',
    title: 'A dashboard on every home',
    text: 'Every home opens with four figures and the recent activity. Clients see cost, savings, carbon and reuse across their projects, the programmes side by side and a to-do list.',
    roles: ['architect', 'client', 'owner', 'surveyor', 'consultant'],
    places: () => [{ href: '/app/home', label: 'Go to home' }],
  },
]

function forText(roles: PlatformRole[]): string {
  const names = ORDER.filter((r) => roles.includes(r)).map((r) => PEOPLE[r])
  if (names.length === ORDER.length) return 'For everyone'
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  return `For ${list}`
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'en-GB')
}

function places(state: AppData, viewer: Viewer): Places {
  const projects = Object.values(state.world.projects)
    .filter((p) => projectSide(state, viewer.userId, p.id) !== null)
    .sort(byName)
  const buildings = Object.values(state.world.buildings)
    .filter((b) => buildingSide(state, viewer.userId, b.id) !== null)
    .sort(byName)
  return {
    project: projects[0] ? { id: projects[0].id, name: projects[0].name } : null,
    building: buildings[0] ? { id: buildings[0].id, name: buildings[0].name } : null,
  }
}

/** The round 2 changes for the viewer: their own with a link they can open, then the other workspaces'. */
export function whatChangedView(state: AppData, viewer: Viewer): WhatChangedView {
  const role = roleOfUser(state, viewer.userId)
  const where = places(state, viewer)
  const item = (c: Change, linked: boolean): ChangeItem => ({
    id: c.id,
    title: c.title,
    text: c.text,
    forText: forText(c.roles),
    link: linked ? (c.places(where).find((l): l is ChangeLink => l !== null && routeAccess(state, viewer, l.href) === 'ok') ?? null) : null,
  })
  const mine = (c: Change) => role !== null && c.roles.includes(role)
  return {
    title: UPGRADE_TITLE,
    intro: 'The changes from the review of 14 October, and where to find each one.',
    yours: ROUND_2_CHANGES.filter(mine).map((c) => item(c, true)),
    others: ROUND_2_CHANGES.filter((c) => !mine(c)).map((c) => item(c, false)),
  }
}
