// Local authorities by the product's regions, for the project location dropdowns. Real places, named only as
// references for location and policy, never as actors. The London grouping is the product's own and is indicative.

export const LONDON_REGIONS = ['Central London', 'Inner London East', 'Inner London West', 'Outer London East', 'Outer London West'] as const

/** Local authorities by product region. The London grouping is the product's own and is indicative. Real places, named as references only. */
export const LOCAL_AUTHORITIES: Record<string, readonly string[]> = {
  'Central London': ['City of London', 'Westminster', 'Camden', 'Islington', 'Kensington and Chelsea', 'Lambeth', 'Southwark'],
  'Inner London East': ['Hackney', 'Haringey', 'Tower Hamlets', 'Newham', 'Lewisham', 'Greenwich'],
  'Inner London West': ['Hammersmith and Fulham', 'Wandsworth', 'Brent', 'Merton'],
  'Outer London East': ['Barking and Dagenham', 'Havering', 'Redbridge', 'Waltham Forest', 'Enfield', 'Bexley', 'Bromley', 'Croydon'],
  'Outer London West': ['Ealing', 'Hounslow', 'Hillingdon', 'Harrow', 'Barnet', 'Richmond upon Thames', 'Kingston upon Thames', 'Sutton'],
  'South East': ['Brighton and Hove', 'Canterbury', 'Guildford', 'Medway', 'Milton Keynes', 'Oxford', 'Portsmouth', 'Reading', 'Southampton', 'Woking'],
  'East of England': ['Basildon', 'Cambridge', 'Chelmsford', 'Colchester', 'Ipswich', 'Luton', 'Norwich', 'Peterborough', 'Southend-on-Sea', 'Thurrock'],
}

/** The longest typed local authority name accepted outside London. */
export const LOCAL_AUTHORITY_MAX = 80

export function isLondonRegion(region: string): boolean {
  return (LONDON_REGIONS as readonly string[]).includes(region)
}

/** The authorities listed for a region; [] for an unknown region. */
export function localAuthoritiesFor(region: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(LOCAL_AUTHORITIES, region) ? LOCAL_AUTHORITIES[region] : []
}

/** '' is always valid. A London region needs one of its own authorities. Other regions also accept any typed name of 80 characters or fewer. */
export function isValidLocalAuthority(region: string, localAuthority: string): boolean {
  const la = localAuthority.trim()
  if (la === '') return true
  if (isLondonRegion(region)) return localAuthoritiesFor(region).includes(la)
  return la.length <= LOCAL_AUTHORITY_MAX
}

/** The product region a listed authority belongs to, or null for a name that is not listed. */
export function regionOfLocalAuthority(localAuthority: string): string | null {
  for (const [region, las] of Object.entries(LOCAL_AUTHORITIES)) if (las.includes(localAuthority)) return region
  return null
}

/** Every authority above, for names.ts. */
export const ALL_REFERENCE_PLACES: readonly string[] = Object.values(LOCAL_AUTHORITIES).flat()
