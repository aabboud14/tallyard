// Every parameter in 06-DATA.md section A2, with source and status, in one object.
import type { Facility, Haulier, ReferenceStatus } from '../types'
import { FAMILIES } from './families'

export type Parameter = { id: string; group: string; label: string; value: string; unit: string; source: string; status: ReferenceStatus }

export const ROAD = 0.0001065 // tCO2e per tonne km

export type Assumptions = {
  road: number
  newKm: number
  listingKm: number
  hubAllowanceKm: number
  ndtFee: number
  destructiveFee: number
  destructiveBatchT: number
  haulFixed: number
  haulPerKm: number
  payloadT: number
  commissionRate: number
  brokerageRate: number
  referralRate: number
  transportMarginRate: number
  matchingFeeRate: number
  principalBuyRatio: number
  hybridMultiple: number
  subscription: { supplier: number; buyerOrg: number; seat: number }
  conditionFactor: Record<'A' | 'B' | 'C', number>
  testFactor: Record<'untested' | 'inspected' | 'tested' | 'certified', number>
  signalFactor: Record<'low' | 'balanced' | 'high', number>
  rangeFactor: number
  mandate: { askMultiplier: number; reserveMultiplier: number; openMultiplier: number; maxMultiplier: number }
  urgency: { far: number; mid: number; near: number; midFromDays: number; farFromDays: number }
  priorityWeights: { netValue: number; carbon: number; demand: number; ease: number }
  negotiation: { concession: number; maxMoves: number; settleGapTicks: number }
  disclosure: {
    location: { region: number; local_authority: number }
    timing: { quarter: number; month: number }
    openLots: { few: number; several: number; many: number }
    frame: number
    photos: number
    mediumFrom: number
    highFrom: number
  }
  diversionTarget: number
  contentAim: number
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  road: ROAD,
  newKm: 120,
  listingKm: 50,
  hubAllowanceKm: 25,
  ndtFee: 25,
  destructiveFee: 300,
  destructiveBatchT: 20,
  haulFixed: 180,
  haulPerKm: 1.8,
  payloadT: 26,
  commissionRate: 0.08,
  brokerageRate: 0.1,
  referralRate: 0.1,
  transportMarginRate: 0.05,
  matchingFeeRate: 0.01,
  principalBuyRatio: 0.55,
  hybridMultiple: 1.5,
  subscription: { supplier: 4800, buyerOrg: 3600, seat: 1200 },
  conditionFactor: { A: 1.0, B: 0.92, C: 0.8 },
  testFactor: { untested: 0.9, inspected: 0.95, tested: 1.0, certified: 1.05 },
  signalFactor: { low: 0.93, balanced: 1.0, high: 1.07 },
  rangeFactor: 0.07,
  mandate: { askMultiplier: 1.04, reserveMultiplier: 0.95, openMultiplier: 0.91, maxMultiplier: 1.01 },
  urgency: { far: 1.0, mid: 0.96, near: 0.9, midFromDays: 60, farFromDays: 121 },
  priorityWeights: { netValue: 0.4, carbon: 0.3, demand: 0.2, ease: 0.1 },
  negotiation: { concession: 0.4, maxMoves: 12, settleGapTicks: 2 },
  disclosure: {
    location: { region: 5, local_authority: 20 },
    timing: { quarter: 5, month: 15 },
    openLots: { few: 0, several: 10, many: 20 },
    frame: 15,
    photos: 10,
    mediumFrom: 25,
    highFrom: 40,
  },
  diversionTarget: 0.95,
  contentAim: 0.2,
}

export const FACILITIES: Facility[] = [
  { id: 'HUB-BARK', name: 'Open yard, Barking', type: 'open', region: 'Outer London East', storageRate: 5.0, handlingRate: 10 },
  { id: 'HUB-PARK', name: 'Covered store, Park Royal', type: 'covered', region: 'Outer London West', storageRate: 14.0, handlingRate: 12 },
  { id: 'HUB-TILB', name: 'Open yard, Tilbury', type: 'open', region: 'East of England', storageRate: 3.5, handlingRate: 9 },
]

export function facilityById(id: string): Facility {
  const f = FACILITIES.find((x) => x.id === id)
  if (!f) throw new Error('Unknown facility: ' + id)
  return f
}

export const HAULIERS: Haulier[] = [
  { name: 'Haulier A', fixed: 180, perKm: 1.8, noticeDays: 3 },
  { name: 'Haulier B', fixed: 210, perKm: 1.75, noticeDays: 2 },
  { name: 'Haulier C', fixed: 195, perKm: 2.1, noticeDays: 5 },
]

export const REGIONS = ['Central London', 'Inner London East', 'Inner London West', 'Outer London East', 'Outer London West', 'South East', 'East of England'] as const

/** Read-only rows for the Assumptions screen and the Assumptions sheets. */
export function parameterRows(a: Assumptions = DEFAULT_ASSUMPTIONS): Parameter[] {
  const rows: Parameter[] = []
  for (const f of Object.values(FAMILIES)) {
    const g = f.label
    rows.push({ id: `${f.id}.factorNew`, group: g, label: 'Carbon factor, new', value: String(f.factorNew), unit: f.factorBasis === 't' ? 'tCO2e per tonne' : 'kgCO2e per m2', source: f.factorNewSource, status: f.factorNewStatus })
    rows.push({ id: `${f.id}.factorReuse`, group: g, label: 'Carbon factor, reuse', value: String(f.factorReuse), unit: f.factorBasis === 't' ? 'tCO2e per tonne' : 'kgCO2e per m2', source: f.factorReuseSource, status: f.factorReuseStatus })
    rows.push({ id: `${f.id}.newPrice`, group: g, label: 'New price', value: String(f.newPrice), unit: `pounds ${f.pricingUnitLabel}`, source: 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.baseReuseRatio`, group: g, label: 'Base reuse ratio', value: String(f.baseReuseRatio), unit: 'ratio', source: f.id === 'steel_section' ? 'Founder assumption, to be validated' : 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.scrapValue`, group: g, label: 'Scrap value', value: String(f.scrapValue), unit: `pounds ${f.pricingUnitLabel}`, source: 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.capRatio`, group: g, label: 'Cap ratio', value: String(f.capRatio), unit: 'of new price', source: 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.tick`, group: g, label: 'Price tick', value: String(f.tick), unit: 'pounds', source: 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.recoveryPremium`, group: g, label: 'Recovery premium', value: String(f.recoveryPremium), unit: `pounds ${f.pricingUnitLabel}`, source: 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.massRule`, group: g, label: 'Mass rule', value: f.massRule, unit: '', source: 'Sample data', status: 'placeholder' })
    rows.push({ id: `${f.id}.storage`, group: g, label: 'Storage', value: f.storage === 'covered_only' ? 'covered only' : 'open or covered', unit: '', source: 'Sample data', status: 'placeholder' })
  }
  const o = 'Other parameters'
  rows.push({ id: 'road', group: o, label: 'Road transport factor', value: '0.1065', unit: 'kgCO2e per tonne km', source: 'Published: UK government conversion factors 2020, as used in the IStructE embodied carbon guide', status: 'published' })
  rows.push({ id: 'newKm', group: o, label: 'New product transport distance', value: String(a.newKm), unit: 'km', source: 'Published: RICS whole life carbon standard, 2nd edition, default for nationally manufactured products', status: 'published' })
  rows.push({ id: 'listingKm', group: o, label: 'Listing-level reuse distance', value: String(a.listingKm), unit: 'km', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'hubAllowanceKm', group: o, label: 'Hub inbound allowance', value: String(a.hubAllowanceKm), unit: 'km', source: 'Placeholder (a privacy device, see F2)', status: 'placeholder' })
  rows.push({ id: 'testing', group: o, label: 'Steel testing', value: `${a.ndtFee} per piece non-destructive, plus ${a.destructiveFee} per ${a.destructiveBatchT} t or part for destructive tests`, unit: 'pounds', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'haulage', group: o, label: 'Haulage standard rate', value: `${a.haulFixed} per load plus ${a.haulPerKm.toFixed(2)} per km, payload ${a.payloadT} t per load`, unit: 'pounds', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'commissionRate', group: o, label: 'Commission', value: `${a.commissionRate * 100}%`, unit: 'of material price', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'brokerageRate', group: o, label: 'Storage brokerage', value: `${a.brokerageRate * 100}%`, unit: 'of storage and handling fees', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'referralRate', group: o, label: 'Testing referral', value: `${a.referralRate * 100}%`, unit: 'of testing fees', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'transportMarginRate', group: o, label: 'Transport margin', value: `${a.transportMarginRate * 100}%`, unit: 'of transport cost', source: 'Candidate, not from the founder’s notes'.replace('’', "'"), status: 'candidate' })
  rows.push({ id: 'matchingFeeRate', group: o, label: 'Matching fee (forward sale)', value: `${a.matchingFeeRate * 100}%`, unit: 'of material price', source: 'Candidate', status: 'candidate' })
  rows.push({ id: 'principalBuyRatio', group: o, label: 'Principal buy ratio', value: String(a.principalBuyRatio), unit: 'of new price', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'hybridMultiple', group: o, label: 'Hybrid threshold', value: `Principal margin at least ${a.hybridMultiple} times agency revenue`, unit: '', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'subscriptions', group: o, label: 'Subscriptions per year', value: `Supplier ${a.subscription.supplier}, buyer organisation ${a.subscription.buyerOrg}, professional seat ${a.subscription.seat}`, unit: 'pounds', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'priceFactors', group: o, label: 'Price factors', value: 'Condition A 1.00, B 0.92, C 0.80. Test status untested 0.90, inspected 0.95, tested 1.00, certified 1.05. Signal low 0.93, balanced 1.00, high 1.07. Range 7% either side. Ask 1.04, reserve 0.95, open 0.91, maximum 1.01 of guide. Urgency 1.00 above 120 days, 0.96 from 60 to 120, 0.90 below 60.', unit: '', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'priorityWeights', group: o, label: 'Priority weights', value: `${a.priorityWeights.netValue} net value, ${a.priorityWeights.carbon} carbon, ${a.priorityWeights.demand} demand, ${a.priorityWeights.ease} ease`, unit: '', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'negotiation', group: o, label: 'Negotiation', value: `Concession ${a.negotiation.concession} of the gap, at most ${a.negotiation.maxMoves} moves`, unit: '', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'disclosure', group: o, label: 'Disclosure score', value: 'Location region 5 or local authority 20. Timing quarter 5 or month 15. Open lots 0 or 1 scores 0, 2 or 3 scores 10, 4 or more scores 20. Frame pattern 15. Public photo 10. Low below 25, Medium 25 to 39, High 40 or more.', unit: 'points', source: 'Placeholder', status: 'placeholder' })
  rows.push({ id: 'diversionTarget', group: o, label: 'Diversion target', value: `${a.diversionTarget * 100}%`, unit: 'of demolition waste', source: 'Published: London Plan 2021 Policy SI 7', status: 'published' })
  rows.push({ id: 'contentAim', group: o, label: 'Content by value aim', value: `${a.contentAim * 100}%`, unit: 'by value', source: 'Published: Circular Economy Statements guidance (2022), paragraph 4.7.6', status: 'published' })
  const s = 'Storage facilities'
  for (const f of FACILITIES) {
    rows.push({ id: `${f.id}.rates`, group: s, label: f.name, value: `Storage ${f.storageRate.toFixed(2)} per tonne per month, handling ${f.handlingRate} per tonne each way`, unit: 'pounds', source: `${f.type === 'open' ? 'Open' : 'Covered'}, ${f.region}. Placeholder`, status: 'placeholder' })
  }
  const h = 'Hauliers'
  for (const x of HAULIERS) {
    rows.push({ id: `haulier.${x.name}`, group: h, label: x.name, value: `${x.fixed} per load plus ${x.perKm.toFixed(2)} per km, ${x.noticeDays} days' notice`, unit: 'pounds', source: 'Placeholder', status: 'placeholder' })
  }
  return rows
}
