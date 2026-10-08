// Indicative sustainability band from the avoided carbon share (brief/09-V1-PRODUCT.md sections 5.5 and 13.7).
import type { PublicCarbon } from '../types'
import type { Band } from '../v1types'
import { BAND_WORDS } from '../reference/labels'
import { V1_ASSUMPTIONS } from '../reference/v1assumptions'

export function sustainabilityBand(carbon: PublicCarbon, t: { high: number; medium: number } = V1_ASSUMPTIONS.band): Band {
  // A sold listing carries a zero claim with no share; nothing is claimed for it either.
  if (carbon === null || typeof carbon.percent !== 'number' || !Number.isFinite(carbon.percent)) return { band: 'none', segments: 0, word: BAND_WORDS.none }
  if (carbon.percent >= t.high) return { band: 'high', segments: 3, word: BAND_WORDS.high }
  if (carbon.percent >= t.medium) return { band: 'medium', segments: 2, word: BAND_WORDS.medium }
  return { band: 'low', segments: 1, word: BAND_WORDS.low }
}
