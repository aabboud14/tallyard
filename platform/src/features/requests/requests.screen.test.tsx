// @vitest-environment jsdom
// The donor building owner's Requests page: reservations and buildings to confirm on two tabs. Confirming Ambrey
// House moves it into Donor buildings in the sidebar; declining keeps the owner's name from the surveyor.
import { describe, expect, it } from 'vitest'
import { byTestId, click, typeInto } from '../../ui/testing'
import { getData } from '../../store/app'
import { AMBREY_ID } from '../../sandbox/seed-owner-surveyor'
import { U } from '../../test/fixtures'
import { expectClean, openAs, q, settle, setupScreenHarness, waitFor } from '../buildings/screenHarness'

setupScreenHarness()

function sidebarText(): string {
  return document.querySelector('nav')?.textContent ?? ''
}

describe('Requests, Buildings tab', () => {
  it('shows the Ambrey House claim with who added it and what was captured', async () => {
    openAs('/app/requests?tab=buildings', U.tom)
    const card = await waitFor(() => q(`claim-${AMBREY_ID}`))
    expect(card.textContent).toContain('Ambrey House')
    expect(card.textContent).toContain('Tarnbrook Deconstruction')
    expect(card.textContent).toContain('Dana Kowalski')
    expect(card.textContent).toContain('2 items')
    expect(card.textContent).toContain('We surveyed Ambrey House ahead of the strip-out tender.')
    expect(byTestId('requests').textContent).toContain('Buildings 1')
    expectClean()
  })

  it('confirming moves it to Donor buildings in the sidebar and opens it', async () => {
    const router = openAs('/app/requests?tab=buildings', U.tom)
    await waitFor(() => q(`claim-${AMBREY_ID}`))
    expect(sidebarText()).not.toContain('Ambrey House')
    click(byTestId(`claim-confirm-${AMBREY_ID}`))
    await waitFor(() => router.state.location.pathname === `/app/buildings/${AMBREY_ID}`)
    await waitFor(() => sidebarText().includes('Ambrey House'))
    expect(getData().world.buildings[AMBREY_ID].ownerOrgId).toBe(getData().users[U.tom].orgId)
  })

  it('declining asks for an optional note and keeps the building with the surveyor', async () => {
    openAs('/app/requests?tab=buildings', U.tom)
    await waitFor(() => q(`claim-${AMBREY_ID}`))
    click(byTestId(`claim-decline-${AMBREY_ID}`))
    const dialog = await waitFor(() => q('claim-decline-dialog'))
    typeInto(dialog.querySelector('textarea')!, 'We sold this building in 2025.')
    click(byTestId('claim-decline-confirm'))
    await settle()
    expect(getData().world.buildings[AMBREY_ID].ownerOrgId).toBeNull()
    await waitFor(() => byTestId('requests').textContent?.includes('Buildings 0'))
    expect(byTestId('building-claims').textContent).toContain('Not ours')
  })

  it('opens on reservations by default while any wait, with the blind buyer', async () => {
    openAs('/app/requests', U.tom)
    await waitFor(() => q('reservation-requests'))
    expect(q('blind-buyer')).not.toBeNull()
    expectClean()
  })
})
