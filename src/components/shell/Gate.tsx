// A route wrapper: the persona's role must be one of `roles`, and the building, project or engagement in the URL
// must pass canAccess (brief/09-V1-PRODUCT.md sections 4 and 13.13). Otherwise the screen reads "Not available to this role".
import { Outlet, useParams } from 'react-router'
import { useStore } from '../../store/store'
import { canAccess, type AccessTarget, type Role } from '../../domain/access'
import { roleFor } from '../../app/nav'
import { NotAvailable } from './NotAvailable'

type Target = 'project' | 'building' | 'engagement'

export function Gate({ roles, target }: { roles?: Role[]; target?: Target }) {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const params = useParams()
  const role = roleFor(world, personaId)
  if (roles && (!role || !roles.includes(role))) return <NotAvailable />
  if (target) {
    const id = params[target + 'Id']
    if (!id || !canAccess(world, personaId, accessTarget(target, id))) return <NotAvailable />
  }
  return <Outlet />
}

function accessTarget(target: Target, id: string): AccessTarget {
  if (target === 'project') return { projectId: id }
  if (target === 'building') return { buildingId: id }
  return { engagementId: id }
}
