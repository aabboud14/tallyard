// Project goals: default targets from the requirements that apply, the consultant's overrides, progress against a
// target, and reading a target typed in a form (client-consultant design, section 3.2). Pure.
import type { ReferenceStatus } from '../types'
import type { GoalOverride, GoalValue } from '../sustainabilityTypes'
import { GOAL_DEFAULTS, type GoalDef } from '../reference/goals'
import * as f from '../format'

export type GoalTarget = { value: GoalValue | null; source: 'default' | 'override' | 'none'; requirementId: string | null; basis: string | null; status: ReferenceStatus | null }
export type GoalProgress = { status: 'met' | 'below' | 'no_target' | 'no_data'; share: number }

const NONE: GoalTarget = { value: null, source: 'none', requirementId: null, basis: null, status: null }

/** The first default for the goal whose requirement applies to the project; by project type where the default needs one. */
export function defaultTarget(def: GoalDef, ctx: { requirementIds: string[]; projectType: string }): GoalTarget {
  const applies = new Set(ctx.requirementIds)
  const d = GOAL_DEFAULTS.find((x) => x.goalId === def.id && applies.has(x.requirementId))
  if (!d) return NONE
  const value = d.byType ? (d.byType[ctx.projectType] ?? null) : d.value
  if (value === null) return NONE
  return { value, source: 'default', requirementId: d.requirementId, basis: d.basis, status: d.status }
}

/** The consultant's override wins; a null override means not targeted. */
export function effectiveTarget(dflt: GoalTarget, override: GoalOverride | undefined): GoalTarget {
  if (!override) return dflt
  return { value: override.value, source: 'override', requirementId: dflt.requirementId, basis: dflt.basis, status: dflt.status }
}

function levelIndex(def: GoalDef, v: GoalValue): number {
  return def.scale ? def.scale.indexOf(String(v)) : -1
}

export function goalProgress(def: GoalDef, target: GoalValue | null, actual: GoalValue | null): GoalProgress {
  if (target === null) return { status: 'no_target', share: 0 }
  if (actual === null) return { status: 'no_data', share: 0 }
  if (def.unit === 'rating') {
    const iT = levelIndex(def, target)
    const iA = levelIndex(def, actual)
    if (iT < 0) return { status: 'no_target', share: 0 }
    if (iA < 0) return { status: 'no_data', share: 0 }
    return { status: iA >= iT ? 'met' : 'below', share: Math.min(1, (iA + 1) / (iT + 1)) }
  }
  const t = Number(target)
  const a = Number(actual)
  if (def.direction === 'at_least') {
    const share = t === 0 ? 1 : Math.min(1, a / t)
    return { status: a >= t ? 'met' : 'below', share }
  }
  return { status: a <= t ? 'met' : 'below', share: a <= t ? 1 : t / a }
}

/** '25%', '19.9%', '47.8 tCO2e', '820 kgCO2e per m2', 'Excellent', or 'Not targeted'. */
export function goalValueText(def: GoalDef, v: GoalValue | null): string {
  if (v === null) return 'Not targeted'
  if (def.unit === 'rating') return String(v)
  const n = Number(v)
  if (def.unit === 'ratio') {
    const one = f.fixed(n * 100, 1)
    return (one.endsWith('.0') ? f.fixed(n * 100, 0) : one) + '%'
  }
  if (def.unit === 'tCO2e') return f.carbon(n)
  return f.fixed(n, 0) + ' kgCO2e per m2'
}

export const GOAL_INPUT_ERRORS = {
  empty: 'Enter a target, or choose not targeted.',
  ratio: 'Enter a percentage from 0 to 100.',
  tCO2e: 'Enter a number of tonnes, 0 or more.',
  kgCO2e_m2: 'Enter kgCO2e per m2, more than 0.',
  rating: 'Choose a level.',
} as const

const NUMBER = /^\d+(\.\d+)?$/

/** Reads a target or result as typed: a percentage, tonnes, kgCO2e per m2 or a level. Thousands commas are accepted. */
export function parseGoalInput(def: GoalDef, text: string): { value: GoalValue } | { error: string } {
  const t = text.trim().replace(/%$/, '').trim()
  if (t === '') return { error: GOAL_INPUT_ERRORS.empty }
  if (def.unit === 'rating') {
    const level = def.scale?.find((x) => x.toLowerCase() === t.toLowerCase())
    return level ? { value: level } : { error: GOAL_INPUT_ERRORS.rating }
  }
  const plain = t.replace(/,/g, '')
  const n = NUMBER.test(plain) ? Number(plain) : NaN
  if (def.unit === 'ratio') return Number.isFinite(n) && n >= 0 && n <= 100 ? { value: n / 100 } : { error: GOAL_INPUT_ERRORS.ratio }
  if (def.unit === 'tCO2e') return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? { value: n } : { error: GOAL_INPUT_ERRORS.tCO2e }
  return Number.isFinite(n) && n > 0 && n <= 5000 ? { value: n } : { error: GOAL_INPUT_ERRORS.kgCO2e_m2 }
}

/** Whether a stored value fits the goal: a ratio from 0 to 1, tonnes up to a million, kgCO2e per m2 up to 5000, a level on the scale. */
export function isValidGoalValue(def: GoalDef, v: GoalValue): boolean {
  if (def.unit === 'rating') return typeof v === 'string' && !!def.scale?.includes(v)
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false
  if (def.unit === 'ratio') return v <= 1
  if (def.unit === 'tCO2e') return v <= 1_000_000
  return v <= 5000
}

/** The sum of results and of targets over rows that have a target. */
export function sumTargets(rows: { actual: number | null; target: number | null }[]): { actual: number; target: number } {
  let actual = 0
  let target = 0
  for (const r of rows) {
    if (r.target === null || !(r.target > 0)) continue
    actual += r.actual ?? 0
    target += r.target
  }
  return { actual, target }
}
