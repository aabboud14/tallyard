// @vitest-environment jsdom
// The round 2 look fixes: keyboard focus that draws, no blur or gradients, thumbnails that show the whole drawing,
// a dimension label clear of its line, and breadcrumbs that keep the current page.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { projectSketch } from '../domain/sketch'
import { cleanup, installDomShims, render } from './testing'
import { Avatar, Breadcrumbs, BuildingIllustration, MaterialIllustration, ProjectThumbnail } from './index'
import { focusRing } from './cx'
import { SAMPLE_MATERIALS } from './samples'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

const SRC = path.resolve(__dirname, '..')

function sources(dir = SRC, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) sources(p, out)
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p)
  }
  return out
}

describe('keyboard focus', () => {
  it('sets the outline style wherever a focus outline is drawn, since outline-none sets it to none (Tailwind 4)', () => {
    expect(focusRing).toContain('focus-visible:outline-solid')
    const missing: string[] = []
    for (const file of sources()) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/(^|[\s'"`])focus-visible:outline-2/.test(line) && !line.includes('focus-visible:outline-solid')) missing.push(`${path.relative(SRC, file)}:${i + 1}`)
        })
    }
    expect(missing).toEqual([])
  })
})

describe('the flat look', () => {
  it('uses no backdrop blur and no gradient fills in the app', () => {
    const found: string[] = []
    for (const file of sources()) {
      const text = readFileSync(file, 'utf8')
      if (/backdrop-blur|bg-gradient-to|linear-gradient\(180deg/.test(text)) found.push(path.relative(SRC, file))
    }
    expect(found).toEqual([])
  })

  it('fills an avatar flat, with its 1 px ring', () => {
    const host = render(<Avatar name="Priya Nair" />, { router: false })
    const el = host.querySelector('[role="img"]') as HTMLElement
    expect(el.style.background).not.toContain('gradient')
    expect(el.style.background).not.toBe('')
    expect(el.style.boxShadow).toContain('inset')
  })
})

describe('thumbnails', () => {
  const sketch = projectSketch({ id: 'p', name: 'P', projectType: 'office' }, ['steel_section', 'stone_cladding'])

  it('fit the whole board in any frame, standing on the bottom edge, with the ground run past the board', () => {
    const host = render(<BuildingIllustration sketch={sketch} />, { router: false })
    const svg = host.querySelector('svg')!
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMax meet')
    const ground = svg.querySelector('rect')!
    expect(Number(ground.getAttribute('x'))).toBeLessThan(0)
    expect(Number(ground.getAttribute('width'))).toBeGreaterThan(320)
    expect(svg.querySelectorAll('circle').length).toBe(3)
  })

  it('leave out the left trees where a project thumbnail lays its swatches', () => {
    const m = SAMPLE_MATERIALS[0]
    const host = render(<ProjectThumbnail sketch={sketch} materials={[{ publicId: m.publicId, spec: m.spec }]} />, { router: false })
    const circles = Array.from(host.querySelectorAll('svg[data-sketch] > g > circle'))
    expect(circles.length).toBe(1)
    expect(Number(circles[0].getAttribute('cx'))).toBeGreaterThan(160)
    const bare = render(<ProjectThumbnail sketch={sketch} />, { router: false })
    expect(bare.querySelectorAll('svg[data-sketch] > g > circle').length).toBe(3)
  })
})

describe('the steel detail drawing', () => {
  it('sets the flange width label before its dimension line, level with it, not on it', () => {
    const steel = SAMPLE_MATERIALS[0]
    const host = render(<MaterialIllustration spec={steel.spec} publicId={steel.publicId} view="detail" />, { router: false })
    const label = host.querySelector('text[data-label="before"]')!
    expect(label).not.toBeNull()
    expect(label.getAttribute('text-anchor')).toBe('end')
    const dim = label.closest('[data-part="dimension"]')!
    const main = dim.querySelectorAll('line')[2]
    const lineStart = Math.min(Number(main.getAttribute('x1')), Number(main.getAttribute('x2')))
    expect(Number(label.getAttribute('x'))).toBeLessThan(lineStart)
  })
})

describe('breadcrumbs', () => {
  it('keep the current page from shrinking, so the levels above truncate first', () => {
    const host = render(<Breadcrumbs items={[{ label: 'Buildings', href: '/a' }, { label: 'Tiverne House', href: '/b' }, { label: 'Recovery plan' }]} />)
    const items = host.querySelectorAll('li')
    expect(items[2].className).toContain('shrink-0')
    expect(items[0].className).not.toContain('shrink-0')
  })
})
