// Version 1.0 parameters (brief/09-V1-PRODUCT.md sections 5.9, 13.6 and 13.7). Placeholders from the calls.
import type { Parameter } from './assumptions'
import { FACILITIES } from './assumptions'

export type HubId = 'HUB-BARK' | 'HUB-PARK' | 'HUB-TILB'

export type V1Assumptions = {
  /** A window ending fewer than this many days before the start date is tight. */
  timeline: { tightDays: number }
  /** Share of the new product's carbon avoided: High from `high`, Medium from `medium`, Low below. */
  band: { high: number; medium: number }
  /** Road km from each region to each hub, for projects created in the tool. */
  regionHubKm: Record<string, Record<HubId, number>>
}

export const V1_ASSUMPTIONS: V1Assumptions = {
  timeline: { tightDays: 60 },
  band: { high: 0.9, medium: 0.8 },
  regionHubKm: {
    'Central London': { 'HUB-BARK': 17, 'HUB-PARK': 14, 'HUB-TILB': 38 },
    'Inner London East': { 'HUB-BARK': 11, 'HUB-PARK': 21, 'HUB-TILB': 32 },
    'Inner London West': { 'HUB-BARK': 24, 'HUB-PARK': 9, 'HUB-TILB': 45 },
    'Outer London East': { 'HUB-BARK': 6, 'HUB-PARK': 31, 'HUB-TILB': 22 },
    'Outer London West': { 'HUB-BARK': 33, 'HUB-PARK': 8, 'HUB-TILB': 56 },
    'East of England': { 'HUB-BARK': 34, 'HUB-PARK': 58, 'HUB-TILB': 16 },
    'South East': { 'HUB-BARK': 52, 'HUB-PARK': 47, 'HUB-TILB': 61 },
  },
}

export const V1_SOURCE = 'Founder and partner, call of 7 October 2026'

const HUB_IDS: HubId[] = ['HUB-BARK', 'HUB-PARK', 'HUB-TILB']

function hubPlace(id: HubId): string {
  const f = FACILITIES.find((x) => x.id === id)
  const name = f ? f.name : id
  const i = name.lastIndexOf(', ')
  return i < 0 ? name : name.slice(i + 2)
}

function pct(ratio: number): string {
  return `${Math.round(ratio * 1000) / 10}%`
}

/** Read-only rows for the Assumptions screen. */
export function v1ParameterRows(a: V1Assumptions = V1_ASSUMPTIONS): Parameter[] {
  const g = 'Version 1.0 parameters'
  const rows: Parameter[] = [
    { id: 'timeline.tightDays', group: g, label: 'Timeline check, tight band', value: String(a.timeline.tightDays), unit: 'days before the start date', source: V1_SOURCE, status: 'placeholder' },
    { id: 'band.high', group: g, label: 'Sustainability band, High from', value: pct(a.band.high), unit: "of the new product's carbon avoided", source: V1_SOURCE, status: 'placeholder' },
    { id: 'band.medium', group: g, label: 'Sustainability band, Medium from', value: pct(a.band.medium), unit: "of the new product's carbon avoided", source: V1_SOURCE, status: 'placeholder' },
  ]
  for (const [region, km] of Object.entries(a.regionHubKm)) {
    rows.push({
      id: `regionHubKm.${region}`,
      group: g,
      label: `Hub distances, ${region}`,
      value: HUB_IDS.map((h) => `${hubPlace(h)} ${km[h]}`).join(', '),
      unit: 'km, for projects created in the tool',
      source: V1_SOURCE,
      status: 'placeholder',
    })
  }
  return rows
}

export const V1_PARAMETER_ROWS: Parameter[] = v1ParameterRows()
