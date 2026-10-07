// @vitest-environment jsdom
// Gallery test: every version 1.0 building block renders with its roles and test ids, and no text
// carries a dash, an arrow, a tick or a comparison sign (R7).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import type { Spec } from '../../domain/types'
import type { Band } from '../../domain/v1types'
import { BAND_WORDS, TIMELINE_TEXT } from '../../domain/reference/labels'
import { Bookmark, ChipGroup, Close, Download, Filter, Folder, FolderOpen, ListingCard, Lock, MaterialSwatch, Menu, Plus, Sheet, SustainabilityBand, TagRow, TimelineStrip } from './index'
import { Tag } from '../ui'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const FORBIDDEN = /[\u2013\u2014\u2190-\u21FF\u2794\u27A1\u2B05-\u2B07\u2713\u2714\u2717\u2718<>\u2264\u2265]|->|=>/

let root: Root | null = null
let host: HTMLDivElement | null = null

function render(ui: ReactNode): HTMLElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(<MemoryRouter>{ui}</MemoryRouter>))
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  document.body.innerHTML = ''
})

/** Every visible string and every accessible name in the document. */
function allText(): string {
  const labels = Array.from(document.querySelectorAll('[aria-label]')).map((e) => e.getAttribute('aria-label') ?? '')
  return [document.body.textContent ?? '', ...labels].join('\n')
}

function byTestId(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!el) throw new Error('No element with test id ' + id)
  return el
}

const SPECS: { spec: Spec; publicId: string; name: string }[] = [
  { spec: { family: 'steel_section', designation: 'UB 356x171x51', lengthM: 6 }, publicId: 'L-9F4CQQ', name: 'structural steel section' },
  { spec: { family: 'curtain_wall', system: 'Unitised', panelWidthM: 1.5, panelHeightM: 3.6 }, publicId: 'L-8N33X4', name: 'curtain wall panel' },
  { spec: { family: 'precast_cladding', thicknessMm: 150 }, publicId: 'L-PRE001', name: 'precast cladding panel' },
  { spec: { family: 'stone_cladding', stone: 'Portland', thicknessMm: 50 }, publicId: 'L-DAXNV3', name: 'stone cladding' },
  { spec: { family: 'clay_brick', brickType: 'London stock', mortar: 'lime mortar' }, publicId: 'L-A945G6', name: 'clay brick' },
  { spec: { family: 'clay_brick', brickType: 'facing', mortar: 'cement mortar' }, publicId: 'L-5RC3DR', name: 'clay brick' },
  { spec: { family: 'raised_floor', panelSize: '600 by 600' }, publicId: 'L-33XJ8M', name: 'raised access floor panel' },
  { spec: { family: 'timber_joist', species: 'pitch pine' }, publicId: 'L-CJGQP7', name: 'timber joist' },
]

describe('MaterialSwatch', () => {
  it('draws every family as a labelled illustration, never a photograph', () => {
    render(
      <div>
        {SPECS.map((s, i) => (
          <MaterialSwatch key={i} spec={s.spec} publicId={s.publicId} testId={`swatch-${i}`} />
        ))}
      </div>,
    )
    SPECS.forEach((s, i) => {
      const el = byTestId(`swatch-${i}`)
      expect(el.getAttribute('role')).toBe('img')
      expect(el.getAttribute('aria-label')).toBe(`Illustration of ${s.name}`)
      expect(el.getAttribute('data-family')).toBe(s.spec.family)
      expect(el.querySelector('svg')).not.toBeNull()
    })
    expect(allText().toLowerCase()).not.toMatch(/photo/)
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('centres the existing section drawing for steel', () => {
    render(<MaterialSwatch spec={SPECS[0].spec} publicId="L-9F4CQQ" testId="sw" />)
    expect(byTestId('sw').querySelector('[aria-label="Section drawing of UB 356x171x51"]')).not.toBeNull()
  })

  it('is deterministic from the public ID and varies between IDs', () => {
    const brick = SPECS[4].spec
    const html = (id: string) => {
      const el = render(<MaterialSwatch spec={brick} publicId={id} />)
      const out = el.querySelector('svg')!.innerHTML.replace(/id="[^"]*"|url\(#[^)]*\)/g, '')
      act(() => root?.unmount())
      host?.remove()
      root = null
      return out
    }
    const a1 = html('L-A945G6')
    const a2 = html('L-A945G6')
    const b = html('L-ZZZZZZ')
    expect(a1).toBe(a2)
    expect(a1).not.toBe(b)
  })
})

describe('SustainabilityBand', () => {
  const bands: Band[] = [
    { band: 'high', segments: 3, word: BAND_WORDS.high },
    { band: 'medium', segments: 2, word: BAND_WORDS.medium },
    { band: 'low', segments: 1, word: BAND_WORDS.low },
    { band: 'none', segments: 0, word: BAND_WORDS.none },
  ]
  it('fills one teal segment per level and shows the word', () => {
    render(
      <div>
        {bands.map((b) => (
          <SustainabilityBand key={b.band} band={b} testId={`band-${b.band}`} />
        ))}
      </div>,
    )
    for (const b of bands) {
      const el = byTestId(`band-${b.band}`)
      expect(el.textContent).toBe(b.word)
      expect(el.getAttribute('data-segments')).toBe(String(b.segments))
      const segs = el.querySelectorAll('[aria-hidden="true"] > span')
      expect(segs).toHaveLength(3)
      expect(Array.from(segs).filter((s) => s.className.includes('bg-teal'))).toHaveLength(b.segments)
    }
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('TimelineStrip', () => {
  it('draws a window, today and the start, coloured by fit', () => {
    render(
      <div>
        <TimelineStrip today="2026-10-07" startDate="2028-04-03" window={{ start: '2027-01-01', end: '2027-03-31' }} fit="in_time" testId="tl-in" />
        <TimelineStrip today="2026-10-07" startDate="2027-03-01" window={{ start: '2027-01-01', end: '2027-03-31' }} fit="tight" testId="tl-tight" />
        <TimelineStrip today="2026-10-07" startDate="2027-02-01" window={{ start: '2027-04-01', end: '2027-06-30' }} fit="late" testId="tl-late" />
        <TimelineStrip today="2026-10-07" startDate="2027-06-07" window={null} fit="now" testId="tl-now" />
      </div>,
    )
    const inTime = byTestId('tl-in')
    expect(inTime.getAttribute('data-fit')).toBe('in_time')
    expect(inTime.querySelector('svg')!.getAttribute('role')).toBe('img')
    expect(inTime.querySelector('[data-part="window"]')!.getAttribute('stroke')).toBe('#2E7D6B')
    expect(inTime.textContent).toContain('Today 7 Oct 2026')
    expect(inTime.textContent).toContain('Start 3 Apr 2028')
    expect(inTime.textContent).toContain('Available 1 Jan 2027 to 31 Mar 2027')
    expect(inTime.querySelector('svg')!.getAttribute('aria-label')).toContain(TIMELINE_TEXT.in_time)
    expect(byTestId('tl-tight').querySelector('[data-part="window"]')!.getAttribute('stroke')).toBe('#F4C20D')
    expect(byTestId('tl-late').querySelector('[data-part="window"]')!.getAttribute('stroke')).toBe('#A63A22')
    expect(byTestId('tl-now').textContent).toContain('Available now')
    // The window sits on the scale between today and the start for an in-time lot.
    const bar = inTime.querySelector('[data-part="window"]')!
    const start = inTime.querySelector('[data-part="start"]')!
    expect(Number(bar.getAttribute('x')) + Number(bar.getAttribute('width'))).toBeLessThan(Number(start.getAttribute('x1')))
    expect(Number(start.getAttribute('x1'))).toBeLessThan(1000)
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('ChipGroup', () => {
  it('is a single-select group of pressed toggles', () => {
    const changes: (string | null)[] = []
    function Harness() {
      const [v, setV] = useState<string | null>(null)
      return (
        <ChipGroup
          ariaLabel="Typology"
          testId="chips"
          value={v}
          onChange={(n) => {
            changes.push(n)
            setV(n)
          }}
          options={[
            { value: null, label: 'All', count: 24 },
            { value: 'structure', label: 'Structure', count: 9 },
            { value: 'envelope', label: 'Envelope', count: 11 },
          ]}
        />
      )
    }
    render(<Harness />)
    const group = byTestId('chips')
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('aria-label')).toBe('Typology')
    expect(byTestId('chips-all').getAttribute('aria-pressed')).toBe('true')
    expect(byTestId('chips-structure').getAttribute('aria-pressed')).toBe('false')
    act(() => byTestId('chips-structure').click())
    expect(changes).toEqual(['structure'])
    expect(byTestId('chips-structure').getAttribute('aria-pressed')).toBe('true')
    expect(byTestId('chips-all').getAttribute('aria-pressed')).toBe('false')
    for (const b of Array.from(group.querySelectorAll('button'))) expect(b.className).toContain('min-h-[44px]')
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('Sheet', () => {
  it('opens as a titled dialog, closes on Escape and on the close button', () => {
    const onOpenChange = vi.fn()
    render(
      <Sheet open onOpenChange={onOpenChange} title="Filters" side="bottom" testId="sheet">
        <button type="button">Inside</button>
      </Sheet>,
    )
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog).not.toBeNull()
    expect(dialog.getAttribute('data-testid')).toBe('sheet')
    expect(dialog.getAttribute('data-side')).toBe('bottom')
    expect(dialog.textContent).toContain('Filters')
    expect(dialog.contains(document.activeElement)).toBe(true)
    act(() => {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    onOpenChange.mockClear()
    act(() => byTestId('sheet-close').click())
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(byTestId('sheet-close').getAttribute('aria-label')).toBe('Close')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('renders nothing when closed', () => {
    render(
      <Sheet open={false} onOpenChange={() => {}} title="Filters" testId="sheet">
        <p>Body</p>
      </Sheet>,
    )
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('ListingCard', () => {
  it('shows the visual, a linked title, tags, facts and the footer', () => {
    render(
      <ListingCard
        to="/market/L-9F4CQQ"
        testId="card-L-9F4CQQ"
        visual={<MaterialSwatch spec={SPECS[0].spec} publicId="L-9F4CQQ" />}
        title="UB 356x171x51, 6.0 m"
        tags={
          <>
            <TagRow>
              <Tag tone="grey">Structure</Tag>
              <Tag tone="steel">Structural steel section</Tag>
            </TagRow>
            <TagRow>
              <SustainabilityBand band={{ band: 'high', segments: 3, word: 'High' }} size="sm" testId="card-band" />
            </TagRow>
          </>
        }
        facts={[
          { label: 'Quantity', value: '48 pieces', testId: 'card-qty' },
          { label: 'Availability', value: 'Q1 2027' },
          { label: 'Location', value: 'Central London' },
          { label: 'Mass', value: '14.7 t', testId: 'card-mass' },
        ]}
        footer={
          <button type="button" aria-label="Save" className="min-h-[44px]">
            <Bookmark />
          </button>
        }
      />,
    )
    const card = byTestId('card-L-9F4CQQ')
    expect(card.tagName).toBe('ARTICLE')
    const link = card.querySelector('a')!
    expect(link.getAttribute('href')).toBe('/market/L-9F4CQQ')
    expect(link.textContent).toBe('UB 356x171x51, 6.0 m')
    expect(card.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Illustration of structural steel section')
    expect(byTestId('card-qty').textContent).toBe('48 pieces')
    expect(byTestId('card-mass').textContent).toBe('14.7 t')
    expect(byTestId('card-band').textContent).toBe('High')
    expect(card.querySelectorAll('dt')).toHaveLength(4)
    // The save control is a sibling of the link, never inside it.
    expect(link.querySelector('button')).toBeNull()
    expect(card.querySelector('button[aria-label="Save"]')).not.toBeNull()
    expect(allText()).not.toMatch(FORBIDDEN)
  })
})

describe('Icons', () => {
  it('are decorative inline SVG with no text glyphs', () => {
    render(
      <div data-testid="icons">
        <Bookmark />
        <Bookmark filled />
        <Download />
        <Folder />
        <FolderOpen />
        <Plus />
        <Filter />
        <Close />
        <Menu />
        <Lock />
      </div>,
    )
    const svgs = byTestId('icons').querySelectorAll('svg')
    expect(svgs).toHaveLength(10)
    for (const s of Array.from(svgs)) expect(s.getAttribute('aria-hidden')).toBe('true')
    expect(byTestId('icons').textContent).toBe('')
    expect(svgs[0].getAttribute('data-filled')).toBe('false')
    expect(svgs[1].getAttribute('data-filled')).toBe('true')
    expect(svgs[1].querySelector('path')!.getAttribute('fill')).toBe('currentColor')
  })
})
