// @vitest-environment jsdom
// The standalone Capture page: the building picker groups the firm's buildings by client with unconfirmed ones last,
// switching building keeps what was typed, the choice is remembered, and the page fits a phone without a placeholder.
import { describe, expect, it } from 'vitest'
import { byTestId, click, typeInto } from '../../ui/testing'
import { getData } from '../../store/app'
import { HARROWDEN_ID, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID } from '../../sandbox/seed-owner-surveyor'
import { U } from '../../test/fixtures'
import { chooseOption, expectClean, openAs, q, settle, setupScreenHarness, waitFor } from '../buildings/screenHarness'

setupScreenHarness()

describe('the standalone Capture page', () => {
  it('lists the buildings by client, with Ambrey House under Not yet linked', async () => {
    openAs('/app/capture', U.dana)
    const select = await waitFor(() => q<HTMLSelectElement>('capture-building'))
    const groups = Array.from(select.querySelectorAll('optgroup')).map((g) => [g.label, Array.from(g.querySelectorAll('option')).map((o) => o.textContent?.split(',')[0])])
    expect(groups).toEqual([
      ['Ostlea Estates', ['Tiverne House']],
      ['Brackwater Estates', ['Harrowden Court']],
      ['Not yet linked', ['Ambrey House']],
    ])
    // The default is the building with the latest capture.
    expect(select.value).toBe(AMBREY_ID)
    expect(byTestId('capture-text')).toBeTruthy()
    expectClean()
  })

  it('keeps the description when the building changes, and remembers the choice', async () => {
    const router = openAs('/app/capture', U.dana)
    const text = await waitFor(() => q<HTMLTextAreaElement>('capture-text'))
    typeInto(text, '12 no. UB 305x165x40, 6.0 m long, bolted')
    await settle()
    chooseOption(byTestId('capture-building'), HARROWDEN_ID)
    await settle()
    expect(q<HTMLTextAreaElement>('capture-text')!.value).toBe('12 no. UB 305x165x40, 6.0 m long, bolted')
    expect(router.state.location.search).toBe(`?building=${HARROWDEN_ID}`)
    expect(getData().ui.captureBuildingId[U.dana]).toBe(HARROWDEN_ID)
    expect(byTestId('capture-picker').textContent).toContain('Brackwater Estates')
  })

  it('saves into the chosen building', async () => {
    openAs(`/app/capture?building=${TIVERNE_ID}`, U.dana)
    const text = await waitFor(() => q<HTMLTextAreaElement>('capture-text'))
    typeInto(text, '30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
    await settle()
    const good = await waitFor(() => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="radio"]')).find((b) => b.textContent?.includes('A · Good')))
    click(good)
    const before = Object.values(getData().world.items).filter((i) => i.buildingId === TIVERNE_ID).length
    click(byTestId('capture-save-another'))
    await settle()
    expect(Object.values(getData().world.items).filter((i) => i.buildingId === TIVERNE_ID).length).toBe(before + 1)
  })

  it('offers an owner their own buildings, and refuses the buying side', async () => {
    openAs('/app/capture', U.tom)
    const select = await waitFor(() => q<HTMLSelectElement>('capture-building'))
    expect(Array.from(select.querySelectorAll('option')).map((o) => o.value)).toEqual([TIVERNE_ID])
    expectClean()
  })

  it('shows no data to an architect', async () => {
    openAs('/app/capture', U.priya)
    await waitFor(() => q('no-access'))
    expect(q('capture-page')).toBeNull()
  })
})
