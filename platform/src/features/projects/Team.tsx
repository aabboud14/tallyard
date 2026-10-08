// Who works on the project: the client, the architect practice and the sustainability consultant, with their
// people. The architect sets the consultancy; anyone can invite a colleague into their own organisation.
import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Check, Copy, Mail, UserPlus } from 'lucide-react'
import { act, useView } from '../../store'
import { projectTeam, type TeamSection } from '../../store/selectors/project'
import { Avatar, Badge, Button, Card, CardHeader, Dialog, Field, Input, Select, toast, type AvatarColourName } from '../../ui'
import { ProjectPage } from './ProjectParts'

function InviteDialog({ orgName }: { orgName: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const reset = () => {
    setEmail('')
    setLink(null)
    setError(null)
    setCopied(false)
  }
  const create = () => {
    const r = act.createInvite(email)
    if (!r.ok || !r.value) {
      setError(r.error ?? 'The invite could not be created.')
      return
    }
    setError(null)
    setLink(`${window.location.origin}/invite/${r.value}`)
    toast.success(`Invite created for ${email.trim()}`)
  }
  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      toast.error('Copy the link from the field instead.')
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
      trigger={
        <Button size="sm" icon={UserPlus} data-testid="invite-colleague">
          Invite
        </Button>
      }
      title={`Invite a colleague to ${orgName}`}
      description="They join your organisation and see the projects you work on."
      testId="invite-dialog"
      footer={
        link ? (
          <Button variant="primary" onClick={() => setOpen(false)}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={Mail} onClick={create} data-testid="create-invite">
              Create invite
            </Button>
          </>
        )
      }
    >
      {link ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-ink-soft">In the sandbox no email is sent. Share this link with {email.trim()}:</p>
          <div className="flex gap-2">
            <Input readOnly value={link} className="flex-1" aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} data-testid="invite-link" />
            <Button icon={copied ? Check : Copy} onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      ) : (
        <Field label="Work email" error={error ?? undefined}>
          <Input type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" autoFocus />
        </Field>
      )}
    </Dialog>
  )
}

function SectionCard({ s, action }: { s: TeamSection; action?: ReactNode }) {
  return (
    <Card data-testid={`team-${s.orgId}`}>
      <CardHeader
        title={
          <span className="flex items-center gap-2.5">
            <Avatar name={s.orgName} shape="square" size="sm" decorative />
            {s.orgName}
          </span>
        }
        description={`${s.roleLabel} · ${s.orgTypeLabel}`}
        actions={
          <>
            {s.yours ? <Badge tone="brand">Your organisation</Badge> : null}
            {action}
          </>
        }
      />
      {s.members.length === 0 ? (
        <p className="m-0 px-5 py-5 text-sm text-muted">No one from {s.orgName} has joined the platform yet.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-line-soft p-0">
          {s.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar name={m.name} colour={m.colour as AvatarColourName} size="md" decorative />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-medium text-ink">
                  {m.name}
                  {m.you ? <span className="ml-1.5 text-sm font-normal text-muted">(you)</span> : null}
                </p>
                <p className="m-0 truncate text-sm text-muted">{m.title}</p>
              </div>
              <a href={`mailto:${m.email}`} className="hidden truncate text-sm text-ink-soft hover:text-ink hover:underline sm:block">
                {m.email}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function Team() {
  const { projectId = '' } = useParams()
  const view = useView(projectTeam, projectId)
  if (!view) return null
  const consultant = view.sections.find((s) => s.roleLabel === 'Sustainability consultant')
  return (
    <ProjectPage testId="project-team">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          {view.sections.map((s) => (
            <SectionCard key={s.orgId} s={s} action={s.yours ? <InviteDialog orgName={s.orgName} /> : undefined} />
          ))}
        </div>
        {view.canSetConsultant ? (
          <Card className="self-start">
            <CardHeader title="Sustainability consultant" description="They read the shortlist for carbon and run the compliance outputs." />
            <div className="px-4 py-4 sm:px-5">
              <Field label="Consultancy">
                <Select
                  value={consultant?.orgId ?? ''}
                  placeholder="None"
                  options={view.consultantOptions.map((o) => ({ value: o.orgId, label: o.name }))}
                  onChange={(e) => {
                    const id = e.target.value || null
                    const r = act.setProjectConsultant(projectId, id)
                    if (!r.ok) toast.error(r.error ?? 'That could not be changed.')
                    else toast.success(id ? 'Consultant added' : 'Consultant removed', { action: { label: 'Undo', onClick: r.undo } })
                  }}
                  data-testid="consultant-select"
                />
              </Field>
            </div>
          </Card>
        ) : null}
      </div>
    </ProjectPage>
  )
}
