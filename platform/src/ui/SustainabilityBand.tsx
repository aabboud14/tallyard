// The indicative sustainability band: three short segments on an ordinal ramp (light to dark green by
// position, so High reads darker than Low), the word beside, and the Indicative marker that links to the
// methodology (P4).
import type { Band } from '../domain/v1types'
import { cx } from './cx'
import { IndicativeMarker } from './Badge'

/** Positional: the first segment is the lightest step, the third the darkest. Empty segments are a hairline grey. */
const RAMP = ['bg-brand-300', 'bg-brand-500', 'bg-brand-700'] as const

export function SustainabilityBand({ band, size = 'md', showLabel = false, indicative = false, className }: { band: Band; size?: 'sm' | 'md'; showLabel?: boolean; indicative?: boolean; className?: string }) {
  const seg = size === 'sm' ? 'h-1.5 w-3' : 'h-2 w-4'
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)} data-band={band.band} data-segments={band.segments}>
      {showLabel ? <span className={cx('text-muted', size === 'sm' ? 'text-xs' : 'text-sm')}>Sustainability band</span> : null}
      <span className="inline-flex items-center gap-2" title={`Sustainability band: ${band.word}`}>
        <span className="inline-flex items-center gap-px" aria-hidden="true">
          {RAMP.map((fill, i) => (
            <span key={i} data-part="segment" className={cx('rounded-[1px]', seg, i < band.segments ? fill : 'bg-line')} />
          ))}
        </span>
        <span className={cx('font-medium leading-none', size === 'sm' ? 'text-xs' : 'text-sm', band.band === 'none' ? 'text-muted' : 'text-ink')}>
          {showLabel ? band.word : <span className="sr-only">Sustainability band: </span>}
          {showLabel ? null : band.word}
        </span>
      </span>
      {indicative ? <IndicativeMarker /> : null}
    </span>
  )
}
