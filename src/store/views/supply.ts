// View helpers for the surveyor and selling owner screens (brief/09-V1-PRODUCT.md sections 3.1, 3.2, 13.2 and 13.3).
// Pure: World in, plain values out. The supply screens format what these return; they never count or compare.
import type { Deal, FamilyId, InventoryItem, Lot, PublicListing, SourceBuilding, Visibility, World } from '../../domain/types'
import type { DecisionRoute } from '../../domain/v1types'
import type { PriorityRow, PriorityResult } from '../../domain/engines/priority'
import { DEMO_TODAY } from '../../domain/constants'
import { canAccess, roleOf, type Role } from '../../domain/access'
import { monthKey } from '../../domain/dates'
import { FAMILIES } from '../../domain/reference/families'
import { DECISION_ROUTE_LABELS, OWNER_VISIBILITY_LABELS } from '../../domain/reference/labels'
import { decisionTreeRoute } from '../../domain/engines/route'
import { ticksOf } from '../../domain/money'
import { isIsoDate } from '../v1actions'
import { disclosureFor, previewListing, priorityFor, type ItemView } from '../selectors'
import { ownerSharingView, type OwnerSharingRow } from '../v1selectors'
import type { Disclosure } from '../../domain/engines/disclosure'
import * as f from '../../domain/format'

function roleOrNull(world: World, personaId: string): Role | null {
  try {
    return roleOf(world, personaId)
  } catch {
    return null
  }
}

// ---------- Access ----------

export type SupplyAccess = { inventory: boolean; capture: boolean; priority: boolean; listings: boolean }

const NONE: SupplyAccess = { inventory: false, capture: false, priority: false, listings: false }

/**
 * Which supply screens the persona may open for a building. The surveyor and the owner both read the inventory and
 * capture; priority and listings are the owner's decisions, so they need the selling owner of that very building.
 */
export function supplyAccess(world: World, personaId: string, buildingId: string): SupplyAccess {
  const building = world.buildings[buildingId]
  if (!building || !canAccess(world, personaId, { buildingId })) return NONE
  const role = roleOrNull(world, personaId)
  const orgId = world.personas[personaId]?.orgId ?? null
  const owner = role === 'seller' && building.ownerOrgId === orgId
  const surveyor = role === 'surveyor' && building.surveyorOrgId === orgId
  return { inventory: owner || surveyor, capture: owner || surveyor, priority: owner, listings: owner }
}

/** The selling owner's organisation, or null when the persona is not a selling owner (Offers and deals). */
export function sellerOrgId(world: World, personaId: string): string | null {
  if (roleOrNull(world, personaId) !== 'seller') return null
  return world.personas[personaId]?.orgId ?? null
}

/** The building's client (its owner) by name. */
export function clientName(world: World, building: SourceBuilding): string {
  return building.ownerOrgId ? (world.orgs[building.ownerOrgId]?.name ?? '') : ''
}

// ---------- Capture: expected availability ----------

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

/** How many years ahead of the later of today and the dismantling start the year select reaches. */
const YEARS_AHEAD = 3

/** The month the expected availability starts at: the building's dismantling start, or the demo month without one. */
export function expectedDefaultMonth(building: SourceBuilding): string {
  return monthKey(building.programme.dismantlingStart ?? DEMO_TODAY)
}

/** Years offered in the expected availability select: the demo year up to three years past the dismantling start. */
export function expectedYearOptions(building: SourceBuilding): number[] {
  const first = Number(DEMO_TODAY.slice(0, 4))
  const last = Math.max(first, Number(expectedDefaultMonth(building).slice(0, 4))) + YEARS_AHEAD
  const out: number[] = []
  for (let y = first; y <= last; y++) out.push(y)
  return out
}

/** A YYYY-MM key from the two selects (month 1 to 12). */
export function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * The ISO date saved as the item's expected availability. Left on the default month it is the dismantling start
 * itself (13.3: 2027-01-25 for Tiverne House), so a capture that keeps the default changes no date. Any other month is
 * stored as its first day (5.1).
 */
export function expectedFromMonth(building: SourceBuilding, key: string): string {
  const start = building.programme.dismantlingStart
  if (start && monthKey(start) === key) return start
  return `${key}-01`
}

/** "March 2027", or "Not set". */
export function expectedText(iso: string | null): string {
  return iso ? f.month(iso) : 'Not set'
}

// ---------- Inventory ----------

/** 48 pieces, 600 m2, 20,000 bricks, 3,000 panels, 22 m3. */
export function quantityText(item: InventoryItem): string {
  const q = item.quantity
  if (q.kind === 'area') return f.quantity(q.areaM2, 'm2')
  if (q.kind === 'volume') return f.quantity(q.volumeM3, 'm3')
  const unit = item.family === 'clay_brick' ? 'bricks' : item.family === 'raised_floor' ? 'panels' : 'pieces'
  return f.quantity(q.pieces, unit)
}

export type VisibilityTone = 'oxide' | 'steel' | 'teal'

/** Private in oxide (it stays inside), shared in steel, published in teal. */
export function visibilityTone(v: Visibility): VisibilityTone {
  return v === 'open' ? 'teal' : v === 'matched_only' ? 'steel' : 'oxide'
}

/** The owner's words for a lot's visibility (13.2). */
export function ownerVisibility(v: Visibility): string {
  return OWNER_VISIBILITY_LABELS[v]
}

export type VisibilityCounts = Record<Visibility, number>

/** How many of the building's lots sit at each visibility. */
export function visibilityCounts(world: World, buildingId: string): VisibilityCounts {
  const out: VisibilityCounts = { private: 0, matched_only: 0, open: 0 }
  for (const l of Object.values(world.lots)) if (world.items[l.itemId]?.buildingId === buildingId) out[l.visibility]++
  return out
}

// ---------- Priority ----------

export type PriorityViewRow = PriorityRow & { treeRoute: DecisionRoute; treeLabel: string; tone: 'teal' | 'survey' | 'oxide' | 'grey' }

export type LegendStep = { route: DecisionRoute; step: number; label: string; assigned: boolean; count: number; hint: string }

export type PriorityView = { result: PriorityResult; rows: PriorityViewRow[]; recoverCount: number; legend: LegendStep[] }

const TREE: DecisionRoute[] = ['reuse', 'upcycle', 'downcycle', 'recycle', 'scrap']

const TREE_HINTS: Record<DecisionRoute, string> = {
  reuse: 'Recovered intact and used again for the same purpose.',
  upcycle: 'Reworked into a product of higher value.',
  downcycle: 'Crushed, chipped or broken for a lower use.',
  recycle: 'Reprocessed into the same material, such as steel remelted.',
  scrap: 'Disposed of with no material recovered.',
}

/** Steps the rule in this version assigns (L41). */
const ASSIGNED: DecisionRoute[] = ['reuse', 'downcycle', 'recycle']

const TREE_TONE: Record<DecisionRoute, PriorityViewRow['tone']> = { reuse: 'teal', upcycle: 'teal', downcycle: 'survey', recycle: 'oxide', scrap: 'grey' }

/** The ranking with each row's step on the UK decision tree, and the legend with how many rows sit at each step. */
export function priorityView(world: World, buildingId: string): PriorityView {
  const result = priorityFor(world, buildingId)
  const rows = result.rows.map((row) => {
    const family: FamilyId = world.items[row.itemId].family
    const treeRoute = decisionTreeRoute(family, row.route)
    return { ...row, treeRoute, treeLabel: DECISION_ROUTE_LABELS[treeRoute], tone: TREE_TONE[treeRoute] }
  })
  const legend = TREE.map((route, i) => ({
    route,
    step: i + 1,
    label: DECISION_ROUTE_LABELS[route],
    assigned: ASSIGNED.includes(route),
    count: rows.filter((r) => r.treeRoute === route).length,
    hint: TREE_HINTS[route],
  }))
  return { result, rows, recoverCount: rows.filter((r) => r.route === 'recover').length, legend }
}

// ---------- Listings and visibility ----------

export type PublishChoice = Visibility

/** The publish form as typed: the chosen visibility, ask and reserve as text, and the available-from date. */
export type PublishDraft = { visibility: PublishChoice; ask: string; reserve: string; date: string }

/** The publish form as it opens for a lot: shared privately by default, the suggested mandate as the ask and reserve. */
export function publishDefaults(v: ItemView): PublishDraft {
  const tick = FAMILIES[v.item.family].tick
  const d = tick >= 1 ? 0 : 2
  return {
    visibility: v.lot.visibility === 'open' ? 'open' : 'matched_only',
    ask: (v.lot.askPerUnit ?? v.sellerMandate.ask).toFixed(d),
    reserve: (v.lot.reservePerUnit ?? v.sellerMandate.reserve).toFixed(d),
    date: v.lot.availableFrom ?? '',
  }
}

export type PriceCheck = { ask: number; reserve: number; valid: boolean; problem: string | null }

function onTick(x: number, tick: number): boolean {
  return Math.abs(x / tick - Math.round(x / tick)) < 1e-9
}

/** Ask and reserve as typed: both positive, in whole ticks, and the reserve not above the ask. */
export function checkPrices(askText: string, reserveText: string, family: FamilyId): PriceCheck {
  const tick = FAMILIES[family].tick
  const ask = Number(askText)
  const reserve = Number(reserveText)
  const bad = (problem: string): PriceCheck => ({ ask, reserve, valid: false, problem })
  if (askText.trim() === '' || reserveText.trim() === '' || !Number.isFinite(ask) || !Number.isFinite(reserve) || ask <= 0 || reserve <= 0) return bad('Enter an ask and a reserve.')
  if (!onTick(ask, tick) || !onTick(reserve, tick)) return bad(`Use whole steps of ${f.priceOnly(tick, family)}.`)
  if (ticksOf(reserve, tick) > ticksOf(ask, tick)) return bad('The reserve cannot be above the ask.')
  return { ask, reserve, valid: true, problem: null }
}

export type PublishState = {
  /** The lot is already shared or published: the form is replaced by a confirmation. */
  done: boolean
  /** The owner chose to keep the lot private: nothing to publish. */
  keepPrivate: boolean
  /** Publishing in the open marketplace at this disclosure level is blocked (F10). */
  blocked: boolean
  canPublish: boolean
  /** The visibility used for the disclosure score and the market preview. */
  previewAs: 'open' | 'matched_only'
}

/** What the publish control allows for the chosen visibility, prices and disclosure. */
export function publishState(lot: Lot, choice: PublishChoice, prices: PriceCheck, blocksPublishing: boolean): PublishState {
  const done = lot.visibility !== 'private'
  const keepPrivate = choice === 'private'
  const blocked = choice === 'open' && blocksPublishing
  return { done, keepPrivate, blocked, canPublish: !done && !keepPrivate && prices.valid && !blocked, previewAs: choice === 'matched_only' ? 'matched_only' : 'open' }
}

export type DateDraft = { editable: boolean; valid: boolean; changed: boolean }

/** The owner's available-from date: editable only while the lot is private (13.3). */
export function availabilityDraft(lot: Lot, draft: string): DateDraft {
  const valid = isIsoDate(draft)
  return { editable: lot.visibility === 'private', valid, changed: valid && draft !== (lot.availableFrom ?? '') }
}

export type PublishView = { prices: PriceCheck; state: PublishState; disclosure: Disclosure; preview: PublicListing; date: DateDraft }

/** Everything the listings screen shows for the selected lot as the owner edits the form. */
export function publishView(world: World, buildingId: string, v: ItemView, draft: PublishDraft): PublishView {
  const prices = checkPrices(draft.ask, draft.reserve, v.item.family)
  const pending = draft.visibility === 'private' ? null : { lotId: v.lot.id, visibility: draft.visibility }
  const disclosure = disclosureFor(world, buildingId, pending)
  const state = publishState(v.lot, draft.visibility, prices, disclosure.blocksPublishing)
  return { prices, state, disclosure, preview: previewListing(world, v.lot.id, state.previewAs), date: availabilityDraft(v.lot, draft.date) }
}

export type SharingView = { rows: OwnerSharingRow[]; sharedLotCount: number; approvedCount: number }

/** The owner's blind list of projects, with how many they share with (13.4: blind lines only). */
export function sharingView(world: World, ownerOrgId: string): SharingView {
  const v = ownerSharingView(world, ownerOrgId)
  return { ...v, approvedCount: v.rows.filter((r) => r.approved).length }
}

/** The market preview on the item page: the live listing once shared or published, otherwise the open listing it would become. */
export function itemPreview(world: World, v: ItemView): PublicListing {
  return v.lot.visibility === 'private' ? previewListing(world, v.lot.id, 'open') : v.listing
}

// ---------- Offers and deals ----------

/** The family a deal's price is quoted in, from its lot. */
export function dealFamily(world: World, deal: Deal): FamilyId {
  const lot = world.lots[deal.lotId]
  return lot ? world.items[lot.itemId].family : 'steel_section'
}
