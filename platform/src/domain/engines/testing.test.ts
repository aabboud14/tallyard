import { describe, it, expect } from 'vitest'
import { companiesFor, recordsGrade, resultStatusesFor, servicesForFamilies } from './testing'

const names = (xs: { name: string }[]) => xs.map((x) => x.name)

describe('testing', () => {
  it('offers the tests that suit the families', () => {
    expect(servicesForFamilies(['steel_section'])).toEqual(['visual_dimensional', 'steel_coupon', 'steel_hardness'])
    expect(servicesForFamilies(['steel_section', 'clay_brick'])).toEqual(['visual_dimensional', 'steel_coupon', 'steel_hardness', 'masonry'])
    expect(servicesForFamilies([])).toEqual([])
  })

  it('finds the companies that offer every test in the region, by name', () => {
    expect(names(companiesFor(['steel_coupon'], 'Central London'))).toEqual(['Brindmoor Testing'])
    expect(names(companiesFor(['visual_dimensional'], 'South East'))).toEqual(['Brindmoor Testing', 'Quenby Materials Lab'])
    expect(names(companiesFor(['steel_hardness', 'fixings_pullout'], 'Inner London East'))).toEqual(['Brindmoor Testing', 'Calverd Inspection'])
    expect(companiesFor(['masonry', 'steel_coupon'], 'Central London')).toEqual([])
    expect(companiesFor([], 'Central London')).toEqual([])
  })

  it('says what a result may record', () => {
    expect(resultStatusesFor(['visual_dimensional'])).toEqual(['inspected'])
    expect(resultStatusesFor(['visual_dimensional', 'steel_coupon'])).toEqual(['inspected', 'tested'])
    expect(recordsGrade(['steel_hardness'])).toBe(true)
    expect(recordsGrade(['masonry'])).toBe(false)
  })
})
