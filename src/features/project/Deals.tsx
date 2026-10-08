// Deals, the client's side: the buyer's view, exchanged identities, the logistics agent and the custody timeline
// (brief/09-V1-PRODUCT.md section 3.4; steps 8 and 9 of 02). The seller's costs and dates never appear here.
import { Link } from 'react-router'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { buyerDeals, buyerDealView } from '../../store/selectors'
import { clientCanOpen } from '../../store/views/client'
import { useProjectParam, NotAvailable } from '../../app/params'
import { Panel, Table, Num, Tag, Button, Note, Dl, EmptyState, SimulatedAgent } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { ClientHeader } from './ClientHeader'
import * as f from '../../domain/format'

export function Deals() {
  const world = useWorld()
  const s = useStore()
  const { record: p } = useProjectParam()
  if (!p || !clientCanOpen(world, s.personaId, p.id)) return <NotAvailable />
  const deals = buyerDeals(world, p.id)
  return (
    <div className="flex flex-col gap-4" data-testid="client-deals">
      <ClientHeader eyebrow={p.name} title="Deals" sub="Your half of each deal. The seller's costs and dates stay with the seller." />
      {deals.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState hint="A deal appears here once the seller approves your offer from the reuse plan." />
          <Link to={`/projects/${p.id}/plan`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-steel no-underline hover:bg-steel-tint" data-testid="deals-open-plan">
            Open the reuse plan
          </Link>
        </div>
      ) : (
        deals.map((d) => {
          const v = buyerDealView(world, d.id)
          return (
            <Panel key={d.id} title={`${d.lotPublicId}, ${v.listing.title}, ${d.pieces} pieces`} data-testid={`buyer-deal-${d.lotPublicId}`}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Tag tone="teal" data-testid="buyer-deal-status">
                    Confirmed
                  </Tag>
                  <Note tone="teal" testId="label-L22" className="py-1">
                    {LABELS.L22}
                  </Note>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Dl
                    className="content-start gap-y-2"
                    rows={[
                      { label: 'Seller', value: d.exchanged.sellerOrg, testId: 'buyer-deal-seller' },
                      { label: 'Contact', value: d.exchanged.sellerContact, testId: 'buyer-deal-contact' },
                      { label: 'Handover', value: `Handover ${f.date(d.handoverDate)}`, testId: 'buyer-deal-handover' },
                      { label: 'Collect from', value: v.hubName },
                      { label: 'Storage', value: `Storage ${f.months(d.storageMonths)}`, testId: 'buyer-deal-storage' },
                      { label: 'Provenance', value: LABELS.L23, testId: 'label-L23' },
                    ]}
                  />
                  <div>
                    <Table>
                      <tbody>
                        {d.buyerLines.map((l) => (
                          <tr key={l.id}>
                            <td>{l.label}</td>
                            <Num testId={`buyer-deal-line-${l.id}`}>{f.money(l.amount)}</Num>
                          </tr>
                        ))}
                        <tr className="font-medium">
                          <td></td>
                          <Num testId="buyer-deal-total">{`Total ${f.money(d.buyerTotal)}`}</Num>
                        </tr>
                        <tr>
                          <td>New steel to the same schedule</td>
                          <Num>{f.money(d.costNew)}</Num>
                        </tr>
                      </tbody>
                    </Table>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                      <span className="font-display text-xl" data-testid="buyer-deal-saving">
                        {f.saving(v.saving, v.savingPercent)}
                      </span>
                      {v.breakEvenMonths !== null ? <span data-testid="buyer-deal-break-even">Break-even storage {f.months1(v.breakEvenMonths)}</span> : null}
                      <span>Avoided carbon {f.carbon(d.avoidedT)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Delivery from the hub to site</h3>
                  {!d.booking ? (
                    <Button variant="primary" size="lg" className="text-panel" onClick={() => s.arrangeDelivery(d.id)} data-testid="arrange-delivery">
                      Arrange delivery
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SimulatedAgent testId="label-L3" />
                      <Table data-testid="quotes">
                        <thead>
                          <tr>
                            <th>Haulier</th>
                            <th className="text-right">Quote</th>
                            <th>Notice</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.booking.quotes.map((q) => (
                            <tr key={q.haulier} data-testid={`quote-${q.haulier.replace(/\s+/g, '-')}`}>
                              <td>{q.haulier}</td>
                              <Num>{f.money(q.amount)}</Num>
                              <td>{q.noticeDays} days' notice</td>
                              <td>{q.haulier === d.booking!.haulier ? <Tag tone="teal">Cheapest that meets the dates</Tag> : q.meetsDates ? '' : 'Does not meet the dates'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      {!d.booking.deliveryDate ? (
                        <div>
                          <Button variant="primary" size="lg" className="text-panel" onClick={() => s.approveBooking(d.id)} data-testid="approve-booking">
                            Approve booking
                          </Button>
                        </div>
                      ) : (
                        <Note tone="teal" testId="delivery-booked">
                          Delivery booked for {f.date(d.booking.deliveryDate)} with {d.booking.haulier}, {f.money(d.booking.amount)}.
                        </Note>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">Custody timeline, buyer's half</h3>
                  <ol className="flex flex-col gap-1 sm:flex-row sm:gap-4" data-testid="custody">
                    {v.custody.map((e) => (
                      <li key={e.id} className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm ${e.done ? 'border-teal bg-teal-tint' : 'border-rule bg-panel'}`} data-testid={`custody-${e.id}`}>
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${e.done ? 'bg-teal' : 'bg-mill'}`} aria-hidden="true" />
                        <span>
                          {e.label} {f.date(e.date)}
                        </span>
                        <span className="text-xs text-mill-text">({e.done ? 'done' : 'planned'})</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </Panel>
          )
        })
      )}
    </div>
  )
}
