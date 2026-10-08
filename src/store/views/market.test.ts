import { describe, expect, it } from 'vitest'
import { createSeed, FERRYMOOR_ID, MERROWGATE_ID, PERSONA_IDS, SALLOW_ID } from '../../domain/seed/world'
import { NO_FILTERS } from '../../domain/v1types'
import { TIMELINE_TEXT } from '../../domain/reference/labels'
import { acceptProjectTerms, decideWish, saveToWishlist, sendWishlist, V1_ERRORS } from '../v1actions'
import { browseView, listingDetailView } from '../v1selectors'
import { anyFilter, FIT_TAG, listingCalc, fitTone, isSavedAnywhere, isSharedLot, moreFilterCount, SAVE_NOTES, saveMenuFor, storageText, stripWindow, typologyCounts } from './market'

const P = PERSONA_IDS
const DASHES = /[\u2013\u2014]/

describe('fit words and tones', () => {
  it('gives a short tag for every fit, with no dash', () => {
    for (const fit of ['now', 'in_time', 'tight', 'late'] as const) {
      expect(FIT_TAG[fit].length).toBeGreaterThan(0)
      expect(FIT_TAG[fit]).not.toMatch(DASHES)
      // The tag is the start of the fixed phrase (brief 09 section 7), never other wording.
      expect(TIMELINE_TEXT[fit].startsWith(FIT_TAG[fit])).toBe(true)
    }
    expect(fitTone('now')).toBe('teal')
    expect(fitTone('in_time')).toBe('teal')
    expect(fitTone('tight')).toBe('survey')
    expect(fitTone('late')).toBe('oxide')
  })

  it('words the storage months, and says nothing for a late lot', () => {
    expect(storageText(null)).toBeNull()
    expect(storageText(0)).toBe('No storage before the start.')
    expect(storageText(1)).toBe('About 1 month in storage before the start.')
    expect(storageText(13)).toBe('About 13 months in storage before the start.')
  })

  it('reads the strip window from the public availability', () => {
    expect(stripWindow({ kind: 'now' })).toBeNull()
    expect(stripWindow({ kind: 'window', level: 'quarter', label: 'Q1 2027', windowStart: '2027-01-01', windowEnd: '2027-03-31' })).toEqual({ start: '2027-01-01', end: '2027-03-31' })
  })
})

describe('typology counts', () => {
  it('splits the marketplace into structure, envelope and finishes that add up to all', () => {
    const w = createSeed()
    const c = typologyCounts(w, P.priya, NO_FILTERS, 'newest', null)
    expect(c.all).toBe(browseView(w, P.priya, NO_FILTERS, 'newest', null).cards.length)
    expect(c.structure + c.envelope + c.finishes).toBe(c.all)
    expect(c.structure).toBeGreaterThan(0)
    expect(c.envelope).toBeGreaterThan(0)
    expect(c.finishes).toBeGreaterThan(0)
  })

  it('keeps the other filters when counting', () => {
    const w = createSeed()
    const c = typologyCounts(w, P.priya, { ...NO_FILTERS, family: 'clay_brick' }, 'newest', null)
    expect(c.structure).toBe(0)
    expect(c.finishes).toBe(0)
    expect(c.envelope).toBe(c.all)
  })

  it('counts the filters in the More filters panel only', () => {
    expect(moreFilterCount(NO_FILTERS)).toBe(0)
    expect(moreFilterCount({ ...NO_FILTERS, typology: 'structure' })).toBe(0)
    expect(moreFilterCount({ ...NO_FILTERS, family: 'clay_brick', band: 'high' })).toBe(2)
    expect(anyFilter(NO_FILTERS)).toBe(false)
    expect(anyFilter({ ...NO_FILTERS, typology: 'structure' })).toBe(true)
  })
})

describe('save menu', () => {
  it('lists each of the architect projects then Saved, and nothing for other roles', () => {
    const w = createSeed()
    const rows = saveMenuFor(w, P.priya, 'L-NHZ32R')
    expect(rows).toHaveLength(4)
    expect(new Set(rows.slice(0, 3).map((r) => r.projectId))).toEqual(new Set([MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID]))
    expect(rows[rows.length - 1]).toMatchObject({ projectId: null, label: 'Saved' })
    expect(rows.every((r) => r.canToggle && !r.saved && r.itemId === null)).toBe(true)
    expect(isSavedAnywhere(rows)).toBe(false)
    expect(saveMenuFor(w, P.isla, 'L-NHZ32R')).toEqual([])
    expect(saveMenuFor(w, P.tom, 'L-NHZ32R')).toEqual([])
  })

  it('marks the seeded saves with their item, so a second click removes them', () => {
    const w = createSeed()
    const pine = saveMenuFor(w, P.priya, 'L-CJGQP7')
    const saved = pine.find((r) => r.projectId === null)!
    expect(saved).toMatchObject({ saved: true, canToggle: true, status: 'pending' })
    expect(saved.itemId).not.toBeNull()
    expect(isSavedAnywhere(pine)).toBe(true)
    const sent = saveMenuFor(w, P.priya, 'L-6VWCWH').find((r) => r.projectId === FERRYMOOR_ID)!
    expect(sent).toMatchObject({ saved: true, status: 'sent', canToggle: true, note: SAVE_NOTES.sent })
  })

  it('locks an approved item', () => {
    let w = createSeed()
    w = saveToWishlist(w, P.priya, 'L-NHZ32R', MERROWGATE_ID).world
    w = sendWishlist(w, P.priya, MERROWGATE_ID).world
    const itemId = w.wishlists[Object.keys(w.wishlists).find((k) => w.wishlists[k].projectId === MERROWGATE_ID)!].items[0].id
    const r = decideWish(w, P.isla, MERROWGATE_ID, itemId, 'approved', '')
    expect(r.error).toBeNull()
    const row = saveMenuFor(r.world, P.priya, 'L-NHZ32R').find((x) => x.projectId === MERROWGATE_ID)!
    expect(row).toMatchObject({ saved: true, status: 'approved', canToggle: false, note: SAVE_NOTES.approved })
  })

  it('offers a shared lot only to a project it is shared with, never to Saved', () => {
    let w = createSeed()
    w = acceptProjectTerms(w, P.priya, MERROWGATE_ID).world
    expect(isSharedLot(w, 'L-WPX5A6')).toBe(true)
    expect(isSharedLot(w, 'L-NHZ32R')).toBe(false)
    const rows = saveMenuFor(w, P.priya, 'L-WPX5A6')
    expect(rows.find((r) => r.projectId === MERROWGATE_ID)).toMatchObject({ allowed: true, canToggle: true, note: null })
    expect(rows.find((r) => r.projectId === null)).toMatchObject({ allowed: false, canToggle: false, note: V1_ERRORS.sharedToSaved })
    const other = rows.find((r) => r.projectId === SALLOW_ID)
    if (other) expect(other).toMatchObject({ allowed: false, canToggle: false, note: V1_ERRORS.notShared })
  })
})

describe('listing calculation from public fields', () => {
  it('rebuilds the avoided carbon and guide price the listing shows', () => {
    const w = createSeed()
    for (const id of ['L-NHZ32R', 'L-Q23X7N', 'L-6VWCWH', 'L-A945G6', 'L-9XXQC3']) {
      const l = listingDetailView(w, P.priya, id, null)!.listing
      const c = listingCalc(l)
      expect(c.carbon).not.toBeNull()
      expect(c.carbon!.avoided).toBeCloseTo(l.carbon!.avoidedT, 1)
      expect(c.guide.guide).toBeCloseTo(l.price.guide, 2)
    }
  })

  it('claims nothing for unused surplus', () => {
    const w = createSeed()
    const l = listingDetailView(w, P.priya, 'L-YZ2C7H', null)!.listing
    expect(l.carbon).toBeNull()
    expect(listingCalc(l).carbon).toBeNull()
  })
})
