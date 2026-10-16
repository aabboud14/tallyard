// @vitest-environment jsdom
// The round 2 dashboards through the real router: four metric tiles on every home, drawn thumbnails with names,
// Recent activity collapsed with a one-line summary, no forbidden characters (P6) and no seller-private string on
// the buying side (P3).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { accessibleName, allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { PANELS_STORAGE_KEY } from '../../ui'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import { MERROWGATE_ID } from '../../domain/seed/world'
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

function privateStrings(): string[] {
  const s = getData()
  const out = new Set<string>()
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) if (x.length >= 4) out.add(x)
  }
  return [...out]
}

const HOMES = [
  { who: 'priya', page: 'architect-home', grid: 'home-stats', prefix: 'metric-', tiles: ['metric-projects', 'metric-shortlisted', 'metric-waiting', 'metric-carbon'] },
  // Audit 16 October, note C6: the owner's Listed tile gives way to Recoverable value; listed counts move to Items surveyed.
  { who: 'tom', page: 'owner-home', grid: 'home-stats', prefix: 'metric-', tiles: ['metric-items', 'metric-value', 'metric-requests', 'metric-carbon'] },
  { who: 'dana', page: 'surveyor-home', grid: 'home-stats', prefix: 'metric-', tiles: ['metric-clients', 'metric-buildings', 'metric-items', 'metric-open'] },
  { who: 'marcus', page: 'consultant-home', grid: 'home-stats', prefix: 'metric-', tiles: ['metric-projects', 'metric-carbon', 'metric-targets', 'metric-engagements'] },
  // The client home's tiles keep their own ids; its Recent activity is the same shared panel as the others.
  { who: 'isla', page: 'client-home', grid: 'client-metrics', prefix: 'client-metric-', tiles: ['client-metric-cost', 'client-metric-saving', 'client-metric-carbon', 'client-metric-reuse'] },
] as const

describe('every dashboard', () => {
  for (const h of HOMES) {
    it(`${h.who}: four tiles, named drawings, activity collapsed and no forbidden characters`, async () => {
      open('/app/home', U[h.who])
      await waitFor(() => document.querySelector(`[data-testid="${h.page}"]`))
      for (const id of h.tiles) expect(document.querySelector(`[data-testid="${id}"]`), id).not.toBeNull()
      expect(document.querySelectorAll(`[data-testid="${h.grid}"] [data-testid^="${h.prefix}"]`).length).toBe(4)
      // Every project or building drawing is a named image, never called a photo.
      const drawings = Array.from(document.querySelectorAll('[data-kind="illustration"] svg[role="img"], span[data-kind="illustration"] svg[role="img"]'))
      expect(drawings.length).toBeGreaterThan(0)
      for (const d of drawings) expect(accessibleName(d)).toMatch(/^Illustration of /)
      // Recent activity starts collapsed, with a one-line summary, and opens on demand.
      const panel = byTestId('activity-panel')
      expect(panel.getAttribute('data-open')).toBe('false')
      expect(byTestId('activity-toggle').getAttribute('aria-expanded')).toBe('false')
      expect(panel.textContent).toMatch(/\d+ updates?\. Latest, /)
      expect(document.querySelector('[data-testid="activity-feed"]')).toBeNull()
      click(byTestId('activity-toggle'))
      await waitFor(() => document.querySelector('[data-testid="activity-feed"]'))
      expect(byTestId('activity-toggle').getAttribute('aria-expanded')).toBe('true')
      expect(allText()).not.toMatch(FORBIDDEN)
    })
  }
})

describe('architect home', () => {
  it('shows what waits for approval and links each project to the materials that fit it, with no feed', async () => {
    open('/app/home', U.priya)
    await waitFor(() => document.querySelector('[data-testid="architect-home"]'))
    expect(byTestId('waiting-for-approval').querySelectorAll('li').length).toBe(2)
    expect(document.querySelector('[data-testid="new-for-projects"]')).toBeNull()
    expect(document.body.textContent).not.toContain('Waiting on')
    const fits = byTestId(`home-new-fits-${MERROWGATE_ID}`)
    expect(fits.getAttribute('href')).toBe(`/app/marketplace?project=${MERROWGATE_ID}`)
    expect(fits.textContent).toMatch(/^\d+ new materials? fits?$/)
    // The stage strip names the stage the programme places today in.
    expect(byTestId(`home-stage-${MERROWGATE_ID}`).querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('RIBA stage 2 of 7, Concept Design')
    expect(byTestId('metric-waiting').textContent).toContain('Over a week')
    expect(byTestId('metric-carbon').textContent).toContain('Indicative')
    const body = document.body.textContent ?? ''
    for (const p of privateStrings()) expect(body, p).not.toContain(p)
  })

  it('remembers an opened activity panel in this browser', async () => {
    open('/app/home', U.priya)
    await waitFor(() => document.querySelector('[data-testid="activity-panel"]'))
    // An earlier test in this file may have opened it already: the page keeps the choice in memory too.
    if (byTestId('activity-panel').getAttribute('data-open') === 'true') {
      click(byTestId('activity-toggle'))
      await waitFor(() => byTestId('activity-panel').getAttribute('data-open') === 'false')
    }
    click(byTestId('activity-toggle'))
    await waitFor(() => document.querySelector('[data-testid="activity-feed"]'))
    expect(JSON.parse(window.localStorage.getItem(PANELS_STORAGE_KEY) ?? '{}')['home-activity-architect']).toBe(true)
    cleanup()
    open('/app/home', U.priya)
    await waitFor(() => document.querySelector('[data-testid="activity-feed"]'))
    expect(byTestId('activity-panel').getAttribute('data-open')).toBe('true')
  })
})

describe('owner home', () => {
  it('lists the reservation request with the buyer blind and the building to confirm, and the kind of each card', async () => {
    open('/app/home', U.tom)
    await waitFor(() => document.querySelector('[data-testid="owner-home"]'))
    const waiting = byTestId('waiting-for-you')
    expect(waiting.querySelectorAll('[data-testid^="home-request-"]').length).toBe(1)
    expect(waiting.querySelectorAll('[data-testid^="home-claim-"]').length).toBe(1)
    expect(waiting.textContent).toContain('Confirm Ambrey House')
    expect(waiting.textContent).not.toContain('Lantern Quay')
    expect(waiting.textContent).not.toContain('Studio Oriel')
    expect(byTestId('metric-requests').textContent).toContain('Needs a decision')
    expect(document.querySelector('[data-testid^="home-building-"]')!.textContent).toContain('Donor building')
    expect(document.querySelector('[data-testid="new-projects-empty"]')).not.toBeNull()
  })
})

describe('surveyor home', () => {
  it('leads with Capture and lists the buildings not yet linked with their claim', async () => {
    open('/app/home', U.dana)
    await waitFor(() => document.querySelector('[data-testid="surveyor-home"]'))
    expect(byTestId('home-capture').getAttribute('href')).toBe('/app/capture')
    const unlinked = byTestId('home-unlinked')
    expect(unlinked.textContent).toContain('Ambrey House')
    expect(unlinked.textContent).toContain('Waiting for the owner')
    expect(document.querySelectorAll('[aria-label="Survey progress"]').length).toBeGreaterThanOrEqual(3)
  })
})

describe('consultant home', () => {
  it('reads each project against its targets, with meters and the three links', async () => {
    open('/app/home', U.marcus)
    await waitFor(() => document.querySelector('[data-testid="consultant-home"]'))
    const card = byTestId(`consultant-project-${MERROWGATE_ID}`)
    const meters = card.querySelectorAll('[role="meter"]')
    expect(meters.length).toBe(2)
    expect(meters[0].getAttribute('aria-valuetext')).toBe('19.9%. Aim at least 25%. Off target')
    const links = Array.from(card.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))
    expect(links).toEqual([`/app/projects/${MERROWGATE_ID}/sustainability`, `/app/projects/${MERROWGATE_ID}/targets`, `/app/projects/${MERROWGATE_ID}/certification`])
    expect(byTestId('metric-targets').textContent).toContain('2 off target')
    expect(byTestId('metric-projects').textContent).toContain('3 with a content target, 1 with a carbon target')
    const body = document.body.textContent ?? ''
    for (const p of privateStrings()) expect(body, p).not.toContain(p)
  })
})
