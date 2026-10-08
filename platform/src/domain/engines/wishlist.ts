// Wish list rules (brief/09-V1-PRODUCT.md sections 5.8 and 13.5). Pure: every function returns a new list.
import type { PublicListing } from '../types'
import type { WishStatus, WishTotals, Wishlist, WishlistItem } from '../v1types'
import { DEMO_TODAY } from '../constants'

export const MOVE_REASONS = {
  approved: 'Approved by the client. It stays on this project.',
  sent: 'With the client for a decision. It stays on this project until the client decides.',
  missing: 'Not on this list.',
  present: 'Already on this list.',
} as const

function suffixOf(listId: string): string {
  const i = listId.indexOf('_')
  return i < 0 ? listId : listId.slice(i + 1)
}

/** wli_<list id suffix>_<n>, one more than the highest counter already used on this list. */
export function nextWishItemId(list: Wishlist): string {
  const prefix = `wli_${suffixOf(list.id)}_`
  let high = 0
  for (const it of list.items) {
    if (!it.id.startsWith(prefix)) continue
    const n = Number(it.id.slice(prefix.length))
    if (Number.isInteger(n) && n > high) high = n
  }
  return prefix + String(high + 1)
}

function update(list: Wishlist, itemId: string, fn: (it: WishlistItem) => WishlistItem | null): Wishlist {
  const it = list.items.find((x) => x.id === itemId)
  if (!it) return list
  const next = fn(it)
  if (next === null) return list
  return { ...list, items: list.items.map((x) => (x.id === itemId ? next : x)) }
}

/** Adds a pending item. The same public ID twice on one list is a no-op. */
export function addToWishlist(list: Wishlist, publicId: string, personaId: string, today: string = DEMO_TODAY): Wishlist {
  if (list.items.some((x) => x.publicId === publicId)) return list
  const item: WishlistItem = { id: nextWishItemId(list), publicId, addedOn: today, addedByPersonaId: personaId, note: '', status: 'pending', decidedOn: null, decisionNote: null }
  return { ...list, items: [...list.items, item] }
}

/** The architect cannot remove an approved item. */
export function removeFromWishlist(list: Wishlist, itemId: string): Wishlist {
  const it = list.items.find((x) => x.id === itemId)
  if (!it || it.status === 'approved') return list
  return { ...list, items: list.items.filter((x) => x.id !== itemId) }
}

function moveBlock(status: WishStatus): string | null {
  if (status === 'approved') return MOVE_REASONS.approved
  if (status === 'sent') return MOVE_REASONS.sent
  return null
}

/** Lifts an item out of a list to move it. Approved and sent items stay where they are. */
export function takeItem(list: Wishlist, itemId: string): { list: Wishlist; item: WishlistItem | null; reason: string | null } {
  const it = list.items.find((x) => x.id === itemId)
  if (!it) return { list, item: null, reason: MOVE_REASONS.missing }
  const blocked = moveBlock(it.status)
  if (blocked) return { list, item: null, reason: blocked }
  return { list: { ...list, items: list.items.filter((x) => x.id !== itemId) }, item: it, reason: null }
}

/** Puts a moved item on a list as pending, with a new ID from that list. The client's earlier decision does not travel. */
export function putItem(list: Wishlist, item: WishlistItem): { list: Wishlist; reason: string | null } {
  const blocked = moveBlock(item.status)
  if (blocked) return { list, reason: blocked }
  if (list.items.some((x) => x.publicId === item.publicId)) return { list, reason: MOVE_REASONS.present }
  const moved: WishlistItem = { ...item, id: nextWishItemId(list), status: 'pending', decidedOn: null, decisionNote: null }
  return { list: { ...list, items: [...list.items, moved] }, reason: null }
}

/** Every pending item goes to the client. */
export function sendToClient(list: Wishlist): Wishlist {
  if (!list.items.some((x) => x.status === 'pending')) return list
  return { ...list, items: list.items.map((x) => (x.status === 'pending' ? { ...x, status: 'sent' as const } : x)) }
}

/** The client's decision, only on an item sent to them. */
export function decideItem(list: Wishlist, itemId: string, decision: 'approved' | 'declined', note: string, today: string = DEMO_TODAY): Wishlist {
  return update(list, itemId, (it) => (it.status === 'sent' ? { ...it, status: decision, decidedOn: today, decisionNote: note } : null))
}

/** A declined item goes back to pending with the architect's new note, ready to send again. */
export function reopenItem(list: Wishlist, itemId: string, note: string): Wishlist {
  return update(list, itemId, (it) => (it.status === 'declined' ? { ...it, status: 'pending', note, decidedOn: null, decisionNote: null } : null))
}

export function editNote(list: Wishlist, itemId: string, note: string): Wishlist {
  return update(list, itemId, (it) => (it.note === note ? null : { ...it, note }))
}

const STATUSES: WishStatus[] = ['pending', 'sent', 'approved', 'declined']

/** Counts, mass and avoided carbon by state, from rows whose listing resolves and is still available. */
export function wishlistTotals(items: WishlistItem[], resolve: (publicId: string) => PublicListing | null): Record<WishStatus | 'all', WishTotals> {
  const out = { all: { count: 0, massT: 0, avoidedT: 0 } } as Record<WishStatus | 'all', WishTotals>
  for (const s of STATUSES) out[s] = { count: 0, massT: 0, avoidedT: 0 }
  for (const it of items) {
    const l = resolve(it.publicId)
    if (!l || l.status !== 'Available') continue
    const avoided = l.carbon?.avoidedT ?? 0
    for (const key of [it.status, 'all'] as const) {
      out[key] = { count: out[key].count + 1, massT: out[key].massT + l.massT, avoidedT: out[key].avoidedT + avoided }
    }
  }
  return out
}
