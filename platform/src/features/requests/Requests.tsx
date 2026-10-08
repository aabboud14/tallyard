// Reservation requests for the owner's lots. Before a decision the buyer is a blind line; accepting holds the lot
// for that project, declines any other request for it, and exchanges organisations and contacts.
import { useState } from 'react'
import { Link } from 'react-router'
import { Building2, Check, EyeOff, Inbox, Mail, MessageSquareText, UserRound, X } from 'lucide-react'
import { formatDate } from '../../domain/dates'
import * as f from '../../domain/format'
import { act, selectors, useView } from '../../store'
import type { RequestRow } from '../../store/selectors/owner'
import { Badge, Button, Card, Dialog, EmptyState, Field, IndicativeMarker, PageHeader, Pill, SegmentedControl, Textarea, toast } from '../../ui'
import { Page } from '../../app/Page'
import { Eyebrow } from '../notifications/kit'

type Deciding = { row: RequestRow; decision: 'accepted' | 'declined' }

export function Requests() {
  const v = useView(selectors.requestsView)
  const [tab, setTab] = useState<'pending' | 'decided'>('pending')
  const [deciding, setDeciding] = useState<Deciding | null>(null)
  if (!v) return null
  const rows = tab === 'pending' ? v.pending : v.decided
  return (
    <Page testId="requests">
      <PageHeader title="Requests" subtitle="Buyers asking you to reserve a lot. They stay anonymous until you accept." />
      {v.empty ? (
        <EmptyState variant="page" icon={Inbox} title="No reservation requests yet" text="When a client asks to reserve one of your shared or published lots, it appears here for you to accept or decline." />
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <SegmentedControl
            label="Requests"
            value={tab}
            onValueChange={(x) => setTab(x as 'pending' | 'decided')}
            items={[
              { value: 'pending', label: `Awaiting you ${v.pending.length}` },
              { value: 'decided', label: `Decided ${v.decided.length}` },
            ]}
            className="self-start"
          />
          {rows.length === 0 ? (
            <EmptyState variant="inline" icon={Inbox} title={tab === 'pending' ? 'Nothing waiting for you' : 'No decisions yet'} text={tab === 'pending' ? 'New requests appear here and in your notifications.' : 'Requests you accept or decline are kept here.'} />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {rows.map((r) => (
                <li key={r.id}>
                  <RequestCard row={r} onDecide={(decision) => setDeciding({ row: r, decision })} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <DecideDialog deciding={deciding} onClose={() => setDeciding(null)} />
    </Page>
  )
}

function RequestCard({ row: r, onDecide }: { row: RequestRow; onDecide: (d: 'accepted' | 'declined') => void }) {
  const tone = r.status === 'pending' ? 'info' : r.status === 'accepted' ? 'brand' : 'danger'
  return (
    <Card className="overflow-hidden" data-testid={`request-${r.tag}`}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 flex items-center gap-2 text-sm text-muted">
                <span className="rounded bg-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-ink-soft ring-1 ring-inset ring-line-soft">{r.tag}</span>
                <Link to={`/app/buildings/${r.buildingId}/inventory?item=${r.itemId}`} className="hover:text-ink hover:underline">
                  {r.buildingName}
                </Link>
                <span>· {r.timeAgo}</span>
              </p>
              <h3 className="m-0 mt-1 text-lg font-semibold text-ink">{r.title}</h3>
              <p className="m-0 text-sm text-ink-soft">{r.quantityText}, the whole lot</p>
            </div>
            <div className="flex items-center gap-2">
              {r.competing > 0 ? <Badge tone="warning">{r.competing} other {r.competing === 1 ? 'request' : 'requests'}</Badge> : null}
              <Pill tone={tone} dot size="sm" data-testid="request-status">
                {r.statusLabel}
              </Pill>
            </div>
          </div>

          {r.buyer.kind === 'blind' ? (
            <div className="rounded-lg border border-line bg-page/70 px-4 py-3" data-testid="blind-buyer">
              <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-muted">
                <EyeOff aria-hidden="true" className="size-3.5" />
                The buyer
              </p>
              <p className="m-0 mt-1 text-base font-medium text-ink">{r.buyer.text}</p>
              <p className="m-0 mt-0.5 text-sm text-muted">Their organisation, contact and message are shared when you accept.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-4" data-testid="known-buyer">
              <Eyebrow className="text-brand-700">Reserved for</Eyebrow>
              <dl className="m-0 mt-2 grid gap-3 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <Building2 aria-hidden="true" className="size-3.5" />
                    Buyer
                  </dt>
                  <dd className="m-0 mt-0.5 truncate font-medium text-ink">{r.buyer.org}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <UserRound aria-hidden="true" className="size-3.5" />
                    Contact
                  </dt>
                  <dd className="m-0 mt-0.5 truncate font-medium text-ink">{r.buyer.contact}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <Mail aria-hidden="true" className="size-3.5" />
                    Email
                  </dt>
                  <dd className="m-0 mt-0.5 truncate font-medium">
                    <a href={`mailto:${r.buyer.email}`} className="text-brand-700 underline-offset-4 hover:underline">
                      {r.buyer.email}
                    </a>
                  </dd>
                </div>
              </dl>
              {r.buyer.message ? (
                <p className="m-0 mt-3 flex items-start gap-1.5 text-sm text-ink-soft">
                  <MessageSquareText aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" />
                  {r.buyer.message}
                </p>
              ) : null}
            </div>
          )}

          {r.status === 'declined' ? <p className="m-0 text-sm text-muted">Declined{r.decidedAt ? ` on ${formatDate(r.decidedAt.slice(0, 10))}` : ''}{r.decisionNote ? `. Your note: ${r.decisionNote}` : '.'}</p> : null}
          {r.status === 'accepted' && r.decidedAt ? <p className="m-0 text-sm text-muted">Accepted on {formatDate(r.decidedAt.slice(0, 10))}. Agree the terms directly with the buyer.</p> : null}

          {r.canDecide ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
              <Button icon={X} onClick={() => onDecide('declined')} data-testid={`decline-${r.tag}`}>
                Decline
              </Button>
              <Button variant="primary" icon={Check} onClick={() => onDecide('accepted')} data-testid={`accept-${r.tag}`}>
                Accept
              </Button>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line-soft bg-page/60 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Your figures</Eyebrow>
            <IndicativeMarker />
          </div>
          <p className="m-0 mt-2 text-sm text-muted">At the guide price, {r.sellerEstimate.unitPrice}</p>
          <table className="mt-2 w-full border-collapse text-base tabular-nums">
            <caption className="sr-only">Your indicative figures for {r.title}</caption>
            <tbody>
              {r.sellerEstimate.lines.map((l) => (
                <tr key={l.label} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="py-1.5 text-left font-normal text-ink-soft">
                    {l.label}
                  </th>
                  <td className="py-1.5 text-right text-ink">{f.money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <th scope="row" className="pt-2.5 text-left font-semibold text-ink">
                  You receive
                </th>
                <td className="pt-2.5 text-right text-lg font-semibold text-ink">{f.money(r.sellerEstimate.net)}</td>
              </tr>
            </tfoot>
          </table>
          {r.sellerEstimate.facilityName ? <p className="m-0 mt-2 text-xs text-muted">Through {r.sellerEstimate.facilityName}.</p> : null}
        </div>
      </div>
    </Card>
  )
}

function DecideDialog({ deciding, onClose }: { deciding: Deciding | null; onClose: () => void }) {
  const [note, setNote] = useState('')
  const accept = deciding?.decision === 'accepted'
  const close = () => {
    setNote('')
    onClose()
  }
  const confirm = () => {
    if (!deciding) return
    const r = act.decideReservation(deciding.row.id, deciding.decision, note)
    if (!r.ok) return toast.error(r.error ?? 'Could not record the decision.')
    toast.success(accept ? `${deciding.row.tag} reserved` : 'Request declined', { description: accept ? 'You can now see the buyer and contact them.' : 'The buyer has been told.', action: { label: 'Undo', onClick: r.undo } })
    close()
  }
  return (
    <Dialog
      open={!!deciding}
      onOpenChange={(o) => !o && close()}
      title={accept ? 'Accept this reservation?' : 'Decline this request?'}
      description={deciding ? `${deciding.row.tag}, ${deciding.row.title}` : undefined}
      testId="decide-dialog"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant={accept ? 'primary' : 'danger'} icon={accept ? Check : X} onClick={confirm} data-testid="decide-confirm">
            {accept ? 'Accept and reserve' : 'Decline'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {accept ? (
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-base text-ink-soft">
            <li>The lot is held for this project and stops being offered.</li>
            {deciding && deciding.row.competing > 0 ? <li>The {deciding.row.competing === 1 ? 'other request is' : `${deciding.row.competing} other requests are`} declined for you.</li> : null}
            <li>You and the buyer see each other's organisation and contact.</li>
          </ul>
        ) : (
          <p className="m-0 text-base text-ink-soft">The buyer is told; they still do not learn who you are.</p>
        )}
        <Field label={accept ? 'Note for the buyer' : 'Reason'} optional>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={accept ? 'For example: collection from the yard by appointment.' : 'For example: already promised to another project.'} data-testid="decide-note" />
        </Field>
      </div>
    </Dialog>
  )
}

export default Requests
