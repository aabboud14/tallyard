// View models for donor buildings and surveyors (owner-surveyor design 14.4.7 and 14.4.8).
import { describe, it, expect } from 'vitest'
import { actor, addTestUser, fresh, must, NOW, U, viewer } from '../../test/fixtures'
import * as sel from './index'
import { pageLocation } from './arch-breadcrumbs'
import { appointProjectArchitect, createOwnerProject } from '../actions/owner'
import { appointContractor, setContractorDates } from '../actions/contractor'
import { openShareLink, revokeShareLink } from '../actions/links'
import { setLotVisibility } from '../actions/owner'
import { decideBuildingClaim } from '../actions/claims'
import { itemByTag, lotForItem, ORG_IDS, HARROWDEN_ID, MERROWGATE_ID, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_CLAIM_ID, AMBREY_ID, FENNICK_ID, TIVERNE_LINK_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import type { AppData } from '../types'

function withLee(s: AppData = fresh()): { s: AppData; lee: string } {
  const r = addTestUser(s, { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
  return { s: r.state, lee: r.userId }
}

const WEXCOMBE = { name: 'Wexcombe House', projectType: 'office' as const, localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: ORG_IDS.oriel }

describe('standalone capture', () => {
  it('lists the buildings by client with unconfirmed ones last, and picks the latest capture by default', () => {
    const s = fresh()
    const t = sel.captureTargets(s, viewer(U.dana))!
    expect(t.targets.map((x) => [x.name, x.group])).toEqual([
      ['Tiverne House', 'Ostlea Estates'],
      ['Harrowden Court', 'Brackwater Estates'],
      ['Ambrey House', 'Not yet linked'],
    ])
    expect(t.groups.map((g) => g.label)).toEqual(['Ostlea Estates', 'Brackwater Estates', 'Not yet linked'])
    expect(t.selectedId).toBe(AMBREY_ID)
    expect(t).toMatchObject({ canAdd: true, empty: false })
    expect(t.targets.find((x) => x.id === AMBREY_ID)).toMatchObject({ itemCount: 2, statusLabel: 'In progress', address: '6 Quarrel Lane, London SE1' })
  })

  it("remembers the person's last building while it is still theirs", () => {
    const s0 = fresh()
    const remembered = { ...s0, ui: { ...s0.ui, captureBuildingId: { [U.dana]: HARROWDEN_ID, [U.tom]: HARROWDEN_ID } } }
    expect(sel.captureTargets(remembered, viewer(U.dana))!.selectedId).toBe(HARROWDEN_ID)
    expect(sel.captureTargets(remembered, viewer(U.tom))!.selectedId).toBe(TIVERNE_ID)
    expect(sel.captureTargets(s0, viewer(U.tom))!.targets.map((x) => x.name)).toEqual(['Tiverne House'])
  })

  it('is for owners and surveyors who capture, never a contractor alone or the buying side', () => {
    const { s, lee } = withLee()
    expect(sel.captureTargets(s, viewer(lee))).toMatchObject({ targets: [], selectedId: null, empty: true })
    expect(sel.captureTargets(s, viewer(U.priya))).toBeNull()
    expect(sel.surveyorHome(s, viewer(U.dana))!.quickCapture).toEqual({ href: '/app/capture', buildingName: 'Ambrey House' })
  })
})

describe('building tabs', () => {
  it('reads Recovery plan for the owner and follows each side', () => {
    const ids = (side: Parameters<typeof sel.buildingTabs>[0], contractor = false) => sel.buildingTabs(side, TIVERNE_ID, { contractor }).map((t) => t.id)
    // Changed 16 October 2026 (recording audit, note C1): the owner and the surveyor track requirements on the building.
    expect(sel.buildingTabs('owner', TIVERNE_ID).map((t) => t.label)).toEqual(['Overview', 'Inventory', 'Recovery plan', 'Listings', 'Sharing', 'Testing', 'Requirements'])
    expect(sel.buildingTabs('owner', TIVERNE_ID)[2].href).toBe(`/app/buildings/${TIVERNE_ID}/priorities`)
    expect(ids('surveyor')).toEqual(['overview', 'capture', 'inventory', 'testing', 'requirements'])
    expect(ids('surveyor', true)).toEqual(['overview', 'capture', 'inventory', 'testing', 'requirements', 'availability'])
    expect(ids('contractor')).toEqual(['overview', 'availability'])
  })

  it('the header says how the viewer sits on the building', () => {
    const { s, lee } = withLee()
    expect(sel.buildingHeader(s, viewer(lee), TIVERNE_ID)).toMatchObject({ side: 'contractor', isContractor: true, contractorName: 'Fennick Dismantling', kindLabel: 'Donor building', claim: null })
    expect(sel.buildingHeader(s, viewer(U.dana), AMBREY_ID)!.claim).toEqual({ status: 'pending', label: 'Waiting for the owner', email: 'tom.ashby@ostlea.example', note: null, claimId: AMBREY_CLAIM_ID })
    expect(sel.buildingHeader(s, viewer(U.dana), TIVERNE_ID)!.claim!.label).toBe('Linked to its owner')
    expect(sel.buildingHeader(s, viewer(U.tom), TIVERNE_ID)!.claim).toBeNull()
    expect(sel.buildingHeader(s, viewer(U.tom), AMBREY_ID)).toBeNull()
  })
})

describe('share links', () => {
  it('openedText says how many organisations opened a link, by type only', () => {
    expect(sel.openedText([])).toBe('Not opened yet')
    expect(sel.openedText(['architecture practice'])).toBe('Opened by 1 organisation (architecture practice)')
    expect(sel.openedText(['architecture practice', 'developer or client', 'architecture practice'])).toBe('Opened by 3 organisations (2 architecture practices, 1 developer or client)')
  })

  it('the link page: preview for the owner, terms then open for others, inactive once revoked', () => {
    let s = fresh()
    expect(sel.linkView(s, viewer(U.tom), TIVERNE_LINK_ID)).toMatchObject({ state: 'preview', count: 5 })
    expect(sel.linkView(s, viewer(U.priya), TIVERNE_LINK_ID)).toEqual({ state: 'terms', count: 5 })
    expect(sel.linkView(s, viewer(U.marcus), TIVERNE_LINK_ID)).toEqual({ state: 'terms', count: 5 })
    s = must(openShareLink(s, actor(U.priya), TIVERNE_LINK_ID)).state
    const open = sel.linkView(s, viewer(U.priya), TIVERNE_LINK_ID)
    expect(open.state).toBe('open')
    if (open.state === 'open') {
      expect(open.materialLinks).toBe(true)
      expect(open.cards.map((c) => c.publicId)).toEqual(['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'].map((t) => lotForItem(s.world, itemByTag(s.world, t).id).publicId))
      expect(open.cards.every((c) => c.sharedInConfidence)).toBe(true)
    }
    expect(sel.linkView(s, viewer(U.isla), TIVERNE_LINK_ID).state).toBe('terms')
    s = must(openShareLink(s, actor(U.dana), TIVERNE_LINK_ID)).state
    const dana = sel.linkView(s, viewer(U.dana), TIVERNE_LINK_ID)
    expect(dana.state === 'open' && dana.materialLinks).toBe(false)
    s = must(revokeShareLink(s, actor(U.tom), TIVERNE_LINK_ID)).state
    expect(sel.linkView(s, viewer(U.priya), TIVERNE_LINK_ID)).toEqual({ state: 'inactive' })
    expect(sel.linkView(s, viewer(U.tom), TIVERNE_LINK_ID)).toEqual({ state: 'inactive' })
    expect(sel.linkView(s, viewer(U.priya), 'lnk_nothere')).toEqual({ state: 'inactive' })
  })

  it("titles the link page, and its breadcrumb, as the owner's preview or as shared with you", () => {
    let s = fresh()
    const path = `/app/links/${TIVERNE_LINK_ID}`
    expect(sel.linkPageTitle(s, viewer(U.tom), TIVERNE_LINK_ID)).toBe('Your share link')
    expect(pageLocation(s, viewer(U.tom), path)).toEqual({ crumbs: [{ label: 'Your share link', href: null }], title: 'Your share link' })
    expect(pageLocation(s, viewer(U.priya), path).title).toBe('Shared with you by link')
    s = must(revokeShareLink(s, actor(U.tom), TIVERNE_LINK_ID)).state
    expect(pageLocation(s, viewer(U.tom), path).title).toBe('Shared with you by link')
  })

  it("the owner's list counts opens by type and offers the shared lots", () => {
    let s = fresh()
    s = must(openShareLink(s, actor(U.priya), TIVERNE_LINK_ID)).state
    s = must(openShareLink(s, actor(U.isla), TIVERNE_LINK_ID)).state
    const v = sel.shareLinksView(s, viewer(U.tom), TIVERNE_ID)!
    expect(v.rows).toHaveLength(1)
    expect(v.rows[0]).toMatchObject({ label: 'Primary steel for enquiries', href: `/app/links/${TIVERNE_LINK_ID}`, lotCount: 5, activeLotCount: 5, createdByName: 'Tom Ashby', status: 'active', statusLabel: 'Active', canRevoke: true, openedText: 'Opened by 2 organisations (1 architecture practice, 1 developer or client)' })
    expect(v.eligible.map((e) => e.tag)).toEqual(['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'])
    expect(v.canCreate).toBe(true)
    expect(sel.shareLinksView(s, viewer(U.dana), TIVERNE_ID)).toBeNull()
  })

  it('an architect who opened a link reads its lots as material pages and in Shared with you', () => {
    let s = fresh()
    const th03 = lotForItem(s.world, itemByTag(s.world, 'TH-03').id).publicId
    expect(sel.materialView(s, viewer(U.priya), th03, null)).not.toBeNull()
    s = must(openShareLink(s, actor(U.priya), TIVERNE_LINK_ID)).state
    // Sallow Court has not accepted its own terms; the link's terms are enough.
    const groups = sel.sharedGroups(s, viewer(U.priya))
    const sallow = groups.find((g) => g.project.name === 'Sallow Court')!
    expect(sallow.termsAccepted).toBe(false)
    expect(sallow.cards.map((c) => c.publicId)).toContain(th03)
    expect(sel.materialView(s, viewer(U.priya), th03, null)).not.toBeNull()
  })
})

describe('the contractor', () => {
  it('sees the Availability tab with no lot, price, visibility or request field', () => {
    const { s, lee } = withLee()
    const v = sel.availabilityView(s, viewer(lee), TIVERNE_ID)!
    expect(v.rows).toHaveLength(11)
    expect(v.rows.find((r) => r.tag === 'TH-07')).toMatchObject({ month: '2027-03', surveyorText: 'February 2027' })
    expect(v.datedCount).toBe(5)
    expect(v.defaultMonth).toBe('2027-01')
    expect(v.canEdit).toBe(true)
    expect(JSON.stringify(v)).not.toMatch(/"(ask|askPerUnit|reserve|reservePerUnit|visibility|visibilityLabel|requests?|lotId|publicId)"/)
    expect(sel.availabilityView(s, viewer(U.dana), TIVERNE_ID)).toBeNull()
    expect(sel.availabilityView(s, viewer(U.tom), TIVERNE_ID)).toBeNull()
  })

  it('the owner sees the contractor dates beside the lot dates and can apply them', () => {
    const s = fresh()
    const inv = sel.inventoryView(s, viewer(U.tom), TIVERNE_ID)!
    expect(inv.contractorName).toBe('Fennick Dismantling')
    expect(inv.canApplyContractorDates).toBe(true)
    expect(inv.applyCount).toBe(5)
    expect(inv.rows.find((r) => r.tag === 'TH-07')).toMatchObject({ contractorText: 'March 2027', contractorDiffers: true })
    expect(inv.rows.find((r) => r.tag === 'TH-02')).toMatchObject({ contractorText: 'Not set', contractorDiffers: false })
    const d = sel.itemDetail(s, viewer(U.tom), TIVERNE_ID, itemByTag(s.world, 'TH-07').id)!
    expect(d.owner!.dates).toMatchObject({ surveyorText: 'February 2027', contractorText: 'March 2027', canUseContractor: true })
    expect(d.owner!.dates.buyersSeeText).toBe(d.owner!.preview.availabilityText)
    expect(sel.inventoryView(s, viewer(U.dana), TIVERNE_ID)!.canApplyContractorDates).toBe(false)
  })

  it('a contractor alone opens Overview and Availability, not the records', () => {
    const { s, lee } = withLee()
    expect(sel.buildingOverview(s, viewer(lee), TIVERNE_ID)).toMatchObject({ contractorOptions: [], testing: null })
    expect(sel.inventoryView(s, viewer(lee), TIVERNE_ID)).toBeNull()
    expect(sel.captureView(s, viewer(lee), TIVERNE_ID)).toBeNull()
    expect(sel.itemDetail(s, viewer(lee), TIVERNE_ID, itemByTag(s.world, 'TH-07').id)).toBeNull()
    expect(sel.testingView(s, viewer(lee), TIVERNE_ID)).toBeNull()
  })
})

describe('the building overview', () => {
  it('summarises the structure and offers the editor and contractor choices', () => {
    const s = fresh()
    const o = sel.buildingOverview(s, viewer(U.tom), TIVERNE_ID)!
    expect(o.structure.summary).toBe('Bolted steel frame, composite slabs on metal deck, concrete cores, stone cladding, precast concrete panels, unitised curtain wall')
    expect(o.facts.find((f) => f.label === 'Structure')!.value).toBe(o.structure.summary)
    // The Building card leaves the structure to the Structure card beside it, so the aside stays short.
    expect(o.cardFacts.map((f) => f.label)).toEqual(o.facts.map((f) => f.label).filter((l) => l !== 'Structure'))
    expect(o.cardFacts.map((f) => f.label)).toContain('Address')
    expect(JSON.stringify(o.cardFacts)).not.toContain('Bolted steel frame')
    expect(o.structure.notes).toBe('Composite slabs act as diaphragms; cores at the north and east corners.')
    expect(o.structure.rows[0]).toEqual({ kind: 'frame', label: 'Frame', materialLabel: 'Steel', systemLabel: 'Steel beams and columns, bolted connections', note: '' })
    expect(o.structure.rows.at(-1)!.note).toBe('Added in 2003')
    expect(o.structure.canEdit).toBe(true)
    expect(o.structure.options.map((x) => x.label)).toEqual(['Frame', 'Floor slabs', 'Roof structure', 'Stability system', 'Foundations', 'Facade'])
    expect(o.contractor).toEqual({ orgId: FENNICK_ID, name: 'Fennick Dismantling', datedCount: 5, itemCount: 11 })
    expect(o.contractorOptions.map((x) => x.name)).toEqual(['Tarnbrook Deconstruction', 'Fennick Dismantling'])
    expect(o.testing).toEqual({ open: 1, href: `/app/buildings/${TIVERNE_ID}/testing` })
    expect(sel.buildingOverview(s, viewer(U.dana), HARROWDEN_ID)!.structure.summary).toBe('Bolted steel frame, composite slabs on metal deck, steel bracing, brick outer leaf')
  })
})

describe('testing', () => {
  it('lists requests with their status and who may record what', () => {
    const s = fresh()
    const dana = sel.testingView(s, viewer(U.dana), TIVERNE_ID)!
    expect(dana.open).toBe(1)
    expect(dana.rows[0]).toMatchObject({ id: TIVERNE_TESTING_ID, companyName: 'Brindmoor Testing', companyEmail: 'bookings@brindmoor.example', status: 'booked', statusLabel: 'Visit booked', statusTone: 'info', services: ['Steel coupon tests'], requestedByName: 'Dana Kowalski', canBook: true, canRecord: true, canCancel: true, recordLocked: true })
    expect(dana.rows[0].items.map((i) => i.tag)).toEqual(['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'])
    expect(dana.rows[0].bookedText).not.toBeNull()
    expect(sel.testingView(s, viewer(U.tom), TIVERNE_ID)!.rows[0].recordLocked).toBe(false)
    expect(sel.testingView(s, viewer(U.priya), TIVERNE_ID)).toBeNull()
  })

  it('the request dialog filters tests by the items and companies by the tests and region', () => {
    const s = fresh()
    const steel = [itemByTag(s.world, 'TH-01').id]
    const a = sel.testingDraftOptions(s, viewer(U.dana), TIVERNE_ID, { itemIds: steel, services: ['steel_coupon'] })!
    expect(a.services.map((x) => x.id)).toEqual(['visual_dimensional', 'steel_coupon', 'steel_hardness'])
    expect(a.companies.map((c) => c.name)).toEqual(['Brindmoor Testing'])
    expect(a.noCompanyText).toBeNull()
    expect(a.items.find((i) => i.tag === 'TH-02')!.locked).toBe(true)
    const both = sel.testingDraftOptions(s, viewer(U.dana), TIVERNE_ID, { itemIds: [...steel, itemByTag(s.world, 'TH-10').id], services: ['masonry', 'steel_coupon'] })!
    expect(both.companies).toEqual([])
    expect(both.noCompanyText).toBe('No one company offers all of these tests. Send two requests.')
  })
})

describe('building confirmations', () => {
  it('the owner sees the waiting confirmation, with the surveyor named', () => {
    let s = fresh()
    const rows = sel.claimRowsForOwner(s, viewer(U.tom))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: AMBREY_CLAIM_ID, buildingName: 'Ambrey House', address: '6 Quarrel Lane, London SE1', surveyorName: 'Tarnbrook Deconstruction', requestedByName: 'Dana Kowalski', itemCount: 2, surveyStatusLabel: 'In progress', status: 'pending', statusLabel: 'Waiting for you', canDecide: true })
    expect(sel.ownerHome(s, viewer(U.tom))!.stats.claimsAwaiting).toBe(1)
    expect(sel.claimRowsForOwner(s, viewer(U.dana))).toEqual([])
    s = must(decideBuildingClaim(s, actor(U.tom), AMBREY_CLAIM_ID, 'accepted', '')).state
    expect(sel.claimRowsForOwner(s, viewer(U.tom))[0]).toMatchObject({ status: 'accepted', statusLabel: 'Confirmed', canDecide: false })
    expect(sel.buildingsList(s, viewer(U.tom)).rows.map((r) => r.name)).toEqual(['Tiverne House', 'Ambrey House'])
  })

  it('the surveyor sees its unconfirmed buildings apart, with where each stands', () => {
    const s = fresh()
    const list = sel.buildingsList(s, viewer(U.dana))
    expect(list.rows.map((r) => r.name)).toEqual(['Tiverne House', 'Harrowden Court'])
    expect(list.unlinked.map((r) => [r.name, r.claim.label])).toEqual([['Ambrey House', 'Waiting for the owner']])
    expect(list.canAdd).toBe(true)
    const home = sel.surveyorHome(s, viewer(U.dana))!
    expect(home.stats.unlinked).toBe(1)
    expect(home.unlinked.map((b) => [b.name, b.claim.status, b.roleLabel])).toEqual([['Ambrey House', 'pending', 'Surveyor']])
    expect(sel.inventoryView(s, viewer(U.dana), AMBREY_ID)!.canSubmit).toBe(false)
  })
})

describe('New projects for the owner', () => {
  it('appear in the list, the home and the options', () => {
    const s0 = fresh()
    const opts = sel.newBuildingOptions(s0, viewer(U.tom))!
    expect(opts.mode).toBe('owner')
    expect(opts.kinds.map((k) => k.label)).toEqual(['Donor building', 'New project'])
    // Round 2 (BRIEF 14.2): Tessaly Architects is seeded with Kilnworth Place, so the owner may appoint it too.
    expect(opts.architects).toEqual([{ orgId: ORG_IDS.oriel, name: 'Studio Oriel' }, { orgId: 'org_tessaly', name: 'Tessaly Architects' }])
    expect(opts.projectTypes).toHaveLength(13)
    expect(opts.structure).toHaveLength(6)
    expect(sel.newBuildingOptions(s0, viewer(U.dana))).toMatchObject({ mode: 'surveyor', surveyors: [], architects: [], projectTypes: [] })
    expect(sel.newBuildingOptions(s0, viewer(U.priya))).toBeNull()
    const r = must(createOwnerProject(s0, actor(U.tom), WEXCOMBE))
    const list = sel.buildingsList(r.state, viewer(U.tom))
    expect(list.projects).toEqual([{ id: r.value, name: 'Wexcombe House', typeLabel: 'Office', architectName: 'Studio Oriel', stageText: 'RIBA Stage 2, Concept Design', startText: '20 September 2027', waitingApprovals: 0, approved: 0, href: `/app/projects/${r.value}` }])
    const home = sel.ownerHome(r.state, viewer(U.tom))!
    expect(home.stats).toMatchObject({ donorBuildings: 1, newProjects: 1 })
    expect(home.newProjects.map((p) => p.name)).toEqual(['Wexcombe House'])
    expect(sel.projectHeader(r.state, viewer(U.tom), r.value)!.side).toBe('client')
  })

  it('without an architect, offer the owner to appoint one instead of an empty team', () => {
    const r = must(createOwnerProject(fresh(), actor(U.tom), { ...WEXCOMBE, architectOrgId: null }))
    const id = r.value
    const header = sel.projectHeader(r.state, viewer(U.tom), id)!
    expect(header).toMatchObject({ architectName: '', architectText: 'Not appointed yet', canAppointArchitect: true })
    const team = sel.projectTeam(r.state, viewer(U.tom), id)!
    expect(team.sections.map((x) => [x.roleLabel, x.orgName])).toEqual([['Client', 'Ostlea Estates']])
    expect(team.appointArchitect).toEqual({ projectId: id, projectName: 'Wexcombe House', options: [{ orgId: ORG_IDS.oriel, name: 'Studio Oriel' }, { orgId: 'org_tessaly', name: 'Tessaly Architects' }] })
    const overview = sel.projectOverview(r.state, viewer(U.tom), id)!
    expect(overview.nextSteps[0]).toEqual({ id: 'architect', text: 'Appoint an architect to start sourcing', href: `/app/projects/${id}/team` })
    expect(overview.requirements).toMatchObject({ noArchitect: true, emptyText: 'Appoint an architect to choose which requirements apply.' })

    // Once a practice is appointed, the team, the header and the next steps follow, and nothing offers to appoint again.
    const after = must(appointProjectArchitect(r.state, actor(U.tom), id, ORG_IDS.oriel)).state
    expect(sel.projectHeader(after, viewer(U.tom), id)).toMatchObject({ architectName: 'Studio Oriel', architectText: 'Studio Oriel', canAppointArchitect: false })
    const team2 = sel.projectTeam(after, viewer(U.tom), id)!
    expect(team2.sections.map((x) => [x.roleLabel, x.orgName])).toEqual([['Client', 'Ostlea Estates'], ['Architect', 'Studio Oriel']])
    expect(team2.appointArchitect).toBeNull()
    expect(sel.appointArchitectView(after, viewer(U.tom), id)).toBeNull()
    expect(sel.projectOverview(after, viewer(U.tom), id)!.nextSteps.map((x) => x.id)).not.toContain('architect')
    expect(sel.projectOverview(after, viewer(U.tom), id)!.requirements).toMatchObject({ noArchitect: false, emptyText: 'The architect has not chosen any requirements yet.' })
    // The architect sees their own empty state, never the owner's.
    expect(sel.projectOverview(after, viewer(U.priya), id)!.requirements.emptyText).toBe('No requirements chosen yet. Pick the policies and standards to track for this location.')
    expect(sel.appointArchitectView(after, viewer(U.priya), id)).toBeNull()
  })

  it('never offers anyone but the owner client to appoint an architect', () => {
    const s = fresh()
    expect(sel.projectHeader(s, viewer(U.priya), MERROWGATE_ID)!).toMatchObject({ canAppointArchitect: false, architectText: 'Studio Oriel' })
    expect(sel.appointArchitectView(s, viewer(U.priya), MERROWGATE_ID)).toBeNull()
    expect(sel.projectTeam(s, viewer(U.priya), MERROWGATE_ID)!.appointArchitect).toBeNull()
    const r = must(createOwnerProject(s, actor(U.tom), { ...WEXCOMBE, architectOrgId: null }))
    expect(sel.appointArchitectView(r.state, viewer(U.dana), r.value)).toBeNull()
  })
})

describe('the sidebar', () => {
  it('gives the surveyor Capture and the unconfirmed buildings', () => {
    const s = fresh()
    const nav = sel.navModel(s, viewer(U.dana))!
    expect(nav.sections[0].items.map((i) => [i.label, i.href, i.icon])).toEqual([
      ['Home', '/app/home', 'House'],
      ['Capture', '/app/capture', 'Camera'],
    ])
    const clients = nav.sections[1].items
    const unlinked = clients.find((i) => i.label === 'Not yet linked')!
    expect(unlinked.children.map((c) => c.label)).toEqual(['Ambrey House'])
    // Changed 16 October 2026 (recording audit, note C1): Requirements on every surveyed building.
    expect(unlinked.children[0].children.map((c) => c.label)).toEqual(['Overview', 'Capture', 'Inventory', 'Testing', 'Requirements'])
    expect(clients.at(-1)).toMatchObject({ label: 'Add building', href: '/app/buildings?new=1', icon: 'Plus' })
  })

  it('gives a contractor its Availability tab', () => {
    let { s, lee } = withLee()
    const nav = sel.navModel(s, viewer(lee))!
    const tiverne = nav.sections[1].items[0].children[0]
    expect(tiverne.children.map((c) => c.label)).toEqual(['Overview', 'Availability'])
    // A surveying firm that is also the contractor gets both.
    s = must(appointContractor(s, actor(U.tom), TIVERNE_ID, ORG_IDS.tarnbrook)).state
    const dana = sel.navModel(s, viewer(U.dana))!.sections[1].items[0].children[0]
    // Changed 16 October 2026 (recording audit, note C1): Requirements on every surveyed building.
    expect(dana.children.map((c) => c.label)).toEqual(['Overview', 'Capture', 'Inventory', 'Testing', 'Requirements', 'Availability'])
  })

  it('gives the owner Donor buildings with Recovery plan, then New projects and the marketplace once it has one', () => {
    const s0 = fresh()
    const before = sel.navModel(s0, viewer(U.tom))!
    expect(before.sections.map((x) => x.title)).toEqual([null, 'Donor buildings', null])
    // Changed 16 October 2026 (recording audit, note C1): Requirements on every donor building.
    expect(before.sections[1].items[0].children.map((c) => c.label)).toEqual(['Overview', 'Inventory', 'Recovery plan', 'Listings', 'Sharing', 'Testing', 'Requirements'])
    expect(before.sections[0].items.map((i) => i.label)).toEqual(['Home'])
    const r = must(createOwnerProject(s0, actor(U.tom), WEXCOMBE))
    const after = sel.navModel(r.state, viewer(U.tom))!
    expect(after.sections.map((x) => x.title)).toEqual([null, 'Donor buildings', 'New projects', null])
    expect(after.sections[0].items.map((i) => i.label)).toEqual(['Home', 'Marketplace'])
    // Round 2 (client-consultant design 11): the owner is the client of its New project, so it gets the client's tabs, with Sustainability in place of Carbon and Requirements.
    expect(after.sections[2].items[0].children.map((c) => c.label)).toEqual(['Overview', 'Approvals', 'Reservations', 'Specification', 'Sustainability', 'Requirements'])
    for (const tab of ['sustainability', 'requirements', 'carbon']) expect(sel.routeAccess(r.state, viewer(U.tom), `/app/projects/${r.value}/${tab}`)).toBe('ok')
    for (const tab of ['targets', 'certification', 'statement', 'compliance']) expect(sel.routeAccess(r.state, viewer(U.tom), `/app/projects/${r.value}/${tab}`)).toBe('forbidden')
    expect(sel.sustainabilityView(r.state, viewer(U.tom), r.value)).not.toBeNull()
    expect(sel.requirementsView(r.state, viewer(U.tom), r.value)).not.toBeNull()
  })
})

describe('routes', () => {
  it('checks the round 2 routes for each side', () => {
    const { s: s0, lee } = withLee()
    const r = (s: AppData, id: string, path: string) => sel.routeAccess(s, viewer(id), path)
    expect(r(s0, U.dana, '/app/capture')).toBe('ok')
    expect(r(s0, U.tom, '/app/capture')).toBe('ok')
    expect(r(s0, U.priya, '/app/capture')).toBe('forbidden')
    expect(r(s0, U.dana, '/app/capture/x')).toBe('not_found')
    for (const id of [U.priya, U.isla, U.tom, U.dana, U.marcus, lee]) expect(r(s0, id, `/app/links/${TIVERNE_LINK_ID}`)).toBe('ok')
    expect(r(s0, U.priya, '/app/links/lnk_nothere')).toBe('ok')
    expect(r(s0, U.priya, '/app/links')).toBe('not_found')
    expect(r(s0, U.tom, `/app/buildings/${TIVERNE_ID}/testing`)).toBe('ok')
    expect(r(s0, U.dana, `/app/buildings/${TIVERNE_ID}/testing`)).toBe('ok')
    expect(r(s0, lee, `/app/buildings/${TIVERNE_ID}/testing`)).toBe('forbidden')
    expect(r(s0, lee, `/app/buildings/${TIVERNE_ID}`)).toBe('ok')
    expect(r(s0, lee, `/app/buildings/${TIVERNE_ID}/availability`)).toBe('ok')
    expect(r(s0, lee, `/app/buildings/${TIVERNE_ID}/inventory`)).toBe('forbidden')
    expect(r(s0, lee, `/app/buildings/${TIVERNE_ID}/inventory/${itemByTag(s0.world, 'TH-01').id}`)).toBe('forbidden')
    expect(r(s0, lee, `/app/buildings/${TIVERNE_ID}/capture`)).toBe('forbidden')
    expect(r(s0, U.dana, `/app/buildings/${TIVERNE_ID}/availability`)).toBe('forbidden')
    expect(r(s0, U.tom, `/app/buildings/${TIVERNE_ID}/availability`)).toBe('forbidden')
    expect(r(s0, U.dana, `/app/buildings/${AMBREY_ID}/inventory`)).toBe('ok')
    expect(r(s0, U.tom, `/app/buildings/${AMBREY_ID}`)).toBe('forbidden')
    const s1 = must(appointContractor(s0, actor(U.tom), TIVERNE_ID, ORG_IDS.tarnbrook)).state
    expect(r(s1, U.dana, `/app/buildings/${TIVERNE_ID}/availability`)).toBe('ok')
    // The owner as client of a New project reads projects and the marketplace.
    expect(r(s0, U.tom, '/app/projects')).toBe('forbidden')
    expect(r(s0, U.tom, '/app/discover')).toBe('forbidden')
    expect(r(s0, U.tom, '/app/marketplace')).toBe('forbidden')
    const p = must(createOwnerProject(s0, actor(U.tom), WEXCOMBE))
    expect(r(p.state, U.tom, '/app/projects')).toBe('ok')
    expect(r(p.state, U.tom, `/app/projects/${p.value}`)).toBe('ok')
    expect(r(p.state, U.tom, `/app/projects/${p.value}/approvals`)).toBe('ok')
    expect(r(p.state, U.tom, `/app/projects/${p.value}/shortlist`)).toBe('forbidden')
    expect(r(p.state, U.tom, `/app/projects/${MERROWGATE_ID}`)).toBe('forbidden')
    expect(r(p.state, U.tom, '/app/projects/new')).toBe('forbidden')
    expect(r(p.state, U.tom, '/app/discover')).toBe('ok')
    expect(r(p.state, U.tom, '/app/discover/L-NHZ32R')).toBe('ok')
    expect(r(p.state, U.tom, '/app/marketplace')).toBe('ok')
    expect(r(p.state, U.tom, '/app/marketplace/L-NHZ32R')).toBe('ok')
  })

  it('links in notifications and activity lead somewhere each reader can open', () => {
    let { s, lee } = withLee()
    s = must(setContractorDates(s, actor(lee), TIVERNE_ID, [{ itemId: itemByTag(s.world, 'TH-01').id, month: '2027-02' }])).state
    s = must(openShareLink(s, actor(U.priya), TIVERNE_LINK_ID)).state
    s = must(setLotVisibility(s, actor(U.tom), lotForItem(s.world, itemByTag(s.world, 'TH-07').id).id, { visibility: 'shared', ask: 180, reserve: 165 })).state
    const broken: string[] = []
    for (const [who, userId] of [...Object.entries(U), ['lee', lee]]) {
      const v = viewer(userId, NOW)
      for (const row of sel.activityFor(s, v)) if (row.href && sel.routeAccess(s, v, row.href.split('?')[0]) !== 'ok') broken.push(`${who} activity ${row.href}`)
      for (const g of sel.inboxView(s, v).groups) for (const n of g.items) if (sel.routeAccess(s, v, n.href.split('?')[0]) !== 'ok') broken.push(`${who} notification ${n.href}`)
    }
    expect(broken).toEqual([])
  })
})
