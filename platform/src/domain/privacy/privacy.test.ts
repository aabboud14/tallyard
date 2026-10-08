import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { DEMO_TODAY } from '../constants'
import { createSeed, itemByTag, lotForItem, MERROWGATE_ID, TIVERNE_ID, HARROWDEN_ID, SALLOW_ID, FERRYMOOR_ID } from '../seed/world'
import { REGIONS } from '../reference/assumptions'
import { dateFormats, addDays } from '../dates'
import { createTwinSeed, TWIN_RESERVE } from '../../test/twin'
import { toPublicListing, PUBLIC_LISTING_KEYS } from './publicListing'
import { toBlindBuyer, blindBuyerText } from './blindBuyer'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from './privateStrings'
import { listingsVisibleToProject, listingFor, lotsVisibleToProject, browseListings } from '../visibility'
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

describe('version 1.0 seed: private by construction', () => {
  const w = createSeed()
  const hcLots = Object.values(w.lots).filter((l) => w.items[l.itemId].buildingId === HARROWDEN_ID)

  it('Harrowden Court has three private lots that no project and no browse can see', () => {
    expect(hcLots.map((l) => w.items[l.itemId].tag).sort()).toEqual(['HC-01', 'HC-02', 'HC-03'])
    for (const l of hcLots) expect(l.visibility).toBe('private')
    const browse = browseListings(w, A).map((l) => l.publicId)
    for (const p of Object.values(w.projects)) {
      const open = { ...p, termsAccepted: true, approvedByOwnerOrgIds: Object.keys(w.orgs) }
      const visible = lotsVisibleToProject(w, open)
      for (const l of hcLots) {
        expect(visible).not.toContain(l.id)
        expect(browse).not.toContain(l.publicId)
      }
    }
  })

  it("the new private strings are in the lot and project lists", () => {
    const hc01 = itemByTag(w, 'HC-01')
    const hcStrings = lotPrivateStrings(lotForItem(w, hc01.id), hc01, w.buildings[HARROWDEN_ID], w)
    for (const s of ['Harrowden Court', 'Brindle Road', 'W13', 'Ealing', 'Brackwater Estates', 'Dana Kowalski', 'Tarnbrook Deconstruction', 'HC-01', ...dateFormats('2027-07-05')]) expect(hcStrings).toContain(s)
    const th07 = itemByTag(w, 'TH-07')
    expect(lotPrivateStrings(lotForItem(w, th07.id), th07, w.buildings[TIVERNE_ID], w)).toEqual(expect.arrayContaining(dateFormats(th07.expectedAvailableFrom!)))
    const sallow = projectPrivateStrings(w.projects[SALLOW_ID], w)
    for (const s of ['Sallow Court', 'Pellory Estates', 'Studio Oriel', 'Camden', ...dateFormats('2028-01-10')]) expect(sallow).toContain(s)
    const ferry = projectPrivateStrings(w.projects[FERRYMOOR_ID], w)
    for (const s of ['Ferrymoor Yard', 'Quillon Homes', 'Hackney', ...dateFormats('2027-06-07')]) expect(ferry).toContain(s)
    expect(projectPrivateStrings(w.projects[MERROWGATE_ID], w)).toContain('Isla Brennan')
  })

  it("no project's client, team organisation or team member is a lot private string", () => {
    const lotStrings = new Set<string>()
    for (const lot of Object.values(w.lots)) {
      const item = w.items[lot.itemId]
      for (const s of lotPrivateStrings(lot, item, w.buildings[item.buildingId], w)) lotStrings.add(s)
    }
    for (const p of Object.values(w.projects)) {
      const names = [p.developerOrgId, p.clientOrgId, p.architectOrgId, ...p.teamOrgIds].map((id) => w.orgs[id].name)
      names.push(...p.teamPersonaIds.map((id) => w.personas[id].name))
      for (const n of names) expect(lotStrings.has(n), `${p.name}: ${n}`).toBe(false)
    }
  })

  it('every blind buyer holds none of its project private strings, and every region is a seed region', () => {
    for (const p of Object.values(w.projects)) {
      expect(REGIONS as readonly string[]).toContain(p.region)
      const text = JSON.stringify(toBlindBuyer(p))
      for (const s of projectPrivateStrings(p, w)) expect(text, `${p.name} leaks "${s}"`).not.toContain(s)
    }
  })

  it('seeded wish lists point at open lots only', () => {
    for (const list of Object.values(w.wishlists)) {
      for (const it of list.items) {
        const lot = Object.values(w.lots).find((l) => l.publicId === it.publicId)!
        expect(lot.visibility).toBe('open')
        expect(it.addedOn < DEMO_TODAY).toBe(true)
      }
    }
  })
})

describe('P1b: the expected availability and the start date never reach a projection', () => {
  const o = createSeed()
  const t = createSeed()
  for (const item of Object.values(t.items)) if (item.expectedAvailableFrom) item.expectedAvailableFrom = addDays(item.expectedAvailableFrom, 122)
  for (const p of Object.values(t.projects)) p.startDate = addDays(p.startDate, 122)
  it('every toPublicListing result is the same and has no expectedAvailableFrom key', () => {
    const po = allProjections(o).map((p) => p.listing)
    const pt = allProjections(t).map((p) => p.listing)
    expect(pt).toEqual(po)
    for (const l of po) expect(Object.keys(l)).not.toContain('expectedAvailableFrom')
  })
  it('every toBlindBuyer result is the same', () => {
    for (const id of Object.keys(o.projects)) expect(toBlindBuyer(t.projects[id])).toEqual(toBlindBuyer(o.projects[id]))
  })
})
