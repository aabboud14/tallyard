import { describe, it, expect } from 'vitest'
import { creditById } from '../reference/certification'
import { creditItems, defaultIncluded, defaultTargeted, schemeCounts, suggestedStatus, type CreditMetrics, type MappedItem } from './certification'

const th02: MappedItem = { publicId: 'L-WPX5A6', description: 'UB 533x210x92, 9.0 m', family: 'steel_section', status: 'Approved', eraBand: null, testStatus: 'untested' }
const os11: MappedItem = { publicId: 'L-NHZ32R', description: 'UB 457x191x67, 9.0 m', family: 'steel_section', status: 'Approved', eraBand: '1970 or later', testStatus: 'tested' }
const stone: MappedItem = { publicId: 'L-R8Q33F', description: 'Portland stone cladding, 50 mm', family: 'stone_cladding', status: 'Confirmed', eraBand: null, testStatus: 'inspected' }
const old: MappedItem = { ...os11, publicId: 'L-OLD000', eraBand: 'before 1970' }
const credit = (id: string) => creditById(id)!
const metrics = (contentSecured: number, contentWithApproved: number, hasBill = true): CreditMetrics => ({ hasBill, contentSecured, contentWithApproved, aim: 0.2, avoidedSecuredT: 47.8, statement: null })

describe('mapping materials to credits', () => {
  it('each rule against steel, tested steel and stone', () => {
    for (const it of [th02, os11, stone]) expect(defaultIncluded('all_reused', it)).toBe(true)
    expect([th02, os11, stone].map((x) => defaultIncluded('steel', x))).toEqual([true, true, false])
    expect([th02, os11, stone, old].map((x) => defaultIncluded('pre_1970_or_untested', x))).toEqual([true, false, false, true])
    expect([th02, os11, stone].map((x) => defaultIncluded('none', x))).toEqual([false, false, false])
    expect(creditItems(credit('ce-content'), [th02, os11, stone], {})).toEqual([])
  })

  it("the consultant's overrides add and drop items", () => {
    const rows = creditItems(credit('breeam-wst06'), [th02, stone], { 'L-WPX5A6': false, 'L-R8Q33F': true })
    expect(rows.map((r) => [r.item.publicId, r.included, r.byDefault])).toEqual([
      ['L-WPX5A6', false, true],
      ['L-R8Q33F', true, false],
    ])
  })

  it('a credit starts targeted only when its scheme is', () => {
    expect(defaultTargeted(credit('breeam-mat05'), true)).toBe(true)
    expect(defaultTargeted(credit('breeam-mat05'), false)).toBe(false)
    expect(defaultTargeted(credit('breeam-wst06'), true)).toBe(false)
  })
})

describe('suggested statuses', () => {
  const ce = credit('ce-content')
  it('content by value against the aim', () => {
    expect(suggestedStatus(ce, metrics(0.1991, 0.2029), [])!.status).toBe('in_progress')
    expect(suggestedStatus(ce, metrics(0.2, 0.2), [])!.status).toBe('evidence_ready')
    expect(suggestedStatus(ce, metrics(0.15, 0.16), [])!.status).toBe('at_risk')
    expect(suggestedStatus(ce, metrics(0.15, 0.16, false), [])).toBeNull()
    expect(suggestedStatus(ce, metrics(0.2, 0.2), [])!.reason).toBe('Content by value 20.0% secured, aim 20.0%')
  })

  it('hazard screening: untested primary beams put WELL X01 at risk', () => {
    const x01 = credit('well-x01')
    const included = creditItems(x01, [th02, os11, stone], {}).filter((r) => r.included).map((r) => r.item)
    expect(included.map((i) => i.publicId)).toEqual(['L-WPX5A6'])
    expect(suggestedStatus(x01, metrics(0.2, 0.2), included)).toEqual({ status: 'at_risk', reason: '1 item to screen: built before 1970 or untested' })
    expect(suggestedStatus(x01, metrics(0.2, 0.2), [])).toBeNull()
  })

  it('reused items: secured, approved only, or none', () => {
    const mat05 = credit('breeam-mat05')
    expect(suggestedStatus(mat05, metrics(0.2, 0.2), [stone, th02])).toEqual({ status: 'in_progress', reason: '1 secured item mapped' })
    expect(suggestedStatus(mat05, metrics(0.2, 0.2), [th02, os11])).toEqual({ status: 'in_progress', reason: '2 approved items, none secured yet' })
    expect(suggestedStatus(mat05, metrics(0.2, 0.2), [])!.status).toBe('not_started')
  })

  it('the statement, waste reporting and the specification', () => {
    const st = credit('ce-statement')
    expect(suggestedStatus(st, { ...metrics(0.2, 0.2), statement: 'reviewed' }, [])!.status).toBe('evidence_ready')
    expect(suggestedStatus(st, { ...metrics(0.2, 0.2), statement: 'ready_for_review' }, [])!.status).toBe('in_progress')
    expect(suggestedStatus(st, { ...metrics(0.2, 0.2), statement: 'draft' }, [])!.status).toBe('in_progress')
    expect(suggestedStatus(st, metrics(0.2, 0.2), [])!.status).toBe('not_started')
    expect(suggestedStatus(credit('breeam-wst01'), metrics(0.2, 0.2), [])).toBeNull()
    expect(suggestedStatus(credit('well-x07'), metrics(0.2, 0.2), [stone])).toBeNull()
  })
})

describe('scheme counts', () => {
  it('ignores rows that are not targeted', () => {
    const c = schemeCounts([
      { targeted: true, status: 'evidence_ready' },
      { targeted: true, status: 'at_risk' },
      { targeted: false, status: 'at_risk' },
      { targeted: true, status: 'not_started' },
    ])
    expect(c).toMatchObject({ targeted: 3, ready: 1, atRisk: 1 })
    expect(c.counts).toEqual({ not_started: 1, in_progress: 0, at_risk: 1, evidence_ready: 1, not_applicable: 0 })
  })
})
