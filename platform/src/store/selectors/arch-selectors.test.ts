// The architect workspace's extra selectors: Discover's address bar round trip, the project Discover checks
// against, breadcrumbs that never name what the viewer cannot open, and activity grouped by day.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer, NOW } from '../../test/fixtures'
import { FERRYMOOR_ID, MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { DEFAULT_DISCOVER_QUERY, type DiscoverQuery } from './discover'
import { checkingProjectFor, clearDiscoverFilters, discoverParamsFor, discoverQueryFromParams } from './arch-discover'
import { pageLocation, slugLabel } from './arch-breadcrumbs'
import { activityByDay, projectActivityDays } from './arch-activity'
import type { ActivityRow } from './common'
import { projectFields } from './arch-project'
import { searchResults } from './arch-search'

const params = (o: Record<string, string>) => new URLSearchParams(o)

describe('Discover query in the address bar', () => {
  it('writes nothing for the default query', () => {
    expect(discoverParamsFor(DEFAULT_DISCOVER_QUERY)).toEqual({})
  })

  it('round trips every field', () => {
    const q: DiscoverQuery = { tab: 'shared', q: 'stone', typology: 'envelope', family: 'stone_cladding', availableBy: '2027-04-01', condition: 'B', region: 'Central London', band: 'medium', fitsOnly: true, sort: 'carbon', projectId: MERROWGATE_ID }
    const back = discoverQueryFromParams(params(discoverParamsFor(q)), MERROWGATE_ID)
    expect(back).toEqual(q)
  })

  it('ignores values it does not know', () => {
    const q = discoverQueryFromParams(params({ tab: 'deals', type: 'roof', family: 'unobtainium', by: 'soon', condition: 'Z', band: 'gold', sort: 'cheapest', fits: 'yes' }), null)
    expect(q).toEqual(DEFAULT_DISCOVER_QUERY)
  })

  it('clears only the Filters popover fields', () => {
    const q: DiscoverQuery = { ...DEFAULT_DISCOVER_QUERY, q: 'beam', typology: 'structure', family: 'steel_section', condition: 'A', fitsOnly: true, sort: 'carbon', projectId: SALLOW_ID }
    expect(clearDiscoverFilters(q)).toEqual({ ...DEFAULT_DISCOVER_QUERY, q: 'beam', typology: 'structure', sort: 'carbon', projectId: SALLOW_ID })
  })
})

describe('checkingProjectFor', () => {
  it('defaults to the first project the viewer works on', () => {
    expect(checkingProjectFor(fresh(), viewer(U.priya), null)).toBe(MERROWGATE_ID)
  })

  it('takes a project in the address only when the viewer works on it', () => {
    const s = fresh()
    expect(checkingProjectFor(s, viewer(U.priya), FERRYMOOR_ID)).toBe(FERRYMOOR_ID)
    expect(checkingProjectFor(s, viewer(U.isla), FERRYMOOR_ID)).toBe(MERROWGATE_ID)
  })

  it('keeps a stored choice, including choosing none', () => {
    const s = fresh()
    const withSallow = { ...s, ui: { ...s.ui, checkingProjectId: { [U.priya]: SALLOW_ID } } }
    expect(checkingProjectFor(withSallow, viewer(U.priya), null)).toBe(SALLOW_ID)
    const none = { ...s, ui: { ...s.ui, checkingProjectId: { [U.priya]: null } } }
    expect(checkingProjectFor(none, viewer(U.priya), null)).toBeNull()
  })

  it('is null for a person with no projects', () => {
    expect(checkingProjectFor(fresh(), viewer(U.tom), null)).toBeNull()
  })
})

describe('pageLocation', () => {
  const s = fresh()
  const priya = viewer(U.priya)

  it('names a project and its tab, the last crumb without a link', () => {
    const loc = pageLocation(s, priya, `/app/projects/${MERROWGATE_ID}/shortlist`)
    expect(loc.crumbs).toEqual([
      { label: 'Projects', href: '/app/projects' },
      { label: 'Merrowgate Wharf', href: `/app/projects/${MERROWGATE_ID}` },
      { label: 'Shortlist', href: null },
    ])
    expect(loc.title).toBe('Shortlist')
  })

  it('names a material from its public listing', () => {
    const loc = pageLocation(s, priya, '/app/discover/L-9F4CQQ')
    expect(loc.crumbs.map((c) => c.label)).toEqual(['Discover', 'UB 457x191x67, 7.5 m'])
  })

  it('never names a project the viewer does not work on', () => {
    const loc = pageLocation(s, viewer(U.tom), `/app/projects/${MERROWGATE_ID}/shortlist`)
    expect(loc.crumbs).toEqual([{ label: 'Projects', href: null }])
    expect(JSON.stringify(loc)).not.toContain('Merrowgate')
  })

  it('reads settings and help sections in words', () => {
    expect(pageLocation(s, priya, '/app/settings/team').crumbs.map((c) => c.label)).toEqual(['Settings', 'Team'])
    expect(pageLocation(s, priya, '/app/help/methodology').title).toBe('Methodology')
    expect(pageLocation(s, priya, '/app/home').title).toBe('Home')
    expect(pageLocation(s, priya, '/app/nowhere').title).toBe('Page not found')
  })

  it('turns slugs into sentence case', () => {
    expect(slugLabel('version-2')).toBe('Version 2')
    expect(slugLabel('getting-started')).toBe('Getting started')
  })
})

describe('activityByDay', () => {
  const row = (id: string, at: string): ActivityRow => ({ id, at, timeAgo: '', actor: 'Priya Nair', text: 'did something', href: null, initials: 'PN', projectId: null, buildingId: null })

  it('groups newest first rows into days in order', () => {
    const days = activityByDay([row('a', '2026-10-08T09:00:00.000Z'), row('b', '2026-10-08T08:00:00.000Z'), row('c', '2026-10-07T12:00:00.000Z'), row('d', '2026-10-01T12:00:00.000Z')], NOW)
    expect(days.map((d) => [d.label, d.rows.map((r) => r.id)])).toEqual([
      ['Today', ['a', 'b']],
      ['Yesterday', ['c']],
      ['1 October 2026', ['d']],
    ])
  })

  it('gives a project feed only to people on the project', () => {
    const s = fresh()
    const mine = projectActivityDays(s, viewer(U.priya), MERROWGATE_ID)
    expect(mine).not.toBeNull()
    expect(mine!.total).toBeGreaterThan(0)
    expect(projectActivityDays(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })
})

describe('projectFields', () => {
  it('gives the architect the editable fields and nobody else', () => {
    const s = fresh()
    const f = projectFields(s, viewer(U.priya), MERROWGATE_ID)
    expect(f?.name).toBe('Merrowgate Wharf')
    expect(f?.projectType).toBe('office')
    expect(projectFields(s, viewer(U.isla), MERROWGATE_ID)).toBeNull()
    expect(projectFields(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })
})

describe('searchResults', () => {
  it('groups results by kind, with a picture for materials from the public listing', () => {
    const groups = searchResults(fresh(), viewer(U.priya), 'stone')
    const materials = groups.find((g) => g.kind === 'material')
    expect(materials?.heading).toBe('Materials')
    expect(materials?.results[0].thumb?.publicId).toBe('L-Q23X7N')
    expect(materials?.results[0].href).toBe('/app/discover/L-Q23X7N')
  })

  it('offers pages and projects before anything is typed, and no materials to an owner', () => {
    const empty = searchResults(fresh(), viewer(U.priya), '')
    expect(empty.map((g) => g.kind)).toEqual(['page', 'project'])
    expect(searchResults(fresh(), viewer(U.tom), 'stone').some((g) => g.kind === 'material')).toBe(false)
  })
})
