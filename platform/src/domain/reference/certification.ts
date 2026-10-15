// Certification schemes, their credits and the circular economy measures that reclaimed materials feed (client-
// consultant design, section 2.2). Every summary is an indicative summary to check against the current scheme
// manual; Tallyard provides inputs to the evidence, never an assessment.
import type { GoalId } from '../sustainabilityTypes'

export type SchemeId = 'breeam' | 'leed' | 'well' | 'circular'
/** Which of the project's reclaimed materials a credit maps by default. */
export type ItemRule = 'all_reused' | 'steel' | 'pre_1970_or_untested' | 'none'
export type CreditEvidence = 'reused_items' | 'content_by_value' | 'avoided_carbon' | 'carbon_factors' | 'hazard_screening' | 'waste_reporting' | 'statement' | 'specification'

export type SchemeDef = { id: SchemeId; label: string; version: string; ratingGoal: GoalId | null }

export type CreditDef = {
  id: string
  scheme: SchemeId
  code: string
  title: string
  summary: string
  /** What Tallyard provides towards the evidence. */
  provides: string
  evidence: CreditEvidence[]
  itemRule: ItemRule
  defaultTargeted: boolean
  status: 'indicative'
}

export const SCHEME_IDS: readonly SchemeId[] = ['breeam', 'leed', 'well', 'circular']

export const SCHEMES: SchemeDef[] = [
  { id: 'breeam', label: 'BREEAM', version: 'New Construction Version 7 series', ratingGoal: 'breeam' },
  { id: 'leed', label: 'LEED', version: 'v5, Building Design and Construction', ratingGoal: 'leed' },
  { id: 'well', label: 'WELL', version: 'WELL v2', ratingGoal: 'well' },
  { id: 'circular', label: 'Circular economy', version: 'London Plan 2021 Policy SI 7 and the Circular Economy Statement guidance (2022)', ratingGoal: null },
]

type Entry = Omit<CreditDef, 'status'>
const credit = (e: Entry): CreditDef => ({ ...e, status: 'indicative' })

const STEEL_DISASSEMBLY = 'Reclaimed steel members, which can be taken down again'

export const CREDITS: CreditDef[] = [
  credit({
    id: 'breeam-mat01',
    scheme: 'breeam',
    code: 'Mat 01',
    title: 'Building life cycle assessment',
    summary: 'Rewards a life cycle assessment of the design at an early stage and the options it leads to. Indicative summary.',
    provides: 'Carbon factors and avoided carbon for the reclaimed items, as an input to the assessment, which is done elsewhere',
    evidence: ['carbon_factors', 'avoided_carbon'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'breeam-mat03',
    scheme: 'breeam',
    code: 'Mat 03',
    title: 'Responsible sourcing of construction products',
    summary: 'Rewards products sourced responsibly, with evidence of where they came from. Indicative summary.',
    provides: 'Source type, era and testing status of each reclaimed item, from the public listing',
    evidence: ['reused_items'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'breeam-mat05',
    scheme: 'breeam',
    code: 'Mat 05',
    title: 'Material efficiency: reuse of materials',
    summary: 'Rewards design and procurement that reuse materials and cut waste. Indicative summary.',
    provides: 'The reused items and their quantities',
    evidence: ['reused_items'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'breeam-wst01',
    scheme: 'breeam',
    code: 'Wst 01',
    title: 'Construction waste management',
    summary: 'Rewards diverting construction waste from landfill and measuring it. Indicative summary.',
    provides: "Nothing yet: diversion comes from the contractor's waste reports",
    evidence: ['waste_reporting'],
    itemRule: 'none',
    defaultTargeted: true,
  }),
  credit({
    id: 'breeam-wst06',
    scheme: 'breeam',
    code: 'Wst 06',
    title: 'Design for disassembly and adaptability',
    summary: 'Rewards a design that can be adapted and taken apart for reuse at the end of its life. Indicative summary.',
    provides: STEEL_DISASSEMBLY,
    evidence: ['reused_items'],
    itemRule: 'steel',
    defaultTargeted: false,
  }),
  credit({
    id: 'leed-mr-reuse',
    scheme: 'leed',
    code: 'MR',
    title: 'Building and materials reuse',
    summary: 'Rewards reusing building elements and salvaged materials. Indicative summary.',
    provides: 'The reused items and their quantities',
    evidence: ['reused_items'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'leed-mr-quantify',
    scheme: 'leed',
    code: 'MR prerequisite',
    title: 'Quantify and assess embodied carbon',
    summary: 'Asks for the embodied carbon of the main materials to be quantified. Indicative summary.',
    provides: 'Carbon factors for the reclaimed items, as an input only',
    evidence: ['carbon_factors'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'leed-mr-reduce',
    scheme: 'leed',
    code: 'MR',
    title: 'Reduce embodied carbon',
    summary: 'Rewards a reduction in embodied carbon against a baseline. Indicative summary.',
    provides: 'Avoided carbon against buying new, as an input only',
    evidence: ['avoided_carbon'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'leed-mr-waste',
    scheme: 'leed',
    code: 'MR',
    title: 'Construction and demolition waste diversion',
    summary: 'Rewards diverting construction and demolition waste. Indicative summary.',
    provides: 'Nothing yet: LEED counts diversion differently',
    evidence: ['waste_reporting'],
    itemRule: 'none',
    defaultTargeted: true,
  }),
  credit({
    id: 'well-x01',
    scheme: 'well',
    code: 'X01',
    title: 'Material restrictions (precondition)',
    summary: 'Restricts hazardous substances in new materials, such as lead and asbestos. Indicative summary.',
    provides: 'Items built before 1970 or untested, to screen for restricted materials such as lead in coatings',
    evidence: ['hazard_screening'],
    itemRule: 'pre_1970_or_untested',
    defaultTargeted: true,
  }),
  credit({
    id: 'well-x02',
    scheme: 'well',
    code: 'X02',
    title: 'Interior hazardous materials management (precondition)',
    summary: 'Asks for hazardous materials in the building to be surveyed and managed. Indicative summary.',
    provides: 'The same items, for the hazardous materials survey',
    evidence: ['hazard_screening'],
    itemRule: 'pre_1970_or_untested',
    defaultTargeted: true,
  }),
  credit({
    id: 'well-x07',
    scheme: 'well',
    code: 'X07',
    title: 'Materials transparency',
    summary: 'Rewards disclosing what the materials are made of. Indicative summary.',
    provides: 'The specification schedule from public listing fields',
    evidence: ['specification'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'ce-content',
    scheme: 'circular',
    code: 'Bill of materials',
    title: 'Reused and recycled content by value, aim at least 20%',
    summary: 'The bill of materials reports reused and recycled content by value against the aim. Indicative summary.',
    provides: 'Content by value from the bill of materials',
    evidence: ['content_by_value'],
    itemRule: 'none',
    defaultTargeted: true,
  }),
  credit({
    id: 'ce-reuse',
    scheme: 'circular',
    code: 'Reuse',
    title: 'Reuse of materials and components, with quantities',
    summary: 'The statement lists the materials and components reused, with their quantities. Indicative summary.',
    provides: 'The reused items and their quantities',
    evidence: ['reused_items'],
    itemRule: 'all_reused',
    defaultTargeted: true,
  }),
  credit({
    id: 'ce-diversion',
    scheme: 'circular',
    code: 'Waste',
    title: 'At least 95% of construction and demolition waste diverted from landfill',
    summary: 'Policy SI 7 sets the diversion target, reported in the recycling and waste reporting form. Indicative summary.',
    provides: "Nothing yet: from the contractor's waste reports",
    evidence: ['waste_reporting'],
    itemRule: 'none',
    defaultTargeted: true,
  }),
  credit({
    id: 'ce-eol',
    scheme: 'circular',
    code: 'End of life',
    title: 'End-of-life strategy: design for disassembly',
    summary: 'The statement sets out how the building can be taken apart and its materials reused. Indicative summary.',
    provides: STEEL_DISASSEMBLY,
    evidence: ['reused_items'],
    itemRule: 'steel',
    defaultTargeted: false,
  }),
  credit({
    id: 'ce-statement',
    scheme: 'circular',
    code: 'Statement',
    title: 'Circular economy statement at each stage',
    summary: 'The statement is submitted at pre-application, with the planning application and after construction. Indicative summary.',
    provides: 'The statement drafted in Tallyard',
    evidence: ['statement'],
    itemRule: 'none',
    defaultTargeted: true,
  }),
]

export function schemeDef(id: SchemeId): SchemeDef {
  const s = SCHEMES.find((x) => x.id === id)
  if (!s) throw new Error('No scheme ' + id)
  return s
}

export function creditById(id: string): CreditDef | null {
  return CREDITS.find((c) => c.id === id) ?? null
}

export function creditsOf(scheme: SchemeId): CreditDef[] {
  return CREDITS.filter((c) => c.scheme === scheme)
}

export function isSchemeId(id: string): id is SchemeId {
  return (SCHEME_IDS as readonly string[]).includes(id)
}
