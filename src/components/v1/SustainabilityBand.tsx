// The indicative sustainability band: three short segments, teal for each one earned, the word beside.
import type { Band } from '../../domain/v1types'
import { cx } from '../ui'

const SEGMENTS = [0, 1, 2] as const

export function SustainabilityBand({ band, size = 'md', testId, className }: { band: Band; size?: 'sm' | 'md'; testId?: string; className?: string }) {
  const seg = size === 'sm' ? 'h-1.5 w-3' : 'h-2 w-4'
  return (
    <span className={cx('inline-flex items-center gap-2', className)} data-testid={testId} data-band={band.band} data-segments={band.segments}>
      <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
        {SEGMENTS.map((i) => (
          <span key={i} className={cx('rounded-[1px] border', seg, i < band.segments ? 'border-teal bg-teal' : band.band === 'none' ? 'border-mill bg-transparent' : 'border-teal bg-transparent')} />
        ))}
      </span>
      <span className={cx('font-medium leading-none', size === 'sm' ? 'text-xs' : 'text-sm', band.band === 'none' ? 'text-mill-text' : 'text-ink')}>{band.word}</span>
    </span>
  )
}
