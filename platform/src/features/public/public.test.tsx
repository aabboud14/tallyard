// @vitest-environment jsdom
// The public pages: the landing page leads to sign in and sign up, every picture is labelled, and no text
// carries a forbidden character (P6) or a real company name (P5).
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { DENIED_NAMES } from '../../domain/reference/names'
import { accessibleName, allByRole, allText, byRole, byTestId, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { FAMILY_IDS } from '../../domain/reference/families'
import { TYPOLOGY_LABELS } from '../../domain/reference/labels'
import { Landing } from './Landing'
import { LandingScene } from './LandingScene'
import { LANDING_FACTS, LANDING_ROLES, SCENE_LABEL } from './landingContent'
import { NotFound } from './NotFound'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

describe('Landing', () => {
  it('has one main heading and the ways in', () => {
    render(<Landing />)
    expect(allByRole('heading').filter((h) => h.tagName === 'H1').map((h) => h.textContent)).toEqual(['Reuse the buildings coming down in the buildings going up'])
    const hrefs = allByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/signin')
    expect(hrefs).toContain('/signup')
    expect(byRole('link', 'Get started').getAttribute('href')).toBe('/signup')
    expect(byRole('link', 'Sign in').getAttribute('href')).toBe('/signin')
  })

  it('names every role and the three steps', () => {
    render(<Landing />)
    for (const r of ['Architects', 'Clients and developers', 'Donor buildings', 'Site surveyors', 'Sustainability consultants', 'Capture and decide', 'Find and shortlist', 'Approve and reserve']) {
      expect(byRole('heading', r)).toBeTruthy()
    }
  })

  it('labels every picture and link, and uses only allowed words', () => {
    render(<Landing />)
    for (const a of allByRole('link')) expect(accessibleName(a)).not.toBe('')
    for (const img of allByRole('img')) expect(accessibleName(img)).not.toBe('')
    const text = allText()
    expect(text).not.toMatch(FORBIDDEN)
    for (const n of DENIED_NAMES) expect(text).not.toContain(n)
    expect(text.toLowerCase()).not.toMatch(/\bai\b|artificial intelligence|prototype|demo/)
  })
})

describe('Landing, round 2', () => {
  it('draws a building coming down beside one going up, the same every time', () => {
    render(
      <>
        <LandingScene />
        <LandingScene />
      </>,
    )
    const [a, b] = allByRole('img')
    expect(accessibleName(a)).toBe(SCENE_LABEL)
    expect(a.outerHTML).toBe(b.outerHTML)
    expect(a.querySelector('[data-sketch="existing"]')).not.toBeNull()
    expect(a.querySelector('[data-sketch="proposed"] [data-part="crane"]')).not.toBeNull()
    expect(a.querySelectorAll('[data-part="yard-item"]').length).toBeGreaterThanOrEqual(5)
    expect(a.querySelector('[data-part="route"]')?.getAttribute('stroke-dasharray')).toBe('4 4')
    expect(a.querySelector('marker, [marker-end], radialGradient, linearGradient, filter')).toBeNull()
  })

  it('has no glows, masks, blur, halos or floating cards', () => {
    render(<Landing />)
    const html = byTestId('landing').outerHTML
    expect(html).not.toMatch(/backdrop-blur|blur-|mask-image|radial-gradient|bg-gradient|rotate-\[|shadow-pop|shadow-\[[^\]]*_\d+px_[1-9]\d*px/)
    expect(byTestId('landing').querySelector('header')?.className).toContain('bg-page')
  })

  it('states true facts about the product', () => {
    render(<Landing />)
    expect(LANDING_FACTS.map((f) => f.figure)).toEqual(['5 workspaces', '7 material families', '3 typologies', 'Every figure indicative'])
    expect(LANDING_ROLES).toHaveLength(5)
    expect(FAMILY_IDS).toHaveLength(7)
    expect(Object.keys(TYPOLOGY_LABELS)).toHaveLength(3)
    for (const f of LANDING_FACTS) expect(byTestId(`fact-${f.key}`).textContent).toContain(f.line)
  })

  it('shows the new dashboard as an inert product shot with sample figures', () => {
    render(<Landing />)
    const shot = byTestId('product-shot')
    expect(shot.getAttribute('aria-hidden')).toBe('true')
    expect(shot.hasAttribute('inert')).toBe(true)
    const text = shot.textContent ?? ''
    for (const t of ['Home', 'Marketplace', 'Saved', 'Active projects', 'Materials shortlisted', 'Waiting for approval', 'Over a week', 'Merrowgate Wharf', 'Sallow Court', 'Indicative']) expect(text).toContain(t)
    expect(text).not.toContain('Discover')
    expect(shot.querySelectorAll('svg[data-sketch="proposed"]')).toHaveLength(3)
    expect(document.body.textContent).toContain('Sample data in the sandbox.')
  })

  it('lists the architect tools and the donor building owner in round 2 words', () => {
    render(<Landing />)
    expect(byTestId('role-architect').textContent).toContain('MarketplaceShortlistSpecification')
    expect(byTestId('role-owner').textContent).toContain('Recovery plan')
    expect(document.body.textContent).not.toMatch(/Discover|Priorities|asset owner/i)
    for (const n of ['01', '02', '03']) expect(byTestId(`sheet-${n}`).querySelector('h3')).not.toBeNull()
  })
})

describe('NotFound', () => {
  it('says the page is missing and links home', () => {
    render(<NotFound />)
    expect(byRole('heading', 'Page not found')).toBeTruthy()
    expect(byRole('link', 'Go to home').getAttribute('href')).toBe('/')
    expect(allText()).not.toMatch(FORBIDDEN)
  })

  it('can send a signed-in person to their home', () => {
    render(<NotFound homeHref="/app/home" homeLabel="Back to your home" />)
    expect(byRole('link', 'Back to your home').getAttribute('href')).toBe('/app/home')
  })
})
