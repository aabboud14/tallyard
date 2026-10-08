import { describe, it, expect } from 'vitest'
import { actor, fresh, must, U, viewer } from '../../test/fixtures'
import { closeTo } from '../../test/helpers'
import { MERROWGATE_ID, TIVERNE_ID } from '../../domain/seed/world'
import { lotPrivateStrings } from '../../domain/privacy/privateStrings'
import { captureItem } from '../actions/surveyor'
import { complianceView } from './consultant'
import { inventoryView, prioritiesView, listingsView } from './owner'
import { captureInputOf, checkCaptureForm, emptyCaptureForm, fillFromDescription, measureFields, monthKeyOf, nextCaptureForm } from './roles-capture'
import { aimLabel, barScale, signedMoneyWhole, stacked, complianceWorkbookModel, contentChart, contentScale, disclosureMeter, filterInventory, inventoryVisuals, reservationCounts, scoreParts, scoreWeights, sellerSeesLine, whenText } from './roles-views'
import { reservationsView } from './client'

describe('Capture form', () => {
  it('fills the fields from the description, with the words it used', () => {
    const r = fillFromDescription(emptyCaptureForm('2027-01'), '48 no. 457x191x67 UB, 7.5m long, bolted, levels 1 to 6', [])
    expect(r.form.family).toBe('steel_section')
    expect(r.form.section).toBe('UB 457x191x67')
    expect(r.form.pieces).toBe('48')
    expect(r.form.lengthM).toBe('7.5')
    expect(r.form.recoverability).toBe('A')
    expect(r.form.location).toBe('levels 1 to 6')
    expect(r.form.condition).toBe('')
    expect(r.recognised).toBe(true)
    expect(r.evidence.map((e) => e.label)).toEqual(expect.arrayContaining(['Section', 'Length', 'Quantity', 'Recoverability', 'Location']))
    expect(r.missing).toEqual([])
  })

  it('keeps what the person typed and follows the description for the rest', () => {
    const typed = { ...emptyCaptureForm('2027-01'), pieces: '50' }
    const r = fillFromDescription(typed, '48 no. 457x191x67 UB, 7.5m long', ['pieces'])
    expect(r.form.pieces).toBe('50')
    expect(r.form.lengthM).toBe('7.5')
    const cleared = fillFromDescription(r.form, '', ['pieces'])
    expect(cleared.form.family).toBe('')
    expect(cleared.form.lengthM).toBe('')
    expect(cleared.form.pieces).toBe('50')
    expect(cleared.recognised).toBe(false)
  })

  it('reports what the description leaves out', () => {
    const r = fillFromDescription(emptyCaptureForm('2027-01'), 'UB 457x191x67 beams, east core', [])
    expect(r.missing.map((m) => m.label)).toEqual(['Quantity', 'Length'])
  })

  it('turns a raised floor panel size into millimetres', () => {
    const r = fillFromDescription(emptyCaptureForm('2027-01'), '1,200 raised floor panels 600 x 600, level 2', [])
    expect(r.form.family).toBe('raised_floor')
    expect(r.form.panelSize).toBe('600 by 600')
    expect(r.form.pieces).toBe('1200')
  })

  it('checks every required field and the section table', () => {
    const blank = checkCaptureForm(emptyCaptureForm('2027-01'))
    expect(blank.ok).toBe(false)
    expect(blank.missing).toEqual(['family', 'condition', 'recoverability'])
    const steel = { ...emptyCaptureForm('2027-01'), family: 'steel_section' as const, section: 'UB 999x1x1', lengthM: '7.5', pieces: '1.5', condition: 'A' as const, recoverability: 'A' as const }
    const c = checkCaptureForm(steel)
    expect(c.ok).toBe(false)
    expect(c.problems.section).toMatch(/section table/)
    expect(c.problems.pieces).toBe('Enter a whole number.')
    const good = checkCaptureForm({ ...steel, section: 'ub 457x191x67', pieces: '48' })
    expect(good.ok).toBe(true)
    expect(good.spec).toEqual({ family: 'steel_section', designation: 'UB 457x191x67', lengthM: 7.5 })
    expect(good.quantity).toEqual({ kind: 'pieces', pieces: 48 })
    expect(checkCaptureForm({ ...steel, section: 'UB 457x191x67', pieces: '48', lengthM: '-2' }).problems.lengthM).toBe('Enter a number above zero.')
  })

  it('asks each family for its own measurements', () => {
    expect(measureFields('steel_section').map((x) => x.key)).toEqual(['section', 'lengthM', 'pieces'])
    expect(measureFields('stone_cladding').map((x) => x.key)).toEqual(['stone', 'thicknessMm', 'areaM2'])
    expect(measureFields('timber_joist').map((x) => x.key)).toEqual(['species', 'volumeM3'])
  })

  it('builds an input the capture action accepts', () => {
    const s = fresh()
    const r = fillFromDescription(emptyCaptureForm('2027-01'), '30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room', [])
    const form = { ...r.form, condition: 'B' as const }
    expect(captureInputOf({ ...form, condition: '' }, TIVERNE_ID, [], null)).toBeNull()
    const input = captureInputOf(form, TIVERNE_ID, [], '2027-01-25')!
    expect(input.spec).toEqual({ family: 'steel_section', designation: 'UC 203x203x46', lengthM: 3.2 })
    const done = must(captureItem(s, actor(U.dana), input))
    expect(done.state.world.items[done.value.itemId].location).toBe('roof plant room')
    const next = nextCaptureForm(form)
    expect(next.location).toBe('roof plant room')
    expect(next.family).toBe('')
    expect(next.expectedMonth).toBe('2027-01')
  })

  it('writes month keys', () => {
    expect(monthKeyOf(2027, 1)).toBe('2027-01')
    expect(monthKeyOf(2027, 12)).toBe('2027-12')
  })
})

describe('Owner helpers', () => {
  it('breaks a priority score into its four weighted parts', () => {
    const v = prioritiesView(fresh(), viewer(U.tom), TIVERNE_ID)!
    const top = v.rows[0]
    const parts = scoreParts(top)
    expect(parts.map((p) => p.max)).toEqual([40, 30, 20, 10])
    closeTo(parts.reduce((s, p) => s + p.points, 0), top.score, 6)
    expect(parts[0].text).toMatch(/ of 40$/)
    expect(scoreWeights().reduce((s, w) => s + w.max, 0)).toBe(100)
  })

  it('places the disclosure score on its scale', () => {
    const l = listingsView(fresh(), viewer(U.tom), TIVERNE_ID)!
    const m = disclosureMeter(l.disclosure)
    expect(m.max).toBe(80)
    expect(m.mediumFrom).toBe(25)
    expect(m.highFrom).toBe(40)
    expect(m.parts.reduce((s, p) => s + p.points, 0)).toBe(l.disclosure.score)
  })

  it('filters the inventory by words and visibility, with counts for each tab', () => {
    const inv = inventoryView(fresh(), viewer(U.tom), TIVERNE_ID)!
    const all = filterInventory(inv.rows, { q: '', visibility: 'all' })
    expect(all.rows.length).toBe(inv.rows.length)
    expect(all.counts.private + all.counts.matched_only + all.counts.open).toBe(all.counts.all)
    const steel = filterInventory(inv.rows, { q: 'ub 533', visibility: 'all' })
    expect(steel.rows.every((r) => r.title.includes('UB 533'))).toBe(true)
    expect(steel.rows.length).toBeGreaterThan(0)
    const published = filterInventory(inv.rows, { q: '', visibility: 'open' })
    expect(published.rows.every((r) => r.visibility === 'open')).toBe(true)
    expect(filterInventory(inv.rows, { q: 'granite', visibility: 'all' }).rows).toEqual([])
  })
})

describe('Inventory pictures', () => {
  it('gives the owner and the surveyor each item picture, and no one else', () => {
    const s = fresh()
    const inv = inventoryView(s, viewer(U.tom), TIVERNE_ID)!
    const pics = inventoryVisuals(s, viewer(U.tom), TIVERNE_ID)!
    expect(Object.keys(pics).sort()).toEqual(inv.rows.map((r) => r.itemId).sort())
    const withPhoto = inv.rows.find((r) => r.photoId)!
    expect(pics[withPhoto.itemId].photo!.id).toBe(withPhoto.photoId)
    expect(inventoryVisuals(s, viewer(U.dana), TIVERNE_ID)).not.toBeNull()
    expect(inventoryVisuals(s, viewer(U.priya), TIVERNE_ID)).toBeNull()
    expect(inventoryVisuals(s, viewer(U.isla), TIVERNE_ID)).toBeNull()
  })
})

describe('Client helpers', () => {
  it('counts reservations by state', () => {
    const v = reservationsView(fresh(), viewer(U.isla), MERROWGATE_ID)!
    expect(reservationCounts(v.rows)).toEqual({ open: v.rows.length - 1, pending: 1, reserved: 0 })
  })

  it('says when something happened in a sentence', () => {
    expect(whenText('Requested', 'Yesterday')).toBe('Requested yesterday')
    expect(whenText('Requested', '2 hours ago')).toBe('Requested 2 hours ago')
    expect(whenText('Requested', 'just now')).toBe('Requested just now')
    expect(whenText('Requested', '1 Oct 2026')).toBe('Requested on 1 Oct 2026')
  })

  it('shows the client the blind line the seller will see, and no one else', () => {
    const s = fresh()
    expect(sellerSeesLine(s, viewer(U.isla), MERROWGATE_ID)).toBe('Design team, commercial project, Inner London East, needed by Q2 2028')
    expect(sellerSeesLine(s, viewer(U.priya), MERROWGATE_ID)).toBeNull()
    expect(sellerSeesLine(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })
})

describe('Compliance workbook model', () => {
  it('holds the compliance figures with the totals worked out, for the consultant only', () => {
    const s = fresh()
    const c = complianceView(s, viewer(U.marcus), MERROWGATE_ID)!
    const m = complianceWorkbookModel(s, viewer(U.marcus), MERROWGATE_ID)!
    expect(m.securedPercent).toBe(c.secured.percent)
    expect(m.bom.length).toBe(c.secured.lines.length)
    const gia = s.world.projects[MERROWGATE_ID].giaM2
    closeTo(m.bom[0].intensity, (m.bom[0].massT * 1000) / gia, 9)
    closeTo(m.bomTotals.valueGbp, c.secured.totalValue, 2)
    closeTo(m.itemTotals.securedAvoidedT, c.avoidedT, 6)
    closeTo(m.itemTotals.securedMassT, c.reclaimedMassT, 6)
    expect(m.fileName).toMatch(/^merrowgate-wharf-compliance-\d{4}-\d{2}-\d{2}\.xlsx$/)
    expect(complianceWorkbookModel(s, viewer(U.isla), MERROWGATE_ID)).toBeNull()
    expect(complianceWorkbookModel(s, viewer(U.tom), MERROWGATE_ID)).toBeNull()
  })

  it('carries no seller-private string', () => {
    const s = fresh()
    const json = JSON.stringify(complianceWorkbookModel(s, viewer(U.marcus), MERROWGATE_ID))
    for (const lot of Object.values(s.world.lots)) {
      const item = s.world.items[lot.itemId]
      for (const x of lotPrivateStrings(lot, item, s.world.buildings[item.buildingId], s.world)) expect(json, x).not.toContain(x)
    }
  })

  it('places the secured figure, the approved figure and the aim on the content chart', () => {
    const c = contentChart(0.15, 0.2, 0.2)
    expect(c.scale).toBe(0.25)
    closeTo(c.securedAt, 0.6, 9)
    closeTo(c.aimAt, 0.8, 9)
    expect(c.aimLabel).toBe('At least 20%')
    expect(c.scaleLabel).toBe('25%')
    expect(aimLabel(0.95)).toBe('At least 95%')
    expect(signedMoneyWhole(-26219.6)).toBe('-£26,220')
    expect(signedMoneyWhole(1200)).toBe('£1,200')
  })

  it('lays segments end to end for a stacked bar', () => {
    expect(stacked([2, 3, 5])).toEqual([{ at: 0, size: 2 }, { at: 2, size: 3 }, { at: 5, size: 5 }])
    expect(stacked([])).toEqual([])
  })

  it('scales bar charts to their largest value', () => {
    expect(barScale([2, 9.5, 3])).toBe(9.5)
    expect(barScale([])).toBe(1)
    expect(barScale([0, 0])).toBe(1)
  })

  it('scales the content chart so the aim and both figures sit inside it', () => {
    const top = contentScale(0.199, 0.21, 0.2)
    expect(top).toBeGreaterThan(0.21)
    expect(top).toBeLessThanOrEqual(0.3)
    expect(contentScale(0, 0, 0.02)).toBe(0.1)
  })
})
