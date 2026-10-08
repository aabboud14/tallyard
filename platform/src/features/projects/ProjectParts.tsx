// Pieces shared by the project screens and the homes: shortlist progress by status and an activity feed.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { WishStatus } from '../../domain/v1types'
import type { ActivityRow } from '../../store/selectors/common'
import { Avatar, SegmentedBar } from '../../ui'
import { Page } from '../../app/Page'

const PROGRESS = [
  { key: 'pending', label: 'shortlisted', name: 'Shortlisted', tone: 'neutral' },
  { key: 'sent', label: 'with client', name: 'With client', tone: 'info' },
  { key: 'approved', label: 'approved', name: 'Approved', tone: 'brand' },
  { key: 'declined', label: 'declined', name: 'Declined', tone: 'danger' },
] as const

const DOT: Record<(typeof PROGRESS)[number]['tone'], string> = { neutral: 'bg-[#cdc8c4]', info: 'bg-[#4f7fe8]', brand: 'bg-[#2d8064]', danger: 'bg-[#c94a43]' }

/** The shortlist by status as one bar, with the counts that are not zero beneath it. */
export function ProjectProgress({ counts, total, size = 'md' }: { counts: Record<WishStatus, number>; total: number; size?: 'sm' | 'md' }) {
  const shown = PROGRESS.filter((p) => counts[p.key] > 0)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SegmentedBar label="Shortlist by status" size={size} legend={false} segments={PROGRESS.map((p) => ({ key: p.key, label: p.name, count: counts[p.key], tone: p.tone }))} />
      <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-xs text-muted">
        {total === 0 || shown.length === 0 ? (
          <li>Nothing shortlisted yet</li>
        ) : (
          shown.map((p) => (
            <li key={p.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT[p.tone]}`} />
              <span className="font-medium tabular-nums text-ink">{counts[p.key]}</span> {p.label}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export function ActivityFeed({ rows, empty = 'Nothing has happened yet.' }: { rows: ActivityRow[]; empty?: string }) {
  if (rows.length === 0) return <p className="m-0 px-5 py-6 text-sm text-muted">{empty}</p>
  return (
    <ol className="m-0 list-none p-0" data-testid="activity-feed">
      {rows.map((r, i) => (
        <li key={r.id} className="relative flex gap-3 px-4 py-3 sm:px-5">
          {i < rows.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[31px] top-11 w-px bg-line-soft sm:left-[35px]" /> : null}
          <Avatar name={r.actor} size="sm" decorative className="mt-0.5" />
          <div className="min-w-0 flex-1 text-sm leading-5">
            <p className="m-0 text-ink-soft">
              <span className="font-medium text-ink">{r.actor}</span> {r.href ? <Link to={r.href} className="hover:text-ink hover:underline hover:underline-offset-2">{r.text}</Link> : r.text}
            </p>
            <p className="m-0 mt-0.5 text-xs text-faint">{r.timeAgo}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** The content frame under the project header. */
export function ProjectPage({ children, testId, width = 'default' }: { children: ReactNode; testId?: string; width?: 'default' | 'wide' }) {
  return (
    <Page width={width} className="lg:pt-7" testId={testId}>
      {children}
    </Page>
  )
}
