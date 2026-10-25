// The words on the landing page, in one place so the page and its tests read the same strings. British English,
// sentence case, no dashes or arrows (P6). The facts are true of the product, not sample figures.

export const HERO = {
  title: 'Reuse the buildings coming down in the buildings going up',
  text: 'is the workspace for reclaimed structural and facade materials. Owners list what their buildings hold, architects shortlist and specify it, clients approve and reserve it.',
  sandbox: 'Free sandbox with sample data. Nothing leaves your browser.',
} as const

/** The accessible name of the hero drawing. */
export const SCENE_LABEL = 'Drawing of a building coming down and a building going up, sharing steel, stone and brick'

/** Captions under the three parts of the hero drawing. */
export const SCENE_CAPTIONS = { donor: 'Coming down', yard: 'Stored and tested', proposed: 'Going up' } as const

/** The facts band: a figure and one line each. */
export const LANDING_FACTS = [
  { key: 'workspaces', figure: '5 workspaces', line: 'One for each role on a project' },
  { key: 'families', figure: '7 material families', line: 'Steel, stone, brick, curtain wall, precast, raised floors and timber' },
  { key: 'typologies', figure: '3 typologies', line: 'Structure, envelope and finishes' },
  { key: 'indicative', figure: 'Every figure indicative', line: 'With each factor and its source in the methodology' },
] as const

export type LandingRoleKey = 'architect' | 'client' | 'owner' | 'surveyor' | 'consultant'

export const LANDING_ROLES: readonly { key: LandingRoleKey; role: string; line: string; tools: readonly string[] }[] = [
  { key: 'architect', role: 'Architects', line: 'Browse a curated marketplace of reclaimed stock, shortlist it per project and export the specification.', tools: ['Marketplace', 'Shortlist', 'Specification'] },
  { key: 'client', role: 'Clients and developers', line: 'Approve what your architect proposes and reserve it, with an indicative package for storage, testing and transport.', tools: ['Approvals', 'Reservations'] },
  { key: 'owner', role: 'Donor buildings', line: 'Know what your buildings hold, decide what is visible, to whom and from when, and source materials for your new projects.', tools: ['Inventory', 'Recovery plan', 'Sharing'] },
  { key: 'surveyor', role: 'Site surveyors', line: 'Capture each item on site from a phone: photos, grades, quantities and when it comes out.', tools: ['Capture', 'Inventory'] },
  { key: 'consultant', role: 'Sustainability consultants', line: 'Set the targets, prove the avoided carbon and reused content, and write the circular economy statement.', tools: ['Sustainability', 'Goals and targets', 'Compliance'] },
]

export const LANDING_STEPS = [
  { n: '01', title: 'Capture and decide', text: 'Surveyors capture each item on site. Owners rank what to recover and choose what is private, shared with selected projects or published.' },
  { n: '02', title: 'Find and shortlist', text: 'Architects browse real stock, see at a glance whether it arrives in time for the start on site, and shortlist it to the project.' },
  { n: '03', title: 'Approve and reserve', text: 'Clients approve what the architect sends and request a reservation. The owner sees a blind request, and names are shared only once it is accepted.' },
] as const

export const LANDING_PRINCIPLES = [
  { key: 'timing', title: 'Timing first', text: 'Every material shows when it comes out and whether that fits your start on site: in time, tight or late.' },
  { key: 'private', title: 'Private by default', text: 'Owners choose who sees what. Buyers and sellers see each other only once a reservation is accepted.' },
  { key: 'honest', title: 'Honest numbers', text: 'Avoided carbon and price guides are marked indicative, with every factor and its source in the methodology.' },
] as const

export const LANDING_CTA = {
  title: 'Step into the sandbox',
  text: 'Sign in as an architect, a client, a donor building owner, a surveyor or a consultant in one click, and follow a material from survey to reservation.',
} as const
