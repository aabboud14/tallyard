// The deconstruction contractor on a building's overview: who it is, how many items it has dated, and (for the owner
// and the surveyor) the invitation itself. The contractor's dates stay private; the owner decides what buyers see.
import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, HardHat, Mail, Send, Undo2 } from 'lucide-react'
import { act, selectors, useView } from '../../store'
import { Button, Card, CardBody, CardHeader, Field, Input, Pill, ProgressBar, Select, toast } from '../../ui'

export function ContractorCard({ buildingId }: { buildingId: string }) {
  const o = useView(selectors.buildingOverview, buildingId)
  if (!o) return null
  const side = o.header.side
  const c = o.contractor
  const canAppoint = side === 'owner' || side === 'surveyor'
  if (!canAppoint && !c) return null
  return (
    <Card data-testid="contractor-card">
      <CardHeader title="Deconstruction contractor" icon={HardHat} />
      <CardBody className="flex flex-col gap-4">
        {c ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-base font-medium text-ink">{c.name}</p>
            <ProgressBar value={c.datedCount} max={c.itemCount} label={`Dates set for ${c.datedCount} of ${c.itemCount} items`} valueText={`${c.datedCount} of ${c.itemCount}`} showLabel size="sm" />
            {side === 'owner' && c.datedCount > 0 ? (
              <Link to={`/app/buildings/${buildingId}/inventory`} className="inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium text-ink-soft hover:text-ink max-sm:min-h-11">
                Review their dates in the inventory
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            ) : null}
          </div>
        ) : o.contractorInvite ? null : (
          <p className="m-0 text-base text-muted">None invited yet. A contractor says when each item is expected to come out.</p>
        )}
        {canAppoint && o.contractorInvite ? <PendingInvite buildingId={buildingId} email={o.contractorInvite.email} invitedText={o.contractorInvite.invitedText} /> : null}
        {canAppoint ? <AppointContractor key={c?.orgId ?? 'none'} buildingId={buildingId} current={c?.orgId ?? null} currentName={c?.name ?? null} options={o.contractorOptions} /> : null}
        {canAppoint ? <InviteByEmail buildingId={buildingId} /> : null}
      </CardBody>
    </Card>
  )
}

function clearedText(cleared: number, previousName: string | null): string | null {
  if (cleared === 0 || !previousName) return null
  return `${previousName}'s ${cleared === 1 ? 'date was' : `${cleared} dates were`} cleared.`
}

function AppointContractor({ buildingId, current, currentName, options }: { buildingId: string; current: string | null; currentName: string | null; options: { orgId: string; name: string }[] }) {
  const [value, setValue] = useState(current ?? '')
  const changed = value !== (current ?? '')
  const save = () => {
    const r = act.appointContractor(buildingId, value || null)
    if (!r.ok) return toast.error(r.error ?? 'Could not change the contractor.')
    const cleared = r.value ? clearedText(r.value.cleared, r.value.previousName ?? currentName) : null
    const description = [value ? 'They have been told and can set dates now.' : null, cleared].filter(Boolean).join(' ')
    toast.success(value ? 'Contractor invited' : 'Contractor removed', { description: description || undefined, action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
      <label htmlFor="appoint-contractor" className="text-sm font-medium text-ink">
        {current ? 'Change contractor' : 'Invite a contractor'}
      </label>
      <div className="flex gap-2">
        <Select id="appoint-contractor" className="flex-1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="None" options={options.map((o) => ({ value: o.orgId, label: o.name }))} data-testid="contractor-select" />
        <Button variant={changed ? 'primary' : 'secondary'} disabled={!changed} onClick={save} data-testid="contractor-save">
          Save
        </Button>
      </div>
      <p className="m-0 text-sm text-muted">They set when each item is expected to come out. You decide what buyers see.</p>
    </div>
  )
}

/** A contractor invited by email that has not joined Tallyard yet, with Withdraw. */
function PendingInvite({ buildingId, email, invitedText }: { buildingId: string; email: string; invitedText: string }) {
  const withdraw = () => {
    const r = act.withdrawContractorInvite(buildingId)
    if (!r.ok) return toast.error(r.error ?? 'Could not withdraw the invite.')
    toast.success('Invite withdrawn', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-soft bg-page/60 p-3" data-testid="contractor-invite-pending">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="warning" dot size="sm">
          Invited
        </Pill>
        <span className="min-w-0 break-all text-sm font-medium text-ink">Waiting for {email}</span>
      </div>
      <p className="m-0 text-sm text-muted">Invited on {invitedText}. They become the contractor when they join Tallyard as a surveying or deconstruction firm with this email.</p>
      <Button size="sm" variant="ghost" icon={Undo2} className="self-start" onClick={withdraw} data-testid="contractor-invite-withdraw">
        Withdraw
      </Button>
    </div>
  )
}

/** Invite a deconstruction company that is not in the list, by email. Nothing is emailed from the sandbox. */
function InviteByEmail({ buildingId }: { buildingId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!open)
    return (
      <Button size="sm" variant="ghost" icon={Mail} className="self-start" onClick={() => setOpen(true)} data-testid="contractor-invite-open">
        Invite by email
      </Button>
    )
  const send = () => {
    const r = act.inviteContractorByEmail(buildingId, email)
    if (!r.ok || !r.value) return setError(r.error ?? 'Could not send the invite.')
    const v = r.value
    toast.success(v.status === 'appointed' ? `${v.orgName ?? 'The firm'} invited` : 'Invite recorded', {
      description: v.status === 'appointed' ? 'They are already on Tallyard and can set dates now.' : 'Nothing is emailed from the sandbox. They become the contractor when they sign up with this email.',
      action: { label: 'Undo', onClick: r.undo },
    })
    setEmail('')
    setError(null)
    setOpen(false)
  }
  return (
    <div className="flex flex-col gap-2 border-t border-line-soft pt-4" data-testid="contractor-invite-form">
      <Field label="Contractor's email" error={error ?? undefined} hint="For a company not on Tallyard yet. Nothing is emailed from the sandbox.">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" placeholder="name@firm.example" data-testid="contractor-invite-email" />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" icon={Send} onClick={send} data-testid="contractor-invite-send">
          Send invite
        </Button>
      </div>
    </div>
  )
}
