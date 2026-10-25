// @vitest-environment jsdom
// The sidebar through the real router: projects by name by default, the project menu's client order with client
// subheadings, the client filter with its chip, the choice kept per person in the store, and each role's round 2
// items (the owner's Donor buildings, the surveyor's Capture, Not yet linked and Add building).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, press, render } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { FERRYMOOR_ID, MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { routes } from '../router'

const NOW = '2026-10-08T10:00:00.000Z'

beforeAll(() => {
  installDomShims()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
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

function open(path: string, userId: string) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

/** The project folders in the sidebar, in order. */
function folders(): string[] {
  return Array.from(byTestId('sidebar').querySelectorAll('[data-testid^="nav-project-prj_"]'))
    .map((a) => a.getAttribute('data-testid')!)
    .filter((id) => /^nav-project-prj_[A-Za-z0-9]+$/.test(id))
    .map((id) => id.replace('nav-project-', ''))
}

async function openMenu() {
  const trigger = byTestId('nav-projects-menu')
  click(trigger)
  if (trigger.getAttribute('aria-expanded') !== 'true') press('Enter', trigger)
  await waitFor(() => document.querySelector('[data-testid="nav-order-client"]'))
}

const clientOf = (projectId: string) => getData().world.projects[projectId].clientOrgId
const nameOf = (orgId: string) => getData().world.orgs[orgId].name

describe('sidebar projects', () => {
  it('lists projects by name, then groups them under each client in client order', async () => {
    open('/app/home', U.priya)
    await waitFor(() => document.querySelector('[data-testid="nav-projects-menu"]'))
    expect(folders()).toEqual([FERRYMOOR_ID, MERROWGATE_ID, SALLOW_ID])
    expect(document.querySelector('[data-testid^="nav-group-"]')).toBeNull()
    expect(byTestId('nav-projects-menu').getAttribute('aria-label')).toBe('Sort and filter projects')
    // The button names the order in words, so the way in shows without a hover.
    expect(byTestId('nav-projects-menu').textContent).toBe('A to Z')

    await openMenu()
    click(byTestId('nav-order-client'))
    await waitFor(() => document.querySelector('[data-testid^="nav-group-"]'))
    const groups = Array.from(document.querySelectorAll('[data-testid^="nav-group-"]')).map((g) => g.textContent)
    const expected = [MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID].map((id) => nameOf(clientOf(id))).sort((a, b) => a.localeCompare(b, 'en-GB'))
    expect(groups).toEqual(expected)
    expect(getData().ui.navProjects?.[U.priya]?.order).toBe('client')
    await waitFor(() => byTestId('nav-projects-menu').textContent === 'By client')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('filters to one client with a chip that clears it, and keeps the choice for the person', async () => {
    open('/app/home', U.priya)
    await waitFor(() => document.querySelector('[data-testid="nav-projects-menu"]'))
    await openMenu()
    const lantern = clientOf(MERROWGATE_ID)
    click(byTestId(`nav-client-${lantern}`))
    await waitFor(() => folders().length === 1)
    expect(folders()).toEqual([MERROWGATE_ID])
    const chip = byTestId('nav-client-filter')
    expect(chip.textContent).toContain(nameOf(lantern))
    expect(chip.textContent).toContain('2 more hidden')

    // A new render reads the choice back from the store.
    cleanup()
    open('/app/home', U.priya)
    await waitFor(() => document.querySelector('[data-testid="nav-client-filter"]'))
    expect(folders()).toEqual([MERROWGATE_ID])

    click(byTestId('nav-client-filter-clear'))
    await waitFor(() => folders().length === 3)
    expect(document.querySelector('[data-testid="nav-client-filter"]')).toBeNull()
    expect(getData().ui.navProjects?.[U.priya]?.clientOrgId).toBeNull()
  })
})

describe('sidebar folders', () => {
  const expandButton = (name: string) => byTestId('sidebar').querySelector<HTMLButtonElement>(`button[aria-label="Expand ${name}"], button[aria-label="Collapse ${name}"]`)!

  it('opens the folder of the project shown, closes it on moving on, and keeps one the person opened', async () => {
    sessionStorage.clear()
    const router = open(`/app/projects/${MERROWGATE_ID}`, U.priya)
    await waitFor(() => document.querySelector(`[data-testid="nav-project-${MERROWGATE_ID}"]`))
    expect(expandButton('Merrowgate Wharf').getAttribute('aria-expanded')).toBe('true')
    await act(async () => {
      await router.navigate(`/app/projects/${FERRYMOOR_ID}`)
    })
    await waitFor(() => expandButton('Merrowgate Wharf').getAttribute('aria-expanded') === 'false')
    expect(expandButton('Ferrymoor Yard').getAttribute('aria-expanded')).toBe('true')
    // The person opens Sallow Court by hand: it stays open wherever they go.
    click(expandButton('Sallow Court'))
    await act(async () => {
      await router.navigate('/app/home')
    })
    await waitFor(() => expandButton('Ferrymoor Yard').getAttribute('aria-expanded') === 'false')
    expect(expandButton('Sallow Court').getAttribute('aria-expanded')).toBe('true')
    expect(byTestId('sidebar').querySelectorAll('button[aria-expanded="true"]')).toHaveLength(1)
  })
})

describe('round 2 nav items', () => {
  it('gives the donor building owner Donor buildings, Add building and Requests with a badge', async () => {
    open('/app/home', U.tom)
    await waitFor(() => document.querySelector('[data-testid="owner-home"]'))
    const sidebar = byTestId('sidebar')
    expect(sidebar.textContent).toContain('Donor buildings')
    expect(byTestId('nav-new-building').getAttribute('href')).toBe('/app/buildings?new=1')
    expect(byTestId('nav-requests').textContent).toContain('2')
    expect(sidebar.querySelector('[data-testid="nav-projects-menu"]')).toBeNull()
  })

  it('gives the surveyor Capture, the Not yet linked folder and Add building', async () => {
    open('/app/home', U.dana)
    await waitFor(() => document.querySelector('[data-testid="surveyor-home"]'))
    expect(byTestId('nav-capture').getAttribute('href')).toBe('/app/capture')
    expect(byTestId('nav-client-unlinked').textContent).toContain('Not yet linked')
    expect(byTestId('nav-new-building').textContent).toContain('Add building')
  })
})
