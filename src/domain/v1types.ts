// Version 1.0 types shared by the engines, the seed, the store and the screens (brief/09-V1-PRODUCT.md).
import type { Condition, FamilyId } from './types'

/** Browse grouping agreed on the calls: structure, envelope, finishes. */
export type Typology = 'structure' | 'envelope' | 'finishes'

export type ProjectType = 'office' | 'hotel' | 'residential' | 'other'

/** The five steps of the UK decision tree. Version 1.0 assigns reuse, downcycle and recycle. */
export type DecisionRoute = 'reuse' | 'upcycle' | 'downcycle' | 'recycle' | 'scrap'

/** Timeline check of a listing's public availability against a project's start date. */
export type Fit = 'now' | 'in_time' | 'tight' | 'late'
export type TimelineFit = { fit: Fit; storageMonths: number | null; text: string }

/** Indicative sustainability band from the avoided carbon share. */
export type BandLevel = 'high' | 'medium' | 'low' | 'none'
export type Band = { band: BandLevel; segments: 0 | 1 | 2 | 3; word: string }

/** Wish lists: one per project, plus one general list (projectId null) per architect practice. */
export type WishStatus = 'pending' | 'sent' | 'approved' | 'declined'

export type WishlistItem = {
  id: string
  publicId: string
  addedOn: string
  addedByPersonaId: string
  note: string
  status: WishStatus
  decidedOn: string | null
  decisionNote: string | null
}

export type Wishlist = { id: string; orgId: string; projectId: string | null; items: WishlistItem[] }

export type WishTotals = { count: number; massT: number; avoidedT: number }

/** Browse filters. Every field null means no filter. `fitsStartDate` keeps listings that are not late for that date. */
export type BrowseFilters = {
  typology: Typology | null
  family: FamilyId | null
  /** Keep listings available now or from a window starting on or before this ISO date. */
  availableBy: string | null
  condition: Condition | null
  region: string | null
  band: BandLevel | null
  fitsStartDate: string | null
}

export type BrowseSort = 'newest' | 'carbon' | 'price'

export const NO_FILTERS: BrowseFilters = { typology: null, family: null, availableBy: null, condition: null, region: null, band: null, fitsStartDate: null }

/** A generated geometry file, or the reason it cannot be generated. */
export type GeometryFile = { kind: 'file'; filename: string; mime: string; text: string } | { kind: 'unavailable'; reason: string }

export type SpecRow = { section: string; label: string; value: string }

export type SpecBlock = { publicId: string; title: string; status: WishStatus; rows: SpecRow[] }

export type SpecSheet = { title: string; projectLine: string; caveats: string[]; blocks: SpecBlock[] }
