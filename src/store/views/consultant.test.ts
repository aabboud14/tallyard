// The consultant's wish list review (brief/09-V1-PRODUCT.md sections 3.5, 9 journey 6 and 13.12).
import { beforeAll, describe, expect, it } from 'vitest'
import { createSeed, FERRYMOOR_ID, MERROWGATE_ID, PERSONA_IDS, SALLOW_ID } from '../../domain/seed/world'
import { decideWish, saveToWishlist, sendWishlist } from '../v1actions'
import type { World } from '../../domain/types'
import { useStore } from '../store'
import { runDemoSteps } from '../demo'
import { REVIEW_ORDER, reviewScreen } from './consultant'

const P = PERSONA_IDS

/** The world after demo step 3, when TH-01 is published as L-9F4CQQ. */
let published: World

beforeAll(async () => {
  useStore.getState().replaceWorld(createSeed())
  await runDemoSteps(1, 3)
  published = structuredClone(useStore.getState().world)
})

function approvedOnMerrowgate(): World {
  let w = structuredClone(published)
  w = saveToWishlist(w, P.priya, 'L-9F4CQQ', MERROWGATE_ID).world
  w = sendWishlist(w, P.priya, MERROWGATE_ID).world
  const itemId = w.wishlists[Object.keys(w.wishlists).find((k) => w.wishlists[k].projectId === MERROWGATE_ID)!].items[0].id
  const r = decideWish(w, P.isla, MERROWGATE_ID, itemId, 'approved', 'Approved for the frame')
  expect(r.error).toBeNull()
  return r.world
}

describe('reviewScreen', () => {
  it('is for the project consultant only', () => {
    const w = createSeed()
    expect(reviewScreen(w, P.marcus, MERROWGATE_ID)).not.toBeNull()
    expect(reviewScreen(w, P.priya, MERROWGATE_ID)).toBeNull()
    expect(reviewScreen(w, P.isla, MERROWGATE_ID)).toBeNull()
    expect(reviewScreen(w, P.tom, MERROWGATE_ID)).toBeNull()
    expect(reviewScreen(w, P.marcus, 'prj_nothere')).toBeNull()
  })

  it('reads Merrowgate Wharf as empty on the seed, with the four states in reading order', () => {
    const v = reviewScreen(createSeed(), P.marcus, MERROWGATE_ID)!
    expect(v.isEmpty).toBe(true)
    expect(v.sections.map((s) => s.status)).toEqual(REVIEW_ORDER)
    expect(v.sections.map((s) => s.label)).toEqual(['Approved', 'Sent to client', 'Pending', 'Declined'])
    expect(v.totals).toEqual({ count: 0, massT: 0, avoidedT: 0 })
    expect(v.stageLine).toBe('RIBA Stage 2, Concept Design.')
  })

  it('groups the seeded Sallow Court and Ferrymoor Yard items by state', () => {
    const w = createSeed()
    const sallow = reviewScreen(w, P.marcus, SALLOW_ID)!
    const pending = sallow.sections.find((s) => s.status === 'pending')!
    expect(pending.lines.map((l) => l.publicId)).toEqual(['L-Q23X7N', 'L-A945G6'])
    expect(pending.totals.count).toBe(2)
    expect(sallow.totals.count).toBe(2)
    expect(sallow.isEmpty).toBe(false)
    const ferry = reviewScreen(w, P.marcus, FERRYMOOR_ID)!
    expect(ferry.sections.find((s) => s.status === 'sent')!.lines.map((l) => l.publicId)).toEqual(['L-6VWCWH'])
  })

  it('shows the approved L-9F4CQQ at 48 pieces, 24.16 t and 41.0 tCO2e (journey 6)', () => {
    const v = reviewScreen(approvedOnMerrowgate(), P.marcus, MERROWGATE_ID)!
    const approved = v.sections.find((s) => s.status === 'approved')!
    expect(approved.lines).toHaveLength(1)
    const line = approved.lines[0]
    expect(line.publicId).toBe('L-9F4CQQ')
    expect(line.quantity).toBe('48 pieces')
    expect(line.massT).toBeCloseTo(24.16, 2)
    expect(line.avoidedT!.toFixed(1)).toBe('41.0')
    expect(line.band.band).toBe('high')
    expect(line.fit?.fit).toBe('in_time')
    expect(line.fitTone).toBe('teal')
    expect(line.decisionNote).toBe('Approved for the frame')
    expect(approved.totals.count).toBe(1)
    expect(approved.totals.massT).toBeCloseTo(24.16, 2)
    expect(v.totals.count).toBe(1)
  })

  it('leaves out a row the project can no longer see', () => {
    const w = approvedOnMerrowgate()
    const lot = Object.values(w.lots).find((l) => l.publicId === 'L-9F4CQQ')!
    w.lots[lot.id] = { ...lot, visibility: 'private' }
    const v = reviewScreen(w, P.marcus, MERROWGATE_ID)!
    expect(v.isEmpty).toBe(true)
    expect(v.sections.every((s) => s.lines.length === 0)).toBe(true)
  })
})
