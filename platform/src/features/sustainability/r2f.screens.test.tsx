// @vitest-environment jsdom
// Round 2 follow-up (audit of 16 October 2026, package client_consultant), through the real router: the developer's
// tracking for a project with no consultant, the consultant's own Overview and Projects list, the statement's lists
// and its frozen copy, the consultant's project requests, and the client invite on the overview. Each renders cleanly (P6).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../../ui/testing'
import { must, actor } from '../../test/fixtures'
import { createProject, decideClientLink } from '../../store/actions/projects'
import { setGoalTarget } from '../../store/actions/sustainability'
import { ORG_IDS } from '../../domain/seed/world'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { routes } from '../../app/router'

const NOW = '2026-10-08T10:00:00.000Z'
const M = MERROWGATE_ID
const K = 'prj_w7kq2m'

beforeAll(() => {
  installDomShims()
  const u = URL as unknown as Record<string, unknown>
  u.createObjectURL = vi.fn(() => 'blob:test')
  u.revokeObjectURL = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
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

const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

async function page(path: string, userId: string, testId: string) {
  const router = open(path, userId)
  await waitFor(() => q(testId))
  await settle()
  return router
}

function expectClean() {
  const text = allText()
  expect(text).not.toMatch(FORBIDDEN)
  expect(text.toLowerCase()).not.toContain('prototype')
  expect(text).not.toContain('This page is being built')
}

/** The text of the page body, without the project header and sidebar. */
function mainText(): string {
  return document.querySelector('main')?.textContent ?? ''
}

/** Runs a pure action on the live store, as a person, before a page opens. */
function apply<V>(fn: (s: ReturnType<typeof getData>) => { state: ReturnType<typeof getData>; value: V }): V {
  const r = fn(getData())
  act(() => useApp.getState().commit(r.state))
  return r.value
}

describe('the developer tracking (note 36)', () => {
  it('shows Kilnworth Place every scheme column, with a no consultant line under its name, and states against target', async () => {
    await page('/app/home', U.isla, 'client-home')
    const k = byTestId(`tracking-${K}`)
    expect(k.textContent).toContain('No consultant appointed yet')
    expect(k.textContent).not.toContain('Defaults from the requirements are shown')
    expect(k.textContent!.match(/Not targeted/g)).toHaveLength(3)
    const m = byTestId(`tracking-${M}`)
    expect(m.textContent).toContain('Near target')
    expect(m.textContent).toContain('On target')
    expectClean()
  })
})

describe("the consultant's own pages (note 42)", () => {
  it('opens the Overview on the targets, the statement and certification, without the approval counts', async () => {
    await page(`/app/projects/${M}`, U.marcus, 'consultant-overview')
    const o = byTestId('consultant-overview')
    expect(o.textContent).toContain('With the client for review')
    expect(o.querySelector('[data-testid="sus-metric-content"]')).not.toBeNull()
    expect(o.querySelector('[data-testid="scheme-breeam"]')).not.toBeNull()
    expect(q('overview-shortlist')).toBeNull()
    expect(mainText()).not.toContain('waiting for approval')
    expect(mainText()).not.toContain('£')
    expectClean()
  })

  it('lists each project against its targets with the statement and the requirements at risk', async () => {
    await page('/app/projects', U.marcus, 'projects-list')
    const s = byTestId(`consultant-summary-${M}`)
    expect(s.textContent).toContain('19.9%')
    expect(s.textContent).toContain('Off target')
    expect(s.textContent).toContain('Statement: with the client for review')
    expect(s.textContent).toContain('1 at risk')
    expect(mainText()).not.toContain('Waiting for approval')
    expectClean()
  })

  it('names the consultant home meters as Goals and targets does', async () => {
    await page('/app/home', U.marcus, 'consultant-home')
    const card = byTestId(`consultant-project-${M}`)
    expect(card.textContent).toContain('Reused and recycled content by value')
    expect(card.textContent).toContain('Upfront carbon avoided by reuse')
    expect(byTestId('metric-carbon').textContent).toContain('47.8')
    expectClean()
  })
})

describe('the statement (note 44)', () => {
  it('draws list lines as lists, and tells the consultant and the client when the figures have moved on', async () => {
    await page(`/app/projects/${M}/statement`, U.marcus, 'statement-page')
    expect(byTestId('statement-section-reuse').querySelectorAll('ul li').length).toBeGreaterThanOrEqual(3)
    expect(byTestId('statement-section-next_steps').querySelector('ul')).not.toBeNull()
    expect(q('statement-changed')).toBeNull()
    cleanup()
    apply((s) => must(setGoalTarget(s, actor(U.marcus, NOW), M, 'content_by_value', 0.3, '')))
    await page(`/app/projects/${M}/statement`, U.marcus, 'statement-page')
    // Round 2 follow-up review: the title says it changed; the body gives the long date and what to do.
    expect(byTestId('statement-changed').textContent).toContain('Changed since you sent it')
    expect(byTestId('statement-changed').textContent).toContain('Sent on 7 October 2026. Send the updated statement')
    expect(byTestId('statement-send').textContent).toBe('Send the updated statement')
    expect((byTestId('statement-send') as HTMLButtonElement).disabled).toBe(false)
    cleanup()
    await page(`/app/projects/${M}/sustainability`, U.isla, 'statement-card')
    click(byTestId('statement-review'))
    const dialog = await waitFor(() => q('statement-review-dialog'))
    expect(dialog.textContent).toContain('This is the version sent on')
    expect(dialog.textContent).toContain('this project targets at least 25%')
    expectClean()
  })
})

describe('consent and invites (notes C2 and C3)', () => {
  it("gives the consultancy a request to answer once the client accepts, and points the project's address to it", async () => {
    const id = apply((s) => must(createProject(s, actor(U.priya, NOW), { name: 'Tamsin Wharf', client: { orgId: ORG_IDS.lantern }, projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', consultantOrgId: ORG_IDS.halewick })))
    apply((s) => must(decideClientLink(s, actor(U.isla, NOW), id, 'accepted', '')))
    await page(`/app/projects/${id}`, U.marcus, 'no-access')
    expect(byTestId('no-access').textContent).toContain('Accept Tamsin Wharf to open it')
    cleanup()
    await page('/app/projects/requests', U.marcus, 'link-requests')
    const card = byTestId(`link-request-${id}`)
    expect(card.textContent).toContain('Studio Oriel wants to add you as sustainability consultant')
    expect(card.textContent).toContain('Lantern Quay Developments')
    click(byTestId(`accept-link-${id}`))
    await settle()
    expect(getData().world.projects[id].consultantLink!.status).toBe('accepted')
    expectClean()
  })

  // Round 2 follow-up review: the open sign-up page names nothing; the invite link names the project.
  it('keeps names off the open sign-up page and gives them on the invite link', async () => {
    const id = apply((s) => must(createProject(s, actor(U.priya, NOW), { name: 'Pellow Row', client: { name: 'Harrowgate Homes' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null, clientEmail: 'ada.quist@harrowgate.example' })))
    signOut()
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/signup'] })} />, { router: false })
    typeInto(await waitFor(() => q('signup-name')), 'Ada Quist')
    typeInto(byTestId('signup-email'), 'ada.quist@harrowgate.example')
    typeInto(document.querySelector<HTMLInputElement>('input[type=password]')!, 'sandbox-pass')
    click(byTestId('signup-continue'))
    const join = await waitFor(() => q('signup-join'))
    await settle()
    const page1 = allText()
    expect(join.textContent).toContain('Join')
    for (const name of ['Harrowgate Homes', 'Pellow Row', 'Studio Oriel', 'Priya Nair']) expect(page1, name).not.toContain(name)
    expect(page1).toContain('Open the link you were sent to see who invited you')
    expectClean()
    cleanup()

    const token = Object.values(getData().invites).find((i) => i.projectId === id && i.status === 'pending')!.token
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [`/invite/${token}`] })} />, { router: false })
    const text = await waitFor(() => q('invite-text'))
    expect(text.textContent).toBe('Studio Oriel asked Harrowgate Homes to accept Pellow Row, and invited this email to answer. Your account joins Harrowgate Homes as its first member, and the request waits on your home.')
    expectClean()
  })

  it('lets the architect invite a contact at a new client from the overview', async () => {
    const id = apply((s) => must(createProject(s, actor(U.priya, NOW), { name: 'Pellow Row', client: { name: 'Harrowgate Homes' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null })))
    await page(`/app/projects/${id}`, U.priya, 'project-overview')
    const form = await waitFor(() => q('client-invite-form'))
    typeInto(form.querySelector('input')!, 'ada.quist@harrowgate.example')
    click(byTestId('client-invite-send'))
    const sent = await waitFor(() => q('client-invite-sent'))
    expect(sent.textContent).toContain('Invite sent to ada.quist@harrowgate.example')
    expect(q('client-invite-copy')).not.toBeNull()
    expect(q('client-invite-resend')).not.toBeNull()
    expectClean()
  })
})
