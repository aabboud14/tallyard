import { describe, expect, it } from 'vitest'
import { fresh, U, viewer, TODAY } from '../../test/fixtures'
import { FERRYMOOR_ID, MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { marketplaceListings } from '../lots'
import { DEFAULT_DISCOVER_QUERY as Q, discoverView } from './discover'
import { projectRef } from './common'
import { availabilityFilterView, CATEGORY_COPY, categoryFolders, fitSummary, newForProjectsFeed, NEW_LISTING_LIMIT } from './marketplace'

describe('category folders', () => {
  it('counts every marketplace listing by typology, families in the reference order', () => {
    const s = fresh()
    const folders = categoryFolders(s, viewer(U.priya), null, marketplaceListings(s))
    expect(folders.map((f) => [f.typology, f.count, f.families.map((x) => x.family)])).toEqual([
      ['structure', 11, ['steel_section', 'timber_joist']],
      ['envelope', 5, ['curtain_wall', 'precast_cladding', 'stone_cladding', 'clay_brick']],
      ['finishes', 1, ['raised_floor']],
    ])
    expect(folders.map((f) => [f.label, f.description])).toEqual([
      ['Structure', CATEGORY_COPY.structure.description],
      ['Envelope', CATEGORY_COPY.envelope.description],
      ['Finishes', CATEGORY_COPY.finishes.description],
    ])
    expect(folders[0].thumbs[0].publicId).toBe('L-9F4CQQ')
    expect(folders.every((f) => f.thumbs.length <= 3 && f.thumbs.length === Math.min(3, f.count))).toBe(true)
    expect(folders.every((f) => f.fitsCount === null)).toBe(true)
  })

  it('counts what arrives in time for a checked project', () => {
    const s = fresh()
    const all = marketplaceListings(s)
    const ferry = categoryFolders(s, viewer(U.priya), s.world.projects[FERRYMOOR_ID], all)
    expect(ferry.find((f) => f.typology === 'envelope')!.fitsCount).toBe(4)
    const merrow = categoryFolders(s, viewer(U.priya), s.world.projects[MERROWGATE_ID], all)
    expect(merrow.find((f) => f.typology === 'structure')!.fitsCount).toBe(11)
  })
})

describe('fit summary', () => {
  it('counts the shown cards by fit, or nothing without a project', () => {
    const s = fresh()
    expect(fitSummary(discoverView(s, viewer(U.priya), Q).cards)).toBeNull()
    expect(fitSummary(discoverView(s, viewer(U.priya), { ...Q, projectId: MERROWGATE_ID }).cards)).toEqual({ now: 10, in_time: 7, tight: 0, late: 0 })
    expect(fitSummary(discoverView(s, viewer(U.priya), { ...Q, projectId: FERRYMOOR_ID }).cards)).toEqual({ now: 10, in_time: 6, tight: 1, late: 0 })
    expect(discoverView(s, viewer(U.priya), { ...Q, projectId: FERRYMOOR_ID }).fitSummary).toEqual({ now: 10, in_time: 6, tight: 1, late: 0 })
  })
})

describe('new for your projects', () => {
  it('lists new listings in time for the architect, newest first, none already saved', () => {
    const s = fresh()
    const feed = newForProjectsFeed(s, viewer(U.priya), null)
    expect(feed[0].publicId).toBe('L-9F4CQQ')
    expect(feed.length).toBeLessThanOrEqual(NEW_LISTING_LIMIT)
    expect(feed.every((c) => c.savedIn.length === 0 && c.fitsProjects.length > 0)).toBe(true)
    const months = feed.map((c) => c.listing.listedMonth)
    expect([...months].sort().reverse()).toEqual(months)
  })

  it('narrows to a project the architect works on, checked against it', () => {
    const s = fresh()
    const merrow = newForProjectsFeed(s, viewer(U.priya), MERROWGATE_ID)
    expect(merrow.length).toBeGreaterThan(0)
    expect(merrow.every((c) => c.fitsProjects.some((p) => p.id === MERROWGATE_ID))).toBe(true)
    expect(merrow.every((c) => c.fit !== null && c.fit.fit !== 'late')).toBe(true)
    const sallow = newForProjectsFeed(s, viewer(U.priya), SALLOW_ID)
    expect(sallow.every((c) => c.fitsProjects.some((p) => p.id === SALLOW_ID))).toBe(true)
    expect(newForProjectsFeed(s, viewer(U.priya), MERROWGATE_ID, 2).length).toBeLessThanOrEqual(2)
  })

  it('is empty for anyone who is not an architect', () => {
    const s = fresh()
    expect(newForProjectsFeed(s, viewer(U.isla), null)).toEqual([])
    expect(newForProjectsFeed(s, viewer(U.marcus), MERROWGATE_ID)).toEqual([])
    expect(newForProjectsFeed(s, viewer(U.tom), null)).toEqual([])
  })
})

describe('availability filter view', () => {
  it('places the selection and the checked project on the month scale', () => {
    const s = fresh()
    const all = marketplaceListings(s)
    const none = availabilityFilterView(all, Q, null, TODAY)
    expect(none.projectIndex).toBeNull()
    expect(none.projectName).toBeNull()
    expect(none.selectedIndex).toBe(none.anyIndex)
    expect(none.selectedLabel).toBe('Any time')
    const ferry = availabilityFilterView(all, { ...Q, availableBy: '2027-01-31' }, projectRef(s, s.world.projects[FERRYMOOR_ID]), TODAY)
    expect(ferry.projectIndex).toBe(8)
    expect(ferry.projectName).toBe('Ferrymoor Yard')
    expect(ferry.selectedIndex).toBe(3)
    expect(ferry.selectedLabel).toBe('By the end of January 2027')
  })
})
