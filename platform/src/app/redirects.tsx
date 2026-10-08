// Small redirects inside the app.
import { Navigate, useParams } from 'react-router'

/** /app/engagements/:id opens the engagement's only page, its waste report. */
export function EngagementIndex() {
  const { engagementId } = useParams()
  return <Navigate to={`/app/engagements/${engagementId}/waste`} replace />
}
