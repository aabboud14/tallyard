// Help, Methodology and the open questions speak of a three-month window, as the rest of the product does, never
// of a quarter (recording audit note 14).
import { describe, expect, it } from 'vitest'
import { parameterRows } from './assumptions'
import { OPEN_QUESTIONS } from './openQuestions'

describe('methodology wording', () => {
  it('has no quarter in any parameter row or open question', () => {
    for (const r of parameterRows()) expect(`${r.label} ${r.value} ${r.unit} ${r.source}`, r.id).not.toMatch(/\bquarters?\b|\bQ[1-4]\b/i)
    for (const g of OPEN_QUESTIONS) for (const q of g.items) expect(q).not.toMatch(/\bquarters?\b|\bQ[1-4]\b/i)
  })

  it('names the timing disclosure as a three-month window or a month', () => {
    expect(parameterRows().find((r) => r.id === 'disclosure')!.value).toContain('Timing three-month window 5 or month 15.')
  })
})
