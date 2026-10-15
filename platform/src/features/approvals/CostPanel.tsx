// What a material would cost the client if approved: the indicative package total (material at the guide price,
// testing, storage and delivery), the same quantity new, the saving and where it would be stored. From the
// package engine, through the approvals view model. Clients only; indicative.
import { ChevronDown } from 'lucide-react'
import type { CostView } from '../../store/selectors/client'
import * as f from '../../domain/format'
import { cx, IndicativeMarker, Pill } from '../../ui'

export function CostPanel({ cost, publicId, title = 'Indicative cost if approved', className }: { cost: CostView; publicId: string; title?: string; className?: string }) {
  const notes = [cost.storageMonths > 0 ? `Stored ${f.months(cost.storageMonths)} at ${cost.facilityName}.` : `Delivered from ${cost.facilityName}.`, cost.testing ? 'Includes testing.' : null].filter(Boolean).join(' ')
  return (
    <div data-testid={`approval-cost-${publicId}`} className={cx('rounded-lg border border-line-soft bg-page/60 px-4 py-3.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-sm font-medium text-ink-soft">{title}</p>
        <IndicativeMarker />
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="m-0 text-xl font-semibold tabular-nums text-ink" data-testid={`approval-cost-total-${publicId}`}>
            {f.money(cost.total)}
          </p>
          <p className="m-0 text-sm tabular-nums text-muted">The same new {f.money(cost.costNew)}</p>
        </div>
        <Pill tone={cost.saving >= 0 ? 'brand' : 'warning'} size="md" className="tabular-nums">
          {cost.savingText}
        </Pill>
      </div>
      <p className="m-0 mt-2 text-sm text-ink-soft">{notes}</p>
      <details className="group mt-2">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-sm text-sm font-medium text-ink hover:underline sm:min-h-0 [&::-webkit-details-marker]:hidden">
          Show the package
          <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <table className="mt-2 w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Indicative package</caption>
          <tbody>
            {cost.lines.map((l) => (
              <tr key={l.id} className="border-b border-line-soft last:border-0">
                <th scope="row" className="py-1.5 text-left font-normal text-ink-soft">
                  {l.label}
                </th>
                <td className="py-1.5 text-right text-ink">{l.amount === 0 ? <span className="text-muted">Not needed</span> : f.money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
