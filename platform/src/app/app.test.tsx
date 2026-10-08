// @vitest-environment jsdom
// The app through its real router: guards, the shell, Discover, the material page's downloads, the shortlist's
// send flow and the read-only specification. Screens show only public listing fields (P3) and no forbidden
// characters (P6).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../ui/testing'
import { setClockForTests } from '../sandbox/clock'
import { useApp, getData } from '../store/app'
import { signOut } from '../store/session'
import { setSessionUserId } from '../store/sessionId'
import { projectWishlist } from '../store/lots'
import { lotPrivateStrings } from '../domain/privacy/privateStrings'
import { MERROWGATE_ID, SALLOW_ID } from '../domain/seed/world'
import { setProjectAccess } from '../store/actions/owner'
import { U } from '../test/fixtures'
import { routes } from './router'
import { safeNext, signInHref } from './next'
import { pickComponent } from './pages'
import { isActive } from './navIcons'

const NOW = '2026-10-08T10:00:00.000Z'

beforeAll(() => {
  installDomShims()
  const u = URL as unknown as Record<string, unknown>
  u.createObjectURL = vi.fn(() => 'blob:test')
  u.revokeObjectURL = vi.fn()
  // jsdom has no scrolling and no file downloads.
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

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 4000): Promise<T> {
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

function open(path: string, userId: string | null = U.priya) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

function privateStrings(): string[] {
  const s = getData()
  const out = new Set<string>()
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) if (x.length >= 4) out.add(x)
  }
  return [...out]
}

describe('helpers', () => {
  it('only returns to app pages on this site after sign in', () => {
    expect(safeNext('/app/discover?type=envelope')).toBe('/app/discover?type=envelope')
    expect(safeNext('https://elsewhere.example/app')).toBe('/app/home')
    expect(safeNext('//elsewhere.example')).toBe('/app/home')
    expect(safeNext(null)).toBe('/app/home')
    expect(signInHref('/app/saved', '')).toBe('/signin?next=%2Fapp%2Fsaved')
    expect(signInHref('/app/home', '')).toBe('/signin')
  })

  it('picks a page component by name, default or the only component', () => {
    const A = () => null
    const B = () => null
    expect(pickComponent({ Saved: A, helper: () => 1 }, 'Saved')).toBe(A)
    expect(pickComponent({ default: B }, 'Saved')).toBe(B)
    expect(pickComponent({ SavedPage: A, LABELS: 1 }, 'Saved')).toBe(A)
    expect(() => pickComponent({ X: A, Y: B }, 'Saved')).toThrow()
  })

  it('marks the current nav item, with a project overview current only on itself', () => {
    const base = `/app/projects/${MERROWGATE_ID}`
    expect(isActive('/app/discover/L-9F4CQQ', '/app/discover', null)).toBe(true)
    expect(isActive(`${base}/shortlist`, base, base)).toBe(false)
    expect(isActive(base, base, base)).toBe(true)
    expect(isActive('/app/home/x', '/app/home', null)).toBe(false)
    expect(isActive('/app/buildings', '/app/buildings?new=1', null)).toBe(false)
    expect(isActive('/app/buildings', '/app/buildings?new=1', null, '?new=1')).toBe(true)
  })
})

describe('guards', () => {
  it('sends a signed-out visitor to sign in, returning to the page after', async () => {
    const router = open(`/app/projects/${MERROWGATE_ID}/shortlist`, null)
    await waitFor(() => document.querySelector('[data-testid="signin-page"]'))
    expect(router.state.location.pathname).toBe('/signin')
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent(`/app/projects/${MERROWGATE_ID}/shortlist`)}`)
  })

  it('shows a calm no-access page for another workspace, with no data', async () => {
    open('/app/buildings')
    await waitFor(() => document.querySelector('[data-testid="no-access"]'))
    expect(document.body.textContent).toContain('You do not have access to this')
    expect(document.body.textContent).not.toContain('Tiverne')
  })

  it('never shows a project the person does not work on', async () => {
    open(`/app/projects/${MERROWGATE_ID}/shortlist`, U.tom)
    await waitFor(() => document.querySelector('[data-testid="no-access"]'))
    expect(document.querySelector('[data-testid="project-layout"]')).toBeNull()
  })
})

describe('shell and Discover', () => {
  it('lists the projects as folders and the marketplace as cards, checked against a project', async () => {
    open('/app/discover')
    await waitFor(() => document.querySelector('[data-testid="discover-grid"]'))
    expect(byTestId('sidebar').textContent).toContain('Merrowgate Wharf')
    const cards = document.querySelectorAll('[data-testid^="card-"]')
    expect(cards.length).toBe(17)
    expect(byTestId('results-line').textContent).toContain('Timeline checked against Merrowgate Wharf')
    expect(document.querySelector('[data-testid="saved-badge-L-2MAC36"]')?.textContent).toBe('Merrowgate Wharf')
    expect(allText()).not.toMatch(FORBIDDEN)
    const body = document.body.textContent ?? ''
    for (const p of privateStrings()) expect(body, p).not.toContain(p)
  })

  it('filters by typology from the tabs', async () => {
    const router = open('/app/discover')
    await waitFor(() => document.querySelector('[data-testid="discover-grid"]'))
    click(byTestId('typology-envelope'))
    await waitFor(() => router.state.location.search.includes('type=envelope'))
    await waitFor(() => document.querySelectorAll('[data-testid^="card-"]').length === 5)
  })

  it('searches by word', async () => {
    open('/app/discover')
    await waitFor(() => document.querySelector('[data-testid="discover-grid"]'))
    typeInto(byTestId('discover-search').querySelector('input') ?? byTestId('discover-search'), 'stone')
    await waitFor(() => document.querySelectorAll('[data-testid^="card-"]').length === 1)
    expect(document.querySelector('[data-testid="card-L-Q23X7N"]')).not.toBeNull()
  })
})

describe('shared with you', () => {
  it('asks for the confidentiality terms once per project, then shows the lots', async () => {
    const r = setProjectAccess(getData(), { userId: U.tom, now: NOW }, SALLOW_ID, true)
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    open('/app/discover?tab=shared')
    await waitFor(() => document.querySelector(`[data-testid="review-terms-${SALLOW_ID}"]`))
    expect(document.querySelector(`[data-testid="shared-group-${SALLOW_ID}"] [data-testid^="card-"]`)).toBeNull()
    click(byTestId(`review-terms-${SALLOW_ID}`))
    await waitFor(() => document.querySelector('[data-testid="terms-dialog"]'))
    expect((byTestId('accept-terms') as HTMLButtonElement).disabled).toBe(true)
    click(byTestId('terms-checkbox'))
    await waitFor(() => !(byTestId('accept-terms') as HTMLButtonElement).disabled)
    click(byTestId('accept-terms'))
    await waitFor(() => getData().world.projects[SALLOW_ID].termsAccepted)
    await waitFor(() => document.querySelectorAll(`[data-testid="shared-group-${SALLOW_ID}"] [data-testid^="card-"]`).length > 0)
    const body = document.body.textContent ?? ''
    for (const p of privateStrings()) expect(body, p).not.toContain(p)
  })
})

describe('material page', () => {
  it('shows public fields, the fit and the band, and downloads the DXF', async () => {
    open('/app/discover/L-9F4CQQ')
    await waitFor(() => document.querySelector('[data-testid="material-title"]'))
    expect(byTestId('material-title').textContent).toBe('UB 457x191x67, 7.5 m')
    expect(byTestId('fit-text').textContent).toContain('Merrowgate Wharf')
    expect(byTestId('seller-line').textContent).toBe('Listed by an asset owner in Central London')
    expect(byTestId('bim-family').textContent).toContain('version 2')
    const created = URL.createObjectURL as unknown as ReturnType<typeof vi.fn>
    created.mockClear()
    click(byTestId('download-dxf'))
    expect(created).toHaveBeenCalledTimes(1)
    const blob = created.mock.calls[0][0] as Blob
    expect(await blob.text()).toContain('ENTITIES')
    const body = document.body.textContent ?? ''
    for (const p of privateStrings()) expect(body, p).not.toContain(p)
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('shortlist', () => {
  it('sends a selected material to the client with a message', async () => {
    open(`/app/projects/${MERROWGATE_ID}/shortlist`)
    await waitFor(() => document.querySelector('[data-testid="shortlist-board"]'))
    const pending = projectWishlist(getData().world, MERROWGATE_ID)!.items.find((i) => i.status === 'pending')!
    click(byTestId(`select-${pending.publicId}`))
    await waitFor(() => document.querySelector('[data-testid="selection-bar"]'))
    click(byTestId('send-to-client'))
    await waitFor(() => document.querySelector('[data-testid="send-dialog"]'))
    typeInto(byTestId('send-message'), 'Transfer beams for level 1.')
    click(byTestId('confirm-send'))
    await waitFor(() => projectWishlist(getData().world, MERROWGATE_ID)!.items.find((i) => i.id === pending.id)!.status === 'sent')
    const item = projectWishlist(getData().world, MERROWGATE_ID)!.items.find((i) => i.id === pending.id)!
    expect(item.sentMessage).toBe('Transfer beams for level 1.')
    await waitFor(() => byTestId('column-sent').querySelector(`[data-testid="shortlist-card-${pending.publicId}"]`))
  })
})

describe('specification', () => {
  it('lets the architect edit notes and the client only read', async () => {
    open(`/app/projects/${MERROWGATE_ID}/specification`)
    await waitFor(() => document.querySelector('[data-testid="spec-paper"]'))
    expect(document.querySelector('[data-testid="spec-header-note"]')).not.toBeNull()
    expect(document.querySelectorAll('[data-testid^="clause-L-"]').length).toBe(2)
    cleanup()
    open(`/app/projects/${MERROWGATE_ID}/specification`, U.isla)
    await waitFor(() => document.querySelector('[data-testid="spec-paper"]'))
    expect(document.querySelector('[data-testid="spec-header-note"]')).toBeNull()
    expect(document.querySelectorAll('[data-testid^="clause-L-"]').length).toBe(2)
  })
})
