// What the architect sees while the client organisation has not accepted the project: a banner on the overview and
// the shortlist, and the dialog to ask again or ask another client. Only the organisation's name shows, never its
// people (projects-timeline design D6). While the client has not answered, the overview folds the banner into the
// setup checklist as one line (variant 'inline'), so the programme stays on the first screen; a decline keeps the
// full banner.
import { useState } from 'react'
import { Check, Copy, Mail, MailQuestion, RotateCcw, Send, UserRoundX, Users } from 'lucide-react'
import { act, useView } from '../../store'
import { PRODUCT_NAME } from '../../domain/constants'
import { changeClientOptions, clientLinkView, type ClientLinkView } from '../../store/selectors/project'
import { Button, Callout, Dialog, Field, Input, Select, Textarea, toast } from '../../ui'

const NEW_CLIENT = '__new__'

/**
 * For a client nobody uses yet: invite a contact there by email, then share the link (the sandbox sends no email),
 * send a new invite, or use another email. The contact joins the client organisation and answers the request.
 */
function ClientInvite({ projectId, link, compact = false }: { projectId: string; link: ClientLinkView; compact?: boolean }) {
  const inv = link.invite
  const [editing, setEditing] = useState(!inv)
  const [email, setEmail] = useState(inv?.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const send = (to: string) => {
    const r = act.inviteClientContact(projectId, to)
    if (!r.ok) {
      setError(r.error ?? 'The invite could not be sent.')
      return
    }
    setError(null)
    setEditing(false)
    setCopied(false)
    toast.success(`Invite ready for ${to.trim()}`, { description: 'In the sandbox no email is sent. Copy the link for them.', action: { label: 'Undo', onClick: r.undo } })
  }
  const copy = async () => {
    if (!inv) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`)
      setCopied(true)
    } catch {
      toast.error('The link could not be copied.')
    }
  }
  if (inv && !editing)
    return (
      <div className="flex flex-col gap-2" data-testid="client-invite-sent">
        <p className="m-0 text-sm text-ink-soft">
          <span className="font-medium text-ink">{inv.sentText}.</span> They join {link.clientName} and accept the project from their home. In the sandbox no email is sent, so copy the link for them.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={copied ? Check : Copy} onClick={() => void copy()} data-testid="client-invite-copy">
            {copied ? 'Link copied' : 'Copy invite link'}
          </Button>
          <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => send(inv.email)} data-testid="client-invite-resend">
            Resend
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} data-testid="client-invite-other">
            Use another email
          </Button>
        </div>
      </div>
    )
  return (
    <form
      noValidate
      className={compact ? 'flex max-w-xl flex-col gap-2 sm:flex-row sm:items-start' : 'flex flex-col gap-2 sm:flex-row sm:items-start'}
      onSubmit={(e) => {
        e.preventDefault()
        send(email)
      }}
      data-testid="client-invite-form"
    >
      <Field label={`Contact at ${link.clientName}`} error={error ?? undefined} className="min-w-0 flex-1">
        <Input type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" data-testid="client-invite-email" />
      </Field>
      <Button type="submit" size="md" variant="primary" icon={Send} className="sm:mt-6" data-testid="client-invite-send">
        Send invite
      </Button>
    </form>
  )
}

export type ChangeClientMode = 'ask_again' | 'another'

/** The banner, with its own dialog. Renders nothing once the client has accepted, or for anyone but the architect. */
export function ClientLinkBanner({ projectId, onChangeClient, variant = 'banner' }: { projectId: string; onChangeClient?: (mode: ChangeClientMode) => void; variant?: 'banner' | 'inline' }) {
  const link = useView(clientLinkView, projectId)
  const [mode, setMode] = useState<ChangeClientMode | null>(null)
  if (!link) return null
  const open = (m: ChangeClientMode) => (onChangeClient ? onChangeClient(m) : setMode(m))
  const declined = link.status === 'declined'
  const dialog = onChangeClient ? null : <ChangeClientDialog projectId={projectId} mode={mode} onClose={() => setMode(null)} />
  if (variant === 'inline' && !declined) {
    const Icon = link.clientHasMembers ? MailQuestion : Users
    return (
      <div data-testid="client-link-banner" data-status={link.status} data-variant="inline" className="mt-3 flex flex-col gap-2 border-t border-brand-100 pt-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
        <p className="m-0 flex min-w-0 items-start gap-2.5 text-sm text-ink-soft">
          <Icon aria-hidden="true" className={link.clientHasMembers ? 'mt-0.5 size-4 shrink-0 text-muted' : 'mt-0.5 size-4 shrink-0 text-info'} />
          <span>
            {link.clientHasMembers ? (
              <>
                <span className="font-medium text-ink">Waiting for {link.clientName} to accept this project.</span> Until they do, they cannot see it and you cannot send materials for approval. {link.requestedText}.
              </>
            ) : (
              <>
                <span className="font-medium text-ink">
                  Nobody from {link.clientName} uses {PRODUCT_NAME} yet.
                </span>{' '}
                Invite a contact there to join and accept the project. You can still shortlist materials.
              </>
            )}
          </span>
        </p>
        <Button size="sm" variant="ghost" onClick={() => open('another')} data-testid="link-change-client" className="shrink-0 self-start max-md:ml-4 md:self-auto">
          Change client
        </Button>
        {link.clientHasMembers ? null : (
          <div className="md:basis-full max-md:ml-6">
            <ClientInvite projectId={projectId} link={link} compact />
          </div>
        )}
        {dialog}
      </div>
    )
  }
  const buttons = (
    <div className="flex flex-wrap gap-2">
        {declined ? (
          <>
            <Button size="sm" variant="primary" onClick={() => open('ask_again')} data-testid="link-ask-again">
              Ask again
            </Button>
            <Button size="sm" onClick={() => open('another')} data-testid="link-choose-another">
              Choose another client
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={() => open('another')} data-testid="link-change-client">
            Change client
          </Button>
        )}
      </div>
  )
  return (
    <div data-testid="client-link-banner" data-status={link.status}>
      <Callout
        tone={declined ? 'warning' : 'info'}
        icon={declined ? UserRoundX : link.clientHasMembers ? MailQuestion : Users}
        title={declined ? `${link.clientName} declined this project` : link.clientHasMembers ? `Waiting for ${link.clientName} to accept this project` : `Nobody from ${link.clientName} uses ${PRODUCT_NAME} yet`}
      >
        {declined ? (
          <p className="m-0">
            {link.decidedText ? `${link.decidedText}. ` : ''}
            {link.note ? `Their note: ${link.note}` : 'Ask them again, or choose another client. Until a client accepts, nothing can be sent for approval.'}
          </p>
        ) : link.clientHasMembers ? (
          <p className="m-0">Until they do, they cannot see it and you cannot send materials for approval. {link.requestedText}.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="m-0">Invite a contact at {link.clientName} to join {PRODUCT_NAME} and accept the project. You can still shortlist materials. Sending for approval opens once the client accepts.</p>
            <ClientInvite projectId={projectId} link={link} />
          </div>
        )}
        <div className="mt-3">{buttons}</div>
      </Callout>
      {dialog}
    </div>
  )
}

/** Ask the same client again, or another one (one of the practice's clients or a new name), with a message. */
export function ChangeClientDialog({ projectId, mode, onClose }: { projectId: string; mode: ChangeClientMode | null; onClose: () => void }) {
  const options = useView(changeClientOptions, projectId)
  if (!options) return null
  return (
    <Dialog
      open={mode !== null}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={mode === 'ask_again' ? `Ask ${options.current.name} again` : 'Change client'}
      description="The client organisation must accept before the project appears in their workspace."
      testId="change-client-dialog"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="change-client-form" variant="primary" icon={Send} data-testid="change-client-send">
            Send request
          </Button>
        </>
      }
    >
      {mode ? <ChangeClientForm key={mode} projectId={projectId} mode={mode} onDone={onClose} /> : null}
    </Dialog>
  )
}

function ChangeClientForm({ projectId, mode, onDone }: { projectId: string; mode: ChangeClientMode; onDone: () => void }) {
  const options = useView(changeClientOptions, projectId)
  const [choice, setChoice] = useState<string>(() => (options ? ((mode === 'ask_again' ? options.defaults.ask_again : options.defaults.another) ?? NEW_CLIENT) : NEW_CLIENT))
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!options) return null
  const isNew = choice === NEW_CLIENT
  return (
    <form
      id="change-client-form"
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (isNew && !name.trim()) {
          setError('Enter the client.')
          return
        }
        const r = act.requestClientLink(projectId, isNew ? { name } : { orgId: choice }, message, isNew ? email : undefined)
        if (!r.ok) {
          setError(r.error ?? 'The request could not be sent.')
          return
        }
        const sentTo = isNew ? name.trim() : (options.options.find((o) => o.value === choice)?.label ?? options.current.name)
        onDone()
        toast.success(`Request sent to ${sentTo}`, { action: { label: 'Undo', onClick: r.undo } })
      }}
    >
      {options.options.length > 0 ? (
        <Field label="Client">
          <Select value={choice} onChange={(e) => setChoice(e.target.value)} options={[...options.options, { value: NEW_CLIENT, label: 'A new client' }]} data-testid="change-client-select" />
        </Field>
      ) : null}
      {isNew ? (
        <Field label={options.options.length > 0 ? 'New client name' : 'Client'} error={error ?? undefined}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client organisation" autoFocus data-testid="change-client-name" />
        </Field>
      ) : null}
      {isNew ? (
        <Field label="Client contact email" optional hint={`If nobody there uses ${PRODUCT_NAME} yet, they are invited to join and accept.`}>
          <Input type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" data-testid="change-client-email" />
        </Field>
      ) : error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      <Field label="Message to the client" optional>
        <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you are adding them, and what you will send for approval" data-testid="change-client-message" />
      </Field>
    </form>
  )
}
