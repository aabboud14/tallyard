// View helpers for the shared screens: the landing page (brief/09-V1-PRODUCT.md sections 3.6 and 6.4).
// Pure: World in, plain values out.
import type { PublicListing, World } from '../../domain/types'
import type { Typology } from '../../domain/v1types'
import { roleOf, type Role } from '../../domain/access'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { browseListings } from '../../domain/visibility'
import { typologyOf } from '../../domain/engines/typology'
import { ROLE_COPY } from '../../app/workspaces'

/** The architect first, then the supply side, the buying side, the consultant and the operator. */
export const LANDING_ROLES: { role: Role; heading: string }[] = [
  { role: 'architect', heading: 'Architect' },
  { role: 'surveyor', heading: 'Site surveyor' },
  { role: 'seller', heading: 'Asset owner (selling)' },
  { role: 'client', heading: 'Asset owner (client)' },
  { role: 'consultant', heading: 'Sustainability consultant' },
  { role: 'operator', heading: 'Platform operator' },
]

function roleOrNull(world: World, personaId: string): Role | null {
  try {
    return roleOf(world, personaId)
  } catch {
    return null
  }
}

export type LandingPersona = { id: string; name: string; line: string }
export type LandingGroup = {
  role: Role
  heading: string
  copy: string
  personas: LandingPersona[]
}

/** The role groups on the landing page, each with the personas that hold that role. Roles with no persona are left out. */
export function landingGroups(world: World): LandingGroup[] {
  return LANDING_ROLES.map(({ role, heading }) => ({
    role,
    heading,
    copy: ROLE_COPY[role],
    personas: Object.values(world.personas)
      .filter((p) => roleOrNull(world, p.id) === role)
      .map((p) => ({
        id: p.id,
        name: p.name,
        line: `${world.orgs[p.orgId]?.name ?? ''}, ${p.role}`,
      })),
  })).filter((g) => g.personas.length > 0)
}

const SHOWCASE_ORDER: Typology[] = ['envelope', 'structure', 'finishes']

/** Up to three open listings for the architect's card, one per typology where the marketplace has one. Public fields only. */
export function landingShowcase(world: World): PublicListing[] {
  const open = browseListings(world, A)
  const picked: PublicListing[] = []
  for (const t of SHOWCASE_ORDER) {
    const l = open.find((x) => typologyOf(x.family) === t)
    if (l) picked.push(l)
  }
  for (const l of open) {
    if (picked.length >= 3) break
    if (!picked.includes(l)) picked.push(l)
  }
  return picked.slice(0, 3)
}
