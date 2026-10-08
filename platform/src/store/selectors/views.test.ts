import { describe, it, expect } from 'vitest'
import { actor, fresh, must, U, viewer, NOW } from '../../test/fixtures'
import * as sel from '.'
import { DEFAULT_DISCOVER_QUERY as Q } from './discover'
import { acceptTerms } from '../actions/projects'
import { decideReservation, requestReservation } from '../actions/reservations'
import { saveToProject, sendToClient, decideItem } from '../actions/shortlist'
import { setDisclosure } from '../actions/owner'
import { loadWasteBill } from '../actions/consultant'
import { signUpState } from '../actions/auth'
import { projectWishlist } from '../lots'
import { DURNLEY_ID, FERRYMOOR_ID, HARROWDEN_ID, itemByTag, MERROWGATE_ID, SALLOW_ID, TIVERNE_ID, lotForItem } from '../../domain/seed/world'
import { cellsFromArrayBuffer, base64ToArrayBuffer } from '../../domain/engines/billXlsx'
import { SAMPLE_BILL_XLSX_BASE64 } from '../../domain/reference/samples'

describe('Discover', () => {
  it('shows the open marketplace with typology counts, fit against a project and saved state', () => {
    const s = fresh()
    const v = sel.discoverView(s, viewer(U.priya), { ...Q, projectId: MERROWGATE_ID })
    expect(v.total).toBe(17)
    expect(v.typologyCounts).toEqual({ all: 17, structure: 11, envelope: 5, finishes: 1 })
    expect(v.project!.name).toBe('Merrowgate Wharf')
    const th01 = v.cards.find((c) => c.publicId === 'L-9F4CQQ')!
    expect(th01.fitLabel).toBe('In time')
    expect(th01.band.word).toBe('High')
    expect(th01.photo).toBeNull()
    expect(v.cards.find((c) => c.publicId === 'L-NHZ32R')!.savedIn).toEqual([{ projectId: MERROWGATE_ID, label: 'Merrowgate Wharf', status: 'approved' }])
    expect(v.canSave).toBe(true)
    expect(sel.discoverView(s, viewer(U.isla), Q).canSave).toBe(false)
  })

  it('searches title, family, material and location', () => {
    const s = fresh()
    const ids = (q: string) => sel.discoverView(s, viewer(U.priya), { ...Q, q }).cards.map((c) => c.publicId)
    expect(ids('portland')).toEqual(['L-Q23X7N'])
    expect(ids('UB 457')).toEqual(expect.arrayContaining(['L-9F4CQQ', 'L-NHZ32R', 'L-6DN4K3']))
    expect(ids('brick east of england')).toEqual(['L-8WARGH', 'L-A945G6'])
    expect(sel.discoverView(s, viewer(U.priya), { ...Q, q: 'granite' }).empty).toBe('no_results')
  })

  it('filters by typology, family, condition, band and fit, and sorts by price only within a family', () => {
    const s = fresh()
    const v = sel.discoverView(s, viewer(U.priya), { ...Q, typology: 'finishes' })
    expect(v.cards.map((c) => c.publicId)).toEqual(['L-6VWCWH'])
    const late = sel.discoverView(s, viewer(U.priya), { ...Q, projectId: FERRYMOOR_ID, fitsOnly: true })
    expect(late.cards.every((c) => c.fit!.fit !== 'late')).toBe(true)
    expect(late.activeFilterCount).toBe(1)
    const price = sel.discoverView(s, viewer(U.priya), { ...Q, sort: 'price' })
    expect(price.sort).toBe('newest')
    expect(price.priceSortHint).not.toBeNull()
    const steel = sel.discoverView(s, viewer(U.priya), { ...Q, sort: 'price', family: 'steel_section' })
    expect(steel.sort).toBe('price')
    const guides = steel.cards.map((c) => c.listing.price.guide)
    expect([...guides].sort((a, b) => a - b)).toEqual(guides)
  })

  it('lists shared lots per project once the terms are accepted', () => {
    const s = fresh()
    const g = sel.sharedGroups(s, viewer(U.priya))
    expect(g.map((x) => [x.project.name, x.termsAccepted, x.cards.length])).toEqual([['Merrowgate Wharf', true, 5]])
    expect(g[0].cards.every((c) => c.sharedInConfidence)).toBe(true)
    // Before the terms, a project shows a count and nothing else.
    const s2 = { ...s, world: { ...s.world, projects: { ...s.world.projects, [MERROWGATE_ID]: { ...s.world.projects[MERROWGATE_ID], termsAccepted: false } } } }
    const g2 = sel.sharedGroups(s2, viewer(U.priya))
    expect(g2.map((x) => [x.sharedCount, x.cards.length, x.canAccept])).toEqual([[5, 0, true]])
    expect(sel.discoverView(s2, viewer(U.priya), Q).pendingSharedCount).toBe(5)
    expect(sel.discoverView(s, viewer(U.priya), Q).pendingSharedCount).toBe(0)
    const s3 = must(acceptTerms(s2, actor(U.priya), MERROWGATE_ID)).state
    expect(sel.sharedGroups(s3, viewer(U.priya))[0].cards).toHaveLength(5)
  })
})

describe('material page', () => {
  it('a shared lot opens only for the projects it is shared with', () => {
    const s = fresh()
    const m = sel.materialView(s, viewer(U.priya), 'L-MNY55K', MERROWGATE_ID)!
    expect(m.tags).toContain('Shared in confidence')
    expect(m.projects.map((p) => p.name)).toEqual(['Merrowgate Wharf'])
    expect(m.saveTargets.find((t) => t.label === 'Saved')!.allowed).toBe(false)
    expect(m.saveTargets.find((t) => t.label === 'Sallow Court')!.reason).toBe('Not shared with this project.')
    expect(sel.materialView(s, viewer(U.marcus), 'L-MNY55K', null)).toBeNull()
    expect(sel.materialView(s, viewer(U.marcus), 'L-9F4CQQ', null)).not.toBeNull()
  })

  it('shows public facts, availability against the project, the seller line and geometry', () => {
    const s = fresh()
    const m = sel.materialView(s, viewer(U.priya), 'L-9F4CQQ', MERROWGATE_ID)!
    expect(m.sellerLine).toBe('Listed by an asset owner in Central London')
    expect(m.availability.fitText).toBe('Available in time')
    expect(m.price.range).toBe('£715 to £825 per tonne')
    expect(m.geometry).toEqual({ dxf: true, obj: true, reason: null })
    expect(m.gallery.map((g) => g.kind)).toEqual(['illustration', 'drawing'])
    expect(m.similar.every((c) => c.publicId !== 'L-9F4CQQ')).toBe(true)
    const timber = sel.materialView(s, viewer(U.priya), 'L-CJGQP7', null)!
    expect(timber.geometry.dxf).toBe(false)
    expect(timber.geometry.reason).not.toBeNull()
  })

  it('a reserved lot leaves the marketplace but stays open to the project holding it', () => {
    let s = fresh()
    const res = Object.values(s.reservations)[0]
    s = must(decideReservation(s, actor(U.tom), res.id, 'accepted', '')).state
    expect(sel.materialView(s, viewer(U.priya), 'L-WPX5A6', MERROWGATE_ID)!.reservedFor).toBe('Merrowgate Wharf')
    const board = sel.shortlistBoard(s, viewer(U.priya), MERROWGATE_ID)!
    expect(board.rows.find((r) => r.publicId === 'L-WPX5A6')!.reservation!.statusLabel).toBe('Reserved')
  })
})

describe('architect workspace', () => {
  it('home: projects, new materials, waiting on the client, activity', () => {
    const h = sel.architectHome(fresh(), viewer(U.priya))!
    expect(h.greeting).toBe('Good morning, Priya')
    expect(h.dateText).toBe('Thursday 8 October 2026')
    expect(h.stats.activeProjects).toBe(3)
    expect(h.projects.map((p) => p.name)).toEqual(['Merrowgate Wharf', 'Sallow Court', 'Ferrymoor Yard'])
    expect(h.newForProjects[0].publicId).toBe('L-9F4CQQ')
    expect(h.newForProjects.length).toBeLessThanOrEqual(6)
    expect(h.newForProjects.every((c) => c.savedIn.length === 0)).toBe(true)
    expect(h.waitingOnClient.map((w) => w.projectName)).toEqual(['Ferrymoor Yard', 'Merrowgate Wharf'])
    expect(h.activity[0].timeAgo).toBe('Yesterday')
    expect(sel.architectHome(fresh(), viewer(U.isla))).toBeNull()
  })

  it('shortlist board: columns, totals over visible rows, what can be sent', () => {
    const b = sel.shortlistBoard(fresh(), viewer(U.priya), MERROWGATE_ID)!
    expect(b.columns.map((c) => [c.label, c.rows.length])).toEqual([['Shortlisted', 1], ['Sent to client', 1], ['Approved', 2], ['Declined', 0]])
    expect(b.sendableIds).toEqual(['wli_hp23zk_4'])
    expect(b.totals.all.count).toBe(4)
    const approved = b.columns[2].rows[0]
    expect(approved.canRemove).toBe(false)
    expect(approved.reservation!.statusLabel).toBe('Awaiting the seller')
    expect(sel.shortlistBoard(fresh(), viewer(U.isla), MERROWGATE_ID)).toBeNull()
  })

  it('Saved lists the practice list with move targets', () => {
    const v = sel.savedView(fresh(), viewer(U.priya))!
    expect(v.rows.map((r) => r.title)).toEqual(['Timber joists, pitch pine'])
    expect(v.rows[0].moveTargets.map((t) => [t.label, t.allowed])).toEqual([['Merrowgate Wharf', true], ['Sallow Court', true], ['Ferrymoor Yard', true]])
  })

  it('specification: approved items, or a draft of all but declined, with notes; read only for the client', () => {
    const s = fresh()
    const a = sel.specificationView(s, viewer(U.priya), MERROWGATE_ID, 'approved')!
    expect(a.clauses.map((c) => c.publicId)).toEqual(['L-NHZ32R', 'L-WPX5A6'])
    expect(a.counts).toEqual({ approved: 2, draft: 4 })
    expect(a.canEdit).toBe(true)
    expect(a.fileName).toBe('merrowgate-wharf-specification-2026-10-08.xlsx')
    expect(a.sheet.caveats.length).toBeGreaterThan(2)
    expect(sel.specificationView(s, viewer(U.priya), MERROWGATE_ID, 'draft')!.clauses).toHaveLength(4)
    expect(sel.specificationView(s, viewer(U.isla), MERROWGATE_ID, 'approved')!.canEdit).toBe(false)
    expect(sel.specificationView(s, viewer(U.marcus), MERROWGATE_ID, 'approved')).toBeNull()
  })

  it('overview: a timeline from this quarter past the start, positions between 0 and 1', () => {
    const o = sel.projectOverview(fresh(), viewer(U.priya), MERROWGATE_ID)!
    const t = o.timeline
    expect(t.rangeStart).toBe('2026-10-01')
    expect(t.today).toBeGreaterThan(0)
    expect(t.start).toBeGreaterThan(t.today)
    expect(t.start).toBeLessThan(1)
    for (const r of t.rows) {
      expect(r.from).toBeGreaterThanOrEqual(0)
      expect(r.to).toBeLessThanOrEqual(1)
      expect(r.from).toBeLessThanOrEqual(r.to)
    }
    expect(t.ticks[0].label).toBe('Q4 2026')
    expect(o.nextSteps.map((x) => x.id)).toEqual(['send', 'spec'])
    expect(o.carbon.securedT).toBeGreaterThan(0)
    expect(o.carbon.shortlistedT).toBeGreaterThan(o.carbon.securedT)
  })

  it('projects list, carbon and team', () => {
    const s = fresh()
    const list = sel.projectsListView(s, viewer(U.priya))
    expect(list.rows[0].name).toBe('Merrowgate Wharf')
    expect(list.canCreate).toBe(true)
    const c = sel.projectCarbon(s, viewer(U.marcus), MERROWGATE_ID)!
    expect(c.byStatus.map((x) => x.count)).toEqual([1, 1, 2, 0])
    expect(c.byTypology.find((x) => x.key === 'structure')!.count).toBe(4)
    const team = sel.projectTeam(s, viewer(U.priya), MERROWGATE_ID)!
    expect(team.sections.map((x) => [x.roleLabel, x.orgName, x.members.map((m) => m.name)])).toEqual([
      ['Client', 'Lantern Quay Developments', ['Isla Brennan']],
      ['Architect', 'Studio Oriel', ['Priya Nair']],
      ['Sustainability consultant', 'Halewick Sustainability', ['Marcus Lindqvist']],
    ])
    expect(sel.projectTeam(s, viewer(U.priya), FERRYMOOR_ID)!.sections[0].members).toEqual([])
  })
})

describe('client workspace', () => {
  it('home, approvals and reservations', () => {
    const s = fresh()
    const h = sel.clientHome(s, viewer(U.isla))!
    expect(h.stats).toEqual({ projects: 1, approvalsWaiting: 1, reservationsPending: 1, reserved: 0 })
    const a = sel.approvalsView(s, viewer(U.isla), MERROWGATE_ID)!
    expect(a.waiting.map((r) => r.title)).toEqual(['UC 305x305x97, 4.2 m'])
    expect(a.waiting[0].sentMessage).toBe('Columns for the podium. Tested, in stock and available now.')
    expect(a.history.map((r) => r.status)).toEqual(['approved', 'approved'])
    const r = sel.reservationsView(s, viewer(U.isla), MERROWGATE_ID)!
    expect(r.rows.map((x) => [x.title, x.reservation?.statusLabel ?? null, x.canRequest, x.estimateIsLive])).toEqual([
      ['UB 533x210x92, 9.0 m', 'Awaiting the seller', false, false],
      ['UB 457x191x67, 9.0 m', null, true, true],
    ])
    expect(r.rows[1].estimate.facilityName).toBe('Open yard, Barking')
    expect(r.rows[1].estimate.testing).toBe(false)
    expect(sel.approvalsView(s, viewer(U.priya), MERROWGATE_ID)).toBeNull()
  })

  it('an approval flows to the architect board', () => {
    let s = fresh()
    s = must(decideItem(s, actor(U.isla), MERROWGATE_ID, 'wli_hp23zk_3', 'approved', 'Good.')).state
    expect(sel.clientHome(s, viewer(U.isla))!.stats.approvalsWaiting).toBe(0)
    expect(sel.shortlistBoard(s, viewer(U.priya), MERROWGATE_ID)!.columns[2].rows).toHaveLength(3)
  })
})

describe('owner workspace', () => {
  it('home stats, requests as blind lines, listings with suggested prices', () => {
    const s = fresh()
    const h = sel.ownerHome(s, viewer(U.tom))!
    expect(h.stats).toMatchObject({ buildings: 1, itemsSurveyed: 11, listed: 1, shared: 5, reserved: 0, requestsAwaiting: 1 })
    expect(h.requests[0].buyer).toEqual({ kind: 'blind', text: 'Design team, commercial project, Inner London East, needed by Q2 2028' })
    expect(h.requests[0].sellerEstimate.net).toBeGreaterThan(0)
    const l = sel.listingsView(s, viewer(U.tom), TIVERNE_ID)!
    expect(l.rows.find((r) => r.tag === 'TH-01')).toMatchObject({ choice: 'published', ask: 800, reserve: 730 })
    expect(l.rows.find((r) => r.tag === 'TH-07')!.suggested.ask).toBeGreaterThan(0)
    expect(l.disclosure.band).toBe('Low')
    expect(sel.listingsView(s, viewer(U.dana), TIVERNE_ID)).toBeNull()
    expect(sel.ownerHome(s, viewer(U.dana))).toBeNull()
  })

  it('the publish draft checks prices, scores disclosure and previews the real listing', () => {
    let s = fresh()
    const lot = lotForItem(s.world, itemByTag(s.world, 'TH-07').id)
    const ok = sel.listingDraftView(s, viewer(U.tom), lot.id, { visibility: 'published', ask: '180', reserve: '165', availableFrom: '2027-04-12' })!
    expect(ok.canSubmit).toBe(true)
    expect(ok.preview.availabilityText).toBe('Available from Q2 2027')
    expect(ok.preview.title).toBe('Portland stone cladding, 50 mm')
    const bad = sel.listingDraftView(s, viewer(U.tom), lot.id, { visibility: 'published', ask: '150', reserve: '165', availableFrom: '' })!
    expect(bad.problem).toBe('The reserve cannot be above the ask.')
    s = must(setDisclosure(s, actor(U.tom), TIVERNE_ID, { locationLevel: 'local_authority', timingLevel: 'month' })).state
    const blocked = sel.listingDraftView(s, viewer(U.tom), lot.id, { visibility: 'published', ask: '180', reserve: '165', availableFrom: '' })!
    expect(blocked.blocked).toBe(true)
    expect(blocked.canSubmit).toBe(false)
    expect(sel.disclosurePreview(s, viewer(U.tom), TIVERNE_ID, { locationLevel: 'region', timingLevel: 'quarter' })!.band).toBe('Low')
  })

  it('priorities with the decision tree legend, inventory and item detail', () => {
    const s = fresh()
    const p = sel.prioritiesView(s, viewer(U.tom), TIVERNE_ID)!
    expect(p.rows).toHaveLength(11)
    expect(p.legend.map((x) => [x.label, x.assigned])).toEqual([['Reuse', true], ['Upcycle', false], ['Downcycle', true], ['Recycle', true], ['Scrap', false]])
    expect(p.legend.reduce((n, x) => n + x.count, 0)).toBe(11)
    const inv = sel.inventoryView(s, viewer(U.dana), TIVERNE_ID)!
    expect(inv.rows[0]).toMatchObject({ tag: 'TH-01', visibilityLabel: 'Published to the marketplace', availableFrom: null })
    expect(inv.canSubmit).toBe(false)
    expect(sel.inventoryView(s, viewer(U.tom), TIVERNE_ID)!.rows[0].availableFrom).not.toBeNull()
    const th01 = itemByTag(s.world, 'TH-01')
    const d = sel.itemDetail(s, viewer(U.tom), TIVERNE_ID, th01.id)!
    expect(d.owner!.routeLabel).toBe('Reuse')
    expect(d.owner!.preview.publicId).toBe('L-9F4CQQ')
    expect(sel.itemDetail(s, viewer(U.dana), TIVERNE_ID, th01.id)!.owner).toBeNull()
    expect(sel.itemDetail(s, viewer(U.tom), HARROWDEN_ID, th01.id)).toBeNull()
  })

  it('sharing lists every other project as a blind line', () => {
    const v = sel.sharingView(fresh(), viewer(U.tom))!
    expect(v.rows.map((r) => [r.text, r.granted])).toEqual([
      ['Design team, commercial project, Inner London East, needed by Q2 2028', true],
      ['Design team, hotel project, Central London, needed by Q1 2028', false],
      ['Design team, residential project, Inner London East, needed by Q2 2027', false],
    ])
    expect(v.sharedLotCount).toBe(5)
  })
})

describe('surveyor and consultant', () => {
  it('appointments by client and the capture screen', () => {
    const s = fresh()
    const h = sel.surveyorHome(s, viewer(U.dana))!
    expect(h.appointments.map((g) => [g.clientName, g.buildings.map((b) => [b.name, b.statusLabel])])).toEqual([
      ['Ostlea Estates', [['Tiverne House', 'Submitted']]],
      ['Brackwater Estates', [['Harrowden Court', 'In progress']]],
    ])
    const c = sel.captureView(s, viewer(U.dana), HARROWDEN_ID)!
    expect(c.header.clientName).toBe('Brackwater Estates')
    expect(c.defaultMonthText).toBe('July 2027')
    expect(c.canSubmit).toBe(true)
    expect(c.families).toHaveLength(7)
    expect(sel.expectedFromMonth(s, TIVERNE_ID, '2027-01')).toBe(s.world.buildings[TIVERNE_ID].programme.dismantlingStart)
    expect(sel.expectedFromMonth(s, TIVERNE_ID, '2027-06')).toBe('2027-06-01')
  })

  it('compliance counts reserved materials as secured', () => {
    let s = fresh()
    const before = sel.complianceView(s, viewer(U.marcus), MERROWGATE_ID)!
    expect(before.hasBill).toBe(true)
    expect(before.reusedItems.map((x) => x.status)).toEqual(['Confirmed', 'Confirmed', 'Approved', 'Approved'])
    s = must(decideReservation(s, actor(U.tom), Object.keys(s.reservations)[0], 'accepted', '')).state
    const after = sel.complianceView(s, viewer(U.marcus), MERROWGATE_ID)!
    expect(after.reusedItems.map((x) => x.status)).toEqual(['Confirmed', 'Confirmed', 'Reserved', 'Approved'])
    expect(after.secured.percent).toBeGreaterThan(before.secured.percent)
    expect(after.avoidedT).toBeGreaterThan(before.avoidedT)
    expect(sel.complianceView(s, viewer(U.priya), MERROWGATE_ID)).toBeNull()
  })

  it('waste: loads the sample bill and reads its rates', async () => {
    const s0 = fresh()
    expect(sel.wasteView(s0, viewer(U.marcus), DURNLEY_ID)!.bill).toBeNull()
    const cells = await cellsFromArrayBuffer(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64))
    const s = must(loadWasteBill(s0, actor(U.marcus), DURNLEY_ID, cells)).state
    const w = sel.wasteView(s, viewer(U.marcus), DURNLEY_ID)!
    expect(w.bill!.rows.length).toBeGreaterThan(10)
    expect(w.rates!.diversionRate).toBeGreaterThan(0)
    expect(sel.wasteView(s, viewer(U.priya), DURNLEY_ID)).toBeNull()
    expect(sel.consultantHome(s, viewer(U.marcus))!.engagements[0].hasBill).toBe(true)
  })
})

describe('inbox, navigation, routes and search', () => {
  it('groups notifications by day with relative times and per-person read state', () => {
    const s = fresh()
    const v = sel.inboxView(s, viewer(U.isla))
    expect(v.groups.map((g) => g.label)).toEqual(['Yesterday', '3 October 2026', '28 September 2026', '17 September 2026'])
    expect(v.unread).toBe(1)
    expect(v.groups[0].items[0].timeAgo).toBe('Yesterday')
    expect(sel.inboxView(s, viewer(U.isla), 'unread').groups).toHaveLength(1)
    expect(sel.bellView(s, viewer(U.tom)).unread).toBe(1)
    expect(sel.notificationSettings(s, viewer(U.tom)).map((x) => x.kind)).toEqual(['reservation_requested', 'survey_submitted', 'item_captured', 'team'])
  })

  it('relative times', () => {
    expect(sel.timeAgo('2026-10-08T09:59:40.000Z', NOW)).toBe('just now')
    expect(sel.timeAgo('2026-10-08T09:55:00.000Z', NOW)).toBe('5 minutes ago')
    expect(sel.timeAgo('2026-10-08T08:00:00.000Z', NOW)).toBe('2 hours ago')
    expect(sel.timeAgo('2026-10-07T08:00:00.000Z', NOW)).toBe('Yesterday')
    expect(sel.timeAgo('2026-10-04T08:00:00.000Z', NOW)).toBe('4 days ago')
    expect(sel.timeAgo('2026-09-20T08:00:00.000Z', NOW)).toBe('20 Sep 2026')
  })

  it('builds each role sidebar with badges', () => {
    const s = fresh()
    const titles = (id: string) => sel.navModel(s, viewer(id))!.sections.map((x) => [x.title, x.items.map((i) => i.label)])
    expect(titles(U.priya)).toEqual([[null, ['Home', 'Discover', 'Saved']], ['Projects', ['Merrowgate Wharf', 'Sallow Court', 'Ferrymoor Yard', 'New project']]])
    expect(titles(U.isla)).toEqual([[null, ['Home']], ['Projects', ['Merrowgate Wharf']]])
    expect(titles(U.tom)).toEqual([[null, ['Home']], ['Buildings', ['Tiverne House', 'Add building']], [null, ['Requests']]])
    expect(titles(U.dana)).toEqual([[null, ['Home']], ['Clients', ['Ostlea Estates', 'Brackwater Estates']]])
    expect(titles(U.marcus)).toEqual([[null, ['Home']], ['Projects', ['Merrowgate Wharf', 'Sallow Court', 'Ferrymoor Yard']], ['Engagements', ['Durnley House']]])
    const isla = sel.navModel(s, viewer(U.isla))!
    const mg = isla.sections[1].items[0]
    expect(mg.badge).toBe(1)
    expect(mg.children.map((c) => [c.label, c.badge])).toEqual([['Overview', null], ['Approvals', 1], ['Reservations', null], ['Specification', null], ['Carbon', null]])
    expect(sel.navModel(s, viewer(U.tom))!.sections[2].items[0].badge).toBe(1)
    const priya = sel.navModel(s, viewer(U.priya))!
    expect(priya.sections[1].items[0].children.find((c) => c.label === 'Matching')!.soon).toBe(true)
    expect(priya.org).toMatchObject({ name: 'Studio Oriel', typeLabel: 'Architecture practice' })
  })

  it('checks every route for each role, and never reveals whether a record exists', () => {
    const s = fresh()
    const r = (id: string, path: string) => sel.routeAccess(s, viewer(id), path)
    expect(r(U.priya, '/app/home')).toBe('ok')
    expect(r(U.priya, '/app/discover/L-9F4CQQ')).toBe('ok')
    expect(r(U.priya, '/app/discover/L-DAXNV3')).toBe('forbidden')
    expect(r(U.priya, `/app/projects/${MERROWGATE_ID}/shortlist`)).toBe('ok')
    expect(r(U.priya, `/app/projects/${MERROWGATE_ID}/approvals`)).toBe('forbidden')
    expect(r(U.priya, `/app/projects/${MERROWGATE_ID}/matching`)).toBe('ok')
    expect(r(U.priya, '/app/projects/prj_nothere')).toBe('forbidden')
    expect(r(U.priya, `/app/buildings/${TIVERNE_ID}`)).toBe('forbidden')
    expect(r(U.priya, '/app/requests')).toBe('forbidden')
    expect(r(U.priya, '/app/projects/new')).toBe('ok')
    expect(r(U.isla, '/app/projects/new')).toBe('forbidden')
    expect(r(U.isla, `/app/projects/${MERROWGATE_ID}/approvals`)).toBe('ok')
    expect(r(U.isla, `/app/projects/${SALLOW_ID}`)).toBe('forbidden')
    expect(r(U.isla, '/app/saved')).toBe('forbidden')
    expect(r(U.tom, `/app/buildings/${TIVERNE_ID}/listings`)).toBe('ok')
    expect(r(U.tom, `/app/buildings/${HARROWDEN_ID}`)).toBe('forbidden')
    expect(r(U.tom, `/app/buildings/${TIVERNE_ID}/inventory/${itemByTag(s.world, 'TH-01').id}`)).toBe('ok')
    expect(r(U.tom, `/app/buildings/${TIVERNE_ID}/inventory/${itemByTag(s.world, 'HC-01').id}`)).toBe('forbidden')
    expect(r(U.tom, '/app/discover')).toBe('forbidden')
    expect(r(U.dana, `/app/buildings/${HARROWDEN_ID}/capture`)).toBe('ok')
    expect(r(U.dana, `/app/buildings/${TIVERNE_ID}/priorities`)).toBe('forbidden')
    expect(r(U.marcus, `/app/projects/${MERROWGATE_ID}/compliance`)).toBe('ok')
    expect(r(U.marcus, `/app/engagements/${DURNLEY_ID}/waste`)).toBe('ok')
    expect(r(U.priya, `/app/engagements/${DURNLEY_ID}/waste`)).toBe('forbidden')
    expect(r(U.marcus, '/app/settings/team')).toBe('ok')
    expect(r(U.marcus, '/app/nonsense')).toBe('not_found')
  })

  it('the command palette finds pages, projects and materials the viewer may open', () => {
    const s = fresh()
    const priya = sel.searchIndex(s, viewer(U.priya))
    expect(sel.searchEntries(priya, 'merrow')[0]).toMatchObject({ kind: 'project', label: 'Merrowgate Wharf' })
    expect(sel.searchEntries(priya, 'discover')[0]).toMatchObject({ kind: 'page', href: '/app/discover' })
    expect(priya.some((e) => e.href === '/app/discover/L-MNY55K')).toBe(true)
    expect(priya.some((e) => e.href === '/app/discover/L-DAXNV3')).toBe(false)
    const tom = sel.searchIndex(s, viewer(U.tom))
    expect(sel.searchEntries(tom, 'th-07')[0]).toMatchObject({ kind: 'item' })
    expect(tom.some((e) => e.kind === 'material' || e.kind === 'project')).toBe(false)
  })

  it('every activity line and notification leads to a page its reader can open', () => {
    let s = fresh()
    s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', MERROWGATE_ID)).state
    const id = projectWishlist(s.world, MERROWGATE_ID)!.items.find((x) => x.publicId === 'L-9F4CQQ')!.id
    s = must(sendToClient(s, actor(U.priya), MERROWGATE_ID, [id], 'Beams.')).state
    s = must(decideItem(s, actor(U.isla), MERROWGATE_ID, id, 'approved', '')).state
    const req = must(requestReservation(s, actor(U.isla), MERROWGATE_ID, id, ''))
    s = must(decideReservation(req.state, actor(U.tom), req.value, 'accepted', '')).state
    const broken: string[] = []
    for (const [who, userId] of Object.entries(U)) {
      const v = viewer(userId)
      for (const row of sel.activityFor(s, v)) if (row.href && sel.routeAccess(s, v, row.href.split('?')[0]) !== 'ok') broken.push(`${who} activity ${row.href}`)
      for (const g of sel.inboxView(s, v).groups) for (const n of g.items) if (sel.routeAccess(s, v, n.href.split('?')[0]) !== 'ok') broken.push(`${who} notification ${n.href}`)
    }
    expect(broken).toEqual([])
    // The architect's line about the client's decision leads to the shortlist.
    expect(sel.activityFor(s, viewer(U.priya)).some((r) => r.href === `/app/projects/${MERROWGATE_ID}/shortlist`)).toBe(true)
  })

  it('a newly sent material reaches the client home', () => {
    let s = fresh()
    s = must(saveToProject(s, actor(U.priya), 'L-9F4CQQ', MERROWGATE_ID)).state
    const id = projectWishlist(s.world, MERROWGATE_ID)!.items.find((x) => x.publicId === 'L-9F4CQQ')!.id
    s = must(sendToClient(s, actor(U.priya), MERROWGATE_ID, [id], '')).state
    expect(sel.clientHome(s, viewer(U.isla))!.stats.approvalsWaiting).toBe(2)
  })

  it('a new organisation starts empty, with its own workspace', () => {
    const s0 = fresh()
    const arch = must(signUpState(s0, { name: 'Jo Park', email: 'jo@park.example', orgName: 'Park Studio', orgType: 'Architect', salt: 's', passwordHash: 'h', now: NOW }))
    const jo = viewer(arch.value)
    expect(sel.architectHome(arch.state, jo)!.projects).toEqual([])
    expect(sel.navModel(arch.state, jo)!.sections[1].items.map((i) => i.label)).toEqual(['New project'])
    expect(sel.discoverView(arch.state, jo, Q).total).toBe(17)
    expect(sel.savedView(arch.state, jo)!.empty).toBe(true)
    const owner = must(signUpState(s0, { name: 'Ash Reed', email: 'ash@reed.example', orgName: 'Reed Holdings', orgType: 'Asset owner', salt: 's', passwordHash: 'h', now: NOW }))
    const ash = viewer(owner.value)
    expect(sel.buildingsList(owner.state, ash)).toEqual({ rows: [], canAdd: true, empty: true })
    expect(sel.requestsView(owner.state, ash)!.empty).toBe(true)
    const surveyor = must(signUpState(s0, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Deconstruction contractor', salt: 's', passwordHash: 'h', now: NOW }))
    expect(sel.surveyorHome(surveyor.state, viewer(surveyor.value))!.appointments).toEqual([])
  })
})
