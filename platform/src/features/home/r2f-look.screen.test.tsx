// @vitest-environment jsdom
// The look follow-up to the recording audit, through the real router: a new project leads the architect home with
// its setup pills and next step, every empty home has a first run with next steps, the client's cards and overview
// say what comes next, the surveyor's buildings are drawn on a phone, and the landing page names the frameworks.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { accessibleName, allText, byTestId, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { PANELS_STORAGE_KEY } from '../../ui'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { createProject, decideClientLink } from '../../store/actions/projects'
import { signUpState } from '../../store/actions/auth'
import { MERROWGATE_ID, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID } from '../../sandbox/seed-owner-surveyor'
import { KILNWORTH_ID } from '../../sandbox/seed-portfolio'
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

describe('a new project on the architect home', () => {
  it('leads the cards, tinted, with its setup and client pills and the next step', async () => {
    const id = corbel()
    open('/app/home', U.priya)
    const card = await waitFor(() => document.querySelector<HTMLElement>(`[data-testid="home-project-${id}"]`))
    expect(document.querySelector('[data-testid^="home-project-"]')).toBe(card)
    expect(card.getAttribute('data-setup')).toBe('true')
    expect(byTestId(`home-setup-pill-${id}`).textContent).toMatch(/^Setting up, \d of \d$/)
    expect(byTestId(`home-link-pill-${id}`).textContent).toBe('Waiting for client')
    const next = byTestId(`home-setup-next-${id}`)
    expect(next.getAttribute('href')).toBe(`/app/projects/${id}`)
    expect(next.textContent).toContain('Next')
    // Nothing shortlisted: the empty fit and progress rows give way to the next step.
    expect(card.textContent).not.toContain('Nothing shortlisted to check yet')
    expect(byTestId('metric-projects').textContent).toContain('3')
    expect(byTestId('metric-projects-setup').textContent).toBe('1 setting up')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it("splits each project's new materials by fit", async () => {
    open('/app/home', U.priya)
    const by = await waitFor(() => document.querySelector(`[data-testid="home-new-fits-by-${MERROWGATE_ID}"]`))
    expect(by.textContent).toMatch(/available now|in time/)
  })
})

describe('first runs', () => {
  it('shows a new practice the Marketplace by category under the welcome', async () => {
    const userId = newAccount('Architect', 'arch')
    open('/app/home', userId)
    await waitFor(() => document.querySelector('[data-testid="architect-welcome"]'))
    const section = byTestId('architect-first-marketplace')
    const links = Array.from(section.querySelectorAll('a[data-testid^="first-category-"]')).map((a) => a.getAttribute('href'))
    expect(links).toEqual(['/app/marketplace?type=structure', '/app/marketplace?type=envelope', '/app/marketplace?type=finishes'])
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('gives a new client one welcome with the steps ahead, and no empty programme or tracking', async () => {
    const userId = newAccount('Developer', 'client')
    open('/app/home', userId)
    const welcome = await waitFor(() => document.querySelector('[data-testid="client-projects-empty"]'))
    expect(welcome.querySelectorAll('ol > li')).toHaveLength(3)
    expect(document.body.textContent!.split('No projects yet')).toHaveLength(2)
    for (const id of ['client-programme', 'sustainability-tracking', 'client-metrics', 'client-todo']) expect(document.querySelector(`[data-testid="${id}"]`), id).toBeNull()
    expect(byTestId('activity-panel')).toBeTruthy()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('gives a new consultant the steps ahead', async () => {
    const userId = newAccount('Sustainability consultant', 'consultant')
    open('/app/home', userId)
    const card = await waitFor(() => document.querySelector('[data-testid="consultant-first-run"]'))
    expect(card.textContent).toContain('No projects yet')
    expect(card.textContent).toContain('Set the goals and targets')
  })
})

describe('the client', () => {
  it('sees swatches and the place on each card, and a pill on a project with nothing shortlisted', async () => {
    open('/app/home', U.isla)
    await waitFor(() => document.querySelector(`[data-testid="client-project-${MERROWGATE_ID}"]`))
    expect(byTestId(`client-project-place-${MERROWGATE_ID}`).textContent).toBe('Office, Newham')
    expect(byTestId(`client-project-status-${KILNWORTH_ID}`).textContent).toBe('Nothing shortlisted yet')
    expect(document.querySelector(`[data-testid="client-project-status-${MERROWGATE_ID}"]`)).toBeNull()
    const img = byTestId(`client-project-${MERROWGATE_ID}`).querySelector('[role="img"]')!
    expect(accessibleName(img)).toBe('Illustration of an office project, drawn from its shortlisted materials and a typical office facade')
  })

  it('reads a new accepted project as being set up, without a trailing comma', async () => {
    const id = corbel()
    useApp.getState().commit(decideClientLink(getData(), { userId: U.isla, now: NOW }, id, 'accepted', '').state)
    open('/app/home', U.isla)
    await waitFor(() => document.querySelector(`[data-testid="client-project-${id}"]`))
    expect(byTestId(`client-project-place-${id}`).textContent).toBe('Residential')
    expect(byTestId(`client-project-status-${id}`).textContent).toBe('Being set up')
  })

  it("is told what comes next on a project's overview with nothing shortlisted", async () => {
    open(`/app/projects/${KILNWORTH_ID}`, U.isla)
    const waiting = await waitFor(() => document.querySelector('[data-testid="next-steps-client-waiting"]'))
    expect(waiting.textContent).toContain('Nothing is shortlisted yet.')
    expect(waiting.textContent).toContain('sends materials to you for approval')
    expect(byTestId('next-steps').textContent).not.toContain('You are up to date on this project.')
  })
})

describe('the surveyor', () => {
  it('draws each building full width for a phone, and an unlinked building starts as added, not appointed', async () => {
    open('/app/home', U.dana)
    const thumb = await waitFor(() => document.querySelector(`[data-testid="home-building-thumb-${TIVERNE_ID}"]`))
    expect(thumb.className).toContain('sm:hidden')
    expect(accessibleName(thumb.querySelector('[role="img"]')!)).toMatch(/^Illustration of a \d+ storey building/)
    const row = byTestId(`home-building-${AMBREY_ID}`)
    const steps = row.querySelector('ol[aria-label="Survey progress"]')!
    expect(steps.querySelector('li')!.textContent).toMatch(/^Added/)
    expect(byTestId(`home-building-${TIVERNE_ID}`).querySelector('ol li')!.textContent).toMatch(/^Appointed/)
  })
})

describe('the landing page', () => {
  it('names the frameworks the product maps to, with the caption, and shows the real sample figures', () => {
    render(<Landing />)
    const row = byTestId('landing-frameworks')
    expect(row.textContent).toContain('Maps to the frameworks you report against')
    for (const n of ['RIBA Plan of Work', 'London Plan', 'BREEAM', 'LEED', 'WELL', 'UK Net Zero Carbon Buildings Standard']) expect(row.textContent).toContain(n)
    expect(row.textContent).toContain('Indicative summaries to check. Not affiliated with or endorsed by these bodies.')
    expect(row.querySelector('img, svg')).toBeNull()
    expect(byTestId('product-shot-greeting').textContent).toBe('Good morning, Priya')
    expect(byTestId('product-shot-shortlisted').textContent).toContain('7')
    expect(byTestId('product-shot-carbon').textContent).toContain('100.8')
    expect(byTestId('product-shot').textContent).toContain('Thursday 8 October 2026')
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})
