// @vitest-environment jsdom
// The round 2 building screens: add a donor building, a new project or (as a surveyor) a building to survey; the
// structure card; the deconstruction contractor's card and Availability tab; contractor dates in the inventory;
// the Testing tab; share links on Sharing. Each renders cleanly and changes the store through its action.
import { describe, expect, it } from 'vitest'
import { allText, byTestId, cleanup, click, typeInto } from '../../ui/testing'
import { getData, useApp } from '../../store/app'
import { itemByTag, ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID, FENNICK_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import { addTestUser, U } from '../../test/fixtures'
import { chooseOption, expectClean, openAs, q, settle, setupScreenHarness, waitFor } from './screenHarness'

setupScreenHarness()

const PLACES = ['buildings', 'building-overview', 'inventory', 'testing', 'sharing']

describe('owner screens', () => {
  for (const [i, path] of ['/app/buildings', `/app/buildings/${TIVERNE_ID}`, `/app/buildings/${TIVERNE_ID}/inventory`, `/app/buildings/${TIVERNE_ID}/testing`, `/app/buildings/${TIVERNE_ID}/sharing`].entries()) {
    it(`renders ${PLACES[i]} without a placeholder or a forbidden character`, async () => {
      openAs(path, U.tom)
      await waitFor(() => q(PLACES[i]))
      expectClean()
    })
  }

  it('lists donor buildings and invites a new project', async () => {
    openAs('/app/buildings', U.tom)
    const donor = await waitFor(() => q('donor-buildings'))
    expect(donor.textContent).toContain('Tiverne House')
    expect(donor.textContent).toContain('Donor building')
    expect(byTestId('new-projects').textContent).toContain('Building something too?')
  })

  it('adds a new project with an architect, which then lists under New projects', async () => {
    const router = openAs('/app/buildings?new=1', U.tom)
    const dialog = await waitFor(() => q('new-building'))
    click(Array.from(dialog.querySelectorAll('[role="radio"]')).find((b) => b.textContent?.includes('New project'))!)
    await settle()
    typeInto(byTestId('nb-name'), 'Wexcombe House')
    chooseOption(byTestId('nb-project-type'), 'office')
    chooseOption(byTestId('nb-region'), 'Central London')
    await settle()
    chooseOption(byTestId('nb-local-authority'), 'Camden')
    typeInto(byTestId('nb-start'), '2027-09-20')
    chooseOption(byTestId('nb-architect'), ORG_IDS.oriel)
    click(byTestId('new-building-save'))
    await waitFor(() => router.state.location.pathname.startsWith('/app/projects/prj_'))
    const p = Object.values(getData().world.projects).find((x) => x.name === 'Wexcombe House')!
    expect(p.clientOrgId).toBe(getData().users[U.tom].orgId)
    expect(p.architectOrgId).toBe(ORG_IDS.oriel)
  })

  it('records the structure, and the overview summary follows', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}`, U.tom)
    const card = await waitFor(() => q('structure-card'))
    expect(card.textContent).toContain('Bolted steel frame')
    click(byTestId('structure-edit'))
    const dialog = await waitFor(() => q('structure-dialog'))
    chooseOption(dialog.querySelector('[data-testid="structure-material-roof"]')!, 'timber')
    await settle()
    click(byTestId('structure-save'))
    await settle()
    expect(getData().world.buildings[TIVERNE_ID].structure.some((e) => e.kind === 'roof' && e.material === 'timber')).toBe(true)
    await waitFor(() => byTestId('structure-card').textContent?.includes('timber roof'))
  })

  it('shows the contractor and applies its dates to private lots', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/inventory`, U.tom)
    const btn = await waitFor(() => q('apply-contractor-dates'))
    expect(btn.textContent).toBe('Use contractor dates (5)')
    expect(byTestId('inventory-table').textContent).toContain('Contractor')
    click(btn)
    await settle()
    const th07 = itemByTag(getData().world, 'TH-07')
    const lot = Object.values(getData().world.lots).find((l) => l.itemId === th07.id)!
    expect(lot.availableFrom).toBe(th07.contractorAvailableFrom)
    await waitFor(() => q('apply-contractor-dates') === null)
  })

  it('creates a share link for chosen shared lots and revokes it', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/sharing`, U.tom)
    const card = await waitFor(() => q('share-links'))
    expect(card.textContent).toContain('Primary steel for enquiries')
    expect(card.textContent).toContain('Not opened yet')
    const before = Object.keys(getData().world.shareLinks).length
    click(byTestId('create-link'))
    await waitFor(() => q('create-link-dialog'))
    click(byTestId('link-lot-TH-02'))
    typeInto(byTestId('link-label'), 'For the Hackney enquiry')
    click(byTestId('create-link-save'))
    await waitFor(() => Object.keys(getData().world.shareLinks).length === before + 1)
    const made = Object.values(getData().world.shareLinks).find((l) => l.label === 'For the Hackney enquiry')!
    click(await waitFor(() => q(`revoke-${made.id}`)))
    click(await waitFor(() => q('revoke-confirm')))
    await settle()
    expect(getData().world.shareLinks[made.id].revokedAt).not.toBeNull()
  })

  it('lists the booked testing request and records the results', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/testing`, U.tom)
    const card = await waitFor(() => q(`testing-${TIVERNE_TESTING_ID}`))
    expect(card.textContent).toContain('Brindmoor Testing')
    expect(card.textContent).toContain('Visit booked')
    click(byTestId('testing-record'))
    const dialog = await waitFor(() => q('testing-results-dialog'))
    chooseOption(dialog.querySelector('[data-testid="result-grade-TH-02"]')!, 'S355')
    click(byTestId('testing-results-save'))
    await settle()
    expect(getData().testingRequests[TIVERNE_TESTING_ID].status).toBe('results')
    expect(itemByTag(getData().world, 'TH-02').grade).toBe('S355')
    await waitFor(() => q('testing-results'))
  })
})

describe('surveyor screens', () => {
  it('shows an unlinked building with its claim, and blocks the survey until linked', async () => {
    openAs('/app/buildings', U.dana)
    const unlinked = await waitFor(() => q('unlinked-buildings'))
    expect(unlinked.textContent).toContain('Ambrey House')
    expect(unlinked.textContent).toContain('Waiting for the owner')
    expectClean()
    cleanupAndOpen(`/app/buildings/${AMBREY_ID}/inventory`)
    const bar = await waitFor(() => q('survey-bar'))
    expect(bar.textContent).toContain('Link the building to its owner first.')
    expect(byTestId('submit-survey').hasAttribute('disabled')).toBe(true)
  })

  it('adds a building to survey and asks its owner by email', async () => {
    const router = openAs('/app/buildings?new=1', U.dana)
    await waitFor(() => q('new-building'))
    expect(allText()).toContain('Add a building to survey')
    typeInto(byTestId('nb-name'), 'Corbel Yard')
    typeInto(byTestId('nb-address'), '14 Corbel Lane, London SE1')
    chooseOption(byTestId('nb-region'), 'Central London')
    typeInto(byTestId('nb-owner-email'), 'tom.ashby@ostlea.example')
    click(byTestId('new-building-save'))
    await waitFor(() => router.state.location.pathname.startsWith('/app/buildings/bld_'))
    const b = Object.values(getData().world.buildings).find((x) => x.name === 'Corbel Yard')!
    expect(b.ownerOrgId).toBeNull()
    expect(Object.values(getData().buildingClaims).some((c) => c.buildingId === b.id && c.status === 'pending')).toBe(true)
    await waitFor(() => byTestId('building-client').textContent?.includes('Waiting for tom.ashby@ostlea.example'))
  })

  it('gives the contractor an Availability tab that saves its months', async () => {
    const r = addTestUser(getData(), { orgId: FENNICK_ID, name: 'Lee Shaw', email: 'lee.shaw@fennick.example' })
    useApp.getState().commit(r.state)
    openAs(`/app/buildings/${TIVERNE_ID}/availability`, r.userId)
    await waitFor(() => q('availability-table'))
    expect(byTestId('availability-count').textContent).toBe('Dates set for 5 of 11 items')
    expectClean()
    click(byTestId('fill-blanks'))
    await settle()
    click(byTestId('save-dates'))
    await settle()
    const items = Object.values(getData().world.items).filter((i) => i.buildingId === TIVERNE_ID)
    expect(items.every((i) => i.contractorAvailableFrom !== null)).toBe(true)
  })
})

function cleanupAndOpen(path: string) {
  cleanup()
  openAs(path, U.dana)
}
