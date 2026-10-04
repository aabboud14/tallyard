// Operator ledger (04 section 5.6, F12): the lines of each deal made in the session, labelled by public ID,
// then the seeded entries, "Transactions and data to date" and "Subscriptions, annual".
import type { ReactNode } from 'react'
import { useWorld } from '../shared/hooks'
import { ledgerView } from '../../store/selectors'
import { PageTitle, Panel, EmptyState, cx } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'

/** Test ids for the four deal lines, keyed by the label the store gives each line. */
const LINE_IDS: Record<string, string> = {
  Commission: 'commission',
  'Storage brokerage': 'brokerage',
  'Testing referral': 'referral',
  'Transport margin': 'transport',
}

function lineId(label: string): string {
  return LINE_IDS[label] ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/** One ledger line: label and amount in one element so the pair reads as "Label £amount", a note beside it. */
function Line({ label, amount, note, testId, strong = false }: { label: ReactNode; amount: number; note?: ReactNode; testId?: string; strong?: boolean }) {
  const noteId = note === LABELS.L31 ? 'label-L31' : undefined
  return (
    <div className={cx('grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-1.5 md:grid-cols-[minmax(0,2fr)_auto_minmax(0,2fr)]', strong && 'font-medium')}>
      <span className="contents" data-testid={testId}>
        <span>{label}</span> <span className={cx('whitespace-nowrap text-right tabular-nums', strong ? 'font-display text-xl' : 'font-display text-lg')}>{f.money(amount)}</span>
      </span>
      {note ? (
        <span className="col-span-2 text-xs text-mill-text md:col-span-1 md:pl-2" data-testid={noteId}>
          {note}
        </span>
      ) : null}
    </div>
  )
}

export function Ledger() {
  const world = useWorld()
  const ledger = ledgerView(world)
  return (
    <>
      <PageTitle title="Ledger" sub="Platform revenue. Deals are labelled by public ID." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Deals made in this session">
            {ledger.dealGroups.length === 0 ? (
              <EmptyState hint="Lines appear here when a deal is confirmed." />
            ) : (
              <div className="flex flex-col gap-4">
                {ledger.dealGroups.map((g) => (
                  <section key={g.publicId} className="rounded-sm border border-rule-soft" data-testid={`ledger-deal-${g.publicId}`}>
                    <header className="flex items-center justify-between gap-3 border-b border-rule-soft bg-steel-tint px-3 py-1.5">
                      <h3 className="font-display text-lg">Deal {g.publicId}</h3>
                      <span className="text-xs text-mill-text">{g.lines.length} lines</span>
                    </header>
                    <div className="divide-y divide-rule-soft px-3 text-sm">
                      {g.lines.map((line) => (
                        <Line key={line.label} label={line.label} amount={line.amount} note={line.note} testId={`ledger-line-${lineId(line.label)}`} />
                      ))}
                      <Line label="Deal total" amount={g.total} testId="ledger-deal-total" strong />
                    </div>
                  </section>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Seeded entries">
            <div className="divide-y divide-rule-soft text-sm" data-testid="ledger-seeded">
              {ledger.seeded.map((line) => (
                <Line key={line.label} label={line.label} amount={line.amount} note={line.note} />
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="Totals">
          <div className="divide-y divide-rule-soft text-sm">
            <Line label="Transactions and data to date" amount={ledger.toDate} testId="ledger-to-date" strong />
            <Line label="Subscriptions, annual" amount={ledger.subscriptions} testId="ledger-subscriptions" strong />
          </div>
          <p className="mt-3 text-xs text-mill-text">Transactions and data to date is the sum of the deal lines and the seeded entries, without subscriptions. Subscriptions are an annual figure and are not added to it.</p>
        </Panel>
      </div>
    </>
  )
}
