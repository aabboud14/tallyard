// Offers and deals, seller side: blind buyers before confirmation, the seller's view after.
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { offerViews, sellerDeals } from '../../store/selectors'
import { dealFamily, sellerOrgId } from '../../store/views/supply'
import { NotAvailable } from '../../app/params'
import { Panel, Table, Num, Tag, Button, Note, Dl, EmptyState, Private } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'
import { blindBuyerText } from '../../domain/privacy/blindBuyer'
import { facilityById } from '../../domain/reference/assumptions'
import * as f from '../../domain/format'

export function Offers() {
  const world = useWorld()
  const s = useStore()
  const ownerOrgId = sellerOrgId(world, s.personaId)
  if (!ownerOrgId) return <NotAvailable />
  const offers = offerViews(world, ownerOrgId)
  const deals = sellerDeals(world, ownerOrgId)
  return (
    <>
      <header className="mb-5 min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Offers and deals</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight" data-testid="offers-owner">
          {world.orgs[ownerOrgId]?.name}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Buyers stay blind until a deal is confirmed. Then organisation names, one contact each and the handover are exchanged.</p>
      </header>
      <Panel title="Offers awaiting approval" className="mb-4">
        {offers.length === 0 ? (
          <EmptyState hint="An offer appears here when a buyer's agent agrees a price and the buyer approves it." />
        ) : (
          offers.map((o) => (
            <div key={o.planItem.id} className="flex flex-col gap-3" data-testid={`offer-${o.planItem.lotPublicId}`}>
              <div className="flex flex-wrap items-center gap-3">
                <Tag tone="steel">Offer on {o.planItem.lotPublicId}</Tag>
                <span className="font-display text-xl" data-testid="offer-buyer">
                  {blindBuyerText(o.blind)}
                </span>
              </div>
              <Dl
                rows={[
                  { label: 'Lot', value: `${o.listing.title}` },
                  { label: 'Price', value: `${f.unitPrice(o.price, o.family)} for ${o.pieces} pieces (${f.massT(o.massT)})`, testId: 'offer-price' },
                  { label: 'Deliver to', value: `Deliver to: ${o.hubName}`, testId: 'offer-hub' },
                ]}
              />
              <Private>
                <Table>
                  <tbody>
                    {o.sellerFigures.lines.map((l) => (
                      <tr key={l.label}>
                        <td>{l.label}</td>
                        <Num>{f.money(l.amount)}</Num>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td></td>
                      <Num testId="offer-net">{`Net proceeds ${f.money(o.sellerFigures.net)}`}</Num>
                    </tr>
                    <tr>
                      <td></td>
                      <Num testId="offer-gain">{`Gain over scrap ${f.money(o.sellerFigures.upliftVsScrap)}`}</Num>
                    </tr>
                  </tbody>
                </Table>
              </Private>
              <div>
                <Button variant="primary" size="lg" className="text-panel" onClick={() => s.sellerApprove(o.projectId, o.planItem.id)} data-testid="seller-approve">
                  Approve
                </Button>
              </div>
            </div>
          ))
        )}
      </Panel>
      <Panel title="Confirmed deals">
        {deals.length === 0 ? (
          <EmptyState hint="Approve an offer to confirm a deal." />
        ) : (
          deals.map((d) => (
            <div key={d.id} className="flex flex-col gap-3" data-testid={`seller-deal-${d.lotPublicId}`}>
              <div className="flex flex-wrap items-center gap-3">
                <Tag tone="teal" data-testid="seller-deal-status">
                  Confirmed
                </Tag>
                <span className="font-display text-xl">{d.lotPublicId}</span>
                <Note tone="teal" testId="label-L22" className="py-1">
                  {LABELS.L22}
                </Note>
              </div>
              <Dl
                rows={[
                  { label: 'Buyer', value: d.exchanged.buyerOrg, testId: 'seller-deal-buyer' },
                  { label: 'Contact', value: d.exchanged.buyerContact, testId: 'seller-deal-contact' },
                  { label: 'Price', value: `${f.unitPrice(d.agreedPricePerUnit, dealFamily(world, d))} for ${d.pieces} pieces (${f.massT(d.massT)})` },
                  { label: 'Handover', value: `Handover ${f.date(d.handoverDate)} at ${facilityById(d.hubId).name}`, testId: 'seller-deal-handover' },
                  { label: 'Inbound haulage', value: `Inbound haulage ${f.money(d.inbound)}, booked`, testId: 'seller-deal-inbound' },
                ]}
              />
              <Private>
                <Table>
                  <tbody>
                    {d.sellerLines.map((l) => (
                      <tr key={l.id}>
                        <td>{l.label}</td>
                        <Num>{f.money(l.amount)}</Num>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td>Net proceeds</td>
                      <Num testId="seller-deal-net">{f.money(d.sellerNet)}</Num>
                    </tr>
                    <tr>
                      <td>Gain over scrap</td>
                      <Num testId="seller-deal-gain">{f.money(d.upliftVsScrap)}</Num>
                    </tr>
                  </tbody>
                </Table>
              </Private>
              <div>
                <h3 className="mb-1 text-sm font-semibold">Custody</h3>
                <p className="text-sm text-mill-text">Agreed {f.date(d.dealDate)}. Handover at the hub {f.date(d.handoverDate)}. The seller's half of the timeline is not built in this run.</p>
              </div>
            </div>
          ))
        )}
      </Panel>
    </>
  )
}
