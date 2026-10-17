// @vitest-environment jsdom
// The last polish before the platform goes back to the partner (feedback/r2f-polish.md), through the real router:
// the consultant's overview leads with his own section, an owner's New project leads with its programme, the new
// project pill reads alike on the home and in the list, the Kilnworth statement card, the contractor-only home and
// Appointments, the Help topics, and a tooltip that does not open on the focus a tap leaves behind.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { Tooltip } from '../../ui'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { createProject } from '../../store/actions/projects'
import { createOwnerProject } from '../../store/actions/owner'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { FENNICK_ID } from '../../sandbox/seed-owner-surveyor'
import { KILNWORTH_ID } from '../../sandbox/seed-portfolio'
import { addTestUser, U } from '../../test/fixtures'
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

const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

function open(path: string, userId: string) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}

/** True when a comes before b in the document. */
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe("the project overview's leading blocks", () => {
  it("leads Marcus's overview with his own section, then the programme (note 42)", async () => {
    open(`/app/projects/${MERROWGATE_ID}`, U.marcus)
    const own = await waitFor(() => q('consultant-overview'))
    const programme = await waitFor(() => q('programme-card'))
    expect(before(own, programme)).toBe(true)
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it("keeps the programme first for Priya and Isla (note 19)", async () => {
    for (const who of [U.priya, U.isla]) {
      open(`/app/projects/${MERROWGATE_ID}`, who)
      const programme = await waitFor(() => q('programme-card'))
      expect(q('consultant-overview')).toBeNull()
      expect(document.querySelector('[data-testid="project-overview"] [data-testid]')).toBe(programme)
      cleanup()
    }
  })

  it("puts Tom's programme above the appoint card on his New project with no architect (note 19)", async () => {
    const r = createOwnerProject(getData(), { userId: U.tom, now: NOW }, { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: null })
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    open(`/app/projects/${r.value}`, U.tom)
    const appoint = await waitFor(() => q('appoint-architect-card'))
    const programme = byTestId('programme-card')
    expect(before(programme, appoint)).toBe(true)
  })
})

describe('the new project pill (note 6)', () => {
  it('reads Client to accept, neutral, with the invitation icon, on the home card as in the list', async () => {
    const r = createProject(getData(), { userId: U.priya, now: NOW }, { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: '', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null })
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    const id = r.value!
    open('/app/home', U.priya)
    const home = await waitFor(() => q(`home-link-pill-${id}`))
    const homePill = { text: home.textContent, className: home.className, icon: home.querySelector('svg')!.getAttribute('class') }
    cleanup()
    open('/app/projects', U.priya)
    const list = await waitFor(() => q(`link-pill-${id}`))
    expect(homePill.text).toBe('Client to accept')
    expect(list.textContent).toBe(homePill.text)
    expect(list.className).toBe(homePill.className)
    expect(list.querySelector('svg')!.getAttribute('class')).toBe(homePill.icon)
    expect(homePill.icon).toContain('lucide-mail-question')
  })
})

describe('the statement card on a project with no consultant (copy)', () => {
  it("tells Isla on Kilnworth Place that no consultant is on the project, and promises no draft", async () => {
    open(`/app/projects/${KILNWORTH_ID}/sustainability`, U.isla)
    const card = await waitFor(() => q('statement-card'))
    expect(card.textContent).toContain('No sustainability consultant is on this project yet')
    expect(card.textContent).not.toContain('The consultant is drafting it')
  })
})

describe('a contractor-only firm (note 12)', () => {
  function lee(): string {
    const { state, userId } = addTestUser(getData(), { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    useApp.getState().commit(state)
    return userId
  }

  it('has no Add building or Capture on its home or in its sidebar', async () => {
    open('/app/home', lee())
    await waitFor(() => q('surveyor-home'))
    expect(q('home-add-building')).toBeNull()
    expect(q('home-capture')).toBeNull()
    expect(q('nav-new-building')).toBeNull()
    expect(document.querySelector('a[href="/app/buildings?new=1"]')).toBeNull()
  })

  it('is offered it on Appointments with a word on what it is for', async () => {
    open('/app/buildings', lee())
    const add = await waitFor(() => q('add-building'))
    expect(add.textContent).toBe('Add a building to survey')
    expect(byTestId('buildings').textContent).toContain('To survey a building yourself, add it and capture what it holds.')
  })

  it('leaves Dana her Add building and Capture', async () => {
    open('/app/home', U.dana)
    await waitFor(() => q('surveyor-home'))
    expect(q('home-add-building')).not.toBeNull()
    expect(q('home-capture')).not.toBeNull()
    expect(q('nav-new-building')).not.toBeNull()
  })
})

describe('the Help topics (note 16)', () => {
  it('wrap rather than scroll sideways, so no topic is ever cut off', async () => {
    open('/app/help/updated', U.priya)
    const nav = await waitFor(() => document.querySelector('nav[aria-label="Help topics"]'))
    expect(nav.className).not.toContain('overflow-x-auto')
    expect(nav.querySelector('ul')!.className).toContain('flex-wrap')
    expect(byTestId('help-updated').getAttribute('aria-current')).toBe('page')
  })
})

describe('Tooltip on touch (note 15)', () => {
  function pointer(type: string, pointerType: string): Event {
    const e = new MouseEvent(type, { bubbles: true, button: 0 })
    Object.defineProperty(e, 'pointerType', { value: pointerType })
    return e
  }

  it('does not open on the focus a tap leaves behind, and still opens from the keyboard', async () => {
    render(
      <Tooltip content="Sort and filter projects" delay={0}>
        <button type="button">Sort</button>
      </Tooltip>,
    )
    const button = document.querySelector('button')!
    act(() => {
      button.dispatchEvent(pointer('pointerdown', 'touch'))
      document.dispatchEvent(pointer('pointerup', 'touch'))
    })
    // A menu the button opened hands focus back to it when it closes.
    act(() => button.blur())
    act(() => button.focus())
    await settle()
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
    act(() => button.blur())
    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      button.focus()
    })
    await waitFor(() => document.querySelector('[role="tooltip"]'))
    expect(document.querySelector('[role="tooltip"]')!.textContent).toBe('Sort and filter projects')
  })
})

