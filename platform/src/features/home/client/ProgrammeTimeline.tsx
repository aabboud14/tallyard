// The programme across the client's projects: one time axis, a row per project with its RIBA stages, site start,
// practical completion and materials needed from, and the line for today. Positions come from the store.
import type { ClientHomeView } from '../../../store/selectors/sustainability-screens'
import { ChartFrame, EmptyState, PortfolioTimeline } from '../../../ui'

export function ProgrammeTimeline({ t }: { t: ClientHomeView['timeline'] }) {
  if (t.rows.length === 0)
    return (
      <section aria-label="Programme across your projects" className="rounded-lg border border-line bg-surface">
        <EmptyState illustration="project" title="No projects yet" text="When an architect adds your organisation as the client, the programme appears here." />
      </section>
    )
  return (
    <ChartFrame
      title="Programme across your projects"
      description="RIBA stages, site start and practical completion on one time line, with when materials are needed on site."
      titleAs="h2"
      testId="client-programme"
      table={{
        columns: ['Project', 'Stage', 'Site start', 'Practical completion', 'Materials needed from'],
        rows: t.rows.map((r) => [r.name, r.stageText, r.siteStartDate ?? 'Not set', r.completionDate ?? 'Not set', r.materialsFromDate]),
      }}
    >
      <PortfolioTimeline
        ticks={t.ticks}
        today={t.today}
        todayText={t.todayText}
        rows={t.rows.map((r) => ({
          id: r.id,
          name: r.name,
          href: r.href,
          stageText: r.stageText,
          segments: r.segments,
          siteStart: r.siteStart,
          completion: r.completion,
          materialsFrom: r.materialsFrom,
          hasProgramme: r.hasProgramme,
          siteStartText: r.siteStartDate,
          completionText: r.completionDate,
          materialsFromText: r.materialsFromDate,
        }))}
      />
    </ChartFrame>
  )
}
