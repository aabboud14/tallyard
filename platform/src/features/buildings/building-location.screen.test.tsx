// @vitest-environment jsdom
// A donor building's location (requirements follow-up review, 16 October 2026): the Add a building dialog uses the
// same grouped region and local authority fields as the project forms, so choosing a borough sets its region and a
// listed authority typed under another region is refused; the owner can move a building in Edit details, which says
// what the move does to the requirements before demolition; and the Requirements tab counts what is at risk.
import { describe, expect, it } from 'vitest'
import { byTestId, click, typeInto } from '../../ui/testing'
import { getData } from '../../store/app'
import { TIVERNE_ID } from '../../domain/seed/world'
import { U } from '../../test/fixtures'
import { chooseOption, expectClean, openAs, q, settle, setupScreenHarness, waitFor } from './screenHarness'

setupScreenHarness()

describe('adding a donor building', () => {
  it('finds a borough in the grouped list, which sets the region, and the building tracks its written policy', async () => {
    const router = openAs('/app/buildings?new=1', U.tom)
    const dialog = await waitFor(() => q('new-building'))
    const la = byTestId('nb-local-authority') as HTMLSelectElement
    expect(Array.from(la.querySelectorAll('optgroup')).map((g) => g.label)).toContain('Central London')
    expect(Array.from(la.options).some((o) => o.value === '__other__')).toBe(false)
    typeInto(byTestId('nb-name'), 'Wexcombe House')
    typeInto(byTestId('nb-address'), '9 Lantry Street, London W1')
    chooseOption(la, 'Westminster')
    await settle()
    expect((byTestId('nb-region') as HTMLSelectElement).value).toBe('Central London')
    expect(dialog.textContent).toContain('Covers City of London, Westminster')
    expectClean()
    click(byTestId('new-building-save'))
    await waitFor(() => router.state.location.pathname.startsWith('/app/buildings/bld_'))
    const b = Object.values(getData().world.buildings).find((x) => x.name === 'Wexcombe House')!
    expect(b).toMatchObject({ region: 'Central London', localAuthority: 'Westminster' })
  })

  it('says where a typed listed authority is, and refuses it under another region', async () => {
    openAs('/app/buildings?new=1', U.tom)
    await waitFor(() => q('new-building'))
    typeInto(byTestId('nb-name'), 'Wexcombe House')
    typeInto(byTestId('nb-address'), '9 Lantry Street, Reading')
    chooseOption(byTestId('nb-region'), 'South East')
    await settle()
    chooseOption(byTestId('nb-local-authority'), '__other__')
    await settle()
    typeInto(byTestId('nb-local-authority-other'), 'camden')
    await settle()
    expect(byTestId('new-building').textContent).toContain('Camden is listed under Central London. Choose it from the list to set the region.')
    const before = Object.keys(getData().world.buildings).length
    click(byTestId('new-building-save'))
    const error = await waitFor(() => q('new-building-error'))
    expect(error.textContent).toBe('Choose a local authority in this region.')
    expect(Object.keys(getData().world.buildings)).toHaveLength(before)
  })
})

describe("editing a donor building's details", () => {
  it('moves it, saying what the move does to the requirements, and the Requirements tab counts what is at risk', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}`, U.tom)
    await waitFor(() => q('edit-building'))
    expect(byTestId('tab-requirements').textContent).toBe('Requirements1')
    click(byTestId('edit-building'))
    await waitFor(() => q('edit-building-local-authority'))
    expect((byTestId('edit-building-region') as HTMLSelectElement).value).toBe('Central London')
    expect((byTestId('edit-building-local-authority') as HTMLSelectElement).value).toBe('City of London')
    expect(q('edit-building-requirements-note')).toBeNull()
    chooseOption(byTestId('edit-building-local-authority'), 'Camden')
    await settle()
    expect(byTestId('edit-building-requirements-note').textContent).toBe('1 requirement before demolition no longer applies to Camden, Central London. 1 more is tracked there. Statuses and evidence stay with the ones that still apply.')
    expectClean()
    const dialog = document.querySelector('[role="dialog"]')!
    click(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Save')!)
    await waitFor(() => getData().world.buildings[TIVERNE_ID].localAuthority === 'Camden')
    expect(getData().world.buildings[TIVERNE_ID].region).toBe('Central London')
  })
})
