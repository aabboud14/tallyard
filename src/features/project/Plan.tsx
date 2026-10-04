// Reuse plan: one row per plan item; the package panel, the mandate and the negotiation thread.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { planItemView, type PlanItemView } from '../../store/selectors'
import { MERROWGATE_ID } from '../../domain/seed/world'
import { PageTitle, Panel, Table, Num, Tag, Button, Note, Field, Figure, EmptyState, SimulatedAgent, inputClass } from '../../components/ui'
import { HowCalculated } from '../../components/HowCalculated'
import { LABELS, GRADE_UNKNOWN } from '../../domain/reference/labels'
import { FAMILIES } from '../../domain/reference/families'
import { facilityById } from '../../domain/reference/assumptions'
import { ticksOf } from '../../domain/money'
import type { NegotiationEntry, PlanStatus } from '../../domain/types'
import { packageSections, carbonSections } from '../shared/calc'
import * as f from '../../domain/format'

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = { planned: 'Planned', agreed_in_principle: 'Agreed in principle', awaiting_seller: 'Awaiting seller approval', confirmed: 'Confirmed', no_agreement: 'No agreement' }

export function negotiationText(e: NegotiationEntry, family: keyof typeof FAMILIES): string {
  switch (e.kind) {
    case 'ask':
      return `Ask ${f.priceOnly(e.price!, family)}`
    case 'bid':
      return `Bid ${f.priceOnly(e.price!, family)}`
    case 'hold':
      return e.text
    case 'agreed':
      return `Agreed in principle at ${f.unitPrice(e.price!, family)}`
    case 'none':
      return 'No agreement'
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Thread({ log, family }: { log: NegotiationEntry[]; family: keyof typeof FAMILIES }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? log.length : 0))
  useEffect(() => {
    if (shown >= log.length) return
    const t = setTimeout(() => setShown((n) => n + 1), 650)
    return () => clearTimeout(t)
  }, [shown, log.length])
  return (
    <div>
      <ol className="flex flex-col gap-1" data-testid="negotiation-thread">
        {log.slice(0, shown).map((e) => (
          <li key={e.n} className={`max-w-md rounded-sm px-3 py-1.5 text-sm ${e.side === 'seller' ? 'self-start bg-rule-soft' : e.side === 'buyer' ? 'self-end bg-steel-tint' : 'self-center bg-survey-tint font-medium'}`} data-testid={`negotiation-entry-${e.n}`}>
            <span className="mr-2 text-xs text-mill-text">{e.side === 'seller' ? 'Seller agent' : e.side === 'buyer' ? 'Buyer agent' : 'Outcome'}</span>
            {negotiationText(e, family)}
          </li>
        ))}
      </ol>
      {shown < log.length ? (
        <Button className="mt-2" onClick={() => setShown(log.length)} data-testid="negotiation-skip">
          Skip
        </Button>
      ) : null}
    </div>
  )
}

function PackagePanel({ v }: { v: PlanItemView }) {
  const s = useStore()
  const item = v.item
  const planned = item.status === 'planned'
  const confirmed = item.status === 'confirmed'
  const total = v.estimate
  const facility = item.pkg.facilityId ? facilityById(item.pkg.facilityId) : null
  return (
    <Panel title="Storage, testing and transport package" data-testid="package-panel">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-mill-text">Route</dt>
            <dd data-testid="package-route">{item.pkg.route === 'hub' ? 'Via storage hub' : 'Direct'}</dd>
            <dt className="text-mill-text">Facility</dt>
            <dd data-testid="package-facility">
              {facility?.name}
              {item.pkg.facilityFixed ? ' (already held here)' : ''}
            </dd>
            <dt className="text-mill-text">Testing</dt>
            <dd>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={item.pkg.testing} disabled={!planned} onChange={(e) => s.setPlanPackage(MERROWGATE_ID, item.id, { testing: e.target.checked })} data-testid="package-testing" />
                <span data-testid="package-testing-text">{item.pkg.testing ? 'On' : 'Off'}</span>
              </label>
            </dd>
            <dt className="text-mill-text">Storage</dt>
            <dd data-testid="package-storage">{confirmed && v.deal ? `Storage ${f.months(v.deal.storageMonths)}` : v.storageRange ? (v.storageRange.min === v.storageRange.max ? `Storage ${f.months(v.storageRange.min)}` : `Storage ${v.storageRange.min} to ${v.storageRange.max} months`) : ''}</dd>
          </dl>
          {!confirmed ? (
            <Note tone="survey" testId="label-L5">
              {LABELS.L5}
            </Note>
          ) : null}
          <Table data-testid="package-lines">
            <tbody>
              {total.lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.label}</td>
                  <Num testId={`package-line-${l.id}`}>{f.money(l.amount)}</Num>
                </tr>
              ))}
              <tr className="font-medium">
                <td>{confirmed ? 'Total' : 'Estimated total'}</td>
                <Num testId="package-total">{f.money(total.total)}</Num>
              </tr>
              <tr>
                <td>New steel to the same schedule</td>
                <Num testId="package-new">{f.money(total.costNew)}</Num>
              </tr>
            </tbody>
          </Table>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="font-display text-xl" data-testid="package-saving">
              {f.saving(total.saving, total.savingPercent)}
            </span>
            {total.breakEvenMonths !== null ? <span data-testid="package-break-even">Break-even storage {f.months1(total.breakEvenMonths)}</span> : null}
            <span data-testid="package-carbon">Avoided carbon {f.carbon(v.carbon.avoided)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <HowCalculated title="package total" {...packageSections(total, facility?.name ?? null)} testId="package-calc" />
            <HowCalculated title="avoided carbon for this item" {...carbonSections(v.carbon)} testId="package-carbon-calc" />
          </div>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Facility comparison</h3>
          <Table data-testid="facility-comparison">
            <thead>
              <tr>
                <th>Facility</th>
                <th className="text-right">Estimated total</th>
                <th className="text-right">Against new</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {v.comparison.map((c) => {
                const lowest = v.comparison.every((x) => c.total <= x.total)
                return (
                  <tr key={c.facilityId} className={c.facilityId === item.pkg.facilityId ? 'bg-steel-tint' : ''} data-testid={`facility-${c.facilityId}`}>
                    <td>{c.name}</td>
                    <Num testId={`facility-total-${c.facilityId}`}>{f.money(c.total)}</Num>
                    <Num>{f.saving(c.saving, c.savingPercent)}</Num>
                    <td>
                      {lowest ? <Tag tone="teal">Lowest estimated total</Tag> : null}
                      {c.facilityId === item.pkg.facilityId ? <Tag tone="steel">Chosen</Tag> : null}
                      {planned && !item.pkg.facilityFixed && c.facilityId !== item.pkg.facilityId ? (
                        <Button className="ml-1" onClick={() => s.setPlanPackage(MERROWGATE_ID, item.id, { facilityId: c.facilityId })}>
                          Choose
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      </div>
    </Panel>
  )
}

function NegotiationPanel({ v }: { v: PlanItemView }) {
  const s = useStore()
  const item = v.item
  const fam = FAMILIES[v.listing.family]
  const [open, setOpen] = useState(String(v.suggestedMandate.open))
  const [max, setMax] = useState(String(v.suggestedMandate.max))
  if (!v.sellerSimulated) {
    return (
      <Note tone="grey" testId="label-L24">
        {LABELS.L24}
      </Note>
    )
  }
  const openN = Number(open)
  const maxN = Number(max)
  const tick = fam.tick
  const valid = Number.isFinite(openN) && Number.isFinite(maxN) && openN > 0 && Math.abs(openN / tick - Math.round(openN / tick)) < 1e-9 && Math.abs(maxN / tick - Math.round(maxN / tick)) < 1e-9 && ticksOf(openN, tick) <= ticksOf(maxN, tick)
  return (
    <Panel title="Negotiation" data-testid="negotiation-panel">
      {!item.negotiation ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={`Open (${fam.pricingUnitLabel})`} htmlFor="mandate-open" hint="Your opening bid, private to you">
            <input id="mandate-open" className={inputClass} inputMode="decimal" value={open} onChange={(e) => setOpen(e.target.value)} data-testid="mandate-open" />
          </Field>
          <Field label={`Maximum (${fam.pricingUnitLabel})`} htmlFor="mandate-max" hint="Never stated by the agent">
            <input id="mandate-max" className={inputClass} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} data-testid="mandate-max" />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" size="lg" disabled={!valid} onClick={() => s.startNegotiation(MERROWGATE_ID, item.id, { open: openN, max: maxN })} data-testid="start-negotiation">
              Start negotiation agent
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <SimulatedAgent testId="label-L3" />
          <Thread log={item.negotiation.log} family={v.listing.family} />
          {item.status === 'agreed_in_principle' ? (
            <Button variant="primary" size="lg" onClick={() => s.buyerApprove(MERROWGATE_ID, item.id)} data-testid="buyer-approve">
              {LABELS.L21}
            </Button>
          ) : null}
          {item.status === 'no_agreement' ? <Note tone="grey">No agreement. Another round needs the seller's approval, which is not part of this prototype.</Note> : null}
          {item.status === 'awaiting_seller' ? <Note tone="steel">Sent to the seller. The offer carries the agreed price, the pieces and the delivery hub, nothing else.</Note> : null}
          {item.status === 'confirmed' ? (
            <Note tone="teal">
              {LABELS.L22}.{' '}
              <Link to="/project/deals" className="text-steel">
                Open the deal
              </Link>
            </Note>
          ) : null}
        </div>
      )}
    </Panel>
  )
}

export function Plan() {
  const world = useWorld()
  const { planItemId } = useParams()
  const navigate = useNavigate()
  const p = world.projects[MERROWGATE_ID]
  const selectedId = planItemId && p.planItems.some((i) => i.id === planItemId) ? planItemId : p.planItems[0]?.id
  const v = selectedId ? planItemView(world, MERROWGATE_ID, selectedId) : null
  return (
    <>
      <PageTitle title={`Reuse plan, ${p.name}`} sub="Each plan item is costed on its own, with its own vehicle. There is no plan total." />
      {p.planItems.length === 0 ? (
        <EmptyState hint="Add an allocation from the schedule matcher to start the plan." />
      ) : (
        <div className="flex flex-col gap-4">
          <Table data-testid="plan-table">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Requirement</th>
                <th className="text-right">Pieces</th>
                <th>Status</th>
                <th className="text-right">Estimated total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {p.planItems.map((i) => {
                const iv = planItemView(world, MERROWGATE_ID, i.id)
                return (
                  <tr key={i.id} className={i.id === selectedId ? 'bg-steel-tint' : ''} data-testid={`plan-row-${i.lotPublicId}`}>
                    <td>
                      {i.lotPublicId}: {iv.listing.title}
                    </td>
                    <td>{i.requirementRef}</td>
                    <Num>{i.pieces}</Num>
                    <td>
                      <Tag tone={i.status === 'confirmed' ? 'teal' : i.status === 'no_agreement' ? 'oxide' : 'steel'} data-testid={`plan-status-${i.lotPublicId}`}>
                        <span data-testid={`plan-status-text-${i.lotPublicId}`}>{PLAN_STATUS_LABELS[i.status]}</span>
                      </Tag>
                    </td>
                    <Num>{f.money(iv.estimate.total)}</Num>
                    <td>
                      <Button onClick={() => navigate(`/project/plan/${i.id}`)} data-testid={`open-plan-${i.lotPublicId}`}>
                        Open
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
          {v ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-2xl" data-testid="plan-item-title">
                  {v.listing.publicId}, {v.listing.title}, {v.item.pieces} pieces for {v.requirement.ref}
                </span>
                <Tag tone="steel">{PLAN_STATUS_LABELS[v.item.status]}</Tag>
                {v.listing.grade === 'unknown' ? <Tag tone="survey">Grade {GRADE_UNKNOWN.toLowerCase()}</Tag> : null}
                {v.listing.sharing === 'in_confidence' ? <Tag tone="steel">{LABELS.L27}</Tag> : null}
              </div>
              <Figure label="Price used" value={f.unitPrice(v.estimate.pricePerUnit, v.listing.family)} sub={v.item.agreedPricePerUnit !== null ? 'agreed price' : 'public guide price until a price is agreed'} testId="plan-price" />
              <PackagePanel v={v} />
              <NegotiationPanel v={v} />
            </>
          ) : null}
        </div>
      )}
    </>
  )
}
