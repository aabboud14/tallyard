// Create an account in two steps: you, then your organisation and its type. Presentational: the caller
// creates the account and passes back an error.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Building2, Mail, User } from 'lucide-react'
import { Button, Callout, cx, Field, Input, RadioCards } from '../../ui'
import { AuthHeading } from './AuthLayout'
import { PasswordInput } from './SignInForm'
import { EMAIL_PATTERN, MIN_PASSWORD, ORG_TYPES, type OrgType, type SignUpValues } from './constants'

export type { OrgType, SignUpValues } from './constants'

export type SignUpFormProps = {
  onSubmit: (values: SignUpValues) => void | Promise<void>
  error?: string | null
  pending?: boolean
  signInHref?: string
}

type Errors = Partial<Record<'name' | 'email' | 'password' | 'orgName', string>>

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="mb-6 flex items-center gap-3" aria-label={`Step ${step} of 2`} role="group">
      <span className="text-sm font-medium text-muted">Step {step} of 2</span>
      <span className="flex flex-1 gap-1.5" aria-hidden="true">
        <span className="h-1 flex-1 rounded-full bg-brand-600" />
        <span className={cx('h-1 flex-1 rounded-full transition-colors', step === 2 ? 'bg-brand-600' : 'bg-line')} />
      </span>
    </div>
  )
}

export function SignUpForm({ onSubmit, error, pending = false, signInHref = '/signin' }: SignUpFormProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<OrgType>('architect')
  const [errors, setErrors] = useState<Errors>({})

  function next(e: FormEvent) {
    e.preventDefault()
    const err: Errors = {}
    if (!name.trim()) err.name = 'Enter your name.'
    if (!email.trim()) err.email = 'Enter your work email.'
    else if (!EMAIL_PATTERN.test(email.trim())) err.email = 'Enter an email address like name@company.example.'
    if (password.length < MIN_PASSWORD) err.password = `Use at least ${MIN_PASSWORD} characters.`
    setErrors(err)
    if (Object.keys(err).length === 0) setStep(2)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) {
      setErrors({ orgName: 'Enter the name of your organisation.' })
      return
    }
    setErrors({})
    void onSubmit({ name: name.trim(), email: email.trim(), password, orgName: orgName.trim(), orgType })
  }

  const signIn = (
    <>
      Already have an account?{' '}
      <Link to={signInHref} className="font-medium text-brand-700 underline-offset-4 hover:underline">
        Sign in
      </Link>
    </>
  )

  if (step === 1) {
    return (
      <div>
        <AuthHeading title="Create your account" text={signIn} />
        <Steps step={1} />
        <form noValidate onSubmit={next} className="flex flex-col gap-5" aria-label="Your details" data-testid="signup-step-1">
          <Field label="Full name" error={errors.name}>
            <Input icon={User} inputSize="lg" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" data-testid="signup-name" />
          </Field>
          <Field label="Work email" error={errors.email}>
            <Input type="email" icon={Mail} inputSize="lg" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" data-testid="signup-email" />
          </Field>
          <Field label="Password" hint={errors.password ? undefined : `At least ${MIN_PASSWORD} characters.`} error={errors.password}>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <Button type="submit" variant="primary" size="lg" block data-testid="signup-continue">
            Continue
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <AuthHeading title="Your organisation" text="Its type sets up your workspace. You can invite your team next." />
      <Steps step={2} />
      <form noValidate onSubmit={submit} className="flex flex-col gap-5" aria-label="Your organisation" data-testid="signup-step-2">
        {error ? (
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        ) : null}
        <Field label="Organisation name" error={errors.orgName}>
          <Input icon={Building2} inputSize="lg" autoComplete="organization" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Your practice or company" data-testid="signup-org" />
        </Field>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-medium text-ink">Organisation type</legend>
          <RadioCards aria-label="Organisation type" value={orgType} onValueChange={(v) => setOrgType(v as OrgType)} options={ORG_TYPES} />
        </fieldset>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button size="lg" icon={ArrowLeft} onClick={() => setStep(1)} className="sm:w-auto" block>
            Back
          </Button>
          <Button type="submit" variant="primary" size="lg" block loading={pending} data-testid="signup-submit" className="sm:flex-1">
            Create account
          </Button>
        </div>
      </form>
    </div>
  )
}
