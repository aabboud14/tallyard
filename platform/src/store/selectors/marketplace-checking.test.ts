// The checking strip thumbnail for the project the Marketplace checks against, and the material page key facts.
import { describe, expect, it } from 'vitest'
import { fresh, U, viewer } from '../../test/fixtures'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { DEFAULT_DISCOVER_QUERY as Q, discoverView, materialView } from './discover'
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
