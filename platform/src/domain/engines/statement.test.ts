import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { isStale, STATEMENT_SECTIONS, statementPlainText, statementSections, type StatementInput } from './statement'

/** Merrowgate Wharf's records on the fixture date, as the store builds them. */
const MERROWGATE_INPUT: StatementInput = {
  projectName: 'Merrowgate Wharf',
  clientName: 'Lantern Quay Developments',
  architectName: 'Studio Oriel',
  consultantName: 'Halewick Sustainability',
  typeLabel: 'Office',
  giaM2: 16500,
  localAuthority: 'Newham',
  region: 'Inner London East',
  stageText: 'RIBA Stage 2, Concept Design',
  requirementTitles: ['Reducing waste and supporting the circular economy', 'Circular Economy Statements guidance'],
  hasBill: true,
  contentSecured: 0.199104,
  contentWithApproved: 0.20286,
  contentWithoutReuse: 0.176208,
  aim: 0.2,
  contentTarget: 0.25,
  avoidedSecuredT: 47.7974,
  avoidedApprovedT: 100.8227,
  carbonTargetT: 150,
  items: [
    { publicId: 'L-R8Q33F', description: 'Portland stone cladding, 50 mm', quantityLabel: '520 m2', family: 'stone_cladding', status: 'Confirmed' },
    { publicId: 'L-5APGJ7', description: 'Raised access floor panels, 600 by 600', quantityLabel: '3,800 panels (1,368 m2)', family: 'raised_floor', status: 'Confirmed' },
    { publicId: 'L-WPX5A6', description: 'UB 533x210x92, 9.0 m', quantityLabel: '12 pieces', family: 'steel_section', status: 'Approved' },
    { publicId: 'L-NHZ32R', description: 'UB 457x191x67, 9.0 m', quantityLabel: '16 pieces', family: 'steel_section', status: 'Approved' },
  ],
  targets: [{ label: 'Reused and recycled content by value', targetText: '25%', actualText: '19.9%', statusText: 'Below target' }],
  credits: [{ schemeLabel: 'BREEAM', code: 'Mat 05', title: 'Material efficiency: reuse of materials', statusLabel: 'In progress' }],
}

const EMPTY: StatementInput = { ...MERROWGATE_INPUT, hasBill: false, items: [], targets: [], credits: [], requirementTitles: [], contentTarget: null, carbonTargetT: null, avoidedSecuredT: 0, avoidedApprovedT: 0 }

const DATE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}\b/

describe('the circular economy statement', () => {
  it("writes eight sections in order from Merrowgate's records", () => {
    const s = statementSections(MERROWGATE_INPUT)
    expect(s.map((x) => x.id)).toEqual(['context', 'approach', 'reuse', 'content', 'carbon', 'targets', 'certification', 'next_steps'])
    expect(s.map((x) => x.heading)).toEqual(STATEMENT_SECTIONS.map((x) => x.heading))
    const text = (id: string) => s.find((x) => x.id === id)!.text
    for (const p of ['19.91%', '20.29%', '17.62%', '25%']) expect(text('content')).toContain(p)
    expect(text('carbon')).toContain('47.8 tCO2e')
    expect(text('carbon')).toContain('148.6 tCO2e')
    expect(text('carbon')).toContain('The project target is 150.0 tCO2e.')
    const reuse = text('reuse').split('\n')
    expect(reuse[0]).toBe('4 reclaimed materials on record: 2 secured through earlier deals or reservations, and 2 approved by the client and not yet reserved.')
    expect(reuse[1]).toBe('L-R8Q33F, Portland stone cladding, 50 mm, 520 m2: confirmed.')
    expect(reuse).toHaveLength(5)
    expect(text('context')).toContain('Merrowgate Wharf is an office scheme of 16,500 m2 GIA in Newham, Inner London East, at RIBA Stage 2, Concept Design.')
    expect(text('approach')).toContain('Reclaimed stone cladding, raised access floor panels and structural steel sections have been chosen')
    expect(text('targets')).toBe('Reused and recycled content by value: target 25%, now 19.9%, below target.')
    expect(text('certification').split('\n')[1]).toBe('BREEAM Mat 05, Material efficiency: reuse of materials: in progress.')
    expect(text('next_steps').split('\n')).toHaveLength(4)
  })

  it('says not yet when there are no materials and no bill', () => {
    const s = statementSections(EMPTY)
    const text = (id: string) => s.find((x) => x.id === id)!.text
    expect(text('approach')).toMatch(/^No reclaimed materials are on record yet\./)
    expect(text('reuse')).toBe('None yet.')
    expect(text('content')).toBe('The bill of materials is not yet on record, so content by value cannot be worked out.')
    expect(text('targets')).toBe('No targets are set yet.')
    expect(text('certification')).toMatch(/^No certification credits are targeted yet\./)
    expect(text('carbon')).not.toContain('The project target')
  })

  it('no section holds a dash, arrow or comparison sign, or a date', () => {
    for (const input of [MERROWGATE_INPUT, EMPTY])
      for (const s of statementSections(input)) {
        expect(s.text).not.toMatch(FORBIDDEN)
        expect(s.text).not.toMatch(DATE)
      }
  })

  it('an edit is stale once the generated text moves on', () => {
    const before = statementSections(MERROWGATE_INPUT).find((x) => x.id === 'carbon')!.text
    const edit = { text: 'Our words.', basis: before, editedAt: '2026-10-07T10:00:00.000Z', editedByUserId: 'u' }
    expect(isStale(edit, before)).toBe(false)
    const after = statementSections({ ...MERROWGATE_INPUT, avoidedSecuredT: 60 }).find((x) => x.id === 'carbon')!.text
    expect(isStale(edit, after)).toBe(true)
    expect(isStale(undefined, after)).toBe(false)
  })

  it('reads as plain text with its caveat at the end', () => {
    const t = statementPlainText('Title', 'Sub', [{ heading: 'H', text: 'Body' }], 'Caveat.')
    expect(t).toBe('Title\nSub\n\nH\nBody\n\nCaveat.')
  })
})
