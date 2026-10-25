// The command palette finds the tabs inside project and building folders (recording audit, owner incidental): the
// owner's "recovery", "sharing" and "inventory" lead to each building's tab, and a project's tabs to that project.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { buildingsOfUser } from '../access'
import { routeAccess } from './index'
import { searchEntries, searchIndex } from './search'

describe('palette tabs', () => {
  it('finds each building tab for the donor building owner', () => {
    const s = fresh()
    const tom = searchIndex(s, viewer(U.tom))
    const buildings = buildingsOfUser(s, U.tom)
    for (const word of ['recovery', 'sharing', 'inventory']) {
      const hits = searchEntries(tom, word)
      expect(hits.length, word).toBeGreaterThan(0)
      expect(hits[0].kind, word).toBe('page')
      expect(buildings.map((b) => b.name), word).toContain(hits[0].sublabel)
    }
    const first = buildings[0]
    const recovery = searchEntries(tom, `${first.name} recovery`)
    expect(recovery[0]).toMatchObject({ label: 'Recovery plan', sublabel: first.name, href: `/app/buildings/${first.id}/priorities` })
  })

  it('finds a project tab, keeps the empty list to pages and folders, and leads only where the viewer may go', () => {
    const s = fresh()
    for (const userId of [U.priya, U.tom, U.isla, U.marcus, U.dana]) {
      const index = searchIndex(s, viewer(userId))
      expect(new Set(index.map((e) => e.id)).size, userId).toBe(index.length)
      expect(searchEntries(index, '').some((e) => e.inside), userId).toBe(false)
      for (const e of index.filter((x) => x.inside)) expect(routeAccess(s, viewer(userId), e.href.split('?')[0]), `${userId} ${e.href}`).toBe('ok')
    }
    const priya = searchIndex(s, viewer(U.priya))
    expect(searchEntries(priya, 'merrowgate shortlist')[0]).toMatchObject({ label: 'Shortlist', sublabel: 'Merrowgate Wharf', href: `/app/projects/${MERROWGATE_ID}/shortlist` })
    expect(searchEntries(priya, 'merrow')[0]).toMatchObject({ kind: 'project', label: 'Merrowgate Wharf' })
  })
})
