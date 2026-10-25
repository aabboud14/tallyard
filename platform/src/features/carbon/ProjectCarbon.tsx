// A project's carbon: avoided carbon and reclaimed mass by shortlist status and by typology, from the public
// listings. Indicative, against buying new, modules A1 to A4. The Sustainability tab shows it for every side.
import { useParams } from 'react-router'
import { Leaf } from 'lucide-react'
import { selectors, useView } from '../../store'
import { carbonBars, type CarbonBars } from '../../store/selectors/sustainability-screens'
import { BarList, ChartFrame, EmptyState, Legend, MARK, TYPOLOGY_VIZ, type Tone } from '../../ui'

const STATUS_TONE: Record<string, Tone> = { pending: 'neutral', sent: 'info', approved: 'brand', declined: 'danger' }
const TYPOLOGY_COLOUR: Record<string, string> = TYPOLOGY_VIZ

function colourOf(kind: 'status' | 'typology', key: string): string {
  return kind === 'status' ? MARK[STATUS_TONE[key] ?? 'neutral'] : (TYPOLOGY_COLOUR[key] ?? MARK.neutral)
}

function CarbonChart({ kind, title, description, bars, testId }: { kind: 'status' | 'typology'; title: string; description: string; bars: CarbonBars; testId: string }) {
  return (
    <ChartFrame
      title={title}
      description={description}
      indicative
      testId={testId}
      table={{ columns: [kind === 'status' ? 'Status' : 'Typology', 'Materials and mass', 'Avoided carbon'], rows: bars.items.map((it) => [it.label, it.sub, it.valueText]) }}
      legend={<Legend label={title} items={bars.items.map((it) => ({ key: it.key, label: it.label, colour: colourOf(kind, it.key), hatched: it.muted }))} />}
    >
      <BarList
        label={`Avoided carbon ${title.toLowerCase()}`}
        max={bars.max}
        ticks={bars.ticks}
        items={bars.items.map((it) => ({ key: it.key, label: it.label, sub: it.sub, value: it.value, valueText: it.valueText, colour: colourOf(kind, it.key), hatched: it.muted }))}
      />
    </ChartFrame>
  )
}

/** Carbon by status and by typology, kept under the test id project-carbon. */
export function CarbonSection() {
  const { projectId = '' } = useParams()
  const v = useView(selectors.projectCarbon, projectId)
  if (!v) return null
  if (v.empty)
    return (
      <EmptyState
        variant="card"
        illustration="materials"
        icon={Leaf}
        title="No materials on this project yet"
        text="As reclaimed materials are shortlisted, their avoided carbon and mass add up here, by status and by typology."
        testId="carbon-empty"
      />
    )
  const bars = carbonBars(v)
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2" data-testid="project-carbon">
      <CarbonChart kind="status" title="By status" description="Declined materials are shown for reference and left out of the totals." bars={bars.status} testId="carbon-by-status" />
      <CarbonChart kind="typology" title="By typology" description="Structure, envelope and finishes on the live list." bars={bars.typology} testId="carbon-by-typology" />
    </div>
  )
}
