// Sign in: email and password, or one click on a sample account. Lands where the person was going, else home.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { getData, sampleAccounts, signIn } from '../../store'
import { signInUpgradeHint, UPGRADE_SIGN_IN_HINT, wasUpgraded } from '../../store/upgrade'
import { SAMPLE_PASSWORD } from '../../sandbox/accounts'
import { safeNext } from '../../app/next'
import type { AvatarColourName } from '../../ui'
import { AuthLayout } from './AuthLayout'
import { SignInForm, type SignInValues } from './SignInForm'
import { SampleAccounts, type SampleAccount } from './SampleAccounts'

export function SignInPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [error, setError] = useState<string | null>(null)
  const [upgradeHint, setUpgradeHint] = useState(false)
  const [pending, setPending] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const accounts: SampleAccount[] = useMemo(() => sampleAccounts().map((a) => ({ email: a.email, name: a.name, orgName: a.orgName, roleLabel: a.roleLabel, colour: a.colour as AvatarColourName })), [])

  async function submit(v: SignInValues) {
    setPending(true)
    setError(null)
    setUpgradeHint(false)
    const r = await signIn(v.email, v.password, v.remember)
    setPending(false)
    if (r.error) {
      setError(r.error)
      // An account made in the sandbox before it was upgraded is gone: say so, rather than only "do not match".
      setUpgradeHint(signInUpgradeHint(getData(), v.email, wasUpgraded()))
    } else navigate(next, { replace: true })
  }

  async function quick(email: string) {
    setPendingEmail(email)
    setError(null)
    setUpgradeHint(false)
    const r = await signIn(email, SAMPLE_PASSWORD, true)
    setPendingEmail(null)
    if (r.error) setError(r.error)
    else navigate(next, { replace: true })
  }

  return (
    <AuthLayout footer={false}>
      <div data-testid="signin-page">
        <SignInForm
          onSubmit={submit}
          error={error}
          errorHint={
            upgradeHint ? (
              <>
                <p className="m-0">{UPGRADE_SIGN_IN_HINT}</p>
                <Link to="/signup" className="mt-1 inline-flex rounded-sm text-sm font-medium text-brand-700 underline-offset-4 hover:underline max-sm:-mx-2 max-sm:min-h-11 max-sm:items-center max-sm:px-2" data-testid="signin-upgrade-signup">
                  Create your account again
                </Link>
              </>
            ) : null
          }
          pending={pending}
        />
        <div className="mt-9">
          <SampleAccounts accounts={accounts} onSignIn={(email) => void quick(email)} pendingEmail={pendingEmail} />
        </div>
      </div>
    </AuthLayout>
  )
}
