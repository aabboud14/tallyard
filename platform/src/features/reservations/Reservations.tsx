// The client's reservations: each approved material with its indicative package (storage, testing, transport)
// and the request to the seller. The seller sees a blind line until they accept; then both sides see each other.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Building2, Clock, EyeOff, Handshake, Leaf, Mail, RotateCcw, Send, Undo2, UserRound, Wallet } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { ReservationRow, ReservationsView } from '../../store/selectors/client'
import { reservationCounts, sellerSeesLine, whenText } from '../../store/selectors/roles-views'
import { goalMeter, reservationCarbonRows, reservationCostBars } from '../../store/selectors/sustainability-screens'
import { formatDate } from '../../domain/dates'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { BarList, Button, Callout, Card, CardHeader, Dialog, EmptyState, Field, IndicativeMarker, Legend, MARK, Pill, SustainabilityBand, TargetMeter, Textarea, toast, type Tone } from '../../ui'
import { Page } from '../../app/Page'
import { TabHeader } from '../sustainability/parts'
import { MaterialFacts } from '../approvals/MaterialSummary'
import { MaterialPicture } from '../buildings/photos'

const TONE = { pending: 'info', accepted: 'brand', declined: 'danger', withdrawn: 'neutral' } as const

function ReservationsBody() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.reservationsView, projectId)
  const blind = useView(sellerSeesLine, projectId)
  const [requesting, setRequesting] = useState<ReservationRow | null>(null)
  if (!v) return null
  const base = `/app/projects/${projectId}`

  if (v.empty) {
    return (
      <EmptyState
        variant="page"
        icon={Handshake}
        illustration="inbox"
        title="No approved materials yet"
        text="Approve materials your architect sends you, then reserve them here. Each comes with an indicative package for storage, testing and delivery."
        action={
          <Button asChild variant="primary" trailingIcon={ArrowRight}>
            <Link to={`${base}/approvals`}>Go to approvals</Link>
          </Button>
        }
        testId="reservations-empty"
      />
    )
  }

  const counts = reservationCounts(v.rows)

  return (
    <div className="flex flex-col gap-6" data-testid="reservations">
      <TabHeader
        title="Reservations"
        subtitle="Ask the seller to hold an approved material for this project. Prices and package costs are indicative until you agree terms with the seller."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Pill size="sm" dot>
              {counts.open} to request
            </Pill>
            <Pill tone="info" size="sm" dot>
              {counts.pending} with the seller
            </Pill>
            <Pill tone="brand" size="sm" dot>
              {counts.reserved} reserved
            </Pill>
          </div>
        }
      />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <CostSummary s={v.summary} caveat={v.caveat} />
        <CarbonSummary s={v.summary} />
      </div>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {v.rows.map((row) => (
          <li key={row.itemId}>
            <ReservationCard row={row} onRequest={() => setRequesting(row)} />
          </li>
        ))}
      </ul>
      <RequestDialog projectId={projectId} row={requesting} blindLine={blind} onClose={() => setRequesting(null)} />
    </div>
  )
}

const GROUP_TONE: Record<string, Tone> = { reserved: 'brand', requested: 'info', to_request: 'neutral' }

function CostSummary({ s, caveat }: { s: ReservationsView['summary']; caveat: string }) {
  const c = reservationCostBars(s)
  return (
    <Card data-testid="reservations-cost" className="flex min-w-0 flex-col">
      <CardHeader title="Cost" icon={Wallet} titleAs="h3" description="Package totals by stage, with the same quantity new marked on each bar." actions={<IndicativeMarker />} />
      <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
        <BarList
          label="Indicative package cost by stage"
          max={c.max}
          ticks={c.ticks}
          items={c.bars.map((b) => ({ key: b.key, label: b.label, sub: b.sub, value: b.value, valueText: b.valueText, colour: MARK[GROUP_TONE[b.key]], target: b.count > 0 ? { value: b.costNew, label: b.costNewText } : null }))}
        />
        <Legend
          label="Key"
          className="text-xs"
          items={[
            ...c.bars.map((b) => ({ key: b.key, label: b.label, colour: MARK[GROUP_TONE[b.key]] })),
            { key: 'new', label: 'The same new', colour: 'var(--color-ink)' },
          ]}
        />
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3" data-testid="reservations-cost-total">
          <span className="text-sm font-medium text-ink">Total, {c.total.count} {c.total.count === 1 ? 'material' : 'materials'}</span>
          <span className="text-right">
            <span className="block text-lg font-semibold tabular-nums text-ink">{c.total.valueText}</span>
            <span className="block text-sm text-brand-700">{c.total.savingText}</span>
          </span>
        </div>
        <p className="m-0 text-xs text-muted">{caveat}</p>
      </div>
    </Card>
  )
}

function CarbonSummary({ s }: { s: ReservationsView['summary'] }) {
  const goal = s.carbonGoal
  const m = goal ? goalMeter(goal) : null
  const rows = reservationCarbonRows(s)
  return (
    <Card data-testid="reservations-carbon" className="flex min-w-0 flex-col">
      <CardHeader title="Carbon" icon={Leaf} titleAs="h3" description="Avoided carbon against buying new, for this project." actions={<IndicativeMarker />} />
      <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
        {m && m.target !== null ? (
          <TargetMeter label="Secured for this project" value={m.value} max={m.max} target={m.target} valueText={`${f.number(s.securedProjectT, 1)} tCO2e`} targetText={m.targetText} state={m.state} stateText={m.stateText} axis={m.axis} testId="reservations-carbon-meter" />
        ) : (
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-soft">Secured for this project</span>
            <span className="text-right">
              <span className="block font-medium tabular-nums text-ink">{f.number(s.securedProjectT, 1)} tCO2e</span>
              <span className="block text-muted">No carbon target set</span>
            </span>
          </div>
        )}
        <p className="m-0 -mt-1 text-xs text-muted">Secured counts earlier deals and accepted reservations.</p>
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Avoided carbon by stage</caption>
          <thead>
            <tr className="text-xs text-muted">
              <th scope="col" className="pb-1.5 text-left font-medium">
                Stage
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Avoided
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                Reclaimed
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line-soft">
                <th scope="row" className="py-2 text-left font-normal text-ink-soft">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: MARK[GROUP_TONE[r.key]] }} />
                    {r.label}
                    <span className="text-muted">{r.count}</span>
                  </span>
                </th>
                <td className="py-2 text-right font-medium text-ink">{r.carbonText}</td>
                <td className="py-2 text-right text-ink-soft">{r.massText}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="m-0 mt-auto text-xs text-muted">{LABELS.L11}</p>
      </div>
    </Card>
  )
}

function ReservationCard({ row, onRequest }: { row: ReservationRow; onRequest: () => void }) {
  const r = row.reservation
  const e = row.estimate
  const withdraw = () => {
    if (!r) return
    const out = act.withdrawReservation(r.id)
    if (!out.ok) return toast.error(out.error ?? 'Could not withdraw the request.')
    toast.success('Request withdrawn', { action: { label: 'Undo', onClick: out.undo } })
  }
  return (
    <Card data-testid={`reservation-${row.publicId}`} className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <MaterialPicture spec={row.card.listing.spec} publicId={row.card.publicId} photo={row.card.photo} aspect="4/3" rounded="md" className="w-24 shrink-0 sm:w-32" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="m-0 text-sm text-muted">
                  {row.card.typologyLabel} · {row.card.familyLabel}
                </p>
                {r ? (
                  <Pill tone={TONE[r.status]} dot size="sm" data-testid="reservation-status">
                    {r.statusLabel}
                  </Pill>
                ) : null}
              </div>
              <h3 className="m-0 mt-0.5 text-lg font-semibold text-ink">{row.title}</h3>
              <p className="m-0 mt-0.5 text-sm text-ink-soft">{row.card.collectionPoint === 'From the source site' ? 'Collected from the source site' : `Held at ${row.card.collectionPoint}`}</p>
            </div>
          </div>
          <MaterialFacts card={row.card} />
          <Status row={row} onRequest={onRequest} onWithdraw={withdraw} />
        </div>
        <div className="border-t border-line-soft bg-page/60 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-sm font-medium text-ink-soft">Indicative package</p>
            <IndicativeMarker />
          </div>
          <table className="mt-3 w-full border-collapse text-base tabular-nums">
            <caption className="sr-only">Indicative package for {row.title}</caption>
            <tbody>
              {e.lines.map((l) => (
                <tr key={l.id} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="py-2 text-left font-normal text-ink-soft">
                    {l.label}
                  </th>
                  <td className="py-2 text-right text-ink">{l.amount === 0 ? <span className="text-muted">Not needed</span> : f.money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <th scope="row" className="pt-3 text-left font-semibold text-ink">
                  Total
                </th>
                <td className="pt-3 text-right text-lg font-semibold text-ink" data-testid="package-total">
                  {f.money(e.total)}
                </td>
              </tr>
              <tr>
                <th scope="row" className="pt-1 text-left text-sm font-normal text-muted">
                  The same new
                </th>
                <td className="pt-1 text-right text-sm text-muted">{f.money(e.costNew)}</td>
              </tr>
            </tfoot>
          </table>
          <p className={`m-0 mt-3 rounded-md px-2.5 py-1.5 text-sm font-medium ${e.saving >= 0 ? 'bg-brand-50 text-brand-700' : 'bg-warning-soft text-warning'}`}>{f.saving(e.saving, e.savingPercent)}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-line-soft pt-3" data-testid={`reservation-carbon-${row.publicId}`}>
            <p className="m-0 flex items-center gap-1.5 text-sm text-ink-soft">
              <Leaf aria-hidden="true" className="size-3.5 text-faint" />
              Avoided carbon <span className="font-medium tabular-nums text-ink">{row.carbon.avoidedT !== null ? f.carbon(row.carbon.avoidedT) : 'Not claimed'}</span>
            </p>
            <div className="flex items-center gap-2">
              {row.carbon.percentText ? <span className="text-xs text-muted">{row.carbon.percentText}</span> : null}
              <SustainabilityBand band={row.carbon.band} size="sm" />
            </div>
          </div>
          <p className="m-0 mt-3 text-xs text-muted">
            {e.storageMonths > 0 ? `Stored ${f.months(e.storageMonths)} at ${e.facilityName}. ` : `Delivered from ${e.facilityName}. `}
            {e.testing ? 'Includes testing before delivery. ' : ''}
            {row.estimateIsLive ? 'Worked out today.' : 'As at your request.'}
          </p>
        </div>
      </div>
    </Card>
  )
}

function Status({ row, onRequest, onWithdraw }: { row: ReservationRow; onRequest: () => void; onWithdraw: () => void }) {
  const r = row.reservation
  if (r?.status === 'accepted' && r.exchanged) {
    const x = r.exchanged
    return (
      <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-4" data-testid="seller-contact">
        <p className="m-0 flex items-center gap-2 text-base font-medium text-brand-800">
          <Handshake aria-hidden="true" className="size-4" />
          Reserved{r.decidedAt ? ` on ${formatDate(r.decidedAt.slice(0, 10))}` : ''}. Contact the seller to agree terms.
        </p>
        <dl className="m-0 mt-3 grid gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <Building2 aria-hidden="true" className="size-3.5" />
              Seller
            </dt>
            <dd className="m-0 mt-0.5 truncate font-medium text-ink">{x.sellerOrg}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <UserRound aria-hidden="true" className="size-3.5" />
              Contact
            </dt>
            <dd className="m-0 mt-0.5 truncate font-medium text-ink">{x.sellerContact}</dd>
          </div>
          <div className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <Mail aria-hidden="true" className="size-3.5" />
              Email
            </dt>
            <dd className="m-0 mt-0.5 truncate font-medium">
              <a href={`mailto:${x.sellerEmail}`} className="text-brand-700 underline-offset-4 hover:underline">
                {x.sellerEmail}
              </a>
            </dd>
          </div>
        </dl>
        {r.decisionNote ? <p className="m-0 mt-3 text-sm text-ink-soft">The seller's note: {r.decisionNote}</p> : null}
      </div>
    )
  }
  if (r?.status === 'pending') {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-2 text-base font-medium text-ink">
            <Clock aria-hidden="true" className="size-4 text-info" />
            {whenText('Requested', r.requestedAgo)}. Waiting for the seller.
          </p>
          {r.message ? <p className="m-0 mt-1 text-sm text-ink-soft">Your message: {r.message}</p> : null}
          <p className="m-0 mt-1 flex items-center gap-1.5 text-sm text-muted">
            <EyeOff aria-hidden="true" className="size-3.5" />
            The seller does not see who you are until they accept.
          </p>
        </div>
        {row.canWithdraw ? (
          <Button size="sm" variant="ghost" icon={Undo2} onClick={onWithdraw} data-testid="withdraw-request">
            Withdraw
          </Button>
        ) : null}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {r?.status === 'declined' ? (
        <Callout tone="danger" title="The seller declined this request">
          {r.decisionNote ?? 'No note was given.'}
        </Callout>
      ) : null}
      {r?.status === 'withdrawn' ? <Callout title="You withdrew this request">You can ask the seller again.</Callout> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-muted">Approved for this project. Ask the seller to hold it for you.</p>
        <Button variant="primary" icon={r ? RotateCcw : Send} onClick={onRequest} data-testid={`request-${row.publicId}`}>
          {r ? 'Request again' : 'Request reservation'}
        </Button>
      </div>
    </div>
  )
}

function RequestDialog({ projectId, row, blindLine, onClose }: { projectId: string; row: ReservationRow | null; blindLine: string | null; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setMessage('')
    setError(null)
    onClose()
  }
  const send = () => {
    if (!row) return
    const r = act.requestReservation(projectId, row.itemId, message)
    if (!r.ok) {
      setError(r.error)
      return
    }
    toast.success('Reservation requested', { description: 'The seller will accept or decline. You will get a notification.', action: { label: 'Undo', onClick: r.undo } })
    close()
  }
  return (
    <Dialog
      open={row !== null}
      onOpenChange={(o) => {
        if (!o) close()
      }}
      title="Request a reservation"
      description={row?.title}
      testId="request-dialog"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" icon={Send} onClick={send} data-testid="request-send">
            Send request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {blindLine ? (
          <div className="rounded-lg border border-line bg-subtle/60 px-3.5 py-3">
            <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-muted">
              <EyeOff aria-hidden="true" className="size-3.5" />
              The seller sees your request as
            </p>
            <p className="m-0 mt-1 text-base font-medium text-ink">{blindLine}</p>
            <p className="m-0 mt-1 text-sm text-muted">Your organisation and contact are shared only if they accept.</p>
          </div>
        ) : null}
        <Field label="Message to the seller" optional error={error ?? undefined} hint="Quantity, timing or testing you need. No names or contact details: they are shared on acceptance.">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="For example: the full lot, for the office frame." data-testid="request-message" />
        </Field>
      </div>
    </Dialog>
  )
}

/** A tab of the project workspace, framed like the other tabs. */
export function Reservations() {
  return (
    <Page className="lg:pt-7">
      <ReservationsBody />
    </Page>
  )
}

export default Reservations
