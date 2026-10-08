// BRIEF section 13, through the store as the screens use it: sign in, act, read view models, switch account.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setClockForTests, nowIso } from '../sandbox/clock'
import { useApp, getData } from '../store/app'
import { act } from '../store/act'
import { signIn, signOut, signUp, switchAccount } from '../store/session'
import { getSessionUserId } from '../store/sessionId'
import * as sel from '../store/selectors'
import { draftFromText } from '../store/capture'
import { MERROWGATE_ID, TIVERNE_ID } from '../domain/seed/world'
import { U } from './fixtures'

function me() {
  return { userId: getSessionUserId()!, now: nowIso() }
}

beforeAll(async () => {
  setClockForTests('2026-10-08T09:30:00.000Z')
  signOut()
  await useApp.getState().resetSandbox()
})

afterAll(() => setClockForTests(null))

describe('the acceptance journeys', () => {
  it('Priya finds a material, saves it to Merrowgate Wharf, checks its fit, sends it, downloads its DXF and exports the specification', async () => {
    expect((await signIn('priya.nair@studiooriel.example', 'sandbox', true)).error).toBeNull()
    const d = sel.discoverView(getData(), me(), { ...sel.DEFAULT_DISCOVER_QUERY, projectId: MERROWGATE_ID })
    const card = d.cards.find((c) => c.publicId === 'L-9F4CQQ')!
    expect(card.fitLabel).toBe('In time')
    const saved = act.saveToProject('L-9F4CQQ', MERROWGATE_ID)
    expect(saved.ok).toBe(true)
    const m = sel.materialView(getData(), me(), 'L-9F4CQQ', MERROWGATE_ID)!
    expect(m.saveTargets.find((t) => t.projectId === MERROWGATE_ID)!.saved).toBe(true)
    expect(m.availability.fitText).toBe('Available in time')
    expect(act.sendToClient(MERROWGATE_ID, [saved.value!], 'Secondary beams for levels 2 to 6.').value).toBe(1)
    const dxf = sel.geometryFile(getData(), me(), 'L-9F4CQQ', 'dxf')!
    expect(dxf.kind).toBe('file')
    const spec = sel.specificationView(getData(), me(), MERROWGATE_ID, 'draft')!
    expect(spec.clauses.map((c) => c.publicId)).toContain('L-9F4CQQ')
  })

  it('Isla sees the notification, approves and requests a reservation; Tom sees a blind request and accepts; both see each other', () => {
    expect(switchAccount(U.isla).error).toBeNull()
    const bell = sel.bellView(getData(), me())
    expect(bell.items[0].title).toBe('1 material to approve on Merrowgate Wharf')
    expect(bell.items[0].body).toBe('Priya Nair: Secondary beams for levels 2 to 6.')
    const waiting = sel.approvalsView(getData(), me(), MERROWGATE_ID)!.waiting.find((r) => r.publicId === 'L-9F4CQQ')!
    expect(act.decideItem(MERROWGATE_ID, waiting.itemId, 'approved', 'Approved.').ok).toBe(true)
    const row = sel.reservationsView(getData(), me(), MERROWGATE_ID)!.rows.find((r) => r.publicId === 'L-9F4CQQ')!
    expect(row.canRequest).toBe(true)
    const req = act.requestReservation(MERROWGATE_ID, row.itemId, 'For the frame.')
    expect(req.ok).toBe(true)

    expect(switchAccount(U.tom).error).toBeNull()
    expect(sel.bellView(getData(), me()).items[0].title).toBe('Reservation request for TH-01')
    const pending = sel.requestsView(getData(), me())!.pending.find((r) => r.publicId === 'L-9F4CQQ')!
    expect(pending.buyer).toEqual({ kind: 'blind', text: 'Design team, commercial project, Inner London East, needed by Q2 2028' })
    expect(act.decideReservation(pending.id, 'accepted', '').ok).toBe(true)
    const done = sel.requestsView(getData(), me())!.decided.find((r) => r.id === pending.id)!
    expect(done.buyer).toMatchObject({ kind: 'known', org: 'Lantern Quay Developments', contact: 'Isla Brennan' })

    expect(switchAccount(U.isla).error).toBeNull()
    const mine = sel.reservationsView(getData(), me(), MERROWGATE_ID)!.rows.find((r) => r.publicId === 'L-9F4CQQ')!
    expect(mine.reservation!.exchanged).toMatchObject({ sellerOrg: 'Ostlea Estates', sellerContact: 'Tom Ashby' })
  })

  it('Dana captures an item with a photo; Tom sees it in the inventory and the notification', () => {
    expect(switchAccount(U.dana).error).toBeNull()
    const draft = draftFromText('24 no. 254x254x73 UC, 3.5m long, bolted, level 6 plant deck')
    const r = act.captureItem({ buildingId: TIVERNE_ID, spec: draft.spec!, quantity: draft.quantity!, condition: 'A', recoverability: draft.recoverability ?? 'B', location: draft.location, notes: '', photoIds: ['pho_1a2b3c4d-5e6f'], expectedAvailableFrom: null })
    expect(r.ok).toBe(true)
    expect(switchAccount(U.tom).error).toBeNull()
    const inv = sel.inventoryView(getData(), me(), TIVERNE_ID)!
    expect(inv.rows.find((x) => x.tag === r.value!.tag)!.photoCount).toBe(1)
    expect(sel.bellView(getData(), me()).items[0].title).toBe(`Dana Kowalski captured ${r.value!.tag} at Tiverne House`)
  })

  it('Marcus opens the project carbon and compliance', () => {
    expect(switchAccount(U.marcus).error).toBeNull()
    const c = sel.complianceView(getData(), me(), MERROWGATE_ID)!
    expect(c.reusedItems.some((x) => x.publicId === 'L-9F4CQQ' && x.status === 'Reserved')).toBe(true)
    expect(c.fileName).toMatch(/^merrowgate-wharf-compliance-/)
    expect(sel.projectCarbon(getData(), me(), MERROWGATE_ID)!.reserved.count).toBe(1)
  })

  it('a new visitor signs up as an architecture practice, creates a project and saves a material', async () => {
    signOut()
    expect((await signUp({ name: 'Jo Park', email: 'jo@parkstudio.example', password: 'drawings1', orgName: 'Park Studio', orgType: 'architect' })).error).toBeNull()
    const p = act.createProject({ name: 'Corbel Yard', client: { name: 'Quillon Homes' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-11-01', consultantOrgId: null })
    expect(p.ok).toBe(true)
    expect(act.saveToProject('L-A945G6', p.value!).ok).toBe(true)
    const nav = sel.navModel(getData(), me())!
    expect(nav.sections[1].items.map((i) => i.label)).toEqual(['Corbel Yard', 'New project'])
    expect(sel.shortlistBoard(getData(), me(), p.value!)!.rows.map((r) => r.publicId)).toEqual(['L-A945G6'])
  })
})
