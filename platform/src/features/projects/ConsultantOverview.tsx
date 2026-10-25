// The consultant's part of the project overview (audit note 42): the project against its targets, the circular
// economy statement, each scheme's certification snapshot and the requirements at risk, above the programme. It
// reuses the Sustainability tab's sections, built from sustainabilityView, so the two pages read alike (P2). The
// client's shortlist and approval counts are left out for the consultant.
import { selectors, useView } from '../../store'
import { Metrics, RequirementsRollup, Schemes, StatementCard, Targets } from '../sustainability/Sustainability'

export function ConsultantOverview({ projectId }: { projectId: string }) {
  const v = useView(selectors.sustainabilityView, projectId)
  if (!v || v.side !== 'consultant') return null
  return (
    <section aria-label="Against the targets" className="flex min-w-0 flex-col gap-8" data-testid="consultant-overview">
      <Metrics v={v} />
      <StatementCard v={v} projectId={projectId} />
      <Targets v={v} />
      <Schemes v={v} />
      <RequirementsRollup v={v} />
    </section>
  )
}
