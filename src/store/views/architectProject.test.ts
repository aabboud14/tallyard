// The architect's project screen helpers: wish list tabs, storage and carbon lines, geometry, spec sheet
// groups and columns, and the new project form.
import { describe, it, expect } from 'vitest'
import type { World } from '../../domain/types'
import type { TimelineFit } from '../../domain/v1types'
import { createSeed, PERSONA_IDS as P, MERROWGATE_ID, SALLOW_ID, FERRYMOOR_ID } from '../../domain/seed/world'
import { LABELS } from '../../domain/reference/labels'
import { REGIONS } from '../../domain/reference/assumptions'
import { V1_ERRORS, acceptProjectTerms, createProject, decideWish, saveToWishlist, sendWishlist } from '../v1actions'
import { specSheetView, wishlistView } from '../v1selectors'
import {
  avoidedLine,
  blockSections,
  caveatLabelId,
  clientSuggestions,
  geometryKinds,
  newProjectErrorField,
  REGION_OPTIONS,
  SPEC_HEADING_LABELS,
  rowsForTab,
  specCells,
  specColumns,
  specGroups,
  storageLine,
  WISH_TAB_LABELS,
  WISH_TABS,
  wishTabCounts,
} from './architectProject'

function must(r: { world: World; error: string | null }): World {
  expect(r.error).toBeNull()
  return r.world
}

const fit = (storageMonths: number | null): TimelineFit => ({ fit: storageMonths === null ? 'late' : 'in_time', storageMonths, text: '' })

describe('wish list helpers', () => {
  it('counts rows by state, every row included, and filters by tab', () => {
    const w = createSeed()
    const v = wishlistView(w, P.priya, SALLOW_ID)!
    expect(WISH_TABS.map((t) => WISH_TAB_LABELS[t])).toEqual(['All', 'Pending', 'Sent to client', 'Approved', 'Declined'])
    expect(wishTabCounts(v.rows)).toEqual({ all: 2, pending: 2, sent: 0, approved: 0, declined: 0 })
    expect(rowsForTab(v.rows, 'all')).toHaveLength(2)
    expect(rowsForTab(v.rows, 'sent')).toHaveLength(0)
    const ferry = wishlistView(w, P.priya, FERRYMOOR_ID)!
    expect(wishTabCounts(ferry.rows).sent).toBe(1)
    expect(rowsForTab(ferry.rows, 'sent').map((r) => r.item.status)).toEqual(['sent'])
  })

  it('words the storage months, and leaves them out for a late lot', () => {
    expect(storageLine(fit(7))).toBe('7 months of storage until the start')
    expect(storageLine(fit(1))).toBe('1 month of storage until the start')
    expect(storageLine(fit(0))).toBe('No storage before the start')
    expect(storageLine(fit(null))).toBeNull()
    expect(storageLine(null)).toBeNull()
  })

  it('gives avoided carbon in tCO2e, or "Not claimed" for unused surplus', () => {
    const v = wishlistView(createSeed(), P.priya, SALLOW_ID)!
    const stone = v.rows[0].listing!
    expect(avoidedLine(stone)).toEqual({ value: `${stone.carbon!.avoidedT.toFixed(1)} tCO2e`, claimed: true })
    expect(avoidedLine({ ...stone, carbon: null })).toEqual({ value: 'Not claimed', claimed: false })
  })

  it('offers both geometry files for steel and stone, and says why not for timber', () => {
    let w = createSeed()
    w = must(saveToWishlist(w, P.priya, 'L-NHZ32R', MERROWGATE_ID))
    const steel = wishlistView(w, P.priya, MERROWGATE_ID)!.rows[0].listing!
    expect(geometryKinds(steel)).toEqual({ dxf: true, obj: true, reason: null })
    const stone = wishlistView(w, P.priya, SALLOW_ID)!.rows[0].listing!
    expect(geometryKinds(stone).dxf).toBe(true)
    const saved = must(saveToWishlist(w, P.priya, 'L-CJGQP7', MERROWGATE_ID))
    const timber = wishlistView(saved, P.priya, MERROWGATE_ID)!.rows.find((r) => r.item.publicId === 'L-CJGQP7')!.listing!
    const g = geometryKinds(timber)
    expect([g.dxf, g.obj]).toEqual([false, false])
    expect(g.reason).toBeTruthy()
  })
})

describe('spec sheet helpers', () => {
  function sheetWorld(): World {
    let w = createSeed()
    w = must(acceptProjectTerms(w, P.priya, MERROWGATE_ID))
    for (const id of ['L-NHZ32R', 'L-Q23X7N']) w = must(saveToWishlist(w, P.priya, id, MERROWGATE_ID))
    w = must(sendWishlist(w, P.priya, MERROWGATE_ID))
    const item = wishlistView(w, P.priya, MERROWGATE_ID)!.rows.find((r) => r.item.publicId === 'L-NHZ32R')!.item
    w = must(decideWish(w, P.isla, MERROWGATE_ID, item.id, 'approved', ''))
    return must(saveToWishlist(w, P.priya, 'L-A945G6', MERROWGATE_ID))
  }

  it('groups blocks by state: approved only, or approved, sent and pending for the draft', () => {
    const w = sheetWorld()
    const approved = specGroups(specSheetView(w, P.priya, MERROWGATE_ID, 'approved')!, 'approved')
    expect(approved.map((g) => [g.status, g.draft, g.blocks.map((b) => b.publicId)])).toEqual([['approved', false, ['L-NHZ32R']]])
    const draft = specGroups(specSheetView(w, P.priya, MERROWGATE_ID, 'draft')!, 'draft')
    expect(draft.map((g) => [g.label, g.draft, g.blocks.map((b) => b.publicId)])).toEqual([
      ['Approved', false, ['L-NHZ32R']],
      ['Sent to client', true, ['L-Q23X7N']],
      ['Pending', true, ['L-A945G6']],
    ])
    expect(draft.map((g) => g.line)).toEqual(['Approved by the client.', "Draft: sent to the client, awaiting the client's decision.", 'Draft: not yet sent to the client.'])
  })

  it('builds one column set across families, in section order, with blanks where a family has no such field', () => {
    const sheet = specSheetView(sheetWorld(), P.priya, MERROWGATE_ID, 'draft')!
    const cols = specColumns(sheet.blocks)
    const labels = cols.map((c) => c.label)
    expect(labels.slice(0, 4)).toEqual(['Public ID', 'Title', 'Typology', 'Family'])
    expect(labels).toContain('Designation')
    expect(labels).toContain('Stone')
    expect(labels).toContain('Mortar')
    expect(labels.indexOf('Designation')).toBeLessThan(labels.indexOf('Quantity'))
    expect(labels.indexOf('Quantity')).toBeLessThan(labels.indexOf('Avoided carbon'))
    expect(new Set(labels).size).toBe(labels.length)
    const steel = sheet.blocks.find((b) => b.publicId === 'L-NHZ32R')!
    const cells = specCells(steel, cols)
    expect(cells[labels.indexOf('Public ID')]).toBe('L-NHZ32R')
    expect(cells[labels.indexOf('Stone')]).toBe('')
    expect(cells[labels.indexOf('Designation')]).not.toBe('')
  })

  it('groups a block by section and finds the label behind each caveat', () => {
    const sheet = specSheetView(sheetWorld(), P.priya, MERROWGATE_ID, 'draft')!
    const sections = blockSections(sheet.blocks[0]).map((s) => s.section)
    expect(sections[0]).toBe('Identity')
    expect(new Set(sections).size).toBe(sections.length)
    const identity = blockSections(sheet.blocks[0], SPEC_HEADING_LABELS)[0]
    expect(identity.section).toBe('Identity')
    expect(identity.rows.map((r) => r.label)).toEqual(['Typology', 'Family'])
    expect(sheet.caveats.map(caveatLabelId)).toEqual(['L39', 'L20', 'L4'])
    expect(caveatLabelId(LABELS.L20)).toBe('L20')
    expect(caveatLabelId('Something else')).toBeNull()
  })
})

describe('new project helpers', () => {
  it('maps each createProject error to its field', () => {
    expect(newProjectErrorField(V1_ERRORS.name)).toBe('name')
    expect(newProjectErrorField(V1_ERRORS.duplicateName)).toBe('name')
    expect(newProjectErrorField(V1_ERRORS.clientName)).toBe('clientName')
    expect(newProjectErrorField(V1_ERRORS.clientNotBuyer)).toBe('clientName')
    expect(newProjectErrorField(V1_ERRORS.region)).toBe('region')
    expect(newProjectErrorField(V1_ERRORS.badDate)).toBe('startDate')
    expect(newProjectErrorField(V1_ERRORS.pastDate)).toBe('startDate')
    expect(newProjectErrorField(V1_ERRORS.role)).toBeNull()
    const r = createProject(createSeed(), P.priya, { name: '', clientName: 'x', projectType: 'office', localAuthority: '', region: REGIONS[0], startDate: '2027-01-04' })
    expect(newProjectErrorField(r.error!)).toBe('name')
  })

  it("suggests only the clients of the architect's own projects", () => {
    const w = createSeed()
    const names = clientSuggestions(w, P.priya)
    const own = Object.values(w.projects)
      .filter((p) => p.architectOrgId === w.personas[P.priya].orgId)
      .map((p) => w.orgs[p.clientOrgId].name)
    expect(names).toEqual([...new Set(own)].sort((a, b) => a.localeCompare(b, 'en-GB')))
    expect(names.length).toBeGreaterThan(0)
    expect(clientSuggestions(w, P.tom)).toEqual([])
    expect(REGION_OPTIONS).toEqual(REGIONS)
  })
})
