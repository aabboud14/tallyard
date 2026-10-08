// Settings: profile, organisation, team and invites, notification preferences, and the sandbox.
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Bell, Building, Copy, FlaskConical, Link2, Mail, RotateCcw, Send, User, Users, X } from 'lucide-react'
import { act, selectors, switchAccount, useApp, useSession, useView, type AvatarColour, type NotificationKind } from '../../store'
import { Avatar, Badge, Button, Card, CardBody, CardFooter, CardHeader, cx, Dialog, EmptyState, Field, Input, Kbd, Switch, Textarea, toast, Tooltip, AVATAR_COLOUR_NAMES } from '../../ui'
import { Page } from '../../app/Page'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organisation', label: 'Organisation', icon: Building },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'sandbox', label: 'Sandbox', icon: FlaskConical },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export function Settings() {
  const { section = 'profile' } = useParams()
  const current = (SECTIONS.find((s) => s.id === section)?.id ?? 'profile') as SectionId
  return (
    <Page testId="settings">
      <h1 className="m-0 text-2xl font-semibold text-ink">Settings</h1>
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:gap-10">
        <nav aria-label="Settings" className="-mx-4 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:w-52 lg:shrink-0 lg:overflow-visible lg:px-0">
          <ul className="m-0 flex w-max list-none gap-1 p-0 lg:w-auto lg:flex-col">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const active = s.id === current
              return (
                <li key={s.id}>
                  <Link
                    to={`/app/settings/${s.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={cx('flex h-9 items-center gap-2.5 whitespace-nowrap rounded-md px-3 text-base transition-colors max-lg:h-11', active ? 'bg-subtle font-medium text-ink ring-1 ring-inset ring-line-soft' : 'text-ink-soft hover:bg-hover hover:text-ink')}
                    data-testid={`settings-${s.id}`}
                  >
                    <Icon aria-hidden="true" className={cx('size-4', active ? 'text-ink' : 'text-faint')} />
                    {s.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="min-w-0 max-w-2xl flex-1">
          {current === 'profile' ? <Profile /> : current === 'organisation' ? <Organisation /> : current === 'team' ? <Team /> : current === 'notifications' ? <NotificationPrefs /> : <Sandbox />}
        </div>
      </div>
    </Page>
  )
}

function SectionHead({ title, text }: { title: string; text: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="m-0 text-xl font-semibold text-ink">{title}</h2>
      <p className="m-0 mt-1 text-base text-muted">{text}</p>
    </div>
  )
}

function Profile() {
  const p = useView(selectors.profileView)
  if (!p) return null
  return <ProfileForm key={`${p.name}${p.title}${p.email}${p.avatarColour}`} p={p} />
}

function ProfileForm({ p }: { p: NonNullable<ReturnType<typeof selectors.profileView>> }) {
  const [name, setName] = useState(p.name)
  const [title, setTitle] = useState(p.title)
  const [email, setEmail] = useState(p.email)
  const [colour, setColour] = useState<AvatarColour>(p.avatarColour)
  const [error, setError] = useState<string | null>(null)
  const dirty = name !== p.name || title !== p.title || email !== p.email || colour !== p.avatarColour
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = act.updateProfile({ name, title, email, avatarColour: colour })
    if (!r.ok) return setError(r.error)
    setError(null)
    toast.success('Profile saved', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <form onSubmit={save} noValidate data-testid="profile-form">
      <SectionHead title="Profile" text="How you appear to your team and on the projects you work on." />
      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={name || p.name} colour={colour} size="xl" />
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 text-sm font-medium text-ink">Avatar colour</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar colour">
                {AVATAR_COLOUR_NAMES.map((c) => (
                  <Tooltip key={c} content={c.charAt(0).toUpperCase() + c.slice(1)}>
                    <button type="button" role="radio" aria-checked={colour === c} aria-label={c} onClick={() => setColour(c)} className={cx('rounded-full p-0.5 ring-2 transition-shadow max-sm:p-1.5', colour === c ? 'ring-brand-600' : 'ring-transparent hover:ring-line-strong')}>
                      <Avatar name="" colour={c} size="sm" decorative />
                    </button>
                  </Tooltip>
                ))}
              </div>
            </fieldset>
          </div>
          {error ? (
            <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-testid="profile-name" />
            </Field>
            <Field label="Job title" optional>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="organization-title" />
            </Field>
            <Field label="Email" required className="sm:col-span-2" hint={p.sample ? 'A sample account. Use the reserved example domain.' : 'You sign in with this address.'}>
              <Input type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
          </div>
        </CardBody>
        <CardFooter>
          <Button type="button" variant="ghost" disabled={!dirty} onClick={() => (setName(p.name), setTitle(p.title), setEmail(p.email), setColour(p.avatarColour), setError(null))}>
            Discard
          </Button>
          <Button type="submit" variant="primary" disabled={!dirty} data-testid="profile-save">
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function Organisation() {
  const o = useView(selectors.organisationView)
  if (!o) return null
  return <OrganisationForm key={`${o.name}${o.address}`} o={o} />
}

function OrganisationForm({ o }: { o: NonNullable<ReturnType<typeof selectors.organisationView>> }) {
  const [name, setName] = useState(o.name)
  const [address, setAddress] = useState(o.address)
  const [error, setError] = useState<string | null>(null)
  const dirty = name !== o.name || address !== o.address
  const save = (e: FormEvent) => {
    e.preventDefault()
    const r = act.updateOrganisation({ name, address })
    if (!r.ok) return setError(r.error)
    setError(null)
    toast.success('Organisation saved', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <form onSubmit={save} noValidate data-testid="organisation-form">
      <SectionHead title="Organisation" text={`${o.memberCount} ${o.memberCount === 1 ? 'member' : 'members'}. Everyone in the organisation shares its projects or buildings.`} />
      <Card>
        <CardBody className="flex flex-col gap-4">
          {error ? (
            <p role="alert" className="m-0 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Avatar name={name || o.name} shape="square" size="lg" />
            <div>
              <p className="m-0 text-base font-medium text-ink">{o.typeLabel}</p>
              <p className="m-0 text-sm text-muted">The type sets your workspace: {o.roleLabel.toLowerCase()}. It cannot be changed.</p>
            </div>
          </div>
          <Field label="Organisation name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="organization" />
          </Field>
          <Field label="Address" optional>
            <Textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, town, postcode" />
          </Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" variant="primary" disabled={!dirty}>
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

function Team() {
  const t = useView(selectors.teamView)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (!t) return null
  const invite = (e: FormEvent) => {
    e.preventDefault()
    const r = act.createInvite(email)
    if (!r.ok || !r.value) return setError(r.error)
    setError(null)
    setEmail('')
    void copy(`/invite/${r.value}`, 'Invite created. Link copied.')
  }
  return (
    <div data-testid="team">
      <SectionHead title="Team" text={`People at ${t.orgName}. Invite colleagues with a link: in the sandbox no email is sent.`} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Invite a colleague" />
          <CardBody>
            <form onSubmit={invite} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <Field label="Email address" className="flex-1" error={error ?? undefined}>
                <Input type="email" icon={Mail} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" data-testid="invite-email" />
              </Field>
              <Button type="submit" variant="primary" icon={Send} className="sm:mt-[26px]" data-testid="invite-send">
                Create invite
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Members" description={`${t.members.length} ${t.members.length === 1 ? 'person' : 'people'}`} />
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {t.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={m.name} colour={m.colour as AvatarColour} size="md" decorative />
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex items-center gap-2 text-base font-medium text-ink">
                    {m.name}
                    {m.you ? <Badge tone="outline">You</Badge> : null}
                  </p>
                  <p className="m-0 truncate text-sm text-muted">
                    {m.title ? `${m.title} · ` : ''}
                    {m.email}
                  </p>
                </div>
                <span className="hidden shrink-0 text-sm text-muted sm:block">Joined {m.joined}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Pending invites" />
          {t.invites.length === 0 ? (
            <p className="m-0 px-4 py-5 text-sm text-muted sm:px-5">No invites waiting. Anyone you invite appears here until they join.</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-line-soft p-0">
              {t.invites.map((i) => (
                <li key={i.token} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5" data-testid={`invite-${i.email}`}>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-base font-medium text-ink">{i.email}</p>
                    <p className="m-0 flex items-center gap-1.5 truncate text-sm text-muted">
                      <Link2 aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="truncate">{i.path}</span>
                      <span className="shrink-0">· {i.sentAgo} by {i.invitedBy}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" icon={Copy} onClick={() => void copy(i.path, 'Invite link copied')}>
                      Copy link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={X}
                      onClick={() => {
                        const r = act.revokeInvite(i.token)
                        if (r.ok) toast.success('Invite revoked', { action: { label: 'Undo', onClick: r.undo } })
                      }}
                    >
                      Revoke
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

async function copy(path: string, message: string) {
  const url = `${window.location.origin}${path}`
  try {
    await navigator.clipboard.writeText(url)
    toast.success(message, { description: url })
  } catch {
    toast({ title: 'Copy this link', description: url, tone: 'info', duration: 12000 })
  }
}

function NotificationPrefs() {
  const prefs = useView(selectors.notificationSettings)
  if (!prefs) return null
  const set = (kind: NotificationKind, on: boolean) => {
    const r = act.setNotificationPref(kind, on)
    if (r.ok) toast.success(on ? 'Turned on' : 'Turned off', { action: { label: 'Undo', onClick: r.undo } })
  }
  return (
    <div data-testid="notification-prefs">
      <SectionHead title="Notifications" text="Which events reach your inbox and the bell. Notifications stay in the app; nothing is emailed." />
      <Card>
        {prefs.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing to set" text="Your workspace has no notifications to choose from." />
        ) : (
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {prefs.map((p) => (
              <li key={p.kind} className="px-4 py-3.5 sm:px-5">
                <Switch label={p.label} description={p.description} checked={p.on} onCheckedChange={(on) => set(p.kind, on)} data-testid={`pref-${p.kind}`} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Sandbox() {
  const s = useView(selectors.sandboxView)
  const resetSandbox = useApp((x) => x.resetSandbox)
  const { user } = useSession()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!s) return null
  const reset = async () => {
    setBusy(true)
    await resetSandbox()
    setBusy(false)
    setConfirming(false)
    toast.success('Sandbox reset', { description: 'Every sample record is back as it started.' })
    navigate('/app/home')
  }
  const switchTo = (userId: string, name: string) => {
    const r = switchAccount(userId)
    if (r.error) return toast.error(r.error)
    toast.success(`Signed in as ${name}`)
    navigate('/app/home')
  }
  return (
    <div data-testid="sandbox">
      <SectionHead title="Sandbox" text="Everything here is sample data that stays in this browser. Nothing is sent anywhere." />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Sample accounts" description={<>Every sample account uses the password <Kbd className="mx-0.5 font-mono">{s.password}</Kbd>. Switch to follow a material from one side to the other.</>} />
          <ul className="m-0 list-none divide-y divide-line-soft p-0">
            {s.accounts.map((a) => (
              <li key={a.userId} className="flex items-center gap-3 px-4 py-3 sm:px-5" data-testid={`account-${a.userId}`}>
                <Avatar name={a.name} colour={a.colour as AvatarColour} size="md" decorative />
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-base font-medium text-ink">
                    {a.name}
                    <span className="text-sm font-normal text-muted">
                      {a.roleLabel}, {a.orgName}
                    </span>
                  </p>
                  <p className="m-0 truncate text-sm text-muted">{a.email}</p>
                </div>
                {a.current ? (
                  <Badge tone="brand">Signed in</Badge>
                ) : (
                  <Button size="sm" onClick={() => switchTo(a.userId, a.name)} disabled={!a.exists}>
                    Switch
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-danger-line">
          <CardHeader title="Reset the sandbox" icon={RotateCcw} />
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-base text-ink-soft">
              Started on {s.seededText}. Resetting puts every sample record and photo back as it was{user && !user.sample ? ' and removes the accounts you created' : ''}.
            </p>
            <Button variant="danger" icon={RotateCcw} onClick={() => setConfirming(true)} data-testid="reset-sandbox">
              Reset
            </Button>
          </CardBody>
        </Card>
      </div>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Reset the sandbox?"
        description="All changes made in this browser are lost: captures, listings, decisions, reservations and new accounts."
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={() => void reset()} data-testid="reset-confirm">
              Reset sandbox
            </Button>
          </>
        }
      />
    </div>
  )
}

export default Settings
