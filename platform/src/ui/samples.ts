// Sample materials for the gallery, the landing page and the sign-in panel. Fictional, built from structured
// fields only, so titles match what the product shows. Availability is relative, so the pages never go stale.
import type { PublicListing, Spec } from '../domain/types'
import type { Mesh } from '../domain/engines/view3d'
import { meshFor } from '../domain/engines/geometry'
import type { ProgrammeChartProps } from './ProgrammeChart'
import type { PortfolioTimelineProps } from './charts/PortfolioTimeline'
import type { Band, Fit } from '../domain/v1types'
import { titleFor } from '../domain/reference/families'
import { BAND_WORDS, TYPOLOGY_LABELS } from '../domain/reference/labels'
import { typologyOf } from '../domain/engines/typology'

export type SampleMaterial = { publicId: string; spec: Spec; title: string; eyebrow: string; quantity: string; available: string; location: string; fit: Fit; band: Band }

export const BANDS: Record<Band['band'], Band> = {
  high: { band: 'high', segments: 3, word: BAND_WORDS.high },
  medium: { band: 'medium', segments: 2, word: BAND_WORDS.medium },
  low: { band: 'low', segments: 1, word: BAND_WORDS.low },
  none: { band: 'none', segments: 0, word: BAND_WORDS.none },
}

const FAMILY_WORDS: Record<Spec['family'], string> = {
  steel_section: 'Steel section',
  curtain_wall: 'Curtain wall',
  precast_cladding: 'Precast cladding',
  stone_cladding: 'Stone cladding',
  clay_brick: 'Clay brick',
  raised_floor: 'Raised floor',
  timber_joist: 'Timber joist',
}

function sample(publicId: string, spec: Spec, quantity: string, available: string, location: string, fit: Fit, band: Band['band']): SampleMaterial {
  return { publicId, spec, title: titleFor(spec), eyebrow: `${TYPOLOGY_LABELS[typologyOf(spec.family)]}, ${FAMILY_WORDS[spec.family].toLowerCase()}`, quantity, available, location, fit, band: BANDS[band] }
}

export const SAMPLE_MATERIALS: SampleMaterial[] = [
  sample('L-9F4CQQ', { family: 'steel_section', designation: 'UB 457x191x67', lengthM: 7.5 }, '48 pieces', 'In 5 months', 'Central London', 'in_time', 'high'),
  sample('L-A945G6', { family: 'clay_brick', brickType: 'London stock', mortar: 'lime mortar' }, '20,000 bricks', 'Available now', 'East London', 'now', 'high'),
  sample('L-DAXNV3', { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, '600 m2', 'In 3 months', 'Central London', 'in_time', 'medium'),
  sample('L-8N33X4', { family: 'curtain_wall', system: 'Unitised', panelWidthM: 1.5, panelHeightM: 3.6 }, '120 panels', 'In 8 months', 'City of London', 'tight', 'medium'),
  sample('L-PRE001', { family: 'precast_cladding', thicknessMm: 150 }, '86 panels', 'In 11 months', 'South London', 'late', 'low'),
  sample('L-33XJ8M', { family: 'raised_floor', panelSize: '600 by 600' }, '3,000 panels', 'In 4 months', 'Central London', 'in_time', 'medium'),
  sample('L-CJGQP7', { family: 'timber_joist', species: 'pitch pine' }, '140 pieces', 'Available now', 'North London', 'now', 'high'),
  sample('L-K8CGH4', { family: 'steel_section', designation: 'UC 254x254x89', lengthM: 6 }, '24 pieces', 'In 6 months', 'West London', 'in_time', 'high'),
]

// ---------- Round 2 samples for the gallery: fixed fractions and figures, as a selector would hand them over ----------

/** A sample 3D model: the meshFor engine on the first sample's public fields (family and spec only). */
export function sampleModel(spec: Spec): Mesh | null {
  const m = meshFor({ family: spec.family, spec } as Pick<PublicListing, 'family' | 'spec'> as PublicListing)
  return 'unavailable' in m ? null : (m.closeUp ?? m.mesh)
}

/** A programme for Merrowgate Wharf, 1 Sep 2025 to 30 Sep 2030, positions as fractions of the axis. */
export const SAMPLE_PROGRAMME = {
  axis: {
    ticks: [
      { iso: '2025-10-01', at: 0.0162, label: null, major: true },
      { iso: '2026-01-01', at: 0.0658, label: '2026', major: true },
      { iso: '2026-04-01', at: 0.1143, label: null, major: true },
      { iso: '2026-07-01', at: 0.1633, label: null, major: true },
      { iso: '2026-10-01', at: 0.2129, label: null, major: true },
      { iso: '2027-01-01', at: 0.2625, label: '2027', major: true },
      { iso: '2027-04-01', at: 0.3111, label: null, major: true },
      { iso: '2027-07-01', at: 0.3601, label: null, major: true },
      { iso: '2027-10-01', at: 0.4097, label: null, major: true },
      { iso: '2028-01-01', at: 0.4593, label: '2028', major: true },
      { iso: '2028-04-01', at: 0.5084, label: null, major: true },
      { iso: '2028-07-01', at: 0.5574, label: null, major: true },
      { iso: '2028-10-01', at: 0.607, label: null, major: true },
      { iso: '2029-01-01', at: 0.6566, label: '2029', major: true },
      { iso: '2029-04-01', at: 0.7051, label: null, major: true },
      { iso: '2029-07-01', at: 0.7542, label: null, major: true },
      { iso: '2029-10-01', at: 0.8038, label: null, major: true },
      { iso: '2030-01-01', at: 0.8534, label: '2030', major: true },
      { iso: '2030-04-01', at: 0.9019, label: null, major: true },
      { iso: '2030-07-01', at: 0.9509, label: null, major: true },
    ],
  },
  today: { at: 0.2162 },
  todayLabel: 'Today: stage 2, Concept Design',
  stages: [
    { stage: 0, label: 'Stage 0', name: 'Strategic Definition', from: 0, to: 0.0491, state: 'past' },
    { stage: 1, label: 'Stage 1', name: 'Preparation and Briefing', from: 0.0491, to: 0.1472, state: 'past' },
    { stage: 2, label: 'Stage 2', name: 'Concept Design', from: 0.1472, to: 0.2302, state: 'current' },
    { stage: 3, label: 'Stage 3', name: 'Spatial Coordination', from: 0.2302, to: 0.2792, state: 'future' },
    { stage: 4, label: 'Stage 4', name: 'Technical Design', from: 0.2792, to: 0.4264, state: 'future' },
    { stage: 5, label: 'Stage 5', name: 'Manufacturing and Construction', from: 0.4264, to: 0.7531, state: 'future' },
    { stage: 6, label: 'Stage 6', name: 'Handover', from: 0.7531, to: 0.9499, state: 'future' },
    { stage: 7, label: 'Stage 7', name: 'Use', from: 0.9499, to: 1, state: 'future', open: true },
  ],
  milestones: [
    { id: 'site_start', label: 'Site start', dateText: '1 Nov 2027', at: 0.4264 },
    { id: 'materials', label: 'Materials needed on site', dateText: '3 Apr 2028', at: 0.5094 },
    { id: 'completion', label: 'Practical completion', dateText: '29 Jun 2029', at: 0.7531 },
  ],
  materials: [
    { itemId: 'm1', title: 'UB 457x191x67, 7.5 m', kind: 'window', from: 0.2625, to: 0.3105, fit: 'in_time', windowText: 'Expected January to March 2027', storage: { from: 0.3111, to: 0.5094 } },
    { itemId: 'm2', title: 'Portland stone cladding, 50 mm', kind: 'window', from: 0.476, to: 0.5078, fit: 'tight', windowText: 'Expected February to March 2028', storage: null },
    { itemId: 'm3', title: 'Unitised curtain wall panels, 1.5 m by 3.6 m', kind: 'window', from: 0.5412, to: 0.5903, fit: 'late', windowText: 'Expected June to August 2028', storage: null },
    { itemId: 'm4', title: 'Clay London stock bricks, lime mortar', kind: 'now', from: 0.2162, to: 0.2162, fit: 'now', windowText: 'Available now', storage: { from: 0.2162, to: 0.5094 } },
  ],
  description:
    'Programme for Merrowgate Wharf. Today is in stage 2, Concept Design. Site start 1 Nov 2027, materials needed on site from 3 Apr 2028, practical completion 29 Jun 2029. UB 457x191x67 expected January to March 2027, in time. Portland stone cladding expected February to March 2028, tight. Curtain wall panels expected June to August 2028, late. London stock bricks available now.',
} as const satisfies Omit<ProgrammeChartProps, 'emptyText' | 'emptyAction' | 'className' | 'testId'>

/** Two projects on one axis, 1 Apr 2026 to 30 Sep 2028. */
export const SAMPLE_PORTFOLIO = {
  ticks: [
    { iso: '2026-07-01', at: 0.0997, label: 'Jul 2026' },
    { iso: '2027-01-01', at: 0.3012, label: 'Jan 2027' },
    { iso: '2027-07-01', at: 0.4995, label: 'Jul 2027' },
    { iso: '2028-01-01', at: 0.701, label: 'Jan 2028' },
    { iso: '2028-07-01', at: 0.9003, label: 'Jul 2028' },
  ],
  today: 0.207,
  todayText: 'Today, 7 Oct 2026',
  rows: [
    {
      id: 'merrowgate',
      name: 'Merrowgate Wharf',
      href: '/app/projects/merrowgate',
      stageText: 'Stage 2, Concept Design',
      segments: [
        { stage: 1, from: 0, to: 0.0668, state: 'done' },
        { stage: 2, from: 0.0668, to: 0.233, state: 'current' },
        { stage: 3, from: 0.233, to: 0.33, state: 'ahead' },
        { stage: 4, from: 0.33, to: 0.624, state: 'ahead' },
        { stage: 5, from: 0.624, to: 1, state: 'ahead' },
      ],
      siteStart: 0.624,
      completion: null,
      materialsFrom: 0.79,
      hasProgramme: true,
      siteStartText: '1 Nov 2027',
      completionText: '29 Jun 2029',
      materialsFromText: '3 Apr 2028',
    },
    {
      id: 'sallow',
      name: 'Sallow Court',
      href: '/app/projects/sallow',
      stageText: 'Stage 3, Spatial Coordination',
      segments: [],
      siteStart: null,
      completion: null,
      materialsFrom: 0.43,
      hasProgramme: false,
      materialsFromText: '1 May 2027',
    },
  ],
} as const satisfies Omit<PortfolioTimelineProps, 'className' | 'testId' | 'emptyText'>

/**
 * The architect home as the landing page's product shot draws it: Priya Nair at Studio Oriel on 7 October 2026.
 * Fixed sample figures in the fictional world, handed over the way a selector would; nothing here is computed.
 */
export const SAMPLE_DASHBOARD = {
  org: { name: 'Studio Oriel', type: 'Architecture practice' },
  person: 'Priya Nair',
  greeting: 'Good morning, Priya',
  dateText: 'Wednesday 7 October 2026',
  nav: {
    main: [
      { key: 'home', label: 'Home', active: true },
      { key: 'marketplace', label: 'Marketplace', active: false },
      { key: 'saved', label: 'Saved', active: false, count: 3 },
    ],
    projects: ['Ferrymoor Yard', 'Merrowgate Wharf', 'Sallow Court'],
  },
  // Figures only: the landing shot takes the tile names and the shortlist segments from the real architect home.
  metrics: {
    active: { value: '3', sub: 'Next start on site 3 April 2028, Merrowgate Wharf' },
    shortlisted: { value: '13', sub: 'Shortlisted, waiting or approved', values: { pending: 6, sent: 3, approved: 4 } },
    carbon: { value: '41.0', unit: 'tCO2e', sub: 'On approved materials, against buying new', ring: { value: 41, max: 96.4, valueText: '41.0 of 96.4 tCO2e', centre: '43%' } },
    waiting: { value: '3', state: 'warning', stateLabel: 'Over a week', sub: 'Oldest sent 9 days ago' },
  },
  projects: [
    {
      id: 'sample-merrowgate',
      name: 'Merrowgate Wharf',
      client: 'Lantern Quay Developments',
      projectType: 'office',
      typeText: 'Office',
      stage: 2,
      newFits: '3 new materials fit',
      families: ['steel_section', 'steel_section', 'stone_cladding', 'curtain_wall'],
      materials: [0, 2, 3],
    },
    {
      id: 'sample-sallow',
      name: 'Sallow Court',
      client: 'Pellory Estates',
      projectType: 'hotel',
      typeText: 'Hotel',
      stage: 1,
      newFits: '1 new material fits',
      families: ['clay_brick', 'clay_brick', 'timber_joist', 'raised_floor'],
      materials: [1, 6, 5],
    },
    {
      id: 'sample-ferrymoor',
      name: 'Ferrymoor Yard',
      client: 'Quillon Homes',
      projectType: 'residential',
      typeText: 'Residential',
      stage: 3,
      newFits: '2 new materials fit',
      families: ['clay_brick', 'clay_brick', 'precast_cladding', 'steel_section'],
      materials: [1, 4, 7],
    },
  ],
} as const
