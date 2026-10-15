// @vitest-environment jsdom
// Project setup and the programme, through the real router: the overview led by the programme chart, the setup
// checklist and client link banner on a new project, the programme and new project dialogs, the client's project
// requests, the team and list while a client has not accepted, and Help. No forbidden characters (P6), and no
// client people before the client accepts.
import { act } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { allText, byTestId, cleanup, click, FORBIDDEN, installDomShims, render, typeInto } from '../../ui/testing'
import { setClockForTests } from '../../sandbox/clock'
import { getData, useApp } from '../../store/app'
import { signOut } from '../../store/session'
import { setSessionUserId } from '../../store/sessionId'
import { createProject, decideClientLink, type NewProjectInput } from '../../store/actions/projects'
import { MERROWGATE_ID, SALLOW_ID } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { routes } from '../../app/router'
import { snapshot } from '../../ui/toastStore'

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

/** Corbel Yard for Lantern Quay Developments, created by Priya and stored, waiting for Isla. */
function corbel(input: Partial<NewProjectInput> = {}): string {
  const r = createProject(getData(), { userId: U.priya, now: NOW }, { name: 'Corbel Yard', client: { name: 'Lantern Quay Developments' }, projectType: 'residential', localAuthority: 'Hackney', region: 'Inner London East', ribaStage: 2, startDate: '2027-09-06', consultantOrgId: null, ...input })
  expect(r.error).toBeNull()
  useApp.getState().commit(r.state)
  return r.value as string
}

describe('the overview', () => {
  it('leads with the programme chart for Merrowgate Wharf', async () => {
    open(`/app/projects/${MERROWGATE_ID}`)
    await waitFor(() => q('programme-chart'))
    expect(document.querySelectorAll('[data-part="stage-band"]')).toHaveLength(8)
    expect(byTestId('programme-chart').textContent).toContain('Today: stage 2, Concept Design')
    expect(byTestId('programme-check').textContent).toBe('On programme')
    expect(q('programme-suggested')).toBeNull()
    expect(byTestId('requirements-card').textContent).toContain('10 chosen for Newham, Inner London East')
    // A seeded project is past setup and its client has accepted.
    expect(q('project-setup')).toBeNull()
    expect(q('client-link-banner')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('keeps recent activity collapsed until opened', async () => {
    open(`/app/projects/${MERROWGATE_ID}`)
    await waitFor(() => q('overview-activity'))
    const toggle = byTestId('overview-activity-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(q('activity-feed')).toBeNull()
    click(toggle)
    await waitFor(() => byTestId('overview-activity-toggle').getAttribute('aria-expanded') === 'true')
    expect(q('activity-feed')).not.toBeNull()
  })

  it('switches the chart to start from today', async () => {
    open(`/app/projects/${MERROWGATE_ID}`)
    await waitFor(() => q('programme-card'))
    click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'From today')!)
    await waitFor(() => byTestId('programme-card').getAttribute('data-range') === 'ahead')
  })

  it('shows the client and consultant the programme with no editing', async () => {
    open(`/app/projects/${MERROWGATE_ID}`, U.isla)
    await waitFor(() => q('programme-chart'))
    expect(q('edit-programme')).toBeNull()
    expect(q('requirements-edit')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('a new project', () => {
  it('shows the setup checklist, the link banner and suggested dates, and keeps the dates in one click', async () => {
    const id = corbel()
    open(`/app/projects/${id}`)
    await waitFor(() => q('project-setup'))
    expect(byTestId('client-link-banner').textContent).toContain('Waiting for Lantern Quay Developments')
    expect(byTestId('setup-progress').textContent).toBe('0 of 6 done')
    expect(byTestId('setup-step-programme').getAttribute('data-state')).toBe('current')
    expect(byTestId('setup-step-client').getAttribute('data-state')).toBe('waiting')
    expect(q('programme-suggested')).not.toBeNull()
    expect(byTestId('link-status').textContent).toContain('Waiting for client')
    // No client people before the client accepts.
    expect(document.body.textContent).not.toContain('Isla Brennan')
    click(byTestId('setup-secondary-programme'))
    await waitFor(() => getData().world.projects[id].programme.source === 'set')
    await waitFor(() => byTestId('setup-step-programme').getAttribute('data-state') === 'done')
    expect(q('programme-suggested')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('keeps the checklist compact, with the waiting client folded in, and opens every step on request', async () => {
    const id = corbel()
    open(`/app/projects/${id}`)
    await waitFor(() => q('setup-current'))
    const setup = byTestId('project-setup')
    expect(byTestId('setup-current').getAttribute('data-step')).toBe('programme')
    expect(byTestId('setup-current').textContent).toContain('Confirm the dates or edit them.')
    expect(setup.textContent).not.toContain('Indicative:')
    // The waiting client is one line inside the checklist, with one way to change the client.
    expect(setup.contains(byTestId('client-link-banner'))).toBe(true)
    expect(byTestId('client-link-banner').getAttribute('data-variant')).toBe('inline')
    expect(document.querySelectorAll('[data-testid="link-change-client"], [data-testid="setup-secondary-client"]')).toHaveLength(1)
    // The programme follows the checklist directly.
    expect(setup.nextElementSibling).toBe(byTestId('programme-card'))
    const toggle = byTestId('setup-toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    click(toggle)
    await waitFor(() => q('setup-current') === null)
    expect(byTestId('setup-toggle').getAttribute('aria-expanded')).toBe('true')
    expect(byTestId('setup-step-programme').textContent).toContain('Check the programme')
    expect(q('setup-action-programme')).not.toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('shows the full banner, outside the checklist, once the client declines', async () => {
    const id = corbel()
    const r = decideClientLink(getData(), { userId: U.isla, now: NOW }, id, 'declined', 'We are not the client on this scheme.')
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    open(`/app/projects/${id}`)
    await waitFor(() => q('client-link-banner'))
    const banner = byTestId('client-link-banner')
    expect(banner.getAttribute('data-status')).toBe('declined')
    expect(banner.getAttribute('data-variant')).toBeNull()
    expect(byTestId('project-setup').contains(banner)).toBe(false)
    expect(banner.textContent).toContain('Their note: We are not the client on this scheme.')
    expect(q('link-ask-again')).not.toBeNull()
  })

  it('refuses a programme whose stages are out of order, on the field', async () => {
    const id = corbel()
    open(`/app/projects/${id}`)
    await waitFor(() => q('edit-programme'))
    click(byTestId('edit-programme'))
    await waitFor(() => q('programme-dialog'))
    const before = getData().world.projects[id].programme
    typeInto(byTestId('programme-stage1'), before.stageStarts[0])
    click(byTestId('programme-save'))
    await waitFor(() => byTestId('programme-dialog').textContent?.includes('Each stage must start after the one before.'))
    expect(getData().world.projects[id].programme).toEqual(before)
  })

  it('saves the requirements chosen in the dialog', async () => {
    const id = corbel()
    open(`/app/projects/${id}`)
    await waitFor(() => q('requirements-choose'))
    click(byTestId('requirements-choose'))
    await waitFor(() => q('requirements-picker'))
    click(byTestId('requirements-suggested'))
    click(byTestId('requirements-save'))
    await waitFor(() => getData().world.projects[id].requirementsReviewed)
    expect(getData().world.projects[id].planningRequirementIds).toContain('la-hackney-lp33')
  })

  it('shows the pending client on Team by name only, and the pills on the projects list', async () => {
    const id = corbel()
    open(`/app/projects/${id}/team`)
    await waitFor(() => q('team-pending'))
    expect(byTestId('team-pending').textContent).toContain('Lantern Quay Developments has not accepted this project yet.')
    expect(document.body.textContent).not.toContain('isla.brennan@lanternquay.example')
    cleanup()
    open('/app/projects')
    await waitFor(() => q(`setup-pill-${id}`))
    expect(byTestId(`setup-pill-${id}`).textContent).toBe('Setting up, 0 of 6')
    expect(byTestId(`link-pill-${id}`).textContent).toBe('Waiting for client')
    expect(byTestId(`setup-next-${id}`).textContent).toBe('Next: check the programme')
  })

  it('shows the banner on the shortlist and keeps sending closed', async () => {
    const id = corbel()
    open(`/app/projects/${id}/shortlist`)
    await waitFor(() => q('client-link-banner'))
    expect((byTestId('send-to-client') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('editing project details', () => {
  it('says which requirements a move drops, and offers to review them with the new suggestions', async () => {
    open(`/app/projects/${SALLOW_ID}`)
    await waitFor(() => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Edit'))
    click(Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Edit')!)
    await waitFor(() => q('edit-project-region'))
    expect(q('edit-project-requirements-note')).toBeNull()
    choose(byTestId('edit-project-region'), 'Inner London East')
    await waitFor(() => q('edit-project-local-authority'))
    choose(byTestId('edit-project-local-authority'), 'Hackney')
    await waitFor(() => q('edit-project-requirements-note'))
    expect(byTestId('edit-project-requirements-note').textContent).toContain('2 chosen requirements no longer apply to Hackney, Inner London East. 1 more is suggested there.')
    click(byTestId('edit-project-save'))
    await waitFor(() => getData().world.projects[SALLOW_ID].localAuthority === 'Hackney')
    expect(getData().world.projects[SALLOW_ID].planningRequirementIds).not.toContain('la-camden-cc1')
    // The toast says it again and offers the review (the toaster is mounted above the router, so call its action).
    const saved = snapshot().find((t) => t.title === 'Project details saved')!
    expect(saved.description).toBe('2 chosen requirements no longer apply to Hackney, Inner London East. 1 more is suggested there.')
    expect(saved.action!.label).toBe('Review requirements')
    act(() => saved.action!.onClick())
    await waitFor(() => q('requirements-picker'))
    expect(byTestId('requirement-check-la-hackney-lp33').getAttribute('data-state')).toBe('checked')
    expect(byTestId('requirement-check-lp-si7').getAttribute('data-state')).toBe('checked')
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('the new project dialog', () => {
  it('offers Other with a description, local authorities by region and the requirements to pick', async () => {
    open('/app/projects/new')
    await waitFor(() => q('new-project-dialog'))
    expect(q('project-type-other')).toBeNull()
    choose(byTestId('project-type'), 'other')
    await waitFor(() => q('project-type-other'))
    expect(Array.from(byTestId('project-local-authority').querySelectorAll('option')).map((o) => o.textContent)).toContain('Camden')
    choose(byTestId('project-local-authority'), 'Camden')
    expect(byTestId('project-requirements-summary').textContent).toMatch(/apply to Camden, Central London, 10 suggested\./)
    click(byTestId('project-requirements-toggle'))
    await waitFor(() => q('requirements-picker'))
    expect(byTestId('requirements-picker').textContent).toContain('Policy SI 7, Reducing waste and supporting the circular economy')
    expect(byTestId('requirements-count').textContent).toBe('10 selected')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('creates a project that waits for the client, with the type text, message and requirements', async () => {
    const router = open('/app/projects/new')
    await waitFor(() => q('new-project-dialog'))
    typeInto(byTestId('project-name'), 'Corbel Yard')
    choose(byTestId('project-type'), 'other')
    await waitFor(() => q('project-type-other'))
    typeInto(byTestId('project-type-other'), 'Data centre')
    typeInto(byTestId('project-client-message'), 'Please accept so I can send the shortlist.')
    typeInto(byTestId('project-start'), '2027-09-06')
    choose(byTestId('project-local-authority'), 'Camden')
    click(byTestId('project-requirements-toggle'))
    await waitFor(() => q('requirements-picker'))
    click(byTestId('create-project'))
    await waitFor(() => /^\/app\/projects\/prj_/.test(router.state.location.pathname))
    const p = Object.values(getData().world.projects).find((x) => x.name === 'Corbel Yard')!
    expect(p.projectTypeOther).toBe('Data centre')
    expect(p.clientLink).toMatchObject({ status: 'pending', message: 'Please accept so I can send the shortlist.' })
    expect(p.localAuthority).toBe('Camden')
    expect(p.planningRequirementIds).toContain('la-camden-cc1')
    expect(p.programme.source).toBe('suggested')
    await waitFor(() => q('project-setup'))
  })

  it('shows a date error on the site start field', async () => {
    open('/app/projects/new')
    await waitFor(() => q('new-project-dialog'))
    typeInto(byTestId('project-name'), 'Corbel Yard')
    click(byTestId('create-project'))
    await waitFor(() => byTestId('new-project-dialog').textContent?.includes('Enter a valid date.'))
    expect(Object.values(getData().world.projects).some((x) => x.name === 'Corbel Yard')).toBe(false)
  })
})

describe('project requests', () => {
  it('lets Isla accept, then shows the empty state and the answered row', async () => {
    const id = corbel({ clientMessage: 'We would like to propose reclaimed steel.' })
    open('/app/projects/requests', U.isla)
    await waitFor(() => q(`link-request-${id}`))
    const card = byTestId(`link-request-${id}`)
    expect(card.textContent).toContain('Studio Oriel wants to add you as client')
    expect(card.textContent).toContain('We would like to propose reclaimed steel.')
    expect(q(`accept-link-${id}`)).not.toBeNull()
    expect(q(`decline-link-${id}`)).not.toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
    click(byTestId(`accept-link-${id}`))
    await waitFor(() => q('link-requests-empty'))
    expect(getData().world.projects[id].clientLink.status).toBe('accepted')
    expect(byTestId(`answered-${id}`).textContent).toContain('Accepted')
  })

  it('declines with a note', async () => {
    const id = corbel()
    open('/app/projects/requests', U.isla)
    await waitFor(() => q(`decline-link-${id}`))
    click(byTestId(`decline-link-${id}`))
    await waitFor(() => q('decline-link-dialog'))
    typeInto(byTestId('decline-link-note'), 'We are not the client on this scheme.')
    click(byTestId('decline-link-confirm'))
    await waitFor(() => getData().world.projects[id].clientLink.status === 'declined')
    expect(getData().world.projects[id].clientLink.decisionNote).toBe('We are not the client on this scheme.')
  })

  it('shows an empty state when nothing is waiting', async () => {
    open('/app/projects/requests', U.isla)
    await waitFor(() => q('link-requests-empty'))
    expect(byTestId('link-requests-empty').textContent).toContain('No project requests')
  })
})

describe('help', () => {
  it('lists draggable availability under Version 2 and the method notes under Methodology', async () => {
    open('/app/help/version-2')
    await waitFor(() => q('version-2'))
    expect(byTestId('version-2').textContent).toContain('Drag availability on the programme')
    cleanup()
    open('/app/help/methodology')
    await waitFor(() => q('methodology-references'))
    const text = byTestId('methodology').textContent ?? ''
    expect(text).toContain('Programme suggestions')
    expect(text).toContain('Availability is shown as the month or the three-month window the owner discloses, never the exact date.')
    expect(text).toContain('Local authority entries name the adopted plan to check; they do not summarise every policy.')
    expect(byTestId('methodology-targets').textContent).toContain('Reused and recycled content by value')
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})
