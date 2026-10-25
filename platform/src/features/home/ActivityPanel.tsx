// Recent activity on every dashboard: one collapsible panel, closed by default and remembered per panel id in this
// browser. While closed it reads as one line: how many updates and the latest. Open, it shows the compact feed.
import { Activity } from 'lucide-react'
import type { ActivityRow } from '../../store/selectors/common'
import type { ActivitySummary } from '../../store/selectors/dashboard'
import { CollapsiblePanel } from '../../ui'
import { ActivityFeed } from '../notifications/kit'
import { activitySummaryText } from './activityText'

export type ActivityPanelProps = {
  /** home-activity-architect, home-activity-owner and so on. */
  panelId: string
  rows: ActivityRow[]
  summary: ActivitySummary
  /** Shown in the open panel when nothing has happened yet. */
  emptyText: string
  testId?: string
  className?: string
}

export function ActivityPanel({ panelId, rows, summary, emptyText, testId = 'activity-panel', className }: ActivityPanelProps) {
  return (
    <CollapsiblePanel id={panelId} title="Recent activity" icon={Activity} count={summary.count > 0 ? summary.count : undefined} summary={activitySummaryText(summary)} testId={testId} toggleTestId="activity-toggle" className={className}>
      <ActivityFeed rows={rows} compact emptyText={emptyText} testId="activity-feed" />
    </CollapsiblePanel>
  )
}
