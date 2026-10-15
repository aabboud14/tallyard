// @vitest-environment jsdom
// The Marketplace screens through the real router (feedback/r2-design/marketplace-material.md section 11): the
// category folders and their history entry, family chips, New for your projects, the checking strip with its fit
// counts, switch, change and clear, the availability month slider, and the sort each role is offered. Nothing
// private reaches the screen (P3) and no forbidden character does (P6).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import { FERRYMOOR_ID, MERROWGATE_ID } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { routes } from '../../app/router'

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

function open(path: string, userId: string = U.priya) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

const gridCards = () => document.querySelectorAll('[data-testid="discover-grid"] [data-testid^="card-"]').length

function privateStrings(): string[] {
  const s = getData()
  const out = new Set<string>()
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) if (x.length >= 4) out.add(x)
  }
  return [...out]
}

function expectClean() {
  expect(allText()).not.toMatch(FORBIDDEN)
  const body = document.body.textContent ?? ''
  for (const p of privateStrings()) expect(body, p).not.toContain(p)
}

describe('Marketplace landing', () => {
  it('opens on three category folders, New for your projects and every material, checked against no project', async () => {
    open('/app/marketplace')
    await waitFor(() => document.querySelector('[data-testid="discover-grid"]'))
    expect(byTestId('category-structure').textContent).toContain('11 materials')
    expect(byTestId('category-envelope').textContent).toContain('5 materials')
    expect(byTestId('category-finishes').textContent).toContain('1 material')
    expect(byTestId('category-structure').getAttribute('aria-label')).toBe('Open Structure, 11 materials')
    expect(byTestId('category-envelope').textContent).toContain('Curtain wall panel, Precast cladding panel, Stone cladding, Clay brick')
    expect(gridCards()).toBe(17)
    expect(byTestId('checking-bar').textContent).toContain('Check materials against a project')
    expect(byTestId('checking-bar').getAttribute('data-state')).toBe('prompt')
    // New for your projects: newest first, captioned with the projects it is in time for.
    const feed = byTestId('new-for-projects')
    expect(feed.textContent).toContain('New for your projects')
    expect(feed.querySelector('[data-testid^="new-card-"]')!.getAttribute('data-testid')).toBe('new-card-L-9F4CQQ')
    expect(byTestId('new-for-L-9F4CQQ').textContent).toMatch(/^In time for /)
    expect(feed.querySelectorAll('[data-testid^="new-card-"]').length).toBeLessThanOrEqual(4)
    // Cards read availability as an approximate date, never a quarter.
    expect(byTestId('card-L-9F4CQQ').textContent).toContain('Expected Jan to Mar 2027')
    expect(document.querySelector('[data-testid="discover-grid"]')!.textContent).not.toMatch(/Q[1-4] 20\d\d/)
    expectClean()
  })

  it('opens a folder as a history entry, with family chips as sub-folders, and Back returns to the folders', async () => {
    const router = open('/app/marketplace')
    await waitFor(() => document.querySelector('[data-testid="category-envelope"]'))
    click(byTestId('category-envelope'))
    await waitFor(() => router.state.location.search.includes('type=envelope'))
    expect(router.state.historyAction).toBe('PUSH')
    await waitFor(() => gridCards() === 5)
    expect(byTestId('folder-header').textContent).toContain('Envelope')
    expect(document.querySelector('[data-testid="category-folders"]')).toBeNull()
    expect(document.querySelector('[data-testid="new-for-projects"]')).toBeNull()
    expect(byTestId('family-chip-all').getAttribute('aria-pressed')).toBe('true')
    click(byTestId('family-chip-clay_brick'))
    await waitFor(() => router.state.location.search.includes('family=clay_brick'))
    await waitFor(() => gridCards() === 2)
    expect(byTestId('family-chip-clay_brick').getAttribute('aria-pressed')).toBe('true')
    click(byTestId('family-chip-clay_brick'))
    await waitFor(() => !router.state.location.search.includes('family='))
    await act(async () => {
      await router.navigate(-1)
    })
    await waitFor(() => document.querySelector('[data-testid="category-folders"]'))
    expect(router.state.location.search).toBe('')
  })

  it('goes back to every category from a folder', async () => {
    const router = open('/app/marketplace?type=structure')
    await waitFor(() => document.querySelector('[data-testid="folder-header"]'))
    expect(byTestId('family-chip-steel_section').textContent).toContain('10')
    click(byTestId('all-categories'))
    await waitFor(() => !router.state.location.search.includes('type='))
    await waitFor(() => document.querySelector('[data-testid="category-folders"]'))
  })
})

describe('checking strip', () => {
  it('checks every card against the project chosen in the strip, with fit counts', async () => {
    open('/app/marketplace')
    await waitFor(() => document.querySelector('[data-testid="checking-choose"]'))
    click(byTestId('checking-choose'))
    await waitFor(() => document.querySelector(`[data-testid="pick-${MERROWGATE_ID}"]`))
    click(byTestId(`pick-${MERROWGATE_ID}`))
    await waitFor(() => byTestId('checking-bar').getAttribute('data-state') === 'checking')
    const bar = byTestId('checking-bar')
    expect(bar.textContent).toContain('Checking against Merrowgate Wharf')
    expect(bar.textContent).toContain('Materials needed from 4 April 2028')
    expect(byTestId('fit-summary').textContent).toContain('10 available now')
    expect(byTestId('fit-summary').textContent).toContain('7 in time')
    expect(byTestId('fit-summary').textContent).not.toContain('tight')
    expect(getData().ui.checkingProjectId[U.priya]).toBe(MERROWGATE_ID)
    expect(byTestId('category-structure').textContent).toContain('11 in time for Merrowgate Wharf')
    expect(byTestId('new-for-projects').textContent).toContain('New for Merrowgate Wharf')
    expect(byTestId('card-L-9F4CQQ').querySelector('[data-fit]')!.getAttribute('data-fit')).toBe('in_time')
    expectClean()
  })

  it('only shows what arrives in time, and stops checking from the strip', async () => {
    const router = open(`/app/marketplace?project=${FERRYMOOR_ID}`)
    await waitFor(() => byTestId('checking-bar').getAttribute('data-state') === 'checking')
    expect(byTestId('fit-summary').textContent).toContain('1 tight')
    click(byTestId('fits-only'))
    await waitFor(() => router.state.location.search.includes('fits=1'))
    expect(byTestId('active-filters').textContent).toContain('In time for Ferrymoor Yard')
    click(byTestId('checking-clear'))
    await waitFor(() => byTestId('checking-bar').getAttribute('data-state') === 'prompt')
    expect(getData().ui.checkingProjectId[U.priya] ?? null).toBeNull()
    expect(router.state.location.search).not.toContain('project=')
    expect(document.querySelector('[data-testid="discover-grid"] [data-fit]')).toBeNull()
  })

  it('shows a client the prompt without the architect feed', async () => {
    open('/app/marketplace', U.isla)
    await waitFor(() => document.querySelector('[data-testid="checking-bar"]'))
    expect(byTestId('checking-bar').textContent).not.toContain('New project')
    expect(document.querySelector('[data-testid="new-for-projects"]')).toBeNull()
  })
})

describe('filters and sort', () => {
  it('filters by month with the availability slider', async () => {
    const router = open('/app/marketplace')
    await waitFor(() => document.querySelector('[data-testid="discover-grid"]'))
    click(byTestId('filters-button'))
    const slider = await waitFor(() => document.querySelector<HTMLInputElement>('[data-testid="availability-slider"]'))
    expect(slider.getAttribute('aria-valuetext')).toBe('Any time')
    expect(byTestId('availability-count').textContent).toBe('17 of 17 materials')
    expect(document.querySelectorAll('[data-testid="filter-availability"] rect[data-part="bar"]').length).toBe(Number(slider.max) + 1)
    typeInto(slider, '3')
    await waitFor(() => router.state.location.search.includes('by=2027-01-31'))
    await waitFor(() => gridCards() === 16)
    await waitFor(() => byTestId('availability-selected').textContent === 'By the end of January 2027')
    expect(byTestId('availability-count').textContent).toBe('16 of 17 materials')
    expect(byTestId('active-filters').textContent).toContain('By the end of January 2027')
    typeInto(document.querySelector<HTMLInputElement>('[data-testid="availability-slider"]')!, '0')
    await waitFor(() => /by=\d{4}-\d{2}-\d{2}/.test(router.state.location.search) && !router.state.location.search.includes('2027-01-31'))
    await waitFor(() => byTestId('availability-selected').textContent === 'Available now')
    expectClean()
  })

  it('marks the checked project start on the slider', async () => {
    open(`/app/marketplace?project=${FERRYMOOR_ID}`)
    await waitFor(() => document.querySelector('[data-testid="discover-grid"]'))
    click(byTestId('filters-button'))
    await waitFor(() => document.querySelector('[data-testid="availability-project-marker"]'))
    expect(byTestId('filter-availability').textContent).toContain('Ferrymoor Yard start')
  })

  it('offers the price sort to clients only', async () => {
    open('/app/marketplace')
    await waitFor(() => document.querySelector('[data-testid="sort-menu"]'))
    click(byTestId('sort-menu'))
    await waitFor(() => document.querySelector('[role="menuitemradio"]'))
    const priya = Array.from(document.querySelectorAll('[role="menuitemradio"]')).map((e) => e.textContent)
    expect(priya).toEqual(['Newest listed', 'Most carbon avoided'])
    cleanup()
    open('/app/marketplace', U.isla)
    await waitFor(() => document.querySelector('[data-testid="sort-menu"]'))
    click(byTestId('sort-menu'))
    await waitFor(() => document.querySelector('[role="menuitemradio"]'))
    const isla = Array.from(document.querySelectorAll('[role="menuitemradio"]')).map((e) => e.textContent ?? '')
    expect(isla.some((t) => t.startsWith('Lowest guide price'))).toBe(true)
  })
})
