// Accept an invite: sign up straight into the inviting organisation. Presentational.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Link2Off, Mail, User } from 'lucide-react'
import { PRODUCT_NAME } from '../../domain/constants'
import { Avatar, Badge, Button, Callout, EmptyState, Field, Input } from '../../ui'
import { PasswordInput } from './SignInForm'
import { MIN_PASSWORD } from './constants'

export type InviteDetails = {
  orgName: string
  /** For example "Architecture practice". */
  orgTypeLabel: string
  invitedBy: string
  email: string
}

export type InviteValues = { name: string; password: string }

export type InviteFormProps = {
  /** Null when the link is not valid or has been used. */
  invite: InviteDetails | null
  onSubmit: (values: InviteValues) => void | Promise<void>
  error?: string | null
  pending?: boolean
  signInHref?: string
}

export function InviteForm({ invite, onSubmit, error, pending = false, signInHref = '/signin' }: InviteFormProps) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({})

  if (!invite) {
    return (
      <div data-testid="invite-invalid">
        <EmptyState
          variant="card"
          className="px-0"
          icon={Link2Off}
          title="This invite link is not valid"
          text="It may have been used already or withdrawn. Ask the person who invited you for a new link."
          action={
            <Button asChild variant="primary">
              <Link to={signInHref}>Go to sign in</Link>
            </Button>
          }
        />
      </div>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!name.trim()) err.name = 'Enter your name.'
    if (password.length < MIN_PASSWORD) err.password = `Use at least ${MIN_PASSWORD} characters.`
    setErrors(err)
    if (Object.keys(err).length > 0) return
    void onSubmit({ name: name.trim(), password })
  }

  return (
    <div data-testid="invite-form">
      <div className="mb-8 flex flex-col items-start">
        <Avatar name={invite.orgName} shape="square" size="xl" decorative />
        <h1 className="m-0 mt-5 text-2xl font-semibold text-ink sm:text-[26px] sm:leading-8">Join {invite.orgName}</h1>
        <p className="m-0 mt-2 text-md text-muted">
          {invite.invitedBy} invited you to join {invite.orgName} on {PRODUCT_NAME}.
        </p>
        <Badge tone="outline" className="mt-3">
          {invite.orgTypeLabel}
        </Badge>
      </div>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label={`Join ${invite.orgName}`}>
        {error ? (
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        ) : null}
        <Field label="Email">
          <Input type="email" icon={Mail} inputSize="lg" value={invite.email} readOnly />
        </Field>
        <Field label="Full name" error={errors.name}>
          <Input icon={User} inputSize="lg" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="Password" hint={errors.password ? undefined : `At least ${MIN_PASSWORD} characters.`} error={errors.password}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={pending}>
          Join {invite.orgName}
        </Button>
        <p className="m-0 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to={signInHref} className="font-medium text-brand-700 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
