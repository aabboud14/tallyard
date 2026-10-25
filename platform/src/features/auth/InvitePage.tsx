// An invite link: join the inviting organisation as a new person and go straight to its workspace.
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { acceptInvite, inviteInfo, useSession } from '../../store'
import { Callout, toast } from '../../ui'
import { AuthLayout } from './AuthLayout'
import { InviteForm, type InviteValues } from './InviteForm'

export function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const info = useMemo(() => inviteInfo(token), [token])
  const invite = 'error' in info ? null : info

  async function submit(v: InviteValues) {
    if (!invite) return
    setPending(true)
    setError(null)
    const r = await acceptInvite(token, v)
    setPending(false)
    if (r.error) {
      setError(r.error)
      return
    }
    navigate('/app/home', { replace: true })
    toast.success(`Welcome to ${invite.orgName}`, { description: 'You have joined the team.' })
  }

  return (
    <AuthLayout>
      <div data-testid="invite-page">
        {user && invite ? (
          <Callout tone="info" className="mb-6">
            You are signed in as {user.name}. Joining creates a new account for {invite.email} and signs you in with it.
          </Callout>
        ) : null}
        <InviteForm invite={invite} onSubmit={submit} error={error} pending={pending} />
      </div>
    </AuthLayout>
  )
}
