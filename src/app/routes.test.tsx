// @vitest-environment jsdom
// Every route in the map resolves without error for every persona that can reach it (brief/09-V1-PRODUCT.md section 4).
// Reachable means: a rail entry, a role home, a folder home, an item or plan item under a reachable screen, a listing,
// and the shared screens. Each must render a page title, no error state and, for the persona's own routes, no
// "Not available to this role".
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './routes'
import { homeFor, railFor, type NavItem } from './nav'
import { useStore } from '../store/store'
import { buildingsFor, engagementsFor, projectsFor } from '../domain/access'
import { createSeed, PERSONA_IDS, MERROWGATE_ID } from '../domain/seed/world'
import { ERROR_STATE, NOT_AVAILABLE_TO_ROLE } from '../domain/reference/labels'
import type { World } from '../domain/types'
import { runDemoSteps } from '../store/demo'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  document.body.innerHTML = ''
})

async function render(world: World, personaId: string, path: string): Promise<string> {
  useStore.setState({ world: structuredClone(world), personaId })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root!.render(<RouterProvider router={router} />))
  const main = host.querySelector('main')
  const text = main?.textContent ?? ''
  const titled = !!main?.querySelector('h1')
  act(() => root!.unmount())
  host.remove()
  root = null
  host = null
  return (titled ? '' : '[no page title] ') + text
}

function leaves(items: NavItem[]): string[] {
  return items.flatMap((i) => [i.to, ...leaves(i.children ?? [])])
}

/** Every route the persona can reach in this world, from the rail, the homes and the records behind them. */
function reachable(world: World, personaId: string): string[] {
  const out = new Set<string>(['/market', '/assumptions', '/about', homeFor(world, personaId)])
  for (const s of railFor(world, personaId)) for (const to of leaves(s.items)) out.add(to)
  for (const p of projectsFor(world, personaId)) {
    out.add(`/projects/${p.id}`)
    if (out.has(`/projects/${p.id}/plan`)) for (const i of p.planItems) out.add(`/projects/${p.id}/plan/${i.id}`)
  }
  for (const b of buildingsFor(world, personaId)) {
    out.add(`/buildings/${b.id}`)
    for (const i of Object.values(world.items).filter((x) => x.buildingId === b.id)) out.add(`/buildings/${b.id}/inventory/${i.id}`)
  }
  for (const e of engagementsFor(world, personaId)) out.add(`/engagements/${e.id}`)
  for (const lot of Object.values(world.lots)) out.add(`/market/${lot.publicId}`)
  return [...out]
}

const PERSONAS = Object.values(PERSONA_IDS)

/** The building, project or engagement a screen must name, so a screen never shows another record than its URL's. */
function namedRecord(world: World, path: string): string | null {
  const b = /^\/buildings\/([^/]+)\/(inventory|capture|priority|listings)$/.exec(path)
  if (b) return world.buildings[b[1]].name
  const p = /^\/projects\/([^/]+)\/(plan|deals|compliance)$/.exec(path)
  if (p) return world.projects[p[1]].name
  const e = /^\/engagements\/([^/]+)\/waste$/.exec(path)
  if (e) return world.engagements[e[1]].name
  return null
}

function check(world: World, personaId: string, path: string, text: string) {
  const where = `${personaId} ${path}`
  expect(text, where).not.toContain(ERROR_STATE)
  expect(text, where).not.toContain('[no page title]')
  if (!path.startsWith('/market/')) expect(text, where).not.toContain(NOT_AVAILABLE_TO_ROLE)
  const name = namedRecord(world, path)
  if (name) expect(text, where).toContain(name)
}

describe('every reachable route renders', () => {
  it.each(PERSONAS)('on the fresh seed, as %s', async (personaId) => {
    const world = createSeed()
    for (const path of reachable(world, personaId)) {
      check(world, personaId, path, await render(world, personaId, path))
    }
  })

  it.each(PERSONAS)('after the twelve demo steps, as %s', async (personaId) => {
    await runDemoSteps(1, 12)
    const world = structuredClone(useStore.getState().world)
    expect(world.projects[MERROWGATE_ID].planItems.length).toBeGreaterThan(0)
    for (const path of reachable(world, personaId)) {
      check(world, personaId, path, await render(world, personaId, path))
    }
  })
})

describe('operator screens open only for the operator', () => {
  it('shows "Not available to this role" on the ledger and models to every other persona, after the twelve steps', async () => {
    await runDemoSteps(1, 12)
    const world = structuredClone(useStore.getState().world)
    for (const personaId of PERSONAS.filter((p) => p !== PERSONA_IDS.operator)) {
      for (const path of ['/operator/ledger', '/operator/models']) {
        const text = await render(world, personaId, path)
        expect(text, `${personaId} ${path}`).toContain(NOT_AVAILABLE_TO_ROLE)
        expect(text, `${personaId} ${path}`).not.toContain('Commission')
      }
    }
  })
})

describe('P11: no negotiation, mandate, offer or deal on any architect route', () => {
  const BANNED_IDS = ['negotiat', 'mandate', 'buyer-approve', 'offer', 'deal']
  const BANNED_TEXT = ['Negotiation', 'Mandate', 'Deals']
  const SHARED = new Set<string>([])

  async function scan(world: World, path: string): Promise<string[]> {
    useStore.setState({ world: structuredClone(world), personaId: PERSONA_IDS.priya })
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => root!.render(<RouterProvider router={router} />))
    const found: string[] = []
    for (const el of document.querySelectorAll('[data-testid]')) {
      const id = el.getAttribute('data-testid') ?? ''
      for (const b of BANNED_IDS) if (id.toLowerCase().includes(b)) found.push(`${path}: test id ${id}`)
    }
    const text = document.body.textContent ?? ''
    for (const t of BANNED_TEXT) if (text.includes(t)) found.push(`${path}: text ${t}`)
    act(() => root!.unmount())
    host.remove()
    root = null
    host = null
    return found
  }

  it.each([
    ['the fresh seed', false],
    ['after the twelve demo steps', true],
  ])('on %s', async (_label, replay) => {
    if (replay) await runDemoSteps(1, 12)
    const world = replay ? structuredClone(useStore.getState().world) : createSeed()
    const found: string[] = []
    for (const path of reachable(world, PERSONA_IDS.priya).filter((p) => !SHARED.has(p))) found.push(...(await scan(world, path)))
    expect(found).toEqual([])
  })
})

