import { describe, it, expect } from 'vitest'
import { pence } from '../../test/helpers'
import { HAULIERS } from '../reference/assumptions'
import { logisticsQuotes } from './logistics'
import { buyerCustody } from './custody'

describe('logistics agent and custody timeline (02 section 4, rules 14 and 15)', () => {
  it('quotes the hub to site leg and books the cheapest that meets the dates', () => {
    const r = logisticsQuotes(HAULIERS, 1, 31, '2026-10-07', '2028-04-03')
    expect(r.quotes.map((q) => q.haulier)).toEqual(['Haulier A', 'Haulier C', 'Haulier B'])
    pence(r.quotes[0].amount, 235.8)
    pence(r.quotes[1].amount, 260.1)
    pence(r.quotes[2].amount, 264.25)
    expect(r.quotes.map((q) => q.noticeDays)).toEqual([3, 5, 2])
    expect(r.chosen?.haulier).toBe('Haulier A')
  })
  it('skips a haulier whose notice runs past the delivery date', () => {
    const r = logisticsQuotes(HAULIERS, 1, 31, '2026-10-07', '2026-10-09')
    expect(r.chosen?.haulier).toBe('Haulier B')
  })
  it("builds the buyer's custody timeline", () => {
    const ev = buyerCustody('2026-10-07', '2027-03-15', true, '2028-04-03', '2026-10-07')
    expect(ev.map((e) => [e.label, e.date, e.done])).toEqual([
      ['Agreed', '2026-10-07', true],
      ['Handover at hub', '2027-03-15', false],
      ['Tested', '2027-03-29', false],
      ['Delivered', '2028-04-03', false],
    ])
  })
})
