// Local authorities by the product's regions, for the location dropdowns. Real places, named only as references
// for location and policy, never as actors. London follows the ONS split of Inner and Outer London (Haringey and
// Newham inner, Greenwich outer), with Central London as the seven inner authorities around the centre and each
// half split east and west. Outside London the regions are the English regions, then Wales and Scotland.

export const LONDON_REGIONS = ['Central London', 'Inner London East', 'Inner London West', 'Outer London East', 'Outer London West'] as const

/** The English regions outside London, in the order the dropdown lists them. */
export const ENGLISH_REGIONS = ['South East', 'East of England', 'East Midlands', 'West Midlands', 'North West', 'North East', 'Yorkshire and the Humber', 'South West'] as const

/** Wales and Scotland: national requirements there are not yet summarised in the product. */
export const DEVOLVED_REGIONS = ['Wales', 'Scotland'] as const

export type Nation = 'England' | 'Wales' | 'Scotland'

/** Local authorities by product region. Real places, named as references only. */
export const LOCAL_AUTHORITIES: Record<string, readonly string[]> = {
  'Central London': ['City of London', 'Westminster', 'Camden', 'Islington', 'Kensington and Chelsea', 'Lambeth', 'Southwark'],
  'Inner London East': ['Hackney', 'Haringey', 'Tower Hamlets', 'Newham', 'Lewisham'],
  'Inner London West': ['Hammersmith and Fulham', 'Wandsworth'],
  'Outer London East': ['Barking and Dagenham', 'Bexley', 'Bromley', 'Croydon', 'Enfield', 'Greenwich', 'Havering', 'Redbridge', 'Waltham Forest'],
  'Outer London West': ['Barnet', 'Brent', 'Ealing', 'Harrow', 'Hillingdon', 'Hounslow', 'Kingston upon Thames', 'Merton', 'Richmond upon Thames', 'Sutton'],
  'South East': ['Brighton and Hove', 'Canterbury', 'Guildford', 'Medway', 'Milton Keynes', 'Oxford', 'Portsmouth', 'Reading', 'Southampton', 'Woking'],
  'East of England': ['Basildon', 'Cambridge', 'Chelmsford', 'Colchester', 'Ipswich', 'Luton', 'Norwich', 'Peterborough', 'Southend-on-Sea', 'Thurrock'],
  'East Midlands': ['Charnwood', 'Chesterfield', 'Derby', 'Leicester', 'Lincoln', 'Mansfield', 'North Northamptonshire', 'Nottingham', 'Rushcliffe', 'West Northamptonshire'],
  'West Midlands': ['Birmingham', 'Coventry', 'Dudley', 'Herefordshire', 'Sandwell', 'Solihull', 'Stoke-on-Trent', 'Walsall', 'Wolverhampton', 'Worcester'],
  'North West': ['Bolton', 'Cheshire East', 'Lancaster', 'Liverpool', 'Manchester', 'Preston', 'Salford', 'Stockport', 'Trafford', 'Warrington'],
  'North East': ['County Durham', 'Darlington', 'Gateshead', 'Middlesbrough', 'Newcastle upon Tyne', 'North Tyneside', 'Northumberland', 'South Tyneside', 'Stockton-on-Tees', 'Sunderland'],
  'Yorkshire and the Humber': ['Bradford', 'Calderdale', 'Doncaster', 'Kingston upon Hull', 'Kirklees', 'Leeds', 'Rotherham', 'Sheffield', 'Wakefield', 'York'],
  'South West': ['Bath and North East Somerset', 'Bristol', 'Cheltenham', 'Cornwall', 'Exeter', 'Gloucester', 'Plymouth', 'Swindon', 'Wiltshire'],
  Wales: ['Bridgend', 'Caerphilly', 'Cardiff', 'Carmarthenshire', 'Gwynedd', 'Newport', 'Rhondda Cynon Taf', 'Swansea', 'Vale of Glamorgan', 'Wrexham'],
  Scotland: ['Aberdeen', 'Dundee', 'Edinburgh', 'Fife', 'Glasgow', 'Highland', 'Perth and Kinross', 'Renfrewshire', 'South Lanarkshire', 'Stirling'],
}

/** The longest typed local authority name accepted outside London. */
export const LOCAL_AUTHORITY_MAX = 80

export function isLondonRegion(region: string): boolean {
  return (LONDON_REGIONS as readonly string[]).includes(region)
}

/** The nation a product region sits in, or null for an unknown region. */
export function nationOfRegion(region: string): Nation | null {
  if (isLondonRegion(region) || (ENGLISH_REGIONS as readonly string[]).includes(region)) return 'England'
  if (region === 'Wales' || region === 'Scotland') return region
  return null
}

/** The authorities listed for a region; [] for an unknown region. */
export function localAuthoritiesFor(region: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(LOCAL_AUTHORITIES, region) ? LOCAL_AUTHORITIES[region] : []
}

/** Words a typed council name often carries around the place name, tried in order once an exact match fails. */
const COUNCIL_PREFIXES = ['london borough of ', 'royal borough of ', 'city and county of ', 'city of ', 'borough of ']
const COUNCIL_SUFFIXES = [' metropolitan borough council', ' borough council', ' district council', ' county council', ' city council', ' council']

function squeeze(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function listedByKey(key: string): string | null {
  for (const las of Object.values(LOCAL_AUTHORITIES)) for (const la of las) if (la.toLowerCase() === key) return la
  return null
}

/**
 * The listed spelling of a typed authority, or null when it is not listed. Case and runs of spaces do not matter,
 * and the council words around a name are tried off: 'westminster' and 'Westminster City Council' are Westminster.
 */
export function listedLocalAuthority(typed: string): string | null {
  const key = squeeze(typed).toLowerCase()
  if (!key) return null
  const exact = listedByKey(key)
  if (exact) return exact
  let bare = key
  for (const s of COUNCIL_SUFFIXES) if (bare.endsWith(s)) bare = bare.slice(0, -s.length)
  for (const p of COUNCIL_PREFIXES) if (bare.startsWith(p)) bare = bare.slice(p.length)
  return bare && bare !== key ? listedByKey(bare) : null
}

/** The authority as stored: the listed spelling when it is listed, otherwise the typed name with its spaces tidied. */
export function normaliseLocalAuthority(localAuthority: string): string {
  return listedLocalAuthority(localAuthority) ?? squeeze(localAuthority)
}

/**
 * '' is always valid. A listed authority, however it is typed, is valid only in its own region, so a London borough
 * typed under another region is refused. A London region needs one of its own authorities. Other regions also accept
 * a typed name that is not listed, of 80 characters or fewer.
 */
export function isValidLocalAuthority(region: string, localAuthority: string): boolean {
  const la = squeeze(localAuthority)
  if (la === '') return true
  const listed = listedLocalAuthority(la)
  if (listed) return localAuthoritiesFor(region).includes(listed)
  if (isLondonRegion(region)) return false
  return la.length <= LOCAL_AUTHORITY_MAX
}

/** The product region a listed authority belongs to, or null for a name that is not listed. */
export function regionOfLocalAuthority(localAuthority: string): string | null {
  for (const [region, las] of Object.entries(LOCAL_AUTHORITIES)) if (las.includes(localAuthority)) return region
  return null
}

/** Every authority above, for names.ts. */
export const ALL_REFERENCE_PLACES: readonly string[] = Object.values(LOCAL_AUTHORITIES).flat()

export type PlaceGroup<T> = { label: string; items: T[] }

/** The regions for a dropdown, grouped London, the rest of England, then Wales and Scotland. */
export function regionGroups(regions: readonly string[]): PlaceGroup<string>[] {
  const of = (list: readonly string[]) => regions.filter((r) => list.includes(r))
  return [
    { label: 'London', items: of(LONDON_REGIONS) },
    { label: 'England outside London', items: of(ENGLISH_REGIONS) },
    { label: 'Wales and Scotland', items: of(DEVOLVED_REGIONS) },
  ].filter((g) => g.items.length > 0)
}

/** Every listed authority grouped by its region, the given region first, then the dropdown order of the regions. */
export function localAuthorityGroups(first: string, regions: readonly string[]): PlaceGroup<string>[] {
  const order = [...regions.filter((r) => r === first), ...regions.filter((r) => r !== first)]
  return order.map((r) => ({ label: r, items: [...localAuthoritiesFor(r)] })).filter((g) => g.items.length > 0)
}

/** A line under the region dropdown: the London boroughs it covers, or what is not yet summarised in Wales and Scotland. */
export function regionHint(region: string): string | null {
  if (isLondonRegion(region)) {
    const las = localAuthoritiesFor(region)
    const list = las.length > 1 ? `${las.slice(0, -1).join(', ')} and ${las[las.length - 1]}` : (las[0] ?? '')
    return `Covers ${list}.`
  }
  const nation = nationOfRegion(region)
  if (nation === 'Wales' || nation === 'Scotland') return `National requirements for ${nation} are not yet summarised. UK standards and certifications are listed.`
  return null
}
