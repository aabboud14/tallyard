import { describe, it, expect } from 'vitest'
import type { PublicListing } from '../types'
import type { Wishlist, WishlistItem } from '../v1types'
import { DEMO_TODAY } from '../constants'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { addToWishlist, decideItem, editNote, MOVE_REASONS, nextWishItemId, putItem, removeFromWishlist, reopenItem, sendToClient, takeItem, wishlistTotals } from './wishlist'

const empty = (id = 'wl_merrow', projectId: string | null = 'prj_hp23zk'): Wishlist => ({ id, orgId: 'org_oriel', projectId, items: [] })
const item = (id: string, publicId: string, status: WishlistItem['status'], extra: Partial<WishlistItem> = {}): WishlistItem => ({ id, publicId, addedOn: '2026-10-01', addedByPersonaId: 'per_priya', note: '', status, decidedOn: null, decisionNote: null, ...extra })
const freeze = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

describe('nextWishItemId', () => {
  it('starts at 1 and follows the highest counter on the list', () => {
    expect(nextWishItemId(empty())).toBe('wli_merrow_1')
    const l = { ...empty(), items: [item('wli_merrow_1', 'L-A', 'pending'), item('wli_merrow_4', 'L-B', 'pending'), item('wli_other_9', 'L-C', 'pending')] }
    expect(nextWishItemId(l)).toBe('wli_merrow_5')
  })

  it('uses the whole list ID when it has no prefix', () => {
    expect(nextWishItemId(empty('saved'))).toBe('wli_saved_1')
  })
})

describe('addToWishlist and removeFromWishlist', () => {
  it('adds a pending item stamped with the demo date', () => {
    const before = empty()
    const l = addToWishlist(before, 'L-9F4CQQ', 'per_priya')
    expect(l.items).toEqual([{ id: 'wli_merrow_1', publicId: 'L-9F4CQQ', addedOn: DEMO_TODAY, addedByPersonaId: 'per_priya', note: '', status: 'pending', decidedOn: null, decisionNote: null }])
    expect(before.items).toEqual([])
  })

  it('is a no-op for a public ID already on the list', () => {
    const l = addToWishlist(empty(), 'L-9F4CQQ', 'per_priya')
    expect(addToWishlist(l, 'L-9F4CQQ', 'per_priya')).toBe(l)
  })

  it('removes any item except an approved one', () => {
    const l = { ...empty(), items: [item('a', 'L-A', 'pending'), item('b', 'L-B', 'approved'), item('c', 'L-C', 'declined')] }
    const snapshot = freeze(l)
    expect(removeFromWishlist(l, 'a').items.map((x) => x.id)).toEqual(['b', 'c'])
    expect(removeFromWishlist(l, 'c').items.map((x) => x.id)).toEqual(['a', 'b'])
    expect(removeFromWishlist(l, 'b')).toBe(l)
    expect(removeFromWishlist(l, 'missing')).toBe(l)
    expect(l).toEqual(snapshot)
  })
})

describe('moving between lists', () => {
  it('takes a pending or declined item and puts it on another list as pending with a new ID', () => {
    const from = { ...empty('wl_saved', null), items: [item('wli_saved_1', 'L-CJGQP7', 'declined', { note: 'For the lobby', decidedOn: '2026-10-05', decisionNote: 'Not this one' })] }
    const to = { ...empty(), items: [item('wli_merrow_2', 'L-A', 'pending')] }
    const t = takeItem(from, 'wli_saved_1')
    expect(t.reason).toBeNull()
    expect(t.list.items).toEqual([])
    expect(from.items).toHaveLength(1)
    const p = putItem(to, t.item!)
    expect(p.reason).toBeNull()
    expect(p.list.items[1]).toEqual({ id: 'wli_merrow_3', publicId: 'L-CJGQP7', addedOn: '2026-10-01', addedByPersonaId: 'per_priya', note: 'For the lobby', status: 'pending', decidedOn: null, decisionNote: null })
    expect(to.items).toHaveLength(1)
  })

  it('refuses to move approved and sent items, with a reason', () => {
    const l = { ...empty(), items: [item('a', 'L-A', 'approved'), item('s', 'L-S', 'sent')] }
    expect(takeItem(l, 'a')).toEqual({ list: l, item: null, reason: MOVE_REASONS.approved })
    expect(takeItem(l, 's')).toEqual({ list: l, item: null, reason: MOVE_REASONS.sent })
    expect(takeItem(l, 'x')).toEqual({ list: l, item: null, reason: MOVE_REASONS.missing })
    const target = empty('wl_other')
    expect(putItem(target, item('a', 'L-A', 'approved'))).toEqual({ list: target, reason: MOVE_REASONS.approved })
    expect(putItem(target, item('s', 'L-S', 'sent'))).toEqual({ list: target, reason: MOVE_REASONS.sent })
  })

  it('does not put a public ID twice on one list', () => {
    const target = { ...empty(), items: [item('wli_merrow_1', 'L-A', 'pending')] }
    expect(putItem(target, item('z', 'L-A', 'pending'))).toEqual({ list: target, reason: MOVE_REASONS.present })
  })
})

describe('client decisions', () => {
  it('sends every pending item to the client and leaves the others', () => {
    const l = { ...empty(), items: [item('a', 'L-A', 'pending'), item('b', 'L-B', 'approved'), item('c', 'L-C', 'pending'), item('d', 'L-D', 'declined')] }
    const s = sendToClient(l)
    expect(s.items.map((x) => x.status)).toEqual(['sent', 'approved', 'sent', 'declined'])
    expect(l.items[0].status).toBe('pending')
    const none = { ...empty(), items: [item('b', 'L-B', 'approved')] }
    expect(sendToClient(none)).toBe(none)
  })

  it('decides only a sent item, stamping the date and the note', () => {
    const l = { ...empty(), items: [item('a', 'L-A', 'sent'), item('b', 'L-B', 'pending')] }
    const ok = decideItem(l, 'a', 'approved', 'Yes for the core')
    expect(ok.items[0]).toEqual({ ...l.items[0], status: 'approved', decidedOn: DEMO_TODAY, decisionNote: 'Yes for the core' })
    expect(decideItem(l, 'a', 'declined', 'Too far', '2026-11-02').items[0]).toMatchObject({ status: 'declined', decidedOn: '2026-11-02', decisionNote: 'Too far' })
    expect(decideItem(l, 'b', 'approved', '')).toBe(l)
    expect(decideItem(ok, 'a', 'declined', '')).toBe(ok)
    expect(l.items[0].status).toBe('sent')
  })

  it('reopens a declined item with a new note, clearing the decision, ready to send again', () => {
    const l = { ...empty(), items: [item('a', 'L-A', 'declined', { note: 'old', decidedOn: '2026-10-06', decisionNote: 'Too far' }), item('b', 'L-B', 'approved')] }
    const r = reopenItem(l, 'a', 'Closer hub now')
    expect(r.items[0]).toEqual({ ...l.items[0], status: 'pending', note: 'Closer hub now', decidedOn: null, decisionNote: null })
    expect(reopenItem(l, 'b', 'x')).toBe(l)
    expect(sendToClient(r).items[0].status).toBe('sent')
  })

  it('edits a note', () => {
    const l = { ...empty(), items: [item('a', 'L-A', 'pending')] }
    expect(editNote(l, 'a', 'For level 3').items[0].note).toBe('For level 3')
    expect(editNote(l, 'a', '')).toBe(l)
    expect(editNote(l, 'missing', 'x')).toBe(l)
    expect(l.items[0].note).toBe('')
  })
})

describe('wishlistTotals', () => {
  const w = createSeed()
  const byId = new Map(Object.values(w.lots).map((lot) => [lot.publicId, listingFor(w, lot.id, A)] as const))
  const resolve = (publicId: string): PublicListing | null => byId.get(publicId) ?? null

  it('sums count, mass and avoided carbon by state and in all', () => {
    const items = [item('a', 'L-9F4CQQ', 'approved'), item('b', 'L-A945G6', 'pending'), item('c', 'L-YZ2C7H', 'pending'), item('d', 'L-Q23X7N', 'sent')]
    const t = wishlistTotals(items, resolve)
    const L = (id: string) => resolve(id)!
    expect(t.approved).toEqual({ count: 1, massT: L('L-9F4CQQ').massT, avoidedT: L('L-9F4CQQ').carbon!.avoidedT })
    expect(t.pending.count).toBe(2)
    expect(t.pending.massT).toBeCloseTo(L('L-A945G6').massT + L('L-YZ2C7H').massT, 9)
    expect(t.pending.avoidedT).toBeCloseTo(L('L-A945G6').carbon!.avoidedT, 9) // nothing claimed counts as 0
    expect(t.sent.count).toBe(1)
    expect(t.declined).toEqual({ count: 0, massT: 0, avoidedT: 0 })
    expect(t.all.count).toBe(4)
    expect(t.all.massT).toBeCloseTo(t.approved.massT + t.pending.massT + t.sent.massT, 9)
    expect(t.all.avoidedT).toBeCloseTo(t.approved.avoidedT + t.pending.avoidedT + t.sent.avoidedT, 9)
  })

  it('leaves out rows that no longer resolve or are no longer available', () => {
    const items = [item('a', 'L-9F4CQQ', 'pending'), item('b', 'L-R8Q33F', 'pending'), item('c', 'L-NOPE00', 'approved')]
    const t = wishlistTotals(items, resolve)
    expect(t.pending.count).toBe(1)
    expect(t.approved.count).toBe(0)
    expect(t.all.count).toBe(1)
  })
})
