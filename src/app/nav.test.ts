// The rail, the homes and the active entry, built from the seed (brief/09-V1-PRODUCT.md section 4).
import { describe, expect, it } from 'vitest'
import { createSeed, PERSONA_IDS, TIVERNE_ID, HARROWDEN_ID, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID, DURNLEY_ID } from '../domain/seed/world'
import { activeLeaf, homeFor, projectHomeFor, railFor, roleFor, roleTitle, trailFor, type NavItem, type NavSection } from './nav'
import { projectsFor } from '../domain/access'
import { railView, homeFor as storeHomeFor, projectHomeFor as storeProjectHomeFor } from '../store/v1selectors'

const world = createSeed()

function flat(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => [i, ...flat(i.children ?? [])])
}
function all(sections: NavSection[]): NavItem[] {
  return flat(sections.flatMap((s) => s.items))
}
function names(sections: NavSection[]): string[] {
  return all(sections).map((i) => i.label)
}

const FORBIDDEN = /[\u2013\u2014\u2190-\u21FF\u2713\u2714<>]/

describe('railFor', () => {
  it('architect: marketplace, then each project as a folder with the version 2 match schedule, then new project', () => {
    const rail = railFor(world, PERSONA_IDS.priya)
    expect(rail.map((s) => s.title)).toEqual(['Marketplace', 'Projects'])
    expect(rail[0].items.map((i) => [i.label, i.to])).toEqual([
      ['Browse', '/market'],
      ['Shared with you', '/market/shared'],
      ['Saved', '/saved'],
    ])
    const projects = rail[1].items
    expect(projects.map((i) => i.label)).toEqual(['Merrowgate Wharf', 'Sallow Court', 'Ferrymoor Yard', 'New project'])
    expect(projects.map((i) => i.to)).toEqual([`/projects/${MERROWGATE_ID}`, `/projects/${SALLOW_ID}`, `/projects/${FERRYMOOR_ID}`, '/projects/new'])
    const merrowgate = projects[0].children ?? []
    expect(merrowgate.map((i) => [i.label, i.to, i.v2 === true])).toEqual([
      ['Wish list', `/projects/${MERROWGATE_ID}/wishlist`, false],
      ['Spec sheet', `/projects/${MERROWGATE_ID}/spec`, false],
      ['Match schedule', `/projects/${MERROWGATE_ID}/match`, true],
    ])
  })

  it('architect: no deals, reuse plan or approvals entry anywhere in the rail (P11)', () => {
    const labels = names(railFor(world, PERSONA_IDS.priya))
    for (const word of ['Deals', 'Reuse plan', 'Approvals', 'Offers and deals']) expect(labels).not.toContain(word)
  })

  it('buying owner: her one project with approvals, the advanced matcher, reuse plan and deals', () => {
    const rail = railFor(world, PERSONA_IDS.isla)
    expect(rail.map((s) => s.title)).toEqual(['Projects'])
    expect(rail[0].items.map((i) => i.label)).toEqual(['Merrowgate Wharf'])
    expect((rail[0].items[0].children ?? []).map((i) => [i.label, i.to])).toEqual([
      ['Approvals', `/projects/${MERROWGATE_ID}/approvals`],
      ['Match schedule (advanced)', `/projects/${MERROWGATE_ID}/match`],
      ['Reuse plan', `/projects/${MERROWGATE_ID}/plan`],
      ['Deals', `/projects/${MERROWGATE_ID}/deals`],
    ])
    expect(names(rail)).not.toContain('Sallow Court')
  })

  it('surveyor: clients as folders, each with its buildings and their inventory and capture', () => {
    const rail = railFor(world, PERSONA_IDS.dana)
    expect(rail.map((s) => s.title)).toEqual(['Clients'])
    expect(rail[0].items.map((i) => i.label)).toEqual(['Ostlea Estates', 'Brackwater Estates'])
    const [ostlea, brackwater] = rail[0].items
    expect((ostlea.children ?? []).map((b) => b.label)).toEqual(['Tiverne House'])
    expect((brackwater.children ?? []).map((b) => b.label)).toEqual(['Harrowden Court'])
    expect((ostlea.children?.[0].children ?? []).map((i) => [i.label, i.to])).toEqual([
      ['Inventory', `/buildings/${TIVERNE_ID}/inventory`],
      ['Capture', `/buildings/${TIVERNE_ID}/capture`],
    ])
  })

  it('selling owner: only his own building, with inventory, priority and listings, then offers and deals', () => {
    const rail = railFor(world, PERSONA_IDS.tom)
    expect(rail.map((s) => s.title)).toEqual(['Buildings', null])
    expect(rail[0].items.map((i) => i.label)).toEqual(['Tiverne House'])
    expect((rail[0].items[0].children ?? []).map((i) => [i.label, i.to])).toEqual([
      ['Inventory', `/buildings/${TIVERNE_ID}/inventory`],
      ['Priority', `/buildings/${TIVERNE_ID}/priority`],
      ['Listings and visibility', `/buildings/${TIVERNE_ID}/listings`],
    ])
    expect(rail[1].items.map((i) => [i.label, i.to])).toEqual([['Offers and deals', '/offers']])
    const text = JSON.stringify(rail)
    expect(text).not.toContain('Harrowden')
    expect(text).not.toContain(HARROWDEN_ID)
  })

  it('consultant: projects with compliance and wish list review, then engagements with waste and reuse', () => {
    const rail = railFor(world, PERSONA_IDS.marcus)
    expect(rail.map((s) => s.title)).toEqual(['Projects', 'Engagements'])
    expect((rail[0].items[0].children ?? []).map((i) => [i.label, i.to])).toEqual([
      ['Compliance', `/projects/${MERROWGATE_ID}/compliance`],
      ['Wish list review', `/projects/${MERROWGATE_ID}/review`],
    ])
    expect(rail[1].items.map((i) => i.label)).toEqual(['Durnley House'])
    expect((rail[1].items[0].children ?? []).map((i) => [i.label, i.to])).toEqual([['Waste and reuse', `/engagements/${DURNLEY_ID}/waste`]])
    expect(names(rail)).not.toContain('Tiverne House')
  })

  it('operator: ledger and model comparison', () => {
    expect(all(railFor(world, PERSONA_IDS.operator)).map((i) => [i.label, i.to])).toEqual([
      ['Ledger', '/operator/ledger'],
      ['Model comparison', '/operator/models'],
    ])
  })

  it('an unknown persona gets no rail', () => {
    expect(railFor(world, 'per_nobody')).toEqual([])
  })

  it('every route carries IDs only, test IDs are unique, and no label has a dash, arrow, tick or comparison sign', () => {
    const privateNames = [...Object.values(world.projects).map((p) => p.name), ...Object.values(world.buildings).map((b) => b.name), ...Object.values(world.orgs).map((o) => o.name), ...Object.values(world.engagements).map((e) => e.name)].filter((n) => n.length > 0)
    for (const id of Object.values(PERSONA_IDS)) {
      const items = all(railFor(world, id))
      expect(new Set(items.map((i) => i.testId)).size, id).toBe(items.length)
      for (const i of items) {
        for (const n of privateNames) {
          expect(i.to, `${id} ${i.to}`).not.toContain(n)
          expect(i.testId, `${id} ${i.testId}`).not.toContain(n)
        }
        expect(i.label).not.toMatch(FORBIDDEN)
      }
    }
  })

  it('a project the architect creates appears as a new folder', () => {
    const w = structuredClone(world)
    w.projects.prj_new000 = { ...w.projects[MERROWGATE_ID], id: 'prj_new000', name: 'Test folder' }
    const projects = railFor(w, PERSONA_IDS.priya)[1].items
    expect(projects.map((i) => i.label)).toContain('Test folder')
    expect(projects[projects.length - 1].label).toBe('New project')
  })
})

describe('homeFor and projectHomeFor', () => {
  it('opens each role on its first screen, in rail order', () => {
    expect(homeFor(world, PERSONA_IDS.priya)).toBe('/market')
    expect(homeFor(world, PERSONA_IDS.isla)).toBe(`/projects/${MERROWGATE_ID}/approvals`)
    expect(homeFor(world, PERSONA_IDS.dana)).toBe(`/buildings/${TIVERNE_ID}/capture`)
    expect(homeFor(world, PERSONA_IDS.tom)).toBe(`/buildings/${TIVERNE_ID}/inventory`)
    expect(homeFor(world, PERSONA_IDS.marcus)).toBe(`/projects/${MERROWGATE_ID}/compliance`)
    expect(homeFor(world, PERSONA_IDS.operator)).toBe('/operator/ledger')
    expect(homeFor(world, 'per_nobody')).toBe('/')
  })

  it('opens a project folder on the role screen', () => {
    expect(projectHomeFor('architect', 'prj_x')).toBe('/projects/prj_x/wishlist')
    expect(projectHomeFor('client', 'prj_x')).toBe('/projects/prj_x/approvals')
    expect(projectHomeFor('consultant', 'prj_x')).toBe('/projects/prj_x/compliance')
    expect(projectHomeFor('seller', 'prj_x')).toBeNull()
    expect(projectHomeFor(null, 'prj_x')).toBeNull()
  })
})

describe('roleTitle', () => {
  it('names the roles as the product does', () => {
    expect(roleTitle(world, PERSONA_IDS.dana)).toBe('Site surveyor')
    expect(roleTitle(world, PERSONA_IDS.tom)).toBe('Asset owner')
    expect(roleTitle(world, PERSONA_IDS.priya)).toBe('Architect')
    expect(roleTitle(world, PERSONA_IDS.isla)).toBe('Asset owner, client of Merrowgate Wharf')
    expect(roleTitle(world, PERSONA_IDS.marcus)).toBe('Sustainability consultant')
    expect(roleTitle(world, PERSONA_IDS.operator)).toBe('Platform operator')
  })
})

describe('activeLeaf and trailFor', () => {
  const priya = railFor(world, PERSONA_IDS.priya)
  it('picks the longest matching entry', () => {
    expect(activeLeaf(priya, '/market')?.label).toBe('Browse')
    expect(activeLeaf(priya, '/market/L-9F4CQQ')?.label).toBe('Browse')
    expect(activeLeaf(priya, '/market/shared')?.label).toBe('Shared with you')
    expect(activeLeaf(priya, `/projects/${SALLOW_ID}/spec`)?.testId).toBe(`nav-${SALLOW_ID}-spec`)
    expect(activeLeaf(priya, '/about')).toBeNull()
  })
  it('a nested path keeps its parent entry active', () => {
    const isla = railFor(world, PERSONA_IDS.isla)
    expect(activeLeaf(isla, `/projects/${MERROWGATE_ID}/plan/pi_1`)?.label).toBe('Reuse plan')
    const tom = railFor(world, PERSONA_IDS.tom)
    expect(activeLeaf(tom, `/buildings/${TIVERNE_ID}/inventory/itm_1`)?.label).toBe('Inventory')
  })
  it('reads the path from the section down', () => {
    expect(trailFor(railFor(world, PERSONA_IDS.dana), `/buildings/${TIVERNE_ID}/capture`)).toEqual(['Clients', 'Ostlea Estates', 'Tiverne House', 'Capture'])
    expect(trailFor(priya, '/market')).toEqual(['Marketplace', 'Browse'])
    expect(trailFor(railFor(world, PERSONA_IDS.tom), '/offers')).toEqual(['Offers and deals'])
    expect(trailFor(priya, '/about')).toEqual([])
  })
})

describe('the shell and the store agree on the rail and the homes', () => {
  type StoreItem = { label: string; href: string; greyed?: boolean; children?: StoreItem[] }
  const storeLeaves = (items: StoreItem[]): string[] => items.flatMap((i) => (i.children ? storeLeaves(i.children) : [`${i.label} ${i.href} ${i.greyed === true}`]))
  const shellLeaves = (items: NavItem[]): string[] => items.flatMap((i) => (i.children ? shellLeaves(i.children) : [`${i.label} ${i.to} ${i.v2 === true}`]))

  it.each(Object.values(PERSONA_IDS))('for %s', (id) => {
    expect(railFor(world, id).flatMap((s) => shellLeaves(s.items))).toEqual(railView(world, id).flatMap((s) => storeLeaves(s.items)))
    expect(homeFor(world, id)).toBe(storeHomeFor(world, id))
    for (const p of projectsFor(world, id)) expect(projectHomeFor(roleFor(world, id), p.id)).toBe(storeProjectHomeFor(world, id, p.id))
  })
})
