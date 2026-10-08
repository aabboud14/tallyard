// @vitest-environment jsdom
// The client, owner, surveyor and consultant screens, settings, notifications and help, through the real router:
// each renders for its person, shows no forbidden characters (P6) and no demo wording (P1), and keeps the two
// sides blind to each other until a reservation is accepted (P3).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { HARROWDEN_ID, MERROWGATE_ID, TIVERNE_ID, DURNLEY_ID } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { signUpState } from '../../store/actions/auth'
import { routes } from '../../app/router'

const NOW = '2026-10-08T10:00:00.000Z'

beforeAll(() => {
  installDomShims()
  const u = URL as unknown as Record<string, unknown>
  u.createObjectURL = vi.fn(() => 'blob:test')
  u.revokeObjectURL = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

beforeEach(async () => {
  setClockForTests(NOW)
  signOut()
  await useApp.getState().resetSandbox()
})

afterEach(() => cleanup())
afterAll(() => setClockForTests(null))

async function settle(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 5000): Promise<T> {
  const end = Date.now() + timeout
  for (;;) {
    let v: T | null | undefined | false = null
    try {
      v = fn()
    } catch {
      v = null
    }
    if (v) return v
    if (Date.now() > end) throw new Error('Timed out waiting')
    await settle()
  }
}

function open(path: string, userId: string) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

function expectClean() {
  const text = allText()
  expect(text).not.toMatch(FORBIDDEN)
  expect(text.toLowerCase()).not.toContain('prototype')
  expect(text).not.toMatch(/\bAI\b/)
}

const SCREENS: [string, string, string][] = [
  ['client home', U.isla, '/app/home'],
  ['owner home', U.tom, '/app/home'],
  ['surveyor home', U.dana, '/app/home'],
  ['consultant home', U.marcus, '/app/home'],
  ['approvals', U.isla, `/app/projects/${MERROWGATE_ID}/approvals`],
  ['reservations', U.isla, `/app/projects/${MERROWGATE_ID}/reservations`],
  ['project-carbon', U.marcus, `/app/projects/${MERROWGATE_ID}/carbon`],
  ['compliance', U.marcus, `/app/projects/${MERROWGATE_ID}/compliance`],
  ['buildings', U.tom, '/app/buildings'],
  ['building-overview', U.tom, `/app/buildings/${TIVERNE_ID}`],
  ['inventory', U.tom, `/app/buildings/${TIVERNE_ID}/inventory`],
  ['priorities', U.tom, `/app/buildings/${TIVERNE_ID}/priorities`],
  ['listings', U.tom, `/app/buildings/${TIVERNE_ID}/listings`],
  ['sharing', U.tom, `/app/buildings/${TIVERNE_ID}/sharing`],
  ['requests', U.tom, '/app/requests'],
  ['capture', U.dana, `/app/buildings/${HARROWDEN_ID}/capture`],
  ['waste', U.marcus, `/app/engagements/${DURNLEY_ID}/waste`],
  ['notifications', U.isla, '/app/notifications'],
  ['settings', U.tom, '/app/settings/team'],
  ['help', U.dana, '/app/help/methodology'],
]

const TEST_IDS: Record<string, string> = {
  'client home': 'client-home',
  'owner home': 'owner-home',
  'surveyor home': 'surveyor-home',
  'consultant home': 'consultant-home',
  'building-overview': 'building-overview',
}

describe('screens', () => {
  for (const [name, user, path] of SCREENS) {
    it(`renders ${name} cleanly`, async () => {
      open(path, user)
      await waitFor(() => document.querySelector(`[data-testid="${TEST_IDS[name] ?? name}"]`))
      expectClean()
    })
  }
})

describe('blind until accepted', () => {
  it('shows the owner a blind buyer, then the buyer once accepted', async () => {
    open('/app/requests', U.tom)
    await waitFor(() => document.querySelector('[data-testid="blind-buyer"]'))
    expect(allText()).not.toContain('Lantern Quay')
    expect(allText()).not.toContain('Isla Brennan')
    click(byTestId('accept-TH-02'))
    await waitFor(() => document.querySelector('[data-testid="decide-confirm"]'))
    click(byTestId('decide-confirm'))
    await settle()
    const r = Object.values(getData().reservations).find((x) => x.status === 'accepted')
    expect(r?.exchanged?.buyerOrg).toBe('Lantern Quay Developments')
  })

  it('never names the seller to the client before acceptance', async () => {
    open(`/app/projects/${MERROWGATE_ID}/reservations`, U.isla)
    await waitFor(() => document.querySelector('[data-testid="reservations"]'))
    const text = allText()
    expect(text).not.toContain('Ostlea')
    expect(text).not.toContain('Tom Ashby')
    expect(text).not.toContain('Tiverne')
  })
})

describe('flows', () => {
  it('lets the client approve with a note', async () => {
    open(`/app/projects/${MERROWGATE_ID}/approvals`, U.isla)
    const btn = await waitFor(() => document.querySelector<HTMLButtonElement>('[data-testid^="approve-"]'))
    click(btn)
    const note = await waitFor(() => document.querySelector<HTMLTextAreaElement>('[data-testid="decision-note"]'))
    typeInto(note, 'Approved for the podium.')
    click(byTestId('decision-confirm'))
    await settle()
    const list = Object.values(getData().world.wishlists).find((l) => l.projectId === MERROWGATE_ID)!
    expect(list.items.some((i) => i.status === 'approved' && i.decisionNote === 'Approved for the podium.')).toBe(true)
  })

  it('captures an item from a description on the capture screen', async () => {
    open(`/app/buildings/${HARROWDEN_ID}/capture`, U.dana)
    const text = await waitFor(() => document.querySelector<HTMLTextAreaElement>('[data-testid="capture-text"]'))
    typeInto(text, '30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
    await settle()
    expect(byTestId('assist-evidence').textContent).toContain('203x203x46')
    const before = Object.values(getData().world.items).filter((i) => i.buildingId === HARROWDEN_ID).length
    const good = await waitFor(() => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) => b.textContent?.includes('A · Good')))
    click(good)
    click(byTestId('capture-save-another'))
    await settle()
    const items = Object.values(getData().world.items).filter((i) => i.buildingId === HARROWDEN_ID)
    expect(items.length).toBe(before + 1)
    expect(items.some((i) => i.spec.family === 'steel_section' && i.spec.designation === 'UC 203x203x46' && i.location === 'roof plant room')).toBe(true)
    expect(byTestId('capture-saved').textContent).toContain('saved')
  })

  it('creates an invite with a link', async () => {
    open('/app/settings/team', U.tom)
    const email = await waitFor(() => document.querySelector<HTMLInputElement>('[data-testid="invite-email"]'))
    typeInto(email, 'new.colleague@ostlea.example')
    click(byTestId('invite-send'))
    await settle()
    expect(Object.values(getData().invites).some((i) => i.email === 'new.colleague@ostlea.example' && i.status === 'pending')).toBe(true)
    await waitFor(() => document.querySelector('[data-testid="invite-new.colleague@ostlea.example"]'))
  })
})

describe('new organisations', () => {
  const cases: [string, string, string, string][] = [
    ['Asset owner', '/app/home', 'Add your first building', 'owner'],
    ['Asset owner', '/app/buildings', 'Add your first building', 'owner-buildings'],
    ['Deconstruction contractor', '/app/home', 'No appointments yet', 'surveyor'],
    ['Developer', '/app/home', 'No projects yet', 'client'],
    ['Sustainability consultant', '/app/home', 'No projects yet', 'consultant'],
    ['Asset owner', '/app/requests', 'No reservation requests yet', 'owner-requests'],
  ]
  for (const [orgType, path, text, label] of cases) {
    it(`greets a new ${label} with a considered empty state`, async () => {
      const r = signUpState(getData(), { name: 'Rowan Hale', email: `rowan.${label}@newco.example`, orgName: 'Newco', orgType, salt: 's', passwordHash: 'h', now: NOW })
      expect(r.error).toBeNull()
      useApp.getState().commit(r.state)
      open(path, r.value!)
      await waitFor(() => document.body.textContent?.includes(text))
      expectClean()
    })
  }
})
