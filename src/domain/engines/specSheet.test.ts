import { describe, it, expect } from 'vitest'
import type { PublicListing } from '../types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { GRADE_UNKNOWN, LABELS } from '../reference/labels'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { lotPrivateStrings } from '../privacy/privateStrings'
import { availabilityText, priceRangeText, quantityText, specFieldRows, specSheet, specSheetRows } from './specSheet'
import { timelineFit } from './timeline'

const w = createSeed()
const all = Object.values(w.lots).map((lot) => listingFor(w, lot.id, A))
const L = (publicId: string): PublicListing => all.find((l) => l.publicId === publicId)!

describe('listing text helpers (the same output as the marketplace listing view)', () => {
  it('quantity', () => {
    expect(quantityText(L('L-9F4CQQ'))).toBe('48 pieces')
    expect(quantityText(L('L-8N33X4'))).toBe('78 panels (421.20 m2)')
    expect(quantityText(L('L-9XXQC3'))).toBe('96 panels (475.20 m2)')
    expect(quantityText(L('L-323M2J'))).toBe('1,140 m2')
    expect(quantityText(L('L-Q23X7N'))).toBe('180 m2')
    expect(quantityText(L('L-5RC3DR'))).toBe('20,000 bricks')
    expect(quantityText(L('L-6VWCWH'))).toBe('6,500 panels')
    expect(quantityText(L('L-CJGQP7'))).toBe('22 m3')
  })

  it('availability', () => {
    expect(availabilityText(L('L-9F4CQQ'))).toBe('Available from Q1 2027')
    expect(availabilityText(L('L-6DN4K3'))).toBe('Available from November 2026')
    expect(availabilityText(L('L-NHZ32R'))).toBe('Available now')
  })

  it('guide price range', () => {
    expect(priceRangeText(L('L-9F4CQQ'))).toBe('£715 to £825 per tonne')
    expect(priceRangeText(L('L-8N33X4'))).toBe('£72 to £82 per m2')
    expect(priceRangeText(L('L-5RC3DR'))).toBe('£0.92 to £1.06 per brick')
    expect(priceRangeText(L('L-6VWCWH'))).toBe('£3.30 to £3.90 per panel')
    expect(priceRangeText(L('L-CJGQP7'))).toBe('£330 to £380 per m3')
  })

  it('spec fields for each family', () => {
    expect(specFieldRows(L('L-9F4CQQ').spec)).toEqual([
      { label: 'Designation', value: 'UB 457x191x67' },
      { label: 'Length', value: '7.5 m' },
    ])
    expect(specFieldRows(L('L-WPX5A6').spec)).toEqual([
      { label: 'Designation', value: 'UB 533x210x92' },
      { label: 'Length', value: '9.0 m' },
    ])
    expect(specFieldRows(L('L-8N33X4').spec)).toEqual([
      { label: 'System', value: 'Unitised' },
      { label: 'Panel', value: '1.5 m by 3.6 m' },
    ])
    expect(specFieldRows(L('L-323M2J').spec)).toEqual([{ label: 'Thickness', value: '150 mm' }])
    expect(specFieldRows(L('L-Q23X7N').spec)).toEqual([
      { label: 'Stone', value: 'Portland' },
      { label: 'Thickness', value: '50 mm' },
    ])
    expect(specFieldRows(L('L-A945G6').spec)).toEqual([
      { label: 'Type', value: 'London stock' },
      { label: 'Mortar', value: 'Lime mortar' },
    ])
    expect(specFieldRows(L('L-6VWCWH').spec)).toEqual([{ label: 'Panel size', value: '600 by 600 mm' }])
    expect(specFieldRows(L('L-CJGQP7').spec)).toEqual([{ label: 'Species', value: 'Pitch pine' }])
  })
})

describe('specSheetRows', () => {
  it('lays out L-9F4CQQ against 4 October 2027 in the seven sections', () => {
    const l = L('L-9F4CQQ')
    const rows = specSheetRows(l, timelineFit(l.availability, '2027-10-04'))
    expect(rows).toEqual([
      { section: 'Identity', label: 'Public ID', value: 'L-9F4CQQ' },
      { section: 'Identity', label: 'Title', value: 'UB 457x191x67, 7.5 m' },
      { section: 'Identity', label: 'Typology', value: 'Structure' },
      { section: 'Identity', label: 'Family', value: 'Structural steel section' },
      { section: 'Material and dimensions', label: 'Designation', value: 'UB 457x191x67' },
      { section: 'Material and dimensions', label: 'Length', value: '7.5 m' },
      { section: 'Quantity', label: 'Quantity', value: '48 pieces' },
      { section: 'Quantity', label: 'Mass', value: '24.16 t' },
      { section: 'Condition and testing', label: 'Condition', value: 'A' },
      { section: 'Condition and testing', label: 'Test status', value: 'Untested' },
      { section: 'Condition and testing', label: 'Grade', value: GRADE_UNKNOWN },
      { section: 'Availability and location', label: 'Availability', value: 'Available from Q1 2027' },
      { section: 'Availability and location', label: 'Timeline check', value: 'Available in time' },
      { section: 'Availability and location', label: 'Storage until the start', value: '7 months' },
      { section: 'Availability and location', label: 'Location', value: 'Central London' },
      { section: 'Availability and location', label: 'Collection point', value: 'From the source site' },
      { section: 'Sustainability', label: 'Avoided carbon', value: '41.0 tCO2e, 96.8% of new, A1-A4' },
      { section: 'Sustainability', label: 'Sustainability band', value: 'High' },
      { section: 'Price', label: 'Guide price', value: '£715 to £825 per tonne' },
      { section: 'Price', label: 'Market signal', value: 'High demand' },
    ])
  })

  it('leaves out the timeline rows without a fit, and storage when late', () => {
    const l = L('L-9XXQC3')
    expect(specSheetRows(l, null).some((r) => r.label === 'Timeline check')).toBe(false)
    const late = specSheetRows(l, timelineFit(l.availability, '2027-03-01'))
    expect(late.find((r) => r.label === 'Timeline check')?.value).toBe('Not available in time')
    expect(late.some((r) => r.label === 'Storage until the start')).toBe(false)
  })

  it('names the collection point, gives the grade only for steel and L14 when nothing is claimed', () => {
    const hub = specSheetRows(L('L-NHZ32R'), null)
    expect(hub.find((r) => r.label === 'Collection point')?.value).toBe('Open yard, Barking')
    expect(hub.find((r) => r.label === 'Grade')?.value).toBe('S355')
    expect(specSheetRows(L('L-A945G6'), null).some((r) => r.label === 'Grade')).toBe(false)
    const surplus = specSheetRows(L('L-YZ2C7H'), null)
    expect(surplus.find((r) => r.label === 'Avoided carbon')?.value).toBe(LABELS.L14)
    expect(surplus.find((r) => r.label === 'Sustainability band')?.value).toBe('Not claimed')
  })

  it('holds no private string of any seed lot', () => {
    for (const lot of Object.values(w.lots)) {
      const item = w.items[lot.itemId]
      const text = JSON.stringify(specSheetRows(listingFor(w, lot.id, A), timelineFit(listingFor(w, lot.id, A).availability, '2028-04-03')))
      for (const s of lotPrivateStrings(lot, item, w.buildings[item.buildingId], w)) expect(text).not.toContain(s)
    }
  })
})

describe('specSheet', () => {
  const project = { name: 'Merrowgate Wharf', typeLabel: 'Office', startDate: '2028-04-03' }
  const item = (publicId: string, status: 'pending' | 'sent' | 'approved' | 'declined') => ({ listing: L(publicId), fit: timelineFit(L(publicId).availability, project.startDate), status })

  it('titles the schedule and states the project line', () => {
    const s = specSheet(project, [])
    expect(s.title).toBe('Specification schedule, Merrowgate Wharf')
    expect(s.projectLine).toBe('Office project. Materials needed on site from 3 April 2028.')
    expect(s.caveats).toEqual([LABELS.L39, LABELS.L20])
    expect(s.blocks).toEqual([])
  })

  it('adds the engineer caveat when any item is steel', () => {
    expect(specSheet(project, [item('L-A945G6', 'approved'), item('L-9F4CQQ', 'pending')]).caveats).toEqual([LABELS.L39, LABELS.L20, LABELS.L4, LABELS.L11, LABELS.L37, LABELS.L38, LABELS.L10])
    expect(specSheet(project, [item('L-A945G6', 'approved')]).caveats).toEqual([LABELS.L39, LABELS.L20, LABELS.L11, LABELS.L37, LABELS.L38, LABELS.L10])
  })

  it('labels the carbon, band and signal on every sheet with items, and the timeline check only when a fit is shown', () => {
    const noFit = { listing: L('L-A945G6'), fit: null, status: 'approved' as const }
    expect(specSheet(project, [noFit]).caveats).toEqual([LABELS.L39, LABELS.L20, LABELS.L11, LABELS.L37, LABELS.L10])
  })

  it('puts approved items first, then the rest, each by public ID', () => {
    const s = specSheet(project, [item('L-Q23X7N', 'pending'), item('L-A945G6', 'approved'), item('L-9F4CQQ', 'sent'), item('L-6VWCWH', 'approved')])
    expect(s.blocks.map((b) => [b.publicId, b.status])).toEqual([
      ['L-6VWCWH', 'approved'],
      ['L-A945G6', 'approved'],
      ['L-9F4CQQ', 'sent'],
      ['L-Q23X7N', 'pending'],
    ])
    expect(s.blocks[0].title).toBe('Raised access floor panels, 600 by 600')
    expect(s.blocks[0].rows).toEqual(specSheetRows(L('L-6VWCWH'), timelineFit(L('L-6VWCWH').availability, project.startDate)))
  })

  it('leaves out listings that are no longer available', () => {
    const s = specSheet(project, [item('L-R8Q33F', 'approved'), item('L-A945G6', 'pending')])
    expect(s.blocks.map((b) => b.publicId)).toEqual(['L-A945G6'])
  })
})
