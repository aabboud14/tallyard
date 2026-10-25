// @vitest-environment jsdom
// Saved: the practice's materials with no project yet, each with Move to project, and a way back to the Marketplace.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { U } from '../../test/fixtures'
import { routes } from '../../app/router'

beforeAll(() => {
  installDomShims()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(async () => {
  setClockForTests('2026-10-08T10:00:00.000Z')
  signOut()
  await useApp.getState().resetSandbox()
})

afterEach(() => cleanup())
afterAll(() => setClockForTests(null))

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 4000): Promise<T> {
  const end = Date.now() + timeout
  for (;;) {
    const v = fn()
    if (v) return v
    if (Date.now() > end) throw new Error('Timed out waiting')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
  }
}

describe('Saved', () => {
  it('lists saved materials with Move to project and a way back to the Marketplace', async () => {
    setSessionUserId(U.priya, false)
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/app/saved'] })} />, { router: false })
    const grid = await waitFor(() => document.querySelector('[data-testid="saved-grid"]'))
    expect(grid.querySelectorAll('[data-testid^="card-"]').length).toBeGreaterThan(0)
    expect(grid.querySelector('[data-testid^="move-"]')).not.toBeNull()
    expect(byTestId('saved-more').querySelector('a')!.getAttribute('href')).toBe('/app/marketplace')
    expect(byTestId('saved-more').textContent).toContain('Browse the Marketplace')
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})
