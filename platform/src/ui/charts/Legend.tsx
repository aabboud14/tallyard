// A legend for any chart with two or more series: a 10 px square swatch, the words in ink and an optional value.
// The swatch carries the identity; the text never takes the series colour.
import { cx } from '../cx'

export type LegendItem = { key?: string; label: string; colour: string; valueText?: string; /** Draws the late or declined hatch over the swatch. */ hatched?: boolean }

export function Legend({ items, className, label }: { items: readonly LegendItem[]; className?: string; /** Names the list for screen readers. */ label?: string }) {
  return (
    <ul aria-label={label} className={cx('m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1.5 p-0 text-sm text-ink-soft', className)}>
      {items.map((it) => (
        <li key={it.key ?? it.label} className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: it.hatched ? `repeating-linear-gradient(45deg, rgb(255 255 255 / 0.5) 0 1px, transparent 1px 4px), ${it.colour}` : it.colour }}
          />
          <span className="truncate">{it.label}</span>
          {it.valueText ? <span className="font-medium tabular-nums text-ink">{it.valueText}</span> : null}
        </li>
      ))}
    </ul>
  )
}
