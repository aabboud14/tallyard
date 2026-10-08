// Reset a password. In the sandbox the reset happens on this page (the form says so) and signs the person in.
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { requestPasswordReset, resetPassword } from '../../store'
import { toast } from '../../ui'
import { AuthLayout } from './AuthLayout'
import { ForgotPasswordForm, type ResetValues } from './ForgotPasswordForm'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(v: ResetValues) {
    setError(null)
    const found = requestPasswordReset(v.email)
    if (found.error) {
      setError(found.error)
      return
    }
    setPending(true)
    const r = await resetPassword(v.email, v.password)
    setPending(false)
    if (r.error) {
      setError(r.error)
      return
    }
    navigate('/app/home', { replace: true })
    toast.success('Password updated', { description: 'You are signed in with your new password.' })
  }

  return (
    <AuthLayout>
      <div data-testid="forgot-password-page">
        <ForgotPasswordForm onSubmit={submit} error={error} pending={pending} />
      </div>
    </AuthLayout>
  )
}
