// @vitest-environment jsdom
// The material page through the real router (feedback/r2-design/marketplace-material.md sections 7.3 and 11): the
// 3D view first, with the close-up toggle and keyboard turning; the IFC download; availability against every
// project or the chosen one; the guide price and seller details for clients only. Nothing private reaches the
// screen (P3) and no forbidden character does (P6).
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, press, render } from '../../ui/testing'
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
  const u = URL as unknown as Record<string, unknown>
  u.createObjectURL = vi.fn(() => 'blob:test')
  u.revokeObjectURL = vi.fn()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
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

function expectClean() {
  expect(allText()).not.toMatch(FORBIDDEN)
  const s = getData()
  const body = document.body.textContent ?? ''
  for (const lot of Object.values(s.world.lots)) {
    const item = s.world.items[lot.itemId]
    for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) if (x.length >= 4) expect(body, x).not.toContain(x)
  }
}

const headings = () => Array.from(document.querySelectorAll('[data-testid="material-page"] h2')).map((h) => h.textContent)

describe('material page for an architect', () => {
  it('leads with the 3D view, then save and downloads, availability, sustainability, key facts and the specification', async () => {
    open('/app/marketplace/L-9F4CQQ')
    await waitFor(() => document.querySelector('[data-testid="material-title"]'))
    expect(byTestId('gallery-stage').getAttribute('data-kind')).toBe('model')
    expect(headings().slice(0, 4)).toEqual(['Availability', 'Sustainability', 'Key facts', 'Specification'])
    expect(byTestId('availability-text').textContent).toBe('Expected January to March 2027')
    // No project chosen: the fit against every project.
    expect(byTestId('fit-text').textContent).toContain('Against your projects')
    expect(byTestId('fit-text').textContent).toContain('Merrowgate Wharf')
    expect(byTestId('fit-text').querySelectorAll('[data-fit]').length).toBe(3)
    expect(byTestId('key-facts').textContent).toContain('Collection point')
    // No price and no seller details for architects.
    expect(document.querySelector('[data-testid="guide-price"]')).toBeNull()
    expect(document.querySelector('[data-testid="seller-line"]')).toBeNull()
    expect(document.body.textContent).not.toContain('£')
    expect(byTestId('material-actions').textContent).toContain('Approval and purchase sit with the client, not the architect.')
    expect(byTestId('bim-family').textContent).toContain('version 2')
    expectClean()
  })

  it('turns the 3D view with the keyboard and shows the full length on request', async () => {
    open('/app/marketplace/L-9F4CQQ')
    const viewer = await waitFor(() => document.querySelector<HTMLElement>('[data-testid="model-viewer"]'))
    expect(viewer.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(3)
    expect(viewer.querySelector('svg')!.getAttribute('aria-label')).toBe('3D view of UB 457x191x67, 7.5 m')
    expect(byTestId('gallery-caption').textContent).toContain('Shown 1,000 mm long so the section reads. The download is the full 7,500 mm.')
    expect(viewer.getAttribute('data-yaw')).toBe('-35')
    press('ArrowRight', viewer)
    expect(byTestId('model-viewer').getAttribute('data-yaw')).toBe('-20')
    const closeUp = byTestId('model-viewer').querySelector('svg')!.innerHTML
    click(byTestId('model-length'))
    await waitFor(() => byTestId('model-length').textContent === 'Show close up')
    expect(byTestId('gallery-caption').textContent).not.toContain('Shown 1,000 mm')
    expect(byTestId('model-viewer').querySelector('svg')!.innerHTML).not.toBe(closeUp)
    click(byTestId('gallery-thumb-drawing'))
    await waitFor(() => byTestId('gallery-stage').getAttribute('data-kind') === 'drawing')
    expect(byTestId('gallery-caption').textContent).toContain('Drawing generated from the recorded dimensions')
  })

  it('draws every picture on the plain white stage, the steel illustration included, with no drafting grid', async () => {
    open('/app/marketplace/L-9F4CQQ')
    await waitFor(() => document.querySelector('[data-testid="gallery-thumb-illustration"]'))
    click(byTestId('gallery-thumb-illustration'))
    await waitFor(() => byTestId('gallery-stage').getAttribute('data-kind') === 'illustration')
    const stage = byTestId('gallery-stage')
    expect(stage.querySelector('[data-part="section-axo"]')).not.toBeNull()
    expect(stage.querySelector('[data-part="grid"]')).toBeNull()
    expect(stage.querySelector('[data-part="section-axo"] > rect')!.getAttribute('fill')).toBe('#ffffff')
    // The thumbnail keeps the card drawing: the plain board is for the stage.
    expect(byTestId('gallery-thumb-illustration').querySelector('[data-part="section-axo"] > rect')!.getAttribute('fill')).not.toBe('#ffffff')
    click(byTestId('gallery-thumb-drawing'))
    await waitFor(() => byTestId('gallery-stage').getAttribute('data-kind') === 'drawing')
    expect(byTestId('gallery-stage').querySelector('[data-part="grid"]')).toBeNull()
  })

  it('draws the curtain wall and raised floor illustrations on white too', async () => {
    for (const id of ['L-9XXQC3', 'L-6VWCWH']) {
      open(`/app/marketplace/${id}`)
      await waitFor(() => document.querySelector('[data-testid="gallery-thumb-illustration"]'))
      click(byTestId('gallery-thumb-illustration'))
      await waitFor(() => byTestId('gallery-stage').getAttribute('data-kind') === 'illustration')
      const board = byTestId('gallery-stage').querySelector('[data-part^="panel-"] > rect')!
      expect(board.getAttribute('fill'), id).toBe('#ffffff')
      cleanup()
    }
  })

  it('tells a touch screen to drag sideways, not to use the arrow keys', async () => {
    const before = window.matchMedia
    window.matchMedia = ((q: string) => ({ ...before(q), matches: q === '(pointer: coarse)' })) as typeof window.matchMedia
    try {
      open('/app/marketplace/L-9F4CQQ')
      await waitFor(() => document.querySelector('[data-testid="model-viewer"]'))
      expect(byTestId('gallery-caption').textContent).toContain('Drag sideways to turn it.')
      expect(byTestId('gallery-caption').textContent).not.toContain('arrow keys')
    } finally {
      window.matchMedia = before
    }
  })

  it('downloads the IFC model', async () => {
    open('/app/marketplace/L-9F4CQQ')
    await waitFor(() => document.querySelector('[data-testid="download-ifc"]'))
    const created = URL.createObjectURL as unknown as ReturnType<typeof vi.fn>
    created.mockClear()
    click(byTestId('download-ifc'))
    expect(created).toHaveBeenCalledTimes(1)
    const text = await (created.mock.calls[0][0] as Blob).text()
    expect(text).toContain("FILE_SCHEMA(('IFC4'))")
    expect(text).toContain('IFCBEAM(')
    expect(text).not.toMatch(/£|price/i)
  })

  it('checks against the chosen project with its timeline', async () => {
    open(`/app/marketplace/L-9F4CQQ?project=${MERROWGATE_ID}`)
    await waitFor(() => document.querySelector('[data-testid="material-timeline"]'))
    // The marker names the date as the fit text does, not as the project's start (site start is another date).
    expect(byTestId('material-timeline').textContent).toContain('Materials needed from 4 Apr 2028')
    expect(byTestId('material-timeline').textContent).not.toContain('Merrowgate Wharf start')
    expect(byTestId('fit-text').textContent).toBe('Available in time for Merrowgate Wharf, materials needed from 4 April 2028. About 13 months in storage before the start.')
    expect(byTestId('availability').querySelector('[data-fit]')!.getAttribute('data-fit')).toBe('in_time')
  })

  it('says each thing once: the specification keeps only what is not shown above it, with no unmarked indicative figure', async () => {
    open('/app/marketplace/L-9F4CQQ')
    await waitFor(() => document.querySelector('[data-testid="spec-table"]'))
    const spec = byTestId('spec-table').textContent ?? ''
    expect(spec).toContain('Material and dimensions')
    expect(spec).toContain('Designation')
    for (const said of ['Collection point', 'Location', 'Quantity', 'Mass', 'Test status', 'Timeline check', 'Avoided carbon', 'tCO2e', 'Sustainability band', 'Public ID']) expect(spec, said).not.toContain(said)
    // Location shows once, in the key facts; architects get no seller section.
    expect(byTestId('key-facts').textContent).toContain('Central London')
    expect(document.querySelector('[data-testid="location"]')).toBeNull()
    const header = byTestId('material-title').nextElementSibling!.textContent ?? ''
    expect(header).not.toContain('Central London')
    expect((document.querySelector('[data-testid="material-page"]')!.textContent!.match(/Central London/g) ?? []).length).toBe(1)
  })

  it('names the checked project when the lot is not shared with it', async () => {
    open(`/app/marketplace/L-WPX5A6?project=${FERRYMOOR_ID}`)
    await waitFor(() => document.querySelector('[data-testid="material-title"]'))
    expect(byTestId('not-shared-with').textContent).toBe('Not shared with Ferrymoor Yard, so it cannot be checked against it. The projects it is shared with:')
    expect(byTestId('fit-text').textContent).toContain('Merrowgate Wharf')
    expectClean()
  })

  it('has no close-up toggle for a short element', async () => {
    open('/app/marketplace/L-A945G6')
    await waitFor(() => document.querySelector('[data-testid="model-viewer"]'))
    expect(document.querySelector('[data-testid="model-length"]')).toBeNull()
  })
})

describe('material page for other roles', () => {
  it('shows the client the seller line, the seller type and the guide price', async () => {
    open('/app/marketplace/L-9F4CQQ', U.isla)
    await waitFor(() => document.querySelector('[data-testid="material-title"]'))
    expect(byTestId('seller-line').textContent).toBe('Listed by a donor building owner in Central London')
    expect(byTestId('guide-price').textContent).toContain('£715 to £825 per tonne')
    expect(document.body.textContent).toContain('Donor building owner')
    expect(byTestId('location').textContent).toContain('Seller')
    expect(document.querySelector('[data-testid="material-save"]')).toBeNull()
    expectClean()
  })

  it('gives the consultant no price, seller details or save', async () => {
    open('/app/marketplace/L-9F4CQQ', U.marcus)
    await waitFor(() => document.querySelector('[data-testid="material-title"]'))
    expect(document.querySelector('[data-testid="guide-price"]')).toBeNull()
    expect(document.querySelector('[data-testid="seller-line"]')).toBeNull()
    expect(document.querySelector('[data-testid="material-save"]')).toBeNull()
    expect(document.body.textContent).not.toContain('£')
    expect(document.querySelector('[data-testid="download-ifc"]')).not.toBeNull()
  })
})
