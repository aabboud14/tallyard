// Planning and sustainability requirements: the single dataset every part of the product reads (review of
// 14 October 2026). Three levels: national (England; in Wales and Scotland a placeholder plus the UK standards),
// London (London Plan 2021 and GLA guidance) and local (hand-written entries for six boroughs, otherwise a generated
// "local plan" placeholder for any authority). Projects being built read one set; donor buildings coming down read
// the items that bite before demolition (the review of 16 October 2026). Every entry is an indicative summary as at
// October 2026, never legal advice; a placeholder says it is not yet summarised.
import { isLondonRegion, nationOfRegion } from './places'

export type RequirementLevel = 'national' | 'london' | 'local'
export type RequirementKind = 'planning_policy' | 'regulation' | 'guidance' | 'voluntary_standard' | 'certification' | 'method'
export type RequirementTopic = 'planning' | 'energy' | 'whole_life_carbon' | 'circular_economy' | 'net_zero' | 'breeam' | 'leed' | 'well'
/** What an entry applies to: a project being built, or a donor building coming down. */
export type RequirementSubject = 'project' | 'donor'

export type PlanningRequirement = {
  id: string
  code: string
  title: string
  source: string
  level: RequirementLevel
  kind: RequirementKind
  topic: RequirementTopic
  /** When it applies, in plain words; '' when it always applies. */
  trigger: string
  summary: string
  asks: string[]
  /** How Tallyard's records feed it, or null. */
  helps: string | null
  /** Pre-ticked in the form: statutory policy, regulation and GLA guidance only. */
  suggested: boolean
  /** True for a generated or general entry that names what to check but does not summarise it yet. */
  placeholder: boolean
  appliesTo: RequirementSubject[]
  status: 'indicative'
}

/** The label a placeholder carries wherever it is shown. */
export const PLACEHOLDER_LABEL = 'Not yet summarised'

export const REQUIREMENTS_AS_AT = 'October 2026'
export const REQUIREMENTS_NOTE = 'Indicative summaries as at October 2026. Check the current published documents before you rely on them.'
/** The same note where an Indicative marker already stands in front of it, so the word is not said twice. */
export const REQUIREMENTS_NOTE_AFTER_MARKER = 'Summaries as at October 2026. Check the current published documents before you rely on them.'

export const KIND_LABELS: Record<RequirementKind, string> = {
  planning_policy: 'Planning policy',
  regulation: 'Regulation',
  guidance: 'Guidance',
  voluntary_standard: 'Voluntary standard',
  certification: 'Certification',
  method: 'Method',
}

type Entry = Omit<PlanningRequirement, 'level' | 'status' | 'placeholder' | 'appliesTo'> & Partial<Pick<PlanningRequirement, 'placeholder' | 'appliesTo'>>

const make = (level: RequirementLevel) => (e: Entry): PlanningRequirement => ({ placeholder: false, appliesTo: ['project'], ...e, level, status: 'indicative' })
const national = make('national')
const london = make('london')
const local = make('local')

const CARBON_INPUT = 'Avoided carbon on reused items is an input to the assessment, not a result.'

export const NATIONAL_REQUIREMENTS: PlanningRequirement[] = [
  national({
    id: 'nppf',
    code: 'NPPF',
    title: 'National Planning Policy Framework',
    source: 'National Planning Policy Framework, December 2024',
    kind: 'planning_policy',
    topic: 'planning',
    trigger: '',
    summary: 'National planning policy for England. Plans and decisions should support the move to a low carbon future and encourage the reuse of existing resources, including the conversion of existing buildings.',
    asks: ['A planning application that shows how the scheme meets national policy'],
    helps: null,
    suggested: true,
  }),
  national({
    id: 'adl',
    code: 'Part L',
    title: 'Building Regulations Part L: conservation of fuel and power',
    source: 'Approved Document L, 2021 edition',
    kind: 'regulation',
    topic: 'energy',
    trigger: 'New buildings, and some work to existing buildings',
    summary: 'Sets the energy and carbon performance new buildings must meet in use. It covers operational carbon only, not embodied carbon.',
    asks: ['Energy calculations at design stage', 'As built energy calculations and an energy performance certificate'],
    helps: null,
    suggested: true,
  }),
  national({
    id: 'nzcbs',
    code: 'UK NZCBS',
    title: 'UK Net Zero Carbon Buildings Standard',
    source: 'UK Net Zero Carbon Buildings Standard, pilot version, 2024',
    kind: 'voluntary_standard',
    topic: 'net_zero',
    trigger: 'When the client chooses to follow it',
    summary: 'A voluntary standard with limits on upfront embodied carbon and energy use by building type, verified once the building is in use.',
    asks: ['Upfront embodied carbon and energy use compared with the limits', 'Verification once the building is in use'],
    helps: 'Carbon figures for reused items are an input to the upfront carbon calculation, not a result.',
    suggested: false,
  }),
  national({
    id: 'riba2030',
    code: 'RIBA 2030',
    title: 'RIBA 2030 Climate Challenge',
    source: 'RIBA 2030 Climate Challenge, version 2, 2021',
    kind: 'voluntary_standard',
    topic: 'whole_life_carbon',
    trigger: 'When the practice or the client signs up to it',
    summary: 'Voluntary targets for operational energy, embodied carbon and potable water use, by building type.',
    asks: ['Targets set at briefing', 'Reports of operational energy, embodied carbon and water use'],
    helps: 'Carbon figures for reused items are an input to the embodied carbon figure, not a result.',
    suggested: false,
  }),
  national({
    id: 'rics-wlca',
    code: 'RICS WLCA',
    title: 'Whole life carbon assessment for the built environment',
    source: 'RICS professional standard, 2nd edition, 2023',
    kind: 'method',
    topic: 'whole_life_carbon',
    trigger: 'When a whole life carbon assessment is carried out',
    summary: 'The method most UK whole life carbon assessments follow, based on BS EN 15978. The London Plan guidance and the net zero standard refer to it.',
    asks: ['An assessment reported in the format the standard sets out'],
    helps: 'Carbon figures for reused items are an input to the assessment, not a result.',
    suggested: false,
  }),
  national({
    id: 'breeam-nc',
    code: 'BREEAM',
    title: 'BREEAM New Construction',
    source: 'BREEAM New Construction Version 7 series',
    kind: 'certification',
    topic: 'breeam',
    trigger: 'When the client seeks a rating',
    summary: 'Certification scheme. Mat 01 covers life cycle assessment, Mat 05 rewards reusing materials and Wst 01 diverting construction waste from landfill.',
    asks: ['A licensed assessor', 'Evidence for each credit sought'],
    helps: 'Reused items feed the evidence for Mat 05, and their carbon figures are an input to Mat 01.',
    suggested: false,
  }),
  national({
    id: 'leed-v5',
    code: 'LEED',
    title: 'LEED v5 Building Design and Construction',
    source: 'LEED v5',
    kind: 'certification',
    topic: 'leed',
    trigger: 'When the client seeks certification',
    summary: 'Certification scheme. Materials and Resources credits cover building and materials reuse, embodied carbon and construction waste diversion.',
    asks: ['Registration of the project', 'Documents for each credit sought'],
    helps: 'Reused items feed the evidence for the reuse credits.',
    suggested: false,
  }),
  national({
    id: 'well-v2',
    code: 'WELL',
    title: 'WELL Building Standard',
    source: 'WELL v2',
    kind: 'certification',
    topic: 'well',
    trigger: 'When the client seeks certification',
    summary: 'Certification scheme for health and wellbeing. Its Materials concept restricts hazardous substances, which matters when reusing older materials.',
    asks: ['Records of materials and any hazardous content', 'Performance verification'],
    helps: null,
    suggested: false,
  }),
]

export const LONDON_REQUIREMENTS: PlanningRequirement[] = [
  london({
    id: 'lp-si2',
    code: 'Policy SI 2',
    title: 'Minimising greenhouse gas emissions',
    source: 'London Plan 2021',
    kind: 'planning_policy',
    topic: 'whole_life_carbon',
    trigger: 'Major development; the whole life-cycle carbon assessment applies to applications referable to the Mayor',
    summary: 'Major development should be net zero carbon in operation, following the energy hierarchy. Applications referable to the Mayor calculate whole life-cycle carbon emissions and show the actions taken to reduce them.',
    asks: ['Energy strategy', 'Whole life-cycle carbon assessment'],
    helps: CARBON_INPUT,
    suggested: true,
  }),
  london({
    id: 'lp-si7',
    code: 'Policy SI 7',
    title: 'Reducing waste and supporting the circular economy',
    source: 'London Plan 2021',
    kind: 'planning_policy',
    topic: 'circular_economy',
    trigger: 'Applications referable to the Mayor',
    summary: 'Referable applications submit a Circular Economy Statement. Policy targets include putting at least 95% of construction and demolition waste to beneficial use instead of landfill.',
    asks: ['Circular Economy Statement', 'Pre-demolition audit where there is demolition', 'Bill of materials'],
    helps: 'Reused items and their share of the bill of materials feed the statement.',
    suggested: true,
  }),
  london({
    id: 'lp-d3',
    code: 'Policy D3',
    title: 'Optimising site capacity through the design-led approach',
    source: 'London Plan 2021',
    kind: 'planning_policy',
    topic: 'planning',
    trigger: '',
    summary: 'Development should aim for high sustainability standards and take into account the principles of the circular economy, as part of a design-led approach to site capacity.',
    asks: ['A design and access statement that shows the design-led approach'],
    helps: null,
    suggested: true,
  }),
  london({
    id: 'gla-wlc',
    code: 'WLC guidance',
    title: 'Whole Life-Cycle Carbon Assessments guidance',
    source: 'Greater London Authority, 2022',
    kind: 'guidance',
    topic: 'whole_life_carbon',
    trigger: 'Applications referable to the Mayor',
    summary: 'How to carry out and report the assessment for Policy SI 2, with benchmarks, at pre-application, planning and after construction.',
    asks: ['The GLA assessment template at each stage', 'A post-construction assessment'],
    helps: CARBON_INPUT,
    suggested: true,
  }),
  london({
    id: 'gla-ces',
    code: 'CES guidance',
    title: 'Circular Economy Statements guidance',
    source: 'Greater London Authority, 2022',
    kind: 'guidance',
    topic: 'circular_economy',
    trigger: 'Applications referable to the Mayor',
    summary: 'How to prepare the statement for Policy SI 7: the bill of materials with reused and recycled content by value, with an aim of at least 20%, and reporting after construction.',
    asks: ['The statement template, including the bill of materials', 'A post-completion report'],
    helps: 'Reused items and their share of the bill of materials by value feed the statement.',
    suggested: true,
  }),
  london({
    id: 'gla-energy',
    code: 'Energy guidance',
    title: 'Energy Assessment guidance',
    source: 'Greater London Authority, 2022',
    kind: 'guidance',
    topic: 'energy',
    trigger: 'Major development',
    summary: 'How to show the energy hierarchy and the net zero carbon target for Policy SI 2, including carbon offset payments for any shortfall.',
    asks: ['Energy assessment', 'Carbon offset payment for any shortfall'],
    helps: null,
    suggested: true,
  }),
]

const BOROUGH_SUMMARY = 'Borough policies on carbon, energy and sustainable design apply alongside the London Plan. Check the adopted plan and any supplementary planning documents.'
const BOROUGH_ASKS = ['The sustainability and energy statements the plan asks for']

/** Hand-written local entries, keyed by authority. They replace the generated entry for their authority. */
export const LOCAL_REQUIREMENTS: Record<string, PlanningRequirement[]> = {
  'City of London': [
    local({
      id: 'la-city-of-london-carbon-options',
      appliesTo: ['project', 'donor'],
      code: 'Carbon options',
      title: 'Carbon Options guidance',
      source: 'City of London planning advice note, 2023',
      kind: 'guidance',
      topic: 'planning',
      trigger: 'Major schemes that propose demolition',
      summary: 'Major schemes are expected to compare retrofit and redevelopment options on whole life carbon before demolition is chosen.',
      asks: ['A carbon options assessment'],
      helps: null,
      suggested: true,
    }),
  ],
  Westminster: [
    local({
      id: 'la-westminster-retrofit-first',
      appliesTo: ['project', 'donor'],
      code: 'Retrofit first',
      title: 'Retrofit first approach',
      source: 'Westminster City Plan review',
      kind: 'planning_policy',
      topic: 'planning',
      trigger: 'Where substantial demolition is proposed',
      summary: 'The plan review sets a retrofit first approach where substantial demolition is proposed. Check its adoption status.',
      asks: ['Evidence that retrofit options were considered'],
      helps: null,
      suggested: true,
    }),
  ],
  Camden: [
    local({
      id: 'la-camden-cc1',
      appliesTo: ['project', 'donor'],
      code: 'Policy CC1',
      title: 'Climate change mitigation',
      source: 'Camden Local Plan 2017',
      kind: 'planning_policy',
      topic: 'planning',
      trigger: 'Proposals with substantial demolition',
      summary: 'Proposals with substantial demolition must show that keeping and improving the existing building is not possible.',
      asks: ['Evidence on the condition and options for the existing building'],
      helps: null,
      suggested: true,
    }),
    local({
      id: 'la-camden-cpg',
      code: 'CPG',
      title: 'Energy efficiency and adaptation',
      source: 'Camden Planning Guidance, 2021',
      kind: 'guidance',
      topic: 'planning',
      trigger: 'Larger schemes',
      summary: 'How Camden applies its climate policies, including whole life carbon and circular economy expectations for larger schemes.',
      asks: ['Whole life carbon and circular economy information for larger schemes'],
      helps: null,
      suggested: true,
    }),
  ],
  Southwark: [
    local({ id: 'la-southwark-plan', code: 'Southwark Plan', title: 'Sustainability standards and energy policies', source: 'Southwark Plan 2022', kind: 'planning_policy', topic: 'planning', trigger: '', summary: BOROUGH_SUMMARY, asks: BOROUGH_ASKS, helps: null, suggested: true }),
  ],
  Hackney: [
    local({ id: 'la-hackney-lp33', code: 'LP33', title: 'Climate change and sustainable design policies', source: 'Hackney Local Plan 2033', kind: 'planning_policy', topic: 'planning', trigger: '', summary: BOROUGH_SUMMARY, asks: BOROUGH_ASKS, helps: null, suggested: true }),
  ],
  Islington: [
    local({ id: 'la-islington-lp', code: 'Local Plan', title: 'Sustainable design policies', source: 'Islington Local Plan 2023', kind: 'planning_policy', topic: 'planning', trigger: '', summary: BOROUGH_SUMMARY, asks: BOROUGH_ASKS, helps: null, suggested: true }),
  ],
}

/** Lower case; runs of characters other than letters and digits become '-'; trimmed of '-' at both ends. */
export function localSlug(la: string): string {
  return la
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const LOCAL_SUMMARY_LONDON = 'Borough policies apply alongside the London Plan. Check the adopted local plan and any guidance on sustainable design, energy, waste and the circular economy.'
const LOCAL_SUMMARY_ELSEWHERE = 'Local policies apply alongside national policy. Check the adopted local plan and any guidance on sustainable design, energy and waste.'

/** The local level for an authority: its hand-written entries, or one generated "local plan" entry; [] when la is ''. */
export function localRequirements(region: string, la: string): PlanningRequirement[] {
  const name = la.trim()
  if (!name) return []
  if (Object.prototype.hasOwnProperty.call(LOCAL_REQUIREMENTS, name)) return LOCAL_REQUIREMENTS[name]
  return [
    local({
      id: `la-${localSlug(name)}`,
      code: 'Local plan',
      title: `${name} local plan policies`,
      source: `${name} local plan and supplementary planning documents`,
      kind: 'planning_policy',
      topic: 'planning',
      trigger: '',
      summary: isLondonRegion(region) ? LOCAL_SUMMARY_LONDON : LOCAL_SUMMARY_ELSEWHERE,
      asks: ['The statements on the local validation list'],
      helps: null,
      suggested: true,
      placeholder: true,
    }),
  ]
}

/** National entries that apply across the UK: the voluntary standards, the method and the certifications. */
const UK_WIDE_IDS = ['nzcbs', 'riba2030', 'rics-wlca', 'breeam-nc', 'leed-v5', 'well-v2']

/** In Wales and Scotland the national planning policy and building rules differ from England's, and are not yet summarised. */
export const DEVOLVED_NATIONAL: Record<'Wales' | 'Scotland', PlanningRequirement> = {
  Wales: national({
    id: 'wales-national',
    code: 'Wales',
    title: 'Planning policy and building regulations in Wales',
    source: 'Planning Policy Wales and the Building Regulations in Wales',
    kind: 'planning_policy',
    topic: 'planning',
    trigger: '',
    summary: 'Not yet summarised in Tallyard. National planning policy and the building regulations in Wales differ from those in England. Check the current Welsh Government documents.',
    asks: ['The statements the local planning authority asks for'],
    helps: null,
    suggested: true,
    placeholder: true,
  }),
  Scotland: national({
    id: 'scotland-national',
    code: 'Scotland',
    title: 'Planning policy and building standards in Scotland',
    source: 'National Planning Framework 4 and the Scottish building standards',
    kind: 'planning_policy',
    topic: 'planning',
    trigger: '',
    summary: 'Not yet summarised in Tallyard. National planning policy and the building standards in Scotland differ from those in England. Check the current Scottish Government documents.',
    asks: ['The statements the planning authority asks for'],
    helps: null,
    suggested: true,
    placeholder: true,
  }),
}

/** The national group for a region: England's entries, or in Wales and Scotland a placeholder and the UK-wide entries. */
function nationalGroup(region: string): RequirementGroup {
  const nation = nationOfRegion(region)
  if (nation === 'Wales' || nation === 'Scotland') {
    return {
      level: 'national',
      title: 'National',
      subtitle: `${nation}: national requirements not yet summarised, UK standards shown`,
      items: [DEVOLVED_NATIONAL[nation], ...NATIONAL_REQUIREMENTS.filter((r) => UK_WIDE_IDS.includes(r.id))],
    }
  }
  return { level: 'national', title: 'National', subtitle: 'England, statutory and voluntary', items: NATIONAL_REQUIREMENTS }
}

export type RequirementGroup = { level: RequirementLevel; title: string; subtitle: string; items: PlanningRequirement[] }

/** The groups that apply to a location: national always, London for a London region, local when an authority is set. */
export function requirementsFor(region: string, localAuthority: string): RequirementGroup[] {
  const groups: RequirementGroup[] = [nationalGroup(region)]
  if (isLondonRegion(region)) groups.push({ level: 'london', title: 'London Plan 2021 and GLA guidance', subtitle: 'Applies across Greater London', items: LONDON_REQUIREMENTS })
  const la = localAuthority.trim()
  if (la) groups.push({ level: 'local', title: la, subtitle: 'Local plan and guidance', items: localRequirements(region, la) })
  return groups
}

/** Every requirement ID that applies to a location, in dataset order. */
export function applicableIds(region: string, localAuthority: string): string[] {
  return requirementsFor(region, localAuthority).flatMap((g) => g.items.map((r) => r.id))
}

/** The IDs the form pre-ticks: statutory policy, regulation and GLA guidance for the location. */
export function suggestedRequirementIds(region: string, localAuthority: string): string[] {
  return requirementsFor(region, localAuthority).flatMap((g) => g.items.filter((r) => r.suggested).map((r) => r.id))
}

/** Keeps the IDs that apply here, in dataset order, without repeats. */
export function keepApplicable(ids: string[], region: string, localAuthority: string): string[] {
  const wanted = new Set(ids)
  return applicableIds(region, localAuthority).filter((id) => wanted.has(id))
}

/** The requirement with this ID at this location, or null. */
export function requirementById(id: string, region: string, localAuthority: string): PlanningRequirement | null {
  for (const g of requirementsFor(region, localAuthority)) for (const r of g.items) if (r.id === id) return r
  return null
}

/** Every entry the product names, with its source, for Help, Methodology. */
export function requirementsMethodology(): { title: string; source: string; status: 'Indicative summary' }[] {
  const all = [...NATIONAL_REQUIREMENTS, ...LONDON_REQUIREMENTS, ...Object.values(LOCAL_REQUIREMENTS).flat()]
  return all.map((r) => ({ title: `${r.code}, ${r.title}`, source: r.source, status: 'Indicative summary' as const }))
}

// ---------- Donor buildings coming down ----------

const donor = (level: RequirementLevel) => (e: Entry): PlanningRequirement => make(level)({ ...e, appliesTo: ['donor'] })

/** Before demolition, nationally: notice to the local authority, and a plan for the waste. Placeholders. */
export const DONOR_NATIONAL: Record<'England' | 'Wales' | 'Scotland', PlanningRequirement> = {
  England: donor('national')({
    id: 'dem-notice',
    code: 'Section 80',
    title: 'Demolition notice and site waste plan',
    source: 'Building Act 1984, section 80, and site waste management good practice',
    kind: 'regulation',
    topic: 'planning',
    trigger: 'Most demolition',
    summary: 'Not yet summarised in full. Most demolition needs notice to the local authority first, and some needs prior approval under planning rules. A site waste management plan is good practice; it is no longer a legal duty in England.',
    asks: ['Notice of the demolition to the local authority', 'A plan for the waste and for the materials kept for reuse'],
    helps: 'The inventory and the recovery plan show which materials are kept for reuse and where they go.',
    suggested: true,
    placeholder: true,
  }),
  Wales: donor('national')({
    id: 'dem-notice-wales',
    code: 'Section 80',
    title: 'Demolition notice in Wales',
    source: 'Building Act 1984, section 80',
    kind: 'regulation',
    topic: 'planning',
    trigger: 'Most demolition',
    summary: 'Not yet summarised in full. Most demolition needs notice to the local authority first. Check the current Welsh Government guidance on demolition and waste.',
    asks: ['Notice of the demolition to the local authority'],
    helps: 'The inventory and the recovery plan show which materials are kept for reuse and where they go.',
    suggested: true,
    placeholder: true,
  }),
  Scotland: donor('national')({
    id: 'dem-warrant-scotland',
    code: 'Scotland',
    title: 'Building warrant for demolition',
    source: 'Building (Scotland) Act 2003',
    kind: 'regulation',
    topic: 'planning',
    trigger: 'Most demolition',
    summary: 'Not yet summarised in full. Demolition in Scotland generally needs a building warrant from the local authority. Check the current Scottish Government guidance.',
    asks: ['A building warrant for the demolition'],
    helps: 'The inventory and the recovery plan show which materials are kept for reuse and where they go.',
    suggested: true,
    placeholder: true,
  }),
}

/** Before demolition, in London: the pre-demolition audit and the diversion target of Policy SI 7. */
export const DONOR_LONDON: PlanningRequirement[] = [
  donor('london')({
    id: 'lp-si7-pda',
    code: 'Policy SI 7',
    title: 'Pre-demolition audit',
    source: 'London Plan 2021 and the GLA Circular Economy Statements guidance, 2022',
    kind: 'planning_policy',
    topic: 'circular_economy',
    trigger: 'Applications referable to the Mayor that involve demolition',
    summary: 'Before demolition, an audit records the materials in the building and how much of each can be reused or recycled. It forms part of the Circular Economy Statement for the scheme that replaces it.',
    asks: ['A pre-demolition audit', 'Reuse and recycling routes for the main materials'],
    helps: 'The inventory and the recovery plan hold the items, quantities and routes the audit asks for.',
    suggested: true,
  }),
  donor('london')({
    id: 'lp-si7-diversion',
    code: 'Policy SI 7',
    title: 'Demolition waste put to beneficial use',
    source: 'London Plan 2021',
    kind: 'planning_policy',
    topic: 'circular_economy',
    trigger: 'Applications referable to the Mayor',
    summary: 'Policy targets include putting at least 95% of construction and demolition waste to beneficial use instead of landfill.',
    asks: ['Records of where the demolition materials and waste go'],
    helps: 'Listings, reservations and sales show what leaves the site for reuse.',
    suggested: true,
  }),
]

/** The local level before demolition: the authority's hand-written demolition entries, or one generated placeholder. */
export function donorLocalRequirements(region: string, la: string): PlanningRequirement[] {
  const name = la.trim()
  if (!name) return []
  const written = (Object.prototype.hasOwnProperty.call(LOCAL_REQUIREMENTS, name) ? LOCAL_REQUIREMENTS[name] : []).filter((r) => r.appliesTo.includes('donor'))
  if (written.length > 0) return written
  return [
    donor('local')({
      id: `la-${localSlug(name)}-demolition`,
      code: 'Local plan',
      title: `${name} local plan, demolition and waste`,
      source: `${name} local plan and supplementary planning documents`,
      kind: 'planning_policy',
      topic: 'planning',
      trigger: '',
      summary: isLondonRegion(region)
        ? 'Not yet summarised in Tallyard. Check the local plan for policies on demolition, retrofit first, waste and the circular economy, alongside the London Plan.'
        : 'Not yet summarised in Tallyard. Check the local plan for policies on demolition, retrofit first and waste.',
      asks: ['The statements on the local validation list'],
      helps: null,
      suggested: true,
      placeholder: true,
    }),
  ]
}

/** The groups a donor building coming down tracks: national, London for a London region, local when an authority is set. */
export function donorRequirementsFor(region: string, localAuthority: string): RequirementGroup[] {
  const nation = nationOfRegion(region) ?? 'England'
  const groups: RequirementGroup[] = [{ level: 'national', title: 'National', subtitle: `${nation}, before demolition`, items: [DONOR_NATIONAL[nation]] }]
  if (isLondonRegion(region)) groups.push({ level: 'london', title: 'London Plan 2021 and GLA guidance', subtitle: 'Applies across Greater London', items: DONOR_LONDON })
  const la = localAuthority.trim()
  if (la) groups.push({ level: 'local', title: la, subtitle: 'Local plan and guidance', items: donorLocalRequirements(region, la) })
  return groups
}

/** The requirement a donor building at this location tracks with this ID, or null. */
export function donorRequirementById(id: string, region: string, localAuthority: string): PlanningRequirement | null {
  for (const g of donorRequirementsFor(region, localAuthority)) for (const r of g.items) if (r.id === id) return r
  return null
}

/** The summarised entries only donor buildings track, for Help, Methodology; placeholders summarise nothing yet. */
export function donorRequirementsMethodology(): { title: string; source: string; status: 'Indicative summary' }[] {
  const all = [...Object.values(DONOR_NATIONAL), ...DONOR_LONDON].filter((r) => !r.placeholder)
  return all.map((r) => ({ title: `${r.code}, ${r.title}`, source: r.source, status: 'Indicative summary' as const }))
}
