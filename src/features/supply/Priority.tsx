// What to recover first (F6), with each row's step on the UK decision tree (brief/09-V1-PRODUCT.md sections 3.2 and 5.3).
// The ranking and its figures are the priority engine's; the route column is a display rule over it.
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { clientName, priorityView, supplyAccess, type LegendStep } from '../../store/views/supply'
import { useBuildingParam, NotAvailable } from '../../app/params'
import { Table, Num, Tag, RuleBased, Figure, EmptyState, cx } from '../../components/ui'
import { ScoreBar } from '../../components/charts'
import { HowCalculated } from '../../components/HowCalculated'
import { LABELS, SIGNAL_LABELS } from '../../domain/reference/labels'
import { prioritySections } from '../shared/calc'
import * as f from '../../domain/format'

export function Priority() {
  const world = useWorld()
  const personaId = useStore((s) => s.personaId)
  const { id, record: building } = useBuildingParam()
  if (!building || !supplyAccess(world, personaId, id).priority) return <NotAvailable />
  const v = priorityView(world, building.id)
  const r = v.result
  return (
    <div className="flex flex-col gap-5">
      <header className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Priority</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">{building.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What to recover first for {clientName(world, building)}, ranked by net value, avoided carbon, demand and ease.
        </p>
      </header>

      <div className="flex flex-wrap gap-x-10 gap-y-4 rounded-sm border border-rule-soft bg-panel px-5 py-4">
        <Figure label="Recoverable net value" value={f.money(r.recoverableNetValue)} testId="priority-recoverable" sub={`${v.recoverCount} items routed to reuse`} size="lg" />
        <Figure label="Held by the top three" value={f.percent(r.topThreeShare)} testId="priority-top-three" sub="of the recoverable net value" size="lg" />
      </div>

      <RuleBased testId="label-L2" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
        {r.rows.length === 0 ? (
          <EmptyState hint="Capture items to rank them here." />
        ) : (
          <Table data-testid="priority-table">
            <thead>
              <tr>
                <th className="text-right">Rank</th>
                <th>Tag</th>
                <th>Score</th>
                <th className="text-right">Net value (£)</th>
                <th className="text-right">Avoided carbon (tCO2e)</th>
                <th>Signal</th>
                <th>Ease</th>
                <th>Route</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {v.rows.map((row, i) => (
                <tr key={row.itemId} data-testid={`priority-row-${i + 1}`}>
                  <Num>{i + 1}</Num>
                  <td>
                    <Tag data-testid={`priority-tag-${i + 1}`}>
                      <span data-testid={`priority-tag-text-${i + 1}`}>{row.tag}</span>
                    </Tag>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ScoreBar parts={[{ id: 'netValue', value: row.parts.netValue }, { id: 'carbon', value: row.parts.carbon }, { id: 'demand', value: row.parts.demand }, { id: 'ease', value: row.parts.ease }]} />
                      <span className="font-display text-lg" data-testid={`priority-score-${i + 1}`}>
                        {f.score(row.score)}
                      </span>
                    </div>
                  </td>
                  <Num>{f.fixed(row.netValue, 2)}</Num>
                  <Num>{f.number(row.carbon, 1)}</Num>
                  <td className="whitespace-nowrap">{SIGNAL_LABELS[row.signal]}</td>
                  <td>{f.fixed(row.ease, 1)}</td>
                  <td className="min-w-[10rem]">
                    <Tag tone={row.tone} data-testid={`priority-route-${row.tag}`}>
                      {row.treeLabel}
                    </Tag>
                    {row.reason ? (
                      <div className="mt-1 text-xs text-ink-soft" data-testid={`priority-reason-${row.tag}`}>
                        {row.reason}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <HowCalculated title={`priority score for ${row.tag}`} {...prioritySections(row, r.maxNetValue, r.maxCarbon)} testId={`priority-calc-${i + 1}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Legend steps={v.legend} />
      </div>
    </div>
  )
}

const DOT: Record<LegendStep['route'], string> = { reuse: 'bg-teal', upcycle: 'bg-teal', downcycle: 'bg-survey', recycle: 'bg-oxide', scrap: 'bg-mill' }

/** The five steps of the UK decision tree, in order, with how many rows sit at each. */
function Legend({ steps }: { steps: LegendStep[] }) {
  return (
    <aside className="self-start rounded-sm border border-rule bg-panel" aria-label="Decision tree" data-testid="priority-legend">
      <h2 className="border-b border-rule-soft px-4 py-2.5 text-base font-semibold">Decision tree</h2>
      <ol className="m-0 flex list-none flex-col p-0">
        {steps.map((s) => (
          <li key={s.route} className={cx('flex gap-3 border-b border-rule-soft px-4 py-2.5 last:border-b-0', !s.assigned && 'text-mill-text')} data-testid={`legend-${s.route}`}>
            <span className="w-4 shrink-0 pt-0.5 text-right font-display text-sm tabular-nums text-mill-text">{s.step}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <span aria-hidden="true" className={cx('inline-block h-2.5 w-2.5 rounded-full', s.assigned ? DOT[s.route] : 'border border-mill bg-panel')} />
                  {s.label}
                </span>
                <span className="font-display text-base tabular-nums" data-testid={`legend-count-${s.route}`}>
                  {s.assigned ? s.count : 'Not assigned'}
                </span>
              </div>
              <p className="m-0 mt-0.5 text-xs leading-snug text-mill-text">{s.hint}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="m-0 border-t border-rule-soft px-4 py-3 text-xs leading-snug text-ink-soft" data-testid="label-L41">
        {LABELS.L41}
      </p>
    </aside>
  )
}
