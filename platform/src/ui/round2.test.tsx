// @vitest-environment jsdom
// Round 2 components: the flatter look (no decorative effects), the drawings (deterministic, labelled, never
// photos), the programme, the 3D view, the collapsible panel that remembers itself, and the tracking controls.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { Search } from 'lucide-react'
import type { Spec } from '../domain/types'
import { DEFAULT_ANGLES } from '../domain/engines/view3d'
import { buildingSketch, projectSketch } from '../domain/sketch'
import { accessibleName, allByRole, allText, byRole, byTestId, cleanup, click, FORBIDDEN, installDomShims, press, render } from './testing'
import {
  BuildingDrawing,
  BuildingIllustration,
  BuildingThumb,
  BuildingThumbnail,
  ProjectThumb,
  CollapsiblePanel,
  EmptyState,
  MaterialImage,
  MetricStrip,
  ModelViewer,
  PANELS_STORAGE_KEY,
  Pill,
  ProgrammeChart,
  ProgressBar,
  ProjectThumbnail,
  SPOT_KINDS,
  SpotIllustration,
  Stat,
  StatementSection,
  SustainabilityBand,
  TrackStatusPill,
  TrackStatusSelect,
} from './index'
import { BANDS, SAMPLE_MATERIALS, SAMPLE_PROGRAMME, sampleModel } from './samples'
import { TICK_TIER_CLASS } from './programmeTiers'
import { AXIS_LABEL_TIERS } from '../domain/engines/programme'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

/** Markup without the per-instance ids, so two renders can be compared. */
function shape(el: Element): string {
  return el.innerHTML.replace(/mi-[A-Za-z0-9_-]+?-(grain|hatch)/g, 'ID-$1')
}

describe('flat surfaces', () => {
  it('draws empty states without frames, rings or gradient tiles', () => {
    render(
      <>
        <EmptyState icon={Search} title="No materials match" text="Try fewer filters." />
        <EmptyState illustration="search" title="Nothing here" />
      </>,
    )
    expect(document.querySelector('.rounded-\\[18px\\], .rounded-\\[24px\\], .bg-gradient-to-b')).toBeNull()
    const spot = document.querySelector('svg[data-spot="search"]')!
    expect(spot.getAttribute('aria-hidden')).toBe('true')
    expect(allByRole('heading').map(accessibleName)).toEqual(['No materials match', 'Nothing here'])
  })

  it('draws every spot as a decorative drawing', () => {
    render(
      <>
        {SPOT_KINDS.map((k) => (
          <SpotIllustration key={k} kind={k} />
        ))}
      </>,
    )
    const spots = Array.from(document.querySelectorAll('svg[data-spot]'))
    expect(spots).toHaveLength(7)
    for (const s of spots) expect(s.getAttribute('aria-hidden')).toBe('true')
    expect(allByRole('img')).toHaveLength(0)
  })

  it('gives a quiet pill no chip and no ring, and keeps its dot and words', () => {
    render(
      <Pill tone="brand" variant="quiet" data-testid="q">
        Published
      </Pill>,
    )
    const pill = byTestId('q')
    expect(pill.className).not.toMatch(/\bring-/)
    expect(pill.className).toContain('bg-transparent')
    expect(pill.querySelector('span[aria-hidden="true"]')!.className).toContain('bg-mark-good')
    expect(pill.textContent).toBe('Published')
  })

  it('keeps the band attributes and draws High on the darkest step of the ramp', () => {
    render(
      <>
        <SustainabilityBand band={BANDS.high} />
        <SustainabilityBand band={BANDS.low} />
      </>,
    )
    const [high, low] = Array.from(document.querySelectorAll('[data-band]'))
    expect(high.getAttribute('data-band')).toBe('high')
    expect(high.getAttribute('data-segments')).toBe('3')
    const segs = Array.from(high.querySelectorAll('[data-part="segment"]')).map((s) => s.className)
    expect(segs[2]).toContain('bg-brand-700')
    expect(segs[0]).toContain('bg-brand-300')
    const lowSegs = Array.from(low.querySelectorAll('[data-part="segment"]')).map((s) => s.className)
    expect(lowSegs[1]).toContain('bg-line')
  })

  it('shows a stat state as a dot, an icon and words, with a meter and its target', () => {
    render(<Stat label="Avoided carbon" value="47.8" unit="tCO2e" state="warning" meter={{ value: 47.8, max: 160, target: 150, label: 'Approved against live', valueText: '47.8 of 160 tCO2e' }} testId="s" />)
    const s = byTestId('s')
    expect(s.className).not.toContain('shadow')
    expect(s.textContent).toContain('Near target')
    const bar = byRole('progressbar', 'Approved against live')
    expect(bar.getAttribute('aria-valuetext')).toBe('47.8 of 160 tCO2e. Target 150 of 160')
    expect(bar.querySelector('rect[data-part="target"]')!.getAttribute('x')).toBe('150')
  })

  it('names the target on a progress bar in words when given', () => {
    render(<ProgressBar label="Reuse" value={19.9} max={40} target={20} targetText="Aim at least 20%" valueText="19.9%" />)
    expect(byRole('progressbar', 'Reuse').getAttribute('aria-valuetext')).toBe('19.9%. Aim at least 20%')
  })

  it('lays out a metric strip as one group of figures', () => {
    render(
      <MetricStrip
        label="Sample figures"
        items={[
          { key: 'a', label: 'Buildings in the sample', value: '4' },
          { key: 'b', label: 'Items surveyed', value: '17' },
        ]}
      />,
    )
    const g = byRole('group', 'Sample figures')
    expect(g.children).toHaveLength(2)
    expect(g.textContent).toBe('Buildings in the sample4Items surveyed17')
  })
})

const SPECS: Spec[] = SAMPLE_MATERIALS.map((m) => m.spec)

describe('material illustrations', () => {
  it('use no gradient, blur or drop shadow, keep their label and draw the same each time', () => {
    render(
      <div>
        {SAMPLE_MATERIALS.map((m, i) => (
          <div key={i}>
            <MaterialImage spec={m.spec} publicId={m.publicId} testId={`a-${i}`} />
            <MaterialImage spec={m.spec} publicId={m.publicId} testId={`b-${i}`} />
          </div>
        ))}
      </div>,
    )
    SAMPLE_MATERIALS.forEach((_m, i) => {
      const a = byTestId(`a-${i}`)
      expect(a.getAttribute('data-kind')).toBe('illustration')
      expect(a.querySelector('radialGradient, linearGradient, feGaussianBlur, feDropShadow')).toBeNull()
      expect(a.querySelector('svg[role="img"]')!.getAttribute('aria-label')).toMatch(/^Illustration of /)
      expect(shape(a)).toBe(shape(byTestId(`b-${i}`)))
    })
    expect(SPECS).toHaveLength(8)
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('shows a steel member at its recorded length, with a title strip', () => {
    render(<MaterialImage spec={SAMPLE_MATERIALS[0].spec} publicId={SAMPLE_MATERIALS[0].publicId} testId="steel" />)
    const steel = byTestId('steel')
    expect(steel.textContent).toContain('7.5 m')
    expect(steel.querySelector('[data-part="section-card"]')).not.toBeNull()
    expect(steel.querySelector('[data-part="title-strip"]')!.textContent).toBe('End view to a common scale')
  })

  it('names the drawing and its source on the larger view', () => {
    render(<MaterialImage spec={SAMPLE_MATERIALS[0].spec} publicId={SAMPLE_MATERIALS[0].publicId} view="detail" testId="steel" />)
    const strip = byTestId('steel').querySelector('[data-part="title-strip"]')!.textContent
    expect(strip).toBe('UB 457x191x67, not to scaleIllustration from the survey record')
    expect(byTestId('steel').querySelector('[data-part="grid"]')).not.toBeNull()
  })

  it('gives each swatch a scale bar and each drawing family its own drawing', () => {
    render(
      <>
        {SAMPLE_MATERIALS.map((m) => (
          <MaterialImage key={m.publicId} spec={m.spec} publicId={m.publicId} testId={m.publicId} />
        ))}
      </>,
    )
    expect(byTestId('L-A945G6').querySelector('[data-part="scale-bar"]')!.textContent).toBe('100 mm')
    expect(byTestId('L-DAXNV3').querySelector('[data-part="scale-bar"]')!.textContent).toBe('1 m')
    expect(byTestId('L-8N33X4').querySelector('[data-part="panel-elevation"]')).not.toBeNull()
    expect(byTestId('L-33XJ8M').querySelector('[data-part="panel-axo"]')!.querySelectorAll('[data-part="pedestal"]')).toHaveLength(4)
    expect(byTestId('L-K8CGH4').textContent).toContain('6.0 m')
  })
})

describe('building illustrations and thumbnails', () => {
  const office = projectSketch({ id: 'p1', name: 'Merrowgate Wharf', projectType: 'office' }, ['steel_section', 'stone_cladding'])
  const tiverne = buildingSketch({ id: 'b1', storeys: 7, structureType: 'Steel frame' }, ['stone_cladding', 'curtain_wall'])

  it('draws the same sketch the same way and names it as an illustration', () => {
    render(
      <>
        <BuildingIllustration sketch={office} />
        <BuildingIllustration sketch={office} />
      </>,
    )
    const [a, b] = allByRole('img')
    expect(a.outerHTML).toBe(b.outerHTML)
    expect(accessibleName(a)).toBe('Illustration of an office project, drawn from its shortlisted materials')
    expect(a.querySelector('[data-part="crane"]')).not.toBeNull()
    expect(a.querySelector('radialGradient, linearGradient, filter')).toBeNull()
  })

  it('draws different uses differently and hides a decorative drawing', () => {
    render(
      <>
        <BuildingIllustration sketch={projectSketch({ id: 'p', name: 'P', projectType: 'office' }, [])} />
        <BuildingIllustration sketch={projectSketch({ id: 'p', name: 'P', projectType: 'residential' }, [])} />
        <BuildingIllustration sketch={tiverne} decorative />
      </>,
    )
    const svgs = Array.from(document.querySelectorAll('svg[data-sketch]'))
    expect(svgs[0].innerHTML).not.toBe(svgs[1].innerHTML)
    expect(svgs[2].getAttribute('aria-hidden')).toBe('true')
    expect(svgs[2].getAttribute('role')).toBeNull()
    expect(svgs[2].querySelector('[data-part="crane"]')).toBeNull()
  })

  it('gives a project thumbnail one name, with its material swatches hidden', () => {
    render(<ProjectThumbnail sketch={office} materials={SAMPLE_MATERIALS.slice(0, 4).map((m) => ({ publicId: m.publicId, spec: m.spec }))} testId="t" />)
    expect(allByRole('img').map(accessibleName)).toEqual([office.label])
    expect(byTestId('t').querySelectorAll('[data-family]')).toHaveLength(3)
    expect(byTestId('t').getAttribute('data-kind')).toBe('illustration')
  })

  it('names a building thumbnail by its survey', () => {
    render(<BuildingThumbnail sketch={tiverne} />)
    expect(accessibleName(byRole('img'))).toBe('Illustration of a 7 storey building, drawn from its survey')
    expect(allText().toLowerCase()).not.toContain('photo')
  })
})

describe('compact thumbs and the building drawing', () => {
  const office = projectSketch({ id: 'p1', name: 'Merrowgate Wharf', projectType: 'office' }, ['steel_section', 'stone_cladding'])
  const tiverne = buildingSketch({ id: 'b1', storeys: 7, structureType: 'Steel frame' }, ['stone_cladding', 'curtain_wall'])

  it('is decorative by default beside a name, and named when asked', () => {
    render(
      <>
        <ProjectThumb sketch={office} testId="a" />
        <BuildingThumb sketch={tiverne} size="lg" decorative={false} testId="b" />
      </>,
    )
    expect(allByRole('img').map(accessibleName)).toEqual(['Illustration of a 7 storey building, drawn from its survey'])
    expect(byTestId('a').querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(byTestId('a').getAttribute('data-size')).toBe('md')
    expect(byTestId('a').className).toContain('size-12')
    expect(byTestId('b').className).toContain('h-[72px] w-24')
    expect(byTestId('a').getAttribute('data-kind')).toBe('illustration')
  })

  it('crops a fitted drawing to the building, with no trees, and draws it the same each time', () => {
    render(
      <>
        <BuildingIllustration sketch={office} fit />
        <BuildingIllustration sketch={office} fit />
        <BuildingIllustration sketch={office} />
      </>,
    )
    const [a, b, full] = Array.from(document.querySelectorAll('svg[data-sketch]'))
    expect(a.outerHTML).toBe(b.outerHTML)
    expect(a.getAttribute('data-fit')).toBe('building')
    expect(full.getAttribute('viewBox')).toBe('0 0 320 200')
    const [x, y, w, h] = (a.getAttribute('viewBox') ?? '').split(' ').map(Number)
    expect(w).toBeLessThan(320)
    expect(x).toBeGreaterThanOrEqual(-10)
    expect(y + h).toBeLessThanOrEqual(200)
    expect(a.querySelectorAll('circle')).toHaveLength(0)
    expect(full.querySelectorAll('circle').length).toBeGreaterThan(0)
  })

  it('draws the building group alone for composing into a larger sheet', () => {
    render(
      <svg role="img" aria-label="Sheet">
        <BuildingDrawing sketch={tiverne} />
      </svg>,
    )
    const g = document.querySelector('g[data-part="building"]')!
    expect(g.getAttribute('data-sketch')).toBe('existing')
    expect(g.querySelectorAll('[data-part="block"]').length).toBeGreaterThan(0)
    expect(g.querySelector('[data-part="crane"]')).toBeNull()
    expect(g.querySelector('rect')).toBeNull()
  })
})

describe('ProgrammeChart', () => {
  it('describes the whole programme and draws stage bands, milestones and materials', () => {
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} />)
    const chart = byTestId('programme-chart')
    expect(accessibleName(byRole('group', /Programme for Merrowgate Wharf/))).toBe(SAMPLE_PROGRAMME.description)
    const bands = chart.querySelectorAll('[data-part="stage-band"]')
    expect(bands).toHaveLength(8)
    expect(Array.from(bands).map((b) => b.getAttribute('data-state'))).toEqual(['past', 'past', 'current', 'future', 'future', 'future', 'future', 'future'])
    expect(chart.textContent).toContain('Today: stage 2, Concept Design')
    expect(chart.querySelectorAll('[data-part="milestone"]')).toHaveLength(3)
    expect(Array.from(chart.querySelectorAll('[data-part="material"]')).map((m) => m.getAttribute('data-fit'))).toEqual(['in_time', 'tight', 'late', 'now'])
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('names the start month and links each material, with its window, outside the image', () => {
    const materials = SAMPLE_PROGRAMME.materials.map((m) => ({ ...m, href: `/app/marketplace/${m.itemId}`, fitLabel: 'In time' }))
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} materials={materials} />)
    const chart = byTestId('programme-chart')
    expect(chart.querySelector('[data-part="start-label"]')!.textContent).toBe('Sep 2025')
    const links = Array.from(chart.querySelectorAll('a[data-part="material-link"]'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/app/marketplace/m1', '/app/marketplace/m2', '/app/marketplace/m3', '/app/marketplace/m4'])
    expect(links[0].textContent).toBe('UB 457x191x67, 7.5 mExpected January to March 2027')
    expect(links[0].closest('[data-part="plot"]')).toBeNull()
    expect(links[0].getAttribute('title')).toBe('UB 457x191x67, 7.5 m, Expected January to March 2027, in time')
    // The today line sits under the stage names.
    const today = chart.querySelector('[data-part="today"]')!
    expect(today.className).toContain('z-[1]')
    expect(chart.querySelector('[data-part="stage-band"] > span')!.className).toContain('z-[2]')
  })

  it('names each band on hover, hides bands outside the axis and draws today\'s stage solid', () => {
    const stages = SAMPLE_PROGRAMME.stages.map((b) => ({ ...b, hoverText: `${b.label}, ${b.name}, dates`, visible: b.stage !== 7 }))
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} stages={stages} />)
    const bands = Array.from(byTestId('programme-chart').querySelectorAll('[data-part="stage-band"]'))
    // The tooltip wraps each band without taking over its state.
    expect(bands.map((b) => b.getAttribute('data-state'))).toEqual(['past', 'past', 'current', 'future', 'future', 'future', 'future', 'future'])
    expect(bands[7].className).toContain('hidden')
    expect(bands[7].getAttribute('data-visible')).toBe('false')
    expect(bands[2].className).toContain('bg-brand-600')
    expect(bands[2].className).toContain('text-white')
    // Every band is its own container; the name shows whenever the band is wide enough, on any screen. Today's
    // stage always shows its name in full, however narrow the band (recording audit follow-up, note 17).
    for (const b of bands) {
      expect(b.className).toContain('@container')
      const name = b.querySelector('[data-part="stage-name"]')!
      expect(name.textContent).toBe(stages[bands.indexOf(b)].name)
      expect(name.className).not.toContain('max-lg:hidden')
      if (b.getAttribute('data-state') === 'current') {
        expect(name.className).not.toContain('hidden')
        expect(name.className).not.toContain('truncate')
        continue
      }
      expect(name.className).toMatch(/@min-\[\d+px\]:block/)
      expect(name.className).toContain('truncate')
    }
  })

  it("always names today's stage, running past a narrow band into the chart", () => {
    const narrow = SAMPLE_PROGRAMME.stages.map((b) => (b.stage === 2 ? { ...b, from: 0.6, to: 0.605, nameAlign: 'end' as const } : b))
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} stages={narrow} />)
    const band = byTestId('programme-chart').querySelector<HTMLElement>('[data-part="stage-band"][data-state="current"]')!
    // Not clipped by the band, a minimum width, and the name above the neighbouring bands' numbers.
    expect(band.className).not.toContain('overflow-hidden')
    expect(band.className).toContain('min-w-2.5')
    expect(band.className).toContain('justify-end')
    const text = band.querySelector('[data-part="stage-text"]')!
    expect(text.className).toContain('z-[3]')
    expect(text.className).toContain('shrink-0')
    expect(text.className).toContain('whitespace-nowrap')
    expect(text.textContent).toBe('2Concept Design')
    for (const other of byTestId('programme-chart').querySelectorAll('[data-part="stage-band"]:not([data-state="current"])')) expect(other.className).toContain('overflow-hidden')
  })

  it('makes each band a button that names it on focus and opens its name and dates on a tap', async () => {
    const stages = SAMPLE_PROGRAMME.stages.map((b) => ({ ...b, hoverText: `${b.label}, ${b.name}, 1 Jan 2026 to 2 Feb 2026`, datesText: '1 Jan 2026 to 2 Feb 2026', visible: b.stage !== 7 }))
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} stages={stages} />)
    const bands = Array.from(byTestId('programme-chart').querySelectorAll<HTMLElement>('[data-part="stage-band"]'))
    for (const b of bands.slice(0, 7)) {
      expect(b.tagName).toBe('BUTTON')
      expect(b.getAttribute('type')).toBe('button')
      expect(b.tabIndex).toBe(0)
      expect(b.getAttribute('aria-label')).toBe(stages[bands.indexOf(b)].hoverText)
      expect(b.className).toContain('focus-visible:outline-2')
      expect(b.className).toContain('focus-visible:outline-brand-600')
    }
    // A band that is not drawn is not focusable either.
    expect(bands[7].tagName).toBe('DIV')
    // The bands sit in a labelled group, not an image, so assistive technology reaches each button by its name.
    const plot = byTestId('programme-chart').querySelector('[data-part="plot"]')!
    expect(plot.getAttribute('role')).toBe('group')
    expect(plot.getAttribute('aria-label')).toBe(SAMPLE_PROGRAMME.description)
    expect(byTestId('programme-chart').querySelector('[role="img"] button, [role="img"] a')).toBeNull()
    expect(allByRole('button').map(accessibleName)).toContain(stages[2].hoverText)
    click(bands[2])
    const panel = await vi.waitFor(() => byTestId('stage-panel'))
    expect(panel.textContent).toBe('Stage 2, Concept Design1 Jan 2026 to 2 Feb 2026')
  })

  it('keys every stage drawn by number and name, under the lane on phones and under the chart from 640 px', () => {
    const stages = SAMPLE_PROGRAMME.stages.map((b) => ({ ...b, visible: b.stage !== 7 }))
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} stages={stages} />)
    const keys = Array.from(byTestId('programme-chart').querySelectorAll('[data-part="stage-key"]'))
    expect(keys).toHaveLength(2)
    expect(keys[0].className).toContain('sm:hidden')
    expect(keys[0].closest('[data-part="plot"]')).not.toBeNull()
    expect(keys[1].className).toContain('max-sm:hidden')
    for (const key of keys) {
      expect(key.getAttribute('aria-hidden')).toBe('true')
      expect(Array.from(key.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['0Strategic Definition', '1Preparation and Briefing', '2Concept Design', '3Spatial Coordination', '4Technical Design', '5Manufacturing and Construction', '6Handover'])
      expect(key.querySelector('li:nth-child(3) span')!.className).toContain('bg-brand-600')
    }
  })

  it('keeps the axis labels above the today line, so the line never strikes through one', () => {
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} />)
    const label = byTestId('programme-chart').querySelector('[data-part="tick-label"] > span')!
    expect(label.className).toContain('z-[2]')
    expect(label.className).toContain('bg-surface')
    expect(byTestId('programme-chart').querySelector('[data-part="today"]')!.className).toContain('z-[1]')
  })

  it('shows each tier of axis labels from the plot width it was fitted to', () => {
    TICK_TIER_CLASS.forEach((cls, tier) => {
      if (tier === 0) expect(cls).toBe('')
      else expect(cls).toBe(`hidden @min-[${AXIS_LABEL_TIERS[tier]}px]:block`)
    })
    expect(TICK_TIER_CLASS).toHaveLength(AXIS_LABEL_TIERS.length)
    const ticks = [
      { iso: 'a', at: 0, label: 'Oct 2026', major: true, tier: 0 },
      { iso: 'b', at: 0.25, label: 'Jan 2027', major: true, tier: 2 },
      { iso: 'c', at: 0.5, label: 'Apr', major: true, tier: 3 },
    ]
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} axis={{ ticks, startLabel: null }} />)
    const plot = byRole('group', /Programme for Merrowgate Wharf/)
    expect(plot.className).toContain('@container')
    const labels = Array.from(plot.querySelectorAll('[data-part="tick-label"]'))
    expect(labels.map((l) => [l.textContent, l.getAttribute('data-tier')])).toEqual([
      ['Oct 2026', '0'],
      ['Jan 2027', '2'],
      ['Apr', '3'],
    ])
    expect(labels[0].className).not.toContain('hidden')
    expect(labels[1].className).toContain('@min-[640px]:block')
    expect(labels[2].className).toContain('@min-[840px]:block')
  })

  it('shows the empty text and action outside the image when there are no materials', () => {
    render(<ProgrammeChart {...SAMPLE_PROGRAMME} materials={[]} emptyText="No materials on the programme yet." emptyAction={<button type="button">Find materials</button>} />)
    expect(document.body.textContent).toContain('No materials on the programme yet.')
    expect(byRole('button', 'Find materials')).toBeTruthy()
  })
})

describe('ModelViewer', () => {
  const mesh = sampleModel(SAMPLE_MATERIALS[0].spec)!

  it('draws polygons, names the view and turns with the arrow keys', () => {
    render(<ModelViewer mesh={mesh} family="steel_section" title="UB 457x191x67, 7.5 m" describedBy="cap" />)
    const viewer = byTestId('model-viewer')
    expect(viewer.getAttribute('aria-roledescription')).toBe('3D viewer')
    expect(viewer.getAttribute('tabindex')).toBe('0')
    expect(accessibleName(byRole('img'))).toBe('3D view of UB 457x191x67, 7.5 m')
    expect(viewer.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(3)
    expect(viewer.getAttribute('data-yaw')).toBe(String(DEFAULT_ANGLES.yawDeg))
    press('ArrowRight', viewer)
    expect(byTestId('model-viewer').getAttribute('data-yaw')).toBe('-20')
    press('ArrowUp', byTestId('model-viewer'))
    expect(byTestId('model-viewer').getAttribute('data-pitch')).toBe('35')
    press('Home', byTestId('model-viewer'))
    expect(byTestId('model-viewer').getAttribute('data-yaw')).toBe('-35')
  })

  it('resets from the button, reports controlled changes and keeps the thumb still', () => {
    const onChange = vi.fn()
    render(
      <>
        <ModelViewer mesh={mesh} family="steel_section" title="A" angles={{ yawDeg: 10, pitchDeg: 5 }} onAnglesChange={onChange} />
        <ModelViewer mesh={mesh} family="steel_section" title="B" size="thumb" testId="thumb" />
      </>,
    )
    click(byRole('button', 'Reset view'))
    expect(onChange).toHaveBeenCalledWith(DEFAULT_ANGLES)
    expect(byTestId('thumb').getAttribute('tabindex')).toBeNull()
    expect(allByRole('button')).toHaveLength(1)
  })

  it('draws the same projection each time', () => {
    render(
      <>
        <ModelViewer mesh={mesh} family="steel_section" title="A" size="thumb" testId="one" />
        <ModelViewer mesh={mesh} family="steel_section" title="A" size="thumb" testId="two" />
      </>,
    )
    expect(byTestId('one').innerHTML).toBe(byTestId('two').innerHTML)
  })

  it('draws in the house style: ink hairlines, paper-toned fills and no shadow', () => {
    render(<ModelViewer mesh={mesh} family="steel_section" title="A" />)
    const viewer = byTestId('model-viewer')
    expect(viewer.querySelector('ellipse, [data-part="shadow"], radialGradient, linearGradient, feGaussianBlur, feDropShadow')).toBeNull()
    const faces = Array.from(viewer.querySelectorAll('polygon'))
    expect(faces.length).toBeGreaterThanOrEqual(3)
    for (const f of faces) {
      expect(f.getAttribute('stroke')).toBe('var(--color-ink)')
      expect(f.getAttribute('stroke-width')).toBe('0.75')
      expect(f.getAttribute('fill')).not.toBe('#6b7a86')
    }
  })
})

describe('CollapsiblePanel', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts closed, toggles aria-expanded and hidden, and remembers its state across a remount', () => {
    const panel = () => (
      <CollapsiblePanel id="home-activity-client" title="Recent activity" summary="2 updates" toggleTestId="toggle">
        <p>Isla Brennan approved UB 457x191x67</p>
      </CollapsiblePanel>
    )
    render(panel())
    const toggle = byTestId('toggle')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    const body = document.getElementById(toggle.getAttribute('aria-controls')!)!
    expect(body.hidden).toBe(true)
    expect(toggle.textContent).toContain('2 updates')
    click(toggle)
    expect(byTestId('toggle').getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('home-activity-client-body')!.hidden).toBe(false)
    expect(document.body.textContent).toContain('Isla Brennan approved')
    expect(byTestId('toggle').textContent).not.toContain('2 updates')
    expect(JSON.parse(window.localStorage.getItem(PANELS_STORAGE_KEY)!)).toEqual({ 'home-activity-client': true })
    cleanup()
    render(panel())
    expect(byTestId('toggle').getAttribute('aria-expanded')).toBe('true')
  })

  it('still works when browser storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(
      <CollapsiblePanel id="blocked-panel" title="Recent activity" toggleTestId="toggle">
        <p>Body</p>
      </CollapsiblePanel>,
    )
    click(byTestId('toggle'))
    expect(byTestId('toggle').getAttribute('aria-expanded')).toBe('true')
    cleanup()
    render(
      <CollapsiblePanel id="blocked-panel" title="Recent activity" toggleTestId="toggle">
        <p>Body</p>
      </CollapsiblePanel>,
    )
    expect(byTestId('toggle').getAttribute('aria-expanded')).toBe('true')
    spy.mockRestore()
    get.mockRestore()
  })
})

describe('tracking and documents', () => {
  it('reads every status in words and changes it from the select', () => {
    function Demo() {
      const [v, setV] = useState<'in_progress' | 'at_risk' | 'not_started' | 'evidence_ready' | 'not_applicable'>('in_progress')
      return (
        <>
          <TrackStatusSelect label="Status of Policy SI 7" value={v} onChange={setV} testId="sel" />
          <TrackStatusPill status={v} testId="pill" />
        </>
      )
    }
    render(<Demo />)
    const sel = byTestId('sel') as HTMLSelectElement
    expect(accessibleName(sel)).toBe('Status of Policy SI 7')
    expect(Array.from(sel.options).map((o) => o.textContent)).toEqual(['Not started', 'In progress', 'At risk', 'Evidence ready', 'Not applicable'])
    sel.value = 'at_risk'
    sel.dispatchEvent(new Event('change', { bubbles: true }))
    expect(byTestId('pill').textContent).toBe('At risk')
    expect(byTestId('pill').getAttribute('data-status')).toBe('at_risk')
  })

  it('edits a statement section, offers a reset and warns when the figures moved on', () => {
    const onSave = vi.fn()
    const onReset = vi.fn()
    render(<StatementSection id="approach" heading="Strategic approach" text="Generated text." edited stale canEdit onSave={onSave} onReset={onReset} onKeep={() => undefined} />)
    expect(byTestId('statement-section-approach').textContent).toContain('Edited')
    expect(byTestId('statement-stale-approach').textContent).toContain("The project's figures have changed since this section was edited.")
    click(byTestId('statement-reset-approach'))
    expect(onReset).toHaveBeenCalled()
    click(byTestId('statement-edit-approach'))
    const area = byRole('textbox', 'Strategic approach') as HTMLTextAreaElement
    expect(area.value).toBe('Generated text.')
    click(byTestId('statement-save-approach'))
    expect(onSave).toHaveBeenCalledWith('Generated text.')
    expect(allByRole('textbox')).toHaveLength(0)
  })

  it('shows a read-only section without controls', () => {
    render(<StatementSection id="carbon" heading="Upfront carbon avoided" text="47.8 tCO2e secured." />)
    expect(allByRole('button')).toHaveLength(0)
    expect(document.body.textContent).toBe('Upfront carbon avoided47.8 tCO2e secured.')
  })
})
