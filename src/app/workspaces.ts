// Which workspace and tabs each persona sees (02 section 1).
import { PERSONA_IDS } from '../domain/seed/world'

export type Tab = { label: string; to: string }
export type Workspace = { title: string; subtitle: string; tabs: Tab[]; home: string; sees: string }

export const WORKSPACES: Record<string, Workspace> = {
  [PERSONA_IDS.tom]: {
    title: 'Supply',
    subtitle: 'Tiverne House',
    home: '/supply/inventory',
    sees: 'Supply workspace for Tiverne House: inventory, capture, priority, listings and privacy, offers and deals',
    tabs: [
      { label: 'Inventory', to: '/supply/inventory' },
      { label: 'Capture', to: '/supply/capture' },
      { label: 'Priority', to: '/supply/priority' },
      { label: 'Listings and privacy', to: '/supply/listings' },
      { label: 'Offers and deals', to: '/supply/offers' },
    ],
  },
  [PERSONA_IDS.dana]: {
    title: 'Supply',
    subtitle: 'Tiverne House',
    home: '/supply/capture',
    sees: 'Supply workspace for Tiverne House: inventory and capture on site',
    tabs: [
      { label: 'Inventory', to: '/supply/inventory' },
      { label: 'Capture', to: '/supply/capture' },
    ],
  },
  [PERSONA_IDS.priya]: {
    title: 'Marketplace and project',
    subtitle: 'Merrowgate Wharf',
    home: '/market',
    sees: 'Marketplace browse and listings, and the Merrowgate Wharf project: match schedule, reuse plan, deals',
    tabs: [
      { label: 'Browse', to: '/market' },
      { label: 'Match schedule', to: '/project/match' },
      { label: 'Reuse plan', to: '/project/plan' },
      { label: 'Deals', to: '/project/deals' },
    ],
  },
  [PERSONA_IDS.marcus]: {
    title: 'Compliance',
    subtitle: 'Engagements',
    home: '/compliance/project',
    sees: 'Compliance workspace: Merrowgate Wharf (project compliance, targets and the design-team summary), Durnley House (waste and reuse), and listing for Ostlea Estates at Tiverne House',
    tabs: [
      { label: 'Merrowgate Wharf', to: '/compliance/project' },
      { label: 'Design-team summary', to: '/compliance/summary' },
      { label: 'Durnley House', to: '/compliance/waste' },
      { label: 'Tiverne House, inventory', to: '/supply/inventory' },
      { label: 'Tiverne House, capture', to: '/supply/capture' },
    ],
  },
  [PERSONA_IDS.ruth]: {
    title: 'Contractor',
    subtitle: 'Merrowgate Wharf',
    home: '/contractor/bid-pack',
    sees: 'Contractor workspace for Merrowgate Wharf: the bid pack of reused items, from public fields only',
    tabs: [{ label: 'Bid pack', to: '/contractor/bid-pack' }],
  },
  [PERSONA_IDS.operator]: {
    title: 'Operator',
    subtitle: 'Platform',
    home: '/operator/ledger',
    sees: 'Operator workspace: revenue ledger and business model comparison',
    tabs: [
      { label: 'Ledger', to: '/operator/ledger' },
      { label: 'Model comparison', to: '/operator/models' },
    ],
  },
}
