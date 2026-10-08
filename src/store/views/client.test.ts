// The buying owner's view helpers (brief/09-V1-PRODUCT.md sections 3.4, 13.2 and 13.5), on the seed and after the demo steps.
import { beforeAll, describe, expect, it } from 'vitest'
import { createSeed, MERROWGATE_ID, PERSONA_IDS, SALLOW_ID } from '../../domain/seed/world'
import { acceptTerms, addToPlan, loadSampleSchedule, setPlanPackage, startNegotiation } from '../actions'
import { decideWish, saveToWishlist, sendWishlist } from '../v1actions'
import { approvalsView, wishlistView } from '../v1selectors'
import { planItemView } from '../selectors'
import { checkMandate, clientCanOpen, decisionText, facilityRows, fitStorageText, itemCount, matchTable, packageStorageText, planRows, storageRangeText } from './client'
import type { WishlistItem } from '../../domain/v1types'
import type { World } from '../../domain/types'
import { useStore } from '../store'
import { runDemoSteps } from '../demo'

const P = PERSONA_IDS

/** The world after demo step 3, when TH-01 is published as L-9F4CQQ. */
let published: World

beforeAll(async () => {
  useStore.getState().replaceWorld(createSeed())
  await runDemoSteps(1, 3)
  published = structuredClone(useStore.getState().world)
})

function matched() {
  let w = structuredClone(published)
  w = loadSampleSchedule(w, MERROWGATE_ID)
  w = acceptTerms(w, MERROWGATE_ID)
  return w
}

describe('clientCanOpen', () => {
  it('opens Merrowgate Wharf for Isla only', () => {
    const w = createSeed()
    expect(clientCanOpen(w, P.isla, MERROWGATE_ID)).toBe(true)
    expect(clientCanOpen(w, P.priya, MERROWGATE_ID)).toBe(false)
    expect(clientCanOpen(w, P.marcus, MERROWGATE_ID)).toBe(false)
    expect(clientCanOpen(w, P.tom, MERROWGATE_ID)).toBe(false)
    expect(clientCanOpen(w, P.isla, SALLOW_ID)).toBe(false)
    expect(clientCanOpen(w, P.isla, 'prj_nothere')).toBe(false)
  })
})

describe('approvals text', () => {
  it('states storage to the start from the timeline fit', () => {
    expect(fitStorageText(null)).toBeNull()
    expect(fitStorageText({ fit: 'late', storageMonths: null, text: '' })).toBeNull()
    expect(fitStorageText({ fit: 'tight', storageMonths: 0, text: '' })).toBe('No storage before the start')
    expect(fitStorageText({ fit: 'in_time', storageMonths: 1, text: '' })).toBe('1 month of storage until the start')
    expect(fitStorageText({ fit: 'now', storageMonths: 18, text: '' })).toBe('18 months of storage until the start')
  })

  it('states the decision and its date', () => {
    const base: WishlistItem = { id: 'x', publicId: 'L-9F4CQQ', addedOn: '2026-10-07', addedByPersonaId: P.priya, note: '', status: 'sent', decidedOn: null, decisionNote: null }
    expect(decisionText(base)).toBe('Awaiting your decision')
    expect(decisionText({ ...base, status: 'approved', decidedOn: '2026-10-07' })).toBe('Approved on 7 October 2026')
    expect(decisionText({ ...base, status: 'declined', decidedOn: '2026-10-07' })).toBe('Declined on 7 October 2026')
    expect(itemCount(1)).toBe('1 item')
    expect(itemCount(0)).toBe('0 items')
  })

  it('moves a sent item to approved through the client, with the guide range and the fit against the start date', () => {
    let w = structuredClone(published)
    w = saveToWishlist(w, P.priya, 'L-9F4CQQ', MERROWGATE_ID).world
    w = sendWishlist(w, P.priya, MERROWGATE_ID).world
    const before = approvalsView(w, P.isla, MERROWGATE_ID)!
    expect(before.sent.map((r) => r.item.publicId)).toEqual(['L-9F4CQQ'])
    expect(before.sent[0].priceRange).toMatch(/^£\d/)
    expect(before.sent[0].fit?.fit).toBeDefined()
    const itemId = before.sent[0].item.id
    const r = decideWish(w, P.isla, MERROWGATE_ID, itemId, 'approved', 'Fine for the frame')
    expect(r.error).toBeNull()
    const after = approvalsView(r.world, P.isla, MERROWGATE_ID)!
    expect(after.sent).toHaveLength(0)
    expect(after.approved.map((x) => x.item.publicId)).toEqual(['L-9F4CQQ'])
    expect(decisionText(after.approved[0].item)).toBe('Approved on 7 October 2026')
    expect(after.approved[0].item.decisionNote).toBe('Fine for the frame')
    // The architect reads the client's decision on her own row.
    expect(wishlistView(r.world, P.priya, MERROWGATE_ID)!.rows[0].item.status).toBe('approved')
  })
})

describe('matchTable', () => {
  it('is null before the schedule is matched', () => {
    expect(matchTable(createSeed().projects[MERROWGATE_ID])).toBeNull()
  })

  it('keeps the step 5 values and marks allocations already in the plan', () => {
    let w = matched()
    const t = matchTable(w.projects[MERROWGATE_ID])!
    const r1 = t.rows.filter((r) => r.ref === 'R1')
    expect(r1.map((r) => r.allocation?.publicId)).toEqual(['L-9F4CQQ', 'L-NHZ32R'])
    expect(r1[0].first).toBe(true)
    expect(r1[0].rowSpan).toBe(2)
    expect(r1[1].first).toBe(false)
    expect(r1[0].storageText).toBe('Storage 13 to 16 months')
    expect(r1[0].gradeText).toBe('Grade to be confirmed by testing')
    expect(r1[0].inPlan).toBe(false)
    const r5 = t.rows.find((r) => r.ref === 'R5')!
    expect(r5.allocation).toBeNull()
    expect(r5.reason).toBe('No stock long enough (longest visible in this serial size is 9.5 m)')
    expect(t.planCountText).toBe('The reuse plan has 0 items.')
    w = addToPlan(w, MERROWGATE_ID, 'L-9F4CQQ', 'R1')
    const t2 = matchTable(w.projects[MERROWGATE_ID])!
    expect(t2.rows.find((r) => r.allocation?.publicId === 'L-9F4CQQ')!.inPlan).toBe(true)
    expect(t2.planCountText).toBe('The reuse plan has 1 item.')
  })

  it('formats a storage range', () => {
    expect(storageRangeText(13, 13)).toBe('Storage 13 months')
    expect(storageRangeText(13, 16)).toBe('Storage 13 to 16 months')
  })
})

describe('reuse plan helpers', () => {
  it('rows carry each item estimate, and the facility comparison marks the lowest total and the chosen one (step 6)', () => {
    let w = addToPlan(matched(), MERROWGATE_ID, 'L-9F4CQQ', 'R1')
    const rows = planRows(w, MERROWGATE_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0].statusLabel).toBe('Planned')
    expect(rows[0].estimateTotal).toBe(22206.06)
    const v = planItemView(w, MERROWGATE_ID, rows[0].id)
    expect(packageStorageText(v)).toBe('Storage 13 to 16 months')
    const fr = facilityRows(v)
    expect(fr.find((x) => x.lowest)!.facilityId).toBe('HUB-TILB')
    expect(fr.find((x) => x.chosen)!.facilityId).toBe('HUB-TILB')
    expect(fr.filter((x) => x.canChoose).map((x) => x.facilityId).sort()).toEqual(['HUB-BARK', 'HUB-PARK'])
    // Choosing another facility moves the chosen mark but not the lowest one.
    w = setPlanPackage(w, MERROWGATE_ID, rows[0].id, { facilityId: 'HUB-BARK' })
    const fr2 = facilityRows(planItemView(w, MERROWGATE_ID, rows[0].id))
    expect(fr2.find((x) => x.chosen)!.facilityId).toBe('HUB-BARK')
    expect(fr2.find((x) => x.lowest)!.facilityId).toBe('HUB-TILB')
    // Once negotiating, the facility is no longer chosen from here.
    w = startNegotiation(w, MERROWGATE_ID, rows[0].id, { open: 700, max: 780 })
    expect(facilityRows(planItemView(w, MERROWGATE_ID, rows[0].id)).some((x) => x.canChoose)).toBe(false)
  })

  it('checks a mandate against the price tick and order', () => {
    expect(checkMandate('700', '780', 'steel_section')).toEqual({ valid: true, open: 700, max: 780 })
    expect(checkMandate('780', '780', 'steel_section').valid).toBe(true)
    expect(checkMandate('785', '780', 'steel_section').valid).toBe(false)
    expect(checkMandate('702', '780', 'steel_section').valid).toBe(false)
    expect(checkMandate('0', '780', 'steel_section').valid).toBe(false)
    expect(checkMandate('', '780', 'steel_section').valid).toBe(false)
    expect(checkMandate('700', '', 'steel_section').valid).toBe(false)
    expect(checkMandate('abc', '780', 'steel_section').valid).toBe(false)
    expect(checkMandate('700.5', '780', 'steel_section').valid).toBe(false)
  })
})
