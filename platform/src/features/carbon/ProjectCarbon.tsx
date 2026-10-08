// A project's carbon: avoided carbon and reclaimed mass by shortlist status and by typology, from the public
// listings. Indicative, against buying new, modules A1 to A4.
import { Link, useParams } from 'react-router'
import { BookOpen, Leaf } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { selectors, useView } from '../../store'
import type { CarbonLine } from '../../store/selectors/project'
import { barScale } from '../../store/selectors/roles-views'
import { Card, CardHeader, cx, EmptyState, IndicativeMarker } from '../../ui'
import { Page } from '../../app/Page'
import { StatStrip } from '../notifications/kit'

const STATUS_FILL: Record<string, string> = { pending: 'fill-[#cdc8c4]', sent: 'fill-[#4f7fe8]', approved: 'fill-brand-600', declined: 'fill-[#e4b4b0]', structure: 'fill-brand-600', envelope: 'fill-brand-400', finishes: 'fill-brand-300' }

function ProjectCarbonBody() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.projectCarbon, projectId)
  if (!v) return null
  if (v.empty)
    return <EmptyState variant="page" icon={Leaf} title="No materials on this project yet" text="As reclaimed materials are shortlisted, their avoided carbon and mass add up here, by status and by typology." testId="carbon-empty" />
  const approved = v.byStatus.find((l) => l.key === 'approved')
  return (
    <div className="flex flex-col gap-6" data-testid="project-carbon">
      <StatStrip
        items={[
          { label: 'Avoided carbon, live list', value: f.number(v.total.avoidedT, 1), unit: 'tCO2e', indicative: true, sub: 'Declined left out', testId: 'carbon-total' },
          { label: 'Approved by the client', value: f.number(approved?.avoidedT ?? 0, 1), unit: 'tCO2e', sub: `${approved?.count ?? 0} materials` },
          { label: 'Reserved', value: f.number(v.reserved.avoidedT, 1), unit: 'tCO2e', sub: `${v.reserved.count} ${v.reserved.count === 1 ? 'material' : 'materials'} held` },
          { label: 'Reclaimed mass', value: f.number(v.total.massT, 1), unit: 't', sub: 'On the live list' },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <LinesCard title="By status" description="Declined materials are shown for reference and left out of the totals." lines={v.byStatus} testId="carbon-by-status" />
        <LinesCard title="By typology" description="Structure, envelope and finishes on the live list." lines={v.byTypology} testId="carbon-by-typology" />
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-line-soft bg-page/60 px-4 py-3.5 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0">{LABELS.L11}</p>
        <Link to="/app/help/methodology" className="inline-flex shrink-0 items-center gap-1.5 font-medium text-ink hover:underline">
          <BookOpen aria-hidden="true" className="size-3.5" />
          Methodology
        </Link>
      </div>
    </div>
  )
}

function LinesCard({ title, description, lines, testId }: { title: string; description: string; lines: CarbonLine[]; testId: string }) {
  const max = barScale(lines.map((l) => l.avoidedT))
  return (
    <Card data-testid={testId}>
      <CardHeader title={title} description={description} actions={<IndicativeMarker />} />
      <ul className="m-0 list-none divide-y divide-line-soft p-0">
        {lines.map((l) => (
          <li key={l.key} className={cx('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 sm:px-5', l.key === 'declined' && 'opacity-60')}>
            <div className="min-w-0">
              <p className="m-0 text-base font-medium text-ink">{l.label}</p>
              <p className="m-0 text-sm text-muted">
                {l.count} {l.count === 1 ? 'material' : 'materials'} · {f.massT(l.massT)}
              </p>
            </div>
            <p className="m-0 text-right text-base font-semibold tabular-nums text-ink">{f.carbon(l.avoidedT)}</p>
            <svg viewBox={`0 0 ${max} 6`} preserveAspectRatio="none" className="col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle" aria-hidden="true">
              <rect x="0" y="0" width={l.avoidedT} height="6" className={STATUS_FILL[l.key] ?? 'fill-brand-500'} />
            </svg>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** A tab of the project workspace, framed like the other tabs. */
export function ProjectCarbon() {
  return (
    <Page className="lg:pt-7">
      <ProjectCarbonBody />
    </Page>
  )
}

export default ProjectCarbon
