import { describe, it, expect } from 'vitest'
import type { Availability, PublicListing } from '../types'
import { NO_FILTERS } from '../v1types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { lotPrivateStrings } from '../privacy/privateStrings'
import { fresh, TODAY } from '../../test/fixtures'
import { marketplaceListings } from '../../store/lots'
import { FERRYMOOR_ID, MERROWGATE_ID } from '../seed/world'
import { filterListings } from './browse'
import { availabilityPhrase, availabilityScale, availableByLabel, monthsAfter, scalePositionOf } from './availability'

const w = createSeed()
const all = Object.values(w.lots).map((lot) => listingFor(w, lot.id, A))
const L = (publicId: string): PublicListing => all.find((l) => l.publicId === publicId)!

const window = (windowStart: string, windowEnd: string): Availability => ({ kind: 'window', level: 'quarter', label: 'not read', windowStart, windowEnd })

describe('availabilityPhrase', () => {
  it('reads a quarter window as a month range, a month window as a month, and now as available now', () => {
    expect(availabilityPhrase(L('L-9F4CQQ').availability)).toEqual({ kind: 'range', text: 'Expected January to March 2027', short: 'Expected Jan to Mar 2027' })
    expect(availabilityPhrase(L('L-6DN4K3').availability)).toEqual({ kind: 'month', text: 'Expected November 2026', short: 'Expected Nov 2026' })
    expect(availabilityPhrase(L('L-2MAC36').availability)).toEqual({ kind: 'now', text: 'Available now', short: 'Available now' })
  })

  it('names both years when the window crosses a year end', () => {
    expect(availabilityPhrase(window('2026-12-01', '2027-02-28'))).toEqual({ kind: 'range', text: 'Expected December 2026 to February 2027', short: 'Expected Dec 2026 to Feb 2027' })
  })

  it('reads only the window, never the label', () => {
    expect(availabilityPhrase({ kind: 'window', level: 'month', label: 'Q4 2026', windowStart: '2026-11-01', windowEnd: '2026-11-30' }).text).toBe('Expected November 2026')
  })

  it('never carries a private string or a quarter label for any seed lot', () => {
    for (const lot of Object.values(w.lots)) {
      const item = w.items[lot.itemId]
      const p = availabilityPhrase(listingFor(w, lot.id, A).availability)
      for (const text of [p.text, p.short]) {
        expect(text).not.toMatch(/Q[1-4] /)
        for (const s of lotPrivateStrings(lot, item, w.buildings[item.buildingId], w)) expect(text).not.toContain(s)
      }
    }
  })
})

describe('availabilityScale', () => {
  const s = fresh()
  const listings = marketplaceListings(s)
  const project = (id: string) => s.world.projects[id]

  it('steps month by month over the 17 marketplace listings at 8 October 2026', () => {
    expect(listings).toHaveLength(17)
    const scale = availabilityScale(listings, TODAY)
    expect(scale.positions).toHaveLength(7)
    expect(scale.positions.map((p) => p.count)).toEqual([11, 1, 0, 4, 0, 0, 1])
    expect(scale.positions.map((p) => p.cumulative)).toEqual([11, 12, 12, 16, 16, 16, 17])
    expect(scale.later).toBe(0)
    expect(scale.anyIndex).toBe(7)
    expect(scale.total).toBe(17)
    expect(scale.positions.map((p) => p.value)).toEqual(['2026-10-08', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
    expect(scale.positions.map((p) => p.short)).toEqual(['Now', 'Nov', 'Dec', 'Jan 2027', 'Feb', 'Mar', 'Apr'])
    expect(scale.positions.map((p) => p.label).slice(0, 2)).toEqual(['Available now', 'By the end of November 2026'])
    expect(scale.positions.map((p) => p.share)).toEqual([1, 0.091, 0, 0.364, 0, 0, 0.091])
    expect(scale.laterShare).toBe(0)
  })

  it('extends to include a project start, up to 24 months, and counts later windows apart', () => {
    expect(project(FERRYMOOR_ID).startDate).toBe('2027-06-08')
    expect(availabilityScale(listings, TODAY, { includeDate: project(FERRYMOOR_ID).startDate }).positions).toHaveLength(8 + 1)
    expect(project(MERROWGATE_ID).startDate).toBe('2028-04-04')
    expect(availabilityScale(listings, TODAY, { includeDate: project(MERROWGATE_ID).startDate }).positions).toHaveLength(18 + 1)
    const far = '2030-02-15'
    expect(monthsAfter(TODAY, far)).toBe(40)
    const late = { ...listings[0], publicId: 'L-LATE01', availability: window('2029-01-01', '2029-03-31') }
    const scale = availabilityScale([...listings, late], TODAY, { includeDate: far })
    expect(scale.positions).toHaveLength(24 + 1)
    expect(scale.positions[24].value).toBe('2028-10-31')
    expect(scale.later).toBe(1)
    expect(scale.positions[24].cumulative).toBe(17)
    expect(scale.total).toBe(18)
  })

  it('keeps at least 6 months when nothing is far off, and handles no listings', () => {
    const scale = availabilityScale([], TODAY)
    expect(scale.positions).toHaveLength(7)
    expect(scale.positions.every((p) => p.count === 0 && p.share === 0)).toBe(true)
    expect(scale.total).toBe(0)
  })

  it('ties every position to the filter: the cumulative count is what filterListings keeps', () => {
    for (const opts of [{}, { includeDate: project(MERROWGATE_ID).startDate }]) {
      const scale = availabilityScale(listings, TODAY, opts)
      for (const p of scale.positions) {
        expect(filterListings(listings, { ...NO_FILTERS, availableBy: p.value }, TODAY).length, p.value).toBe(p.cumulative)
      }
    }
  })
})

describe('scalePositionOf and availableByLabel', () => {
  const scale = availabilityScale(marketplaceListings(fresh()), TODAY)

  it('places a value on the slider, old quarter links on their month', () => {
    expect(scalePositionOf(scale, '2027-01-31')).toBe(3)
    expect(scalePositionOf(scale, '2027-01-01')).toBe(3)
    expect(scalePositionOf(scale, null)).toBe(7)
    expect(scalePositionOf(scale, '2026-10-01')).toBe(0)
    expect(scalePositionOf(scale, '2031-01-01')).toBe(7)
  })

  it('labels a value for the chip', () => {
    expect(availableByLabel(null, TODAY)).toBe('Any time')
    expect(availableByLabel('2026-10-08', TODAY)).toBe('Available now')
    expect(availableByLabel('2027-01-31', TODAY)).toBe('By the end of January 2027')
    expect(availableByLabel('2027-01-15', TODAY)).toBe('By 15 January 2027')
  })
})
