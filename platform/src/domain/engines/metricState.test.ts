import { describe, expect, it } from 'vitest'
import { METRIC_STATE_WORDS, metricReading, metricState } from './metricState'

describe('metricState', () => {
  it.each([
    [19.91, 20, 'at_least', 'warning'],
    [20.29, 20, 'at_least', 'good'],
    [15, 20, 'at_least', 'critical'],
    [5, null, 'at_least', 'neutral'],
    [450, 500, 'at_most', 'good'],
    [540, 500, 'at_most', 'warning'],
    [600, 500, 'at_most', 'critical'],
    [20, 20, 'at_least', 'good'],
  ] as const)('metricState(%s, %s, %s) is %s', (value, target, direction, expected) => {
    expect(metricState(value, target, direction)).toBe(expected)
  })

  it('is good on the target and warning on the edge of the band, both ways', () => {
    expect(metricState(500, 500, 'at_most')).toBe('good')
    expect(metricState(18, 20, 'at_least')).toBe('warning')
    expect(metricState(17.99, 20, 'at_least')).toBe('critical')
    expect(metricState(550, 500, 'at_most')).toBe('warning')
    expect(metricState(550.01, 500, 'at_most')).toBe('critical')
  })

  it('collapses warning when the band is 0', () => {
    expect(metricState(19.91, 20, 'at_least', 0)).toBe('critical')
    expect(metricState(20, 20, 'at_least', 0)).toBe('good')
    expect(metricState(501, 500, 'at_most', 0)).toBe('critical')
    expect(metricState(500, 500, 'at_most', 0)).toBe('good')
  })

  it('takes a wider band', () => {
    expect(metricState(15, 20, 'at_least', 0.25)).toBe('warning')
    expect(metricState(620, 500, 'at_most', 0.25)).toBe('warning')
  })

  it('is neutral with no target or no figure, whatever the direction', () => {
    expect(metricState(5, null, 'at_most')).toBe('neutral')
    expect(metricState(Number.NaN, 20, 'at_least')).toBe('neutral')
    expect(metricState(5, Number.NaN, 'at_least')).toBe('neutral')
  })

  it('throws on a band outside 0 to 1', () => {
    expect(() => metricState(5, 10, 'at_least', -0.1)).toThrow(RangeError)
    expect(() => metricState(5, 10, 'at_least', 1)).toThrow(RangeError)
    expect(() => metricState(5, 10, 'at_least', Number.NaN)).toThrow(RangeError)
  })
})

describe('metricReading', () => {
  it('gives the state with its word, and No target set for neutral', () => {
    expect(metricReading(5, null, 'at_least')).toEqual({ state: 'neutral', word: 'No target set' })
    expect(metricReading(19.91, 20, 'at_least')).toEqual({ state: 'warning', word: 'Near target' })
    expect(metricReading(20.29, 20, 'at_least')).toEqual({ state: 'good', word: 'On target' })
    expect(metricReading(600, 500, 'at_most')).toEqual({ state: 'critical', word: 'Off target' })
  })

  it('uses the words of the design', () => {
    expect(METRIC_STATE_WORDS).toEqual({ good: 'On target', warning: 'Near target', critical: 'Off target', neutral: 'No target set' })
  })
})
