// Single-select chips. Each chip is a toggle button with aria-pressed, 44 px tall.
import { cx } from '../ui'

export type ChipOption<T extends string | null> = { value: T; label: string; count?: number }

export function ChipGroup<T extends string | null>({ options, value, onChange, ariaLabel, testId, className }: { options: ChipOption<T>[]; value: T; onChange: (value: T) => void; ariaLabel: string; testId?: string; className?: string }) {
  return (
    <div role="group" aria-label={ariaLabel} data-testid={testId} className={cx('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const on = o.value === value
        const key = o.value ?? 'all'
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            data-testid={testId ? `${testId}-${key}` : undefined}
            className={cx(
              'inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
              on ? 'border-ink bg-ink text-white' : 'border-rule bg-panel text-ink hover:border-steel hover:text-steel',
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className={cx('font-display text-sm tabular-nums', on ? 'text-white/75' : 'text-mill-text')}>{o.count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
