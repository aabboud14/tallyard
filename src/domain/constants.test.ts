import { describe, it, expect } from 'vitest'
import { DEMO_TODAY, PRODUCT_NAME, STORAGE_PREFIX } from './constants'

describe('constants', () => {
  it('fixes the demo date, product name and storage prefix', () => {
    expect(DEMO_TODAY).toBe('2026-10-07')
    expect(PRODUCT_NAME).toBe('Tallyard')
    expect(STORAGE_PREFIX).toBe('tallyard-v05')
  })
})
