// The UK decision tree step for a priority row (brief/09-V1-PRODUCT.md section 5.3).
// A display rule over the priority engine's two routes; the engine itself is unchanged.
import type { FamilyId } from '../types'
import type { DecisionRoute } from '../v1types'

/** Families whose recycled material keeps its use: steel is remelted, aluminium framing reprocessed. */
const RECYCLE_KEEPS_USE: FamilyId[] = ['steel_section', 'curtain_wall']

/** recover gives reuse. recycle gives recycle for steel and curtain wall, downcycle for the others (crushed, chipped or broken for a lower use). */
export function decisionTreeRoute(family: FamilyId, route: 'recover' | 'recycle'): DecisionRoute {
  if (route === 'recover') return 'reuse'
  return RECYCLE_KEEPS_USE.includes(family) ? 'recycle' : 'downcycle'
}
