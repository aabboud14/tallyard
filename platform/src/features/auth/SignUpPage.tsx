// Create an account and its organisation, then go home. A new organisation starts empty; its home page runs the
// short onboarding for its type (an architect creates a first project). A person invited to answer a project request
// for a client joins that client organisation instead, and finds the request on their home. This open page never
// names the organisation or the project: only the invite link does.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getData, signUp } from '../../store'
import { hasClientInvite } from '../../store/actions/clientInvite'
import { toast } from '../../ui'
import { AuthLayout } from './AuthLayout'
import { SignUpForm } from './SignUpForm'
import type { SignUpValues } from './constants'

export function SignUpPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(v: SignUpValues) {
    setPending(true)
    setError(null)
    const r = await signUp({ name: v.name, email: v.email, password: v.password, orgName: v.orgName, orgType: v.orgType })
    setPending(false)
    if (r.error) {
      setError(r.error)
      return
    }
    navigate('/app/home?welcome=1', { replace: true })
    if (v.orgName) toast.success(`Welcome to ${v.orgName}`, { description: 'Your workspace is ready.' })
    else toast.success('You have joined the organisation that invited you', { description: 'The request to accept the project waits on your home.' })
  }

  return (
    <AuthLayout>
      <div data-testid="signup-page">
        <SignUpForm onSubmit={submit} error={error} pending={pending} invitedTo={(email) => hasClientInvite(getData(), email)} />
      </div>
    </AuthLayout>
  )
}
