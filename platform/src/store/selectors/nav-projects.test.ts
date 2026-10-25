import { describe, expect, it } from 'vitest'
import { DEFAULT_NAV_PROJECT_VIEW } from '../types'
import { fresh, U, viewer } from '../../test/fixtures'
import { navModel } from './nav'
import { arrangeNavProjects, type NavProjectInput } from './nav-projects'

const P: NavProjectInput[] = [
  { id: 'b', name: 'Beta', clientOrgId: 'zed', clientName: 'Zed', lastActivityAt: '2026-10-01T09:00:00.000Z' },
  { id: 'a', name: 'alpha', clientOrgId: 'ann', clientName: 'Ann', lastActivityAt: null },
  { id: 'g', name: 'Gamma', clientOrgId: 'ann', clientName: 'Ann', lastActivityAt: '2026-10-05T09:00:00.000Z' },
]

describe('arrangeNavProjects', () => {
  it('sorts by name, ignoring case, by default', () => {
    const r = arrangeNavProjects(P, DEFAULT_NAV_PROJECT_VIEW)
    expect(r.groups).toEqual([{ label: null, clientOrgId: null, ids: ['a', 'b', 'g'] }])
    expect(r.clients).toEqual([
      { orgId: 'ann', name: 'Ann', count: 2 },
      { orgId: 'zed', name: 'Zed', count: 1 },
    ])
    expect([r.shown, r.hidden]).toEqual([3, 0])
  })

  it('sorts by recent activity, nulls last', () => {
    expect(arrangeNavProjects(P, { order: 'recent', clientOrgId: null }).groups[0].ids).toEqual(['g', 'b', 'a'])
  })

  it('groups under each client, clients and projects by name', () => {
    expect(arrangeNavProjects(P, { order: 'client', clientOrgId: null }).groups).toEqual([
      { label: 'Ann', clientOrgId: 'ann', ids: ['a', 'g'] },
      { label: 'Zed', clientOrgId: 'zed', ids: ['b'] },
    ])
  })

  it('filters by client first and reports what is hidden', () => {
    const r = arrangeNavProjects(P, { order: 'name', clientOrgId: 'ann' })
    expect(r.groups[0].ids).toEqual(['a', 'g'])
    expect([r.shown, r.hidden]).toEqual([2, 1])
    expect(r.effective).toEqual({ order: 'name', clientOrgId: 'ann' })
  })

  it('leaves out the client subheading when one client is filtered in, as the chip names it', () => {
    const r = arrangeNavProjects(P, { order: 'client', clientOrgId: 'ann' })
    expect(r.groups).toEqual([{ label: null, clientOrgId: 'ann', ids: ['a', 'g'] }])
  })

  it('treats an unknown client as no filter', () => {
    const r = arrangeNavProjects(P, { order: 'name', clientOrgId: 'nobody' })
    expect(r.groups[0].ids).toEqual(['a', 'b', 'g'])
    expect(r.effective.clientOrgId).toBeNull()
    expect(r.hidden).toBe(0)
  })

  it('orders numbers by value', () => {
    const r = arrangeNavProjects([{ ...P[0], id: 'x10', name: 'Block 10' }, { ...P[0], id: 'x2', name: 'Block 2' }], DEFAULT_NAV_PROJECT_VIEW)
    expect(r.groups[0].ids).toEqual(['x2', 'x10'])
  })
})

describe('the sidebar projects', () => {
  it('sorts the seed by name by default, with the menu figures', () => {
    const s = fresh()
    const nav = navModel(s, viewer(U.priya))!
    const projects = nav.sections.find((x) => x.id === 'projects')!
    expect(projects.items.map((i) => i.label)).toEqual(['Ferrymoor Yard', 'Merrowgate Wharf', 'Sallow Court', 'New project'])
    expect(projects.items.every((i) => i.groupLabel === null)).toBe(true)
    expect(projects.tools).toMatchObject({ kind: 'projects', view: { order: 'name', clientOrgId: null }, hidden: 0, total: 3 })
    expect(nav.sections.find((x) => x.id === 'main')!.tools).toBeNull()
  })

  it('follows the stored view per person: client groups with subheadings, and a client filter', () => {
    const s = fresh()
    const grouped = { ...s, ui: { ...s.ui, navProjects: { [U.priya]: { order: 'client' as const, clientOrgId: null } } } }
    const items = navModel(grouped, viewer(U.priya))!.sections.find((x) => x.id === 'projects')!.items
    const heads = items.filter((i) => i.groupLabel !== null).map((i) => i.groupLabel)
    expect(heads.length).toBeGreaterThan(1)
    expect([...heads].sort((a, b) => a!.localeCompare(b!, 'en-GB'))).toEqual(heads)
    expect(items.filter((i) => i.groupLabel !== null).every((i) => i.groupId !== null)).toBe(true)
    // Another person keeps the default.
    expect(navModel(grouped, viewer(U.marcus))!.sections.find((x) => x.id === 'projects')!.items.every((i) => i.groupLabel === null)).toBe(true)
    const tools = navModel(s, viewer(U.priya))!.sections.find((x) => x.id === 'projects')!.tools!
    const one = tools.clients[0]
    const filtered = { ...s, ui: { ...s.ui, navProjects: { [U.priya]: { order: 'name' as const, clientOrgId: one.orgId } } } }
    const section = navModel(filtered, viewer(U.priya))!.sections.find((x) => x.id === 'projects')!
    expect(section.items.filter((i) => i.id.startsWith('project-')).length).toBe(one.count)
    expect(section.tools!.hidden).toBe(3 - one.count)
    expect(section.items[section.items.length - 1].id).toBe('new-project')
  })
})
