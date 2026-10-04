import { describe, it, expect, beforeAll } from 'vitest'
import { useStore } from './store'
import { runDemoStep, runDemoSteps, STEP1_TEXT, demoPlanItemId, demoDealId } from './demo'
import { captureAssist } from '../domain/engines/assist'
import { TIVERNE_ID, MERROWGATE_ID, DURNLEY_ID, ORG_IDS, itemByTag } from '../domain/seed/world'
import { DEFAULT_ASSUMPTIONS as A } from '../domain/reference/assumptions'
import * as f from '../domain/format'
import { LABELS, SIGNAL_LABELS, VISIBILITY_LABELS, GRADE_UNKNOWN } from '../domain/reference/labels'
import { blindBuyerText } from '../domain/privacy/blindBuyer'
import { lotPrivateStrings, projectPrivateStrings } from '../domain/privacy/privateStrings'
import { unresolvedNotice } from '../domain/engines/waste'
import { lotOf, offerViews, sellerDeals, buyerDealView, itemView, priorityFor, disclosureFor, previewListing, browseListings, listingForProject, planItemView, complianceView, wasteView, ledgerView, modelViews, approvedProjectsBlind, buildingItems } from './selectors'
import { formatDate } from '../domain/dates'

const world = () => useStore.getState().world
const project = () => world().projects[MERROWGATE_ID]
const avail = (l: { availability: { kind: string; label?: string } }) => (l.availability.kind === 'now' ? 'Available now' : `Available from ${l.availability.label}`)

describe('demo replay, steps 1 to 12 on fresh seed', () => {
  beforeAll(async () => {
    await useStore.getState().reset()
  })

  it('seed: the compliance dashboard before any step', () => {
    const c = complianceView(world(), MERROWGATE_ID)
    expect(f.percent2(c.secured.percent)).toBe('19.91%')
    expect(f.percent2(c.withPlan.percent)).toBe('19.91%')
    expect(f.carbon(c.avoidedT)).toBe('47.8 tCO2e')
    expect(f.massT(c.reclaimedMassT)).toBe('102.80 t')
  })

  it('step 1: capture on site', async () => {
    const parsed = captureAssist(STEP1_TEXT)
    expect(parsed.family).toBe('steel_section')
    expect(parsed.section).toBe('UC 203x203x46')
    expect(parsed.pieces).toBe(30)
    expect(parsed.lengthM).toBe(3.2)
    expect(parsed.recoverability).toBe('A')
    expect(parsed.location).toBe('roof plant room')
    await runDemoStep(1)
    const item = itemByTag(world(), 'TH-12')
    const v = itemView(world(), item.id)
    expect(v.item.tag).toBe('TH-12')
    expect(f.massT(v.measures.massT)).toBe('4.43 t')
    expect(f.carbon(v.carbon!.avoided)).toBe('7.5 tCO2e')
    expect(f.unitPrice(v.guide.guide, 'steel_section')).toBe('£670 per tonne')
    expect(v.item.photos).toHaveLength(1)
    expect(v.item.photos[0].isPublic).toBe(false)
    expect(v.lot.visibility).toBe('private')
    expect(v.lot.availableFrom).toBe('2027-01-25')
    expect(v.lot.publicId).toBe('L-GMXG69')
    expect(v.item.testStatus).toBe('untested')
    expect(v.item.grade).toBe('unknown')
  })

  it('step 2: decide what to recover', async () => {
    await runDemoStep(2)
    const p = priorityFor(world(), TIVERNE_ID)
    expect(p.rows).toHaveLength(12)
    expect(p.rows[0].tag).toBe('TH-02')
    expect(f.score(p.rows[0].score)).toBe('68.7')
    expect(p.rows[11].tag).toBe('TH-12')
    expect(f.score(p.rows[11].score)).toBe('14.5')
    expect(p.rows.find((r) => r.tag === 'TH-09')!.reason).toMatch(/^Recycle rather than recover/)
    expect(p.rows.find((r) => r.tag === 'TH-10')!.reason).toMatch(/^Recycle rather than recover/)
    expect(f.money(p.recoverableNetValue)).toBe('£202,966.91')
    expect(f.percent(p.topThreeShare)).toBe('54.2%')
    const parts = p.rows[0].parts
    expect([f.score(parts.netValue), f.score(parts.carbon), f.score(parts.demand), f.score(parts.ease)]).toEqual(['22.7', '30.0', '10.0', '6.0'])
  })

  it('step 3: publish without leaking', async () => {
    const w0 = world()
    const th01 = itemByTag(w0, 'TH-01')
    const lot = lotOf(w0, th01.id)
    const matchedOnly = buildingItems(w0, TIVERNE_ID).map((i) => lotOf(w0, i.id)).filter((l) => l.visibility === 'matched_only')
    expect(matchedOnly).toHaveLength(5)
    expect(VISIBILITY_LABELS.matched_only).toBe('Private matching only')
    const pending = { lotId: lot.id, visibility: 'open' as const }
    const d0 = disclosureFor(w0, TIVERNE_ID, pending)
    expect([d0.score, d0.band]).toEqual([10, 'Low'])
    const d1 = disclosureFor(w0, TIVERNE_ID, pending, { locationLevel: 'local_authority' })
    expect([d1.score, d1.band]).toEqual([25, 'Medium'])
    expect(d1.inferences.length).toBeGreaterThan(0)
    const d2 = disclosureFor(w0, TIVERNE_ID, pending, { locationLevel: 'local_authority', timingLevel: 'month' })
    expect([d2.score, d2.band]).toEqual([35, 'Medium'])
    const s = useStore.getState()
    s.setDisclosure(TIVERNE_ID, { locationLevel: 'local_authority', timingLevel: 'month' })
    s.setPhotoPublic(th01.id, 'pho_th01', true)
    const d3 = disclosureFor(world(), TIVERNE_ID, pending)
    expect([d3.score, d3.band, d3.blocksPublishing]).toEqual([45, 'High', true])
    s.resetDisclosureDefaults(TIVERNE_ID)
    const d4 = disclosureFor(world(), TIVERNE_ID, pending)
    expect([d4.score, d4.band]).toEqual([10, 'Low'])
    const preview = previewListing(world(), lot.id, 'open')
    expect(preview.location.label).toBe('Central London')
    expect(avail(preview)).toBe('Available from Q1 2027')
    await runDemoStep(3)
    const v = itemView(world(), th01.id)
    expect(VISIBILITY_LABELS[v.lot.visibility]).toBe('Open marketplace')
    expect(v.lot.publicId).toBe('L-9F4CQQ')
    expect(f.unitPrice(v.lot.askPerUnit!, 'steel_section')).toBe('£800 per tonne')
    expect(f.unitPrice(v.lot.reservePerUnit!, 'steel_section')).toBe('£730 per tonne')
    expect(f.months1(v.holding!.holdMonths!)).toBe('75.9 months')
    expect(v.sellerMandate).toMatchObject({ ask: 800, reserve: 730 })
    expect(approvedProjectsBlind(world(), ORG_IDS.ostlea).map(blindBuyerText)).toEqual(['Design team, commercial project, Inner London East, needed by Q2 2028'])
  })

  it('step 4: find it', async () => {
    await runDemoStep(4)
    const w = world()
    const browse = browseListings(w, A)
    expect(browse.map((l) => l.publicId)).toContain('L-9F4CQQ')
    const l = listingForProject(w, project(), 'L-9F4CQQ', A)!
    expect(l.title).toBe('UB 457x191x67, 7.5 m')
    expect(f.quantity(l.quantity.pieces!, 'pieces')).toBe('48 pieces')
    expect(f.massT(l.massT)).toBe('24.16 t')
    expect(l.grade).toBe('unknown')
    expect(GRADE_UNKNOWN).toBe('To be confirmed by testing')
    expect(l.testStatus).toBe('untested')
    expect(l.location.label).toBe('Central London')
    expect(avail(l)).toBe('Available from Q1 2027')
    expect(`${f.priceOnly(l.price.low, l.family)} to ${f.unitPrice(l.price.high, l.family)}`).toBe('£715 to £825 per tonne')
    expect(`Market signal: ${SIGNAL_LABELS[l.price.signal]}`).toBe('Market signal: High demand')
    expect(f.carbon(l.carbon!.avoidedT)).toBe('41.0 tCO2e')
    expect(`Surveyed. Listed ${f.month(l.listedMonth)}.`).toBe('Surveyed. Listed October 2026.')
    const th01 = itemByTag(w, 'TH-01')
    const text = JSON.stringify(l)
    for (const s of lotPrivateStrings(lotOf(w, th01.id), th01, w.buildings[TIVERNE_ID], w)) expect(text).not.toContain(s)
  })

  it('step 5: match a schedule', async () => {
    const s = useStore.getState()
    s.loadSampleSchedule(MERROWGATE_ID)
    let r = project().matchResult!
    expect(`${r.lines} lines, ${r.members} members`).toBe('6 lines, 102 members')
    expect(`${r.matched} of ${r.members} members matched (${f.percent(r.coverage)})`).toBe('60 of 102 members matched (58.8%)')
    expect(project().termsAccepted).toBe(false)
    expect(LABELS.L6).toContain('private matching only')
    s.acceptTerms(MERROWGATE_ID)
    r = project().matchResult!
    expect(`${r.matched} of ${r.members} members matched (${f.percent(r.coverage)})`).toBe('96 of 102 members matched (94.1%)')
    expect(`Open market only: ${r.openOnly} of ${r.members}`).toBe('Open market only: 60 of 102')
    const al = (ref: string) => r.results.find((x) => x.ref === ref)!.allocations.map((a) => [a.publicId, a.pieces])
    expect(al('R1')).toEqual([['L-9F4CQQ', 48], ['L-NHZ32R', 4]])
    expect(al('R2')).toEqual([['L-WPX5A6', 12]])
    expect(al('R3')).toEqual([['L-MNY55K', 10]])
    expect(al('R4')).toEqual([['L-6DN4K3', 8]])
    expect(r.results.find((x) => x.ref === 'R5')!.reason).toBe('No stock long enough (longest visible in this serial size is 9.5 m)')
    expect(al('R6')).toEqual([['L-FQK92P', 14]])
    const a1 = r.results[0].allocations[0]
    expect(`Storage ${a1.storageMin} to ${a1.storageMax} months`).toBe('Storage 13 to 16 months')
    expect(a1.gradeFlag).toBe(true)
    expect(LABELS.L4).toContain('SCI P427')
    s.addToPlan(MERROWGATE_ID, 'L-9F4CQQ', 'R1')
    expect(project().planItems).toHaveLength(1)
    s.addToPlan(MERROWGATE_ID, 'L-9F4CQQ', 'R1')
    expect(project().planItems).toHaveLength(1)
    const c = complianceView(world(), MERROWGATE_ID)
    expect(f.percent2(c.secured.percent)).toBe('19.91%')
  })

  it('step 6: bridge the gap', async () => {
    await runDemoStep(6)
    const v = planItemView(world(), MERROWGATE_ID, demoPlanItemId())
    expect(v.item.pieces).toBe(48)
    expect(v.item.pkg.route).toBe('hub')
    expect(v.item.pkg.facilityId).toBe('HUB-TILB')
    expect(v.item.pkg.testing).toBe(true)
    expect(`Storage ${v.storageRange!.min} to ${v.storageRange!.max} months`).toBe('Storage 13 to 16 months')
    const line = (id: string) => f.money(v.estimate.lines.find((l) => l.id === id)!.amount)
    expect(line('material')).toBe('£18,600.12')
    expect(line('testing')).toBe('£1,800.00')
    expect(line('storage')).toBe('£1,352.74')
    expect(line('handlingOut')).toBe('£217.40')
    expect(line('delivery')).toBe('£235.80')
    expect(`Estimated total ${f.money(v.estimate.total)}`).toBe('Estimated total £22,206.06')
    expect(`New steel to the same schedule ${f.money(v.estimate.costNew)}`).toBe('New steel to the same schedule £23,189.76')
    expect(f.saving(v.estimate.saving, v.estimate.savingPercent)).toBe('Saving £983.70 (4.2%)')
    expect(`Break-even storage ${f.months1(v.estimate.breakEvenMonths!)}`).toBe('Break-even storage 27.6 months')
    expect(f.carbon(v.carbon.avoided)).toBe('39.3 tCO2e')
    const cmp = Object.fromEntries(v.comparison.map((c) => [c.facilityId, f.money(c.total)]))
    expect(cmp).toEqual({ 'HUB-TILB': '£22,206.06', 'HUB-BARK': '£22,779.36', 'HUB-PARK': '£26,324.13' })
    expect(v.comparison.reduce((best, c) => (c.total < best.total ? c : best)).facilityId).toBe('HUB-TILB')
    expect(LABELS.L5).toMatch(/^Estimate/)
    const c = complianceView(world(), MERROWGATE_ID)
    expect(f.percent2(c.secured.percent)).toBe('19.91%')
    expect(f.percent2(c.withPlan.percent)).toBe('20.06%')
  })

  it('step 7: negotiate through an agent', async () => {
    const v0 = planItemView(world(), MERROWGATE_ID, demoPlanItemId())
    expect(v0.suggestedMandate).toEqual({ open: 700, max: 780 })
    await runDemoStep(7)
    const v = planItemView(world(), MERROWGATE_ID, demoPlanItemId())
    const log = v.item.negotiation!.log
    const text = log.map((e) => (e.kind === 'ask' ? `Ask £${e.price}` : e.kind === 'bid' ? `Bid £${e.price}` : e.kind === 'agreed' ? `Agreed in principle at ${f.unitPrice(e.price!, 'steel_section')}` : e.text))
    expect(text).toEqual(['Ask £800', 'Bid £700', 'Ask £760', 'Bid £725', 'Ask £745', 'Bid £735', 'Agreed in principle at £740 per tonne'])
    expect(LABELS.L3).toBe('Simulated agent: scripted rules, no AI model')
    expect(`Estimated total ${f.money(v.estimate.total)}`).toBe('Estimated total £21,481.38')
    expect(f.saving(v.estimate.saving, v.estimate.savingPercent)).toBe('Saving £1,708.38 (7.4%)')
    expect(v.item.status).toBe('awaiting_seller')
    expect(JSON.stringify({ log, estimate: v.estimate, listing: v.listing })).not.toContain('730')
  })

  it('step 8: seller approves', async () => {
    const w = world()
    const offers = offerViews(w, ORG_IDS.ostlea)
    expect(offers).toHaveLength(1)
    const o = offers[0]
    expect(blindBuyerText(o.blind)).toBe('Design team, commercial project, Inner London East, needed by Q2 2028')
    expect(`${f.unitPrice(o.price, 'steel_section')} for ${o.pieces} pieces (${f.massT(o.massT)})`).toBe('£740 per tonne for 48 pieces (24.16 t)')
    expect(`Deliver to: ${o.hubName}`).toBe('Deliver to: Open yard, Tilbury')
    expect(`Net proceeds ${f.money(o.sellerFigures.net)}`).toBe('Net proceeds £15,979.60')
    expect(`Gain over scrap ${f.money(o.sellerFigures.upliftVsScrap)}`).toBe('Gain over scrap £8,491.24')
    const offerText = JSON.stringify({ blind: o.blind, figures: o.sellerFigures, price: o.price, pieces: o.pieces, hub: o.hubName })
    for (const s of projectPrivateStrings(project(), w)) expect(offerText).not.toContain(s)
    await runDemoStep(8)
    expect(LABELS.L22).toBe('Deposit held (simulated)')
    const deals = sellerDeals(world(), ORG_IDS.ostlea)
    expect(deals).toHaveLength(1)
    const d = deals[0]
    expect(d.status).toBe('confirmed')
    expect(d.exchanged.buyerOrg).toBe('Lantern Quay Developments')
    expect(d.exchanged.buyerContact).toBe('Priya Nair, Studio Oriel')
    expect(`Handover ${formatDate(d.handoverDate)} at ${o.hubName}`).toBe('Handover 15 March 2027 at Open yard, Tilbury')
    expect(`Inbound haulage ${f.money(d.inbound)}, booked`).toBe('Inbound haulage £248.40, booked')
    const sellerSide = JSON.stringify({ lines: d.sellerLines, net: d.sellerNet, uplift: d.upliftVsScrap, inbound: d.inbound, handover: d.handoverDate, exchanged: d.exchanged })
    expect(sellerSide).not.toContain('2028-04-03')
    expect(sellerSide).not.toContain('13 months')
    const b = buyerDealView(world(), demoDealId())
    expect(b.deal.status).toBe('confirmed')
    expect(b.deal.exchanged.sellerOrg).toBe('Ostlea Estates')
    expect(b.deal.exchanged.sellerContact).toBe('Tom Ashby')
    expect(`Handover ${formatDate(b.deal.handoverDate)}`).toBe('Handover 15 March 2027')
    expect(`Storage ${f.months(b.deal.storageMonths)}`).toBe('Storage 13 months')
    expect(`Total ${f.money(b.deal.buyerTotal)}`).toBe('Total £21,227.74')
    expect(f.saving(b.saving, b.savingPercent)).toBe('Saving £1,962.02 (8.5%)')
    expect(`Break-even storage ${f.months1(b.breakEvenMonths!)}`).toBe('Break-even storage 36.2 months')
    expect(LABELS.L23).toBe('Held by the platform, withheld by seller')
    const buyerSide = JSON.stringify({ lines: b.deal.buyerLines, total: b.deal.buyerTotal, listing: b.listing, exchanged: b.deal.exchanged, custody: b.custody })
    expect(buyerSide).not.toContain('Tiverne House')
    expect(buyerSide).not.toContain('248.4')
    const l = listingForProject(world(), project(), 'L-9F4CQQ', A)!
    expect(l.status).toBe('No longer available')
    expect(browseListings(world(), A).map((x) => x.publicId)).not.toContain('L-9F4CQQ')
  })

  it('step 9: logistics', async () => {
    const s = useStore.getState()
    s.arrangeDelivery(demoDealId())
    const q = world().deals[demoDealId()].booking!.quotes
    expect(q.map((x) => `${x.haulier} ${f.money(x.amount)}, ${x.noticeDays} days' notice`)).toEqual(["Haulier A £235.80, 3 days' notice", "Haulier C £260.10, 5 days' notice", "Haulier B £264.25, 2 days' notice"])
    expect(world().deals[demoDealId()].booking!.haulier).toBe('Haulier A')
    s.approveBooking(demoDealId())
    const b = buyerDealView(world(), demoDealId())
    expect(`Delivery booked for ${formatDate(b.deal.booking!.deliveryDate)}`).toBe('Delivery booked for 3 April 2028')
    expect(b.custody.map((e) => [e.label, formatDate(e.date), e.done])).toEqual([
      ['Agreed', '7 October 2026', true],
      ['Handover at hub', '15 March 2027', false],
      ['Tested', '29 March 2027', false],
      ['Delivered', '3 April 2028', false],
    ])
    expect(JSON.stringify({ lines: b.deal.buyerLines, custody: b.custody, booking: b.deal.booking })).not.toContain('248.4')
  })

  it('step 10: prove it', async () => {
    await runDemoStep(10)
    const c = complianceView(world(), MERROWGATE_ID)
    expect(`Reused and recycled content by value: ${f.percent2(c.secured.percent)} secured`).toBe('Reused and recycled content by value: 20.06% secured')
    expect(`Aim: at least ${f.number(A.contentAim * 100)}%`).toBe('Aim: at least 20%')
    expect(`With plan ${f.percent2(c.withPlan.percent)}`).toBe('With plan 20.06%')
    expect(`Without reuse ${f.percent2(c.secured.withoutReuse)}`).toBe('Without reuse 17.62%')
    const pt = (id: string) => f.contribution(c.secured.lines.find((l) => l.line.id === id)!.points / 100)
    expect(pt('bom08')).toBe('+2.00')
    expect(pt('bom10')).toBe('+0.29')
    expect(pt('bom03')).toBe('+0.15')
    expect(`Upfront carbon avoided against buying new (A1-A4): ${f.carbon(c.avoidedT)}`).toBe('Upfront carbon avoided against buying new (A1-A4): 87.1 tCO2e')
    expect(`Reclaimed material secured: ${f.massT(c.reclaimedMassT)}`).toBe('Reclaimed material secured: 126.96 t')
    expect(LABELS.L17).toBe('Forecast, design stage')
  })

  it('step 11: ingest a demolition bill', async () => {
    const s = useStore.getState()
    const { cellsFromArrayBuffer, base64ToArrayBuffer } = await import('../domain/engines/billXlsx')
    const { SAMPLE_BILL_XLSX_BASE64 } = await import('../domain/reference/samples')
    s.loadSampleBillCells(DURNLEY_ID, await cellsFromArrayBuffer(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64)))
    let v = wasteView(world(), DURNLEY_ID)!
    expect(`${v.rowsRead} rows read`).toBe('20 rows read')
    expect(`${v.titleRows} title rows and ${v.totalRows} total row skipped`).toBe('2 title rows and 1 total row skipped')
    expect(`${v.counts.high} high confidence, ${v.counts.medium} medium, ${v.counts.low} needs review`).toBe('14 high confidence, 5 medium, 1 needs review')
    expect(`Stated total ${f.massWaste(v.statedTotal!)} matches the rows`).toBe('Stated total 11,369.2 t matches the rows')
    expect(v.statedTotalMatches).toBe(true)
    expect(`Diversion from landfill ${f.percent(v.rates.diversionRate)}`).toBe('Diversion from landfill 97.5%')
    expect(unresolvedNotice(v.rates.unresolved)).toBe('1 row (6.0 t) is not counted until it is reviewed')
    s.editBillRow(DURNLEY_ID, 20, { stream: 'mixed_cd', destination: 'landfill' })
    v = wasteView(world(), DURNLEY_ID)!
    expect(`Diversion from landfill ${f.percent(v.rates.diversionRate)}`).toBe('Diversion from landfill 97.4%')
    expect(`Aim: at least ${f.number(A.diversionTarget * 100)}%`).toBe('Aim: at least 95%')
    expect(`Reuse rate ${f.percent(v.rates.reuseRate)}`).toBe('Reuse rate 3.1%')
    expect(`Components reused off site ${f.massWaste(v.rates.byDestination.reused_off_site)}`).toBe('Components reused off site 351.0 t')
    expect(`Recycled on site ${f.massWaste(v.rates.byDestination.recycled_on_site)}`).toBe('Recycled on site 1,200.0 t')
    expect(`Potential carbon benefit of reuse ${f.carbon(v.benefit.total)}`).toBe('Potential carbon benefit of reuse 461.4 tCO2e')
    expect(`Hazardous waste ${f.massWaste(v.rates.hazardousT)}, reported separately`).toBe('Hazardous waste 14.2 t, reported separately')
    expect(f.intensity(v.rates.tonnesPerM2)).toBe('0.72 t per m2 GIA')
    expect(unresolvedNotice(v.rates.unresolved)).toBeNull()
    expect(LABELS.L18).toBe("Actual, from contractor's bill")
  })

  it('step 12: run the platform', async () => {
    await runDemoStep(12)
    const l = ledgerView(world())
    expect(l.dealGroups).toHaveLength(1)
    const g = l.dealGroups[0]
    expect(g.publicId).toBe('L-9F4CQQ')
    expect(g.lines.map((x) => `${x.label} ${f.money(x.amount)}`)).toEqual(['Commission £1,430.04', 'Storage brokerage £153.39', 'Testing referral £180.00', 'Transport margin £24.21'])
    expect(`Deal total ${f.money(g.total)}`).toBe('Deal total £1,787.64')
    expect(`Transactions and data to date ${f.money(l.toDate)}`).toBe('Transactions and data to date £16,192.44')
    expect(`Subscriptions, annual ${f.money(l.subscriptions)}`).toBe('Subscriptions, annual £70,800.00')
    const m = modelViews(world())[0]
    expect(`Agency ${f.money(m.agency.total)}, no capital employed`).toBe('Agency £1,787.64, no capital employed')
    expect(`Principal: margin ${f.money(m.principal.margin)} on capital of ${f.money(m.principal.capital)} (${f.percent(m.principal.returnRatio)})`).toBe('Principal: margin £3,785.28 on capital of £16,868.10 (22.4%)')
    expect(m.principal.candidateToBuy).toBe(true)
    expect(`Forward sale ${f.money(m.forward.total)}`).toBe('Forward sale £1,966.39')
    expect(LABELS.L29).toMatch(/^As principal/)
    expect(LABELS.L30).toMatch(/^Candidate for discussion/)
  })

  it('runDemoSteps(1, 12) reproduces the end state from a fresh seed', async () => {
    const before = JSON.stringify(world())
    await runDemoSteps(1, 12)
    expect(JSON.stringify(world())).toBe(before)
  })

  it('B7.12 at store level: running the matcher again after the deal', async () => {
    useStore.getState().loadSampleSchedule(MERROWGATE_ID)
    const r = project().matchResult!
    expect(r.results[0].required).toBe(4)
    expect(r.results[0].allocations.map((a) => [a.publicId, a.pieces])).toEqual([['L-NHZ32R', 4]])
    expect(`${r.matched} of ${r.members}`).toBe('48 of 54')
  })
})
