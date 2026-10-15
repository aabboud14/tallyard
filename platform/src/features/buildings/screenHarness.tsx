// The screen tests' harness for the building, capture, link and request screens: a fresh sandbox at a fixed time,
// the real router for a signed-in person, and waiting for the page to settle. Imported by tests only.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { routes } from '../../app/router'

export const NOW = '2026-10-08T10:00:00.000Z'

/** Registers the hooks every screen test file needs: DOM shims, a fixed clock and a fresh sandbox per test. */
export function setupScreenHarness(): void {
  beforeAll(() => {
    installDomShims()
    const u = URL as unknown as Record<string, unknown>
    u.createObjectURL = vi.fn(() => 'blob:test')
    u.revokeObjectURL = vi.fn()
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  })
  beforeEach(async () => {
    setClockForTests(NOW)
    signOut()
    await useApp.getState().resetSandbox()
  })
  afterEach(() => cleanup())
  afterAll(() => setClockForTests(null))
}

export async function settle(ms = 30): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

export async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 5000): Promise<T> {
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

export function openAs(path: string, userId: string) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

export function q<T extends Element = HTMLElement>(testId: string): T | null {
  return document.querySelector<T>(`[data-testid="${testId}"]`)
}

/** No forbidden characters (P6) and no demo wording (P1) anywhere on the page. */
export function expectClean(): void {
  const text = allText()
  expect(text).not.toMatch(FORBIDDEN)
  expect(text.toLowerCase()).not.toContain('prototype')
  expect(text).not.toContain('This page is being built')
}

/** Picks an option in a native select. */
export function chooseOption(el: Element, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
