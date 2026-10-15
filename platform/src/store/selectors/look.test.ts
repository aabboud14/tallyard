// Round 2 look fixes in the view models: one role name on sign-in and in the organisation switcher, the client's
// reuse tile judged against the project's own aim with a state that names what it judges, and the sidebar's client
// subheading left out when the filter chip already names the client.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { ROLE_LABELS } from '../../sandbox/accounts'
import { effectiveTargets } from '../sustainabilityRecord'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { navModel } from './nav'
import { sampleAccountCards } from './settings'
import { clientHomeView, reuseStateLabel } from './sustainability-screens'

describe('role names', () => {
  it('the organisation switcher reads the same role name as the sign-in sample list', () => {
    const s = fresh()
    const cards = sampleAccountCards(s)
    for (const who of [U.priya, U.isla, U.tom, U.dana, U.marcus]) {
      const nav = navModel(s, viewer(who))!
      const card = cards.find((c) => c.userId === who)!
      expect(nav.org.roleLabel).toBe(card.roleLabel)
      expect(Object.values(ROLE_LABELS)).toContain(nav.org.roleLabel)
      // Short enough for the 240 px sidebar at 1440 without truncating.
      expect(nav.org.roleLabel.length).toBeLessThanOrEqual(25)
    }
  })
})

describe('the client reuse tile', () => {
  it('uses the project aim the tracking table uses, and its state line names recycled content', () => {
    const s = fresh()
    const v = clientHomeView(s, viewer(U.isla))!
    expect(v.metrics.reuse.aim).toBe(effectiveTargets(s, MERROWGATE_ID).contentByValue)
    expect(v.tiles.reuse.aimText).toBe('25%')
    expect(v.tiles.reuse.stateLabel).toBe('Recycled content off target')
  })

  it('words each state, no bill and no aim', () => {
    expect(reuseStateLabel(0.2, 'good')).toBe('Recycled content on target')
    expect(reuseStateLabel(0.19, 'warning')).toBe('Recycled content near target')
    expect(reuseStateLabel(null, 'neutral')).toBe('No bill yet')
    expect(reuseStateLabel(0.1, 'neutral')).toBe('No content aim set')
  })
})

describe('the sidebar client filter', () => {
  it('leaves out the subheading in client order when one client is filtered in', () => {
    const s = fresh()
    const tools = navModel(s, viewer(U.priya))!.sections.find((x) => x.id === 'projects')!.tools!
    const one = tools.clients[0]
    const st = { ...s, ui: { ...s.ui, navProjects: { [U.priya]: { order: 'client' as const, clientOrgId: one.orgId } } } }
    const items = navModel(st, viewer(U.priya))!.sections.find((x) => x.id === 'projects')!.items
    expect(items.filter((i) => i.id.startsWith('project-')).length).toBe(one.count)
    expect(items.every((i) => i.groupLabel === null)).toBe(true)
  })
})
