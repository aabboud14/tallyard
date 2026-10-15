// A second Lantern Quay project for the sandbox (client-consultant design, section 8.2), so the client's programme
// across projects has more than one row. Kilnworth Place, by Tessaly Architects, which has no sample person and no
// consultant yet. Added to the reference world, so the date shift moves it; the domain seed is unchanged.
import type { World } from '../domain/types'
import { ORG_IDS, PERSONA_IDS } from '../domain/seed/world'
import { suggestedRequirementIds } from '../domain/reference/requirements'
import { projectRecord } from '../store/actions/projects'
import { listIdFor } from '../store/lots'

export const TESSALY_ORG_ID = 'org_tessaly'
export const KILNWORTH_ID = 'prj_w7kq2m'

const REGION = 'Inner London East'
const AUTHORITY = 'Tower Hamlets'

export function addClientPortfolio(world: World): World {
  const w = structuredClone(world)
  w.orgs[TESSALY_ORG_ID] = { id: TESSALY_ORG_ID, name: 'Tessaly Architects', type: 'Architect' }
  const p = projectRecord({
    id: KILNWORTH_ID,
    name: 'Kilnworth Place',
    clientOrgId: ORG_IDS.lantern,
    architectOrgId: TESSALY_ORG_ID,
    createdByPersonaId: PERSONA_IDS.isla,
    consultantOrgId: '',
    projectType: 'residential',
    projectTypeOther: '',
    region: REGION,
    localAuthority: AUTHORITY,
    ribaStage: 4,
    startDate: '2027-02-26',
    programme: { stageStarts: ['2025-03-03', '2025-04-28', '2025-07-28', '2025-12-01', '2026-04-27'], siteStart: '2027-02-01', practicalCompletion: '2028-06-30', source: 'set' },
    clientLink: { status: 'accepted', requestedOn: '2025-03-03', requestedByPersonaId: null, message: '', decidedOn: '2025-03-03', decidedByPersonaId: null, decisionNote: '' },
    requirementIds: suggestedRequirementIds(REGION, AUTHORITY),
    description: 'Ninety-six homes over ground floor workspace, 7,400 m2 GIA, at RIBA stage 4.',
    blindOrgType: 'Developer',
  })
  w.projects[KILNWORTH_ID] = {
    ...p,
    // A seeded project: nobody created it in the product, so it is never a link request.
    createdBy: null,
    postcodeDistrict: 'E14',
    giaM2: 7400,
    keyDates: { planningSubmission: '2026-05-11', steelNeedBy: '2027-02-26' },
    hubDistancesKm: { 'HUB-BARK': 9, 'HUB-PARK': 25, 'HUB-TILB': 29 },
    teamOrgIds: [TESSALY_ORG_ID],
    teamPersonaIds: [PERSONA_IDS.isla],
  }
  const listId = listIdFor(TESSALY_ORG_ID, KILNWORTH_ID)
  w.wishlists[listId] = { id: listId, orgId: TESSALY_ORG_ID, projectId: KILNWORTH_ID, items: [] }
  return w
}
