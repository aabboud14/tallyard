// Help, Updated on 16 October: every role sees its own changes first, each linked to a page it can open, and the
// other workspaces' changes without links. Every round 2 change appears once, in plain words.
import { describe, expect, it } from 'vitest'
import { fresh, U, NOW } from '../../test/fixtures'
import { FORBIDDEN } from '../../ui/testing'
import { routeAccess } from './nav'
import { DEFAULT_DISCOVER_QUERY, discoverView } from './discover'
import { ROUND_2_CHANGES, whatChangedView } from './whatChanged'
import { HELP_TOPIC_LABELS } from './arch-breadcrumbs'
import { signUpState } from '../actions/auth'
import { UPGRADE_HELP_TOPIC, UPGRADE_TITLE } from '../upgrade'

const state = fresh()
const viewer = (userId: string) => ({ userId, now: NOW })

describe('whatChangedView', () => {
  it('lists every change once for each sample person, theirs first, each of theirs with a link they can open', () => {
    for (const who of Object.values(U)) {
      const v = whatChangedView(state, viewer(who))
      expect(v.title).toBe('Updated on 16 October')
      expect([...v.yours, ...v.others].map((c) => c.id).sort()).toEqual(ROUND_2_CHANGES.map((c) => c.id).sort())
      expect(v.yours.length).toBeGreaterThan(0)
      for (const c of v.yours) {
        expect(c.link, `${who} ${c.id}`).not.toBeNull()
        expect(routeAccess(state, viewer(who), c.link!.href)).toBe('ok')
      }
      for (const c of v.others) expect(c.link).toBeNull()
    }
  })

  it('points each person at the right places', () => {
    const priya = whatChangedView(state, viewer(U.priya))
    const link = (v: typeof priya, id: string) => [...v.yours, ...v.others].find((c) => c.id === id)?.link?.href ?? null
    expect(priya.yours.map((c) => c.id)).toEqual(['marketplace', 'checking', 'programme', 'requirements', 'sustainability', 'clients-accept', 'dashboards'])
    expect(link(priya, 'marketplace')).toBe('/app/marketplace')
    expect(link(priya, 'programme')).toMatch(/^\/app\/projects\/prj_[A-Za-z0-9]+$/)
    expect(link(priya, 'clients-accept')).toBe('/app/projects/new')
    const isla = whatChangedView(state, viewer(U.isla))
    expect(link(isla, 'clients-accept')).toBe('/app/projects/requests')
    expect(link(isla, 'dashboards')).toBe('/app/home')
    const marcus = whatChangedView(state, viewer(U.marcus))
    expect(link(marcus, 'targets')).toMatch(/\/targets$/)
    const tom = whatChangedView(state, viewer(U.tom))
    expect(tom.yours.map((c) => c.id)).toEqual(['sharing', 'capture', 'donor-buildings', 'dashboards'])
    expect(link(tom, 'sharing')).toMatch(/^\/app\/buildings\/[A-Za-z0-9_-]+\/sharing$/)
    const dana = whatChangedView(state, viewer(U.dana))
    expect(link(dana, 'capture')).toBe('/app/capture')
    expect(dana.others.map((c) => c.id)).toContain('marketplace')
  })

  it('the checking change has its own link, the Marketplace already checking against the first project', () => {
    for (const who of [U.priya, U.isla, U.marcus]) {
      const v = whatChangedView(state, viewer(who))
      const market = v.yours.find((c) => c.id === 'marketplace')!.link!
      const checking = v.yours.find((c) => c.id === 'checking')!.link!
      expect(checking.label, who).not.toBe(market.label)
      expect(checking.href, who).not.toBe(market.href)
      const projectId = new URL(checking.href, 'http://x').searchParams.get('project')
      expect(projectId, who).toMatch(/^prj_/)
      expect(checking.label).toBe(`Check against ${state.world.projects[projectId!].name}`)
      expect(discoverView(state, viewer(who), { ...DEFAULT_DISCOVER_QUERY, projectId }).project?.id, who).toBe(projectId)
    }
  })

  it('a link with a query is checked by its page', () => {
    expect(routeAccess(state, viewer(U.priya), '/app/marketplace?project=prj_x')).toBe('ok')
    expect(routeAccess(state, viewer(U.tom), '/app/marketplace?project=prj_x')).toBe(routeAccess(state, viewer(U.tom), '/app/marketplace'))
  })

  it('names who each change is for, in plain words', () => {
    const v = whatChangedView(state, viewer(U.priya))
    const all = [...v.yours, ...v.others]
    expect(all.find((c) => c.id === 'dashboards')!.forText).toBe('For everyone')
    expect(all.find((c) => c.id === 'targets')!.forText).toBe('For sustainability consultants')
    expect(all.find((c) => c.id === 'marketplace')!.forText).toBe('For architects, clients and sustainability consultants')
    for (const c of all) for (const s of [c.title, c.text, c.forText, c.link?.label ?? '']) expect(s).not.toMatch(FORBIDDEN)
  })

  it('a new practice or owner with nothing yet still gets a link for every change of its own', () => {
    for (const orgType of ['Architect', 'Asset owner', 'Sustainability consultant']) {
      const r = signUpState(state, { name: 'Jo Park', email: `jo.${orgType.length}@parkstudio.example`, orgName: 'Park Studio', orgType, salt: 's', passwordHash: 'h', now: NOW })
      const userId = r.value!
      const v = whatChangedView(r.state, viewer(userId))
      expect(v.yours.length).toBeGreaterThan(0)
      for (const c of v.yours) {
        expect(c.link, `${orgType} ${c.id}`).not.toBeNull()
        expect(routeAccess(r.state, viewer(userId), c.link!.href)).toBe('ok')
      }
      const checking = v.yours.find((c) => c.id === 'checking')
      if (checking) expect(checking.link).toEqual({ href: '/app/marketplace', label: 'Choose a project to check against' })
    }
  })

  it('is the Help topic the breadcrumbs name', () => {
    expect(HELP_TOPIC_LABELS[UPGRADE_HELP_TOPIC]).toBe(UPGRADE_TITLE)
  })
})
