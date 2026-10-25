import { describe, it, expect } from 'vitest'
import { FORBIDDEN } from '../../ui/testing'
import { BULLET, isStale, STATEMENT_SECTIONS, statementBlocks, statementPlainText, statementSections, type StatementInput } from './statement'

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
  ribaStage: 2,
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
  targets: [{ label: 'Reused and recycled content by value', targetText: '25%', actualText: '19.9%', statusText: 'Below target', status: 'below' }],
  credits: [{ schemeLabel: 'BREEAM', code: 'Mat 05', title: 'Material efficiency: reuse of materials', statusLabel: 'In progress', status: 'in_progress', kind: 'credit' }],
  untargeted: [],
}

const EMPTY: StatementInput = { ...MERROWGATE_INPUT, hasBill: false, items: [], targets: [], credits: [], requirementTitles: [], contentTarget: null, carbonTargetT: null, avoidedSecuredT: 0, avoidedApprovedT: 0 }

const DATE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}\b/

describe('the circular economy statement', () => {
  it('names the credits at risk or with evidence ready, scheme by scheme, and turns them into next steps', () => {
    const input: StatementInput = {
      ...MERROWGATE_INPUT,
      ribaStage: 3,
      targets: [
        { label: 'BREEAM rating', targetText: 'Excellent', actualText: 'Very good', statusText: 'Below target', status: 'below' },
        { label: 'Construction and demolition waste diverted from landfill', targetText: '95%', actualText: 'No result yet', statusText: 'No result yet', status: 'no_data' },
      ],
      credits: [
        { schemeLabel: 'WELL', code: 'X01', title: 'Material restrictions (precondition)', statusLabel: 'At risk', status: 'at_risk', kind: 'credit' },
        { schemeLabel: 'WELL', code: 'X07', title: 'Materials transparency', statusLabel: 'Evidence ready', status: 'evidence_ready', kind: 'credit' },
        { schemeLabel: 'Circular economy', code: 'Reuse', title: 'Reuse of materials', statusLabel: 'In progress', status: 'in_progress', kind: 'measure' },
      ],
      untargeted: [{ label: 'LEED certification', requirementTitle: 'LEED v5' }],
    }
    const s = statementSections(input)
    const text = (id: string) => s.find((x) => x.id === id)!.text
    expect(text('certification').split('\n').slice(1, 3)).toEqual([
      `${BULLET}WELL: 2 credits targeted, 1 with evidence ready and 1 at risk. At risk: X01, material restrictions (precondition). Evidence ready: X07, materials transparency.`,
      `${BULLET}Circular economy: 1 measure targeted, 1 in progress.`,
    ])
    const steps = text('next_steps')
    expect(steps).toContain('Close the gap on BREEAM rating: now Very good, target Excellent.')
    expect(steps).toContain('Record a result for construction and demolition waste diverted from landfill.')
    expect(steps).toContain('Resolve WELL X01, material restrictions (precondition), which is at risk.')
    expect(steps).toContain('Set a target for LEED certification, as LEED v5 is recorded as a requirement.')
    expect(steps.split('\n').at(-1)).toBe(`${BULLET}Planning application stage: written statement and completed template, including the bill of materials, recycling and waste reporting and end-of-life strategy.`)
  })

  it('reads a section as paragraphs and lists, taking typed list marks too', () => {
    expect(statementBlocks(`Lead.\n${BULLET}One\n${BULLET}Two\n\nAfter.\n- Typed\n* Starred`)).toEqual([
      { kind: 'paragraph', text: 'Lead.' },
      { kind: 'list', items: ['One', 'Two'] },
      { kind: 'paragraph', text: 'After.' },
      { kind: 'list', items: ['Typed', 'Starred'] },
    ])
  })

  it("writes eight sections in order from Merrowgate's records", () => {
    const s = statementSections(MERROWGATE_INPUT)
    expect(s.map((x) => x.id)).toEqual(['context', 'approach', 'reuse', 'content', 'carbon', 'targets', 'certification', 'next_steps'])
    expect(s.map((x) => x.heading)).toEqual(STATEMENT_SECTIONS.map((x) => x.heading))
    const text = (id: string) => s.find((x) => x.id === id)!.text
    // Round 2 follow-up (review of the r2f fixes): one decimal, as the targets and next steps of the same statement.
    for (const p of ['19.9%', '20.3%', '17.6%', '25%']) expect(text('content')).toContain(p)
    for (const p of ['19.91%', '20.29%', '17.62%']) expect(text('content')).not.toContain(p)
    expect(text('carbon')).toContain('47.8 tCO2e')
    expect(text('carbon')).toContain('148.6 tCO2e')
    expect(text('carbon')).toContain('The project target is 150.0 tCO2e.')
    // Round 2 follow-up (audit note 44): the approved figure is named as the one every other page shows (100.8),
    // and 148.6 reads as the total once the approved materials are reserved.
    expect(text('carbon')).toContain('The approved materials not yet reserved add 100.8 tCO2e, so 148.6 tCO2e in total once they are reserved.')
    // Round 2 follow-up (audit note 44): the reclaimed materials read as a statement, grouped by status and family,
    // with no listing codes.
    const reuse = text('reuse').split('\n')
    expect(reuse[0]).toBe('4 reclaimed materials are on record for Merrowgate Wharf: 2 secured and 2 approved by the client and not yet reserved.')
    expect(reuse[1]).toBe('Secured through earlier deals or accepted reservations:')
    expect(reuse[2]).toBe(`${BULLET}Portland stone cladding, 50 mm: 520 m2`)
    expect(reuse).toContain('Approved by the client, to be reserved:')
    expect(reuse).toContain(`${BULLET}Structural steel sections: UB 533x210x92, 9.0 m (12 pieces) and UB 457x191x67, 9.0 m (16 pieces)`)
    expect(reuse).toHaveLength(6)
    for (const id of ['L-R8Q33F', 'L-5APGJ7', 'L-WPX5A6', 'L-NHZ32R']) expect(text('reuse')).not.toContain(id)
    expect(text('context')).toContain('Merrowgate Wharf is an office scheme of 16,500 m2 GIA in Newham, Inner London East, at RIBA Stage 2, Concept Design.')
    expect(text('approach')).toContain('Reclaimed stone cladding, raised access floor panels and structural steel sections have been chosen')
    // Round 2 follow-up (audit note 44): list lines carry a bullet; certification reads one sentence per scheme;
    // the next steps come from the project's own records, then the step for its RIBA stage.
    expect(text('targets')).toBe(`The targets for this project and where each stands:\n${BULLET}Reused and recycled content by value: target 25%, now 19.9%, below target.`)
    expect(text('certification').split('\n')[1]).toBe(`${BULLET}BREEAM: 1 credit targeted, 1 in progress.`)
    expect(text('next_steps').split('\n')).toEqual([
      'Before the next issue of this statement:',
      `${BULLET}Reserve the 2 approved materials so they count as secured in the content and carbon figures.`,
      `${BULLET}Close the gap on reused and recycled content by value: now 19.9%, target 25%.`,
      `${BULLET}Pre-application stage: draft statement with the strategic approach and initial targets.`,
    ])
  })

  it('does not repeat "no result yet" for a goal without a result', () => {
    const input: StatementInput = { ...MERROWGATE_INPUT, targets: [{ label: 'Construction and demolition waste diverted from landfill', targetText: '95%', actualText: 'No result yet', statusText: 'No result yet', status: 'no_data' }] }
    const t = statementSections(input).find((x) => x.id === 'targets')!.text
    // Round 2 follow-up (audit note 44): the line is now a list line under a lead sentence; its words are unchanged.
    expect(t.split('\n')[1]).toBe(`${BULLET}Construction and demolition waste diverted from landfill: target 95%, no result yet.`)
  })

  it('says not yet when there are no materials and no bill', () => {
    const s = statementSections(EMPTY)
    const text = (id: string) => s.find((x) => x.id === id)!.text
    expect(text('approach')).toMatch(/^No reclaimed materials are on record yet\./)
    expect(text('reuse')).toMatch(/^None yet\./)
    expect(text('carbon').split('\n')[0]).toBe('No avoided carbon is on record yet, because no reclaimed materials are secured or approved.')
    expect(text('carbon')).not.toContain('0.0 tCO2e')
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

  // Round 2 follow-up review: an approved material whose reservation request is with the seller is not "to reserve".
  it('tells apart approved materials to request and those already with the seller', () => {
    const step = (items: StatementInput['items']) => statementSections({ ...MERROWGATE_INPUT, items }).find((x) => x.id === 'next_steps')!.text.split('\n')[1]
    const [a, b] = MERROWGATE_INPUT.items.filter((x) => x.status === 'Approved')
    const rest = MERROWGATE_INPUT.items.filter((x) => x.status !== 'Approved')
    expect(step([...rest, { ...a, withSeller: true }, b])).toBe(`${BULLET}Request a reservation for 1 approved material; 1 more is with the seller. Each counts as secured in the content and carbon figures once the seller accepts.`)
    expect(step([...rest, { ...a, withSeller: true }, { ...b, withSeller: true }])).toBe(`${BULLET}Follow up the 2 reservation requests with the seller so they count as secured in the content and carbon figures.`)
    expect(step([...rest, { ...a, withSeller: false }, b])).toBe(`${BULLET}Reserve the 2 approved materials so they count as secured in the content and carbon figures.`)
    expect(step([...rest, { ...a, withSeller: true }])).toBe(`${BULLET}Follow up the 1 reservation request with the seller so it counts as secured in the content and carbon figures.`)
  })

  // Round 2 follow-up review: the scheme whose measure is this statement says its count leaves the statement out.
  it("says a scheme's count is besides this statement when the statement is one of its measures", () => {
    const input: StatementInput = { ...MERROWGATE_INPUT, credits: [{ schemeLabel: 'Circular economy', code: 'CE1', title: 'Pre-redevelopment audit', statusLabel: 'In progress', status: 'in_progress', kind: 'measure' }] }
    const line = (i: StatementInput) => statementSections(i).find((x) => x.id === 'certification')!.text.split('\n')[1]
    expect(line({ ...input, selfMeasureScheme: 'Circular economy' })).toBe(`${BULLET}Circular economy: 1 measure targeted besides this statement, 1 in progress.`)
    expect(line({ ...input, selfMeasureScheme: null })).toBe(`${BULLET}Circular economy: 1 measure targeted, 1 in progress.`)
  })

  it('reads as plain text with its caveat at the end', () => {
    const t = statementPlainText('Title', 'Sub', [{ heading: 'H', text: 'Body' }], 'Caveat.')
    expect(t).toBe('Title\nSub\n\nH\nBody\n\nCaveat.')
  })
})
