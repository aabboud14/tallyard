// Display formats (03-ENGINES.md section 3). One module, used by every screen, export and test.
import type { FamilyId } from './types'
import { FAMILIES } from './reference/families'
import { formatDate, formatMonth, formatQuarter } from './dates'

function roundHalfUp(x: number, decimals: number): number {
  const f = Math.pow(10, decimals)
  const sign = x < 0 ? -1 : 1
  return (sign * Math.floor(Math.abs(x) * f + 0.5 + 1e-9)) / f
}

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Fixed decimals, round half up, thousands separators. */
export function fixed(x: number, decimals: number): string {
  const r = roundHalfUp(x, decimals)
  const neg = r < 0
  const s = Math.abs(r).toFixed(decimals)
  const [i, d] = s.split('.')
  return (neg ? '-' : '') + group(i) + (d ? '.' + d : '')
}

/** £21,227.74 */
export function money(x: number): string {
  const neg = x < 0
  return (neg ? '-' : '') + '£' + fixed(Math.abs(x), 2)
}

/** £1,150,000 */
export function moneyWhole(x: number): string {
  return '£' + fixed(x, 0)
}

/** Whole pounds for ticks of a pound or more, otherwise pence. */
function tickDecimals(tick: number): number {
  return tick >= 1 ? 0 : 2
}

/** £740 per tonne, £3.60 per panel, £0.99 per brick */
export function unitPrice(x: number, family: FamilyId): string {
  const f = FAMILIES[family]
  return '£' + fixed(x, tickDecimals(f.tick)) + ' ' + f.pricingUnitLabel
}

/** £740 with the family's tick decimals, no unit. */
export function priceOnly(x: number, family: FamilyId): string {
  return '£' + fixed(x, tickDecimals(FAMILIES[family].tick))
}

/** 24.16 t */
export function massT(x: number): string {
  return fixed(x, 2) + ' t'
}

/** 11,369.2 t */
export function massWaste(x: number): string {
  return fixed(x, 1) + ' t'
}

/** 41.0 tCO2e */
export function carbon(x: number): string {
  return fixed(x, 1) + ' tCO2e'
}

/** 8.5% from a ratio */
export function percent(ratio: number): string {
  return fixed(ratio * 100, 1) + '%'
}

/** 20.06% from a ratio */
export function percent2(ratio: number): string {
  return fixed(ratio * 100, 2) + '%'
}

/** +0.15 from a ratio in points */
export function contribution(ratio: number): string {
  const v = roundHalfUp(ratio * 100, 2)
  return (v >= 0 ? '+' : '-') + fixed(Math.abs(v), 2)
}

/** 13 months */
export function months(n: number): string {
  return `${fixed(n, 0)} ${n === 1 ? 'month' : 'months'}`
}

/** 36.2 months */
export function months1(x: number): string {
  return fixed(x, 1) + ' months'
}

/** 0.72 t per m2 GIA */
export function intensity(x: number): string {
  return fixed(x, 2) + ' t per m2 GIA'
}

/** 68.7 */
export function score(x: number): string {
  return fixed(x, 1)
}

export function date(iso: string): string {
  return formatDate(iso)
}

export function quarter(iso: string): string {
  return formatQuarter(iso)
}

export function month(isoOrKey: string): string {
  return formatMonth(isoOrKey)
}

/** Saving £983.70 (4.2%), or Costs £591.70 more than new (30.6%). Never a minus sign. */
export function saving(amount: number, ratio: number): string {
  if (amount < 0) return `Costs ${money(-amount)} more than new (${percent(-ratio)})`
  return `Saving ${money(amount)} (${percent(ratio)})`
}

export function savingShort(amount: number): string {
  if (amount < 0) return `Costs ${money(-amount)} more than new`
  return `Saving ${money(amount)}`
}

/** 48 pieces, 600 m2, 20,000 bricks, 3,000 panels, 22 m3 */
export function quantity(value: number, unit: string): string {
  const u = unit === 'tonne' ? 't' : unit
  const n = fixed(value, Number.isInteger(value) ? 0 : 2)
  if (u === 'pieces') return `${n} ${value === 1 ? 'piece' : 'pieces'}`
  if (u === 'bricks' || u === 'brick') return `${n} ${value === 1 ? 'brick' : 'bricks'}`
  if (u === 'panels' || u === 'panel') return `${n} ${value === 1 ? 'panel' : 'panels'}`
  return `${n} ${u}`
}

export function number(x: number, decimals = 0): string {
  return fixed(x, decimals)
}

export function km(x: number): string {
  return `${fixed(x, 0)} km`
}
