// @vitest-environment jsdom
// The share link page: the terms first, then the lots as anonymous listings; the owner's own organisation sees a
// preview; a revoked or unknown link reads as no longer active. The owner's label for the link never shows.
import { describe, expect, it } from 'vitest'
import { allText, byTestId, click } from '../../ui/testing'
import { getData, useApp } from '../../store/app'
import { revokeShareLink } from '../../store/actions/links'
import { TIVERNE_LINK_ID } from '../../sandbox/seed-owner-surveyor'
import { actor, U } from '../../test/fixtures'
import { expectClean, openAs, q, settle, setupScreenHarness, waitFor } from '../buildings/screenHarness'

setupScreenHarness()

describe('the share link page', () => {
  it('asks an architect to accept the terms, then shows the lots as listings', async () => {
    openAs(`/app/links/${TIVERNE_LINK_ID}`, U.priya)
    const terms = await waitFor(() => q('link-terms'))
    expect(terms.textContent).toContain('A donor building owner shared 5 lots with you.')
    expect(q('link-cards')).toBeNull()
    expectClean()
    click(byTestId('link-accept'))
    const cards = await waitFor(() => q('link-cards'))
    expect(cards.querySelectorAll('[data-testid^="card-L-"]').length).toBe(5)
    expect(getData().world.shareLinks[TIVERNE_LINK_ID].opens.length).toBe(1)
    const text = allText()
    expect(text).not.toContain('Primary steel for enquiries')
    expect(text).not.toContain('Tiverne')
    expect(text).not.toContain('Ostlea')
    expectClean()
  })

  it('shows the owner a preview, with the same anonymous cards', async () => {
    openAs(`/app/links/${TIVERNE_LINK_ID}`, U.tom)
    const cards = await waitFor(() => q('link-cards'))
    expect(cards.querySelectorAll('[data-testid^="card-L-"]').length).toBe(5)
    expect(allText()).toContain('This is how people with the link see your lots.')
    expect(getData().world.shareLinks[TIVERNE_LINK_ID].opens).toEqual([])
  })

  it('opens the facts in a sheet for a surveyor, who has no material page', async () => {
    openAs(`/app/links/${TIVERNE_LINK_ID}`, U.dana)
    click(await waitFor(() => q('link-accept')))
    const cards = await waitFor(() => q('link-cards'))
    const first = cards.querySelector<HTMLAnchorElement>('a')!
    expect(first.getAttribute('href')).toMatch(/\?card=L-/)
  })

  it('reads as no longer active once revoked, and for an unknown address', async () => {
    const r = revokeShareLink(getData(), actor(U.tom), TIVERNE_LINK_ID)
    useApp.getState().commit(r.state)
    await settle()
    openAs(`/app/links/${TIVERNE_LINK_ID}`, U.priya)
    const gone = await waitFor(() => q('link-inactive'))
    expect(gone.textContent).toContain('This link is no longer active')
    expectClean()
  })

  it('reads as no longer active for an address that does not exist', async () => {
    openAs('/app/links/lnk_nothere', U.isla)
    await waitFor(() => q('link-inactive'))
  })
})
