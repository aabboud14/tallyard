// Chart colours, by job. Status marks (MARK) mean state; categorical hues (VIZ, TYPOLOGY_VIZ) mean identity,
// in fixed order. The two are never mixed in one chart, and text never wears a series colour.
import type { CSSProperties } from 'react'
import type { Tone } from '../labels'
import { MARK, TRACK, TYPOLOGY_VIZ, VIZ, VIZ_OTHER } from '../labels'

export { MARK, TRACK, TYPOLOGY_VIZ, VIZ, VIZ_OTHER }

/** The mark fill for each tone. The same values as MARK, under the name the dashboard designs use. */
export const TONE_FILL: Record<Tone, string> = MARK

/** The typology fills, under the name the dashboard designs use. */
export const TYPOLOGY_FILL = TYPOLOGY_VIZ

/** A tinted chip for a tone, the same set as the pills. */
export const TONE_CHIP: Record<Tone, string> = {
  neutral: 'bg-subtle text-ink-soft ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  info: 'bg-info-soft text-info-strong ring-info-line',
  warning: 'bg-warning-soft text-warning ring-warning-line',
  danger: 'bg-danger-soft text-danger ring-danger-line',
}

export const CHART_TRACK = TRACK
/** The surface gap between touching marks, in pixels. */
export const CHART_GAP = 2

/** The late or declined hatch for an HTML bar: 45 degree white lines at a 4 px pitch, hard stops (lines, not a blend). */
export const HATCH_STYLE: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.5) 0 1px, transparent 1px 4px)',
}
