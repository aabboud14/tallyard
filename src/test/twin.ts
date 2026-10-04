// The twin seed (06-DATA.md section A10): tests only. These names are exempt from the names check.
import type { World } from '../domain/types'
import { createSeed, TIVERNE_ID, ORG_IDS, PERSONA_IDS, MERROWGATE_ID, itemByTag } from '../domain/seed/world'

export const TWIN_RESERVE = 700

export function createTwinSeed(): World {
  const w = createSeed()
  const b = w.buildings[TIVERNE_ID]
  b.name = 'Twin House'
  b.address = '1 Twin Street, London EC2'
  b.tenants = ['Twin Tenant One', 'Twin Tenant Two']
  b.distancesKm = { 'HUB-BARK': 30, 'HUB-PARK': 20, 'HUB-TILB': 45, [MERROWGATE_ID]: 15 }
  b.surveyedBy = { personaName: 'Twin Surveys', orgName: 'Twin Surveys', date: '2026-09-14' }
  w.orgs[ORG_IDS.ostlea].name = 'Twin Estates'
  w.orgs[ORG_IDS.tarnbrook].name = 'Twin Surveys'
  w.personas[PERSONA_IDS.tom].name = 'Twin Owner'
  w.personas[PERSONA_IDS.dana].name = 'Twin Surveys'
  const th01 = itemByTag(w, 'TH-01')
  th01.capturedBy = 'Twin Surveys'
  const lot = Object.values(w.lots).find((l) => l.itemId === th01.id)!
  lot.availableFrom = '2027-01-20'
  return w
}
