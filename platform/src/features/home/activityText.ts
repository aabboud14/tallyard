// The one line a closed Recent activity panel shows: how many updates and the latest.
import type { ActivitySummary } from '../../store/selectors/dashboard'

export function activitySummaryText(summary: ActivitySummary): string {
  if (!summary.latest || summary.count === 0) return 'No activity yet'
  const n = `${summary.count} ${summary.count === 1 ? 'update' : 'updates'}`
  // "Yesterday" starts a sentence elsewhere; mid-line it reads in lower case. Dates keep their capitals.
  const when = summary.latest.timeAgo === 'Yesterday' ? 'yesterday' : summary.latest.timeAgo
  return `${n}. Latest, ${when}: ${summary.latest.actor} ${summary.latest.text}`
}
