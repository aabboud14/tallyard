// Timeline check of a listing's public availability against a project start date (brief/09-V1-PRODUCT.md section 5.4).
import type { Availability } from '../types'
import type { TimelineFit } from '../v1types'
import { DEMO_TODAY } from '../constants'
import { daysBetween, isOnOrBefore } from '../dates'
import { TIMELINE_TEXT } from '../reference/labels'
import { V1_ASSUMPTIONS } from '../reference/v1assumptions'

/** Whole months of 30 days, never below zero. */
function storageFrom(days: number): number {
  return Math.max(0, Math.ceil(days / 30))
}

export function timelineFit(availability: Availability, startDate: string, today: string = DEMO_TODAY, tightDays: number = V1_ASSUMPTIONS.timeline.tightDays): TimelineFit {
  if (availability.kind === 'now') {
    return { fit: 'now', storageMonths: storageFrom(daysBetween(today, startDate)), text: TIMELINE_TEXT.now }
  }
  if (!isOnOrBefore(availability.windowStart, startDate)) {
    return { fit: 'late', storageMonths: null, text: TIMELINE_TEXT.late }
  }
  // daysBetween(a, b) is b minus a: days from the end of the window to the start date.
  const gap = daysBetween(availability.windowEnd, startDate)
  if (gap >= tightDays) return { fit: 'in_time', storageMonths: storageFrom(gap), text: TIMELINE_TEXT.in_time }
  return { fit: 'tight', storageMonths: storageFrom(gap), text: TIMELINE_TEXT.tight }
}
