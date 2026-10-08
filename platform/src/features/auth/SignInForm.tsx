// Sign in with email and password. Presentational: the caller signs in and passes back an error.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { Button, Callout, Checkbox, Field, Input } from '../../ui'
import { AuthHeading } from './AuthLayout'
import { EMAIL_PATTERN } from './constants'

export type SignInValues = { email: string; password: string; remember: boolean }

export function PasswordInput({ value, onChange, autoComplete, placeholder }: { value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string }) {
  const [shown, setShown] = useState(false)
  return (
    <Input
      type={shown ? 'text' : 'password'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      placeholder={placeholder}
      inputSize="lg"
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className="inline-flex size-8 items-center justify-center rounded-md text-faint max-sm:-mr-1 max-sm:size-11 transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600"
        >
          {shown ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      }
    />
  )
}

export type SignInFormProps = {
  onSubmit: (values: SignInValues) => void | Promise<void>
  /** A message from the caller, for example wrong email or password. */
  error?: string | null
  pending?: boolean
  defaultEmail?: string
  forgotHref?: string
  signUpHref?: string
  /** Hide the heading when the page provides its own. */
  heading?: boolean
}

export function SignInForm({ onSubmit, error, pending = false, defaultEmail = '', forgotHref = '/forgot-password', signUpHref = '/signup', heading = true }: SignInFormProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Enter your email address.'
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter an email address like name@company.example.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (next.email || next.password) return
    void onSubmit({ email: email.trim(), password, remember })
  }

  return (
    <div>
      {heading ? (
        <AuthHeading
          title="Sign in"
          text={
            <>
              New here?{' '}
              <Link to={signUpHref} className="font-medium text-brand-700 underline-offset-4 hover:underline">
                Create an account
              </Link>
            </>
          }
        />
      ) : null}
      <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label="Sign in" data-testid="signin-form">
        {error ? (
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        ) : null}
        <Field label="Email" error={errors.email}>
          <Input type="email" icon={Mail} inputSize="lg" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" data-testid="signin-email" />
        </Field>
        <Field
          label="Password"
          error={errors.password}
          labelAction={
            <Link to={forgotHref} className="rounded-sm text-sm font-medium text-brand-700 underline-offset-4 hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <Checkbox label="Remember me on this device" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
        <Button type="submit" variant="primary" size="lg" block loading={pending} data-testid="signin-submit">
          Sign in
        </Button>
      </form>
    </div>
  )
}
