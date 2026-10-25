// @vitest-environment jsdom
// The round 2 client and consultant screens through the real router (client-consultant design section 11): the
// client home, Approvals and Reservations figures, the Sustainability tab for each side, Requirements, Goals and
// targets, Certification and the circular economy statement. Each renders cleanly (P6), holds no money for the
// architect or the consultant, and the main edits go through the screens into the store.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../../ui/testing'
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

function choose(select: HTMLElement, value: string) {
  const el = select instanceof HTMLSelectElement ? select : select.querySelector('select')!
  act(() => {
    el.value = value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

const record = () => getData().sustainability[M]!

describe('client home', () => {
  it('shows the four indicative figures, the to-do list, the programme and the tracking', async () => {
    await page('/app/home', U.isla, 'client-home')
    for (const id of ['client-metric-cost', 'client-metric-saving', 'client-metric-carbon', 'client-metric-reuse']) expect(q(id), id).not.toBeNull()
    expect(byTestId('client-metric-cost').textContent).toContain('£155,932')
    expect(byTestId('client-metric-carbon').textContent).toContain('47.8')
    expect(byTestId('client-metric-cost').textContent).toContain('Indicative')
    expect(document.querySelectorAll('[data-testid^="portfolio-row-"]')).toHaveLength(2)
    expect(q(`portfolio-row-${K}`)).not.toBeNull()
    const todos = Array.from(byTestId('client-todo').querySelectorAll('[data-testid^="todo-"]')).map((e) => e.getAttribute('data-testid'))
    expect(todos.filter((t) => t !== 'todo-count')).toEqual([`todo-approve-${M}-L-2MAC36`, `todo-review_statement-${M}`, `todo-requirement_at_risk-${M}-breeam-nc`, `todo-reserve-${M}-L-NHZ32R`])
    expect(q(`tracking-${M}`)).not.toBeNull()
    expect(byTestId(`tracking-${K}`).textContent).toContain('No consultant appointed')
    expect(byTestId('client-projects').textContent).toContain('Kilnworth Place')
    // The shared Recent activity panel (shell-dashboards D), collapsed by default.
    expect(byTestId('activity-panel').getAttribute('data-open')).toBe('false')
    expect(byTestId('activity-toggle').getAttribute('aria-expanded')).toBe('false')
    expectClean()
  })
})

describe('approvals and reservations', () => {
  it('shows the totals strip and a cost panel for the material waiting', async () => {
    await page(`/app/projects/${M}/approvals`, U.isla, 'approvals')
    expect(byTestId('approvals-finance').textContent).toContain('Waiting for your decision')
    const panel = byTestId('approval-cost-L-2MAC36')
    expect(panel.textContent).toContain('Indicative cost if approved')
    expect(panel.textContent).toContain('The same new')
    expect(q('decided-cost-L-NHZ32R')).not.toBeNull()
    expect(q('finance-caveat')).not.toBeNull()
    expectClean()
  })

  it('shows the cost and carbon cards and an avoided carbon row per reservation', async () => {
    await page(`/app/projects/${M}/reservations`, U.isla, 'reservations')
    expect(byTestId('reservations-cost').textContent).toContain('With the seller')
    expect(byTestId('reservations-carbon').textContent).toContain('Secured for this project')
    expect(q('reservations-carbon-meter')).not.toBeNull()
    expect(byTestId('reservation-carbon-L-WPX5A6').textContent).toContain('Avoided carbon')
    expectClean()
  })
})

describe('sustainability tab', () => {
  it('gives the client the figures, the targets and the statement to review', async () => {
    await page(`/app/projects/${M}/sustainability`, U.isla, 'sustainability-page')
    for (const id of ['sustainability-metrics', 'sustainability-targets', 'project-carbon', 'sustainability-schemes', 'sustainability-requirements', 'statement-card']) expect(q(id), id).not.toBeNull()
    expect(q('statement-review')).not.toBeNull()
    expect(q('scheme-breeam')).not.toBeNull()
    expectClean()
  })

  it('shows the architect no money and no statement', async () => {
    await page(`/app/projects/${M}/sustainability`, U.priya, 'sustainability-page')
    expect(q('statement-card')).toBeNull()
    expect(mainText()).not.toContain('£')
    expectClean()
  })

  it('gives the consultant links to edit, and no money', async () => {
    await page(`/app/projects/${M}/sustainability`, U.marcus, 'sustainability-page')
    expect(byTestId('sustainability-targets').textContent).toContain('Edit targets')
    expect(byTestId('sustainability-schemes').textContent).toContain('Open certification')
    expect(byTestId('statement-card').textContent).toContain('Open the statement')
    expect(mainText()).not.toContain('£')
    expectClean()
  })

  it('lets the client review the statement, and the to-do clears', async () => {
    await page(`/app/projects/${M}/sustainability#statement`, U.isla, 'statement-card')
    click(byTestId('statement-review'))
    const dialog = await waitFor(() => q('statement-review-dialog'))
    expect(dialog.textContent).toContain('Strategic approach')
    typeInto(byTestId('statement-review-note'), 'Please add the brick reuse on the podium.')
    click(byTestId('statement-review-confirm'))
    await settle()
    expect(record().statement?.status).toBe('reviewed')
    cleanup()
    await page('/app/home', U.isla, 'client-home')
    expect(q(`todo-review_statement-${M}`)).toBeNull()
  })

  it('/carbon opens the Sustainability tab', async () => {
    const router = await page(`/app/projects/${M}/carbon`, U.isla, 'sustainability-page')
    expect(router.state.location.pathname).toBe(`/app/projects/${M}/sustainability`)
  })
})

describe('requirements', () => {
  it('lets the client set a status and add evidence', async () => {
    await page(`/app/projects/${M}/requirements`, U.isla, 'requirements-page')
    expect(q('requirements-summary')).not.toBeNull()
    choose(byTestId('requirement-status-lp-si2'), 'evidence_ready')
    await settle()
    expect(record().requirements['lp-si2']?.status).toBe('evidence_ready')
    click(byTestId('evidence-open-lp-si2'))
    const text = await waitFor(() => q('evidence-text-lp-si2'))
    typeInto(text, 'Stage 2 assessment accepted by the planning officer.')
    click(byTestId('evidence-add-lp-si2'))
    await settle()
    expect(record().requirements['lp-si2']?.evidence.some((e) => e.text === 'Stage 2 assessment accepted by the planning officer.')).toBe(true)
    click(byTestId('requirements-filter-at_risk'))
    await settle()
    expect(document.querySelectorAll('[data-testid^="requirement-"][data-status]')).toHaveLength(1)
    expectClean()
  })

  it('gives the architect a read-only view', async () => {
    await page(`/app/projects/${M}/requirements`, U.priya, 'requirements-page')
    expect(document.querySelector('[data-testid^="requirement-status-"]')).toBeNull()
    expect(document.querySelector('[data-testid^="evidence-open-"]')).toBeNull()
    expect(q('requirement-pill-breeam-nc')).not.toBeNull()
    expect(mainText()).not.toContain('£')
    expectClean()
  })
})

describe('goals and targets', () => {
  it('lets the consultant override a target through the dialog, then reset it', async () => {
    await page(`/app/projects/${M}/targets`, U.marcus, 'targets-page')
    expect(byTestId('goals').querySelectorAll(':scope > li')).toHaveLength(8)
    click(byTestId('goal-edit-content_by_value'))
    const input = await waitFor(() => document.querySelector<HTMLInputElement>('[data-testid="goal-value"]'))
    expect(input.value).toBe('25')
    typeInto(input, '30')
    click(byTestId('goal-save'))
    await settle()
    expect(record().goals.content_by_value?.value).toBe(0.3)
    expect(byTestId('goal-content_by_value').textContent).toContain('30%')
    expect(byTestId('goal-meter-content_by_value').getAttribute('data-state')).toBe('critical')
    expect(byTestId('goal-meter-content_by_value').querySelector('[role="meter"]')?.getAttribute('aria-valuetext')).toContain('Aim at least 30%')
    click(byTestId('goal-reset-content_by_value'))
    await settle()
    expect(record().goals.content_by_value).toBeUndefined()
    expect(mainText()).not.toContain('£')
    expectClean()
  })

  it('starts a new value without the old reason, and writes the basis out below the table layout', async () => {
    await page(`/app/projects/${M}/targets`, U.marcus, 'targets-page')
    // Below 1280 px the rows are cards and a tooltip cannot be tapped open, so the basis is a line of text.
    expect(byTestId('goal-basis-cd_diversion').textContent).toContain('London Plan 2021 Policy SI 7')
    click(byTestId('goal-edit-content_by_value'))
    const note = await waitFor(() => document.querySelector<HTMLTextAreaElement>('[data-testid="goal-note"]'))
    const before = record().goals.content_by_value?.note ?? ''
    expect(before.length).toBeGreaterThan(0)
    expect(note.value).toBe(before)
    typeInto(byTestId('goal-value'), '30')
    await settle()
    expect(byTestId('goal-note').getAttribute('placeholder')).toBe(`Before: ${before}`)
    expect((byTestId('goal-note') as HTMLTextAreaElement).value).toBe('')
    click(byTestId('goal-save'))
    await settle()
    expect(record().goals.content_by_value).toMatchObject({ value: 0.3, note: '' })
    expect(byTestId('goal-content_by_value').textContent).not.toContain(before)
  })

  it('shows a field error for a value out of range', async () => {
    await page(`/app/projects/${M}/targets`, U.marcus, 'targets-page')
    click(byTestId('goal-edit-content_by_value'))
    typeInto(await waitFor(() => q('goal-value')), 'abc')
    click(byTestId('goal-save'))
    await settle()
    expect(byTestId('goal-dialog').textContent?.length).toBeGreaterThan(0)
    expect(record().goals.content_by_value?.value).toBe(0.25)
  })
})

describe('certification', () => {
  it('switches scheme and view, uses a suggestion and maps a material', async () => {
    const router = await page(`/app/projects/${M}/certification`, U.marcus, 'certification-page')
    expect(byTestId('scheme-tab-breeam').getAttribute('aria-current')).toBe('page')
    expect(document.querySelectorAll('[data-testid^="credit-"][data-targeted]')).toHaveLength(5)
    click(byTestId('scheme-tab-well'))
    await waitFor(() => q('credit-well-x02'))
    expect(router.state.location.search).toBe('?scheme=well')
    click(byTestId('credit-suggest-well-x02'))
    await settle()
    expect(record().credits['well-x02']?.status).toBe('at_risk')
    click(byTestId('view-by-item'))
    const box = await waitFor(() => q('matrix-well-x01-L-NHZ32R'))
    click(box)
    await settle()
    expect(record().credits['well-x01']?.items['L-NHZ32R']).toBe(true)
    expect(mainText()).not.toContain('£')
    expectClean()
  })

  it('turns a credit off', async () => {
    await page(`/app/projects/${M}/certification?scheme=breeam`, U.marcus, 'certification-page')
    click(byTestId('credit-targeted-breeam-mat01'))
    await settle()
    expect(record().credits['breeam-mat01']?.targeted).toBe(false)
    expect(document.querySelector<HTMLSelectElement>('[data-testid="credit-status-breeam-mat01"]')?.disabled).toBe(true)
  })
})

describe('circular economy statement', () => {
  it('edits a section, sends the update for review and downloads it for Word', async () => {
    await page(`/app/projects/${M}/statement`, U.marcus, 'statement-page')
    expect(byTestId('statement-status').textContent).toContain('review')
    expect(document.querySelectorAll('[data-testid^="statement-section-"]')).toHaveLength(8)
    expect(byTestId('statement-section-approach').textContent).toContain('Edited')
    click(byTestId('statement-edit-next_steps'))
    const text = await waitFor(() => document.querySelector<HTMLTextAreaElement>('[data-testid="statement-text-next_steps"]'))
    typeInto(text, 'Update the statement at planning with the final bill of materials.')
    click(byTestId('statement-save-next_steps'))
    await settle()
    // Round 2 follow-up review: an edit keeps the statement with the client (no return to draft) and offers the update.
    expect(record().statement?.status).toBe('ready_for_review')
    expect(byTestId('statement-send').textContent).toBe('Send the updated statement')
    click(byTestId('statement-send'))
    await settle()
    expect(record().statement?.status).toBe('ready_for_review')
    click(byTestId('statement-docx'))
    await waitFor(() => (URL.createObjectURL as unknown as { mock: { calls: unknown[] } }).mock.calls.length > 0)
    expect(mainText()).not.toContain('£')
    expectClean()
  })

  it('stays with the consultant: the client reads the statement on the Sustainability tab', async () => {
    await page(`/app/projects/${M}/statement`, U.isla, 'no-access')
    expect(q('statement-page')).toBeNull()
  })
})
