import { describe, expect, it } from 'vitest'
import { FAMILY_IDS } from '../../domain/reference/families'
import { fresh, U, viewer, TODAY } from '../../test/fixtures'
import { MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import { projectWishlist } from '../lots'
import { shortlistRows, type ShortlistRow } from './shortlist'
import type { ActivityRow } from './common'
import { activitySummary, earliestStart, fitCounts, fitTone, STALE_SENT_DAYS, targetProgress, thumbsOf, typologyCounts, waitingTone } from './dashboard'

describe('dashboard helpers', () => {
  it('tones what is waiting by how long it has waited', () => {
    expect(STALE_SENT_DAYS).toBe(7)
    expect(waitingTone(0, null)).toBe('neutral')
    expect(waitingTone(2, 3)).toBe('info')
    expect(waitingTone(1, 7)).toBe('warning')
    expect(waitingTone(1, null)).toBe('info')
  })

  it('counts fits and tones them: late wins, then tight, then brand', () => {
    const c = fitCounts(['now', 'in_time', null, 'in_time', 'tight'])
    expect(c).toEqual({ now: 1, in_time: 2, tight: 1, late: 0 })
    expect(fitTone({ now: 3, in_time: 1, tight: 1, late: 1 })).toBe('danger')
    expect(fitTone({ now: 3, in_time: 1, tight: 1, late: 0 })).toBe('warning')
    expect(fitTone({ now: 0, in_time: 1, tight: 0, late: 0 })).toBe('brand')
    expect(fitTone({ now: 0, in_time: 0, tight: 0, late: 0 })).toBe('neutral')
  })

  it('finds the next start on site, ties by name', () => {
    const s = fresh()
    // Round 2 (BRIEF 14.2): Kilnworth Place, seeded for Lantern Quay, starts on site before Ferrymoor Yard; among Studio Oriel's projects Ferrymoor Yard is still next.
    expect(earliestStart(Object.values(s.world.projects), TODAY)!.name).toBe('Kilnworth Place')
    expect(earliestStart(Object.values(s.world.projects).filter((p) => p.architectOrgId === ORG_IDS.oriel), TODAY)!.name).toBe('Ferrymoor Yard')
    expect(earliestStart([{ name: 'Beta', startDate: '2027-01-01' }, { name: 'alpha', startDate: '2027-01-01' }], TODAY)!.name).toBe('alpha')
    expect(earliestStart([{ name: 'Past', startDate: '2026-01-01' }], TODAY)).toBeNull()
  })

  it('measures progress against a target', () => {
    const below = targetProgress(0.1, 0.25)
    expect(below.status).toBe('below')
    expect(below.share).toBeCloseTo(0.4, 10)
    expect(targetProgress(0.3, 0.25)).toEqual({ status: 'met', share: 1 })
    expect(targetProgress(null, 0.25)).toEqual({ status: 'no_data', share: 0 })
    expect(targetProgress(5, 0)).toEqual({ status: 'no_target', share: 0 })
    expect(targetProgress(0, 150)).toEqual({ status: 'below', share: 0 })
  })

  it('maps all seven families to their typology', () => {
    expect(FAMILY_IDS).toHaveLength(7)
    expect(typologyCounts(FAMILY_IDS)).toEqual({ structure: 2, envelope: 4, finishes: 1 })
    expect(typologyCounts([])).toEqual({ structure: 0, envelope: 0, finishes: 0 })
  })

  it('summarises a feed in one line', () => {
    expect(activitySummary([])).toEqual({ count: 0, latest: null })
    const row = { id: 'a' } as ActivityRow
    expect(activitySummary([row, { id: 'b' } as ActivityRow])).toEqual({ count: 2, latest: row })
  })

  it('picks thumbnails: approved, then sent, then shortlisted, never declined, at most three', () => {
    const s = fresh()
    const p = s.world.projects[MERROWGATE_ID]
    const rows = shortlistRows(s, viewer(U.priya), projectWishlist(s.world, MERROWGATE_ID)!, p)
    const template = rows.find((r) => r.card)!
    const make = (publicId: string, status: ShortlistRow['status']): ShortlistRow => ({ ...template, publicId, status })
    const picked = thumbsOf([make('P1', 'pending'), make('D1', 'declined'), make('S1', 'sent'), make('A1', 'approved'), make('P2', 'pending'), make('A2', 'approved')])
    expect(picked.map((t) => t.publicId)).toEqual(['A1', 'A2', 'S1'])
    expect(thumbsOf([make('D1', 'declined')])).toEqual([])
    expect(thumbsOf([{ ...make('X', 'approved'), card: null }])).toEqual([])
    expect(thumbsOf(rows).every((t) => t.title.length > 0)).toBe(true)
  })
})
