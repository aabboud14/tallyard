// Reset a password. In the sandbox the reset happens on this page, and the page says so.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CircleCheck, Mail } from 'lucide-react'
import { Button, Callout, Field, Input } from '../../ui'
import { AuthHeading } from './AuthLayout'
import { PasswordInput } from './SignInForm'
import { EMAIL_PATTERN, MIN_PASSWORD } from './constants'

export type ResetValues = { email: string; password: string }

export type ForgotPasswordFormProps = {
  onSubmit: (values: ResetValues) => void | Promise<void>
  error?: string | null
  pending?: boolean
  /** True once the caller has reset the password. */
  done?: boolean
  signInHref?: string
}

export function ForgotPasswordForm({ onSubmit, error, pending = false, done = false, signInHref = '/signin' }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({})

  if (done) {
    return (
      <div data-testid="reset-done">
        <div className="mb-6 inline-flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <CircleCheck aria-hidden="true" className="size-5" />
        </div>
        <AuthHeading title="Password updated" text="You can now sign in with your new password." />
        <Button asChild variant="primary" size="lg" block>
          <Link to={signInHref}>Sign in</Link>
        </Button>
      </div>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!email.trim()) err.email = 'Enter your email address.'
    else if (!EMAIL_PATTERN.test(email.trim())) err.email = 'Enter an email address like name@company.example.'
    if (password.length < MIN_PASSWORD) err.password = `Use at least ${MIN_PASSWORD} characters.`
    if (!err.password && confirm !== password) err.confirm = 'The two passwords do not match.'
    setErrors(err)
    if (Object.keys(err).length > 0) return
    void onSubmit({ email: email.trim(), password })
  }

  return (
    <div>
      <Link to={signInHref} className="mb-8 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-muted transition-colors hover:text-ink max-sm:mb-5 max-sm:min-h-11">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
      <AuthHeading title="Reset your password" text="Choose a new password for your account." />
      <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label="Reset password" data-testid="reset-form">
        <Callout tone="info">In the sandbox you reset your password on this page. A live service would email you a link instead.</Callout>
        {error ? (
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        ) : null}
        <Field label="Email" error={errors.email}>
          <Input type="email" icon={Mail} inputSize="lg" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" />
        </Field>
        <Field label="New password" hint={errors.password ? undefined : `At least ${MIN_PASSWORD} characters.`} error={errors.password}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" block loading={pending}>
          Reset password
        </Button>
      </form>
    </div>
  )
}
