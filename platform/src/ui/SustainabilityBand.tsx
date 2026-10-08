// The indicative sustainability band: three short segments in brand tints, the word beside, and the
// Indicative marker that links to the methodology (P4).
import type { Band } from '../domain/v1types'
import { cx } from './cx'
import { IndicativeMarker } from './Badge'

const FILL: Record<Band['band'], string> = {
  high: 'bg-brand-600',
  medium: 'bg-brand-500',
  low: 'bg-brand-400',
  none: 'bg-transparent',
}

export function SustainabilityBand({ band, size = 'md', showLabel = false, indicative = false, className }: { band: Band; size?: 'sm' | 'md'; showLabel?: boolean; indicative?: boolean; className?: string }) {
  const seg = size === 'sm' ? 'h-1.5 w-2.5' : 'h-2 w-3.5'
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)} data-band={band.band} data-segments={band.segments}>
      {showLabel ? <span className={cx('text-muted', size === 'sm' ? 'text-xs' : 'text-sm')}>Sustainability band</span> : null}
      <span className="inline-flex items-center gap-2" title={`Sustainability band: ${band.word}`}>
        <span className="inline-flex items-center gap-[2px]" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cx(
                'rounded-[2px]',
                seg,
                i < band.segments ? FILL[band.band] : band.band === 'none' ? 'border border-dashed border-line-strong' : 'bg-brand-100',
              )}
            />
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
