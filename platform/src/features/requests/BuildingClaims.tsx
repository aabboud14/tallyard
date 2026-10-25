// Buildings a surveying firm asks the donor building owner to confirm. Confirming adds the building to the owner's
// donor buildings with what was captured; declining keeps it with the firm, which never learns who declined.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Building2, Check, Copy, GitMerge, MapPin, Plus, X } from 'lucide-react'
import { act } from '../../store'
import type { ClaimRow } from '../../store/selectors/claims'
import { Button, Callout, Card, Dialog, EmptyState, Field, Pill, Textarea, toast } from '../../ui'
import { SectionTitle } from '../../app/Page'

export function BuildingClaims({ waiting, answered }: { waiting: ClaimRow[]; answered: ClaimRow[] }) {
  const [declining, setDeclining] = useState<ClaimRow | null>(null)
  const navigate = useNavigate()
  const confirm = (c: ClaimRow) => {
    const r = act.decideBuildingClaim(c.id, 'accepted', '')
    if (!r.ok) return toast.error(r.error ?? 'Could not confirm the building.')
    toast.success(`${c.buildingName} added to your donor buildings`, { description: `${c.surveyorName} stays appointed as its surveyor.` })
    navigate(`/app/buildings/${c.buildingId}`)
  }
  // The owner already has this building with the same surveyor: the surveyor's record joins it (note 26).
  const confirmInto = (c: ClaimRow, intoId: string) => {
    const r = act.confirmBuildingClaimInto(c.id, intoId, '')
    if (!r.ok || !r.value) return toast.error(r.error ?? 'Could not confirm the building.')
    const { moved, intoName } = r.value
    toast.success(intoName === c.buildingName ? `${c.buildingName} confirmed` : `${c.buildingName} joined your ${intoName}`, {
      description: `${moved} ${moved === 1 ? 'item' : 'items'} added to your ${intoName}. ${c.surveyorName} stays appointed as its surveyor.`,
      action: { label: 'Undo', onClick: r.undo },
    })
    navigate(`/app/buildings/${r.value.intoId}`)
  }
  if (waiting.length === 0 && answered.length === 0)
    return (
      <EmptyState
        variant="page"
        illustration="inbox"
        title="No buildings waiting"
        text="When a surveyor adds a building and names you as its owner, it appears here for you to confirm."
        testId="claims-empty"
      />
    )
  return (
    <div className="flex flex-col gap-8" data-testid="building-claims">
      {waiting.length === 0 ? (
        <EmptyState variant="inline" icon={Building2} title="No buildings waiting" text="When a surveyor adds a building and names you as its owner, it appears here for you to confirm." />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {waiting.map((c) => (
            <li key={c.id}>
              <ClaimCard c={c} onConfirm={() => confirm(c)} onConfirmInto={(intoId) => confirmInto(c, intoId)} onDecline={() => setDeclining(c)} />
            </li>
          ))}
        </ul>
      )}
      {answered.length > 0 ? (
        <section aria-labelledby="answered-title">
          <SectionTitle id="answered-title" title="Answered" as="h3" />
          <ul className="m-0 list-none divide-y divide-line-soft rounded-lg border border-line bg-surface p-0">
            {answered.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="m-0 font-medium text-ink">{c.buildingName}</p>
                  <p className="m-0 text-sm text-muted">
                    Added by {c.surveyorName}, {c.timeAgo}
                    {c.decisionNote ? `. Your note: ${c.decisionNote}` : ''}
                  </p>
                </div>
                <Pill tone={c.status === 'accepted' ? 'brand' : 'neutral'} dot size="sm" variant="quiet">
                  {c.statusLabel}
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <DeclineDialog claim={declining} onClose={() => setDeclining(null)} />
    </div>
  )
}

function ClaimCard({ c, onConfirm, onConfirmInto, onDecline }: { c: ClaimRow; onConfirm: () => void; onConfirmInto: (intoId: string) => void; onDecline: () => void }) {
  const dup = c.duplicate
  return (
    <Card padding="none" className="overflow-hidden" data-testid={`claim-${c.buildingId}`}>
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-semibold text-ink">{c.buildingName}</h3>
            <p className="m-0 mt-0.5 flex items-center gap-1.5 text-sm text-muted">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-faint" />
              {c.address}, {c.region}
            </p>
          </div>
          <Pill tone="warning" dot size="sm">
            {c.statusLabel}
          </Pill>
        </div>
        <dl className="m-0 grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:grid-cols-3">
          <div className="bg-surface px-3.5 py-2.5">
            <dt className="text-xs text-muted">Added by</dt>
            <dd className="m-0 mt-0.5 font-medium text-ink">{c.surveyorName}</dd>
            <dd className="m-0 text-sm text-muted">
              {c.requestedByName}, {c.timeAgo}
            </dd>
          </div>
          <div className="bg-surface px-3.5 py-2.5">
            <dt className="text-xs text-muted">Captured so far</dt>
            <dd className="m-0 mt-0.5 font-medium tabular-nums text-ink">
              {c.itemCount} {c.itemCount === 1 ? 'item' : 'items'}
            </dd>
            <dd className="m-0 text-sm text-muted">Survey {c.surveyStatusLabel.toLowerCase()}</dd>
          </div>
          <div className="bg-surface px-3.5 py-2.5">
            <dt className="text-xs text-muted">Local authority</dt>
            <dd className="m-0 mt-0.5 font-medium text-ink">{c.localAuthority || 'Not given'}</dd>
            <dd className="m-0 text-sm text-muted">{c.region}</dd>
          </div>
        </dl>
        {c.message ? (
          <blockquote className="m-0 border-l-2 border-line-strong pl-3 text-base text-ink-soft">
            {c.message}
          </blockquote>
        ) : null}
        {dup ? (
          <div data-testid={`claim-duplicate-${c.buildingId}`}>
            <Callout tone="warning" icon={Copy} title={`You may already have ${c.buildingName}`}>
              <p className="m-0">{dup.warning}</p>
              <p className="m-0 mt-1 text-sm text-muted">
                Yours: {dup.intoName}, {dup.intoAddress}
              </p>
            </Callout>
          </div>
        ) : null}
        <p className="m-0 text-sm text-muted">Confirming adds it to your donor buildings with what was captured. Nothing is shared or listed until you decide.</p>
        {c.canDecide ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
            <Button icon={X} onClick={onDecline} data-testid={`claim-decline-${c.buildingId}`}>
              Not ours
            </Button>
            {dup ? (
              <Button variant={dup.canMerge ? 'secondary' : 'primary'} icon={Plus} onClick={onConfirm} data-testid={`claim-confirm-${c.buildingId}`}>
                Add as a separate building
              </Button>
            ) : (
              <Button variant="primary" icon={Check} onClick={onConfirm} data-testid={`claim-confirm-${c.buildingId}`}>
                Confirm it is ours
              </Button>
            )}
            {dup?.canMerge ? (
              <Button variant="primary" icon={GitMerge} onClick={() => onConfirmInto(dup.intoId)} data-testid={`claim-confirm-into-${c.buildingId}`}>
                {dup.confirmLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function DeclineDialog({ claim, onClose }: { claim: ClaimRow | null; onClose: () => void }) {
  const [note, setNote] = useState('')
  const close = () => {
    setNote('')
    onClose()
  }
  const decline = () => {
    if (!claim) return
    const r = act.decideBuildingClaim(claim.id, 'declined', note)
    if (!r.ok) return toast.error(r.error ?? 'Could not record the answer.')
    toast.success(`${claim.buildingName} not confirmed`, { description: 'The surveyor is told, without your name.' })
    close()
  }
  return (
    <Dialog
      open={!!claim}
      onOpenChange={(o) => !o && close()}
      title="Not your building?"
      description={claim ? `${claim.buildingName}, ${claim.address}` : undefined}
      size="sm"
      testId="claim-decline-dialog"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="danger" icon={X} onClick={decline} data-testid="claim-decline-confirm">
            Not ours
          </Button>
        </>
      }
    >
      <Field label="Note for the surveyor" optional hint="They never see which organisation answered.">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: we sold this building in 2025." />
      </Field>
    </Dialog>
  )
}
