// Allowed names (06-DATA.md section A11). The scan script reads this module.
// Group 1: the fictional world.
export const ALLOWED_ORGANISATIONS = [
  'Tallyard',
  'Ostlea Estates',
  'Tarnbrook Deconstruction',
  'Studio Oriel',
  'Lantern Quay Developments',
  'Halewick Sustainability',
  'Pellory Estates',
  'Corvane Insurance',
  'Meridale Partners',
] as const

export const ALLOWED_PEOPLE = ['Tom Ashby', 'Dana Kowalski', 'Priya Nair', 'Marcus Lindqvist'] as const

export const ALLOWED_PLACES = ['Tiverne House', '14 Garnet Row', 'Merrowgate Wharf', 'Durnley House'] as const

export const ALLOWED_PARTNERS = [
  'Open yard, Barking',
  'Covered store, Park Royal',
  'Open yard, Tilbury',
  'Haulier A',
  'Haulier B',
  'Haulier C',
  'the testing partner',
] as const

// Group 2: standards bodies and publications that may be named as sources.
export const ALLOWED_SOURCES = [
  'SCI',
  'BCSA',
  'RICS',
  'BREEAM',
  'BRE',
  'LEED',
  'ICE database',
  'IStructE',
  'London Plan',
  'Greater London Authority',
  'European Waste Catalogue',
  'RIBA',
  'NRM',
] as const

// Group 3: the generic facility names in the sample bill (C1).
export const ALLOWED_FACILITIES = [
  'Aggregate recycler, Essex',
  'Retained on site',
  'Reclamation yard, Kent',
  'Steel stockholder, East London',
  'Metal recycler, Thames Estuary',
  'Facade contractor, Midlands',
  'Glass recycler, Yorkshire',
  'Stone merchant, Dorset',
  'Biomass plant, Kent',
  'Gypsum recycler, Midlands',
  'Flooring reseller, London',
  'Energy from waste plant, South London',
  'Landfill, Essex',
  'Hazardous waste landfill, Northamptonshire',
] as const

// Real company names that must never be introduced. The scan script fails on any of these.
export const DENIED_NAMES = [
  'Cleveland Steel',
  'British Steel',
  'Tata Steel',
  'Arup',
  'Mace',
  'Skanska',
  'Balfour Beatty',
  'Laing O',
  'Multiplex',
  'Lendlease',
  'Land Securities',
  'British Land',
  'Great Portland',
  'Derwent',
  'Grosvenor',
  'Canary Wharf Group',
  'Foster + Partners',
  'Rogers Stirk',
  'Zaha Hadid',
  'Buro Happold',
  'AECOM',
  'WSP',
  'Atkins',
  'Jacobs',
  'Mott MacDonald',
  'Keltbray',
  'McGee',
  'Erith',
  'Cantillon',
  'Squibb',
  'Globechain',
  'Enviromate',
  'Material Index',
  'Excess Materials Exchange',
  'Salvo',
  'Rotor',
  'Concular',
  'Madaster',
  'Qflow',
  'Biffa',
  'Veolia',
  'Suez',
  'Powerday',
  'Bywaters',
] as const
