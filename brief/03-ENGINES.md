# Build brief, file 3 of 7: domain, data model and calculation engines

## 1. Domain primer

Get these right. Keep every reference value in `src/domain/reference/` with a `source` string and a `status` of `published`, `indicative` or `placeholder`, exactly as given in `06-DATA.md`. Do not add factors, thresholds or credit rules that are not in this brief. If you need one, add it as `placeholder` and list it in `docs/OPEN_QUESTIONS.md`.

- **RIBA Plan of Work stages:** 0 Strategic Definition, 1 Preparation and Briefing, 2 Concept Design, 3 Spatial Coordination, 4 Technical Design, 5 Manufacturing and Construction, 6 Handover, 7 Use.
- **London policy.** London Plan 2021 Policy SI 7 (reducing waste and supporting the circular economy) and the London Plan Guidance on Circular Economy Statements (March 2022). A Circular Economy Statement is required for planning applications referable to the Mayor. It has a written report and a spreadsheet template, and is submitted at pre-application, planning application and post-construction stages.
  - Policy SI 7 sets two targets used here: at least 95% of construction and demolition waste reused, recycled or recovered, and at least 95% of excavation waste put to beneficial use.
  - The guidance (paragraph 4.7.6) asks applicants to aim for at least 20% reused or recycled content by value for the whole building. This is a guidance aim, not a Policy SI 7 target. Call it "the 20% aim in the Circular Economy Statement guidance".
  - Content by value is measured on material cost excluding labour. A reused item is valued at the purchase price of an equivalent quantity of new product.
  - Reuse means a product is used again for its original purpose without reprocessing. Crushing concrete for a piling mat or for aggregate is recycling, not reuse.
  - The template's "Recycling and waste reporting" table splits waste into reused on site, reused off site, recycled on site, recycled off site, sent to landfill and sent to other management, and reports tonnes per m2 of gross internal area (GIA). Its bill of materials is set out by building element.
  - The guidance asks for a pre-redevelopment audit (can the existing building be retained) and a pre-demolition audit (materials, quantities, whether they are suitable for reclamation). The pre-demolition audit is carried out by an independent party, so this product can supply data for one but does not produce one.
  - A draft new London Plan was published for consultation on 16 July 2026 (consultation closes on 15 October 2026). It is not adopted. Use the 2021 plan and the 2022 guidance as the basis, keep policy references in one file, and show the line "Policy basis: London Plan 2021 and the 2022 guidance. A draft new plan is in consultation." on the compliance screens.
- **Building layers** used by the Circular Economy Statement template: Site, Substructure, Superstructure, Shell/Skin, Services, Space, Stuff, Construction stuff.
- **Whole life carbon.** The UK method is the RICS Whole Life Carbon Assessment standard, 2nd edition. Life cycle modules: A1-A3 product stage, A4 transport to site, A5 construction, B in use, C end of life, D beyond the life cycle. "Upfront carbon" is modules A0-A5. This prototype compares a reclaimed product with buying new for modules A1-A4 only, by a simplified method. It is not a compliant assessment and must say so. Under the RICS standard, the benefit of materials recovered from a building and used elsewhere is reported for the donor building separately, in module D, and is never netted off. So the donor-side figure in the waste dashboard and the buyer-side figure in the project dashboard describe the same tonnes from two ends and must never be added together.
- **BREEAM.** The relevant issues under the BREEAM New Construction Version 7 series are Wst 01 Construction waste management, Mat 01 Building life cycle assessment, Mat 05 Material efficiency and Wst 06 Disassembly and adaptability. Version 7.1 is the current release. Hold the scheme version and issue IDs in config and label them "confirm against the current manual".
- **LEED v5 (BD+C), Materials and Resources:** prerequisite Quantify and Assess Embodied Carbon; credits Building and Materials Reuse, Reduce Embodied Carbon, Construction and Demolition Waste Diversion.
- **How to word certification outputs.** The exports are inputs to an assessor's evidence. They never state that a credit or target has been awarded or achieved, and each mapping row carries the note "Input to the evidence for this requirement. Confirm with the assessor and the current scheme manual."
- **Structural steel reuse.** The UK protocol is SCI P427 (assessment, testing and design principles for reclaimed structural steel, for steelwork from 1970 onwards), with SCI P440 for older steel and the BCSA model specification for the purchase of reclaimed sections. In outline: record provenance, inspect, group similar members from the same source structure, carry out non-destructive tests on members and destructive tests on samples from each group, then declare properties so a fabricator can use the steel. A reclaimed member is designed with more caution than a new one of the same size, so a match by section size is only indicative until the structural engineer has checked it. The prototype tracks a simplified status: `untested`, `inspected`, `tested`, `certified`.
- **Steel section designations.** "UB 457x191x67" is a universal beam with a nominal serial size of 457 by 191 mm and a mass of 67 kg per metre. "UC" is a universal column. The first two numbers are the serial size. Mass in kg is pieces times length in metres times kg per metre. Common grades are S275 and S355. A 1984 frame would have been built with steel to BS 4360: Grade 50B is roughly S355.
- **Waste codes.** Contractors' waste records usually carry European Waste Catalogue (EWC) codes from chapter 17. An asterisk marks hazardous waste. Items sold for reuse are often not classed as waste and carry no code. The founder calls the contractor's record a "demolition bill". Use that term.
- **Why capture matters.** New buildings may have material passports and digital twins. Buildings from the 1970s and 1980s rely on paper drawings, archive bills of quantities and manual survey.
- **Units:** tonnes (t), metres and millimetres, square metres, tCO2e and kgCO2e, pounds sterling.

## 2. Data model

Use these entities. Names can vary. The private and public split cannot.

- `Org`, `Persona`: as in `02-DEMO-PATH.md`. Partners (storage facilities, a testing partner, hauliers) are described by category, never given brand names.
- `SourceBuilding` (private to the owner): opaque ID, name, address, postcode district, local authority, region, year built, storeys, GIA, structure type, tenants, programme dates (strip-out start, dismantling start, clear-by date), default hub, and the building-level disclosure settings (location level `region` or `local_authority`; timing level `quarter` or `month`).
- `InventoryItem` (private): opaque ID, owner tag (for example `TH-01`), family, structured specification, quantity in the family's pricing unit, pieces where relevant, mass, condition A to C, recoverability A to C, test status, grade (steel), location in building, photos (each private unless ticked public), survey notes, captured by, captured date.
- `Lot` (private): one per item. Public ID, pieces or quantity still on offer, visibility, exact available-from date or in stock (with the holding hub and in-store-since date if it is in a hub), ask, reserve.
- `PublicListing` (derived, never stored): the only shape buyer-facing code may read. See 04 section 1.
- `Project` (private to its team): opaque ID, name, developer, team, site postcode district, local authority, region, blind description (organisation type and project type), GIA, RIBA stage, key dates including the steel need-by date, bill of materials lines, requirement lines, stored match results, plan items, whether the confidentiality terms are accepted, and the list of owners who have approved it for private matching.
- `BlindBuyer` (derived): the only description of a project a seller sees before a deal is confirmed. See 04 section 1.
- `Requirement`: reference, section, length, count, minimum grade, need-by date (defaults to the project's steel need-by date).
- `PlanItem`: lot (by public ID), pieces, requirement, package (facility, testing), status, negotiation.
- `Negotiation`: both mandates, log, outcome. Each side reads only its own view.
- `Deal`: plan item, agreed price, status, handover date, custody events, with a `buyerView` and a `sellerView` that carry only that side's cost lines and dates.
- `WasteBill`, `WasteRow`: an imported demolition bill for a deconstructed building, with the building's GIA.
- `MarketSnapshot`: the fixed supply and demand totals used for the market signal (F5).
- `Assumptions`: one object holding every parameter in `06-DATA.md` section A2. Engines receive it as an argument. Read-only in this run. Distances are record data on buildings, hubs and projects, not assumptions, and never appear on the Assumptions screen.
- `LedgerEntry`: platform revenue by stream.

## 3. Shared rules for all engines

Pure TypeScript functions in `src/domain/`, no React imports, every parameter passed in.

**Rounding**

- Carry full precision for mass, carbon, rates and scores. Round those for display only.
- Money is different. Every amount marked `[£]` below is rounded to pence when it is created: `roundPence(x) = floor(x * 100 + 0.5 + 1e-9) / 100`. Totals and differences are computed from the rounded amounts (apply `roundPence` to the result to remove floating point noise). This is why every breakdown on screen adds up to its total to the penny.
- `roundToTick(x, tick)`: `n = floor(x / tick + 0.5 + 1e-9)`, return `n * tick` rounded to the tick's decimals. When comparing prices, compare whole numbers of ticks, never floats.
- In every later formula, `guide` means the tick-rounded guide price.

**Dates**

- `daysBetween(a, b)` = b minus a in whole calendar days. From 7 October 2026 to 3 April 2028 is 544.
- A month is 30 days in every storage formula: `months = ceil(days / 30)`.
- `demoDate` is 7 October 2026 everywhere. Never read the system clock.

**Constants and terms**

- `ROAD = 0.0001065` tCO2e per tonne km.
- `units` always means the quantity in the family's pricing unit (tonnes for steel, m2, bricks, panels, m3).
- Public availability of a lot: `now` if it is in stock, otherwise a window: the calendar quarter or month (the building's timing level; for other sellers' lots as given in 06) that contains its exact available-from date, with `windowStart` and `windowEnd` as the first and last day. Display: "Available now", "Available from Q1 2027", "Available from March 2027".

**Display formats** (one module, used by every screen, export and test)

| Quantity | Format | Example |
|---|---|---|
| Money amounts: lines, totals, quotes, ledger | Pounds and pence with thousands separators | £21,227.74 |
| Unit prices | To the family's tick, with the unit | £740 per tonne, £3.60 per panel, £0.99 per brick |
| Bill of materials values | Whole pounds | £1,150,000 |
| Mass on marketplace, project and supply screens | Tonnes, two decimals | 24.16 t |
| Mass on waste screens | Tonnes, one decimal | 11,369.2 t |
| Carbon | tCO2e, one decimal | 41.0 tCO2e |
| Percentages | One decimal | 8.5% |
| Content by value and its contributions | Two decimals | 20.06%, +0.15 |
| Months of storage | Whole months | 13 months |
| Break-even and holding months, tonnes per m2 | One and two decimals | 36.2 months, 0.72 t per m2 GIA |
| Scores | One decimal | 68.7 |
| Dates | Day month year in words; quarters; months | 15 March 2027, Q1 2027, March 2027 |
| Lengths and sections | As catalogued | 7.5 m, UB 457x191x67 |
| Steel grade | S275, S355, or the words for unknown | To be confirmed by testing |

Round half up on the full-precision value. A negative saving is never shown with a minus sign: see F8.

## 4. The engines

### F1. Mass

- Steel sections: `massKg = pieces * lengthM * massPerMetre`.
- Area families: `massKg = areaM2 * arealDensityKgM2`. For panels, `areaM2 = pieces * panelWidthM * panelHeightM`.
- Count families: `massKg = count * unitMassKg`. Raised floor panels also have `areaM2 = count * 0.36`.
- Volume families: `massKg = volumeM3 * densityKgM3`.

### F2. Upfront carbon avoided against buying new (A1-A4)

```
baselineQty, reuseQty      in the factor's basis: tonnes, or m2 for per m2 factors
baselineMassT, reuseMassT  tonnes
k = 1 for factors in tCO2e per tonne, 0.001 for factors in kgCO2e per m2

A1A3_new   = baselineQty * factorNew * k
A4_new     = baselineMassT * newKm * ROAD            newKm = 120
A1A3_reuse = reuseQty * factorReuse * k
A4_reuse   = reuseMassT * reuseKm * ROAD
avoided    = (A1A3_new + A4_new) - (A1A3_reuse + A4_reuse)
percent    = avoided / (A1A3_new + A4_new)
```

Rules:

1. **Baseline.** By default the baseline is the reclaimed quantity itself. For a plan item or deal that comes from a matcher allocation, the baseline is the required members (pieces at the required length and required kg per metre), because that is what would have been bought new, and the reclaimed quantity is the allocated pieces at their stock length and stock section. Offcuts and heavier sections are carried by the reclaimed side.
2. **reuseKm.** 50 km for inventory items, listings and plan items, up to the moment a deal is confirmed (an estimate, labelled as one). For a confirmed deal routed via a hub: a standard inbound allowance of 25 km plus the real hub to project distance. The allowance replaces the real source to hub distance on purpose, so that no buyer-facing figure can be used to work out where the source building is. For a confirmed deal collected direct: the real source to project distance (engine and tests only).
3. **Unused surplus.** A lot whose source type is `unused_surplus` is new product. It claims no avoided carbon: the result is null and the listing shows "No avoided carbon is claimed for unused surplus."
4. The baseline factor for steel is the UK average for new sections. The panel says: "A project assessment would use the factor for the steel the project would otherwise buy."

### F3. Diversion and reuse rates (waste bill)

Destinations: `reused_on_site`, `reused_off_site`, `recycled_on_site`, `recycled_off_site`, `recovered`, `landfill`, `hazardous_disposal`.

```
counted rows     = rows that are resolved, not hazardous, and not excavation
totalNonHaz      = sum of tonnes of counted rows
diversionRate    = (totalNonHaz - landfill) / totalNonHaz        aim 0.95
reuseRate        = (reusedOnSite + reusedOffSite) / totalNonHaz
share per destination = tonnes to that destination / totalNonHaz
tonnesPerM2      = totalNonHaz / building GIA
```

- A row is resolved when its stream, its destination and its tonnes are all known.
- A row is hazardous if its code ends in an asterisk or its destination is `hazardous_disposal`. Hazardous rows are reported separately and excluded from every rate.
- Unresolved rows are excluded and reported as "1 row (6.0 t) is not counted until it is reviewed", or "N rows (X t) are not counted until they are reviewed" for more than one.
- Excavation rows (stream `soil_stones`) are excluded from demolition rates and listed separately.
- `recovered` is shown to users as "Other management (energy recovery, backfill)". It counts towards diversion.

Potential carbon benefit of off-site component reuse (donor side, A1-A3 only, because a demolition bill has no transport data): for each counted `reused_off_site` row whose stream maps to a marketplace family, `tonnes * (factorNew - factorReuse)` for per-tonne factors. For per m2 factors convert first: `m2 = tonnes * 1000 / arealDensityKgM2` (for raised floors the areal density is `unitMassKg / 0.36`), then `m2 * (factorNew - factorReuse) / 1000`. Rows reused on site and rows with no marketplace family claim nothing. Stream to family: steel to `steel_section`, brick_block to `clay_brick`, curtain_wall to `curtain_wall`, stone to `stone_cladding`, raised_floor to `raised_floor`, timber to `timber_joist`. Label the figure "Potential carbon benefit of reuse. Reported outside the building's life cycle (module D). Do not add it to a receiving project's figures."

### F4. Reused and recycled content by value (project)

Each bill of materials line `j` has a material value `V_j` (excluding labour), a `recycledShare_j` between 0 and 1 for its new material, and, if it is tied to a marketplace family, a line quantity in that family's pricing unit.

```
s_j            = min(1, securedQty_j / lineQty_j)     0 for lines not tied to a family
contribution_j = V_j * (s_j + (1 - s_j) * recycledShare_j)
percentByValue = sum(contribution_j) / sum(V_j)       aim 0.20
points_j       = 100 * V_j * s_j * (1 - recycledShare_j) / sum(V_j)
withoutReuse   = percentByValue with every s_j = 0
```

- `securedQty_j` is the baseline quantity (rule 1 in F2) of every confirmed deal for that family, converted into the family's pricing unit: tonnes of required members for steel, 3,800 panels for the raised floor deal, 520 m2 for the stone deal. This gives the "Secured" figure.
- "With plan" adds the baseline quantity of plan items that are not yet confirmed.
- `points_j` is what reuse on that line adds, in percentage points. `withoutReuse + sum(points_j) = percentByValue`.
- Method note to display: "Material values exclude labour. A reused item counts at the price of the same quantity of new product."

### F5. Price guidance and market signal

```
raw   = newPrice * baseReuseRatio * conditionFactor * testFactor * signalFactor
guide = roundToTick(min(max(raw, scrapValue), capRatio * newPrice), tick)
low   = roundToTick(guide * 0.93, tick)
high  = roundToTick(guide * 1.07, tick)
```

- `conditionFactor`: A 1.00, B 0.92, C 0.80. `testFactor`: untested 0.90, inspected 0.95, tested 1.00, certified 1.05. `signalFactor`: Low demand 0.93, Balanced 1.00, High demand 1.07.
- **Market signal.** It is computed from `MarketSnapshot`, fixed at seed time, never from live state, so that nothing a user does during a session moves a public price. The key is the family and, for steel, the section type and serial size (for example `UB 457x191`).
  - Snapshot supply for a key: the quantity, in pricing units, of the lots in 06 section A4 that are open and not sold. Nothing else is in the snapshot.
  - Snapshot demand for a key: the quantity of every requirement line in 06 section A5, across all three projects, including the viewing project's own.
  - A lot that is in the snapshot is priced with `r = demand / supply`. Anything else (every Tiverne House item, whether private, matched only or published during the session, and every newly captured item) is priced with its own quantity added to supply: `r = demand / (supply + ownQty)`.
  - `r < 0.5` is Low demand. `0.5 <= r <= 1.5` is Balanced. `r > 1.5` is High demand. If supply is zero the signal is High demand whatever the demand.
- Outside the owner's own records the signal appears only as one of those three labels with "Market signal, updated monthly". The ratio, the tonnages behind it and any count of requirement lines are never shown to anyone.
- The guide price, its range and the signal are public. They do not depend on the lot's dates.
- **Seller's suggested mandate (private to the seller).** `urgency` = 1.00 if `daysBetween(demoDate, clearBy)` is more than 120, 0.96 if 60 to 120 inclusive, 0.90 if fewer than 60, and 1.00 if the lot has no clear-by date. `ask = roundToTick(guide * 1.04 * urgency, tick)`, `reserve = roundToTick(guide * 0.95 * urgency, tick)`.
- **Buyer's suggested mandate (private to the buyer).** `open = roundToTick(guide * 0.91, tick)`, `max = roundToTick(guide * 1.01, tick)`.
- "How this is calculated" for a guide price shows the new price, the base ratio and one line per factor: condition, test status and signal label, each with its multiplier. The urgency line is shown to the seller only.

### F6. Deconstruction priority

For each inventory item of a building, priced as in F5 (own quantity added to supply, no urgency):

```
netValue [£] = units * guide - units * recoveryPremium
carbon       = avoided from F2 for the item (baseline = itself, reuseKm 50)
demand       = Low demand 0, Balanced 0.5, High demand 1
ease         = recoverability A 1.0, B 0.6, C 0.2
score        = 100 * ( 0.40 * max(netValue, 0) / maxNetValue
                     + 0.30 * max(carbon, 0) / maxCarbon
                     + 0.20 * demand
                     + 0.10 * ease )
route        = "recycle" if netValue <= 0 or recoverability is C, otherwise "recover"
```

`maxNetValue` and `maxCarbon` are the largest values among the building's items (a term is 0 if its maximum is 0 or negative). Rank by score descending, then net value descending, then tag in natural order. Judge ties at full precision. Show the ranked list with score bars, the four parts of each score, the route, and a one-line reason for a recycle route: "Recycle rather than recover: careful removal would cost more than it would fetch." when net value is not positive, otherwise "Recycle rather than recover: unlikely to come out intact." Also show the recoverable net value (the sum of net value over items routed "recover") and the share of it held by the top three of those items by score.

### F7. Schedule matching (steel)

Inputs: requirement lines and the public projections of the steel lots visible to the project (02 section 4, rule 5). The matcher reads nothing but projections. An uploaded schedule is an input to the matcher only: it does not change the market snapshot.

A lot is eligible for a requirement when all of these hold, tested in this order:

1. Same section type (UB or UC) and same serial size.
2. Lot mass per metre is equal to or greater than the required mass per metre.
3. Lot piece length is equal to or greater than the required length.
4. Grade: S355 ranks 2, S275 ranks 1. A lot of known grade must rank at least the required grade. A lot of unknown grade is eligible only when `allowUnknownGrade` is true (the default) and is flagged "Grade to be confirmed by testing".
5. Timing: the lot is available `now`, or its `windowEnd` is on or before the need-by date.

Process requirements in this order: length descending, then required mass per metre descending, then reference in natural order. For each requirement, rank its eligible lots by over-specification (lot kg per metre minus required kg per metre, rounded to 0.1) ascending, then offcut (lot length minus required length, rounded to 0.01 m) ascending, then availability (`now` first, then `windowStart` ascending), then public ID. Take pieces from the best lot until the requirement is met or the lot is used up, then move to the next lot. One stock piece serves one required member. Pieces are not cut into several members.

Storage estimate for an allocation, in months:

```
now lots    : m = ceil(max(0, daysBetween(demoDate, needBy)) / 30); min = max = m
window lots : min = ceil(max(0, daysBetween(max(windowEnd,   demoDate), needBy)) / 30)
              max = ceil(max(0, daysBetween(max(windowStart, demoDate), needBy)) / 30)
```

For each allocation report: lot, pieces, over-specification, offcut, grade flag, storage range. Summary: lines read and members required ("6 lines, 102 members"), members matched, coverage by count, the open-market-only count once private lots are included ("Open market only: 60 of 102"), baseline mass (matched members at required section and length), stock mass (allocated pieces at stock length and stock section), offcut mass (`sum of pieces * (lot length - required length) * lot kg per metre`), and avoided carbon from F2 with baseline mass as the baseline, stock mass as the reclaimed quantity and reuseKm 50.

Unmatched or partly matched requirements get one reason, using only lots the project can see. Apply the five eligibility rules in order and report the first that leaves no lot:

1. "No stock in this serial size"
2. "No stock heavy enough"
3. "No stock long enough (longest visible in this serial size is X m)", where X is the longest lot of that serial size
4. "No stock of the required grade"
5. "No stock available in time"
6. If eligible lots exist but are used up: "Not enough eligible stock"

Every result carries the line "Indicative match. Subject to the structural engineer's check to SCI P427."

### F8. Package costs

Buyer packages exist for steel allocations only. `massT`, `pieces` and `units` are those of the allocated pieces.

`pricePerUnit` is the lot's public guide price from F5 until a price is agreed, then the agreed price. The buyer never sees the ask or the reserve.

```
material [£] = units * pricePerUnit
testing  [£] = ndtFee * pieces + destructiveFee * ceil(massT / 20)     0 if testing is off
loads        = ceil(massT / payloadT)
leg(km)      = loads * (haulFixed + haulPerKm * km)

Buyer, route via hub
  storageMonths before confirmation = the maximum of the storage range from F7
  storageMonths after confirmation  = ceil(max(0, daysBetween(max(handoverDate, demoDate), needBy)) / 30)
  storage     [£] = facility.storageRate * massT * storageMonths
  handlingOut [£] = facility.handlingRate * massT
  outbound    [£] = leg(km hub to project)          replaced by the booked quote after step 9
  buyerTotal      = material + testing + storage + handlingOut + outbound

Seller, route via hub
  commission    [£] = commissionRate * material
  inbound       [£] = leg(km source to hub)
  handlingIn    [£] = facility.handlingRate * massT
  sellerStorage [£] = 0
  For a lot already in a hub before the sale: inbound = 0, handlingIn = 0, and
  sellerStorage [£] = facility.storageRate * massT * ceil(daysBetween(inStoreSince, dealDate) / 30)
  sellerNet         = material - commission - inbound - handlingIn - sellerStorage

Route direct (engine and tests only)
  buyerTotal = material + testing + leg(km source to project)
  sellerNet  = material - commission

costNew [£]     = baselineQty * newPrice                 baselineQty as in F2 rule 1, in pricing units
saving          = costNew - buyerTotal
savingPercent   = saving / costNew
breakEvenMonths = (costNew - material - testing - handlingOut - outbound) / (facility.storageRate * massT)
scrapValue  [£] = units * scrapValuePerUnit
premium     [£] = units * recoveryPremium
upliftVsScrap   = sellerNet - scrapValue - premium
```

- This follows the founder's agency model: the donor pays storage until the sale completes, and the buyer pays from handover until the material is needed. The demo deal is agreed before deconstruction, so the donor has no storage to pay.
- If `saving` is negative, show "Costs £X more than new (Y%)" with X and Y positive.
- The buyer never sees the inbound leg, its cost, or anything computed from it. The seller never sees storage months, the need-by date or the buyer's total.
- **Owner's holding view**, shown on an item's private record: seller-side figures at the guide price, as if the whole lot were sold today via the building's default hub (for a family that needs covered storage, the nearest covered store). `holdMonths = upliftVsScrap / (facility.storageRate * massT)`. If `upliftVsScrap` is positive show "Holding unsold stock would use up the gain over scrap in about N months". Otherwise show "No gain over scrap at the guide price".

### F9. Negotiation agent (scripted, deterministic)

Mandates: seller `ask` and `reserve`; buyer `open` and `max`. Convert all four to whole numbers of ticks before doing anything.

```
s = ask, b = open. Log "Ask s", then "Bid b".

settle check:
   if b >= s                  agreed at s
   else if s - b <= 2 ticks   p = roundToTick((s + b) / 2, tick)
                              if reserve <= p <= max, agreed at p; otherwise not settled

Run the settle check once after the two opening entries.
Then moves alternate, seller first, at most 12 moves. A hold is a move.
   seller: candidate = roundToTick(s - 0.4 * (s - b), tick)
           if candidate < reserve or candidate = s, the seller holds; otherwise s = candidate
   buyer : candidate = roundToTick(b + 0.4 * (s - b), tick)
           if candidate > max or candidate = b, the buyer holds; otherwise b = candidate
   after every move: run the settle check; if settled, stop.
                     Then, if this move and the one before it were both holds, stop: no agreement.
After 12 moves without settlement: no agreement.
```

Rules that protect both sides:

- An agent never states its limit. A hold is logged as "Seller holds" or "Buyer holds" with no figure. "No agreement" is reported without a gap or any figure beyond the offers already made.
- Log entries may carry a short templated reason built only from public fields (guide price, condition, test status, quantity). They never mention clear-by dates, need-by dates, storage months or the other side's programme.
- Human approval is required twice on each side: to start with a mandate (the seller sets theirs when publishing), and to accept the outcome.
- Messages reveal one at a time with a short delay and a "Skip" control, and appear at once when reduced motion is preferred.

### F10. Disclosure score

An illustrative, rule-based score for how much a building's open listings disclose. It is set per building, because the disclosure levels apply to every lot from that building.

```
location  : region 5 | local authority 20
timing    : quarter 5 | month 15
open lots : the building's open lots, counting a lot about to be published as open:
            0 or 1 scores 0 | 2 or 3 scores 10 | 4 or more scores 20
frame     : those open steel lots include both UB and UC sections, or three or more
            distinct section and length combinations: 15
photos    : any photo ticked public on one of those lots: 10
score     = sum
band      : below 25 Low | 25 to 39 Medium | 40 or more High
```

- Low publishes freely. Medium publishes with a warning. High blocks publishing to the open marketplace.
- Whenever the score is shown, list what an outsider could infer, one line per term that scores above its minimum: "Local authority shown: narrows the search to one planning authority's area." "Month shown: narrows the dismantling programme to a month." "Several open lots from one building can be linked by region, window and seller type." "Beam and column lots together describe a structural grid and storey height." "A public photo may show features that identify the building." With nothing above the minimum: "Region and quarter only."
- Recalculate for the whole building whenever a lot or a setting changes.
- Before a deal there is no finer level than local authority and month, no named or aliased seller, and no public free text.
- Defaults: region, quarter, photos private.

### F11

Market insights aggregation. Tier 2: see `08-TIER2.md`.

### F12. Platform revenue and business models

Agency model (asset-light, the default), per confirmed deal:

```
commission       [£] = the seller's commission line
storageBrokerage [£] = brokerageRate * (storage + handlingIn + handlingOut + sellerStorage)
testingReferral  [£] = referralRate * testing
transportMargin  [£] = transportMarginRate * (inbound + outbound), or the direct leg
                       outbound is the booked quote once a booking exists, otherwise the estimate
dealTotal            = sum of the four
```

The ledger shows these lines for each deal made in the session, then fixed seeded entries (06 section A9): commission on two earlier deals, data and insights (a placeholder amount), survey referral (shown as "not simulated", zero) and subscriptions as an annual figure. "Transactions and data to date" is the sum of all deal lines and seeded entries except subscriptions. Label transport margin "Candidate, not from the founder's notes".

Model comparison, for a deal confirmed in the session:

- **Principal model (capital-heavy).** The platform buys the lot as it stands at `purchase [£] = principalBuyRatio * newPrice * units`, pays testing, storage (the deal's confirmed months at the deal's facility), handling in, handling out and the inbound leg (the deal's own lines), and sells at `sale [£] = units * testedGuide`, where `testedGuide` is the F5 guide for the lot's own condition and signal with test status `tested`. `margin = sale - purchase - costs`. `capital = purchase + costs`. `return = margin / capital`. Show beside it: "As principal the platform would trade against users whose limits and programmes it holds."
- **Hybrid flag.** "Candidate to buy" when the lot's market signal is High demand and the principal margin is at least 1.5 times the agency deal total.
- **Forward sale.** A third option, labelled "Candidate for discussion, not from the founder's notes". The sale is agreed before deconstruction, as on the demo path, so the donor pays no storage and the platform holds no stock. `matchingFee [£] = matchingFeeRate * material`. Total = agency deal total plus the matching fee.

### F13. Demolition bill import (real parser, runs in the browser)

The parser reads a table of cells, so the same code serves an `.xlsx` and a `.csv`. In this run it is given the sample workbook only. Steps:

1. **Header row.** A cell matches a field when its lower-cased text contains one of the field's names as a whole word or phrase. Test the fields in this order: facility (`facility`); description (`description`); code (`ewc`, `waste code`, `lwc`); quantity (`quantity`, `qty`, `tonnage`); unit (`unit`, `units`, `uom`); route (`disposal route`, `route`, `destination`). So "Destination facility" is the facility column. A cell that is exactly `ref`, `item` or `no` is the reference column. The header is the first row in which at least three different fields are matched (the reference column does not count towards the three). Non-blank rows above it are title rows and are skipped. Blank rows are skipped everywhere. In merged cells read only the top-left cell.
2. **Total rows.** A row whose first non-empty cell starts with "total" or "subtotal" (any case) is not data. A "total" row sets the stated total from its quantity cell. The stated total matches when it is within 0.05 t of the sum of all data rows, including hazardous and unresolved rows.
3. **Quantity and unit.** Accept numbers, and text with thousands separators. `t`, `te`, `tonne`, `tonnes` mean tonnes. `kg` is divided by 1,000. Any other unit leaves the tonnes unknown.
4. **Code and stream.** Strip everything except digits from the code cell, noting a trailing asterisk. Six digits become `NN NN NN`, with the asterisk kept as the hazardous flag. If a code is present and in the table (06 section A7), it gives the stream. If a code is present but unreadable or not in the table, the stream is unknown. If there is no code, use the keyword list in 06 section A7 on the lower-cased description: a keyword matches at the start of a word (`brick` matches "bricks" and "brickwork"), `raf` must be a whole word, first match in list order wins.
5. **Destination.** Lower-case the route text. Replace hyphens, slashes, commas and brackets with spaces. Rewrite "onsite" as "on site" and "offsite" as "off site". Collapse repeated spaces. Rewrite "re use" as "reuse". Remove the phrase "non hazardous". Then apply the first rule that matches:
   1. contains `haz`: `hazardous_disposal`
   2. contains `landfill`: `landfill`
   3. contains `crush`, `recycl`, `scrap`, `smelt` or `aggregate`: `recycled_on_site` if it also contains `on site`, otherwise `recycled_off_site`
   4. contains `reuse`, `reused` or `resale`: `reused_on_site` if it also contains `on site`, otherwise `reused_off_site`
   5. contains `energy`, `efw`, `incinerat` or `backfill`: `recovered`
   6. otherwise unknown. A sorting stop such as "materials recovery facility" is deliberately unknown: the final destination is needed.
6. **Confidence.** High: stream from a recognised code, destination recognised, tonnes known. Medium: stream from a keyword, destination recognised, tonnes known. Low: anything unknown. Low rows need review before they count. A row the user corrects is marked "edited" and counts once its stream, destination and tonnes are all known.
7. The review screen shows the original text beside the normalised values, lets the user correct stream and destination on any row, and shows the totals updating.

Label the import "Rule-based in this prototype. Stands in for an AI step."

### F14. Capture Assist (real text parsing, rule-based)

Turns a typed description into structured fields. ("Dictated" in the concept means the device keyboard's dictation. Do not use a speech API.) Work on a lower-cased copy of the text. Apply the steps in order. When a step matches, record the matched words as the evidence for that field and replace the whole match with one blanking character (`\u0001`), so that later steps cannot reuse it. Each step takes the first match only. Patterns are JavaScript regular expressions.

1. **Section designation.** `(?:\b(ub|uc)\s*)?(\d{3})\s*x\s*(\d{3})\s*x\s*(\d{2,3}(?:\.\d+)?)(?:\s*(ub|uc)\b)?`, valid only if "ub" or "uc" is present before or after. Look up type, serial size and the third number in the section table. If there is no such designation but the serial size exists, choose the section of that type and serial size whose catalogue mass per metre is nearest the typed number (the lighter on a tie) and flag it "closest catalogue match, please check". A section sets the family to `steel_section`.
2. **Family** (only if step 1 found none), first match wins: `curtain wall(?:ing)?` to curtain_wall; `raised access floor|raised floor|\braf\b` to raised_floor; `pre-?cast` to precast_cladding; `stone` to stone_cladding; `bricks?` to clay_brick; `joists?|timber` to timber_joist; `steel|\bbeams?\b|\bcolumns?\b|\bub\b|\buc\b` to steel_section.
3. **Panel dimensions.** `(\d+(?:\.\d+)?)\s*(mm|m)?\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(mm|m)?(?![a-z0-9])`. A unit after the second number applies to both. With no unit, values over 100 are millimetres, otherwise metres. Store width and height in metres.
4. **Area, then volume.** `(\d[\d,]*(?:\.\d+)?)\s*(?:m2|m²|sq\.?\s?m|sqm)(?![a-z0-9])`, then the same with `(?:m3|m³|cu\.?\s?m)`.
5. **Thickness.** `(\d+(?:\.\d+)?)\s*mm(?![a-z0-9])`.
6. **Length.** `(?:@|\bat\b)?\s*(\d+(?:\.\d+)?)\s*m(?![a-z0-9²])(?:\s*long\b)?`.
7. **Count,** the first of these four patterns that matches (numbers may have thousands separators):
   1. `(\d[\d,]*)\s*(?:no\.?|nr|nos\.?|pcs|pieces|off)(?![a-z0-9])`, as in "48 no."
   2. `(?:^|[\s\u0001])x\s*(\d[\d,]*)(?![\d.]|\s*x)`, as in "x 54"
   3. `(\d[\d,]*)\s*(?:panels|bricks|tiles|joists|beams|columns|members|lengths)\b`
   4. `^\s*(?:approx\.?|about|circa)?\s*(\d[\d,]*)(?![\d.])`, a number at the very start of the text
8. **Recoverability suggestion.** `bolted|lime mortar` suggests A; `welded` suggests B; `cast-in|cast in|cement mortar` suggests C.
9. **Location.** Split what is left at commas, semicolons and blanked matches. Every piece that contains a location word goes to the private location field, joined with ", ". Location words: level(s), floor(s), storey(s), basement, roof, plant room, room, bay, grid, gridline, elevation, north, south, east, west, core, stair, ground, mezzanine, wing, zone, podium.
10. **Derived.** For a curtain wall with a count and panel dimensions and no stated area, `area = count * width * height`.
11. **Required fields** by family: steel_section needs section, count, length; curtain_wall needs count, panel width, panel height; precast_cladding and stone_cladding need area; clay_brick and raised_floor need count; timber_joist needs volume. A required field that Assist could not fill stays empty and is highlighted. Assist never guesses silently. Condition is always chosen by the surveyor.

The capture screen shows which words produced which field. The examples in `07-EXAMPLES.md` section B13 are the test. If an example fails, fix the parser, not the example.
