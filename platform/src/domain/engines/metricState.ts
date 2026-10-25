// The state of a metric against its target (visual-qa.md section 7, P2), so a metric tile, a meter or a ring is
// coloured by a state worked out here and never in a component. Pure.

export type MetricState = 'good' | 'warning' | 'critical' | 'neutral'

export type TargetDirection = 'at_least' | 'at_most'

/** How far short of the target, as a share of it, still reads as near target. */
export const METRIC_NEAR_BAND = 0.1

/** The word for each state. Every state colour on screen comes with one of these and an icon. */
export const METRIC_STATE_WORDS: Record<MetricState, string> = {
  good: 'On target',
  warning: 'Near target',
  critical: 'Off target',
  neutral: 'No target set',
}

/**
 * State of a figure against a target. at_least: good when value >= target, warning when
 * value >= target * (1 - band), else critical. at_most mirrors it. No target gives neutral.
 */
export function metricState(value: number, target: number | null, direction: TargetDirection, band: number = METRIC_NEAR_BAND): MetricState {
  if (!Number.isFinite(band) || band < 0 || band >= 1) throw new RangeError(`metricState needs a band from 0 up to but not including 1, got ${band}`)
  if (target === null || !Number.isFinite(target) || !Number.isFinite(value)) return 'neutral'
  if (direction === 'at_least') {
    if (value >= target) return 'good'
    return value >= target * (1 - band) ? 'warning' : 'critical'
  }
  if (value <= target) return 'good'
  return value <= target * (1 + band) ? 'warning' : 'critical'
}

/** The state and its word together, for a tile's state line. */
export function metricReading(value: number, target: number | null, direction: TargetDirection, band: number = METRIC_NEAR_BAND): { state: MetricState; word: string } {
  const state = metricState(value, target, direction, band)
  return { state, word: METRIC_STATE_WORDS[state] }
}
