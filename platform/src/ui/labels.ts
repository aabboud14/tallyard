// Words and tones for statuses and timeline fits, shared by pills, legends and tables.
import type { LucideIcon } from 'lucide-react'
import { CalendarCheck, CalendarX, Clock, PackageCheck } from 'lucide-react'
import type { Fit } from '../domain/v1types'

export type Tone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger'

/** Shortlist status. `pending` is the domain's word for shortlisted. */
export type ItemStatus = 'shortlisted' | 'pending' | 'sent' | 'approved' | 'declined'

export const STATUS: Record<ItemStatus, { tone: Tone; label: string }> = {
  shortlisted: { tone: 'neutral', label: 'Shortlisted' },
  pending: { tone: 'neutral', label: 'Shortlisted' },
  sent: { tone: 'info', label: 'Sent to client' },
  approved: { tone: 'brand', label: 'Approved' },
  declined: { tone: 'danger', label: 'Declined' },
}

export function statusLabel(status: ItemStatus): string {
  return STATUS[status].label
}

export const FIT: Record<Fit, { tone: Tone; label: string; icon: LucideIcon }> = {
  in_time: { tone: 'brand', label: 'In time', icon: CalendarCheck },
  tight: { tone: 'warning', label: 'Tight', icon: Clock },
  late: { tone: 'danger', label: 'Late', icon: CalendarX },
  now: { tone: 'neutral', label: 'Available now', icon: PackageCheck },
}

export function fitLabel(fit: Fit): string {
  return FIT[fit].label
}


/** Named avatar colours a person can choose in their profile. */
export const AVATAR_COLOUR_NAMES = ['forest', 'blue', 'amber', 'rose', 'violet', 'slate', 'teal'] as const
export type AvatarColourName = (typeof AVATAR_COLOUR_NAMES)[number]
