// @vitest-environment jsdom
// Round 2 renames on sign-up: owners are donor building owners and the surveyor type covers deconstruction firms.
// A new surveying firm has no appointments yet, but can add a building and start capturing at once.
import { describe, expect, it } from 'vitest'
import { allText, byTestId, click, typeInto } from '../../ui/testing'
import { getData, useApp } from '../../store/app'
import { signUpState } from '../../store/actions/auth'
import { expectClean, NOW, openAs, q, setupScreenHarness, waitFor } from '../buildings/screenHarness'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '../../ui/testing'
import { routes } from '../../app/router'

setupScreenHarness()

describe('sign-up labels', () => {
  it('offers Donor building owner and Surveying or deconstruction firm', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/signup'] })
    render(<RouterProvider router={router} />, { router: false })
    typeInto(await waitFor(() => q('signup-name')), 'Lee Shaw')
    typeInto(byTestId('signup-email'), 'lee.shaw@shawsurveys.example')
    typeInto(document.querySelector('input[type=password]')!, 'sandbox-pass')
    click(byTestId('signup-continue'))
    await waitFor(() => q('signup-org'))
    const text = allText()
    expect(text).toContain('Donor building owner')
    expect(text).toContain('List what your buildings hold, and source for new ones')
    expect(text).toContain('Surveying or deconstruction firm')
    expect(text).toContain('Survey buildings and plan when materials come out')
    expect(text).not.toContain('Asset owner')
  })

  it('gives a new surveying firm no appointments yet and an Add building action', async () => {
    const r = signUpState(getData(), { name: 'Lee Shaw', email: 'lee.shaw@shawsurveys.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW })
    expect(r.error).toBeNull()
    useApp.getState().commit(r.state)
    openAs('/app/buildings', r.value!)
    await waitFor(() => allText().includes('No appointments yet'))
    expect(q('add-building-empty')?.textContent).toBe('Add building')
    expectClean()
  })
})
