import { describe, expect, it } from 'vitest'
import { niceMax, ticks } from './chartScale'

describe('niceMax', () => {
  it.each([
    [0, 1],
    [7, 10],
    [142.5, 200],
    [100.8, 200],
    [19.91, 20],
    [20.29, 25],
    [453, 500],
    [1, 1],
  ])('niceMax(%s) is %s', (max, expected) => {
    expect(niceMax(max)).toBe(expected)
  })

  it('keeps a nice figure as it is, at every power of ten', () => {
    for (const x of [0.01, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 100, 1000, 25000, 1e6]) expect(niceMax(x)).toBe(x)
  })

  it('goes up to the next nice figure for small and large values', () => {
    expect(niceMax(0.03)).toBe(0.05)
    expect(niceMax(0.3)).toBe(0.5)
    expect(niceMax(2.01)).toBe(2.5)
    expect(niceMax(5.0001)).toBe(10)
    expect(niceMax(999)).toBe(1000)
    expect(niceMax(1001)).toBe(2000)
  })

  it('throws on a negative or non-finite input', () => {
    expect(() => niceMax(-1)).toThrow(RangeError)
    expect(() => niceMax(Number.NaN)).toThrow(RangeError)
    expect(() => niceMax(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe('ticks', () => {
  it('splits niceMax into four intervals by default', () => {
    expect(ticks(142.5)).toEqual([0, 50, 100, 150, 200])
  })

  it('takes the number of intervals', () => {
    expect(ticks(19.91, 4)).toEqual([0, 5, 10, 15, 20])
    expect(ticks(453, 5)).toEqual([0, 100, 200, 300, 400, 500])
    expect(ticks(0.3, 5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5])
  })

  it('ends on niceMax and starts at 0', () => {
    const t = ticks(20.29, 4)
    expect(t[0]).toBe(0)
    expect(t[t.length - 1]).toBe(niceMax(20.29))
    expect(t).toEqual([0, 6.25, 12.5, 18.75, 25])
  })

  it('throws on a negative input or an interval count below 1', () => {
    expect(() => ticks(-5)).toThrow(RangeError)
    expect(() => ticks(10, 0)).toThrow(RangeError)
    expect(() => ticks(10, 2.5)).toThrow(RangeError)
  })
})
