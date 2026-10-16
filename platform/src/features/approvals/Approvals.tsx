// The client's approvals for a project: what the architect sent, with the facts to decide on, and the history.
// Approving does not buy anything: approved materials move to Reservations.
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowRight, Check, CheckCheck, ClipboardCheck, Hourglass, Leaf, MessageSquareText, X } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import type { ApprovalCard } from '../../store/selectors/client'
import { approvalsStrip, savingWholeText } from '../../store/selectors/sustainability-screens'
import { formatDate, formatDateShort } from '../../domain/dates'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { Avatar, Button, Card, Dialog, EmptyState, Field, IndicativeMarker, MetricTile, Pill, StatusPill, Textarea, toast } from '../../ui'
import { Page, SectionTitle } from '../../app/Page'
import { MaterialSummary } from './MaterialSummary'
import { CostPanel } from './CostPanel'
import { MaterialPicture } from '../buildings/photos'
import { TabHeader } from '../sustainability/parts'
import { usePhone } from '../../app/media'

type Decision = { item: ApprovalCard; decision: 'approved' | 'declined' }

function ApprovalsBody() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.approvalsView, projectId)
  const [deciding, setDeciding] = useState<Decision | null>(null)
  const phone = usePhone()
  if (!v) return null
  const base = `/app/projects/${projectId}`

  if (v.empty) {
    return (
      <EmptyState
        variant="page"
        icon={ClipboardCheck}
        illustration="inbox"
        title="Nothing to approve yet"
        text={`When ${v.architectName || 'your architect'} sends materials for your approval, they appear here with the facts you need to decide.`}
        testId="approvals-empty"
      />
    )
  }

  const strip = approvalsStrip(v)
  return (
    <div className="flex flex-col gap-10" data-testid="approvals">
      <div className="flex flex-col gap-5">
        <TabHeader title="Approvals" subtitle={`Materials ${v.architectName || 'your architect'} sent for your decision, with what each would cost against buying new. ${LABELS.L40}`} />
        {phone ? (
          // On a phone the three figures are one compact list, so the material waiting starts on the first screen.
          <Card padding="none" role="group" aria-label="Approvals in figures" data-testid="approvals-finance" className="flex flex-col">
            <ul className="m-0 list-none divide-y divide-line-soft p-0">
              {[
                { key: 'waiting', icon: Hourglass, label: 'Waiting for your decision', value: String(strip.waiting.count), sub: strip.waiting.sub },
                { key: 'approved', icon: CheckCheck, label: 'Approved', value: String(strip.approved.count), sub: strip.approved.sub },
                { key: 'carbon', icon: Leaf, label: 'Avoided carbon if you approve', value: `${f.number(strip.avoidedIfApprovedT, 1)} tCO2e`, sub: null },
              ].map((r) => (
                <li key={r.key} className="flex items-start gap-3 px-4 py-2.5" data-testid={`finance-${r.key}`}>
                  <r.icon aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-ink-soft">{r.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-ink">{r.value}</span>
                    </p>
                    {r.sub ? <p className="m-0 text-xs text-muted">{r.sub}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end border-t border-line-soft px-4 py-2">
              <IndicativeMarker />
            </div>
          </Card>
        ) : (
          <div role="group" aria-label="Approvals in figures" className="grid min-w-0 gap-3 sm:grid-cols-3" data-testid="approvals-finance">
            <MetricTile label="Waiting for your decision" icon={Hourglass} value={strip.waiting.count} sub={strip.waiting.sub} indicative testId="finance-waiting" />
            <MetricTile label="Approved" icon={CheckCheck} value={strip.approved.count} sub={strip.approved.sub} indicative testId="finance-approved" />
            <MetricTile label="Avoided carbon if you approve" icon={Leaf} value={f.number(strip.avoidedIfApprovedT, 1)} unit="tCO2e" sub="The materials waiting, against buying new" indicative testId="finance-carbon" />
          </div>
        )}
      </div>
      <section aria-labelledby="waiting-title">
        <SectionTitle
          id="waiting-title"
          title={v.waiting.length > 0 ? `${v.waiting.length} waiting for your decision` : 'Waiting for your decision'}
          description={`Sent by ${v.architectName}.`}
          actions={
            <div className="flex items-center gap-2">
              <Pill tone="brand" dot size="sm">
                {v.totals.approved.count} approved
              </Pill>
              {v.totals.declined.count > 0 ? (
                <Pill tone="danger" dot size="sm">
                  {v.totals.declined.count} declined
                </Pill>
              ) : null}
            </div>
          }
        />
        {v.waiting.length === 0 ? (
          <EmptyState variant="inline" icon={CheckCheck} title="You are up to date" text="Everything sent to you has a decision. Approved materials can be reserved." action={<Button asChild size="sm" trailingIcon={ArrowRight}><Link to={`${base}/reservations`}>Reservations</Link></Button>} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {v.waiting.map((item) => (
              <li key={item.itemId}>
                <Card padding="lg" data-testid={`approval-${item.publicId}`}>
                  <MaterialSummary card={item.card} title={item.title}>
                    <CostPanel cost={item.cost} publicId={item.publicId} />
                    {item.sentMessage || item.note ? (
                      <div className="flex gap-3 rounded-lg bg-subtle/70 px-3.5 py-3">
                        <Avatar name={v.architectName} shape="square" size="sm" decorative className="mt-0.5" />
                        <div className="min-w-0 text-base">
                          <p className="m-0 text-xs text-muted">
                            {v.architectName}
                            {item.sentOn ? `, ${formatDateShort(item.sentOn)}` : ''}
                          </p>
                          {item.sentMessage ? <p className="m-0 mt-0.5 text-ink">{item.sentMessage}</p> : null}
                          {item.note ? <p className="m-0 mt-0.5 text-ink-soft">{item.note}</p> : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
                      <Button icon={X} onClick={() => setDeciding({ item, decision: 'declined' })} data-testid={`decline-${item.publicId}`}>
                        Decline
                      </Button>
                      <Button variant="primary" icon={Check} onClick={() => setDeciding({ item, decision: 'approved' })} data-testid={`approve-${item.publicId}`}>
                        Approve
                      </Button>
                    </div>
                  </MaterialSummary>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {v.history.length > 0 ? (
        <section aria-labelledby="history-title">
          <SectionTitle id="history-title" title="Decided" description="Your decisions on this project, newest first." />
          <Card>
            <ul className="m-0 list-none divide-y divide-line-soft p-0">
              {v.history.map((item) => (
                <li key={item.itemId} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5" data-testid={`decided-${item.publicId}`}>
                  <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <MaterialPicture spec={item.card.listing.spec} publicId={item.card.publicId} photo={item.card.photo} aspect="4/3" rounded="md" className="w-16 shrink-0" />
                    <div className="min-w-0">
                      <p className="m-0 truncate text-base font-medium text-ink">{item.title}</p>
                      <p className="m-0 mt-0.5 truncate text-sm text-muted">
                        {item.card.quantityText}
                        {item.decidedOn ? ` · Decided ${formatDate(item.decidedOn)}` : ''}
                      </p>
                      <p className="m-0 mt-0.5 truncate text-sm tabular-nums text-muted" data-testid={`decided-cost-${item.publicId}`}>
                        {f.moneyWhole(item.cost.total)} · {savingWholeText(item.cost.saving)} <span className="sr-only">Indicative</span>
                      </p>
                      {item.decisionNote ? (
                        <p className="m-0 mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
                          <MessageSquareText aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-faint" />
                          {item.decisionNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                    {item.reservation ? (
                      <Pill tone={item.reservation.status === 'accepted' ? 'brand' : item.reservation.status === 'pending' ? 'info' : 'neutral'} size="sm">
                        {item.reservation.statusLabel}
                      </Pill>
                    ) : null}
                    <StatusPill status={item.status} size="sm" />
                    {item.status === 'approved' && !item.reservation ? (
                      <Button asChild size="sm" variant="ghost" trailingIcon={ArrowRight}>
                        <Link to={`${base}/reservations`}>Reserve</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <p className="m-0 flex flex-col gap-2 border-t border-line-soft pt-4 text-sm text-muted sm:flex-row sm:items-start sm:justify-between" data-testid="finance-caveat">
        <span className="max-w-[90ch]">{v.caveat}</span>
        <IndicativeMarker />
      </p>
      <DecisionDialog projectId={projectId} deciding={deciding} onClose={() => setDeciding(null)} />
    </div>
  )
}

function DecisionDialog({ projectId, deciding, onClose }: { projectId: string; deciding: Decision | null; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const approve = deciding?.decision === 'approved'
  const close = () => {
    setNote('')
    setError(null)
    onClose()
  }
  const confirm = () => {
    if (!deciding) return
    const r = act.decideItem(projectId, deciding.item.itemId, deciding.decision, note)
    if (!r.ok) {
      setError(r.error)
      return
    }
    toast.success(approve ? `Approved ${deciding.item.title}` : `Declined ${deciding.item.title}`, {
      description: approve ? 'It is now ready to reserve.' : 'The architect sees your note.',
      action: { label: 'Undo', onClick: r.undo },
    })
    close()
  }
  return (
    <Dialog
      open={deciding !== null}
      onOpenChange={(o) => {
        if (!o) close()
      }}
      title={approve ? 'Approve this material' : 'Decline this material'}
      description={deciding ? deciding.item.title : undefined}
      testId="decision-dialog"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant={approve ? 'primary' : 'danger'} icon={approve ? Check : X} onClick={confirm} data-testid="decision-confirm">
            {approve ? 'Approve' : 'Decline'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-base text-ink-soft">
          {approve ? 'Approving tells the architect they can specify it. Nothing is bought: you can then ask the seller to reserve it.' : 'The architect sees your decision and your note, and can propose something else.'}
        </p>
        <Field label={approve ? 'Note for the architect' : 'Why are you declining?'} optional error={error ?? undefined}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={approve ? 'For example: approved for the podium columns.' : 'For example: the programme is too tight for this lot.'} data-testid="decision-note" />
        </Field>
      </div>
    </Dialog>
  )
}

/** A tab of the project workspace, framed like the other tabs. */
export function Approvals() {
  return (
    <Page className="lg:pt-7">
      <ApprovalsBody />
    </Page>
  )
}

export default Approvals
