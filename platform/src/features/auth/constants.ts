// Shared values for the auth forms. The rules come from the sandbox and the store, so a form never accepts what
// the account logic would refuse; this file adds only the words and icons for each organisation type.
import type { LucideIcon } from 'lucide-react'
import { Building2, Camera, ClipboardCheck, Compass, Leaf } from 'lucide-react'
import { EMAIL_PATTERN, ORG_TYPES as ACCOUNT_ORG_TYPES } from '../../sandbox/accounts'
import { MIN_PASSWORD } from '../../store/actions/auth'
import type { PlatformRole } from '../../store/types'

export { EMAIL_PATTERN, MIN_PASSWORD }

/** The organisation type decides the workspace. The values are the product's role ids. */
export type OrgType = PlatformRole

const PRESENTATION: Record<OrgType, { description: string; icon: LucideIcon }> = {
  architect: { description: 'Find, shortlist and specify reclaimed materials', icon: Compass },
  client: { description: 'Approve and reserve for your projects', icon: ClipboardCheck },
  owner: { description: 'List what your buildings hold', icon: Building2 },
  surveyor: { description: 'Capture materials on site', icon: Camera },
  consultant: { description: 'Report avoided carbon and reuse', icon: Leaf },
}

export const ORG_TYPES: { value: OrgType; label: string; description: string; icon: LucideIcon }[] = ACCOUNT_ORG_TYPES.map((t) => ({ value: t.role, label: t.label, ...PRESENTATION[t.role] }))

export type SignUpValues = { name: string; email: string; password: string; orgName: string; orgType: OrgType }
