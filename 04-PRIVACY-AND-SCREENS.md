# Build brief, file 4 of 7: privacy model, screens, exports and fixed labels

Sections 1 to 4 are the privacy model. They matter as much as the calculations. The risk being designed against is inference: a competitor, agent or journalist working out an owner's plans, or a seller working out a developer's, from what the platform shows them.

## 1. Two projections

- `toPublicListing(lot, item, building, snapshot, assumptions)` in `src/domain/privacy/` is the only way a `PublicListing` is made. Marketplace screens, the matcher, the reuse plan, buyer-side deal views and buyer-side exports read `PublicListing` and nothing from the private supply model.
- `toBlindBuyer(project)` is the only description of a buyer that seller-side screens read before a deal is confirmed.
- Enforce both with a test that fails if files under the marketplace, project and compliance feature folders import private supply types, or files under the supply folder import private project types.

`PublicListing` has exactly these 21 keys and no others. A unit test asserts the key set.

| Key | Content |
|---|---|
| `publicId` | `L-` plus six characters. Random, never sequential, never derived from the owner's tag. Seeded lots have fixed IDs. New lots draw from a fixed pool in the seed so that replays are deterministic. |
| `sharing` | `open` or `in_confidence` (a matched-only lot shown to an approved project) |
| `family` | Family ID |
| `title` | Built from structured fields by the family's title template (06 section A2). No free text. |
| `spec` | The structured specification, including the section dimensions needed for the drawing |
| `quantity` | What is still on offer: value, unit, and pieces where relevant |
| `massT` | Tonnes |
| `condition` | A, B or C |
| `testStatus` | untested, inspected, tested or certified |
| `grade` | S275, S355 or unknown for steel; null otherwise |
| `sourceType` | `deconstruction`, `unused_surplus` or `fit_out_strip` |
| `sellerType` | Organisation type, for example "Asset owner". Never a name. |
| `eraBand` | For steel from deconstruction: "1970 or later" or "before 1970". Null otherwise. Never the year built, the building type or the storey count. |
| `location` | Level and label at the building's disclosure level. Region by default. |
| `availability` | `now`, or a window: level, label, `windowStart`, `windowEnd`. Never the exact date. |
| `collectionHubId` | The holding facility if the lot is in stock at a hub. Null otherwise. |
| `listedMonth` | Month of listing, not the date |
| `status` | "Available" or "No longer available". Nothing that signals an offer in progress. |
| `price` | `guide`, `low`, `high` and `signal` from F5 |
| `carbon` | Avoided tCO2e and percent from F2 at listing level, or null for unused surplus |
| `photos` | Photos the owner has ticked public. Empty by default. |

It never contains: building name, address, postcode, local authority (unless disclosed), owner name, owner tag, internal IDs, tenants, programme dates, the exact available-from date, location within the building, survey notes, who captured the item, anything about other lots from the same building, total stock, ask, reserve, offers received, distances from the source, or anything about the owner's finances.

`BlindBuyer` has exactly four keys: organisation type ("Design team"), project type ("commercial project"), region ("Inner London East") and need-by quarter ("Q2 2028"). It renders as "Design team, commercial project, Inner London East, needed by Q2 2028".

## 2. Controls the owner has

- **Visibility per lot:** `private` (inventory only); `matched_only`, shown as "Private matching only" (never in Browse; revealed only to projects this owner has approved, after the team accepts confidentiality terms in a simulated dialog); `open`, shown as "Open marketplace". The owner sees each approved project only as a `BlindBuyer`. In the seed, Ostlea Estates has approved Merrowgate Wharf. Approving further projects is not part of this prototype.
- **Disclosure per building:** location (region or local authority) and timing (quarter or month). These apply to every lot from the building, and take effect at once.
- **Market preview:** "As the market sees it" renders the real public projection beside the private record. In the owner's views, private fields carry a consistent visual mark (05 section 1) so it is obvious what stays inside.
- **Disclosure score** from F10 with the plain list of what an outsider could infer.
- **Photos** are private unless ticked public, one by one. Every photo is re-encoded through a canvas when it is captured, so embedded metadata never reaches the store.

## 3. Blind on both sides until a deal is confirmed

1. Buyers are private too. Sellers see a `BlindBuyer` and nothing else. Requirement lines are never shown to sellers. The only demand information anyone sees is the three-level market signal.
2. No buyer-facing figure before confirmation depends on a seller's exact date, distance or reserve: storage uses the public window (F7, F8), carbon uses fixed distances (F2), and the agent never states a limit (F9). No seller-facing figure depends on the buyer's need-by date, storage or maximum.
3. The offer carries the delivery hub, because the seller prices the inbound leg against it. Confirmation needs both approvals and a simulated commitment step, "Deposit held (simulated)". Then the rest is exchanged: organisation names, one contact each, and the handover date. The building's name, address, tenants and other programme dates are not exchanged. Provenance on the buyer's side reads "Held by the platform, withheld by seller".
4. Each side sees its own half of the deal (02 section 4, rule 15). The buyer never sees the inbound leg, its cost, or anything computed from it. The seller never sees the need-by date, storage months or the buyer's total. The buyer never sees the inbound leg.
5. The storage hub hides the origin. The buyer collects from the hub and never learns the source address.
6. Direct navigation to a lot that the current project cannot see shows "Not available".
7. Operator screens label deals by public ID and do not display building names, addresses or tenants. The operator is a trusted party and can still derive prices and distances from the ledger. The About screen says so.
8. The concept wants to sell market data, including building vacancy and future pipeline signals, and also wants pipelines kept private. This prototype does not resolve that tension. It builds no vacancy or pipeline insight, and lists the question for the founder.

## 4. Privacy tests (P1 to P9)

Definitions:

- `privateStrings(lot)`, for a Tiverne House lot: the building name; "Garnet Row"; the postcode district; the local authority, unless the building's location level discloses it; the owner organisation; both tenants; the owner tag; the names of Tom Ashby, Dana Kowalski and Tarnbrook Deconstruction; and the lot's exact available-from date and the building's three programme dates, each in four formats (`15 March 2027`, `15 Mar 2027`, `2027-03-15`, `15/03/2027`). For another seller's lot: its tag and its exact date in the same formats.
- `privateStrings(project)`: project name, developer, team organisation names, the names of the team's personas, site postcode district, local authority, and the exact need-by date in the four formats.
- After a deal is confirmed, the strings that were exchanged (rule 3 above) leave the forbidden set for the two parties to that deal.
- Internal IDs have the forms `bld_` and `itm_` plus six characters. No buyer-side screen or link may contain one.
- Rendered checks read the text content and link targets of the `<main>` region of each route, ignoring `data:` and `blob:` URLs. The role switcher and demo script panel are presenter controls outside `<main>` and are excluded.

Tests:

- **P1.** The public projection of every seeded lot has exactly the 21 keys and, serialised, contains none of that lot's private strings.
- **P2. Twin test.** Build the twin seed (06 section A10). For the original and the twin these must be identical: every public projection, the matcher result for the Merrowgate Wharf schedule, the buyer's package estimate for the TH-01 allocation at the guide price and at the agreed price, and the buyer-visible negotiation log for the demo mandates. After confirmation the two differ only where they should: the buyer's storage is 13 months in the original and 15 in the twin.
- **P3.** With a buyer persona active, the rendered content of Browse, a listing, the matcher, the reuse plan, the negotiation thread, the package panel and Deals contains none of the private strings of any lot and no internal ID.
- **P4.** With a seller persona active and before confirmation, Offers and deals contains none of the private strings of the buyer's project.
- **P5a.** A project that the owner has not approved gets no `matched_only` lot from the matcher, whatever schedule it is given (domain level).
- **P5b.** The same project sees "Not available" on direct navigation to such a lot (rendered).
- **P6.** The project compliance workbook contains none of the lot private strings in any cell, sheet name, document property or file name. Durnley House screens and its workbook contain none of the Merrowgate Wharf project strings, and Merrowgate Wharf compliance screens and its workbook contain neither "Durnley House" nor "Pellory Estates". The viewer's own name and organisation are exempt.
- **P7.** No route contains an owner tag, a building name or a project name. Buyer-side routes carry public IDs only.
- **P8.** A negotiation that ends without agreement displays no figure equal to either side's limit unless that figure was an offer actually made (07 examples N2, N6, N8).
- **P9.** The F10 examples in 07 section B10 pass.

## 5. Screens

General rules: every screen has one empty state ("Nothing here yet." plus one line saying what will put content there) and one error state ("Something went wrong. Reset demo data to start again." with the error text in a details element). Explanatory text is limited to the fixed labels in section 6 and short field hints. Buttons named in `02-DEMO-PATH.md` use exactly those names.

### 5.1 Shell

Top bar: product name, persona switcher (name, organisation, role), Demo script, Assumptions, About, Reset demo data, and a quiet permanent tag "Prototype, sample data". Left rail: navigation for the current workspace. Footer: "Demo date: 7 October 2026". All workspace content sits in `<main>`.

Landing: not a marketing page. The product name, one sentence saying what it is, the persona cards with what each will see, and a button to open the demo script.

Demo script panel: the twelve steps with their title and one line each. Each has "Go" and "Set up to here" (02 section 5).

### 5.2 Supply workspace (Tom, Dana)

- **Inventory:** table of items with tag, drawing thumbnail, title, quantity, mass, condition, recoverability, test status, avoided carbon, guide price and visibility. Item detail shows the full private record: specification, location, notes, photos, captured by and date, and the lot (public ID, visibility, exact available-from date, ask and reserve once set, and the owner's holding view from F8). Tom only: the suggested mandate from F5.
- **Capture** (phone first): one column, large touch targets. Description field with Assist and its evidence, photo input using the device camera (`accept="image/*" capture="environment"`), family choice, fields for the family, condition and recoverability choices, private location and notes. Saving shows the tag, mass, avoided carbon and guide price. The stub "Recognise materials from a photo" lives here.
- **Priority** (Tom): the ranked list from F6 with score bars, the route, the reason for a recycle route, the recoverable net value and the share held by the top three. "How this is calculated" on each row.
- **Listings and privacy** (Tom): the building's two disclosure settings with "Reset to defaults", which restores region, quarter and all photos private and leaves the chosen visibility, ask and reserve alone; the lots table with visibility, public ID, ask and reserve; for the selected lot, the private record beside the market preview; the selected lot's photos, each with a public tick; the owner's holding view from F8; the publish control (visibility choice, ask, reserve, Publish); the disclosure score for the building as it would stand with the chosen visibility; and the read-only list of projects approved for private matching, shown as blind descriptions.
- **Offers and deals** (Tom): offers awaiting approval, each with the blind buyer, price, pieces and mass, delivery hub, and the seller's own figures from F8. "Approve". Confirmed deals show the seller's view: buyer organisation and contact, handover, each seller-side line, net proceeds, gain over scrap, the inbound booking and the seller's half of the custody timeline.

### 5.3 Marketplace (Priya)

- **Browse:** cards led by a to-scale drawing, with title, quantity, mass, location, availability, guide range and signal. Sorted by public ID. No filters, no map. Only `open` lots with status "Available".
- **Listing:** drawing with dimensions, specification table, quantity and mass, condition, test status, grade, era band, source type, seller type, location, availability, guide price range and signal with "How this is calculated", avoided carbon with "How this is calculated", and the line "Surveyed. Listed [month]." Steel listings add "To reserve steel, match your schedule in the project workspace." Other listings add "Reserving this lot is not part of this prototype." A matched-only lot reached from the matcher shows "Shared in confidence".

### 5.4 Project workspace (Priya)

- **Match schedule:** "Load sample schedule", which loads the file in 06 section C2 through the real CSV parser. Its columns are reference, section, length in millimetres, quantity and grade; every line takes the project's steel need-by date. The standing notice about private matching and the control to accept the confidentiality terms (simulated dialog). Results per requirement in reference order: allocations with public ID, pieces, over-specification, offcut, grade flag, storage range and "Add to reuse plan"; the reason for anything unmatched; the summary from F7; "Open market only: N of M" once the terms are accepted. The stub "Import from a BIM model (IFC or Revit)" lives here and points to the CSV import, which is real.
- **Reuse plan:** one row per plan item with status. Opening a row shows the package panel from F8: route, facility comparison (every eligible facility with its estimated total, the chosen one marked), testing toggle, storage, cost lines, total against new, saving, break-even, avoided carbon, with the estimate label until the deal is confirmed. Then the mandate fields and "Start negotiation agent", the thread, and the approval button.
- **Deals:** each deal with its status, the buyer's view from F8, the exchanged identities, provenance, "Arrange delivery" with the logistics agent's quotes and "Approve booking", and the buyer's half of the custody timeline.
### 5.5 Compliance workspace (Marcus)

- **Engagements:** Merrowgate Wharf (for Lantern Quay Developments) and Durnley House (for Pellory Estates). Data never crosses between engagements.
- **Project compliance:** bullet chart of content by value against the 20% aim, secured and with plan; the contributions table (without reuse, then points per line with reuse); avoided upfront carbon; reclaimed mass secured (the mass actually received, that is stock mass, not the baseline mass used for content by value); bill of materials by building element and layer; the reused items list; the stage checklist; the certification mapping table (06 section A8). Status label "Forecast, design stage". The policy basis line.
  - Stage checklist (three rows, each marked "to validate"): "Pre-application: draft statement with the strategic approach and initial targets". "Planning application: written statement and completed template, including the bill of materials, recycling and waste reporting and end-of-life strategy". "Post-construction: update with actual figures and supporting evidence".
- **Waste and reuse (a deconstructed building):** import with review from F13 ("Load sample bill", which loads the file in 06 section C1 through the real XLSX parser, and the stub "Read a PDF bill or archive drawing"); dashboard with diversion against the 95% target, reuse rate, one stacked horizontal bar of tonnes by destination, components reused off site, recycled on site, the potential carbon benefit with its label, hazardous waste shown separately, tonnes per m2 GIA, the stated total check and the count of rows awaiting review. Status label "Actual, from contractor's bill".
- **Exports:** section 5.8.

### 5.6 Operator workspace

- **Ledger:** the lines of each deal made in the session, labelled by public ID, then the seeded entries, "Transactions and data to date" and "Subscriptions, annual" (F12).
- **Model comparison:** for a deal confirmed in the session: agency, principal, hybrid flag and forward sale from F12, each with the capital it employs, the conflict note and the candidate labels. With no such deal: the empty state "Confirm a deal to compare models."

### 5.7 Shared

- **Assumptions:** read-only grouped tables of every parameter in 06 section A2 with value, unit, source and status. The steel base reuse ratio carries "Founder assumption, to be validated".
- **About:**
  - What the prototype is, in two sentences.
  - What is real: the calculations, the privacy projections, schedule matching, spreadsheet import and export, text parsing. What is simulated: agents, quotes, partner services, the deposit, identity exchange, the confidentiality step and client sign-off.
  - A table of each AI step in the concept and the rule that stands in for it: categorising materials (F14 and F13), ranking and suggesting what to recover (F6), dynamic pricing (F5), estimating embodied carbon (F2), negotiating (F9), arranging transport (the logistics rule), choosing stock to buy (the F12 flag), generating reports (templates and formulas).
  - Limits, stated plainly: all data sits in one browser; the role switcher and the Assumptions screen are demonstration devices; a scripted, published negotiation protocol is not a secure negotiation; "private matching only" means "not in Browse", and the confidentiality step is simulated; a full structural frame listed at region and quarter level may still be identifiable to someone who knows the local stock; a reduced quantity on a listing shows that part of a lot has sold; a seller can infer coarse demand from the signal on their own items; the operator is a trusted party; an adviser acting for both a buyer and a seller is outside the model; a real service would enforce all of this on a server.
  - The "Not covered" list from 01 section 3.
  - "Every company, person, building and address in this prototype is fictional."
  - The open questions for the founder, copied from `docs/OPEN_QUESTIONS.md` into one module that the screen reads.
- **"How this is calculated" panel:** one component, four uses: avoided carbon (F2: inputs, the five formula lines, factor sources and status, the labels in section 6), guide price (F5), package total (F8, the viewer's own side only), priority score (F6). Content by value and diversion show their method note inline instead.
- **Stubs:** each of the three opens a panel with one sentence on what the real feature would do and "Not part of this prototype."

### 5.8 Exports

Every export carries the line "Prototype output from sample data. Indicative factors. Not a compliant assessment." File names use the project or engagement name and the demo date: `merrowgate-wharf-compliance-2026-10-07.xlsx`, `durnley-house-waste-and-reuse-2026-10-07.xlsx`. Document properties: creator and title only, with the product name as creator. Write every formula with its cached result. Tests compare cells, never bytes.

**Project compliance workbook.** Buyer side: public projection data only.

| Sheet | Columns and content |
|---|---|
| Summary | Project, stage, status label, GIA, policy basis line, then by formula from the other sheets: content by value secured, without reuse, avoided carbon total, reclaimed mass. The caveat line. |
| Bill of materials | Line, Building element, Building layer, Mass (t), Intensity (kg per m2 GIA, formula), Material value (£, excluding labour), Recycled share of new material, Reused content (% by value), Recycled content (% by value, formula `(1 - reused) * share`), Reused and recycled value (£, formula). Totals row by formula. |
| Reused items | Public ID, Family, Description, Quantity, Unit, Mass (t), Condition, Test status, Source type, Region, Provenance, Deal status, Handover date, Avoided carbon A1-A4 (tCO2e) |
| Embodied carbon | Per reused item: Baseline quantity, Basis, Factor new, A1-A3 new, A4 new, Reclaimed quantity, Factor reuse, A1-A3 reuse, A4 reuse, Avoided (formula), Percent (formula). Total by formula. The labels for avoided carbon from section 6. |
| Certification mapping | The rows of 06 section A8 that belong to this workbook, each with the note from section 6 |
| Assumptions | Parameter, Value, Unit, Source, Status |

If time is short, Summary, Bill of materials and Reused items are the three sheets that must exist; record any sheet you left out.

**Waste and reuse workbook.**

| Sheet | Columns and content |
|---|---|
| Summary | Engagement, building, GIA, status label, policy basis line, totals and rates by formula, stated total check, rows awaiting review, the caveat line |
| Arisings | Row, Original description, Original code, Original quantity, Original unit, Original route, Stream, EWC code, Tonnes, Destination, Hazardous, Confidence |
| Recycling and waste reporting | Rows: Excavation waste, Demolition waste, Construction waste, Municipal waste. Columns: Overall waste (t), Tonnes per m2 GIA, Reused on site (%), Reused off site (%), Recycled on site (%), Recycled off site (%), To landfill (%), To other management (%). Only the demolition row is filled: tonnes by destination as values in a helper block, the total and every percentage by formula. The other rows read "Not in this bill". |
| Reuse carbon | Per row reused off site: Row, Stream, Family, Tonnes, Quantity, Basis, Factor new, Factor reuse, Potential benefit (formula). Total by formula. The module D label from section 6. |
| Certification mapping | The rows of 06 section A8 that belong to this workbook |
| Assumptions | As above |

If time is short, Summary, Arisings and Recycling and waste reporting are the three sheets that must exist; record any sheet you left out.

**Print layout.** An A4 print stylesheet on the Merrowgate Wharf compliance screen, not a separate screen: status label, the content by value chart and contributions, avoided carbon, the reused items table, the bill of materials by layer, method notes, the policy basis line and the caveat line.

## 6. Fixed labels

These strings are fixed. Keep them in one module. The required-labels test checks that each appears where stated.

| ID | Text | Where |
|---|---|---|
| L1 | Prototype, sample data | Top bar, always |
| L2 | Rule-based in this prototype. Stands in for an AI step. | Capture Assist, Priority, guide price panel, schedule matcher, bill import, model comparison flag |
| L3 | Simulated agent: scripted rules, no AI model | Negotiation thread, logistics agent |
| L4 | Indicative match. Subject to the structural engineer's check to SCI P427. | Matcher results |
| L5 | Estimate. Storage is costed at the longest case until the handover date is confirmed. | Package panel before confirmation |
| L6 | Some lots are offered for private matching only. Accept the confidentiality terms to include lots from owners who have approved this project. | Match schedule, always the same text whatever the schedule, until the terms are accepted |
| L7 | Confidentiality terms (simulated). Lots shared for private matching may be used only for this project's design and procurement, and must not be passed on. | The terms dialog |
| L8 | Sample data only. Do not enter real buildings or photos. | Capture |
| L9 | Illustrative and rule-based. It does not measure how many real buildings fit this description. | Disclosure score |
| L10 | Market signal, updated monthly | Wherever the signal is shown |
| L11 | Comparison with buying new, modules A1-A4, simplified method. Not a whole life carbon assessment. | Avoided carbon panel, project compliance, Embodied carbon sheet |
| L12 | A project assessment would use the factor for the steel the project would otherwise buy. | Avoided carbon panel for steel |
| L13 | Potential carbon benefit of reuse. Reported outside the building's life cycle (module D). Do not add it to a receiving project's figures. | Waste dashboard, Reuse carbon sheet |
| L14 | No avoided carbon is claimed for unused surplus. | Listings of unused surplus |
| L15 | Material values exclude labour. A reused item counts at the price of the same quantity of new product. | Content by value |
| L16 | Policy basis: London Plan 2021 and the 2022 guidance. A draft new plan is in consultation. | Compliance screens, both Summary sheets, report |
| L17 | Forecast, design stage | Project compliance |
| L18 | Actual, from contractor's bill | Waste dashboard |
| L19 | Input to the evidence for this requirement. Confirm with the assessor and the current scheme manual. | Each certification mapping row |
| L20 | Prototype output from sample data. Indicative factors. Not a compliant assessment. | Every export and the report |
| L21 | Approve for Lantern Quay Developments (client sign-off simulated) | Buyer approval button |
| L22 | Deposit held (simulated) | Deal confirmation, both sides |
| L23 | Held by the platform, withheld by seller | Provenance, buyer side and Reused items sheet |
| L24 | Seller not simulated in this prototype | Plan items for lots of other sellers |
| L25 | Reserving this lot is not part of this prototype. | Listings of families other than steel |
| L26 | Not available | A lot the current project cannot see |
| L27 | Shared in confidence | Matched-only lots in buyer views |
| L28 | Private | The mark on private fields in owner views |
| L29 | As principal the platform would trade against users whose limits and programmes it holds. | Model comparison |
| L30 | Candidate for discussion, not from the founder's notes | Forward sale |
| L31 | Candidate, not from the founder's notes | Transport margin line |
| L32 | Founder assumption, to be validated | Steel base reuse ratio on Assumptions |
| L33 | Not part of this prototype. | Each of the three stub panels |
| L34 | Publishing at this disclosure level lets an outsider narrow down the building. Review what is listed below. | The disclosure score in the Medium band |
