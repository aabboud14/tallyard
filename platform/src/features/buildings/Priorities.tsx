// What to recover first: the inventory ranked by a weighted score, each item's route on the UK decision tree,
// and the parts of its score. Owner only.
import { Fragment, useState } from 'react'
import { useParams } from 'react-router'
import { ChevronDown, ListOrdered } from 'lucide-react'
import { SIGNAL_LABELS } from '../../domain/reference/labels'
import type { DecisionRoute } from '../../domain/v1types'
import * as f from '../../domain/format'
import { selectors, useView } from '../../store'
import type { PriorityViewRow } from '../../store/selectors/owner'
import { scoreParts, scoreWeights, signedMoneyWhole, stacked } from '../../store/selectors/roles-views'
import { Card, CardBody, CardHeader, cx, EmptyState, IndicativeMarker, Pill, Table, TBody, TD, TH, THead, TR, type Tone } from '../../ui'
import { StatStrip } from '../notifications/kit'

const ROUTE_TONE: Record<DecisionRoute, Tone> = { reuse: 'brand', upcycle: 'brand', downcycle: 'warning', recycle: 'info', scrap: 'danger' }

const PART_FILL = ['fill-brand-600', 'fill-brand-400', 'fill-[#4f7fe8]', 'fill-[#d08a2c]'] as const
const PART_DOT = ['bg-brand-600', 'bg-brand-400', 'bg-[#4f7fe8]', 'bg-[#d08a2c]'] as const

export function Priorities() {
  const { buildingId = '' } = useParams()
  const v = useView(selectors.prioritiesView, buildingId)
  const [open, setOpen] = useState<string | null>(null)
  if (!v) return null
  if (v.empty) return <EmptyState variant="page" icon={ListOrdered} title="Nothing to rank yet" text="Once items are captured, they are ranked here by value, avoided carbon, demand and ease of recovery." />
  const weights = scoreWeights()
  return (
    <div className="flex flex-col gap-6" data-testid="priorities">
      <StatStrip
        items={[
          { label: 'Recoverable net value', value: f.moneyWhole(v.result.recoverableNetValue), indicative: true, sub: 'Guide price less the cost of careful removal' },
          { label: 'Held by the top three', value: f.percent(v.result.topThreeShare), sub: 'Of the recoverable value' },
          { label: 'Worth recovering', value: v.recoverCount, unit: `of ${v.rows.length}`, sub: 'The rest go to recycling' },
        ]}
      />

      <Card>
        <CardHeader title="The UK decision tree" description={v.note} />
        <CardBody>
          <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-5" data-testid="tree-legend">
            {v.legend.map((s) => (
              <li key={s.route} className={cx('relative flex flex-col gap-1.5 rounded-lg border p-3', s.assigned ? 'border-line bg-surface' : 'border-dashed border-line bg-page/60')}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cx('inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums', s.assigned ? 'bg-ink text-white' : 'bg-subtle text-muted ring-1 ring-inset ring-line')}>{s.step}</span>
                  <span className={cx('text-lg font-semibold tabular-nums', s.count > 0 ? 'text-ink' : 'text-faint')}>{s.count}</span>
                </div>
                <Pill tone={s.assigned ? ROUTE_TONE[s.route] : 'neutral'} size="sm" className="self-start">
                  {s.label}
                </Pill>
                <p className="m-0 text-sm text-muted">{s.hint}</p>
                {!s.assigned ? <p className="m-0 text-xs text-faint">Not assigned in this version</p> : null}
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <section aria-labelledby="ranking-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="ranking-title" className="m-0 text-md font-semibold text-ink">
              Ranking
            </h2>
            <p className="m-0 mt-0.5 text-sm text-muted">Highest score first. Select a row to see how its score is made.</p>
          </div>
          <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-1 p-0 text-sm text-muted" aria-label="Score weights">
            {weights.map((w, i) => (
              <li key={w.label} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={cx('size-2 rounded-full', PART_DOT[i])} />
                {w.label} <span className="tabular-nums text-ink">{w.max}</span>
              </li>
            ))}
            <li>
              <IndicativeMarker />
            </li>
          </ul>
        </div>
        <Table caption="Priority ranking" data-testid="priority-table">
          <THead>
            <tr>
              <TH className="w-10">#</TH>
              <TH>Item</TH>
              <TH className="min-w-40">Score</TH>
              <TH align="right">Net value</TH>
              <TH align="right">Carbon avoided</TH>
              <TH>Demand</TH>
              <TH>Route</TH>
            </tr>
          </THead>
          <TBody>
            {v.rows.map((r, i) => (
              <Fragment key={r.itemId}>
                <TR interactive onClick={() => setOpen(open === r.itemId ? null : r.itemId)} selected={open === r.itemId} data-testid={`priority-${r.tag}`}>
                  <TD muted className="tabular-nums">
                    {i + 1}
                  </TD>
                  <TD>
                    <button type="button" aria-expanded={open === r.itemId} onClick={(e) => (e.stopPropagation(), setOpen(open === r.itemId ? null : r.itemId))} className="flex items-start gap-2 rounded-sm text-left">
                      <ChevronDown aria-hidden="true" className={cx('mt-0.5 size-4 shrink-0 text-faint transition-transform', open === r.itemId && 'rotate-180')} />
                      <span className="min-w-0">
                        <span className="flex items-baseline gap-2">
                          <span className="text-xs font-medium tabular-nums text-muted">{r.tag}</span>
                          <span className="font-medium text-ink">{r.title}</span>
                        </span>
                        <span className="block text-sm text-muted">{r.quantityText}</span>
                      </span>
                    </button>
                  </TD>
                  <TD>
                    <ScoreBar row={r} />
                  </TD>
                  <TD align="right" className={cx('whitespace-nowrap', r.netValue < 0 && 'text-danger')}>
                    {signedMoneyWhole(r.netValue)}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {f.carbon(r.carbon)}
                  </TD>
                  <TD muted className="whitespace-nowrap">
                    {SIGNAL_LABELS[r.signal]}
                  </TD>
                  <TD>
                    <Pill tone={ROUTE_TONE[r.treeRoute]} dot size="sm">
                      {r.treeLabel}
                    </Pill>
                  </TD>
                </TR>
                {open === r.itemId ? (
                  <tr>
                    <td colSpan={7} className="border-b border-line-soft bg-page/70 px-4 py-4">
                      <Breakdown row={r} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </TBody>
        </Table>
      </section>
    </div>
  )
}

function ScoreBar({ row }: { row: PriorityViewRow }) {
  const parts = scoreParts(row)
  const segs = stacked(parts.map((p) => p.points))
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 text-right font-semibold tabular-nums text-ink">{f.score(row.score)}</span>
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-subtle" role="img" aria-label={`Score ${f.score(row.score)} of 100: ${parts.map((p) => `${p.label} ${p.text}`).join(', ')}`}>
        {parts.map((p, i) => (
          <rect key={p.key} x={segs[i].at} y="0" width={segs[i].size} height="8" className={PART_FILL[i]} />
        ))}
      </svg>
    </div>
  )
}

function Breakdown({ row }: { row: PriorityViewRow }) {
  const parts = scoreParts(row)
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {parts.map((p, i) => (
          <div key={p.key} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <span aria-hidden="true" className={cx('size-2 rounded-full', PART_DOT[i])} />
              {p.label}
            </dt>
            <dd className="m-0 mt-0.5 text-base font-semibold tabular-nums text-ink">{p.text}</dd>
          </div>
        ))}
      </dl>
      <div className="text-sm text-ink-soft">
        <p className="m-0 font-medium text-ink">Score {f.score(row.score)} of 100</p>
        {row.reason ? <p className="m-0 mt-1">{row.reason}</p> : <p className="m-0 mt-1">Recover intact and offer it for reuse: {row.treeLabel.toLowerCase()} on the decision tree.</p>}
      </div>
    </div>
  )
}

export default Priorities
