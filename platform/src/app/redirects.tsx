// Small redirects inside the app.
import { Navigate, useLocation, useParams } from 'react-router'
import { marketplacePathFor } from '../store/paths'

/** /app/engagements/:id opens the engagement's only page, its waste report. */
export function EngagementIndex() {
  const { engagementId } = useParams()
  return <Navigate to={`/app/engagements/${engagementId}/waste`} replace />
}

/** The Marketplace used to live at /app/discover: old links land on the same page, keeping the query and hash. */
export function LegacyMarketplaceRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={marketplacePathFor(pathname) + search + hash} replace />
}

/** A project tab that moved: /app/projects/:id/carbon opens Sustainability, keeping the query and the section. */
export function ProjectTabRedirect({ to }: { to: string }) {
  const { projectId } = useParams()
  const { search, hash } = useLocation()
  return <Navigate to={`/app/projects/${projectId}/${to}${search}${hash}`} replace />
}
