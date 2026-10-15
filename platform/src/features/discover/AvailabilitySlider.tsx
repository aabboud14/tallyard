// "Available by": a month slider over the marketplace with a histogram of when materials arrive. Positions run
// "Available now", then the end of each month, then "Any time". Bars up to the thumb are filled; a dashed line
// marks the checked project's start. The scale, counts and bar heights come from the domain (availabilityScale);
// the bars and the thumb share one layout, so each bar sits over its slider position without any arithmetic here.
import { useId } from 'react'
import { ANY_TIME } from '../../domain/engines/availability'
import type { AvailabilityFilterView } from '../../store/selectors/marketplace'
import { cx } from '../../ui'

/** Half the thumb's width: the slider's first and last positions sit this far in from its ends. */
const INSET = 'px-[10px]'

function showTick(short: string, i: number, last: number): boolean {
  return i === 0 || i === last || /\d{4}/.test(short)
}

export function AvailabilitySlider({ view, onChange }: { view: AvailabilityFilterView; onChange: (availableBy: string | null) => void }) {
  const id = useId()
  const last = view.anyIndex
  const steps = [...view.positions.map((p) => ({ key: p.value, label: p.label, short: p.short, share: p.share })), { key: 'any', label: ANY_TIME, short: 'Any', share: view.laterShare }]
  const selected = steps[view.selectedIndex] ?? steps[last]
  const shown = view.selectedIndex >= last ? view.total : view.positions[view.selectedIndex].cumulative
  return (
    <div className="flex flex-col gap-2" data-testid="filter-availability">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          Available by
        </label>
        <span className="text-sm font-medium text-ink" data-testid="availability-selected">
          {selected.label}
        </span>
      </div>

      <div className={cx('relative', INSET)}>
        <svg aria-hidden="true" viewBox={`0 0 ${last} 1`} preserveAspectRatio="none" overflow="visible" className="block h-12 w-full overflow-visible">
          <line x1={-0.5} x2={last + 0.5} y1={1} y2={1} stroke="var(--color-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {steps.map((s, i) => (
            <rect key={s.key} data-part="bar" x={i - 0.32} width={0.64} y={1 - s.share} height={s.share} fill={i <= view.selectedIndex ? 'var(--color-brand-600)' : 'var(--color-line-strong)'} />
          ))}
        </svg>
        {view.projectIndex !== null ? (
          <div aria-hidden="true" className={cx('pointer-events-none absolute inset-0 flex justify-between', INSET)}>
            {steps.map((s, i) => (
              <span key={s.key} className="relative w-0">
                {i === view.projectIndex ? <span data-testid="availability-project-marker" className="absolute -bottom-1 -top-1 left-0 border-l-[1.5px] border-dashed border-ink" /> : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <input
        id={id}
        type="range"
        min={0}
        max={last}
        step={1}
        value={view.selectedIndex}
        aria-valuetext={selected.label}
        onChange={(e) => {
          const i = Number(e.target.value)
          onChange(i >= last ? null : view.positions[i].value)
        }}
        data-testid="availability-slider"
        className={cx(
          'h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:h-11',
          '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-line-strong',
          '[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-surface [&::-webkit-slider-thumb]:shadow-xs',
          '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-line-strong',
          '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:bg-surface',
        )}
      />

      <div aria-hidden="true" className={cx('relative flex h-4 justify-between text-2xs tabular-nums text-muted', INSET)}>
        {steps.map((s, i) => (
          <span key={s.key} className="relative w-0">
            {showTick(s.short, i, last) ? (
              <span className={cx('absolute top-0 whitespace-nowrap', i === 0 ? '-left-[10px]' : i === last ? '-right-[10px]' : '-translate-x-1/2')}>{s.short}</span>
            ) : null}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-muted" data-testid="availability-count">
          <span className="font-medium tabular-nums text-ink">{shown}</span> of {view.total} materials
        </span>
        {view.projectName ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span aria-hidden="true" className="h-3 border-l-[1.5px] border-dashed border-ink" />
            {view.projectName} start
          </span>
        ) : null}
      </div>
    </div>
  )
}
