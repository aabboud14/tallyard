// Linking a building the surveying firm added to its owner: ask the owner by email, withdraw a request that waits,
// ask again after a decline, or delete the building while no owner has confirmed it. The firm never learns which
// organisation declined.
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { MailQuestion, RotateCcw, Send, Trash2, Undo2 } from 'lucide-react'
import { act } from '../../store'
import type { ClaimState } from '../../store/selectors/claims'
import { Button, Card, CardBody, CardHeader, Dialog, Field, Input, Pill, Textarea, toast } from '../../ui'
import { CLAIM_TONE } from './labels'

export function ClaimPill({ claim, size = 'sm' }: { claim: ClaimState; size?: 'sm' | 'md' }) {
  return (
    <Pill tone={CLAIM_TONE[claim.status]} dot size={size} data-testid="claim-status">
      {claim.label}
    </Pill>
  )
}

export function ClaimDialog({ buildingId, buildingName, open, onOpenChange }: { buildingId: string; buildingName: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const close = () => {
    setName('')
    setEmail('')
    setMessage('')
    setError(null)
    onOpenChange(false)
  }
  const send = (e: FormEvent) => {
    e.preventDefault()
    const r = act.requestBuildingClaim(buildingId, { email, name, message })
    if (!r.ok) return setError(r.error)
    toast.success('Request sent', { description: 'The owner sees it when they sign in with that email.', action: { label: 'Undo', onClick: r.undo } })
    close()
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
      title="Ask the owner to confirm"
      description={`${buildingName} joins their donor buildings when they confirm it. You stay its surveyor.`}
      testId="claim-dialog"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" icon={Send} type="submit" form="claim-form" data-testid="claim-send">
            Send request
          </Button>
        </>
      }
    >
      <form id="claim-form" onSubmit={send} className="flex flex-col gap-4" noValidate>
        {error ? (
          <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner's name" optional>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Owner's email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" data-testid="claim-email" />
          </Field>
        </div>
        <Field label="Message" optional hint="Nothing is emailed in the sandbox. The owner sees the request when they sign in with this email.">
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For example: we surveyed it ahead of the strip-out tender." />
        </Field>
      </form>
    </Dialog>
  )
}

/** The buttons that go with a claim state: ask, withdraw, or ask again. */
export function ClaimActions({ buildingId, buildingName, claim, size = 'md' }: { buildingId: string; buildingName: string; claim: ClaimState; size?: 'sm' | 'md' }) {
  const [asking, setAsking] = useState(false)
  if (claim.status === 'linked') return null
  const withdraw = () => {
    if (!claim.claimId) return
    const r = act.withdrawBuildingClaim(claim.claimId)
    if (!r.ok) return toast.error(r.error ?? 'Could not withdraw the request.')
    toast.success('Request withdrawn', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <>
      {claim.status === 'pending' ? (
        <Button size={size} icon={Undo2} onClick={withdraw} data-testid="claim-withdraw">
          Withdraw
        </Button>
      ) : (
        <Button size={size} variant="primary" icon={claim.status === 'declined' ? RotateCcw : MailQuestion} onClick={() => setAsking(true)} data-testid="claim-ask">
          {claim.status === 'declined' ? 'Ask again' : 'Ask the owner'}
        </Button>
      )}
      <ClaimDialog buildingId={buildingId} buildingName={buildingName} open={asking} onOpenChange={setAsking} />
    </>
  )
}

/** The Owner card on the overview of a building the firm added and no owner has confirmed yet. */
export function OwnerLinkCard({ buildingId, buildingName, claim }: { buildingId: string; buildingName: string; claim: ClaimState }) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  if (claim.status === 'linked') return null
  const del = () => {
    const r = act.deleteSurveyBuilding(buildingId)
    setDeleting(false)
    if (!r.ok) return toast.error(r.error ?? 'Could not delete the building.')
    toast.success(`${buildingName} deleted`)
    navigate('/app/buildings')
  }
  const text =
    claim.status === 'pending'
      ? `Waiting for ${claim.email}. The survey can be submitted once they confirm.`
      : claim.status === 'declined'
        ? 'The owner did not confirm it. Check the email address and ask again.'
        : 'Only its owner can share or list what it holds. Ask them to confirm it is theirs.'
  return (
    <Card data-testid="owner-link-card">
      <CardHeader title="Owner" icon={MailQuestion} actions={<ClaimPill claim={claim} />} />
      <CardBody className="flex flex-col gap-4">
        <p className="m-0 text-base text-ink-soft">{text}</p>
        {claim.status === 'declined' && claim.note ? <blockquote className="m-0 border-l-2 border-line-strong pl-3 text-sm text-ink-soft">{claim.note}</blockquote> : null}
        <div className="flex flex-wrap gap-2">
          <ClaimActions buildingId={buildingId} buildingName={buildingName} claim={claim} />
        </div>
        <div className="border-t border-line-soft pt-3">
          <Button variant="ghost" size="sm" icon={Trash2} className="text-danger hover:text-danger" onClick={() => setDeleting(true)} data-testid="delete-building">
            Delete building
          </Button>
        </div>
      </CardBody>
      <Dialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${buildingName}?`}
        description="Its items and photos go too. This cannot be undone."
        size="sm"
        footer={
          <>
            <Button onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="danger" icon={Trash2} onClick={del} data-testid="delete-building-confirm">
              Delete building
            </Button>
          </>
        }
      />
    </Card>
  )
}
