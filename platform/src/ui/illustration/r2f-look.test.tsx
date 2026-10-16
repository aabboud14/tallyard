// @vitest-environment jsdom
// Drawing variety from the recording audit: steel cards draw each member at a size that follows its depth, with a
// flat end view labelled in millimetres, so a page of steel no longer reads as one beam; masonry and stone faces
// show their storeys with punched windows.
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, installDomShims, render } from '../testing'
import { SectionAxo } from './drawings'
import { BuildingIllustration } from './BuildingIllustration'
import { buildingSketch } from '../../domain/sketch'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

function axo(designation: string, view: 'card' | 'detail' = 'card'): SVGElement {
  render(
    <svg viewBox="0 0 480 360" data-testid={designation}>
      <SectionAxo designation={designation} lengthM={6} uid={`u-${designation.replace(/\W/g, '')}`} view={view} />
    </svg>,
  )
  return document.querySelector<SVGElement>(`[data-testid="${designation}"]`)!
}

/** The height of the hatched near-end outline, from its points. */
function nearEndHeight(svg: SVGElement): number {
  const polys = Array.from(svg.querySelectorAll('[data-part="section-axo"] > polygon'))
  const cut = polys[polys.length - 1]
  const ys = cut.getAttribute('points')!.split(' ').map((p) => Number(p.split(',')[1]))
  return Math.max(...ys) - Math.min(...ys)
}

describe('steel card drawings', () => {
  it('draws a deep beam taller than a squat column, each with its end view in millimetres', () => {
    const beam = axo('UB 610x229x101')
    const column = axo('UC 203x203x46')
    expect(nearEndHeight(beam)).toBeGreaterThan(nearEndHeight(column) * 1.7)
    expect(beam.querySelector('[data-part="section-inset"]')!.textContent).toBe('602.6 x 227.6mm')
    expect(column.querySelector('[data-part="section-inset"]')!.textContent).toBe('203.2 x 203.6mm')
    // Still dimensioned along its length.
    expect(beam.textContent).toContain('6.0 m')
  })

  it('keeps the detail view at full board size, without the inset', () => {
    const detail = axo('UC 203x203x46', 'detail')
    expect(detail.querySelector('[data-part="section-inset"]')).toBeNull()
    expect(nearEndHeight(detail)).toBeGreaterThan(nearEndHeight(axo('UC 203x203x60')) * 1.3)
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
