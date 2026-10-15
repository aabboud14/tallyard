// @vitest-environment jsdom
// The charts kit draws only: every width is the value it was given, every chart is named in words, and no
// rendered text carries a dash, an arrow, a tick or a comparison sign (P2, P6).
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Leaf } from 'lucide-react'
import { accessibleName, allByRole, allText, byRole, byTestId, cleanup, click, FORBIDDEN, installDomShims, render } from '../testing'
import { MARK, TYPOLOGY_VIZ } from '../labels'
import { BarList, ChartFrame, Donut, Legend, MetricGrid, MetricTile, PortfolioTimeline, ProgressRing, RibaStageStrip, TargetMeter, type BarListItem } from './index'
import { SAMPLE_PORTFOLIO } from '../samples'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

const ITEMS: BarListItem[] = [
  { key: 'structure', label: 'Structure', value: 41.2, valueText: '41.2 tCO2e', colour: TYPOLOGY_VIZ.structure },
  { key: 'envelope', label: 'Envelope', value: 5.9, valueText: '5.9 tCO2e', colour: TYPOLOGY_VIZ.envelope },
  { key: 'finishes', label: 'Finishes', value: 0.7, valueText: '0.7 tCO2e', colour: TYPOLOGY_VIZ.finishes },
]

describe('BarList', () => {
  it('names every label and value, and draws each bar at its value in a viewBox as wide as max', () => {
    render(<BarList label="Avoided carbon by typology" max={50} ticks={[0, 25, 50]} items={ITEMS} />)
    const img = byRole('img', /Avoided carbon by typology/)
    expect(accessibleName(img)).toBe('Avoided carbon by typology: Structure 41.2 tCO2e; Envelope 5.9 tCO2e; Finishes 0.7 tCO2e')
    const bars = Array.from(document.querySelectorAll('rect[data-part="bar"]'))
    expect(bars.map((b) => Number(b.getAttribute('width')))).toEqual([41.2, 5.9, 0.7])
    for (const b of bars) expect(b.closest('svg')!.getAttribute('viewBox')).toBe('0 0 50 1')
    expect(bars.map((b) => b.getAttribute('fill'))).toEqual([TYPOLOGY_VIZ.structure, TYPOLOGY_VIZ.envelope, TYPOLOGY_VIZ.finishes])
    expect(document.body.textContent).toContain('25')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('computes nothing: the widths are exactly the inputs, whatever they are', () => {
    const odd = [{ key: 'a', label: 'A', value: 17.333, valueText: 'odd' }]
    render(<BarList label="Odd" max={123.4} items={odd} />)
    expect(document.querySelector('rect[data-part="bar"]')!.getAttribute('width')).toBe('17.333')
    expect(document.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 123.4 1')
  })

  it('draws a second figure behind and a comparison tick, and reads them out', () => {
    render(<BarList label="Package cost" max={60000} items={[{ key: 'r', label: 'With the seller', value: 41391, valueText: '£41,391', secondary: { value: 49734, valueText: 'Live £49,734' }, target: { value: 49734, label: 'The same new £49,734' } }]} />)
    expect(document.querySelector('rect[data-part="secondary"]')!.getAttribute('width')).toBe('49734')
    expect(document.querySelector('rect[data-part="target"]')!.getAttribute('x')).toBe('49734')
    expect(accessibleName(byRole('img', /Package cost/))).toContain('The same new £49,734')
  })

  it('becomes a group of links when rows link somewhere', () => {
    render(<BarList label="Carbon by project" max={10} items={[{ key: 'm', label: 'Merrowgate Wharf', value: 4, valueText: '4 tCO2e', href: '/app/projects/m' }]} />)
    expect(byRole('group', /Carbon by project/)).toBeTruthy()
    expect(byRole('link', 'Merrowgate Wharf').getAttribute('href')).toBe('/app/projects/m')
  })

  it('hatches a late or declined bar', () => {
    render(<BarList label="By status" max={10} items={[{ key: 'd', label: 'Declined', value: 3, valueText: '3', colour: MARK.danger, hatched: true }]} />)
    expect(document.querySelector('[data-part="hatch"]')).not.toBeNull()
  })
})

describe('TargetMeter', () => {
  it('reads the value, the target and the state word, and shows the word beside an icon', () => {
    render(<TargetMeter label="Reused content by value" value={0.1991} max={0.4} target={0.2} valueText="19.91%" targetText="Aim at least 20%" state="warning" axis={{ start: '0%', end: '40%' }} />)
    const meter = byRole('meter', 'Reused content by value')
    expect(meter.getAttribute('aria-valuetext')).toBe('19.91%. Aim at least 20%. Near target')
    expect(meter.getAttribute('aria-valuenow')).toBe('0.1991')
    const state = document.querySelector('[data-part="state"]')!
    expect(state.textContent).toBe('Near target')
    expect(state.querySelector('svg')).not.toBeNull()
    expect(document.querySelector('rect[data-part="target"]')!.getAttribute('x')).toBe('0.2')
    expect(document.querySelector('rect[data-part="fill"]')!.getAttribute('fill')).toBe(MARK.warning)
    expect(document.body.textContent).toContain('40%')
  })

  it('draws no target tick without a target and takes a custom word', () => {
    render(<TargetMeter label="Avoided carbon" value={4} max={10} target={null} valueText="4 tCO2e" targetText={null} state="neutral" stateText="No bill of materials yet" />)
    expect(document.querySelector('rect[data-part="target"]')).toBeNull()
    expect(byRole('meter', 'Avoided carbon').getAttribute('aria-valuetext')).toBe('4 tCO2e. No bill of materials yet')
  })
})

describe('Donut and ProgressRing', () => {
  it('names every segment and draws one arc per non-zero segment, deterministically', () => {
    const segs = [
      { key: 'p', label: 'Shortlisted', value: 6, colour: MARK.neutral },
      { key: 's', label: 'Waiting for approval', value: 3, colour: MARK.info },
      { key: 'a', label: 'Approved', value: 4, colour: MARK.brand },
      { key: 'd', label: 'Declined', value: 0, colour: MARK.danger },
    ]
    const host = render(<Donut label="Shortlist" segments={segs} />)
    expect(accessibleName(byRole('img'))).toBe('Shortlist: Shortlisted 6, Waiting for approval 3, Approved 4, Declined 0')
    const arcs = Array.from(document.querySelectorAll('[data-part="arc"]'))
    expect(arcs).toHaveLength(3)
    for (const a of arcs) expect(a.getAttribute('pathLength')).toBe('13')
    const first = host.innerHTML
    cleanup()
    const again = render(<Donut label="Shortlist" segments={segs} />)
    expect(again.innerHTML).toBe(first)
  })

  it('draws only the track when every segment is zero', () => {
    render(<Donut label="Listed" segments={[{ key: 'a', label: 'Published', value: 0, colour: MARK.brand }]} />)
    expect(document.querySelectorAll('[data-part="arc"]')).toHaveLength(0)
    expect(document.querySelectorAll('circle')).toHaveLength(1)
  })

  it('names the ring and draws the arc on a path as long as max', () => {
    render(<ProgressRing label="Avoided carbon" value={47.8} max={150} valueText="47.8 of 150 tCO2e" centre="32%" state="warning" />)
    expect(accessibleName(byRole('img'))).toBe('Avoided carbon: 47.8 of 150 tCO2e')
    const arc = document.querySelector('[data-part="arc"]')!
    expect(arc.getAttribute('pathLength')).toBe('150')
    expect(arc.getAttribute('stroke-dasharray')).toBe('47.8 102.2')
    expect(arc.getAttribute('stroke')).toBe(MARK.warning)
  })

  it('draws the track alone for a max of 0', () => {
    render(<ProgressRing label="Target" value={3} max={0} valueText="No target set" />)
    expect(document.querySelector('[data-part="arc"]')).toBeNull()
  })
})

describe('MetricTile', () => {
  it('is a link named by its label when it has an address, and shows its state as an icon and a word', () => {
    render(
      <MetricGrid label="Headline figures">
        <MetricTile label="Waiting for approval" value="3" state="warning" stateLabel="Over a week" href="/app/projects" testId="metric-waiting" />
        <MetricTile label="Carbon avoided" icon={Leaf} value="47.8" unit="tCO2e" indicative chart={<ProgressRing label="Carbon" value={1} max={2} valueText="1 of 2" />} testId="metric-carbon" />
      </MetricGrid>,
    )
    expect(byRole('group', 'Headline figures')).toBeTruthy()
    const link = byRole('link', 'Waiting for approval')
    expect(link.getAttribute('href')).toBe('/app/projects')
    const tile = byTestId('metric-waiting')
    expect(tile.getAttribute('data-state')).toBe('warning')
    expect(tile.textContent).toContain('Over a week')
    expect(tile.querySelector('[data-state="warning"] svg')).not.toBeNull()
    expect(tile.querySelector('[data-part="state-rule"]')).not.toBeNull()
    expect(byRole('link', 'Indicative').getAttribute('href')).toBe('/app/help/methodology')
    expect(byTestId('metric-carbon').textContent).toContain('tCO2e')
    expect(byTestId('metric-carbon').getAttribute('data-state')).toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('never colours the figure itself', () => {
    render(<MetricTile label="Reuse by value" value="2.4%" state="critical" testId="t" />)
    const value = Array.from(byTestId('t').querySelectorAll('span')).find((s) => s.textContent === '2.4%')!
    expect(value.className).toContain('text-ink')
    expect(byTestId('t').textContent).toContain('Off target')
  })
})

describe('RibaStageStrip, Legend and ChartFrame', () => {
  it('names the stage in words and marks the cells', () => {
    render(<RibaStageStrip stage={2} showLabel />)
    expect(accessibleName(byRole('img'))).toBe('RIBA stage 2 of 7, Concept Design')
    expect(document.body.textContent).toContain('Stage 2, Concept Design')
    const states = Array.from(document.querySelectorAll('[data-part="stage"]')).map((c) => c.getAttribute('data-state'))
    expect(states).toEqual(['done', 'done', 'current', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead'])
  })

  it('says when the programme has not started', () => {
    render(<RibaStageStrip stage={null} showLabel />)
    expect(accessibleName(byRole('img'))).toBe('RIBA stage not started')
    expect(document.body.textContent).toContain('Before stage 0')
  })

  it('lists legend items with their values in ink', () => {
    render(<Legend label="Key" items={[{ label: 'Structure', colour: TYPOLOGY_VIZ.structure, valueText: '11' }, { label: 'Envelope', colour: TYPOLOGY_VIZ.envelope }]} />)
    expect(document.querySelector('ul[aria-label="Key"]')).not.toBeNull()
    expect(document.body.textContent).toBe('Structure11Envelope')
  })

  it('switches to a table with the given rows', () => {
    render(
      <ChartFrame title="Avoided carbon by typology" indicative table={{ columns: ['Typology', 'Avoided carbon'], rows: [['Structure', '41.2 tCO2e'], ['Envelope', '5.9 tCO2e']] }}>
        <BarList label="Avoided carbon by typology" max={50} items={ITEMS.slice(0, 2)} />
      </ChartFrame>,
    )
    expect(allByRole('table')).toHaveLength(0)
    click(byRole('radio', 'Table'))
    const table = byRole('table')
    expect(Array.from(table.querySelectorAll('th')).map((t) => t.textContent)).toEqual(['Typology', 'Avoided carbon'])
    expect(Array.from(table.querySelectorAll('tbody tr')).map((r) => r.textContent)).toEqual(['Structure41.2 tCO2e', 'Envelope5.9 tCO2e'])
    expect(document.querySelector('caption')!.textContent).toBe('Avoided carbon by typology')
    click(byRole('radio', 'Chart'))
    expect(allByRole('table')).toHaveLength(0)
  })
})

describe('PortfolioTimeline', () => {
  it('draws one row per project with its segments, markers and a text list, and a today line', () => {
    render(<PortfolioTimeline {...SAMPLE_PORTFOLIO} />)
    expect(byTestId('portfolio-timeline')).toBeTruthy()
    const merrowgate = byTestId('portfolio-row-merrowgate')
    expect(merrowgate.querySelectorAll('[data-part="segment"]')).toHaveLength(5)
    expect(merrowgate.querySelector('[data-state="current"]')!.textContent).toBe('2')
    expect(merrowgate.querySelector('[data-part="site-start"]')).not.toBeNull()
    expect(merrowgate.querySelector('ul')!.textContent).toBe('Site start 1 Nov 2027Practical completion 29 Jun 2029Materials needed from 3 Apr 2028')
    const sallow = byTestId('portfolio-row-sallow')
    expect(sallow.textContent).toContain('Programme not set')
    expect(sallow.querySelectorAll('[data-part="segment"]')).toHaveLength(0)
    expect(sallow.querySelector('[data-part="materials"]')).not.toBeNull()
    expect((document.querySelector('[data-part="today"]') as HTMLElement).style.left).toMatch(/^calc\((0.207 \* 100%|20.7%)\)$/)
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})
