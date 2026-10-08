// One route, two screens: the architect sees the version 2 panel, the client the working matcher (brief/09-V1-PRODUCT.md section 4).
import { useStore } from '../../store/store'
import { useProjectParam, NotAvailable } from '../../app/params'
import { roleFor } from '../../app/nav'
import { MatchV2 } from '../architect/MatchV2'
import { Match } from '../project/Match'

export function MatchRoute() {
  const { allowed } = useProjectParam()
  const role = useStore((s) => roleFor(s.world, s.personaId))
  if (!allowed) return <NotAvailable />
  if (role === 'architect') return <MatchV2 />
  if (role === 'client') return <Match />
  return <NotAvailable />
}
