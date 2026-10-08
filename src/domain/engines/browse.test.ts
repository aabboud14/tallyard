import { describe, it, expect } from 'vitest'
import type { PublicListing } from '../types'
import { NO_FILTERS } from '../v1types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed } from '../seed/world'
import { browseListings } from '../visibility'
import { filterListings, filterOptions, filterOptionsFor, nextQuarterStarts, sortListings, withTypology } from './browse'
import { typologyOf } from './typology'

const w = createSeed()
const open = browseListings(w, A)
const ids = (ls: PublicListing[]) => ls.map((l) => l.publicId)
const has = (ls: PublicListing[], id: string) => ids(ls).includes(id)

describe('filterListings', () => {
  it('keeps everything with no filters, without changing the input', () => {
    const before = ids(open)
    expect(ids(filterListings(open, NO_FILTERS))).toEqual(before)
    expect(ids(open)).toEqual(before)
  })

  it('filters by typology', () => {
    const structure = filterListings(open, { ...NO_FILTERS, typology: 'structure' })
    expect(structure.length).toBeGreaterThan(0)
    expect(new Set(structure.map((l) => l.family))).toEqual(new Set(['steel_section', 'timber_joist']))
    expect(new Set(filterListings(open, { ...NO_FILTERS, typology: 'finishes' }).map((l) => l.family))).toEqual(new Set(['raised_floor']))
    expect(new Set(filterListings(open, { ...NO_FILTERS, typology: 'envelope' }).map((l) => l.family))).toEqual(new Set(['curtain_wall', 'precast_cladding', 'stone_cladding', 'clay_brick']))
  })

  it('filters by family and condition', () => {
    expect(ids(filterListings(open, { ...NO_FILTERS, family: 'clay_brick' }))).toEqual(['L-8WARGH', 'L-A945G6'])
    expect(ids(filterListings(open, { ...NO_FILTERS, family: 'clay_brick', condition: 'C' }))).toEqual(['L-8WARGH'])
  })

  it('keeps listings available now or from a window starting on or before the date', () => {
    const byQ1 = filterListings(open, { ...NO_FILTERS, availableBy: '2027-01-01' })
    expect(has(byQ1, 'L-NHZ32R')).toBe(true) // now
    expect(has(byQ1, 'L-6DN4K3')).toBe(true) // November 2026
    expect(has(byQ1, 'L-53XY6Y')).toBe(true) // Q1 2027 starts on the date
    expect(has(byQ1, 'L-9XXQC3')).toBe(false) // Q2 2027
    expect(has(filterListings(open, { ...NO_FILTERS, availableBy: '2026-12-31' }), 'L-53XY6Y')).toBe(false)
    expect(has(filterListings(open, { ...NO_FILTERS, availableBy: '2027-04-01' }), 'L-9XXQC3')).toBe(true)
  })

  it('filters by region on the public location label', () => {
    const east = filterListings(open, { ...NO_FILTERS, region: 'East of England' })
    expect(east.length).toBeGreaterThan(0)
    for (const l of east) expect(l.location.label).toBe('East of England')
  })

  it('filters by sustainability band', () => {
    expect(new Set(filterListings(open, { ...NO_FILTERS, band: 'medium' }).map((l) => l.family))).toEqual(new Set(['stone_cladding']))
    expect(new Set(filterListings(open, { ...NO_FILTERS, band: 'low' }).map((l) => l.family))).toEqual(new Set(['raised_floor']))
    const none = filterListings(open, { ...NO_FILTERS, band: 'none' })
    expect(ids(none).sort()).toEqual(['L-R7ZRMD', 'L-YZ2C7H'])
  })

  it('keeps listings that are not late for the start date', () => {
    const fits = filterListings(open, { ...NO_FILTERS, fitsStartDate: '2027-03-01' })
    expect(has(fits, 'L-9XXQC3')).toBe(false) // Q2 2027 starts after
    expect(has(fits, 'L-53XY6Y')).toBe(true) // Q1 2027, tight
    expect(has(fits, 'L-NHZ32R')).toBe(true) // now
    expect(has(filterListings(open, { ...NO_FILTERS, fitsStartDate: '2027-04-01' }), 'L-9XXQC3')).toBe(true)
  })

  it('combines filters', () => {
    const r = filterListings(open, { ...NO_FILTERS, typology: 'structure', condition: 'A', availableBy: '2026-10-07' })
    for (const l of r) {
      expect(['steel_section', 'timber_joist']).toContain(l.family)
      expect(l.condition).toBe('A')
    }
    expect(has(r, 'L-YZ2C7H')).toBe(true)
  })
})

describe('sortListings', () => {
  it('sorts by most carbon avoided, nothing claimed last, ties by public ID', () => {
    const r = sortListings(open, 'carbon')
    expect(r[0].publicId).toBe('L-9XXQC3')
    const firstNull = r.findIndex((l) => l.carbon === null)
    expect(r.slice(firstNull).every((l) => l.carbon === null)).toBe(true)
    expect(ids(r.slice(firstNull))).toEqual(['L-R7ZRMD', 'L-YZ2C7H'])
    for (let i = 1; i < firstNull; i++) expect(r[i - 1].carbon!.avoidedT).toBeGreaterThanOrEqual(r[i].carbon!.avoidedT)
  })

  it('sorts by lowest guide price, ties by public ID', () => {
    const r = sortListings(open, 'price')
    expect(r[0].publicId).toBe('L-8WARGH')
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].price.guide).toBeLessThanOrEqual(r[i].price.guide)
      if (r[i - 1].price.guide === r[i].price.guide) expect(r[i - 1].publicId < r[i].publicId).toBe(true)
    }
  })

  it('sorts by newest listed month, ties by public ID, without changing the input', () => {
    const input = open.map((l) => (l.publicId === 'L-YJ4Z6W' ? { ...l, listedMonth: '2026-10' } : l.publicId === 'L-A945G6' ? { ...l, listedMonth: '2026-08' } : l))
    const before = ids(input)
    const r = sortListings(input, 'newest')
    expect(r[0].publicId).toBe('L-YJ4Z6W')
    expect(r[r.length - 1].publicId).toBe('L-A945G6')
    const middle = ids(r.slice(1, -1))
    expect(middle).toEqual([...middle].sort())
    expect(ids(input)).toEqual(before)
  })
})

describe('filterOptions', () => {
  it('lists the families, regions and conditions present', () => {
    const o = filterOptions(open)
    expect(o.families).toEqual(['steel_section', 'curtain_wall', 'precast_cladding', 'stone_cladding', 'clay_brick', 'raised_floor', 'timber_joist'])
    expect(o.regions).toEqual([...new Set(open.map((l) => l.location.label))].sort())
    expect(o.conditions).toEqual(['A', 'B', 'C'])
    const steelOnly = filterOptions(open.filter((l) => l.family === 'steel_section' && l.condition === 'A'))
    expect(steelOnly.families).toEqual(['steel_section'])
    expect(steelOnly.conditions).toEqual(['A'])
  })

  it('offers the next six quarter starts after the demo date', () => {
    expect(filterOptions(open).availability).toEqual([
      { value: '2027-01-01', label: 'Q1 2027' },
      { value: '2027-04-01', label: 'Q2 2027' },
      { value: '2027-07-01', label: 'Q3 2027' },
      { value: '2027-10-01', label: 'Q4 2027' },
      { value: '2028-01-01', label: 'Q1 2028' },
      { value: '2028-04-01', label: 'Q2 2028' },
    ])
  })

  it('counts from the next quarter even on a quarter start', () => {
    expect(nextQuarterStarts('2027-01-01', 2)).toEqual([
      { value: '2027-04-01', label: 'Q2 2027' },
      { value: '2027-07-01', label: 'Q3 2027' },
    ])
  })
})

describe('typology and family together', () => {
  const all = browseListings(createSeed(), A)

  it('offers only the families of the chosen typology', () => {
    const structure = filterOptionsFor(all, 'structure')
    expect(structure.families.length).toBeGreaterThan(0)
    for (const id of structure.families) expect(typologyOf(id)).toBe('structure')
    expect(structure.families).not.toContain('clay_brick')
    expect(structure.families).not.toContain('curtain_wall')
    expect(filterOptionsFor(all, null)).toEqual(filterOptions(all))
    for (const id of structure.families) expect(filterListings(all, { ...NO_FILTERS, typology: 'structure', family: id }).length).toBeGreaterThan(0)
  })

  it('clears a family outside a newly chosen typology and keeps one inside it', () => {
    const brick = { ...NO_FILTERS, family: 'clay_brick' as const }
    expect(withTypology(brick, 'structure')).toEqual({ ...NO_FILTERS, typology: 'structure', family: null })
    expect(withTypology(brick, 'envelope')).toEqual({ ...NO_FILTERS, typology: 'envelope', family: 'clay_brick' })
    expect(withTypology(brick, null)).toEqual({ ...NO_FILTERS, typology: null, family: 'clay_brick' })
  })
})
