import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { DEMO_TODAY } from '../constants'
import { createSeed, itemByTag, lotForItem, MERROWGATE_ID, TIVERNE_ID } from '../seed/world'
import { createTwinSeed, TWIN_RESERVE } from '../../test/twin'
import { toPublicListing, PUBLIC_LISTING_KEYS } from './publicListing'
import { toBlindBuyer, blindBuyerText } from './blindBuyer'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from './privateStrings'
import { listingsVisibleToProject, listingFor } from '../visibility'
import { matchSchedule } from '../engines/matcher'
import { buyerPackage, sellerPackage, confirmedStorageMonths } from '../engines/package'
import { negotiate } from '../engines/negotiation'
import { facilityById } from '../reference/assumptions'
import type { World } from '../types'

function publishTh01(w: World, reserve: number) {
  const lot = lotForItem(w, itemByTag(w, 'TH-01').id)
  lot.visibility = 'open'
  lot.listedMonth = '2026-10'
  lot.askPerUnit = 800
  lot.reservePerUnit = reserve
  return lot
}

function allProjections(w: World) {
  return Object.values(w.lots).map((lot) => {
    const item = w.items[lot.itemId]
    return { lot, item, building: w.buildings[item.buildingId], listing: toPublicListing(lot, item, w.buildings[item.buildingId], w.snapshot, A) }
  })
}

describe('B15 and P1: privacy at data level', () => {
  const w = createSeed()
  publishTh01(w, 730)
  it('P1 every seeded projection has exactly the 21 keys and none of the private strings', () => {
    for (const p of allProjections(w)) {
      expect(Object.keys(p.listing).sort()).toEqual([...PUBLIC_LISTING_KEYS].sort())
      const text = JSON.stringify(p.listing)
      for (const s of lotPrivateStrings(p.lot, p.item, p.building, w)) {
        expect(text, `${p.item.tag} leaks "${s}"`).not.toContain(s)
      }
      expect(text).not.toMatch(INTERNAL_ID)
    }
  })
  it('B15.1 the projection of TH-01 after step 3', () => {
    const item = itemByTag(w, 'TH-01')
    const l = toPublicListing(lotForItem(w, item.id), item, w.buildings[TIVERNE_ID], w.snapshot, A)
    expect(l.publicId).toBe('L-9F4CQQ')
    expect(l.sharing).toBe('open')
    expect(l.family).toBe('steel_section')
    expect(l.title).toBe('UB 457x191x67, 7.5 m')
    expect(l.quantity.pieces).toBe(48)
    closeTo(l.massT, 24.156, 3)
    expect(l.condition).toBe('A')
    expect(l.testStatus).toBe('untested')
    expect(l.grade).toBe('unknown')
    expect(l.sourceType).toBe('deconstruction')
    expect(l.sellerType).toBe('Asset owner')
    expect(l.eraBand).toBe('1970 or later')
    expect(l.location).toEqual({ level: 'region', label: 'Central London' })
    expect(l.availability).toEqual({ kind: 'window', level: 'quarter', label: 'Q1 2027', windowStart: '2027-01-01', windowEnd: '2027-03-31' })
    expect(l.collectionHubId).toBeNull()
    expect(l.listedMonth).toBe('2026-10')
    expect(l.status).toBe('Available')
    expect(l.price).toEqual({ guide: 770, low: 715, high: 825, signal: 'high' })
    closeTo(l.carbon!.avoidedT, 41.0037, 4)
    expect(l.photos).toEqual([])
  })
  it('B15.2 OS-11 and OS-17 projections', () => {
    const os11 = itemByTag(w, 'OS-11')
    const l11 = toPublicListing(lotForItem(w, os11.id), os11, w.buildings[os11.buildingId], w.snapshot, A)
    expect(l11.collectionHubId).toBe('HUB-BARK')
    expect(l11.availability).toEqual({ kind: 'now' })
    expect(l11.eraBand).toBe('1970 or later')
    expect(l11.photos).toEqual([])
    const os17 = itemByTag(w, 'OS-17')
    const l17 = toPublicListing(lotForItem(w, os17.id), os17, w.buildings[os17.buildingId], w.snapshot, A)
    expect(l17.eraBand).toBeNull()
    expect(l17.sourceType).toBe('unused_surplus')
    expect(l17.carbon).toBeNull()
  })
  it('the blind buyer has four keys and renders as one line', () => {
    const b = toBlindBuyer(w.projects[MERROWGATE_ID])
    expect(Object.keys(b).sort()).toEqual(['needByQuarter', 'orgType', 'projectType', 'region'])
    expect(blindBuyerText(b)).toBe('Design team, commercial project, Inner London East, needed by Q2 2028')
    const text = JSON.stringify(b)
    for (const s of projectPrivateStrings(w.projects[MERROWGATE_ID], w)) expect(text).not.toContain(s)
  })
})

describe('P5a: an unapproved project gets no matched-only lot', () => {
  it('whatever schedule it is given', () => {
    const w = createSeed()
    const p = { ...w.projects[MERROWGATE_ID], termsAccepted: true, approvedByOwnerOrgIds: [] }
    const visible = listingsVisibleToProject(w, p, A)
    expect(visible.every((l) => l.sharing === 'open')).toBe(true)
    const r = matchSchedule(p.requirements, visible, DEMO_TODAY, A)
    const ids = r.results.flatMap((x) => x.allocations.map((a) => a.publicId))
    for (const id of ['L-WPX5A6', 'L-MNY55K', 'L-2R8X5N', 'L-775DW8', 'L-FQK92P']) expect(ids).not.toContain(id)
    const other = matchSchedule([{ ref: 'X1', designation: 'UB 533x210x92', lengthM: 5, count: 1, minGrade: 'S275', needBy: '2028-04-03' }], visible, DEMO_TODAY, A)
    expect(other.results[0].allocations.map((a) => a.publicId)).not.toContain('L-WPX5A6')
  })
})

describe('P2: twin test', () => {
  const o = createSeed()
  const t = createTwinSeed()
  publishTh01(o, 730)
  publishTh01(t, TWIN_RESERVE)
  it('every public projection is identical', () => {
    const po = allProjections(o).map((p) => p.listing)
    const pt = allProjections(t).map((p) => p.listing)
    expect(pt).toEqual(po)
  })
  it('the matcher result is identical', () => {
    const run = (w: World) => {
      const p = { ...w.projects[MERROWGATE_ID], termsAccepted: true }
      return matchSchedule(p.requirements, listingsVisibleToProject(w, p, A), DEMO_TODAY, A)
    }
    expect(run(t)).toEqual(run(o))
  })
  it("the buyer's package estimate at the guide and the agreed price is identical, and the negotiation log too", () => {
    const est = (w: World, price: number) => {
      const l = listingFor(w, lotForItem(w, itemByTag(w, 'TH-01').id).id, A)
      return buyerPackage({ family: 'steel_section', pieces: 48, units: l.massT, massT: l.massT, baselineQty: 23.18976, pricePerUnit: price, testing: true, route: 'hub', facility: facilityById('HUB-TILB'), kmToProject: 31, storageMonths: 16 }, A)
    }
    expect(est(t, 770)).toEqual(est(o, 770))
    expect(est(t, 740)).toEqual(est(o, 740))
    const neg = (w: World) => {
      const lot = lotForItem(w, itemByTag(w, 'TH-01').id)
      return negotiate({ ask: lot.askPerUnit!, reserve: lot.reservePerUnit!, open: 700, max: 780, tick: 5 }, A)
    }
    expect(neg(t)).toEqual(neg(o))
  })
  it('after confirmation they differ only where they should: storage 13 against 15 months, inbound 248.40 against 261.00', () => {
    const months = (w: World) => confirmedStorageMonths(lotForItem(w, itemByTag(w, 'TH-01').id).availableFrom!, '2028-04-03', DEMO_TODAY)
    expect(months(o)).toBe(13)
    expect(months(t)).toBe(15)
    const inbound = (w: World) => sellerPackage({ family: 'steel_section', units: 24.156, massT: 24.156, pricePerUnit: 740, route: 'hub', facility: facilityById('HUB-TILB'), kmSourceToHub: w.buildings[TIVERNE_ID].distancesKm['HUB-TILB'], inStock: null, dealDate: DEMO_TODAY }, A).inbound
    expect(inbound(o)).toBe(248.4)
    expect(inbound(t)).toBe(261.0)
  })
})

describe('P8: a negotiation without agreement displays no limit', () => {
  it('N2, N6 and N8', () => {
    const cases = [
      { ask: 800, reserve: 750, open: 700, max: 720, tick: 5 },
      { ask: 770, reserve: 770, open: 765, max: 765, tick: 5 },
      { ask: 800, reserve: 730, open: 300, max: 300, tick: 5 },
    ]
    for (const c of cases) {
      const r = negotiate(c, A)
      expect(r.outcome.agreed).toBe(false)
      const offers = r.log.filter((e) => e.kind === 'ask' || e.kind === 'bid').map((e) => e.price)
      const shown = r.log.map((e) => e.price).filter((p) => p !== null)
      for (const p of shown) expect(offers).toContain(p)
      if (!offers.includes(c.reserve)) expect(shown).not.toContain(c.reserve)
      if (!offers.includes(c.max)) expect(shown).not.toContain(c.max)
    }
  })
})
