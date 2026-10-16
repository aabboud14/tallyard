// @vitest-environment jsdom
// Audit of 16 October 2026, owner package, after the adversarial review, as the screens show it: the duplicate warning
// on a request to confirm a building and Confirm as your Corbel Yard; the unlinked building's own prompt; the
// Simulated label and the preferred date on the testing sheet; the contractor invite saying whose dates go; the
// contractor-only home; and the building's All activity page.
import { describe, expect, it } from 'vitest'
import { allText, byTestId, click, typeInto } from '../../ui/testing'
import { getData, useApp } from '../../store/app'
import { createBuilding } from '../../store/actions/owner'
import { createSurveyBuilding } from '../../store/actions/claims'
import { inviteContractorByEmail } from '../../store/actions/contractor'
import { signUpState } from '../../store/actions/auth'
import { ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import { actor, NOW, U } from '../../test/fixtures'
import { expectClean, openAs, q, settle, setupScreenHarness, waitFor } from './screenHarness'

setupScreenHarness()

const PLACE = { name: 'Corbel Yard', address: '9 Lantry Street, London E1', postcodeDistrict: 'E1', localAuthority: 'Tower Hamlets', region: 'Inner London East', yearBuilt: null, storeys: null, giaM2: null, structureType: '', structure: [], stripOutStart: null, dismantlingStart: null, clearBy: null }

/** Dana adds Corbel Yard (asking Tom to confirm it when `ask`), then Tom adds the same building and appoints Tarnbrook. */
function twoCorbels(ask: boolean): { mine: string; toms: string } {
  const a = createSurveyBuilding(getData(), actor(U.dana), { ...PLACE, owner: ask ? { email: 'tom.ashby@ostlea.example', name: 'Tom Ashby', message: '' } : null })
  const t = createBuilding(a.state, actor(U.tom), { ...PLACE, surveyorOrgId: ORG_IDS.tarnbrook })
  useApp.getState().commit(t.state)
  return { mine: a.value!, toms: t.value! }
}

describe('a request for a building the owner already has (review finding on note 26)', () => {
  it('warns on the request and confirms into the existing building', async () => {
    const { mine, toms } = twoCorbels(true)
    await settle()
    const router = openAs('/app/requests?tab=buildings', U.tom)
    const warning = await waitFor(() => q(`claim-duplicate-${mine}`))
    expect(warning.textContent).toContain('You already have Corbel Yard with Tarnbrook Deconstruction as surveyor.')
    expect(byTestId(`claim-confirm-${mine}`).textContent).toContain('Add as a separate building')
    expect(byTestId(`claim-confirm-into-${mine}`).textContent).toContain('Confirm as your Corbel Yard')
    expectClean()
    click(byTestId(`claim-confirm-into-${mine}`))
    await waitFor(() => router.state.location.pathname === `/app/buildings/${toms}`)
    expect(Object.values(getData().world.buildings).filter((b) => b.name === 'Corbel Yard')).toHaveLength(1)
  })

  it('keeps the plain confirm when there is no twin', async () => {
    openAs('/app/requests?tab=buildings', U.tom)
    const confirm = await waitFor(() => q(`claim-confirm-${AMBREY_ID}`))
    expect(confirm.textContent).toContain('Confirm it is ours')
    expect(q(`claim-duplicate-${AMBREY_ID}`)).toBeNull()
    expect(q(`claim-confirm-into-${AMBREY_ID}`)).toBeNull()
  })
})

describe('the prompt on the unlinked building (review finding on note 26)', () => {
  it('says the items leave this record for the appointment', async () => {
    const { mine } = twoCorbels(false)
    await settle()
    openAs(`/app/buildings/${mine}`, U.dana)
    const callout = await waitFor(() => q(`merge-callout-${mine}`))
    expect(callout.textContent).toContain('Ostlea Estates has since appointed you to Corbel Yard. Merge this record into it?')
    expect(byTestId(`merge-move-${mine}`).textContent).toContain('Move into their Corbel Yard')
    expect(callout.textContent).not.toContain('Move items here')
  })
})

describe('the testing request sheet (review finding on note 27)', () => {
  it('carries the Simulated label and the same preferred date line as the text', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/testing`, U.tom)
    const card = await waitFor(() => q(`testing-${TIVERNE_TESTING_ID}`))
    click(card.querySelector<HTMLElement>('[data-testid="testing-view"]')!)
    await waitFor(() => q('testing-sheet'))
    expect(byTestId('testing-sheet-simulated').textContent).toContain('Simulated')
    expect(byTestId('testing-sheet-preferred').textContent).toMatch(/^Preferred from: /)
    expect(allText()).not.toContain('any date')
  })
})

describe('the contractor invite (review finding on note 28)', () => {
  it('says the current contractor\'s dates are cleared when the invited firm joins', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}`, U.tom)
    click(await waitFor(() => q('contractor-invite-open')))
    typeInto(byTestId('contractor-invite-email'), 'lee@shaw.example')
    click(byTestId('contractor-invite-send'))
    const clears = await waitFor(() => q('contractor-invite-clears'))
    expect(clears.textContent).toBe("Fennick Dismantling's 5 dates are cleared when they join.")
    expect(allText()).toContain("Fennick Dismantling's 5 dates are cleared when they join.")
  })
})

describe('a firm that only dates buildings (review finding)', () => {
  it('sees dating tiles on its home, not capture and survey counts', async () => {
    const r = inviteContractorByEmail(getData(), actor(U.tom), TIVERNE_ID, 'lee@shaw.example')
    const lee = signUpState(r.state, { name: 'Lee Shaw', email: 'lee@shaw.example', orgName: 'Shaw Surveys', orgType: 'Surveying or deconstruction firm', salt: 's', passwordHash: 'h', now: NOW })
    useApp.getState().commit(lee.state)
    await settle()
    openAs('/app/home', lee.value!)
    await waitFor(() => q('metric-dated'))
    expect(q('metric-to-date')).not.toBeNull()
    expect(q('metric-undated')).not.toBeNull()
    expect(q('metric-items')).toBeNull()
    expect(q('metric-open')).toBeNull()
    expect(q('home-capture')).toBeNull()
  })
})

describe('a building\'s activity (incidental from the audit)', () => {
  it('links All activity from the overview to a page of every update by day', async () => {
    const router = openAs(`/app/buildings/${TIVERNE_ID}`, U.tom)
    click(await waitFor(() => q('building-activity-all')))
    await waitFor(() => router.state.location.pathname === `/app/buildings/${TIVERNE_ID}/activity`)
    const page = await waitFor(() => q('building-activity-page'))
    expect(page.querySelectorAll('li').length).toBeGreaterThan(0)
    expectClean()
  })
})
