// Words, tones and icons for the owner's and surveyor's building screens.
import type { LucideIcon } from 'lucide-react'
import { Globe, Lock, Users } from 'lucide-react'
import type { Visibility } from '../../domain/types'
import type { SurveyStatus } from '../../store'
import type { Segment, Tone } from '../../ui'

export const SURVEY_TONE: Record<SurveyStatus, Tone> = { not_started: 'neutral', in_progress: 'warning', submitted: 'brand' }

export const VISIBILITY_SHORT: Record<Visibility, string> = { private: 'Private', matched_only: 'Shared', open: 'Published' }

export const VISIBILITY_TONE: Record<Visibility, Tone> = { private: 'neutral', matched_only: 'info', open: 'brand' }

export const VISIBILITY_ICON: Record<Visibility, LucideIcon> = { private: Lock, matched_only: Users, open: Globe }

export const VISIBILITY_HELP: Record<Visibility, string> = {
  private: 'Only your organisation and your surveyor see it.',
  matched_only: 'Visible in confidence to the projects you allow in Sharing.',
  open: 'Anyone on the marketplace can find it. Your building is never named.',
}

/** The building's lots by visibility, for a segmented bar. */
export function visibilitySegments(counts: Record<Visibility, number>): Segment[] {
  return [
    { key: 'open', label: 'Published', count: counts.open, tone: 'brand' },
    { key: 'matched_only', label: 'Shared', count: counts.matched_only, tone: 'info' },
    { key: 'private', label: 'Private', count: counts.private, tone: 'neutral' },
  ]
}

export const CONDITION_TEXT: Record<'A' | 'B' | 'C', { label: string; text: string }> = {
  A: { label: 'Good', text: 'Sound, with light surface wear only.' },
  B: { label: 'Fair', text: 'Wear or minor damage that needs some work before reuse.' },
  C: { label: 'Poor', text: 'Significant damage, corrosion or decay. Limited reuse.' },
}

export const RECOVERABILITY_TEXT: Record<'A' | 'B' | 'C', { label: string; text: string }> = {
  A: { label: 'Comes out intact', text: 'Bolted or mechanically fixed. Standard tools.' },
  B: { label: 'With care', text: 'Welded, bonded or bedded. Cutting or extra labour.' },
  C: { label: 'Unlikely intact', text: 'Cast in or heavily fixed. Likely damaged on removal.' },
}
