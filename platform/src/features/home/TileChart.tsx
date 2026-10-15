// A small chart with its legend for the foot of a metric tile, so the chart shows at every tile width: the
// MetricTile's own chart slot needs a tile at least 19rem wide, which four tiles across never are. The legend
// carries the words and values (every chart has a word); on phones it gives way to the chart alone.
import type { ReactNode } from 'react'
import { Legend, type LegendItem } from '../../ui'

export function TileChart({ chart, legend, label, note }: { chart: ReactNode; legend?: readonly LegendItem[]; label: string; /** A line beside the chart in place of a legend. */ note?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="shrink-0">{chart}</div>
      {legend ? <Legend label={label} items={legend} className="flex-col items-start gap-y-0.5 text-xs max-sm:hidden" /> : null}
      {note ? <div className="min-w-0 text-xs text-muted max-sm:hidden">{note}</div> : null}
    </div>
  )
}
