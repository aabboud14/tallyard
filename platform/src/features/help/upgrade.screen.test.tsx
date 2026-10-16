// @vitest-environment jsdom
// A returning visitor whose sandbox was replaced: the notice on each home with its link to Help, closing it for
// good, Help, Updated on 16 October with links into the viewer's own workspace, and the sign-in line for an
// account made before the update. No forbidden characters (P6).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, submit, typeInto } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { readKey, removeKey, writeKey } from '../../store/storage'
import { UPGRADE_DISMISSED_KEY, UPGRADED_KEY } from '../../store/upgrade'
import { U } from '../../test/fixtures'
import { routes } from '../../app/router'

const NOW = '2026-10-16T10:00:00.000Z'

beforeAll(() => {
  installDomShims()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

beforeEach(async () => {
  setClockForTests(NOW)
  signOut()
  await useApp.getState().resetSandbox()
})

afterEach(() => {
  cleanup()
  removeKey('local', UPGRADED_KEY)
  removeKey('local', UPGRADE_DISMISSED_KEY)
})
afterAll(() => setClockForTests(null))

async function settle(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

async function waitFor<T>(fn: () => T | null | undefined | false, timeout = 5000): Promise<T> {
  const end = Date.now() + timeout
  for (;;) {
    const v = fn()
    if (v) return v
    if (Date.now() > end) throw new Error('Timed out waiting')
    await settle()
  }
}

const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

function open(path: string, userId: string | null = U.priya) {
  if (userId) setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

describe('the upgrade notice on the home dashboard', () => {
  it('is not shown on a fresh sandbox', async () => {
    open('/app/home')
    await waitFor(() => q('architect-home'))
    expect(q('upgrade-notice')).toBeNull()
  })

  it('shows on every home after an upgrade, links to what changed, and stays closed once closed', async () => {
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    for (const [who, home] of [[U.priya, 'architect-home'], [U.isla, 'client-home'], [U.tom, 'owner-home'], [U.dana, 'surveyor-home'], [U.marcus, 'consultant-home']] as const) {
      open('/app/home', who)
      await waitFor(() => q(home))
      expect(byTestId('upgrade-notice').textContent).toContain('The sandbox was updated on 16 October with the changes from the 14 October review. Anything you changed before then is back to the sample data.')
      expect(byTestId('upgrade-notice-link').getAttribute('href')).toBe('/app/help/updated')
      expect(allText()).not.toMatch(FORBIDDEN)
      cleanup()
    }
    open('/app/home')
    await waitFor(() => q('upgrade-notice'))
    click(byTestId('upgrade-notice-close'))
    await waitFor(() => !q('upgrade-notice'))
    expect(readKey('local', UPGRADE_DISMISSED_KEY)).toBe('2026-10-16')
    cleanup()
    open('/app/home')
    await waitFor(() => q('architect-home'))
    expect(q('upgrade-notice')).toBeNull()
  })

  it('See what changed opens Help, Updated on 16 October', async () => {
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    const router = open('/app/home')
    await waitFor(() => q('upgrade-notice-link'))
    // A cancelable click, as a browser sends, so the router handles it instead of the document.
    act(() => {
      byTestId('upgrade-notice-link').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })
    await waitFor(() => q('what-changed'))
    expect(router.state.location.pathname).toBe('/app/help/updated')
  })
})

describe('Help, Updated on 16 October', () => {
  it('lists the changes for the viewer with links, then those of the other workspaces', async () => {
    open('/app/help/updated')
    await waitFor(() => q('what-changed'))
    expect(byTestId('help-updated').getAttribute('aria-current')).toBe('page')
    expect(byTestId('what-changed').querySelector('h2')!.textContent).toBe('Updated on 16 October')
    expect(byTestId('change-link-marketplace').getAttribute('href')).toBe('/app/marketplace')
    expect(byTestId('change-link-programme').getAttribute('href')).toMatch(/^\/app\/projects\/prj_/)
    expect(byTestId('changes-others').textContent).toContain('Sharing links')
    expect(byTestId('changes-others').querySelector('a')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('sign-in after an upgrade', () => {
  async function failSignIn(email: string) {
    open('/signin', null)
    await waitFor(() => q('signin-form'))
    typeInto(byTestId('signin-email'), email)
    typeInto(document.querySelector('input[autocomplete="current-password"]')!, 'drawings1')
    submit(byTestId('signin-form'))
    await waitFor(() => document.querySelector('[role="alert"]'))
  }

  it('an account made before the update is explained, with a way to sign up', async () => {
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    await failSignIn('jo@parkstudio.example')
    expect(document.querySelector('[role="alert"]')!.textContent).toContain('That email and password do not match.')
    expect(byTestId('signin-error-hint').textContent).toContain('The sandbox was updated on 16 October. Accounts made before then need to be created again.')
    expect(byTestId('signin-upgrade-signup').getAttribute('href')).toBe('/signup')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('a sample account with a wrong password, or no upgrade, gets the plain message only', async () => {
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    await failSignIn('priya.nair@studiooriel.example')
    expect(q('signin-error-hint')).toBeNull()
    cleanup()
    removeKey('local', UPGRADED_KEY)
    await failSignIn('jo@parkstudio.example')
    expect(q('signin-error-hint')).toBeNull()
  })
})
