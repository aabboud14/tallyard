// Audit of 16 October 2026, owner package: what each side sees after the fixes. The testing request sheet (note 27),
// the surveyor's contractor job (note 28), the New project kind (note 30), the owner's marketplace and money (notes
// C5 and C6), the link page's unknown state (note 33), the survey steps and the Appointments crumb (incidentals).
import { describe, it, expect } from 'vitest'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { requestTesting } from '../actions/testing'
import { createOwnerProject } from '../actions/owner'
import { HARROWDEN_ID, itemByTag, MERROWGATE_ID, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import { pageLocation } from './arch-breadcrumbs'
import { clientHomeView } from './sustainability-screens'
import { testingRequestText } from './testing'
import * as sel from '.'

const WEXCOMBE = { name: 'Wexcombe House', projectType: 'office' as const, localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: ORG_IDS.oriel }

describe('what goes to the testing company (note 27)', () => {
  it('shows the seeded message on the request, and the sheet the company would receive, to both sides', () => {
    const s = fresh()
    for (const who of [U.tom, U.dana]) {
      const row = sel.testingView(s, viewer(who), TIVERNE_ID)!.rows.find((r) => r.id === TIVERNE_TESTING_ID)!
      expect(row.message).toBe('Coupons from five sections; grade unconfirmed from the archive drawings.')
      expect(row.preferredText).toBeNull()
      expect(row.sheet).toMatchObject({ companyName: 'Brindmoor Testing', companyEmail: 'bookings@brindmoor.example', fromName: 'Dana Kowalski', fromOrg: 'Tarnbrook Deconstruction', fromEmail: 'dana.kowalski@tarnbrook.example', buildingName: 'Tiverne House', tests: ['Steel coupon tests'] })
      expect(row.sheet.items.map((i) => i.tag)).toEqual(['TH-02', 'TH-03', 'TH-04', 'TH-05', 'TH-06'])
      expect(row.sheet.items[0].quantityText).toMatch(/pieces$/)
      expect(row.sheetText).toBe(testingRequestText(row.sheet))
      expect(row.fileName).toMatch(/^testing-request-tiverne-house-\d{4}-\d{2}-\d{2}\.txt$/)
    }
  })

  it('carries a new request\'s message and preferred date to the row, the sheet and its text', () => {
    const s0 = fresh()
    const steel = itemByTag(s0.world, 'TH-02').id
    const r = must(requestTesting(s0, actor(U.dana), { buildingId: TIVERNE_ID, itemIds: [steel], services: ['steel_hardness'], companyId: 'tco_calverd', preferredFrom: '2026-10-20', message: 'Levels 3 and 4 only.' }))
    const row = sel.testingView(r.state, viewer(U.tom), TIVERNE_ID)!.rows.find((x) => x.id === r.value)!
    expect(row).toMatchObject({ message: 'Levels 3 and 4 only.', preferredText: '20 October 2026' })
    expect(row.sheet).toMatchObject({ preferredText: '20 October 2026', message: 'Levels 3 and 4 only.', companyName: 'Calverd Inspection' })
    const text = row.sheetText
    expect(text).toContain('To: Calverd Inspection, enquiries@calverd.example')
    expect(text).toContain('From: Dana Kowalski, Tarnbrook Deconstruction, dana.kowalski@tarnbrook.example')
    expect(text).toContain('Testing request for Tiverne House')
    expect(text).toContain('- Steel hardness tests')
    expect(text).toContain('- TH-02: ')
    expect(text).toContain('Preferred from: 20 October 2026')
    expect(text).toContain('Message:\nLevels 3 and 4 only.')
    expect(text).not.toMatch(/[\u2013\u2014]/)
  })

  it('names who is told, and nobody on a building with no owner yet', () => {
    const s = fresh()
    const draft = { itemIds: [], services: [] }
    expect(sel.testingDraftOptions(s, viewer(U.dana), TIVERNE_ID, draft)!.otherSideName).toBe('Ostlea Estates')
    expect(sel.testingDraftOptions(s, viewer(U.tom), TIVERNE_ID, draft)!.otherSideName).toBe('Tarnbrook Deconstruction')
    expect(sel.testingDraftOptions(s, viewer(U.dana), AMBREY_ID, draft)!.otherSideName).toBeNull()
  })
})

describe('the surveyor\'s contractor job (note 28)', () => {
  it('shows Harrowden Court as a building Tarnbrook surveys and dates, with no dates yet', () => {
    const s = fresh()
    const home = sel.surveyorHome(s, viewer(U.dana))!
    const harrowden = home.appointments.flatMap((g) => g.buildings).find((b) => b.id === HARROWDEN_ID)!
    expect(harrowden).toMatchObject({ role: 'surveyor', setsDates: true, datedCount: 0 })
    expect(home.appointments.flatMap((g) => g.buildings).find((b) => b.id === TIVERNE_ID)!.setsDates).toBe(false)
    expect(sel.buildingHeader(s, viewer(U.dana), HARROWDEN_ID)!.tabs.map((t) => t.id)).toContain('availability')
    expect(sel.availabilityView(s, viewer(U.dana), HARROWDEN_ID)).not.toBeNull()
    const n = s.notifications.find((x) => x.orgId === ORG_IDS.tarnbrook && x.title === 'Brackwater Estates invited you to set availability dates at Harrowden Court')
    expect(n).toMatchObject({ kind: 'appointed', href: `/app/buildings/${HARROWDEN_ID}/availability` })
  })
})

describe('a New project is flagged as one (note 30)', () => {
  it('gives the owner a New project pill in the project header, and the architect none', () => {
    const r = must(createOwnerProject(fresh(), actor(U.tom), WEXCOMBE))
    expect(sel.projectHeader(r.state, viewer(U.tom), r.value)!.kindLabel).toBe('New project')
    expect(sel.projectHeader(r.state, viewer(U.priya), r.value)!.kindLabel).toBeNull()
    expect(sel.projectHeader(fresh(), viewer(U.isla), MERROWGATE_ID)!.kindLabel).toBeNull()
  })
})

describe('an owner who builds (notes C5 and C6)', () => {
  it('prompts an owner with no New project from the Marketplace, and not once it has one', () => {
    const s = fresh()
    expect(sel.ownerBuildPrompt(s, viewer(U.tom))).toEqual({ title: 'Building something too?', text: 'Add a new project to save materials to it and check them against its start on site.', href: '/app/buildings?new=project' })
    expect(sel.ownerBuildPrompt(s, viewer(U.priya))).toBeNull()
    const r = must(createOwnerProject(s, actor(U.tom), WEXCOMBE))
    expect(sel.ownerBuildPrompt(r.state, viewer(U.tom))).toBeNull()
  })

  it('puts the recoverable value of the donor buildings on the owner home, from the recovery plan', () => {
    const s = fresh()
    const d = sel.ownerDashboard(s, viewer(U.tom))!
    const plan = sel.priorityFor(s, TIVERNE_ID)
    expect(d.metrics.recoverableValue).toBe(plan.recoverableNetValue)
    expect(d.metrics.recoverableValue).toBeGreaterThan(0)
    expect(d.metrics.recoverCount).toBe(plan.rows.filter((x) => x.route === 'recover').length)
  })

  it('gives an owner with a New project the developer figures, to-do list and programme', () => {
    const s = fresh()
    expect(clientHomeView(s, viewer(U.tom))).toBeNull()
    const r = must(createOwnerProject(s, actor(U.tom), WEXCOMBE))
    const v = clientHomeView(r.state, viewer(U.tom))!
    expect(v.projects.map((p) => p.name)).toEqual(['Wexcombe House'])
    expect(v.timeline.rows.map((x) => x.name)).toEqual(['Wexcombe House'])
    expect(v.metrics.cost.total).toBe(0)
    // Still nothing of the developer view for a surveyor or an architect.
    expect(clientHomeView(r.state, viewer(U.dana))).toBeNull()
    expect(clientHomeView(r.state, viewer(U.priya))).toBeNull()
  })
})

describe('incidentals', () => {
  it('reads Appointments in the surveyor\'s crumbs, as the page title does', () => {
    const s = fresh()
    expect(pageLocation(s, viewer(U.dana), '/app/buildings').crumbs.map((c) => c.label)).toEqual(['Appointments'])
    expect(pageLocation(s, viewer(U.dana), `/app/buildings/${TIVERNE_ID}`).crumbs[0]).toMatchObject({ label: 'Appointments', href: '/app/buildings' })
    expect(pageLocation(s, viewer(U.tom), '/app/buildings').crumbs.map((c) => c.label)).toEqual(['Buildings'])
  })

  it('tells a link this sandbox never saw apart from a revoked one', () => {
    expect(sel.linkView(fresh(), viewer(U.priya), 'lnk_zzzzzz')).toEqual({ state: 'unknown' })
  })

  it('gives the building activity panel a one line summary', () => {
    const o = sel.buildingOverview(fresh(), viewer(U.tom), TIVERNE_ID)!
    expect(o.activitySummary.count).toBe(o.activity.length)
    expect(o.activitySummary.latest).toEqual(o.activity[0])
  })
})
