// The sandbox's requirement tracking on Tiverne House (review of 16 October 2026): the owner has the City of
// London's Carbon Options assessment in hand, the surveyor's survey is the start of the pre-demolition audit, and the
// owner has marked the diversion target at risk while most lots have no reuse route yet.
import type { RequirementTrack, TrackStatus } from '../domain/sustainabilityTypes'
import { ORG_IDS, PERSONA_IDS, TIVERNE_ID } from '../domain/seed/world'
import { TRACK_STATUS_LABELS } from '../domain/reference/sustainabilityCopy'
import type { AppData } from '../store/types'
import { log } from '../store/notifications'
import { buildingRequirements, withBuildingTrack } from '../store/buildingTracks'
import { SAMPLE_ACCOUNTS } from './accounts'

const USER = Object.fromEntries(SAMPLE_ACCOUNTS.map((a) => [a.personaId, a.userId])) as Record<string, string>

/** Fixed evidence IDs, so seeding leaves the ID counter where it was. */
type Step = { requirementId: string; status: TrackStatus; userId: string; at: string; evidence: { id: string; text: string } | null }

export function seedBuildingRequirements(state: AppData, at: (k: number, hh: number, mm?: number) => string): AppData {
  const tom = USER[PERSONA_IDS.tom]
  const dana = USER[PERSONA_IDS.dana]
  const b = state.world.buildings[TIVERNE_ID]
  const steps: Step[] = [
    { requirementId: 'la-city-of-london-carbon-options', status: 'evidence_ready', userId: tom, at: at(26, 10), evidence: { id: 'evd_tvcopt', text: 'Carbon options assessment for the redevelopment, submitted with the planning application. Retrofit was ruled out on floor to floor height and structure.' } },
    { requirementId: 'lp-si7-pda', status: 'in_progress', userId: dana, at: at(23, 17), evidence: { id: 'evd_tvaudt', text: 'Survey submitted: the inventory lists each item with its quantity and condition. Recycling routes for the rest still to add.' } },
    { requirementId: 'lp-si7-diversion', status: 'at_risk', userId: tom, at: at(4, 11), evidence: null },
  ]
  let s = state
  const applies = new Set(buildingRequirements(b).map((r) => r.id))
  for (const step of steps) {
    const req = buildingRequirements(b).find((r) => r.id === step.requirementId)
    if (!req || !applies.has(step.requirementId)) continue
    const evidence: RequirementTrack['evidence'] = []
    if (step.evidence) evidence.push({ id: step.evidence.id, text: step.evidence.text, output: null, addedByUserId: step.userId, addedBy: s.users[step.userId].name, addedAt: step.at })
    s = withBuildingTrack(s, TIVERNE_ID, { requirementId: step.requirementId, status: step.status, evidence, updatedAt: step.at, updatedByUserId: step.userId })
    const word = TRACK_STATUS_LABELS[step.status].toLowerCase()
    s = log(s, { at: step.at, orgIds: [ORG_IDS.ostlea, ORG_IDS.tarnbrook], projectId: null, buildingId: TIVERNE_ID, actorUserId: step.userId, actor: s.users[step.userId].name, text: `marked ${req.title} as ${word} on ${b.name}`, href: `/app/buildings/${TIVERNE_ID}/requirements` })
  }
  return s
}
