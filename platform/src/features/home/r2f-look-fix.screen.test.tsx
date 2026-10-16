// @vitest-environment jsdom
// The second pass on the look follow-up, through the real router: a new surveyor, owner and consultant open on a
// first run with next steps instead of zero tiles, the architect home names a project with nothing shortlisted
// instead of a 0.0 of 0.0 bar and says what is new for each project, the Marketplace now row has no blank cells,
// the client is told who acts next while materials are pending with the architect, and the landing shot shows the
// tile states the app shows.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { PANELS_STORAGE_KEY } from '../../ui'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { createProject, decideClientLink } from '../../store/actions/projects'
import { saveToProject } from '../../store/actions/shortlist'
import { marketplaceListings } from '../../store/lots'
import { signUpState } from '../../store/actions/auth'
import { MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { routes } from '../../app/router'
import { Landing } from '../public/Landing'

const NOW = '2026-10-08T10:00:00.000Z'

beforeAll(() => {
  installDomShims()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(async () => {
  setClockForTests(NOW)
  signOut()
  try {
    window.localStorage.removeItem(PANELS_STORAGE_KEY)
  } catch {
    // no storage: panels start closed anyway
  }
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

function open(path: string, userId: string) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

function corbel(): string {
  const r = createProject(getData(), { userId: U.priya, now: NOW }, { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: '', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: ORG_IDS.halewick })
  expect(r.error).toBeNull()
  useApp.getState().commit(r.state)
  return r.value!
}

function newAccount(orgType: string, label: string): string {
  const r = signUpState(getData(), { name: 'Rowan Hale', email: `rowan.${label}@newco.example`, orgName: 'Newco', orgType, salt: 's', passwordHash: 'h', now: NOW })
  expect(r.error).toBeNull()
  useApp.getState().commit(r.state)
  return r.value!
}

describe('first runs on every role', () => {
  it('opens a new surveying firm on its first steps, with no zero tiles or empty donut', async () => {
    const userId = newAccount('Surveying or deconstruction firm', 'surv')
    open('/app/home', userId)
    const card = await waitFor(() => document.querySelector('[data-testid="surveyor-first-run"]'))
    expect(card.textContent).toContain('No appointments yet')
    expect(card.querySelectorAll('ol > li')).toHaveLength(3)
    expect(card.querySelector('a[href="/app/buildings?new=1"]')!.textContent).toBe('Add building')
    expect(document.querySelector('[data-testid="home-stats"]')).toBeNull()
    expect(allText()).not.toContain('Every survey submitted')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('opens a new owner on its first steps, with no zero tiles, empty rings or empty sections', async () => {
    const userId = newAccount('Asset owner', 'own')
    open('/app/home', userId)
    const card = await waitFor(() => document.querySelector('[data-testid="owner-first-run"]'))
    expect(card.textContent).toContain('Add your first building')
    expect(card.querySelectorAll('ol > li')).toHaveLength(3)
    expect(document.querySelector('[data-testid="home-stats"]')).toBeNull()
    expect(document.getElementById('waiting-title')).toBeNull()
    expect(document.querySelector('[data-testid="new-projects-empty"]')).toBeNull()
    expect(byTestId('activity-panel')).toBeTruthy()
  })

  it('opens a new consultancy on its steps, with no Targets met 0 of 0 tile', async () => {
    const userId = newAccount('Sustainability consultant', 'cons')
    open('/app/home', userId)
    await waitFor(() => document.querySelector('[data-testid="consultant-first-run"]'))
    expect(document.querySelector('[data-testid="home-stats"]')).toBeNull()
    expect(allText()).not.toContain('0 of 0')
  })

  it('keeps the four tiles for the sample surveyor, owner and consultant', async () => {
    for (const who of [U.dana, U.tom, U.marcus]) {
      open('/app/home', who)
      const grid = await waitFor(() => document.querySelector('[data-testid="home-stats"]'))
      expect(grid.querySelectorAll('[data-testid^="metric-"]').length).toBe(4)
      cleanup()
    }
  })

  it("lays a new practice's Marketplace categories out by how many drawings each has, with no blank cells", async () => {
    const userId = newAccount('Architect', 'arch')
    open('/app/home', userId)
    const section = await waitFor(() => document.querySelector('[data-testid="architect-first-marketplace"]'))
    const layout = (t: string) => section.querySelector(`[data-testid="first-category-${t}"] [data-layout]`)!
    expect(layout('structure').getAttribute('data-layout')).toBe('three')
    const finishes = layout('finishes')
    expect(finishes.getAttribute('data-layout')).toBe('one')
    expect(finishes.querySelectorAll('[data-kind="illustration"]')).toHaveLength(1)
    expect(finishes.querySelector('span.bg-paper')).toBeNull()
  })
})

describe('the architect home', () => {
  it('names a project with nothing shortlisted under Carbon by project, without a bar for it', async () => {
    const id = corbel()
    open('/app/home', U.priya)
    const carbon = await waitFor(() => document.querySelector('[data-testid="carbon-by-project"]'))
    expect(byTestId('carbon-not-yet').textContent).toBe('Nothing shortlisted yet on Corbel Yard.')
    expect(carbon.textContent).not.toContain('0.0 of 0.0')
    expect(carbon.textContent!.split('Corbel Yard')).toHaveLength(2)
    expect(document.querySelector(`[data-testid="home-project-${id}"]`)).not.toBeNull()
  })

  it("says how many of each project's new materials are like its shortlist", async () => {
    open('/app/home', U.priya)
    const by = await waitFor(() => document.querySelector(`[data-testid="home-new-fits-by-${MERROWGATE_ID}"]`))
    expect(by.textContent).toMatch(/^\d+ like your shortlist, /)
  })
})

describe('the client while the architect is shortlisting', () => {
  it('reads Shortlisting under way on the card, shows no swatch of an unsent material, and says who acts next', async () => {
    const id = corbel()
    useApp.getState().commit(decideClientLink(getData(), { userId: U.isla, now: NOW }, id, 'accepted', '').state)
    const publicId = marketplaceListings(getData())[0].publicId
    const saved = saveToProject(getData(), { userId: U.priya, now: NOW }, publicId, id)
    expect(saved.error).toBeNull()
    useApp.getState().commit(saved.state)
    open('/app/home', U.isla)
    await waitFor(() => document.querySelector(`[data-testid="client-project-${id}"]`))
    expect(byTestId(`client-project-status-${id}`).textContent).toBe('Shortlisting under way')
    expect(byTestId(`client-project-${id}`).querySelectorAll('[data-family]')).toHaveLength(0)
    cleanup()
    open(`/app/projects/${id}`, U.isla)
    const waiting = await waitFor(() => document.querySelector('[data-testid="next-steps-client-waiting"]'))
    expect(waiting.textContent).toContain('Studio Oriel sends materials to you for approval')
  })
})

describe('the landing page', () => {
  it('shows the tile states the app shows: all in time, and the carbon aim', () => {
    render(<Landing />)
    expect(byTestId('product-shot-shortlisted').textContent).toContain('All in time')
    expect(byTestId('product-shot-carbon').textContent).toContain('Off target, aim 150 tCO2e')
  })
})
