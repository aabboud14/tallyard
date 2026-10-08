// @vitest-environment jsdom
// The version 1.0 shell on the real route table: role and access gates, the not-found screen, the rail with its
// version 2 entry, the project home redirect and the persona switcher (brief/09-V1-PRODUCT.md sections 4 and 13.13).
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '../../app/routes'
import { useStore } from '../../store/store'
import { createSeed, PERSONA_IDS, HARROWDEN_ID, MERROWGATE_ID, SALLOW_ID, TIVERNE_ID, DURNLEY_ID } from '../../domain/seed/world'
import { NOT_AVAILABLE_TO_ROLE } from '../../domain/reference/labels'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null
let router: ReturnType<typeof createMemoryRouter> | null = null

async function open(personaId: string, path: string) {
  useStore.setState({ world: createSeed(), personaId })
  router = createMemoryRouter(routes, { initialEntries: [path] })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root!.render(<RouterProvider router={router!} />))
}

function q(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
}
function rail(): HTMLElement {
  const el = q('rail')
  if (!el) throw new Error('No rail')
  return el
}
function inRail(id: string): HTMLElement | null {
  return rail().querySelector<HTMLElement>(`[data-testid="${id}"]`)
}
function path(): string {
  return router!.state.location.pathname
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  router = null
  document.body.innerHTML = ''
})

describe('gates', () => {
  it.each([
    ['the owner on another owner building', PERSONA_IDS.tom, `/buildings/${HARROWDEN_ID}/inventory`],
    ['the owner on an architect project screen', PERSONA_IDS.tom, `/projects/${MERROWGATE_ID}/wishlist`],
    ['the client on a project that is not hers', PERSONA_IDS.isla, `/projects/${SALLOW_ID}/approvals`],
    ['the architect on the deals of her own project', PERSONA_IDS.priya, `/projects/${MERROWGATE_ID}/deals`],
    ['the architect on the reuse plan', PERSONA_IDS.priya, `/projects/${MERROWGATE_ID}/plan`],
    ['the architect on a building', PERSONA_IDS.priya, `/buildings/${TIVERNE_ID}/inventory`],
    ['the architect on offers', PERSONA_IDS.priya, '/offers'],
    ['the client on the architect screens', PERSONA_IDS.isla, '/market/shared'],
    ['the surveyor on priority', PERSONA_IDS.dana, `/buildings/${TIVERNE_ID}/priority`],
    ['the owner on a waste engagement', PERSONA_IDS.tom, `/engagements/${DURNLEY_ID}/waste`],
    ['anyone on an unknown project', PERSONA_IDS.priya, '/projects/prj_unknown/wishlist'],
  ])('%s reads "Not available to this role"', async (_name, personaId, at) => {
    await open(personaId, at)
    const main = document.querySelector('main')!
    expect(q('not-available')).not.toBeNull()
    expect(main.textContent).toContain(NOT_AVAILABLE_TO_ROLE)
    expect(main.textContent).not.toContain('Harrowden')
  })

  it('an unknown address shows the not-found screen with a link to the start', async () => {
    await open(PERSONA_IDS.priya, '/supply/capture')
    expect(q('not-found')).not.toBeNull()
    expect(q('not-found-start')?.getAttribute('href')).toBe('/')
  })
})

describe('project home', () => {
  it.each([
    [PERSONA_IDS.priya, 'wishlist'],
    [PERSONA_IDS.isla, 'approvals'],
    [PERSONA_IDS.marcus, 'compliance'],
  ])('%s opens on the role screen', async (personaId, child) => {
    await open(personaId, `/projects/${MERROWGATE_ID}`)
    expect(path()).toBe(`/projects/${MERROWGATE_ID}/${child}`)
  })
})

describe('rail', () => {
  it('the landing page has no rail and no menu button', async () => {
    await open(PERSONA_IDS.priya, '/')
    expect(q('rail')).toBeNull()
    expect(q('open-rail')).toBeNull()
    expect(q('label-L1')).not.toBeNull()
  })

  it('the architect sees the active project open, its match schedule greyed with V2 and still navigable', async () => {
    await open(PERSONA_IDS.priya, `/projects/${MERROWGATE_ID}/wishlist`)
    expect(inRail(`nav-project-${MERROWGATE_ID}`)?.getAttribute('aria-expanded')).toBe('true')
    expect(inRail(`nav-project-${SALLOW_ID}`)?.getAttribute('aria-expanded')).toBe('false')
    expect(inRail(`nav-${MERROWGATE_ID}-wishlist`)?.getAttribute('aria-current')).toBe('page')
    const match = inRail(`nav-${MERROWGATE_ID}-match`)!
    expect(match.getAttribute('aria-disabled')).toBe('true')
    expect(match.getAttribute('href')).toBe(`/projects/${MERROWGATE_ID}/match`)
    expect(inRail(`nav-${MERROWGATE_ID}-match-v2`)?.textContent).toBe('V2')
    const text = rail().textContent ?? ''
    for (const word of ['Deals', 'Reuse plan', 'Approvals']) expect(text).not.toContain(word)
  })

  it('a folder opens and closes', async () => {
    await open(PERSONA_IDS.priya, '/market')
    const sallow = inRail(`nav-project-${SALLOW_ID}`)!
    expect(inRail(`nav-${SALLOW_ID}-wishlist`)).toBeNull()
    await act(async () => sallow.click())
    expect(sallow.getAttribute('aria-expanded')).toBe('true')
    expect(inRail(`nav-${SALLOW_ID}-wishlist`)).not.toBeNull()
    await act(async () => sallow.click())
    expect(inRail(`nav-${SALLOW_ID}-wishlist`)).toBeNull()
  })

  it('the selling owner never sees the other owner building', async () => {
    await open(PERSONA_IDS.tom, '/offers')
    expect(rail().textContent).toContain('Tiverne House')
    expect(rail().textContent).not.toContain('Harrowden')
  })

  it('every rail control is at least 44 px tall', async () => {
    await open(PERSONA_IDS.dana, `/buildings/${TIVERNE_ID}/inventory`)
    const controls = rail().querySelectorAll('a, button')
    expect(controls.length).toBeGreaterThan(3)
    for (const c of controls) expect(c.className, c.textContent ?? '').toContain('min-h-[44px]')
  })
})

describe('persona switcher', () => {
  it('groups personas by role with their organisation and lists Isla Brennan', async () => {
    await open(PERSONA_IDS.tom, '/offers')
    const select = q('persona-switcher') as HTMLSelectElement
    const groups = [...select.querySelectorAll('optgroup')].map((g) => g.label)
    expect(groups).toEqual(['Site surveyor', 'Asset owner', 'Architect', 'Asset owner, client of Merrowgate Wharf', 'Sustainability consultant', 'Platform operator'])
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent)
    expect(options).toContain('Isla Brennan, Lantern Quay Developments')
  })

  it.each([
    [PERSONA_IDS.priya, '/market'],
    [PERSONA_IDS.isla, `/projects/${MERROWGATE_ID}/approvals`],
    [PERSONA_IDS.dana, `/buildings/${TIVERNE_ID}/capture`],
    [PERSONA_IDS.tom, `/buildings/${TIVERNE_ID}/inventory`],
    [PERSONA_IDS.marcus, `/projects/${MERROWGATE_ID}/compliance`],
    [PERSONA_IDS.operator, '/operator/ledger'],
  ])('picking %s opens that role home', async (personaId, home) => {
    await open(PERSONA_IDS.priya, '/about')
    const select = q('persona-switcher') as HTMLSelectElement
    await act(async () => {
      select.value = personaId
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(useStore.getState().personaId).toBe(personaId)
    expect(path()).toBe(home)
  })
})
