import { describe, it, expect } from 'vitest'
import { captureAssist, CLOSEST_MATCH } from './assist'

describe('B13 capture assist (F14)', () => {
  it('B13.1 48 no. 457x191x67 UB, 7.5m long, bolted, levels 1 to 6', () => {
    const r = captureAssist('48 no. 457x191x67 UB, 7.5m long, bolted, levels 1 to 6')
    expect(r).toMatchObject({ family: 'steel_section', section: 'UB 457x191x67', pieces: 48, lengthM: 7.5, recoverability: 'A', location: 'levels 1 to 6', sectionFlag: null })
  })
  it('B13.2 UC 305 x 305 x 118 columns x 54 @ 3.8 m', () => {
    const r = captureAssist('UC 305 x 305 x 118 columns x 54 @ 3.8 m')
    expect(r).toMatchObject({ family: 'steel_section', section: 'UC 305x305x118', pieces: 54, lengthM: 3.8, recoverability: null, location: null })
  })
  it('B13.3 30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room', () => {
    const r = captureAssist('30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room')
    expect(r).toMatchObject({ family: 'steel_section', section: 'UC 203x203x46', pieces: 30, lengthM: 3.2, recoverability: 'A', location: 'roof plant room' })
    expect(r.missing).toEqual([])
  })
  it('B13.4 approx 600 m2 portland stone cladding 50mm', () => {
    const r = captureAssist('approx 600 m2 portland stone cladding 50mm')
    expect(r).toMatchObject({ family: 'stone_cladding', areaM2: 600, thicknessMm: 50, pieces: null })
  })
  it('B13.5 3000 raised access floor panels 600x600', () => {
    const r = captureAssist('3000 raised access floor panels 600x600')
    expect(r).toMatchObject({ family: 'raised_floor', pieces: 3000, panelWidthM: 0.6, panelHeightM: 0.6, section: null })
  })
  it('B13.6 20,000 facing bricks, cement mortar', () => {
    const r = captureAssist('20,000 facing bricks, cement mortar')
    expect(r).toMatchObject({ family: 'clay_brick', pieces: 20000, recoverability: 'C' })
  })
  it('B13.7 78 curtain wall panels 1.5 x 3.6 m', () => {
    const r = captureAssist('78 curtain wall panels 1.5 x 3.6 m')
    expect(r).toMatchObject({ family: 'curtain_wall', pieces: 78, panelWidthM: 1.5, panelHeightM: 3.6 })
    expect(r.areaM2).toBeCloseTo(421.2, 6)
  })
  it('B13.8 steel beams, various', () => {
    const r = captureAssist('steel beams, various')
    expect(r).toMatchObject({ family: 'steel_section', section: null, pieces: null, lengthM: null })
    expect(r.missing).toEqual(['section', 'pieces', 'lengthM'])
  })
  it('B13.9 457x191x70 UB x 10 at 6m', () => {
    const r = captureAssist('457x191x70 UB x 10 at 6m')
    expect(r).toMatchObject({ family: 'steel_section', section: 'UB 457x191x67', sectionFlag: CLOSEST_MATCH, pieces: 10, lengthM: 6 })
  })
  it('B13.10 22 m3 pitch pine joists', () => {
    const r = captureAssist('22 m3 pitch pine joists')
    expect(r).toMatchObject({ family: 'timber_joist', volumeM3: 22 })
  })
  it('B13.11 36 nr 254x254x89 UC at 7.6 m, bolted splices, levels 4 to 7, east core', () => {
    const r = captureAssist('36 nr 254x254x89 UC at 7.6 m, bolted splices, levels 4 to 7, east core')
    expect(r).toMatchObject({ family: 'steel_section', section: 'UC 254x254x89', pieces: 36, lengthM: 7.6, recoverability: 'A', location: 'levels 4 to 7, east core' })
  })
  it('B13.12 precast panels 150mm, cast-in fixings, north elevation, 1,140 m2', () => {
    const r = captureAssist('precast panels 150mm, cast-in fixings, north elevation, 1,140 m2')
    expect(r).toMatchObject({ family: 'precast_cladding', areaM2: 1140, thicknessMm: 150, recoverability: 'C', location: 'north elevation' })
  })
  it('B13.13 UB 406x178x60 x 96 @ 6.0m welded cleats', () => {
    const r = captureAssist('UB 406x178x60 x 96 @ 6.0m welded cleats')
    expect(r).toMatchObject({ family: 'steel_section', section: 'UB 406x178x60', pieces: 96, lengthM: 6.0, recoverability: 'B', location: null })
  })
})
