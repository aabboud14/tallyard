// Gallery sections for the round 2 components: data (metric tiles, charts, meters), the programme, thumbnails,
// empty states, the 3D view and the tracking controls. Every figure is a fixed sample from the fictional world,
// handed in as a prop the way a selector would hand it over.
import { useState, type ReactNode } from 'react'
import { Clock, Hourglass, Layers, Leaf, PiggyBank, Recycle, Wallet } from 'lucide-react'
import { Button } from './Button'
import { Card, CardBody, CardHeader, MetricStrip, StateLine } from './Card'
import { Pill, StatusPill, FitPill } from './Badge'
import { EmptyState } from './EmptyState'
import { SegmentedBar } from './Progress'
import { CollapsiblePanel } from './CollapsiblePanel'
import { ProgrammeChart } from './ProgrammeChart'
import { ModelViewer } from './ModelViewer'
import { StatementSection } from './StatementSection'
import { TrackStatusPill, TrackStatusSelect } from './Tracking'
import { ProjectThumbnail, BuildingThumbnail } from './Thumbnails'
import { BarList, ChartFrame, Donut, Legend, MetricGrid, MetricTile, PortfolioTimeline, ProgressRing, RibaStageStrip, TargetMeter } from './charts'
import { MARK, TRACK_STATUS_ORDER, TYPOLOGY_VIZ, type MetricState, type TrackStatusKey } from './labels'
import { SPOT_KINDS, type SpotKind } from './illustration/spotKinds'
import { buildingSketch, projectSketch } from '../domain/sketch'
import type { FamilyId } from '../domain/types'
import { SAMPLE_MATERIALS, SAMPLE_PORTFOLIO, SAMPLE_PROGRAMME, sampleModel } from './samples'

function Section({ id, title, children, text }: { id: string; title: string; children: ReactNode; text?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 border-t border-line pt-10">
      <h2 id={`${id}-h`} className="m-0 text-xl font-semibold text-ink">
        {title}
      </h2>
      {text ? <p className="m-0 mt-1 max-w-2xl text-base text-muted">{text}</p> : null}
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  )
}

function Row({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={className ?? 'flex flex-wrap items-center gap-3'}>{children}</div>
    </div>
  )
}

const TYPOLOGY_ROWS = [
  { key: 'structure', label: 'Structure', value: 41.2, valueText: '41.2 tCO2e', colour: TYPOLOGY_VIZ.structure },
  { key: 'envelope', label: 'Envelope', value: 5.9, valueText: '5.9 tCO2e', colour: TYPOLOGY_VIZ.envelope },
  { key: 'finishes', label: 'Finishes', value: 0.7, valueText: '0.7 tCO2e', colour: TYPOLOGY_VIZ.finishes },
]

const STATUS_ROWS = [
  { key: 'approved', label: 'Approved', value: 47.8, valueText: '47.8 tCO2e', colour: MARK.brand },
  { key: 'sent', label: 'Waiting for approval', value: 31.4, valueText: '31.4 tCO2e', colour: MARK.info },
  { key: 'pending', label: 'Shortlisted', value: 69.4, valueText: '69.4 tCO2e', colour: MARK.neutral },
  { key: 'declined', label: 'Declined', value: 12.1, valueText: '12.1 tCO2e', colour: MARK.danger, hatched: true },
]

const FACADE_FAMILIES: [string, FamilyId[]][] = [
  ['Brick', ['clay_brick']],
  ['Stone', ['stone_cladding']],
  ['Glass', ['curtain_wall']],
  ['Precast', ['precast_cladding']],
  ['Timber', ['timber_joist']],
  ['None recorded', []],
]

const SPOT_COPY: Record<SpotKind, [string, string]> = {
  project: ['No projects yet', 'Create a project to check materials against its programme.'],
  building: ['No buildings yet', 'Add a donor building to start its survey.'],
  materials: ['Nothing shortlisted yet', 'Save materials from the Marketplace to this project.'],
  inbox: ['No requests waiting', 'Reservation requests from buyers appear here.'],
  targets: ['No targets set', 'Targets start from the requirements that apply to the project.'],
  search: ['No materials match', 'Try fewer filters or a different word.'],
  activity: ['No activity yet', 'Changes to this project appear here.'],
}

function TrackingDemo() {
  const [status, setStatus] = useState<TrackStatusKey>('in_progress')
  const [text, setText] = useState('Reclaimed structural steel, Portland stone and London stock brick have been chosen for this scheme, checked against the programme and, for structural steel, against testing before specification.')
  return (
    <>
      <Row label="Status pills, every state">
        {TRACK_STATUS_ORDER.map((s) => (
          <TrackStatusPill key={s} status={s} />
        ))}
      </Row>
      <Row label="Status select">
        <TrackStatusSelect label="Status of Policy SI 7, Reducing waste and supporting the circular economy" value={status} onChange={setStatus} />
        <TrackStatusPill status={status} variant="quiet" />
      </Row>
      <Card padding="lg">
        <StatementSection id="approach" heading="Strategic approach" text={text} edited canEdit stale onSave={setText} onReset={() => setText('The design team follows the circular economy hierarchy.')} onKeep={() => undefined} />
      </Card>
    </>
  )
}

export function GalleryData() {
  const model = sampleModel(SAMPLE_MATERIALS[0].spec)
  const merrowgate = projectSketch({ id: 'p-merrowgate', name: 'Merrowgate Wharf', projectType: 'office' }, ['steel_section', 'steel_section', 'stone_cladding', 'curtain_wall', 'clay_brick'])
  const states: MetricState[] = ['good', 'warning', 'critical', 'neutral']
  return (
    <>
      <Section id="data" title="Data" text="Colour carries meaning. Tiles and meters are coloured by their state against a target, always with an icon and a word. Typology takes the first three categorical colours, in a fixed order. Every chart has a legend or a table.">
        <Row label="Metric tiles in a grid" className="block">
          <MetricGrid label="Headline figures">
            <MetricTile
              label="Indicative cost"
              icon={Wallet}
              value="£155,932"
              sub="4 reclaimed materials across 2 projects"
              indicative
              chart={
                <Donut
                  label="Cost by stage"
                  segments={[
                    { key: 'confirmed', label: 'Confirmed', value: 105060, valueText: '£105,060', colour: 'var(--color-viz-1)' },
                    { key: 'reserved', label: 'Reserved', value: 0, valueText: '£0', colour: 'var(--color-viz-2)' },
                    { key: 'requested', label: 'With the seller', value: 41391, valueText: '£41,391', colour: 'var(--color-viz-3)' },
                    { key: 'approved', label: 'Approved', value: 9481, valueText: '£9,481', colour: 'var(--color-viz-4)' },
                  ]}
                />
              }
              testId="sample-metric-cost"
            />
            <MetricTile label="Saving against new" icon={PiggyBank} value="£179,265" sub="53.5% less than buying new" state="good" indicative chart={<ProgressRing label="Saving against the cost new" value={179265} max={335196} valueText="£179,265 of £335,196" centre="53%" />} />
            <MetricTile label="Avoided carbon, secured" icon={Leaf} value="47.8" unit="tCO2e" sub="Of 150 tCO2e targeted" state="warning" indicative chart={<ProgressRing label="Avoided carbon against target" value={47.8} max={150} valueText="47.8 of 150 tCO2e" state="warning" centre="32%" />} />
            <MetricTile label="Waiting for approval" icon={Hourglass} value="3" sub="Oldest sent 9 days ago" state="critical" stateLabel="Over a week" href="/app/projects" />
          </MetricGrid>
        </Row>
        <Row label="Metric strip" className="block">
          <MetricStrip
            label="Sample figures"
            items={[
              { key: 'a', label: 'Active projects', value: '3', icon: Layers },
              { key: 'b', label: 'Materials shortlisted', value: '14', icon: Layers, state: 'neutral' },
              { key: 'c', label: 'Avoided carbon, approved', value: '47.8', unit: 'tCO2e', icon: Leaf, indicative: true, state: 'warning', meter: { value: 47.8, max: 160.9, target: 150, label: 'Approved against live shortlists', valueText: '47.8 of 160.9 tCO2e' } },
              { key: 'd', label: 'Reuse by value', value: '2.4%', icon: Recycle, state: 'critical', sub: '19.9% with recycled content, aim 20%' },
            ]}
          />
        </Row>
        <Row label="State words, each with its icon">
          {states.map((s) => (
            <StateLine key={s} state={s} />
          ))}
        </Row>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ChartFrame
            title="Avoided carbon by typology"
            description="Approved and secured materials"
            indicative
            legend={<Legend items={TYPOLOGY_ROWS.map((r) => ({ key: r.key, label: r.label, colour: r.colour, valueText: r.valueText }))} />}
            table={{ columns: ['Typology', 'Avoided carbon'], rows: TYPOLOGY_ROWS.map((r) => [r.label, r.valueText]) }}
          >
            <BarList label="Avoided carbon by typology" max={50} ticks={[0, 10, 20, 30, 40, 50]} items={TYPOLOGY_ROWS} />
          </ChartFrame>
          <ChartFrame
            title="Avoided carbon by status"
            indicative
            legend={<Legend items={STATUS_ROWS.map((r) => ({ key: r.key, label: r.label, colour: r.colour, hatched: r.hatched }))} />}
            table={{ columns: ['Status', 'Avoided carbon'], rows: STATUS_ROWS.map((r) => [r.label, r.valueText]) }}
          >
            <BarList label="Avoided carbon by status" max={80} ticks={[0, 20, 40, 60, 80]} items={STATUS_ROWS} />
          </ChartFrame>
        </div>
        <Row label="Bars with a second figure and a comparison tick" className="block">
          <Card padding="lg">
            <BarList
              label="Package cost against the same new"
              max={60000}
              items={[
                { key: 'reserved', label: 'Reserved', value: 0, valueText: '£0', secondary: null, target: null },
                { key: 'requested', label: 'With the seller', value: 41391, valueText: '£41,391', sub: 'Saving £8,343 against new', target: { value: 49734, label: 'The same new £49,734' } },
                { key: 'to_request', label: 'To request', value: 9481, valueText: '£9,481', sub: 'Saving £181 against new', target: { value: 9662, label: 'The same new £9,662' } },
              ]}
            />
          </Card>
        </Row>
        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          <TargetMeter label="Reused and recycled content by value" value={0.1991} max={0.4} target={0.2} valueText="19.91%" targetText="Aim at least 20%" state="warning" axis={{ start: '0%', end: '40%' }} />
          <TargetMeter label="Upfront carbon, A1 to A5" value={820} max={1200} target={950} valueText="820 kgCO2e per m2" targetText="Aim at most 950" state="good" stateText="Target met" />
          <TargetMeter label="Avoided carbon, approved" value={47.8} max={150} target={null} valueText="47.8 tCO2e" targetText={null} state="neutral" />
        </div>
        <Row label="Donuts, rings and the all-zero track">
          <Donut label="Shortlist" size={72} centre="13" segments={[{ key: 'p', label: 'Shortlisted', value: 6, colour: MARK.neutral }, { key: 's', label: 'Waiting for approval', value: 3, colour: MARK.info }, { key: 'a', label: 'Approved', value: 4, colour: MARK.brand }]} />
          <Donut label="Items by typology" size={56} segments={[{ key: 's', label: 'Structure', value: 11, colour: TYPOLOGY_VIZ.structure }, { key: 'e', label: 'Envelope', value: 5, colour: TYPOLOGY_VIZ.envelope }, { key: 'f', label: 'Finishes', value: 1, colour: TYPOLOGY_VIZ.finishes }]} />
          <Donut label="Nothing listed yet" size={48} segments={[{ key: 'a', label: 'Published', value: 0, colour: MARK.brand }]} />
          <ProgressRing label="Survey progress" value={18} max={24} valueText="18 of 24 items" size={56} centre="75%" />
          <ProgressRing label="No target set" value={0} max={0} valueText="No target set" size={48} />
          <Legend items={[{ label: 'Shortlisted', colour: MARK.neutral, valueText: '6' }, { label: 'Waiting for approval', colour: MARK.info, valueText: '3' }, { label: 'Approved', colour: MARK.brand, valueText: '4' }]} />
        </Row>
        <Row label="RIBA stage strip">
          <RibaStageStrip stage={2} showLabel />
          <RibaStageStrip stage={4} size="sm" showLabel />
          <RibaStageStrip stage={null} showLabel />
        </Row>
        <Row label="Typology bar in categorical colours" className="block max-w-md">
          <SegmentedBar
            label="What the building holds"
            segments={[
              { key: 's', label: 'Structure', count: 11, tone: 'neutral', colour: TYPOLOGY_VIZ.structure },
              { key: 'e', label: 'Envelope', count: 5, tone: 'neutral', colour: TYPOLOGY_VIZ.envelope },
              { key: 'f', label: 'Finishes', count: 1, tone: 'neutral', colour: TYPOLOGY_VIZ.finishes },
            ]}
          />
        </Row>
        <Row label="Quiet pills for tables">
          <StatusPill status="approved" variant="quiet" />
          <StatusPill status="sent" variant="quiet" />
          <StatusPill status="declined" variant="quiet" />
          <FitPill fit="tight" variant="quiet" />
          <Pill tone="neutral" variant="quiet">
            Private
          </Pill>
        </Row>
      </Section>

      <Section id="programme-chart" title="Programme chart" text="The project programme leads the overview: RIBA stage bands, milestones and each shortlisted material's availability coloured by fit, with a today line through every lane.">
        <Card>
          <CardHeader title="Programme" description="RIBA Plan of Work stages, site start and completion, with when each shortlisted material is available." />
          <CardBody>
            <ProgrammeChart {...SAMPLE_PROGRAMME} testId="sample-programme" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Programme, no materials yet" />
          <CardBody>
            <ProgrammeChart {...SAMPLE_PROGRAMME} materials={[]} testId="sample-programme-empty" emptyText="No materials on the programme yet. Shortlist materials and each one appears here against your programme." emptyAction={<Button size="sm">Find materials</Button>} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Programme across your projects" />
          <CardBody>
            <PortfolioTimeline {...SAMPLE_PORTFOLIO} testId="sample-portfolio" />
          </CardBody>
        </Card>
      </Section>

      <Section id="thumbnails" title="Thumbnails" text="Generated axonometric drawings, never photos: projects going up with a crane and an open top frame, donor buildings standing with scaffold. Facades come from the materials.">
        <Row label="Every use, proposed and existing" className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {(['office', 'hotel', 'residential', 'industrial', 'other'] as const).map((use) => (
            <div key={use} className="flex min-w-0 flex-col gap-2">
              <ProjectThumbnail rounded="md" sketch={projectSketch({ id: `p-${use}`, name: use, projectType: use === 'other' ? 'education' : use === 'industrial' ? 'warehouse' : use }, ['steel_section', 'curtain_wall', 'stone_cladding'])} />
              <BuildingThumbnail rounded="md" sketch={buildingSketch({ id: `b-${use}`, storeys: use === 'industrial' ? 2 : 7, structureType: 'Steel frame', use }, ['precast_cladding', 'clay_brick'])} />
            </div>
          ))}
        </Row>
        <Row label="Every facade" className="grid grid-cols-2 gap-4 md:grid-cols-6">
          {FACADE_FAMILIES.map(([name, fams]) => (
            <div key={name} className="flex min-w-0 flex-col gap-1.5">
              <BuildingThumbnail rounded="md" aspect="4/3" sketch={buildingSketch({ id: `f-${name}`, storeys: 5, structureType: 'Load-bearing brick' }, fams)} />
              <span className="text-xs text-muted">{name}</span>
            </div>
          ))}
        </Row>
        <Row label="Project card thumbnail with its materials" className="block max-w-sm">
          <Card>
            <ProjectThumbnail rounded="top" sketch={merrowgate} materials={SAMPLE_MATERIALS.slice(0, 3).map((m) => ({ publicId: m.publicId, spec: m.spec }))} />
            <CardBody>
              <h3 className="m-0 text-base font-semibold text-ink">Merrowgate Wharf</h3>
              <p className="m-0 mt-0.5 text-sm text-muted">Lantern Quay Developments, office</p>
              <RibaStageStrip stage={2} showLabel className="mt-3" />
            </CardBody>
          </Card>
        </Row>
      </Section>

      <Section id="empty-states" title="Empty states" text="A line spot, a title, one line of help and the next action. No frames around the drawing.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SPOT_KINDS.map((k) => (
            <Card key={k}>
              <EmptyState illustration={k} title={SPOT_COPY[k][0]} text={SPOT_COPY[k][1]} />
            </Card>
          ))}
        </div>
      </Section>

      <Section id="model" title="3D view" text="Generated from the recorded dimensions. Drag or use the arrow keys to turn it; Home resets.">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {model ? (
            <div className="rounded-lg border border-line bg-surface p-2">
              <ModelViewer mesh={model} family="steel_section" title={SAMPLE_MATERIALS[0].title} describedBy="sample-model-caption" testId="sample-model" />
              <p id="sample-model-caption" className="m-0 px-2 pb-1 text-sm text-muted">
                Generated from the recorded dimensions. Drag or use the arrow keys to turn it.
              </p>
            </div>
          ) : null}
          {model ? (
            <div className="flex flex-col gap-2">
              <div className="w-[120px] rounded-md border border-line bg-surface">
                <ModelViewer mesh={model} family="steel_section" title={SAMPLE_MATERIALS[0].title} size="thumb" testId="sample-model-thumb" />
              </div>
              <span className="text-xs text-muted">Thumb size, still</span>
            </div>
          ) : null}
        </div>
      </Section>

      <Section id="tracking" title="Tracking and documents" text="Status of a requirement or credit in words, a generated section a consultant can edit, and a panel that remembers whether it is open.">
        <TrackingDemo />
        <CollapsiblePanel id="gallery-activity" title="Recent activity" count={12} icon={Clock} summary="12 updates. Latest, 2 hours ago: Isla Brennan approved UB 457x191x67" toggleTestId="gallery-activity-toggle">
          <p className="m-0 text-sm text-ink-soft">Isla Brennan approved UB 457x191x67 for Merrowgate Wharf.</p>
        </CollapsiblePanel>
      </Section>
    </>
  )
}
