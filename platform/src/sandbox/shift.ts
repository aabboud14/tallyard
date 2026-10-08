// Moves the sample world in time (BRIEF section 2). Every 'YYYY-MM-DD' string moves by whole days and every
// 'YYYY-MM' string by whole months, at any depth, so the programme sits in the same place relative to today
// as it does to 7 October 2026 in the seed. Pure: the input is never changed.
import type { World } from '../domain/types'
import { addDays, daysBetween } from '../domain/dates'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-\d{2}$/

/** A 'YYYY-MM' key moved by whole months. */
export function addMonthsToKey(key: string, months: number): string {
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = index - year * 12 + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Whole calendar months from one date to another, by their month keys. */
export function monthsBetween(fromIso: string, toIso: string): number {
  const a = Number(fromIso.slice(0, 4)) * 12 + Number(fromIso.slice(5, 7))
  const b = Number(toIso.slice(0, 4)) * 12 + Number(toIso.slice(5, 7))
  return b - a
}

/** A deep copy of any JSON-like value with its dates moved. Other strings, numbers and keys are left alone. */
export function shiftDates<T>(value: T, days: number, months: number): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (DAY.test(v)) return days === 0 ? v : addDays(v, days)
      if (MONTH.test(v)) return months === 0 ? v : addMonthsToKey(v, months)
      return v
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v !== null && typeof v === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = walk(x)
      return out
    }
    return v
  }
  return walk(value) as T
}

/** The world moved from one reference date to another. */
export function shiftWorld(world: World, fromIso: string, toIso: string): World {
  return shiftDates(world, daysBetween(fromIso, toIso), monthsBetween(fromIso, toIso))
}
