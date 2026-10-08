import { describe, expect, it } from 'vitest'
import { createSeed, HARROWDEN_ID, MERROWGATE_ID, ORG_IDS, PERSONA_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { captureItem } from '../actions'
import { itemView, priorityFor } from '../selectors'
import { setLotAvailability } from '../v1actions'
import {
  availabilityDraft,
  checkPrices,
  dealFamily,
  expectedDefaultMonth,
  expectedFromMonth,
  expectedText,
  expectedYearOptions,
  monthKeyOf,
  ownerVisibility,
  priorityView,
  publishDefaults,
  publishState,
  publishView,
  itemPreview,
  sharingView,
  quantityText,
  sellerOrgId,
  supplyAccess,
  visibilityCounts,
  visibilityTone,
} from './supply'

const P = PERSONA_IDS
const TH01 = 'itm_7fk2qa'
const DASHES = /[\u2013\u2014]/

describe('supply access', () => {
  const w = createSeed()

  it('gives the owner every screen of their own building and nothing of another owner', () => {
    expect(supplyAccess(w, P.tom, TIVERNE_ID)).toEqual({ inventory: true, capture: true, priority: true, listings: true })
    expect(supplyAccess(w, P.tom, HARROWDEN_ID)).toEqual({ inventory: false, capture: false, priority: false, listings: false })
  })

  it('gives the surveyor inventory and capture on both buildings, never priority or listings', () => {
    for (const b of [TIVERNE_ID, HARROWDEN_ID]) expect(supplyAccess(w, P.dana, b)).toEqual({ inventory: true, capture: true, priority: false, listings: false })
  })

  it('gives buying-side roles and the operator nothing, and an unknown ID looks the same', () => {
    for (const p of [P.priya, P.isla, P.marcus, P.operator]) expect(supplyAccess(w, p, TIVERNE_ID)).toEqual({ inventory: false, capture: false, priority: false, listings: false })
    expect(supplyAccess(w, P.tom, 'bld_nope00')).toEqual({ inventory: false, capture: false, priority: false, listings: false })
  })

  it('reads the selling owner organisation from the persona', () => {
    expect(sellerOrgId(w, P.tom)).toBe(ORG_IDS.ostlea)
    expect(sellerOrgId(w, P.dana)).toBeNull()
    expect(sellerOrgId(w, P.priya)).toBeNull()
  })
})

describe('expected availability at capture', () => {
  const w = createSeed()
  const tiverne = w.buildings[TIVERNE_ID]

  it('defaults to the dismantling start month and offers years from the demo year', () => {
    expect(expectedDefaultMonth(tiverne)).toBe('2027-01')
    expect(expectedYearOptions(tiverne)).toEqual([2026, 2027, 2028, 2029, 2030])
    expect(monthKeyOf(2027, 3)).toBe('2027-03')
  })

  it('keeps the dismantling start itself for the default month, and the first day for any other', () => {
    expect(expectedFromMonth(tiverne, '2027-01')).toBe('2027-01-25')
    expect(expectedFromMonth(tiverne, '2027-03')).toBe('2027-03-01')
    expect(expectedText('2027-03-01')).toBe('March 2027')
    expect(expectedText(null)).toBe('Not set')
  })

  it('gives a captured lot the expected date as its available-from date', () => {
    const r = captureItem(w, { buildingId: TIVERNE_ID, spec: { family: 'steel_section', designation: 'UC 203x203x46', lengthM: 3.2 }, quantity: { kind: 'pieces', pieces: 30 }, condition: 'A', recoverability: 'A', location: '', notes: '', capturedBy: 'Dana Kowalski', photos: [], expectedAvailableFrom: expectedFromMonth(tiverne, '2027-03') })
    expect(r.world.items[r.itemId].expectedAvailableFrom).toBe('2027-03-01')
    expect(Object.values(r.world.lots).find((l) => l.itemId === r.itemId)!.availableFrom).toBe('2027-03-01')
  })
})

describe('inventory formatting', () => {
  const w = createSeed()

  it('words quantities in their own units', () => {
    expect(quantityText(w.items[TH01])).toBe('48 pieces')
    expect(quantityText(w.items.itm_n7rp2k)).toBe('20,000 bricks')
    expect(quantityText(w.items.itm_s3ek8w)).toBe('3,000 panels')
    expect(quantityText(w.items.itm_d6ct4m)).toBe('600 m2')
  })

  it('uses the owner words for visibility, with a tone each', () => {
    expect(ownerVisibility('private')).toBe('Private')
    expect(ownerVisibility('matched_only')).toBe('Shared privately with selected projects')
    expect(ownerVisibility('open')).toBe('Published to the marketplace')
    expect([visibilityTone('private'), visibilityTone('matched_only'), visibilityTone('open')]).toEqual(['oxide', 'steel', 'teal'])
  })

  it('counts the building lots by visibility', () => {
    const c = visibilityCounts(w, TIVERNE_ID)
    expect(c.matched_only).toBe(5)
    expect(c.private + c.matched_only + c.open).toBe(Object.values(w.items).filter((i) => i.buildingId === TIVERNE_ID).length)
  })
})

describe('priority with the decision tree', () => {
  const w = createSeed()
  const v = priorityView(w, TIVERNE_ID)

  it('keeps the ranking exactly as the engine returns it', () => {
    const r = priorityFor(w, TIVERNE_ID)
    expect(v.rows.map((x) => x.tag)).toEqual(r.rows.map((x) => x.tag))
    expect(v.rows.map((x) => x.score)).toEqual(r.rows.map((x) => x.score))
    expect(v.recoverCount).toBe(r.rows.filter((x) => x.route === 'recover').length)
  })

  it('maps recover to reuse and the recycled precast and brick to downcycle', () => {
    for (const row of v.rows) if (row.route === 'recover') expect(row.treeRoute).toBe('reuse')
    expect(v.rows.find((x) => x.tag === 'TH-09')!.treeRoute).toBe('downcycle')
    expect(v.rows.find((x) => x.tag === 'TH-10')!.treeRoute).toBe('downcycle')
    expect(v.rows.find((x) => x.tag === 'TH-10')!.treeLabel).toBe('Downcycle')
  })

  it('lists the five steps in order, marks the two the rule never assigns, and counts every row once', () => {
    expect(v.legend.map((s) => s.label)).toEqual(['Reuse', 'Upcycle', 'Downcycle', 'Recycle', 'Scrap'])
    expect(v.legend.filter((s) => !s.assigned).map((s) => s.route)).toEqual(['upcycle', 'scrap'])
    expect(v.legend.reduce((n, s) => n + s.count, 0)).toBe(v.rows.length)
    for (const s of v.legend) expect(s.hint).not.toMatch(DASHES)
  })
})

describe('publish form', () => {
  const w = createSeed()
  const th01 = itemView(w, TH01)

  it('opens shared privately, with the suggested ask and reserve and the lot date', () => {
    expect(publishDefaults(th01)).toEqual({ visibility: 'matched_only', ask: '800', reserve: '730', date: '2027-03-15' })
  })

  it('checks prices in whole ticks with the reserve not above the ask', () => {
    expect(checkPrices('800', '730', 'steel_section')).toEqual({ ask: 800, reserve: 730, valid: true, problem: null })
    expect(checkPrices('730', '800', 'steel_section').problem).toBe('The reserve cannot be above the ask.')
    expect(checkPrices('802', '730', 'steel_section').valid).toBe(false)
    expect(checkPrices('', '730', 'steel_section').problem).toBe('Enter an ask and a reserve.')
    expect(checkPrices('0.55', '0.50', 'clay_brick').valid).toBe(true)
  })

  it('allows publishing only for a private lot, a chosen share, valid prices and an unblocked disclosure', () => {
    const ok = checkPrices('800', '730', 'steel_section')
    expect(publishState(th01.lot, 'matched_only', ok, false)).toEqual({ done: false, keepPrivate: false, blocked: false, canPublish: true, previewAs: 'matched_only' })
    expect(publishState(th01.lot, 'open', ok, true)).toMatchObject({ blocked: true, canPublish: false, previewAs: 'open' })
    expect(publishState(th01.lot, 'private', ok, false)).toMatchObject({ keepPrivate: true, canPublish: false, previewAs: 'open' })
    expect(publishState({ ...th01.lot, visibility: 'open' }, 'open', ok, false)).toMatchObject({ done: true, canPublish: false })
  })

  it('lets the owner change the date only while the lot is private', () => {
    expect(availabilityDraft(th01.lot, '2027-04-01')).toEqual({ editable: true, valid: true, changed: true })
    expect(availabilityDraft(th01.lot, '2027-03-15')).toEqual({ editable: true, valid: true, changed: false })
    expect(availabilityDraft(th01.lot, '2027-02-30').valid).toBe(false)
    expect(availabilityDraft({ ...th01.lot, visibility: 'open' }, '2027-04-01').editable).toBe(false)
    const r = setLotAvailability(w, P.tom, th01.lot.id, '2027-04-01')
    expect(r.error).toBeNull()
    expect(r.world.lots[th01.lot.id].availableFrom).toBe('2027-04-01')
  })
})

describe('publish view and sharing', () => {
  it('scores the step 3 disclosure for TH-01 published, and previews it at the building timing level', () => {
    const w = createSeed()
    const th01 = itemView(w, TH01)
    const v = publishView(w, TIVERNE_ID, th01, { ...publishDefaults(th01), visibility: 'open' })
    expect(v.disclosure.score).toBe(10)
    expect(v.disclosure.band).toBe('Low')
    expect(v.state.canPublish).toBe(true)
    expect(v.preview.availability).toMatchObject({ kind: 'window' })
    const keep = publishView(w, TIVERNE_ID, th01, { ...publishDefaults(th01), visibility: 'private' })
    expect(keep.state).toMatchObject({ keepPrivate: true, canPublish: false })
  })

  it('lists every project blind, with Merrowgate Wharf shared by Ostlea in the seed, and counts the shares', () => {
    const w = createSeed()
    const v = sharingView(w, ORG_IDS.ostlea)
    expect(v.rows.length).toBe(Object.keys(w.projects).length)
    expect(v.approvedCount).toBe(v.rows.filter((r) => r.approved).length)
    expect(v.rows.find((r) => r.projectId === MERROWGATE_ID)!.approved).toBe(true)
    const text = JSON.stringify(v)
    for (const p of Object.values(w.projects)) expect(text).not.toContain(p.name)
    expect(text).not.toContain('Lantern Quay')
  })
})

describe('item preview', () => {
  it('previews a private lot as the open listing it would become, with a listed month', () => {
    const w = createSeed()
    const th01 = itemView(w, TH01)
    const p = itemPreview(w, th01)
    expect(p.publicId).toBe('L-9F4CQQ')
    expect(p.listedMonth).not.toBeNull()
    const shared = itemView(w, 'itm_m3xd8p')
    expect(itemPreview(w, shared)).toEqual(shared.listing)
  })
})

describe('deals', () => {
  it('reads the price family from the deal lot', () => {
    const w = createSeed()
    const th01 = itemView(w, TH01)
    const deal = { lotId: th01.lot.id } as Parameters<typeof dealFamily>[1]
    expect(dealFamily(w, deal)).toBe('steel_section')
  })
})
