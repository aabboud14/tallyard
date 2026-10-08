// P3: privacy by construction, proved on every view model. The buyer side (architect, client, consultant) never
// receives a seller-private string; the seller never receives a buyer-private string before accepting a request.
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, U, viewer } from './fixtures'
import type { AppData, Viewer } from '../store/types'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from '../domain/privacy/privateStrings'
import { itemByTag, lotForItem, MERROWGATE_ID, SALLOW_ID, TIVERNE_ID } from '../domain/seed/world'
import { DEFAULT_DISCOVER_QUERY } from '../store/selectors/discover'
import * as sel from '../store/selectors'
import { projectsOfUser, buildingsOfUser } from '../store/access'
import { listingOf, marketplaceListings, projectWishlist } from '../store/lots'
import { saveToProject, sendToClient, decideItem } from '../store/actions/shortlist'
import { requestReservation, decideReservation } from '../store/actions/reservations'
import { setLotVisibility, setProjectAccess } from '../store/actions/owner'
import { captureItem } from '../store/actions/surveyor'
import { draftFromText } from '../store/capture'
import { itemsOf } from '../store/selectors/owner'

const LOT_ID = /\blot_[a-z0-9]{6}\b/

function allLotStrings(s: AppData): string[] {
  const out = new Set<string>()
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) out.add(x)
  }
  return [...out]
}

function allProjectStrings(s: AppData): string[] {
  const out = new Set<string>()
  for (const p of Object.values(s.world.projects)) for (const x of projectPrivateStrings(p, s.world)) out.add(x)
  return [...out]
}

/** Every view model a buyer-side person can open, as named JSON. */
function buyerViews(s: AppData, v: Viewer): [string, unknown][] {
  const out: [string, unknown][] = []
  const add = (name: string, x: unknown) => out.push([name, x])
  add('architectHome', sel.architectHome(s, v))
  add('clientHome', sel.clientHome(s, v))
  add('consultantHome', sel.consultantHome(s, v))
  add('discover', sel.discoverView(s, v, DEFAULT_DISCOVER_QUERY))
  add('saved', sel.savedView(s, v))
  add('projects', sel.projectsListView(s, v))
  add('newProject', sel.newProjectOptions(s, v))
  add('inbox', sel.inboxView(s, v))
  add('bell', sel.bellView(s, v))
  add('nav', sel.navModel(s, v))
  add('search', sel.searchIndex(s, v))
  add('team', sel.teamView(s, v))
  add('profile', sel.profileView(s, v))
  add('organisation', sel.organisationView(s, v))
  add('notificationSettings', sel.notificationSettings(s, v))
  add('engagements', sel.engagementsOf(s, v).map((e) => sel.wasteView(s, v, e.id)))
  const publicIds = new Set(marketplaceListings(s).map((l) => l.publicId))
  for (const p of projectsOfUser(s, v.userId)) {
    add(`discover ${p.name}`, sel.discoverView(s, v, { ...DEFAULT_DISCOVER_QUERY, projectId: p.id, tab: 'shared', fitsOnly: true }))
    add(`header ${p.name}`, sel.projectHeader(s, v, p.id))
    add(`overview ${p.name}`, sel.projectOverview(s, v, p.id))
    add(`board ${p.name}`, sel.shortlistBoard(s, v, p.id))
    add(`spec ${p.name}`, [sel.specificationView(s, v, p.id, 'approved'), sel.specificationView(s, v, p.id, 'draft')])
    add(`carbon ${p.name}`, sel.projectCarbon(s, v, p.id))
    add(`team ${p.name}`, sel.projectTeam(s, v, p.id))
    add(`activity ${p.name}`, sel.projectActivity(s, v, p.id))
    add(`approvals ${p.name}`, sel.approvalsView(s, v, p.id))
    add(`reservations ${p.name}`, sel.reservationsView(s, v, p.id))
    add(`compliance ${p.name}`, sel.complianceView(s, v, p.id))
    for (const it of projectWishlist(s.world, p.id)?.items ?? []) publicIds.add(it.publicId)
    for (const g of sel.sharedGroups(s, v)) for (const c of g.cards) publicIds.add(c.publicId)
  }
  for (const id of publicIds) {
    for (const p of [null, ...projectsOfUser(s, v.userId).map((x) => x.id)]) add(`material ${id} ${p}`, sel.materialView(s, v, id, p))
    add(`geometry ${id}`, [sel.geometryFile(s, v, id, 'dxf'), sel.geometryFile(s, v, id, 'obj')])
  }
  return out
}

/** Every view model an asset owner can open, as named JSON. */
function ownerViews(s: AppData, v: Viewer): [string, unknown][] {
  const out: [string, unknown][] = []
  const add = (name: string, x: unknown) => out.push([name, x])
  add('ownerHome', sel.ownerHome(s, v))
  add('buildings', sel.buildingsList(s, v))
  add('sharing', sel.sharingView(s, v))
  add('requests', sel.requestsView(s, v))
  add('inbox', sel.inboxView(s, v))
  add('bell', sel.bellView(s, v))
  add('nav', sel.navModel(s, v))
  add('search', sel.searchIndex(s, v))
  add('team', sel.teamView(s, v))
  add('notificationSettings', sel.notificationSettings(s, v))
  for (const b of buildingsOfUser(s, v.userId)) {
    add(`overview ${b.name}`, sel.buildingOverview(s, v, b.id))
    add(`inventory ${b.name}`, sel.inventoryView(s, v, b.id))
    add(`priorities ${b.name}`, sel.prioritiesView(s, v, b.id))
    add(`listings ${b.name}`, sel.listingsView(s, v, b.id))
    add(`capture ${b.name}`, sel.captureView(s, v, b.id))
    for (const item of itemsOf(s, b.id)) {
      add(`item ${item.tag}`, sel.itemDetail(s, v, b.id, item.id))
      const lot = lotForItem(s.world, item.id)
      add(`draft ${item.tag}`, sel.listingDraftView(s, v, lot.id, { visibility: 'published', ask: '100', reserve: '90', availableFrom: '' }))
    }
  }
  return out
}

function expectNone(views: [string, unknown][], strings: string[], who: string): void {
  for (const [name, view] of views) {
    const text = JSON.stringify(view)
    for (const x of strings) expect(text.includes(x), `${who}, ${name} leaks "${x}"`).toBe(false)
  }
}

function expectNoInternalIds(views: [string, unknown][], who: string): void {
  for (const [name, view] of views) {
    const text = JSON.stringify(view)
    expect(INTERNAL_ID.test(text), `${who}, ${name} holds an internal ID`).toBe(false)
    expect(LOT_ID.test(text), `${who}, ${name} holds a lot ID`).toBe(false)
  }
}

/** A busy sandbox: shortlists, a new request, new listings, a new share and a new capture, nothing accepted. */
function busy(): AppData {
  let s = fresh()
  s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', MERROWGATE_ID)).state
  s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', SALLOW_ID)).state
  s = must(saveToProject(s, actor(U.priya), 'L-MNY55K', MERROWGATE_ID)).state
  const item = projectWishlist(s.world, MERROWGATE_ID)!.items.find((x) => x.publicId === 'L-9F4CQQ')!.id
  s = must(sendToClient(s, actor(U.priya), MERROWGATE_ID, null, 'Two for the frame.')).state
  s = must(decideItem(s, actor(U.isla), MERROWGATE_ID, item, 'approved', 'Yes.')).state
  s = must(requestReservation(s, actor(U.isla), MERROWGATE_ID, item, 'For the upper floors.')).state
  s = must(setLotVisibility(s, actor(U.tom), lotForItem(s.world, itemByTag(s.world, 'TH-07').id).id, { visibility: 'published', ask: 180, reserve: 165 })).state
  s = must(setLotVisibility(s, actor(U.tom), lotForItem(s.world, itemByTag(s.world, 'TH-08').id).id, { visibility: 'shared', ask: 300, reserve: 270 })).state
  s = must(setProjectAccess(s, actor(U.tom), SALLOW_ID, true)).state
  const d = draftFromText('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
  s = must(captureItem(s, actor(U.dana), { buildingId: TIVERNE_ID, spec: d.spec!, quantity: d.quantity!, condition: 'A', recoverability: 'A', location: d.location, notes: '', photoIds: [], expectedAvailableFrom: null })).state
  return s
}

describe('P3 on the platform: the buyer side never receives a seller-private string', () => {
  for (const [label, make] of [['fresh sandbox', fresh], ['busy sandbox', busy]] as const) {
    it(`architect, client and consultant views, ${label}`, () => {
      const s = make()
      const strings = allLotStrings(s)
      expect(strings).toEqual(expect.arrayContaining(['Tiverne House', 'Ostlea Estates', 'Tom Ashby', 'Dana Kowalski', 'Tarnbrook Deconstruction', 'TH-01', 'OS-11']))
      for (const [who, id] of [['Priya', U.priya], ['Isla', U.isla], ['Marcus', U.marcus]] as const) {
        const views = buyerViews(s, viewer(id))
        expect(views.length).toBeGreaterThan(30)
        expectNone(views, strings, who)
        expectNoInternalIds(views, who)
      }
    })
  }

  it('after the seller accepts, the client sees the seller; the architect and consultant still do not', () => {
    let s = busy()
    const res = Object.values(s.reservations).find((r) => r.publicId === 'L-9F4CQQ')!
    s = must(decideReservation(s, actor(U.tom), res.id, 'accepted', 'Held for you.')).state
    const client = JSON.stringify(sel.reservationsView(s, viewer(U.isla), MERROWGATE_ID))
    expect(client).toContain('Ostlea Estates')
    expect(client).toContain('Tom Ashby')
    expect(client).toContain('tom.ashby@ostlea.example')
    const strings = allLotStrings(s)
    expectNone(buyerViews(s, viewer(U.priya)), strings, 'Priya')
    expectNone(buyerViews(s, viewer(U.marcus)), strings, 'Marcus')
  })

  it('a material page holds public listing fields only', () => {
    const s = fresh()
    const m = sel.materialView(s, viewer(U.priya), 'L-9F4CQQ', MERROWGATE_ID)!
    expect(m.listing).toEqual(listingOf(s.world, lotForItem(s.world, itemByTag(s.world, 'TH-01').id)))
    expect(sel.materialView(s, viewer(U.priya), 'L-DAXNV3', null)).toBeNull()
    expect(sel.materialView(s, viewer(U.priya), 'L-K3TB7D', null)).toBeNull()
    expect(sel.materialView(s, viewer(U.tom), 'L-9F4CQQ', null)).toBeNull()
  })
})

describe('P3 on the platform: the seller never receives a buyer-private string before accepting', () => {
  for (const [label, make] of [['fresh sandbox', fresh], ['busy sandbox', busy]] as const) {
    it(`owner views, ${label}`, () => {
      const s = make()
      const strings = allProjectStrings(s)
      expect(strings).toEqual(expect.arrayContaining(['Merrowgate Wharf', 'Lantern Quay Developments', 'Studio Oriel', 'Isla Brennan', 'Priya Nair', 'Newham']))
      const views = ownerViews(s, viewer(U.tom))
      expect(views.length).toBeGreaterThan(30)
      expectNone(views, strings, 'Tom')
    })
  }

  it('the surveyor sees no buyer either', () => {
    const s = busy()
    const v = viewer(U.dana)
    const views: [string, unknown][] = [['home', sel.surveyorHome(s, v)], ['nav', sel.navModel(s, v)], ['inbox', sel.inboxView(s, v)], ['search', sel.searchIndex(s, v)]]
    for (const b of buildingsOfUser(s, U.dana)) {
      views.push([`inventory ${b.name}`, sel.inventoryView(s, v, b.id)], [`capture ${b.name}`, sel.captureView(s, v, b.id)], [`overview ${b.name}`, sel.buildingOverview(s, v, b.id)])
      for (const item of itemsOf(s, b.id)) views.push([`item ${item.tag}`, sel.itemDetail(s, v, b.id, item.id)])
    }
    expectNone(views, allProjectStrings(s), 'Dana')
  })

  it('after accepting, the owner sees the buyer organisation and contact on that request only', () => {
    let s = busy()
    const res = Object.values(s.reservations).find((r) => r.publicId === 'L-9F4CQQ')!
    s = must(decideReservation(s, actor(U.tom), res.id, 'accepted', '')).state
    const rows = sel.requestsView(s, viewer(U.tom))!
    const accepted = rows.decided.find((r) => r.id === res.id)!
    expect(accepted.buyer).toEqual({ kind: 'known', org: 'Lantern Quay Developments', contact: 'Isla Brennan', email: 'isla.brennan@lanternquay.example', message: 'For the upper floors.' })
    const other = rows.pending.find((r) => r.publicId === 'L-WPX5A6')!
    expect(other.buyer.kind).toBe('blind')
    expect(JSON.stringify(other)).not.toContain('Lantern')
  })
})
