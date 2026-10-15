// P3: privacy by construction, proved on every view model. The buyer side (architect, client, consultant) never
// receives a seller-private string; the seller never receives a buyer-private string before accepting a request.
import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, U, viewer } from './fixtures'
import { openShareLink } from '../store/actions/links'
import { setContractorDates } from '../store/actions/contractor'
import { createOwnerProject } from '../store/actions/owner'
import { FENNICK_ID, TIVERNE_LINK_ID } from '../sandbox/seed-owner-surveyor'
import { dateFormats } from '../domain/dates'
import type { AppData, Viewer } from '../store/types'
import { lotPrivateStrings, projectPrivateStrings, INTERNAL_ID } from '../domain/privacy/privateStrings'
import { itemByTag, lotForItem, MERROWGATE_ID, ORG_IDS, SALLOW_ID, TIVERNE_ID } from '../domain/seed/world'
import { DEFAULT_DISCOVER_QUERY } from '../store/selectors/discover'
import * as sel from '../store/selectors'
import { projectsOfUser, buildingsOfUser } from '../store/access'
import { listingOf, marketplaceListings, projectWishlist } from '../store/lots'
import { saveToProject, sendToClient, decideItem } from '../store/actions/shortlist'
import { createProject, decideClientLink } from '../store/actions/projects'
import { requestReservation, decideReservation } from '../store/actions/reservations'
import { setLotVisibility, setProjectAccess } from '../store/actions/owner'
import { captureItem } from '../store/actions/surveyor'
import { draftFromText } from '../store/capture'
import { itemsOf } from '../store/selectors/owner'
import { SCHEME_IDS } from '../domain/reference/certification'
import { addRequirementEvidence, reviewStatement, sendStatementForReview, setCreditStatus, setGoalTarget, setRequirementStatus } from '../store/actions/sustainability'

const LOT_ID = /\blot_[a-z0-9]{6}\b/

/**
 * An IFC file with its GlobalIds masked. They are hashes of the public ID and a role (ifc.test.ts proves it), so
 * a short private string such as a postcode district can appear inside one by chance; everything else is scanned.
 */
function ifcScanned(file: ReturnType<typeof sel.geometryFile>): unknown {
  if (!file || file.kind !== 'file') return file
  return { ...file, text: file.text.replace(/'[0-3][0-9A-Za-z_$]{21}'/g, "'GLOBALID'") }
}

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
  add('consultantDashboard', sel.consultantDashboard(s, v))
  add('discover', sel.discoverView(s, v, DEFAULT_DISCOVER_QUERY))
  add('discover structure', sel.discoverView(s, v, { ...DEFAULT_DISCOVER_QUERY, typology: 'structure' }))
  add('newForProjects', sel.newForProjectsFeed(s, v, null))
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
  add('linkRequests', sel.clientLinkRequests(s, v))
  add('clientDashboard', sel.clientDashboard(s, v))
  add('clientProgramme', sel.clientProgramme(s, v))
  const publicIds = new Set(marketplaceListings(s).map((l) => l.publicId))
  for (const p of projectsOfUser(s, v.userId)) {
    add(`discover ${p.name}`, sel.discoverView(s, v, { ...DEFAULT_DISCOVER_QUERY, projectId: p.id, tab: 'shared', fitsOnly: true }))
    add(`landing ${p.name}`, sel.discoverView(s, v, { ...DEFAULT_DISCOVER_QUERY, projectId: p.id }))
    add(`newForProjects ${p.name}`, sel.newForProjectsFeed(s, v, p.id))
    add(`header ${p.name}`, sel.projectHeader(s, v, p.id))
    add(`overview ${p.name}`, sel.projectOverview(s, v, p.id))
    add(`programme ${p.name}`, [sel.programmeView(s, v, p.id, 'whole'), sel.programmeView(s, v, p.id, 'ahead')])
    add(`requirements ${p.name}`, sel.projectRequirementsView(s, v, p.id))
    add(`programme form ${p.name}`, sel.programmeForm(s, v, p.id))
    add(`board ${p.name}`, sel.shortlistBoard(s, v, p.id))
    add(`spec ${p.name}`, [sel.specificationView(s, v, p.id, 'approved'), sel.specificationView(s, v, p.id, 'draft')])
    add(`carbon ${p.name}`, sel.projectCarbon(s, v, p.id))
    add(`team ${p.name}`, sel.projectTeam(s, v, p.id))
    add(`activity ${p.name}`, sel.projectActivity(s, v, p.id))
    add(`approvals ${p.name}`, sel.approvalsView(s, v, p.id))
    add(`reservations ${p.name}`, sel.reservationsView(s, v, p.id))
    add(`compliance ${p.name}`, sel.complianceView(s, v, p.id))
    for (const [name, view] of sustainabilityViews(s, v, p.id)) add(`${name} ${p.name}`, view)
    for (const it of projectWishlist(s.world, p.id)?.items ?? []) publicIds.add(it.publicId)
    for (const g of sel.sharedGroups(s, v)) for (const c of g.cards) publicIds.add(c.publicId)
  }
  for (const id of publicIds) {
    for (const p of [null, ...projectsOfUser(s, v.userId).map((x) => x.id)]) add(`material ${id} ${p}`, sel.materialView(s, v, id, p))
    add(`geometry ${id}`, [sel.geometryFile(s, v, id, 'dxf'), sel.geometryFile(s, v, id, 'obj'), ifcScanned(sel.geometryFile(s, v, id, 'ifc'))])
  }
  return out
}

/** The round 2 sustainability view models for one project (client-consultant design, section 10). */
function sustainabilityViews(s: AppData, v: Viewer, projectId: string): [string, unknown][] {
  return [
    ['sustainability', sel.sustainabilityView(s, v, projectId)],
    ['goalRows', sel.goalRows(s, v, projectId)],
    ['goals', sel.goalsView(s, v, projectId)],
    ['requirementsTracking', sel.requirementsView(s, v, projectId)],
    ['statement', sel.statementView(s, v, projectId)],
    ['certificationSummary', sel.certificationSummary(s, v, projectId)],
    ...SCHEME_IDS.map((id): [string, unknown] => [`certification ${id}`, sel.certificationView(s, v, projectId, id)]),
    ['complianceWorkbook', sel.complianceWorkbook(s, v, projectId)],
    ['tracking', sel.sustainabilityTracking(s, v, projectId)],
    ['projectMetrics', sel.projectMetrics(s, v, projectId)],
  ]
}

/** Every view model an asset owner can open, as named JSON. */
function ownerViews(s: AppData, v: Viewer): [string, unknown][] {
  const out: [string, unknown][] = []
  const add = (name: string, x: unknown) => out.push([name, x])
  add('ownerHome', sel.ownerHome(s, v))
  add('ownerDashboard', sel.ownerDashboard(s, v))
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

  it('architects and consultants get no guide price and no seller details; the IFC file carries no private string', () => {
    const s = busy()
    for (const id of [U.priya, U.marcus]) {
      const m = sel.materialView(s, viewer(id), 'L-9F4CQQ', null)!
      expect(m.price).toBeNull()
      expect(m.sellerLine).toBeNull()
      expect(m.location.seller).toBeNull()
      expect(m.listing.sellerType.length).toBeGreaterThan(0)
      // Outside the public listing objects themselves, nothing carries the seller type.
      expect(JSON.stringify(m, (k, x) => (k === 'listing' ? undefined : x))).not.toContain('sellerType')
    }
    const strings = allLotStrings(s)
    for (const l of marketplaceListings(s)) {
      const file = sel.geometryFile(s, viewer(U.priya), l.publicId, 'ifc')!
      expect(file.kind).toBe(l.family === 'timber_joist' ? 'unavailable' : 'file')
      const text = JSON.stringify(ifcScanned(file))
      expect(text).not.toContain('£')
      for (const x of strings) expect(text.includes(x), `${l.publicId} IFC leaks "${x}"`).toBe(false)
    }
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
    const views: [string, unknown][] = [['home', sel.surveyorHome(s, v)], ['dashboard', sel.surveyorDashboard(s, v)], ['nav', sel.navModel(s, v)], ['inbox', sel.inboxView(s, v)], ['search', sel.searchIndex(s, v)]]
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

describe('P3 on the platform, round 2: a project of type Other and the notes to the client stay on the buyer side', () => {
  /** Priya creates a project of type Other with a client message; Isla accepts it, approves a shared lot and asks to reserve it; Tom shares with it. */
  function withOther(): { s: AppData; id: string } {
    let s = fresh()
    // The check matches strings, so the project's own suggested dates must not fall on a day a seller keeps private
    // in this sandbox (site start 6 September 2027 would put stage 4 on 20 April 2027, a private lot date).
    const created = must(createProject(s, actor(U.priya), { name: 'Corbel Yard', client: { orgId: ORG_IDS.lantern }, projectType: 'other', projectTypeOther: 'Rooftop lido and spa', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', clientMessage: 'Please accept the Corbel Yard brief.', consultantOrgId: ORG_IDS.halewick }))
    s = created.state
    const id = created.value
    s = must(setProjectAccess(s, actor(U.tom), id, true)).state
    s = must(decideClientLink(s, actor(U.isla), id, 'accepted', '')).state
    s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', id)).state
    const item = projectWishlist(s.world, id)!.items[0].id
    s = must(sendToClient(s, actor(U.priya), id, [item], 'For the pool hall.')).state
    s = must(decideItem(s, actor(U.isla), id, item, 'approved', '')).state
    s = must(requestReservation(s, actor(U.isla), id, item, 'For the lido roof.')).state
    return { s, id }
  }

  it('the owner never receives the type description, the client message or the project', () => {
    const { s, id } = withOther()
    const strings = projectPrivateStrings(s.world.projects[id], s.world)
    expect(strings).toEqual(expect.arrayContaining(['Rooftop lido and spa', 'Please accept the Corbel Yard brief.', 'Corbel Yard']))
    const views = ownerViews(s, viewer(U.tom))
    expectNone(views, strings, 'Tom')
    const blind = JSON.stringify(sel.requestsView(s, viewer(U.tom)))
    expect(blind).toContain('other project')
  })

  it('the buyer side still receives no seller-private string', () => {
    const { s } = withOther()
    const strings = allLotStrings(s)
    for (const [who, id] of [['Priya', U.priya], ['Isla', U.isla], ['Marcus', U.marcus]] as const) expectNone(buyerViews(s, viewer(id)), strings, who)
  })

  it('a declined request reaches the architect with no person from the client', () => {
    let s = fresh()
    const created = must(createProject(s, actor(U.priya), { name: 'Corbel Yard', client: { orgId: ORG_IDS.lantern }, projectType: 'office', localAuthority: '', region: 'Central London', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null }))
    s = must(decideClientLink(created.state, actor(U.isla), created.value, 'declined', 'Not this time.')).state
    const priya = JSON.stringify([sel.projectOverview(s, viewer(U.priya), created.value), sel.projectTeam(s, viewer(U.priya), created.value), sel.projectHeader(s, viewer(U.priya), created.value), sel.inboxView(s, viewer(U.priya)).groups[0]])
    expect(priya).toContain('Lantern Quay Developments declined Corbel Yard')
    expect(priya).not.toContain('Isla Brennan')
    expect(priya).not.toContain('isla.brennan@lanternquay.example')
  })
})

describe('P3 on the platform, round 2: share links, contractors and New projects', () => {
  const LINK_LABEL = 'Primary steel for enquiries'

  it('an architect who opened a link sees public listings only, and never the link name', () => {
    const s = must(openShareLink(fresh(), actor(U.priya), TIVERNE_LINK_ID)).state
    const views: [string, unknown][] = [...buyerViews(s, viewer(U.priya)), ['link', sel.linkView(s, viewer(U.priya), TIVERNE_LINK_ID)]]
    expect(sel.linkView(s, viewer(U.priya), TIVERNE_LINK_ID).state).toBe('open')
    expectNone(views, [...allLotStrings(s), LINK_LABEL], 'Priya')
    expectNoInternalIds(views, 'Priya')
    // Before opening, the terms page says nothing either.
    expectNone([['terms', sel.linkView(fresh(), viewer(U.isla), TIVERNE_LINK_ID)]], [...allLotStrings(s), LINK_LABEL], 'Isla')
  })

  it('the owner learns only the type of who opened a link, never the organisation or the person', () => {
    let s = must(openShareLink(fresh(), actor(U.priya), TIVERNE_LINK_ID)).state
    s = must(openShareLink(s, actor(U.isla), TIVERNE_LINK_ID)).state
    const v = viewer(U.tom)
    const views: [string, unknown][] = [...ownerViews(s, v), ['links', sel.shareLinksView(s, v, TIVERNE_ID)], ['claims', sel.claimRowsForOwner(s, v)], ['testing', sel.testingView(s, v, TIVERNE_ID)]]
    expectNone(views, [...allProjectStrings(s), 'Studio Oriel', 'Priya Nair', 'Isla Brennan', 'Lantern Quay Developments'], 'Tom')
    expect(JSON.stringify(sel.shareLinksView(s, v, TIVERNE_ID))).toContain('architecture practice')
  })

  it('a deconstruction contractor sees no buyer, no project and no price', () => {
    let s = busy()
    const lee = addTestUser(s, { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    s = must(setContractorDates(lee.state, actor(lee.userId), TIVERNE_ID, [{ itemId: itemByTag(lee.state.world, 'TH-01').id, month: '2027-02' }])).state
    const v = viewer(lee.userId)
    const views: [string, unknown][] = [
      ['availability', sel.availabilityView(s, v, TIVERNE_ID)],
      ['overview', sel.buildingOverview(s, v, TIVERNE_ID)],
      ['nav', sel.navModel(s, v)],
      ['inbox', sel.inboxView(s, v)],
      ['home', sel.surveyorHome(s, v)],
      ['search', sel.searchIndex(s, v)],
    ]
    expect(sel.availabilityView(s, v, TIVERNE_ID)).not.toBeNull()
    expectNone(views, allProjectStrings(s), 'Lee')
    for (const [name, view] of views) expect(JSON.stringify(view), `Lee, ${name}`).not.toMatch(/"(ask|askPerUnit|reserve|reservePerUnit|price|guide)"/)
  })

  it("an owner's New project gives the buying side none of the owner's lot strings, and the surveyor none of the project", () => {
    const s0 = fresh()
    const input = { name: 'Wexcombe House', projectType: 'office' as const, localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20' }
    // With no architect yet, nobody else sees the project at all.
    const alone = must(createOwnerProject(s0, actor(U.tom), { ...input, architectOrgId: null }))
    for (const [who, id] of [['Priya', U.priya], ['Isla', U.isla], ['Marcus', U.marcus]] as const) expectNone(buyerViews(alone.state, viewer(id)), allLotStrings(alone.state), who)
    // With Studio Oriel appointed, Priya knows her client by name; nothing else of the owner's buildings reaches her.
    const r = must(createOwnerProject(s0, actor(U.tom), { ...input, architectOrgId: ORG_IDS.oriel }))
    const s = r.state
    const client = ['Ostlea Estates', 'Tom Ashby']
    expectNone(buyerViews(s, viewer(U.priya)), allLotStrings(s).filter((x) => !client.includes(x)), 'Priya')
    expect(JSON.stringify(sel.projectHeader(s, viewer(U.priya), r.value))).toContain('Ostlea Estates')
    for (const [who, id] of [['Isla', U.isla], ['Marcus', U.marcus]] as const) expectNone(buyerViews(s, viewer(id)), allLotStrings(s), who)
    const v = viewer(U.dana)
    const dana: [string, unknown][] = [['home', sel.surveyorHome(s, v)], ['nav', sel.navModel(s, v)], ['inbox', sel.inboxView(s, v)], ['search', sel.searchIndex(s, v)], ['capture', sel.captureTargets(s, v)]]
    for (const b of buildingsOfUser(s, U.dana)) dana.push([`overview ${b.name}`, sel.buildingOverview(s, v, b.id)], [`inventory ${b.name}`, sel.inventoryView(s, v, b.id)], [`testing ${b.name}`, sel.testingView(s, v, b.id)])
    expectNone(dana, ['Wexcombe House', ...dateFormats(s.world.projects[r.value].startDate)], 'Dana')
  })
})

describe('P3 and money, round 2: the sustainability records', () => {
  /** The busy sandbox, with the sustainability records changed by both sides. */
  function withRecords(): AppData {
    let s = busy()
    s = must(setGoalTarget(s, actor(U.marcus), MERROWGATE_ID, 'content_by_value', 0.3, 'Raised with the client.')).state
    s = must(setRequirementStatus(s, actor(U.isla), MERROWGATE_ID, 'gla-ces', 'at_risk')).state
    s = must(addRequirementEvidence(s, actor(U.isla), MERROWGATE_ID, 'gla-ces', { text: 'Board approved the approach.', output: 'specification' })).state
    s = must(setCreditStatus(s, actor(U.marcus), MERROWGATE_ID, 'breeam-mat03', 'at_risk')).state
    s = must(reviewStatement(s, actor(U.isla), MERROWGATE_ID, 'Happy with the approach.')).state
    s = must(sendStatementForReview(s, actor(U.marcus), MERROWGATE_ID)).state
    return s
  }

  it('the architect and the consultant never see a money figure in these views', () => {
    for (const s of [fresh(), withRecords()])
      for (const [who, id] of [['Priya', U.priya], ['Marcus', U.marcus]] as const) {
        const v = viewer(id)
        for (const p of projectsOfUser(s, id)) {
          for (const [name, view] of sustainabilityViews(s, v, p.id)) {
            if (name === 'complianceWorkbook') continue
            expect(JSON.stringify(view).includes('£'), `${who}, ${name} ${p.name} holds money`).toBe(false)
          }
        }
      }
  })

  it('the client sees money, from the package engine', () => {
    expect(JSON.stringify(sel.approvalsView(fresh(), viewer(U.isla), MERROWGATE_ID))).toContain('£')
    expect(JSON.stringify(sel.clientDashboard(fresh(), viewer(U.isla)))).toContain('£')
  })

  it('the buyer side still receives no seller-private string with the records in place', () => {
    const s = withRecords()
    const strings = allLotStrings(s)
    for (const [who, id] of [['Priya', U.priya], ['Isla', U.isla], ['Marcus', U.marcus]] as const) {
      const views = buyerViews(s, viewer(id))
      expectNone(views, strings, who)
      expectNoInternalIds(views, who)
    }
  })

  it("the owner's inbox and activity hold nothing of the records, and the views return nothing", () => {
    const s = withRecords()
    const v = viewer(U.tom)
    const inbox = sel.inboxView(s, v)
    expect(inbox.groups.flatMap((g) => g.items).some((n) => n.kind === 'sustainability')).toBe(false)
    const text = JSON.stringify([inbox, sel.activityFor(s, v, {}, 500), sel.bellView(s, v)])
    for (const x of ['circular economy statement', 'Circular economy statement', 'Board approved the approach.', 'Happy with the approach.', 'Raised with the client.', 'Lantern Quay has asked']) expect(text).not.toContain(x)
    for (const fn of [sel.sustainabilityView, sel.goalRows, sel.requirementsView, sel.statementView, sel.certificationSummary, sel.sustainabilityTracking, sel.complianceWorkbook]) expect(fn(s, v, MERROWGATE_ID)).toBeNull()
    expect(sel.clientDashboard(s, v)).toBeNull()
    expectNone(ownerViews(s, v), allProjectStrings(s), 'Tom')
  })
})
