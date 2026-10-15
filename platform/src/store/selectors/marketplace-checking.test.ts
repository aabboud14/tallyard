// The checking strip thumbnail for the project the Marketplace checks against, and the material page key facts.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { FERRYMOOR_ID, MERROWGATE_ID } from '../../domain/seed/world'
import { DEFAULT_DISCOVER_QUERY as Q, discoverView, materialView, SHOWN_ABOVE_SPEC } from './discover'
import { checkingProjectSketch } from './marketplace'

describe('checking project sketch', () => {
  it('draws the checked project from the families on its live shortlist', () => {
    const s = fresh()
    const sk = checkingProjectSketch(s, viewer(U.priya), MERROWGATE_ID)!
    expect(sk.seed).toBe(MERROWGATE_ID)
    expect(sk.state).toBe('proposed')
    expect(sk.frame).toBe('steel')
    expect(sk.label).toContain('drawn from its shortlisted materials')
  })

  it('is null without a project, or for a project the viewer does not work on', () => {
    const s = fresh()
    expect(checkingProjectSketch(s, viewer(U.priya), null)).toBeNull()
    expect(checkingProjectSketch(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })

  it('reaches the Marketplace view only with a checked project, and only architects may create one from the strip', () => {
    const s = fresh()
    expect(discoverView(s, viewer(U.priya), Q).projectSketch).toBeNull()
    expect(discoverView(s, viewer(U.priya), { ...Q, projectId: MERROWGATE_ID }).projectSketch!.seed).toBe(MERROWGATE_ID)
    expect(discoverView(s, viewer(U.priya), Q).canCreateProject).toBe(true)
    expect(discoverView(s, viewer(U.isla), Q).canCreateProject).toBe(false)
  })
})

describe('material key facts', () => {
  it('lists the facts in the material page order, with availability in its own section', () => {
    const m = materialView(fresh(), viewer(U.priya), 'L-9F4CQQ', null)!
    expect(m.keyFacts.map((k) => k.label)).toEqual(['Quantity', 'Mass', 'Condition', 'Test status', 'Location', 'Collection point'])
    expect(m.keyFacts.find((k) => k.label === 'Collection point')?.value).toBe('From the source site')
  })
})

describe('material specification', () => {
  it('keeps only the rows not shown above it, so nothing is said twice', () => {
    const s = fresh()
    const m = materialView(s, viewer(U.priya), 'L-9F4CQQ', MERROWGATE_ID)!
    const labels = m.specSections.flatMap((x) => x.rows.map((r) => r.label))
    expect(m.specSections.map((x) => x.section)).toEqual(['Material and dimensions', 'Condition and testing'])
    expect(labels).toContain('Grade')
    expect(labels.some((l) => SHOWN_ABOVE_SPEC.has(l))).toBe(false)
    for (const k of m.keyFacts) expect(labels).not.toContain(k.label)
    // No carbon or timeline figure is left in the table, so it needs no Indicative marker of its own.
    expect(JSON.stringify(m.specSections)).not.toMatch(/tCO2e|in time|storage/i)
    const brick = materialView(s, viewer(U.priya), 'L-A945G6', null)!
    expect(brick.specSections.map((x) => x.section)).toEqual(['Material and dimensions'])
  })

  it('names the checked project when the lot is not shared with it', () => {
    const s = fresh()
    const m = materialView(s, viewer(U.priya), 'L-WPX5A6', FERRYMOOR_ID)!
    expect(m.project).toBeNull()
    expect(m.notSharedWith).toBe('Ferrymoor Yard')
    expect(m.availability.byProject.map((p) => p.name)).toEqual(['Merrowgate Wharf'])
    expect(materialView(s, viewer(U.priya), 'L-WPX5A6', MERROWGATE_ID)!.notSharedWith).toBeNull()
    expect(materialView(s, viewer(U.priya), 'L-9F4CQQ', FERRYMOOR_ID)!.notSharedWith).toBeNull()
    expect(materialView(s, viewer(U.priya), 'L-9F4CQQ', null)!.notSharedWith).toBeNull()
  })
})

describe('new for your projects on the landing', () => {
  it('shows four and holds the rest for Show all', () => {
    const v = discoverView(fresh(), viewer(U.priya), Q)
    expect(v.newForProjects).toHaveLength(4)
    expect(v.newForProjectsTotal).toBe(v.newForProjects.length + v.newForProjectsMore.length)
    expect(v.newForProjectsTotal).toBe(10)
    expect(new Set([...v.newForProjects, ...v.newForProjectsMore].map((c) => c.publicId)).size).toBe(10)
    const isla = discoverView(fresh(), viewer(U.isla), Q)
    expect([isla.newForProjects.length, isla.newForProjectsMore.length, isla.newForProjectsTotal]).toEqual([0, 0, 0])
  })
})
