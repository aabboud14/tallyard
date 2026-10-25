// /projects/:projectId has no page of its own: it opens the role's project screen, after the access check
// (architect wish list, client approvals, consultant compliance), so exactly one rail entry is active.
import { Navigate } from 'react-router'
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { projectHomeFor, roleFor } from '../../app/nav'

export function ProjectHome() {
  const { id, allowed } = useProjectParam()
  const role = useStore((s) => roleFor(s.world, s.personaId))
  const to = allowed ? projectHomeFor(role, id) : null
  if (!to) return <NotAvailable />
  return <Navigate to={to} replace />
}
