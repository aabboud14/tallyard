// @vitest-environment jsdom
// Drawing variety from the recording audit: a steel card draws the member's cut end, filled in the colour of its
// type, at one scale shared by every card, with its type and depth in large type, so a page of steel no longer
// reads as one beam; masonry and stone faces show their storeys with punched windows.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, installDomShims, render } from '../testing'
import { SectionAxo, SectionCard } from './drawings'
import { STEEL_CARD_PX_PER_M, STEEL_CARD_PX_PER_MM, STEEL_TINT } from './helpers'
import { BuildingIllustration } from './BuildingIllustration'
import { buildingSketch } from '../../domain/sketch'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

function draw(designation: string, view: 'card' | 'detail' = 'card', lengthM = 6): SVGElement {
  const id = `${designation}-${view}`
  render(
    <svg viewBox="0 0 480 360" data-testid={id}>
      {view === 'card' ? <SectionCard designation={designation} lengthM={lengthM} uid={`u-${id.replace(/\W/g, '')}`} /> : <SectionAxo designation={designation} lengthM={lengthM} uid={`u-${id.replace(/\W/g, '')}`} view="detail" />}
    </svg>,
  )
  return document.querySelector<SVGElement>(`[data-testid="${id}"]`)!
}

/** The drawn height of the card's end view: the section depth at the one card scale. */
function endViewHeight(svg: SVGElement): number {
  const g = svg.querySelector('[data-part="end-view"]')!
  const scale = Number(/scale\(([\d.]+)\)/.exec(g.querySelector('path')!.getAttribute('transform')!)![1])
  const d = g.querySelector('path')!.getAttribute('d')!
  const ys = Array.from(d.matchAll(/V ([\d.]+)/g)).map((m) => Number(m[1]))
  return Math.max(...ys) * scale
}

describe('steel card drawings', () => {
  it('draws every end view at one scale on one ground line, so a deep beam stands three times as tall as a squat column', () => {
    const beam = draw('UB 610x229x101')
    const column = draw('UC 203x203x46')
    expect(endViewHeight(beam)).toBeCloseTo(602.6 * STEEL_CARD_PX_PER_MM, 1)
    expect(endViewHeight(column)).toBeCloseTo(203.2 * STEEL_CARD_PX_PER_MM, 1)
    expect(endViewHeight(beam)).toBeGreaterThan(endViewHeight(column) * 2.9)
    // Both stand on the same ground line: their translate y plus their height is the same.
    const base = (svg: SVGElement) => Number(/translate\([\d.]+ ([\d.]+)\)/.exec(svg.querySelector('[data-part="end-view"]')!.getAttribute('transform')!)![1]) + endViewHeight(svg)
    expect(base(beam)).toBeCloseTo(base(column), 0)
  })

  it('names the type and serial depth in large type, in the colour of its type, with the real size and length', () => {
    const beam = draw('UB 610x229x101', 'card', 9.5)
    const column = draw('UC 203x203x46', 'card', 3.2)
    expect(beam.querySelector('[data-part="designation-type"]')!.textContent).toBe('UB 610')
    expect(column.querySelector('[data-part="designation-type"]')!.textContent).toBe('UC 203')
    expect(beam.querySelector('[data-part="designation-type"]')!.getAttribute('fill')).toBe(STEEL_TINT.UB)
    expect(column.querySelector('[data-part="designation-type"]')!.getAttribute('fill')).toBe(STEEL_TINT.UC)
    expect(STEEL_TINT.UB).not.toBe(STEEL_TINT.UC)
    expect(beam.querySelector('[data-part="end-view"] path')!.getAttribute('fill')).toBe(STEEL_TINT.UB)
    expect(beam.textContent).toContain('Universal beam')
    expect(column.textContent).toContain('Universal column')
    expect(beam.querySelector('[data-part="section-size"]')!.textContent).toBe('602.6 x 227.6 mm')
    expect(beam.querySelector('[data-part="depth-label"]')!.textContent).toBe('602.6')
    expect(beam.querySelector('[data-part="length"]')!.textContent).toBe('9.5 m long')
    // The length bar is at one scale too.
    expect(Number(column.querySelector('[data-part="length"] rect')!.getAttribute('width'))).toBeCloseTo(3.2 * STEEL_CARD_PX_PER_M, 1)
  })

  it('says the end view is to a common scale, never "not to scale", and keeps the axonometric for the detail view', () => {
    const card = draw('UC 203x203x46')
    expect(card.querySelector('[data-part="title-strip"]')!.textContent).toBe('End view to a common scale')
    expect(card.textContent).not.toMatch(/not to scale/i)
    const detail = draw('UC 203x203x46', 'detail')
    expect(detail.querySelector('[data-part="section-axo"]')).not.toBeNull()
    expect(detail.querySelector('[data-part="section-card"]')).toBeNull()
  })
})

describe('building drawings', () => {
  it('shows each storey of a brick building with a row of windows', () => {
    const sketch = buildingSketch({ id: 'b-brick', storeys: 5, structureType: 'Load-bearing brick' }, ['clay_brick'])
    render(<BuildingIllustration sketch={sketch} />)
    const block = document.querySelector('[data-facade="brick"]')!
    // Two faces, five storeys, at least three bays on each.
    expect(block.querySelectorAll('polygon[opacity="0.6"]').length).toBeGreaterThanOrEqual(2 * 5 * 3)
  })
})
