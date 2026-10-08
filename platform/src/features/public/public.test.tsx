// @vitest-environment jsdom
// The public pages: the landing page leads to sign in and sign up, every picture is labelled, and no text
// carries a forbidden character (P6) or a real company name (P5).
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { DENIED_NAMES } from '../../domain/reference/names'
import { accessibleName, allByRole, allText, byRole, cleanup, FORBIDDEN, installDomShims, render } from '../../ui/testing'
import { Landing } from './Landing'
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
    for (const r of ['Architects', 'Clients and developers', 'Asset owners', 'Site surveyors', 'Sustainability consultants', 'Capture and decide', 'Find and shortlist', 'Approve and reserve']) {
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
