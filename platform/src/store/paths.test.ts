import { describe, expect, it } from 'vitest'
import { MARKETPLACE_PATH, marketplaceHref, marketplacePathFor, materialHref, sharedWithProjectHref } from './paths'

describe('Marketplace addresses', () => {
  it('builds the Marketplace address, with a project and extra parameters in order', () => {
    expect(MARKETPLACE_PATH).toBe('/app/marketplace')
    expect(marketplaceHref()).toBe('/app/marketplace')
    expect(marketplaceHref('prj_x')).toBe('/app/marketplace?project=prj_x')
    expect(marketplaceHref(null, { type: 'envelope' })).toBe('/app/marketplace?type=envelope')
    expect(marketplaceHref('prj_x', { type: 'envelope', sort: 'carbon' })).toBe('/app/marketplace?project=prj_x&type=envelope&sort=carbon')
  })

  it('builds material and shared addresses', () => {
    expect(materialHref('L-9F4CQQ')).toBe('/app/marketplace/L-9F4CQQ')
    expect(materialHref('L-9F4CQQ', 'prj_x')).toBe('/app/marketplace/L-9F4CQQ?project=prj_x')
    expect(sharedWithProjectHref('prj_x')).toBe('/app/marketplace?tab=shared&project=prj_x')
  })

  it('moves old Discover paths to the Marketplace and leaves everything else alone', () => {
    expect(marketplacePathFor('/app/discover')).toBe('/app/marketplace')
    expect(marketplacePathFor('/app/discover/')).toBe('/app/marketplace')
    expect(marketplacePathFor('/app/discover/L-1')).toBe('/app/marketplace/L-1')
    expect(marketplacePathFor('/app/projects/x')).toBe('/app/projects/x')
    expect(marketplacePathFor('/app/discovery')).toBe('/app/discovery')
  })
})
