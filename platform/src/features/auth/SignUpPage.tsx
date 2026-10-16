// Create an account and its organisation, then go home. A new organisation starts empty; its home page runs the
// short onboarding for its type (an architect creates a first project). A person invited to answer a project request
// for a client joins that client organisation instead, and finds the request on their home.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getData, signUp } from '../../store'
import { clientInviteForEmail } from '../../store/actions/clientInvite'
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
    toast.success(`Welcome to ${v.orgName}`, { description: 'Your workspace is ready.' })
  }

  return (
    <AuthLayout>
      <div data-testid="signup-page">
        <SignUpForm onSubmit={submit} error={error} pending={pending} invitedTo={(email) => clientInviteForEmail(getData(), email)} />
      </div>
    </AuthLayout>
  )
}
