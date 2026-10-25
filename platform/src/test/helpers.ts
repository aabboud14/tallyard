import { expect } from 'vitest'

/** Tolerance: half a unit of the last digit shown in the example, inclusive. */
export function closeTo(actual: number, expected: number, decimals: number): void {
  const tol = 0.5 * Math.pow(10, -decimals) + 1e-9
  const diff = Math.abs(actual - expected)
  expect(diff, `expected ${expected} (within ${tol}), got ${actual}`).toBeLessThanOrEqual(tol)
}

/** Money: to the penny. */
export function pence(actual: number, expected: number): void {
  expect(Math.round(actual * 100)).toBe(Math.round(expected * 100))
}
