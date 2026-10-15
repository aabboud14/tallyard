import { describe, it, expect } from 'vitest'
import { closeTo } from '../../test/helpers'
import { goalDef } from '../reference/goals'
import { defaultTarget, effectiveTarget, goalProgress, goalValueText, GOAL_INPUT_ERRORS, isValidGoalValue, parseGoalInput, sumTargets } from './goals'

const content = goalDef('content_by_value')
const upfront = goalDef('upfront_carbon')
const breeam = goalDef('breeam')
const leed = goalDef('leed')
const carbon = goalDef('avoided_carbon')

describe('goal progress', () => {
  it('at least: content by value below its target', () => {
    const p = goalProgress(content, 0.25, 0.1991)
    expect(p.status).toBe('below')
    closeTo(p.share, 0.7964, 4)
  })

  it('at most: upfront carbon met, then over', () => {
    expect(goalProgress(upfront, 950, 820)).toEqual({ status: 'met', share: 1 })
    const over = goalProgress(upfront, 950, 1000)
    expect(over.status).toBe('below')
    closeTo(over.share, 0.95, 6)
  })

  it('ratings by their place on the scale', () => {
    expect(goalProgress(breeam, 'Excellent', 'Very good')).toEqual({ status: 'below', share: 0.75 })
    expect(goalProgress(breeam, 'Excellent', 'Outstanding')).toEqual({ status: 'met', share: 1 })
  })

  it('no target and no result', () => {
    expect(goalProgress(content, null, 0.2)).toEqual({ status: 'no_target', share: 0 })
    expect(goalProgress(content, 0.2, null)).toEqual({ status: 'no_data', share: 0 })
  })

  it('a target of 0 is met at once', () => {
    expect(goalProgress(carbon, 0, 0)).toEqual({ status: 'met', share: 1 })
  })
})

describe('default and effective targets', () => {
  const ctx = (projectType: string, requirementIds = ['gla-wlc']) => ({ requirementIds, projectType })
  it('upfront carbon by project type, from the whole life-cycle carbon guidance', () => {
    expect(defaultTarget(upfront, ctx('office'))).toMatchObject({ value: 950, source: 'default', requirementId: 'gla-wlc', status: 'indicative' })
    expect(defaultTarget(upfront, ctx('residential')).value).toBe(850)
    expect(defaultTarget(upfront, ctx('hotel'))).toMatchObject({ value: null, source: 'none' })
    expect(defaultTarget(upfront, ctx('office', ['nppf']))).toMatchObject({ value: null, source: 'none' })
  })

  it('content by value takes the first requirement that applies', () => {
    expect(defaultTarget(content, ctx('office', ['lp-si7', 'gla-ces']))).toMatchObject({ value: 0.2, requirementId: 'gla-ces', status: 'published' })
    expect(defaultTarget(content, ctx('office', ['lp-si7']))).toMatchObject({ value: 0.2, requirementId: 'lp-si7' })
  })

  it('an override wins; an override of null means not targeted', () => {
    const d = defaultTarget(content, ctx('office', ['gla-ces']))
    const o = { goalId: 'content_by_value' as const, note: '', setByUserId: 'u', setAt: '2026-10-01T09:00:00.000Z' }
    expect(effectiveTarget(d, { ...o, value: 0.25 })).toMatchObject({ value: 0.25, source: 'override', requirementId: 'gla-ces' })
    const off = effectiveTarget(d, { ...o, value: null })
    expect(off).toMatchObject({ value: null, source: 'override' })
    expect(goalValueText(content, off.value)).toBe('Not targeted')
    expect(effectiveTarget(d, undefined)).toBe(d)
  })
})

describe('reading and writing targets', () => {
  it('percentages, tonnes and levels', () => {
    expect(parseGoalInput(content, '25')).toEqual({ value: 0.25 })
    expect(parseGoalInput(content, '25%')).toEqual({ value: 0.25 })
    expect(parseGoalInput(content, ' 19.5 % ')).toEqual({ value: 0.195 })
    expect(parseGoalInput(content, '120')).toEqual({ error: GOAL_INPUT_ERRORS.ratio })
    expect(parseGoalInput(content, '')).toEqual({ error: GOAL_INPUT_ERRORS.empty })
    expect(parseGoalInput(content, 'abc')).toEqual({ error: GOAL_INPUT_ERRORS.ratio })
    expect(parseGoalInput(carbon, '1,500')).toEqual({ value: 1500 })
    expect(parseGoalInput(carbon, '-3')).toEqual({ error: GOAL_INPUT_ERRORS.tCO2e })
    expect(parseGoalInput(upfront, '0')).toEqual({ error: GOAL_INPUT_ERRORS.kgCO2e_m2 })
    expect(parseGoalInput(upfront, '900')).toEqual({ value: 900 })
    expect(parseGoalInput(leed, 'Gold')).toEqual({ value: 'Gold' })
    expect(parseGoalInput(leed, 'gold')).toEqual({ value: 'Gold' })
    expect(parseGoalInput(leed, 'Excellent')).toEqual({ error: GOAL_INPUT_ERRORS.rating })
  })

  it('text for each unit', () => {
    expect(goalValueText(content, 0.25)).toBe('25%')
    expect(goalValueText(content, 0.1991)).toBe('19.9%')
    expect(goalValueText(content, 0.2)).toBe('20%')
    expect(goalValueText(carbon, 47.7974)).toBe('47.8 tCO2e')
    expect(goalValueText(upfront, 820)).toBe('820 kgCO2e per m2')
    expect(goalValueText(breeam, 'Excellent')).toBe('Excellent')
    expect(goalValueText(breeam, null)).toBe('Not targeted')
  })

  it('stored values must fit the goal', () => {
    expect(isValidGoalValue(content, 1.2)).toBe(false)
    expect(isValidGoalValue(content, 0.3)).toBe(true)
    expect(isValidGoalValue(carbon, 2_000_000)).toBe(false)
    expect(isValidGoalValue(upfront, 6000)).toBe(false)
    expect(isValidGoalValue(breeam, 'Gold')).toBe(false)
    expect(isValidGoalValue(breeam, 'Good')).toBe(true)
    expect(isValidGoalValue(carbon, 'Good')).toBe(false)
  })

  it('sums results and targets over rows with a target', () => {
    expect(sumTargets([{ actual: 47.8, target: 150 }, { actual: 3, target: null }, { actual: null, target: 20 }, { actual: 9, target: 0 }])).toEqual({ actual: 47.8, target: 170 })
  })
})
