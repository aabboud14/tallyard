import { describe, it, expect } from 'vitest'
import type { PublicCarbon } from '../types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { BAND_WORDS } from '../reference/labels'
import { V1_ASSUMPTIONS } from '../reference/v1assumptions'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { sustainabilityBand } from './band'

const c = (percent: number): PublicCarbon => ({ avoidedT: 10, percent })

describe('sustainabilityBand', () => {
  it('reads Not claimed with no segments when no carbon is claimed', () => {
    expect(sustainabilityBand(null)).toEqual({ band: 'none', segments: 0, word: 'Not claimed' })
  })

  it('treats a sold listing (zero claim, no share) as Not claimed', () => {
    const sold = { avoidedT: 0, percent: null } as unknown as PublicCarbon
    expect(sustainabilityBand(sold).band).toBe('none')
  })

  it('uses the placeholder thresholds 0.9 and 0.8', () => {
    expect(V1_ASSUMPTIONS.band).toEqual({ high: 0.9, medium: 0.8 })
  })

  it('switches on both sides of each threshold', () => {
    expect(sustainabilityBand(c(1))).toEqual({ band: 'high', segments: 3, word: BAND_WORDS.high })
    expect(sustainabilityBand(c(0.9))).toEqual({ band: 'high', segments: 3, word: 'High' })
    expect(sustainabilityBand(c(0.8999))).toEqual({ band: 'medium', segments: 2, word: 'Medium' })
    expect(sustainabilityBand(c(0.8))).toEqual({ band: 'medium', segments: 2, word: 'Medium' })
    expect(sustainabilityBand(c(0.7999))).toEqual({ band: 'low', segments: 1, word: 'Low' })
    expect(sustainabilityBand(c(0))).toEqual({ band: 'low', segments: 1, word: 'Low' })
  })

  it('takes other thresholds', () => {
    expect(sustainabilityBand(c(0.85), { high: 0.8, medium: 0.5 }).band).toBe('high')
    expect(sustainabilityBand(c(0.6), { high: 0.8, medium: 0.5 }).band).toBe('medium')
    expect(sustainabilityBand(c(0.4), { high: 0.8, medium: 0.5 }).band).toBe('low')
  })

  it('spreads the seed families across the bands (13.7)', () => {
    const w = createSeed()
    const band = (publicId: string) => {
      const lot = Object.values(w.lots).find((l) => l.publicId === publicId)!
      return sustainabilityBand(listingFor(w, lot.id, A).carbon).band
    }
    expect(band('L-9F4CQQ')).toBe('high') // steel
    expect(band('L-9XXQC3')).toBe('high') // curtain wall
    expect(band('L-J4WX28')).toBe('high') // precast
    expect(band('L-A945G6')).toBe('high') // brick
    expect(band('L-CJGQP7')).toBe('high') // timber
    expect(band('L-Q23X7N')).toBe('medium') // Portland stone
    expect(band('L-6VWCWH')).toBe('low') // raised floor
    expect(band('L-YZ2C7H')).toBe('none') // unused surplus
  })
})
