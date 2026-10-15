// Testing companies and the tests they offer (owner-surveyor design 14.4.3). Fictional firms held as reference data,
// not organisations with people: nothing is sent to them in the sandbox, the request is recorded on the building.
import type { FamilyId } from '../types'
import { FAMILY_IDS } from './families'
import { REGIONS } from './assumptions'

export type TestService = 'visual_dimensional' | 'steel_coupon' | 'steel_hardness' | 'masonry' | 'fixings_pullout' | 'glazing_seal' | 'timber_grading' | 'floor_load'

export const TEST_SERVICE_ORDER: TestService[] = ['visual_dimensional', 'steel_coupon', 'steel_hardness', 'masonry', 'fixings_pullout', 'glazing_seal', 'timber_grading', 'floor_load']

export const TEST_SERVICES: Record<TestService, { label: string; description: string; families: FamilyId[]; grades: boolean }> = {
  visual_dimensional: { label: 'Visual and dimensional survey', description: 'Condition, sizes and markings, item by item.', families: [...FAMILY_IDS], grades: false },
  steel_coupon: { label: 'Steel coupon tests', description: 'Samples cut and tested for grade and chemistry.', families: ['steel_section'], grades: true },
  steel_hardness: { label: 'Steel hardness tests', description: 'Non-destructive tests that indicate the grade.', families: ['steel_section'], grades: true },
  masonry: { label: 'Brick and mortar tests', description: 'Strength, absorption and mortar type.', families: ['clay_brick'], grades: false },
  fixings_pullout: { label: 'Fixing pull-out tests', description: 'Capacity of the cladding fixings.', families: ['stone_cladding', 'precast_cladding', 'curtain_wall'], grades: false },
  glazing_seal: { label: 'Glazing seal check', description: 'Seals and units of each panel.', families: ['curtain_wall'], grades: false },
  timber_grading: { label: 'Timber strength grading', description: 'Visual strength grading of each member.', families: ['timber_joist'], grades: false },
  floor_load: { label: 'Floor panel load test', description: 'Load test on sample panels.', families: ['raised_floor'], grades: false },
}

export type TestingCompany = { id: string; name: string; email: string; services: TestService[]; regions: string[] }

export const TESTING_COMPANIES: TestingCompany[] = [
  { id: 'tco_brindmoor', name: 'Brindmoor Testing', email: 'bookings@brindmoor.example', services: ['visual_dimensional', 'steel_coupon', 'steel_hardness', 'fixings_pullout'], regions: [...REGIONS] },
  { id: 'tco_quenby', name: 'Quenby Materials Lab', email: 'lab@quenby.example', services: ['visual_dimensional', 'masonry', 'glazing_seal', 'timber_grading', 'floor_load'], regions: [...REGIONS] },
  { id: 'tco_calverd', name: 'Calverd Inspection', email: 'enquiries@calverd.example', services: ['visual_dimensional', 'steel_hardness', 'fixings_pullout', 'glazing_seal'], regions: ['Central London', 'Inner London East', 'Inner London West', 'Outer London East', 'Outer London West'] },
]

export function testingCompanyById(id: string): TestingCompany | null {
  return TESTING_COMPANIES.find((c) => c.id === id) ?? null
}
