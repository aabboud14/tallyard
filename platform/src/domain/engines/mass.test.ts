import { describe, it } from 'vitest'
import { closeTo } from '../../test/helpers'
import { createSeed, itemByTag, MERROWGATE_REQUIREMENTS } from '../seed/world'
import { itemMeasures, measuresFor, steelMassT } from './measures'
import { requiredMassT } from './matcher'

const w = createSeed()
const m = (tag: string) => itemMeasures(itemByTag(w, tag))

describe('B1 mass (F1)', () => {
  it('B1.1 TH-01 24.156 t', () => closeTo(m('TH-01').massT, 24.156, 3))
  it('B1.2 TH-02 49.734 t', () => closeTo(m('TH-02').massT, 49.734, 3))
  it('B1.3 TH-03 24.19308 t', () => closeTo(m('TH-03').massT, 24.19308, 5))
  it('B1.4 TH-04 40.680 t', () => closeTo(m('TH-04').massT, 40.68, 3))
  it('B1.5 TH-05 24.32304 t', () => closeTo(m('TH-05').massT, 24.32304, 5))
  it('B1.6 TH-06 34.6176 t', () => closeTo(m('TH-06').massT, 34.6176, 4))
  it('B1.7 TH-07 66.000 t', () => closeTo(m('TH-07').massT, 66.0, 3))
  it('B1.8 TH-08 23.166 t and 421.2 m2', () => {
    closeTo(m('TH-08').massT, 23.166, 3)
    closeTo(m('TH-08').areaM2!, 421.2, 1)
  })
  it('B1.9 TH-09 410.400 t', () => closeTo(m('TH-09').massT, 410.4, 3))
  it('B1.10 TH-10 46.000 t', () => closeTo(m('TH-10').massT, 46.0, 3))
  it('B1.11 TH-11 36.000 t and 1,080 m2', () => {
    closeTo(m('TH-11').massT, 36.0, 3)
    closeTo(m('TH-11').areaM2!, 1080, 0)
  })
  it('B1.12 TH-12 4.4256 t', () => closeTo(measuresFor({ family: 'steel_section', designation: 'UC 203x203x46', lengthM: 3.2 }, { kind: 'pieces', pieces: 30 }).massT, 4.4256, 4))
  it('B1.13 OS-21 57.200 t', () => closeTo(m('OS-21').massT, 57.2, 3))
  it('B1.14 OS-22 45.600 t and 1,368 m2', () => {
    closeTo(m('OS-22').massT, 45.6, 3)
    closeTo(m('OS-22').areaM2!, 1368, 0)
  })
  it('B1.15 48 members of R1 23.18976 t', () => closeTo(steelMassT(48, 7.2, 67.1), 23.18976, 5))
  it('B1.16 all 102 required members 54.977 t', () => closeTo(requiredMassT(MERROWGATE_REQUIREMENTS), 54.977, 3))
})
