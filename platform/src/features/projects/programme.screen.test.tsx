// @vitest-environment jsdom
// The programme card after the recording audit of 16 October 2026 (notes 14, 17 and 19), through the real router:
// it leads the overview of a new project, carries Keep these dates and Edit programme once, names each stage on
// its band, labels months not quarters, and lets the owner of a New project with no architect set the dates.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { createProject, type NewProjectInput } from '../../store/actions/projects'
import { MERROWGATE_ID, ORG_IDS } from '../../domain/seed/world'
import { createOwnerProject } from '../../store/actions/owner'
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
    window.localStorage.removeItem('tallyard-platform-v1-panels')
  } catch {
    // Storage can be missing; the panels then start closed anyway.
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

function open(path: string, userId: string = U.priya) {
  setSessionUserId(userId, false)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />, { router: false })
  return router
}


const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)

function corbel(input: Partial<NewProjectInput> = {}): string {
  const r = createProject(getData(), { userId: U.priya, now: NOW }, { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null, ...input })
  expect(r.error).toBeNull()
  useApp.getState().commit(r.state)
  return r.value as string
}

describe('the programme card', () => {
  it('leads the overview of a new project, with the dates to keep or edit in its header', async () => {
    const id = corbel()
    open(`/app/projects/${id}`)
    await waitFor(() => q('programme-card'))
    const overview = byTestId('project-overview')
    const firstCard = overview.querySelector('[data-testid="programme-card"], [data-testid="project-setup"]')!
    expect(firstCard.getAttribute('data-testid')).toBe('programme-card')
    expect(byTestId('programme-footer').textContent).toBe('Stages from the RIBA Plan of Work 2020. Suggested dates until you keep or edit them. Indicative.')
    // Every band names its stage; the chart's description lists the stages with their dates.
    const names = Array.from(byTestId('programme-chart').querySelectorAll('[data-part="stage-name"]')).map((n) => n.textContent)
    expect(names.slice(0, 3)).toEqual(['Strategic Definition', 'Preparation and Briefing', 'Concept Design'])
    expect(byTestId('programme-chart').querySelector('[role="img"]')!.getAttribute('aria-label')).toContain('Stage 2, Concept Design, ')
    click(byTestId('keep-programme'))
    await waitFor(() => getData().world.projects[id].programme.source === 'set')
    await waitFor(() => !q('keep-programme'))
    expect(byTestId('programme-footer').textContent).toBe("Stages from the RIBA Plan of Work 2020. Dates are the architect's plan. Indicative.")
    expect(q('edit-programme')).not.toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('labels a short project in months, never quarters, over the whole programme and from today', async () => {
    const id = corbel({ startDate: '2027-03-01', practicalCompletion: '2027-09-01' })
    open(`/app/projects/${id}`)
    await waitFor(() => q('programme-chart'))
    const labels = () => Array.from(byTestId('programme-chart').querySelectorAll('[data-part="tick-label"]')).map((l) => l.textContent ?? '')
    expect(labels().length).toBeGreaterThan(2)
    expect(byTestId('programme-card').textContent).not.toMatch(/Q[1-4] 20/)
    click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'From today')!)
    await waitFor(() => byTestId('programme-card').getAttribute('data-range') === 'ahead')
    expect(labels().length).toBeGreaterThan(2)
    expect(byTestId('programme-card').textContent).not.toMatch(/Q[1-4] 20/)
  })

  it('shows the seeded client the programme with words for the client, and nothing to edit', async () => {
    open(`/app/projects/${MERROWGATE_ID}`, U.isla)
    await waitFor(() => q('programme-footer'))
    expect(byTestId('programme-footer').textContent).toBe("Stages from the RIBA Plan of Work 2020. Dates are the architect's plan. Indicative.")
    expect(q('keep-programme')).toBeNull()
    expect(q('edit-programme')).toBeNull()
  })
})

describe("the programme on an owner's New project with no architect", () => {
  it('lets the owner keep or edit the suggested dates, and names no architect', async () => {
    const r = createOwnerProject(getData(), { userId: U.tom, now: NOW }, { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: null })
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    const id = r.value as string
    open(`/app/projects/${id}`, U.tom)
    await waitFor(() => q('programme-card'))
    expect(byTestId('programme-footer').textContent).toBe('Stages from the RIBA Plan of Work 2020. Suggested dates until you keep or edit them. Indicative.')
    expect(byTestId('programme-card').textContent).toContain('Materials appear here once an architect is appointed and shortlists them.')
    expect(byTestId('programme-card').textContent).not.toContain("architect's plan")
    click(byTestId('edit-programme'))
    await waitFor(() => q('programme-dialog'))
    click(byTestId('programme-save'))
    await waitFor(() => getData().world.projects[id].programme.source === 'set')
    await waitFor(() => byTestId('programme-footer').textContent?.includes('Dates are your plan until an architect is appointed.'))
    expect(q('keep-programme')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
    // Appointing Studio Oriel hands the programme to the architect.
    choose(byTestId('appoint-architect-card-select'), ORG_IDS.oriel)
    click(byTestId('appoint-architect-card-save'))
    await waitFor(() => getData().world.projects[id].architectOrgId === ORG_IDS.oriel)
    await waitFor(() => !q('edit-programme'))
    // The dates Tom set stay his until the architect keeps or edits them.
    expect(byTestId('programme-footer').textContent).toBe('Stages from the RIBA Plan of Work 2020. Your dates until the architect confirms them. Indicative.')
    expect(byTestId('programme-suggested').textContent).toBe("Client's dates")
  })
})

function choose(el: Element, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
