// @vitest-environment jsdom
// Requirements by location through the real router (recording audit of 16 October 2026, notes 20, 41 and C1): the
// borough list sets the region, ticks follow a change of place, a closed panel leaves the suggestions tracked and
// the card says so, the architect chooses from the Requirements tab, the edit dialog opens the review after a move,
// and the owner and surveyor track a donor building's requirements before demolition.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../../ui/testing'
import { suggestedRequirementIds } from '../../domain/reference/requirements'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { createProject, type NewProjectInput } from '../../store/actions/projects'
import { MERROWGATE_ID, SALLOW_ID, TIVERNE_ID } from '../../domain/seed/world'
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

function choose(el: Element, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

const q = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)


/** Corbel Yard in Camden for Lantern Quay Developments, created by Priya with the requirements left closed. */
function corbel(input: Partial<NewProjectInput> = {}): string {
  const r = createProject(getData(), { userId: U.priya, now: NOW }, { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null, ...input })
  expect(r.error).toBeNull()
  useApp.getState().commit(r.state)
  return r.value as string
}

const ticked = (id: string) => q(`requirement-check-${id}`)?.getAttribute('data-state') === 'checked'

describe('the location fields of the new project dialog', () => {
  it('lists every borough grouped by region, and choosing one sets the region', async () => {
    open('/app/projects/new')
    await waitFor(() => q('new-project-dialog'))
    const la = byTestId('project-local-authority')
    const groups = Array.from(la.querySelectorAll('optgroup')).map((g) => g.getAttribute('label'))
    expect(groups[0]).toBe('Central London')
    expect(groups).toContain('Outer London West')
    expect(groups).toContain('Scotland')
    expect(Array.from(byTestId('project-region').querySelectorAll('optgroup')).map((g) => g.getAttribute('label'))).toEqual(['London', 'England outside London', 'Wales and Scotland'])
    expect(byTestId('new-project-dialog').textContent).toContain('Covers City of London, Westminster, Camden')
    choose(la, 'Merton')
    await waitFor(() => (byTestId('project-region') as HTMLSelectElement).value === 'Outer London West')
    expect((byTestId('project-local-authority') as HTMLSelectElement).value).toBe('Merton')
    expect(byTestId('project-requirements-summary').textContent).toMatch(/apply to Merton, Outer London West/)
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('keeps the ticks that still apply after a change of place and ticks the new place suggestions', async () => {
    open('/app/projects/new')
    await waitFor(() => q('new-project-dialog'))
    choose(byTestId('project-local-authority'), 'Camden')
    click(byTestId('project-requirements-toggle'))
    await waitFor(() => q('requirements-picker'))
    click(byTestId('requirement-check-nzcbs'))
    await waitFor(() => ticked('nzcbs'))
    choose(byTestId('project-region'), 'South East')
    await settle()
    choose(byTestId('project-local-authority'), 'Oxford')
    await waitFor(() => q('requirement-check-la-oxford'))
    expect(ticked('la-oxford')).toBe(true)
    expect(ticked('nzcbs')).toBe(true)
    expect(ticked('nppf')).toBe(true)
    expect(q('requirement-check-la-camden-cc1')).toBeNull()
    expect(byTestId('project-requirements-move').textContent).toBe('1 more is suggested there and now ticked.')
    expect(byTestId('requirement-placeholder-la-oxford').textContent).toBe('Not yet summarised')
    // Then Tower Hamlets: its local plan is ticked too.
    choose(byTestId('project-local-authority'), 'Tower Hamlets')
    await waitFor(() => q('requirement-check-la-tower-hamlets'))
    expect(ticked('la-tower-hamlets')).toBe(true)
    expect(ticked('lp-si7')).toBe(true)
    expect(ticked('nzcbs')).toBe(true)
  })

  it('leaves the suggestions tracked when the panel stays closed, and the overview card says so', async () => {
    const router = open('/app/projects/new')
    await waitFor(() => q('new-project-dialog'))
    typeInto(byTestId('project-name'), 'Corbel Yard')
    typeInto(byTestId('project-start'), '2027-09-06')
    choose(byTestId('project-local-authority'), 'Camden')
    expect(byTestId('new-project-dialog').textContent).toContain('Left closed, the suggested ones are tracked until you choose.')
    click(byTestId('create-project'))
    await waitFor(() => /^\/app\/projects\/prj_/.test(router.state.location.pathname))
    const p = Object.values(getData().world.projects).find((x) => x.name === 'Corbel Yard')!
    expect(p.requirementsReviewed).toBe(false)
    const card = await waitFor(() => q('requirements-card'))
    expect(card.getAttribute('data-suggested')).toBe('true')
    expect(card.textContent).toContain('10 suggested for Camden, Central London')
    expect(byTestId('requirements-suggested-note').textContent).toContain('Until then, the 10 suggested ones are tracked.')
    expect(byTestId('requirements-choose').textContent).toBe('Review requirements')
    expect(byTestId('requirements-open').textContent?.trim()).toBe('View requirements')
  })
})

describe('the requirements card and tab', () => {
  it('says View requirements to the architect and Track requirements to the client', async () => {
    open(`/app/projects/${MERROWGATE_ID}`)
    await waitFor(() => q('requirements-open'))
    expect(byTestId('requirements-open').textContent?.trim()).toBe('View requirements')
    cleanup()
    open(`/app/projects/${MERROWGATE_ID}`, U.isla)
    await waitFor(() => q('requirements-open'))
    expect(byTestId('requirements-open').textContent?.trim()).toBe('Track requirements')
  })

  it('lets the architect review the suggestions from the Requirements tab', async () => {
    const id = corbel()
    open(`/app/projects/${id}/requirements`)
    await waitFor(() => q('requirements-tab-choose'))
    expect(byTestId('requirements-tab-suggested').textContent).toContain('Until then, the 10 suggested ones are tracked.')
    expect(byTestId('requirements-tab-choose').textContent).toBe('Review requirements')
    click(byTestId('requirements-tab-choose'))
    await waitFor(() => q('requirements-picker'))
    expect(ticked('la-camden-cc1')).toBe(true)
    click(byTestId('requirement-check-nzcbs'))
    await waitFor(() => ticked('nzcbs'))
    click(byTestId('requirements-save'))
    await waitFor(() => getData().world.projects[id].requirementsReviewed)
    expect(getData().world.projects[id].planningRequirementIds).toEqual([...suggestedRequirementIds('Central London', 'Camden').slice(0, 2), 'nzcbs', ...suggestedRequirementIds('Central London', 'Camden').slice(2)])
    await waitFor(() => byTestId('requirements-tab-choose').textContent === 'Edit requirements')
    expect(q('requirements-tab-suggested')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('gives the client and the consultant no choosing button', async () => {
    open(`/app/projects/${MERROWGATE_ID}/requirements`, U.isla)
    await waitFor(() => q('requirements-page'))
    expect(q('requirements-tab-choose')).toBeNull()
  })

  it('opens the requirements to review straight after a move that changes them', async () => {
    open(`/app/projects/${SALLOW_ID}`)
    await waitFor(() => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Edit'))
    click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Edit')!)
    await waitFor(() => q('edit-project-local-authority'))
    choose(byTestId('edit-project-local-authority'), 'Hackney')
    await waitFor(() => q('edit-project-requirements-note'))
    expect((byTestId('edit-project-region') as HTMLSelectElement).value).toBe('Inner London East')
    expect(byTestId('edit-project-requirements-note').textContent).toContain('Saving opens the requirements so you can review them.')
    click(byTestId('edit-project-save'))
    await waitFor(() => q('requirements-dialog'))
    expect(ticked('la-hackney-lp33')).toBe(true)
  })
})

describe('requirements on a donor building', () => {
  it('lets the owner see Carbon Options on Tiverne House and change a status', async () => {
    open(`/app/buildings/${TIVERNE_ID}/requirements`, U.tom)
    const page = await waitFor(() => q('building-requirements'))
    expect(page.textContent).toContain('Carbon options, Carbon Options guidance')
    expect(page.textContent).toContain('1 of 4 ready')
    expect(byTestId('building-requirement-dem-notice').textContent).toContain('Not yet summarised')
    choose(byTestId('building-requirement-status-dem-notice'), 'in_progress')
    await waitFor(() => getData().buildingTracks[TIVERNE_ID]['dem-notice']?.status === 'in_progress')
    click(byTestId('building-evidence-open-dem-notice'))
    const text = await waitFor(() => q('building-evidence-text-dem-notice'))
    typeInto(text, 'Notice drafted for the City.')
    click(byTestId('building-evidence-add-dem-notice'))
    await waitFor(() => getData().buildingTracks[TIVERNE_ID]['dem-notice'].evidence.length === 1)
    expect(byTestId('tab-requirements').getAttribute('aria-current')).toBe('page')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('shows the surveyor the same list and the home lines on both dashboards', async () => {
    open(`/app/buildings/${TIVERNE_ID}/requirements`, U.dana)
    await waitFor(() => q('building-requirements'))
    expect(q('building-requirement-status-lp-si7-pda')).not.toBeNull()
    cleanup()
    open('/app/home', U.tom)
    const line = await waitFor(() => q(`home-building-requirements-${TIVERNE_ID}`))
    expect(line.textContent).toContain('1 of 4 ready')
    expect(line.textContent).toContain('1 at risk')
    expect(line.getAttribute('href')).toBe(`/app/buildings/${TIVERNE_ID}/requirements`)
    cleanup()
    open('/app/home', U.dana)
    await waitFor(() => q(`home-building-requirements-${TIVERNE_ID}`))
  })
})
