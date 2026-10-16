// @vitest-environment jsdom
// Audit of 16 October 2026, owner package, as the screens show it: the merge prompt and Move items here (note 26),
// the surveyor editing her own building's location (note 26), the testing request sheet and the footnote with no
// owner (note 27), the contractor invite by email (note 28), Add new project opening on New project (note 30), the
// Recovery plan name in Help (note 32), the owner's marketplace strip and figures (notes C5 and C6).
import { describe, expect, it } from 'vitest'
import { allText, byTestId, click, typeInto } from '../../ui/testing'
import { getData, useApp } from '../../store/app'
import { createBuilding } from '../../store/actions/owner'
import { createSurveyBuilding } from '../../store/actions/claims'
import { ORG_IDS, TIVERNE_ID } from '../../domain/seed/world'
import { AMBREY_ID, TIVERNE_TESTING_ID } from '../../sandbox/seed-owner-surveyor'
import { actor, U } from '../../test/fixtures'
import { chooseOption, expectClean, openAs, q, settle, setupScreenHarness, waitFor } from './screenHarness'

setupScreenHarness()

const PLACE = { name: 'Corbel Yard', address: '9 Lantry Street, London E1', postcodeDistrict: 'E1', localAuthority: 'Tower Hamlets', region: 'Inner London East', yearBuilt: null, storeys: null, giaM2: null, structureType: '', structure: [], stripOutStart: null, dismantlingStart: null, clearBy: null }

/** Dana adds Corbel Yard herself, then Tom adds the same building and appoints Tarnbrook. Returns both ids. */
function twoCorbels(): { mine: string; toms: string } {
  const a = createSurveyBuilding(getData(), actor(U.dana), { ...PLACE, owner: null })
  const t = createBuilding(a.state, actor(U.tom), { ...PLACE, surveyorOrgId: ORG_IDS.tarnbrook })
  useApp.getState().commit(t.state)
  return { mine: a.value!, toms: t.value! }
}

describe('moving early captures into an appointment (note 26)', () => {
  it('asks on the surveyor home, and Move items here leaves one Corbel Yard', async () => {
    const { mine, toms } = twoCorbels()
    await settle()
    const router = openAs('/app/home', U.dana)
    const callout = await waitFor(() => q(`merge-callout-${mine}`))
    expect(callout.textContent).toContain('You added Corbel Yard yourself before Ostlea Estates appointed you.')
    expectClean()
    click(byTestId(`merge-move-${mine}`))
    await waitFor(() => router.state.location.pathname === `/app/buildings/${toms}`)
    expect(getData().world.buildings[mine]).toBeUndefined()
    expect(Object.values(getData().world.buildings).filter((b) => b.name === 'Corbel Yard')).toHaveLength(1)
  })

  it('offers the same on the unlinked building, with Keep separate remembered', async () => {
    const { mine } = twoCorbels()
    await settle()
    openAs(`/app/buildings/${mine}`, U.dana)
    const callout = await waitFor(() => q(`merge-callout-${mine}`))
    expect(callout.parentElement?.parentElement?.textContent).toContain('Merge into Corbel Yard for Ostlea Estates')
    expect(q('move-into-appointment')).not.toBeNull()
    click(byTestId(`merge-keep-${mine}`))
    await settle()
    expect(q(`merge-callout-${mine}`)).toBeNull()
  })
})

describe('the surveyor corrects her own building (note 26)', () => {
  it('edits the region and local authority of Ambrey House', async () => {
    openAs(`/app/buildings/${AMBREY_ID}`, U.dana)
    click(await waitFor(() => q('edit-building')))
    const region = await waitFor(() => q('edit-region'))
    expect(q('edit-postcode')).not.toBeNull()
    chooseOption(region, 'Inner London West')
    await settle()
    chooseOption(byTestId('edit-local-authority'), 'Wandsworth')
    click(document.querySelector<HTMLElement>('button[form="edit-building-form"]')!)
    await waitFor(() => getData().world.buildings[AMBREY_ID].localAuthority === 'Wandsworth')
    expect(getData().world.buildings[AMBREY_ID].region).toBe('Inner London West')
  })
})

describe('what goes to the testing company (note 27)', () => {
  it('shows the message and the request sheet', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/testing`, U.tom)
    const card = await waitFor(() => q(`testing-${TIVERNE_TESTING_ID}`))
    expect(card.querySelector('[data-testid="testing-message"]')!.textContent).toContain('Coupons from five sections')
    click(card.querySelector<HTMLElement>('[data-testid="testing-view"]')!)
    const sheet = await waitFor(() => q('testing-sheet'))
    expect(sheet.textContent).toContain('Request to Brindmoor Testing')
    expect(sheet.textContent).toContain('Nothing is sent from the sandbox. This is what the company would receive.')
    expect(byTestId('testing-sheet-items').querySelectorAll('li')).toHaveLength(5)
    expect(q('testing-sheet-copy')).not.toBeNull()
    expect(q('testing-sheet-download')).not.toBeNull()
    expectClean()
  })

  it('does not say the owner is told on a building with no owner yet', async () => {
    openAs(`/app/buildings/${AMBREY_ID}/testing`, U.dana)
    click(await waitFor(() => q('request-testing')))
    await waitFor(() => q('testing-dialog'))
    expect(allText()).toContain('Nothing is sent in the sandbox. The request is recorded here.')
    expect(allText()).not.toContain('owner is told')
  })

  it('names the owner on a linked building', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/testing`, U.dana)
    click(await waitFor(() => q('request-testing')))
    await waitFor(() => q('testing-dialog'))
    expect(allText()).toContain('The request is recorded here and Ostlea Estates is told.')
  })
})

describe('the deconstruction contractor (note 28)', () => {
  it('invites a firm by email and shows who it waits for', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}`, U.tom)
    click(await waitFor(() => q('contractor-invite-open')))
    typeInto(byTestId('contractor-invite-email'), 'lee@shaw.example')
    click(byTestId('contractor-invite-send'))
    const pending = await waitFor(() => q('contractor-invite-pending'))
    expect(pending.textContent).toContain('Waiting for lee@shaw.example')
    expectClean()
  })
})

describe('Add new project opens on New project (note 30)', () => {
  it('from the Buildings page', async () => {
    openAs('/app/buildings', U.tom)
    click(await waitFor(() => q('add-new-project')))
    const dialog = await waitFor(() => q('new-building'))
    const chosen = Array.from(dialog.querySelectorAll('[role="radio"]')).find((b) => b.getAttribute('aria-checked') === 'true')
    expect(chosen?.textContent).toContain('New project')
    expect(dialog.textContent).toContain('Project name')
    expect(byTestId('new-building-save').textContent).toContain('Add new project')
  })

  it('from a ?new=project address, while ?new=1 still opens on Donor building', async () => {
    openAs('/app/buildings?new=project', U.tom)
    let dialog = await waitFor(() => q('new-building'))
    expect(byTestId('new-building-save').textContent).toContain('Add new project')
    expect(dialog.textContent).toContain('Add a new project')
    // Close, then open the donor way.
    click(Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Cancel')!)
    await settle()
    openAs('/app/buildings?new=1', U.tom)
    dialog = await waitFor(() => q('new-building'))
    expect(byTestId('new-building-save').textContent).toContain('Add donor building')
  })
})

describe('Recovery plan everywhere (note 32)', () => {
  it('names the ranking Recovery plan in Help, Methodology, with no Priority label left', async () => {
    openAs('/app/help/methodology', U.priya)
    await waitFor(() => (allText().includes('Recovery plan ranking') ? true : null))
    expect(allText()).toContain('Recovery plan weights')
    expect(allText()).not.toMatch(/Priorit/)
  })

  it('captions the Recovery plan table for screen readers in the same words', async () => {
    openAs(`/app/buildings/${TIVERNE_ID}/priorities`, U.tom)
    const table = await waitFor(() => q('priority-table'))
    expect((table.querySelector('caption') ?? table.closest('div')?.querySelector('caption'))?.textContent).toBe('Recovery plan ranking')
  })
})

describe('an owner who builds (notes C5 and C6)', () => {
  it('opens the Marketplace with a prompt to add a new project, and none of its own lots', async () => {
    openAs('/app/marketplace', U.tom)
    const strip = await waitFor(() => q('owner-build-strip'))
    expect(strip.textContent).toContain('Building something too?')
    expect(byTestId('owner-build-add').getAttribute('href')).toBe('/app/buildings?new=project')
    expect(allText()).not.toContain('You do not have access')
    expectClean()
  })

  it('shows the recoverable value on the owner home, in pounds and Indicative', async () => {
    openAs('/app/home', U.tom)
    const tile = await waitFor(() => q('metric-value'))
    expect(tile.textContent).toContain('Recoverable value')
    expect(tile.textContent).toMatch(/£[\d,]+/)
    expect(tile.textContent).toContain('Indicative')
    expect(q('owner-as-developer')).toBeNull()
  })
})
