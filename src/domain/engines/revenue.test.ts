import { describe, it, expect } from 'vitest'
import { closeTo, pence } from '../../test/helpers'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { agencyRevenue, principalModel, forwardSale } from './revenue'
import { createSeed } from '../seed/world'

describe('B11 revenue and models (F12), the TH-01 deal at 740', () => {
  it('B11.1 agency via Tilbury', () => {
    const r = agencyRevenue({ commission: 1430.04, storage: 1099.1, handlingIn: 217.4, handlingOut: 217.4, sellerStorage: 0, testing: 1800, inbound: 248.4, outbound: 235.8 }, A)
    pence(r.commission, 1430.04)
    pence(r.storageBrokerage, 153.39)
    pence(r.testingReferral, 180)
    pence(r.transportMargin, 24.21)
    pence(r.total, 1787.64)
  })
  it('B11.2 agency via Barking', () => {
    const r = agencyRevenue({ commission: 1430.04, storage: 1570.14, handlingIn: 241.56, handlingOut: 241.56, sellerStorage: 0, testing: 1800, inbound: 212.4, outbound: 205.2 }, A)
    pence(r.storageBrokerage, 205.33)
    pence(r.transportMargin, 20.88)
    pence(r.total, 1836.25)
  })
  it('B11.3 agency direct', () => {
    const r = agencyRevenue({ commission: 1430.04, storage: 0, handlingIn: 0, handlingOut: 0, sellerStorage: 0, testing: 1800, inbound: 0, outbound: 196.2 }, A)
    pence(r.storageBrokerage, 0)
    pence(r.transportMargin, 9.81)
    pence(r.total, 1619.85)
  })
  it('B11.4 principal via Tilbury', () => {
    const r = principalModel({ family: 'steel_section', units: 24.156, condition: 'A', signal: 'high', testing: 1800, storage: 1099.1, handlingIn: 217.4, handlingOut: 217.4, inbound: 248.4, agencyTotal: 1787.64 }, A)
    pence(r.purchase, 13285.8)
    expect(r.testedGuide).toBe(855)
    pence(r.sale, 20653.38)
    pence(r.costs, 3582.3)
    pence(r.margin, 3785.28)
    pence(r.capital, 16868.1)
    closeTo(r.returnRatio * 100, 22.44, 3)
    closeTo(r.multiple, 2.117, 3)
    expect(r.candidateToBuy).toBe(true)
  })
  it('B11.5 principal via Barking', () => {
    const r = principalModel({ family: 'steel_section', units: 24.156, condition: 'A', signal: 'high', testing: 1800, storage: 1570.14, handlingIn: 241.56, handlingOut: 241.56, inbound: 212.4, agencyTotal: 1836.25 }, A)
    pence(r.costs, 4065.66)
    pence(r.margin, 3301.92)
    pence(r.capital, 17351.46)
    closeTo(r.returnRatio * 100, 19.03, 3)
    closeTo(r.multiple, 1.798, 3)
    expect(r.candidateToBuy).toBe(true)
  })
  it('B11.6 forward sale via Tilbury', () => {
    const r = forwardSale(17875.44, 1787.64, A)
    pence(r.matchingFee, 178.75)
    pence(r.total, 1966.39)
  })
  it('B11.7 ledger seed: transactions and data to date, and subscriptions', () => {
    const w = createSeed()
    const toDate = w.ledger.filter((l) => l.kind !== 'subscription').reduce((s, l) => s + l.amount, 0)
    pence(toDate, 14404.8)
    pence(toDate + 1787.64, 16192.44)
    pence(w.ledger.find((l) => l.kind === 'subscription')!.amount, 70800)
  })
})
