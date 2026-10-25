// Reuse plan, the client's: one row per plan item; the package panel, the mandate and the negotiation thread
// (brief/09-V1-PRODUCT.md sections 3.4 and 13.5; steps 6 and 7 of 02). Figures come from the selectors.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useStore } from '../../store/store'
import { useWorld } from '../shared/hooks'
import { planItemView, type PlanItemView } from '../../store/selectors'
import { checkMandate, clientCanOpen, facilityRows, packageStorageText, planRows, PLAN_STATUS_LABELS, PLAN_STATUS_TONE } from '../../store/views/client'
import { useProjectParam, NotAvailable } from '../../app/params'
import { Panel, Table, Num, Tag, Button, Note, Field, Figure, EmptyState, SimulatedAgent, inputClass } from '../../components/ui'
import { HowCalculated } from '../../components/HowCalculated'
import { LABELS, GRADE_UNKNOWN } from '../../domain/reference/labels'
import { FAMILIES } from '../../domain/reference/families'
import { facilityById } from '../../domain/reference/assumptions'
import type { NegotiationEntry } from '../../domain/types'
import { packageSections, carbonSections } from '../shared/calc'
import { ClientHeader } from './ClientHeader'
import * as f from '../../domain/format'

function negotiationText(e: NegotiationEntry, family: keyof typeof FAMILIES): string {
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
        <Button className="mt-2 min-h-[44px]" onClick={() => setShown(log.length)} data-testid="negotiation-skip">
          Skip
        </Button>
      ) : null}
    </div>
  )
}

function PackagePanel({ v, projectId }: { v: PlanItemView; projectId: string }) {
  const s = useStore()
  const item = v.item
  const planned = item.status === 'planned'
  const confirmed = item.status === 'confirmed'
  const total = v.estimate
  const facility = item.pkg.facilityId ? facilityById(item.pkg.facilityId) : null
  return (
    <Panel title="Storage, testing and transport package" data-testid="package-panel">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
              <label className="-my-2.5 flex min-h-[44px] items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={item.pkg.testing} disabled={!planned} onChange={(e) => s.setPlanPackage(projectId, item.id, { testing: e.target.checked })} data-testid="package-testing" />
                <span data-testid="package-testing-text">{item.pkg.testing ? 'On' : 'Off'}</span>
              </label>
            </dd>
            <dt className="text-mill-text">Storage</dt>
            <dd data-testid="package-storage">{packageStorageText(v)}</dd>
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
            <HowCalculated title="package total" {...packageSections(total, facility?.name ?? null)} triggerLabel="How the package total is calculated" testId="package-calc" />
            <HowCalculated title="avoided carbon for this item" {...carbonSections(v.carbon)} triggerLabel="How the avoided carbon is calculated" testId="package-carbon-calc" />
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
              {facilityRows(v).map((c) => (
                <tr key={c.facilityId} className={c.chosen ? 'bg-steel-tint' : ''} data-testid={`facility-${c.facilityId}`}>
                  <td className="whitespace-nowrap">{c.name}</td>
                  <Num testId={`facility-total-${c.facilityId}`}>{f.money(c.total)}</Num>
                  <Num>{f.saving(c.saving, c.savingPercent)}</Num>
                  <td className="min-w-[150px]">
                    <span className="flex flex-wrap items-center gap-1">
                      {c.lowest ? <Tag tone="teal">Lowest estimated total</Tag> : null}
                      {c.chosen ? <Tag tone="steel">Chosen</Tag> : null}
                      {c.canChoose ? (
                        <Button className="min-h-[44px]" onClick={() => s.setPlanPackage(projectId, item.id, { facilityId: c.facilityId })}>
                          Choose
                        </Button>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </Panel>
  )
}

function NegotiationPanel({ v, projectId }: { v: PlanItemView; projectId: string }) {
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
  const mandate = checkMandate(open, max, v.listing.family)
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
            <Button variant="primary" size="lg" className="w-full text-panel sm:w-auto" disabled={!mandate.valid} onClick={() => s.startNegotiation(projectId, item.id, { open: mandate.open, max: mandate.max })} data-testid="start-negotiation">
              Start negotiation agent
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <SimulatedAgent testId="label-L3" />
          <Thread log={item.negotiation.log} family={v.listing.family} />
          {item.status === 'agreed_in_principle' ? (
            <Button variant="primary" size="lg" className="self-start text-panel" onClick={() => s.buyerApprove(projectId, item.id)} data-testid="buyer-approve">
              {LABELS.L21}
            </Button>
          ) : null}
          {item.status === 'no_agreement' ? <Note tone="grey">No agreement. Another round needs the seller's approval, which is not part of this prototype.</Note> : null}
          {item.status === 'awaiting_seller' ? <Note tone="steel">Sent to the seller. The offer carries the agreed price, the pieces and the delivery hub, nothing else.</Note> : null}
          {item.status === 'confirmed' ? (
            <Note tone="teal">
              {LABELS.L22}.{' '}
              <Link to={`/projects/${projectId}/deals`} className="text-steel">
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
  const personaId = useStore((st) => st.personaId)
  const { planItemId } = useParams()
  const navigate = useNavigate()
  const { record: p } = useProjectParam()
  if (!p || !clientCanOpen(world, personaId, p.id)) return <NotAvailable />
  const rows = planRows(world, p.id)
  const selectedId = planItemId && rows.some((i) => i.id === planItemId) ? planItemId : rows[0]?.id
  const v = selectedId ? planItemView(world, p.id, selectedId) : null
  return (
    <div className="flex flex-col gap-4" data-testid="client-plan">
      <ClientHeader eyebrow={p.name} title="Reuse plan" sub="Each plan item is costed on its own, with its own vehicle. There is no plan total." />
      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <EmptyState hint="Add an allocation from the Match schedule (advanced) to start the plan." />
          <Link to={`/projects/${p.id}/match`} className="inline-flex min-h-[44px] items-center rounded-sm border border-rule bg-panel px-4 text-sm font-medium text-steel no-underline hover:bg-steel-tint" data-testid="plan-open-match">
            Open Match schedule (advanced)
          </Link>
        </div>
      ) : (
        <>
          <Panel>
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
                {rows.map((i) => (
                  <tr key={i.id} className={i.id === selectedId ? 'bg-steel-tint [&>td]:align-middle' : '[&>td]:align-middle'} data-testid={`plan-row-${i.lotPublicId}`}>
                    <td>
                      <span className="font-medium">{i.lotPublicId}</span>: {i.title}
                    </td>
                    <td>{i.requirementRef}</td>
                    <Num>{i.pieces}</Num>
                    <td>
                      <Tag tone={PLAN_STATUS_TONE[i.status]} data-testid={`plan-status-${i.lotPublicId}`}>
                        <span data-testid={`plan-status-text-${i.lotPublicId}`}>{i.statusLabel}</span>
                      </Tag>
                    </td>
                    <Num>{f.money(i.estimateTotal)}</Num>
                    <td className="text-right">
                      <Button className="min-h-[44px]" aria-current={i.id === selectedId ? 'true' : undefined} onClick={() => navigate(`/projects/${p.id}/plan/${i.id}`)} data-testid={`open-plan-${i.lotPublicId}`}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
          {v ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="m-0 font-display text-2xl font-semibold leading-tight tracking-wide" data-testid="plan-item-title">
                  {v.listing.publicId}, {v.listing.title}, {v.item.pieces} pieces for {v.requirement.ref}
                </h2>
                <Tag tone={PLAN_STATUS_TONE[v.item.status]}>{PLAN_STATUS_LABELS[v.item.status]}</Tag>
                {v.listing.grade === 'unknown' ? <Tag tone="survey">Grade {GRADE_UNKNOWN.toLowerCase()}</Tag> : null}
                {v.listing.sharing === 'in_confidence' ? (
                  <Tag tone="steel" data-testid="label-L27">
                    {LABELS.L27}
                  </Tag>
                ) : null}
              </div>
              <Figure label="Price used" value={f.unitPrice(v.estimate.pricePerUnit, v.listing.family)} sub={v.item.agreedPricePerUnit !== null ? 'agreed price' : 'public guide price until a price is agreed'} testId="plan-price" />
              <PackagePanel v={v} projectId={p.id} />
              <NegotiationPanel v={v} projectId={p.id} />
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
