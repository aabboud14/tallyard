import { useWorld } from '../shared/hooks'
import { priorityFor } from '../../store/selectors'
import { useBuildingParam, NotAvailable } from '../../app/params'
import { PageTitle, Table, Num, Tag, RuleBased, Figure, EmptyState } from '../../components/ui'
import { ScoreBar } from '../../components/charts'
import { HowCalculated } from '../../components/HowCalculated'
import { SIGNAL_LABELS } from '../../domain/reference/labels'
import { prioritySections } from '../shared/calc'
import * as f from '../../domain/format'

export function Priority() {
  const world = useWorld()
  const { record: building } = useBuildingParam()
  if (!building) return <NotAvailable />
  const r = priorityFor(world, building.id)
  return (
    <>
      <PageTitle title={`Priority, ${building.name}`} sub="What to recover first, ranked by net value, avoided carbon, demand and ease." />
      <div className="mb-4 flex flex-wrap gap-8">
        <Figure label="Recoverable net value" value={f.money(r.recoverableNetValue)} testId="priority-recoverable" sub={`${r.rows.filter((x) => x.route === 'recover').length} items routed to recover`} />
        <Figure label="Held by the top three" value={f.percent(r.topThreeShare)} testId="priority-top-three" sub="of the recoverable net value" />
      </div>
      <RuleBased testId="label-L2" />
      {r.rows.length === 0 ? (
        <EmptyState hint="Capture items to rank them here." />
      ) : (
        <Table className="mt-3" data-testid="priority-table">
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
            {r.rows.map((row, i) => (
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
                <td>{SIGNAL_LABELS[row.signal]}</td>
                <td>{row.ease.toFixed(1)}</td>
                <td>
                  {row.route === 'recover' ? <Tag tone="teal">Recover</Tag> : <Tag tone="oxide">Recycle</Tag>}
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
    </>
  )
}
