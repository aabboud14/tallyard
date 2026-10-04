// Builders for the "How this is calculated" panel sections.
import type { CarbonResult } from '../../domain/engines/carbon'
import type { GuidePrice } from '../../domain/engines/pricing'
import type { BuyerPackage } from '../../domain/engines/package'
import type { PriorityRow } from '../../domain/engines/priority'
import type { CalcSection } from '../../components/HowCalculated'
import { FAMILIES } from '../../domain/reference/families'
import { LABELS, SIGNAL_LABELS, TEST_STATUS_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import type { FamilyId } from '../../domain/types'

export function carbonSections(r: CarbonResult): { sections: CalcSection[]; labels: string[] } {
  const fam = FAMILIES[r.inputs.family]
  const unit = fam.factorBasis === 't' ? 'tonnes' : 'm2'
  const fUnit = fam.factorBasis === 't' ? 'tCO2e per tonne' : 'kgCO2e per m2'
  return {
    sections: [
      {
        title: 'Inputs',
        lines: [
          { label: `Baseline quantity (${unit})`, value: f.number(r.inputs.baselineQty, 3) },
          { label: 'Baseline mass (t)', value: f.number(r.inputs.baselineMassT, 3) },
          { label: `Reclaimed quantity (${unit})`, value: f.number(r.inputs.reuseQty, 3) },
          { label: 'Reclaimed mass (t)', value: f.number(r.inputs.reuseMassT, 3) },
          { label: `Factor, new (${fUnit})`, value: String(r.factorNew), note: `${fam.factorNewSource} (${fam.factorNewStatus})` },
          { label: `Factor, reuse (${fUnit})`, value: String(r.factorReuse), note: `${fam.factorReuseSource} (${fam.factorReuseStatus})` },
          { label: 'Transport, new (km)', value: String(r.newKm), note: 'Published: RICS whole life carbon standard, 2nd edition' },
          { label: 'Transport, reuse (km)', value: String(r.inputs.reuseKm), note: 'Placeholder distance, or the hub allowance plus the hub to project distance for a confirmed deal' },
          { label: 'Road factor (kgCO2e per tonne km)', value: '0.1065', note: 'Published: UK government conversion factors 2020' },
        ],
      },
      {
        title: 'Formula',
        lines: [
          { label: 'A1-A3 new = baseline quantity x factor new', value: f.number(r.a13New, 4) },
          { label: 'A4 new = baseline mass x 120 km x road factor', value: f.number(r.a4New, 4) },
          { label: 'A1-A3 reuse = reclaimed quantity x factor reuse', value: f.number(r.a13Reuse, 4) },
          { label: 'A4 reuse = reclaimed mass x reuse km x road factor', value: f.number(r.a4Reuse, 4) },
          { label: 'Avoided = (A1-A3 new + A4 new) minus (A1-A3 reuse + A4 reuse), tCO2e', value: f.number(r.avoided, 4) },
          { label: 'Percent of new', value: f.percent(r.percent) },
        ],
      },
    ],
    labels: r.inputs.family === 'steel_section' ? [LABELS.L11, LABELS.L12] : [LABELS.L11],
  }
}

export function guideSections(g: GuidePrice, family: FamilyId, condition: string, testStatus: keyof typeof TEST_STATUS_LABELS, urgency?: { value: number; daysToClearBy: number | null }): { sections: CalcSection[]; labels: string[] } {
  const fam = FAMILIES[family]
  const lines = [
    { label: `New price (${fam.pricingUnitLabel})`, value: f.priceOnly(g.newPrice, family), note: 'Sample data, placeholder' },
    { label: 'Base reuse ratio', value: String(g.baseReuseRatio), note: family === 'steel_section' ? LABELS.L32 : 'Placeholder' },
    { label: `Condition ${condition}`, value: `x ${g.conditionFactor.toFixed(2)}` },
    { label: `Test status: ${TEST_STATUS_LABELS[testStatus]}`, value: `x ${g.testFactor.toFixed(2)}` },
    { label: `Market signal: ${SIGNAL_LABELS[g.signal]}`, value: `x ${g.signalFactor.toFixed(2)}`, note: LABELS.L10 },
  ]
  const formula = [
    { label: 'Raw = new price x base ratio x condition x test status x signal', value: f.number(g.raw, 4) },
    { label: `Guide = raw, held between scrap value (${f.priceOnly(g.scrapValue, family)}) and ${g.capRatio} of new, rounded to the tick`, value: f.priceOnly(g.guide, family) },
    { label: 'Range: 7% either side of the guide', value: `${f.priceOnly(g.low, family)} to ${f.priceOnly(g.high, family)}` },
  ]
  if (urgency) formula.push({ label: `Urgency (${urgency.daysToClearBy === null ? 'no clear-by date' : `${urgency.daysToClearBy} days to the clear-by date`}), seller only`, value: `x ${urgency.value.toFixed(2)}` })
  return { sections: [{ title: 'Inputs', lines }, { title: 'Formula', lines: formula }], labels: [LABELS.L2] }
}

export function packageSections(p: BuyerPackage, facilityName: string | null): { sections: CalcSection[]; labels: string[] } {
  return {
    sections: [
      {
        title: 'Lines (your side only)',
        lines: [
          { label: `Material = units x ${f.priceOnly(p.pricePerUnit, 'steel_section')} per tonne`, value: f.money(p.material) },
          { label: 'Testing = 25 per piece plus 300 per 20 t or part', value: f.money(p.testing) },
          { label: `Storage = rate x mass x ${p.storageMonths} months${facilityName ? ` at ${facilityName}` : ''}`, value: f.money(p.storage) },
          { label: 'Handling out = handling rate x mass', value: f.money(p.handlingOut) },
          { label: `Delivery = ${p.loads} load x (180 + 1.80 per km)`, value: f.money(p.outbound) },
          { label: 'Total', value: f.money(p.total) },
        ],
      },
      {
        title: 'Against new',
        lines: [
          { label: 'New steel to the same schedule = required members x new price', value: f.money(p.costNew) },
          { label: 'Saving = new minus total', value: f.savingShort(p.saving) },
          { label: 'Break-even storage = (new minus material, testing, handling and delivery) divided by the monthly storage cost', value: p.breakEvenMonths === null ? 'not applicable' : f.months1(p.breakEvenMonths) },
        ],
      },
    ],
    labels: [],
  }
}

export function prioritySections(r: PriorityRow, maxNetValue: number, maxCarbon: number): { sections: CalcSection[]; labels: string[] } {
  return {
    sections: [
      {
        title: 'Inputs',
        lines: [
          { label: 'Net value = units x guide minus units x recovery premium', value: f.money(r.netValue) },
          { label: 'Largest net value in the building', value: f.money(maxNetValue) },
          { label: 'Avoided carbon (tCO2e)', value: f.number(r.carbon, 4) },
          { label: 'Largest avoided carbon in the building', value: f.number(maxCarbon, 4) },
          { label: 'Market signal', value: SIGNAL_LABELS[r.signal] },
          { label: 'Ease (recoverability A 1.0, B 0.6, C 0.2)', value: r.ease.toFixed(1) },
        ],
      },
      {
        title: 'Score parts (weights 0.40, 0.30, 0.20, 0.10)',
        lines: [
          { label: 'Net value: 40 x net value / largest', value: f.score(r.parts.netValue) },
          { label: 'Carbon: 30 x carbon / largest', value: f.score(r.parts.carbon) },
          { label: 'Demand: 20 x (low 0, balanced 0.5, high 1)', value: f.score(r.parts.demand) },
          { label: 'Ease: 10 x ease', value: f.score(r.parts.ease) },
          { label: 'Score', value: f.score(r.score) },
        ],
      },
    ],
    labels: [LABELS.L2],
  }
}
