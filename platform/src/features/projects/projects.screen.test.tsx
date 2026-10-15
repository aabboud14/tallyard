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

describe("an owner's New project with no architect", () => {
  function wexcombe(): string {
    const r = createOwnerProject(getData(), { userId: U.tom, now: NOW }, { name: 'Wexcombe House', projectType: 'office', localAuthority: 'Camden', region: 'Central London', ribaStage: 2, startDate: '2027-09-20', architectOrgId: null })
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    return r.value as string
  }

  it('asks the owner to appoint an architect on the overview, with no blank architect anywhere', async () => {
    const id = wexcombe()
    open(`/app/projects/${id}`, U.tom)
    await waitFor(() => q('appoint-architect-card'))
    expect(byTestId('appoint-architect-card').textContent).toContain('Appoint an architect to start sourcing')
    expect(byTestId('project-details').textContent).toContain('Not appointed yet')
    expect(byTestId('next-steps').textContent).toContain('Appoint an architect to start sourcing')
    expect(byTestId('next-steps').textContent).not.toContain('You are up to date')
    expect(byTestId('requirements-card').textContent).toContain('Appoint an architect to choose which requirements apply.')
    expect(allText()).not.toMatch(FORBIDDEN)
    choose(byTestId('appoint-architect-card-select'), ORG_IDS.oriel)
    click(byTestId('appoint-architect-card-save'))
    await waitFor(() => getData().world.projects[id].architectOrgId === ORG_IDS.oriel)
    await waitFor(() => !q('appoint-architect-card'))
    expect(byTestId('project-details').textContent).toContain('Studio Oriel')
  })

  it('shows only the client on Team, with the appoint card in place of an empty architect block', async () => {
    const id = wexcombe()
    open(`/app/projects/${id}/team`, U.tom)
    await waitFor(() => q('team-appoint-architect'))
    const main = document.querySelector('main')!.textContent ?? ''
    expect(main).not.toContain('Architect ·')
    expect(main).not.toContain('No one from has joined')
    expect(document.querySelectorAll('[data-testid^="team-org_"]')).toHaveLength(1)
    choose(byTestId('team-appoint-architect-select'), ORG_IDS.oriel)
    click(byTestId('team-appoint-architect-save'))
    await waitFor(() => q(`team-${ORG_IDS.oriel}`))
    expect(q('team-appoint-architect')).toBeNull()
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
