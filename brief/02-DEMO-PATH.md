# Build brief, file 2 of 7: people and the demo path

The twelve steps in section 3 are the acceptance path (rule R1). Every value in the "Must show" column is asserted twice: at store level by the replay test (Phase 2) and in the browser by the end-to-end test (Phases 3 to 7). The values come from the engines in `03-ENGINES.md` applied to the seed in `06-DATA.md`. Do not type any of them into implementation code.

## 1. People and roles

Two tiers of user:

- **Active** users transact in materials. They list, buy or sell: developers and asset owners, deconstruction contractors, contractors, waste management firms, manufacturers with surplus stock, property managers.
- **Passive** users do not trade for themselves. They need the platform's data and tools to deliver their own professional service: architects and designers (narrative, specifications, CAD support), structural and services engineers, sustainability consultants (compliance).

In this prototype both tiers subscribe, and active users also pay commission and service fees through transactions. Whether passive users pay is an open question for the founder.

The role switcher offers five personas. Switching role changes the lens on one shared world, held in one browser.

| Persona | Organisation | Role | Tier | Workspace and tabs |
|---|---|---|---|---|
| Tom Ashby | Ostlea Estates (asset owner) | Asset manager | Active | Supply, Tiverne House: Inventory, Capture, Priority, Listings and privacy, Offers and deals |
| Dana Kowalski | Tarnbrook Deconstruction (deconstruction contractor, appointed by Ostlea Estates) | Site surveyor | Active | Supply, Tiverne House: Inventory, Capture |
| Priya Nair | Studio Oriel (architect to Lantern Quay Developments) | Project architect | Passive, acting for an active client | Marketplace: Browse, Listing. Project, Merrowgate Wharf: Match schedule, Reuse plan, Deals |
| Marcus Lindqvist | Halewick Sustainability (consultant) | Sustainability consultant | Passive | Compliance: Merrowgate Wharf, Durnley House |
| Platform operator | Tallyard | Operations | Platform | Operator: Ledger, Model comparison |

Everyone can open Demo script, Assumptions and About.

Priya's commercial approvals are made on behalf of her client, the developer, and use the label "Approve for Lantern Quay Developments (client sign-off simulated)". The project's structural engineer is not a persona: the engineer supplies the indicative Stage 2 frame schedule that Priya loads in step 5. Other supplier types appear only as sellers of seeded listings: a waste management firm, a manufacturer with unused surplus, a contractor with site surplus, a property manager stripping out a fit-out.

## 2. The world at the start

Full data is in `06-DATA.md`. In outline:

- **Ostlea Estates** owns **Tiverne House**, a 1984 steel-framed office in the City of London that is still standing and due to be dismantled in early 2027. A first survey tranche of eleven items (TH-01 to TH-11) is in its inventory. Five steel lots (TH-02 to TH-06) are already offered for private matching only. TH-01 and the five non-steel items are private.
- **Lantern Quay Developments** is developing **Merrowgate Wharf** in Newham, a ten-storey commercial building at RIBA Stage 2. Steel is needed on site from 3 April 2028. Two reclaimed items are already secured from other sellers: stone cladding and raised access floor panels. Ostlea Estates has approved this project for private matching.
- **Pellory Estates** owned **Durnley House**, deconstructed in the first half of 2026. Its waste bill has not yet been imported.
- Sixteen open listings from other sellers are on the marketplace.
- The demo date is fixed at 7 October 2026.

## 3. The twelve steps (acceptance table)

Buyer-side screens show public IDs, never owner tags. Seeded public IDs used below: TH-01 is `L-9F4CQQ`, TH-02 `L-WPX5A6`, TH-03 `L-MNY55K`, TH-06 `L-FQK92P`, OS-11 `L-NHZ32R`, OS-12 `L-6DN4K3`.

### Step 1. Capture on site

- **Who and where:** Dana, at 390 px wide. Supply, Tiverne House, Capture.
- **Does:** types `30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room`, adds the sample photo, chooses condition A, saves.
- **Must show:** Assist fills family `Structural steel section`, section `UC 203x203x46`, pieces `30`, length `3.2 m`, recoverability `A`, private location `roof plant room`. After saving: tag `TH-12`, mass `4.43 t`, avoided carbon `7.5 tCO2e`, guide price `£670 per tonne`, one photo marked `Private`. The Assist label from R4 is visible.

### Step 2. Decide what to recover

- **Who and where:** Tom. Tiverne House, Priority.
- **Does:** reads the ranking and opens "How this is calculated" on the first row.
- **Must show:** twelve items ranked. First row `TH-02` with score `68.7`. Last row `TH-12` with score `14.5`. `TH-09` and `TH-10` carry `Recycle rather than recover`. `Recoverable net value £202,966.91`. `The top three hold 54.2%`. The panel for TH-02 shows the four parts of the score: net value `22.7`, carbon `30.0`, demand `10.0`, ease `6.0`.

### Step 3. Publish without leaking

- **Who and where:** Tom. Tiverne House, Listings and privacy.
- **Does:** selects TH-01 and chooses `Open marketplace`. Watches the disclosure score as he changes the building's settings: location to `Local authority`, then timing to `Month`, then ticks the sample photo as public. Presses `Reset to defaults`. Leaves the ask at £800 and the reserve at £730 and presses `Publish`.
- **Must show:** five lots listed as `Private matching only`. With defaults the score is `10` and `Low`. Local authority: `25`, `Medium`, with the list of what could be inferred. Month as well: `35`, `Medium`. Public photo as well: `45`, `High`, the Publish button disabled and the line `Publishing is blocked at this disclosure level.` After reset: `10`, `Low`. The market preview sits beside the private record and shows `Central London` and `Available from Q1 2027`. After publishing, TH-01 shows `Open marketplace` and public ID `L-9F4CQQ`. The private panel shows `Ask £800 per tonne`, `Reserve £730 per tonne` and `Holding unsold stock would use up the gain over scrap in about 75.9 months`.

### Step 4. Find it

- **Who and where:** Priya. Marketplace, Browse, then the listing `L-9F4CQQ`.
- **Must show:** a to-scale section drawing. `UB 457x191x67, 7.5 m`. `48 pieces`. `24.16 t`. Grade `To be confirmed by testing`. `Untested`. `Central London`. `Available from Q1 2027`. `£715 to £825 per tonne`. `Market signal: High demand`. Avoided carbon `41.0 tCO2e`. `Surveyed. Listed October 2026.` Nothing in the main content of the page or in the URL contains any private string of the lot (04 section 4): not the building, the address, the local authority, the owner, the surveyor, a tenant, the tag `TH-01`, or the exact date in any format.

### Step 5. Match a schedule

- **Who and where:** Priya. Merrowgate Wharf, Match schedule.
- **Does:** presses `Load sample schedule`, then accepts the confidentiality terms, then presses `Add to reuse plan` on the `L-9F4CQQ` allocation.
- **Must show:** `6 lines, 102 members`. Before the terms are accepted: `60 of 102 members matched (58.8%)` and the standing notice about private matching (04 section 6). After: `96 of 102 members matched (94.1%)` and `Open market only: 60 of 102`. Results in reference order: R1 `L-9F4CQQ` 48 pieces and `L-NHZ32R` 4 pieces; R2 `L-WPX5A6` 12; R3 `L-MNY55K` 10; R4 `L-6DN4K3` 8; R5 unmatched with `No stock long enough (longest visible in this serial size is 9.5 m)`; R6 `L-FQK92P` 14. The `L-9F4CQQ` row shows `Storage 13 to 16 months` and `Grade to be confirmed by testing`. The matcher label from R4 and the SCI P427 line are visible. The reuse plan now has one item.

### Step 6. Bridge the gap

- **Who and where:** Priya. Reuse plan, the `L-9F4CQQ` item (48 pieces).
- **Must show:** route `Via storage hub`. Facility `Open yard, Tilbury` marked `Lowest estimated total`. Testing on. `Storage 13 to 16 months` with label L5. Lines: material `£18,600.12`, testing `£1,800.00`, storage `£1,352.74`, handling out `£217.40`, delivery to site `£235.80`. `Estimated total £22,206.06`. `New steel to the same schedule £23,189.76`. `Saving £983.70 (4.2%)`. `Break-even storage 27.6 months`. Avoided carbon `39.3 tCO2e`. Facility comparison: Tilbury `£22,206.06`, Barking `£22,779.36`, Park Royal `£26,324.13`. The estimate label is visible.

### Step 7. Negotiate through an agent

- **Who and where:** Priya. The same plan item.
- **Does:** keeps the suggested mandate (open £700, maximum £780 per tonne), presses `Start negotiation agent`, then presses `Approve for Lantern Quay Developments (client sign-off simulated)`.
- **Must show:** the thread, in order: `Ask £800`, `Bid £700`, `Ask £760`, `Bid £725`, `Ask £745`, `Bid £735`, `Agreed in principle at £740 per tonne`. The simulated-agent label. Afterwards: `Estimated total £21,481.38`, `Saving £1,708.38 (7.4%)`, status `Awaiting seller approval`. The seller's reserve appears nowhere.

### Step 8. Seller approves

- **Who and where:** Tom. Tiverne House, Offers and deals. Then Priya. Merrowgate Wharf, Deals.
- **Does:** Tom presses `Approve`.
- **Must show, Tom before approving:** an offer from `Design team, commercial project, Inner London East, needed by Q2 2028` with no named buyer. `£740 per tonne for 48 pieces (24.16 t)`. `Deliver to: Open yard, Tilbury`. `Net proceeds £15,979.60`. `Gain over scrap £8,491.24`.
- **Must show, Tom after approving:** `Deposit held (simulated)`. Status `Confirmed`. Buyer `Lantern Quay Developments`, contact `Priya Nair, Studio Oriel`. `Handover 15 March 2027 at Open yard, Tilbury`. `Inbound haulage £248.40, booked`. No need-by date and no storage months.
- **Must show, Priya:** status `Confirmed`. Seller `Ostlea Estates`, contact `Tom Ashby`. `Handover 15 March 2027`. `Storage 13 months`. `Total £21,227.74`. `Saving £1,962.02 (8.5%)`. `Break-even storage 36.2 months`. Provenance `Held by the platform, withheld by seller`. The building is not named. Opening the listing `L-9F4CQQ` directly shows `No longer available`, and it has left Browse.

### Step 9. Logistics

- **Who and where:** Priya. Deals, the confirmed deal.
- **Does:** presses `Arrange delivery`, then `Approve booking`.
- **Must show:** three quotes for the leg from the hub to site: `Haulier A £235.80, 3 days' notice`, `Haulier C £260.10, 5 days' notice`, `Haulier B £264.25, 2 days' notice`. Haulier A marked `Cheapest that meets the dates`. After approval: `Delivery booked for 3 April 2028`. Buyer's custody timeline: `Agreed 7 October 2026` (done), `Handover at hub 15 March 2027`, `Tested 29 March 2027`, `Delivered 3 April 2028` (planned). The simulated-agent label. The inbound leg and its cost appear nowhere on Priya's screens.

### Step 10. Prove it

- **Who and where:** Marcus. Compliance, Merrowgate Wharf.
- **Does:** reads the dashboard, exports the compliance workbook, then opens the browser's print preview.
- **Must show:** `Reused and recycled content by value: 20.06% secured` against `Aim: at least 20%`. `With plan 20.06%`. Contributions: `Without reuse 17.62%`, stone cladding `+2.00`, raised access floor `+0.29`, structural steel `+0.15`. `Upfront carbon avoided against buying new (A1-A4): 87.1 tCO2e`. `Reclaimed material secured: 126.96 t` (stock mass: 57.20 plus 45.60 plus 24.16). Status label `Forecast, design stage`. The workbook downloads. The screen prints to one A4 page set with no clipped table. (On seed data alone, before any step is run, the dashboard shows `19.91% secured`, `With plan 19.91%`, `47.8 tCO2e` and `102.80 t`. At the end of step 6 it shows `19.91% secured` and `With plan 20.06%`. The replay test asserts all three states.)

### Step 11. Ingest a demolition bill

- **Who and where:** Marcus. Compliance, Durnley House, Waste and reuse.
- **Does:** presses `Load sample bill`. In the review table sets row 20 to stream `Mixed construction and demolition waste` and destination `Landfill`. Exports the waste and reuse workbook.
- **Must show after import:** `20 rows read`. `2 title rows and 1 total row skipped`. `14 high confidence, 5 medium, 1 needs review`. `Stated total 11,369.2 t matches the rows`. `Diversion from landfill 97.5%` with the notice `1 row (6.0 t) is not counted until it is reviewed`.
- **Must show after the row is set:** `Diversion from landfill 97.4%` against `Aim: at least 95%`. `Reuse rate 3.1%`. `Components reused off site 351.0 t`. `Recycled on site 1,200.0 t`. `Potential carbon benefit of reuse 461.4 tCO2e`. `Hazardous waste 14.2 t, reported separately`. `0.72 t per m2 GIA`. Status label `Actual, from contractor's bill`. The workbook downloads.

### Step 12. Run the platform

- **Who and where:** Platform operator. Ledger, then Model comparison.
- **Must show, ledger:** the `L-9F4CQQ` deal with `Commission £1,430.04`, `Storage brokerage £153.39`, `Testing referral £180.00`, `Transport margin £24.21`, `Deal total £1,787.64`. `Transactions and data to date £16,192.44`. `Subscriptions, annual £70,800.00`.
- **Must show, model comparison for that deal:** `Agency £1,787.64, no capital employed`. `Principal: margin £3,785.28 on capital of £16,868.10 (22.4%)`. `Candidate to buy`. `Forward sale £1,966.39`. The conflict note and the candidate labels from 04 section 6.

## 4. State rules along the path

These rules remove guesswork about what happens between steps. They apply to every lot and project, not only to the ones in the script.

**Items and lots**

1. Every inventory item has exactly one lot covering its whole quantity. A new item gets the next tag for its building (`TH-12` after `TH-11`), test status `untested`, grade `unknown` for steel, and a lot with visibility `private`, an exact available-from date equal to the building's dismantling start date, and the next public ID from the pool in 06. Dates of lots are read-only in this prototype.
2. Visibility is `private`, `matched_only` or `open`. Publishing sets `matched_only` (the default choice for a building that is still standing) or `open`. Ask and reserve are set when publishing: prefilled with the F5 suggestion, editable, in whole ticks, reserve not above ask.
3. A lot's public status is `Available` until every piece has been sold in confirmed deals, then `No longer available`. Nothing public changes while an offer is in progress.

**Matching and the reuse plan**

4. Match results are stored on the project when the matcher runs, and replaced when it runs again. Results are displayed in requirement reference order.
5. Before the team accepts the confidentiality terms, the matcher sees `open` lots only. After acceptance it also sees `matched_only` lots whose owner has approved the project. Acceptance is per project and is remembered. Accepting the terms re-runs the matcher at once on the stored schedule and replaces the stored result, keeping the open-market-only count from the first run so both can be shown.
6. "Add to reuse plan" on an allocation creates one plan item: the lot, the pieces, the requirement it serves, and a package (route via hub, facility, testing). Adding the same allocation twice does nothing. Defaults: the eligible facility with the lowest estimated total (ties: nearer to the project, then facility ID); for a lot already held in a hub, that hub and no choice; testing on unless the lot is tested or certified.
7. A plan item is `planned`, `agreed_in_principle`, `awaiting_seller`, `confirmed` or `no_agreement`. A plan item for a lot not owned by Ostlea Estates shows its estimate and the line "Seller not simulated in this prototype" in place of the negotiation controls.
8. A saving below zero is shown as "Costs £X more than new (Y%)", never as a negative saving. Each plan item is costed on its own, with its own vehicle. There is no plan total.

**Negotiation and deals**

9. One negotiation run per plan item. The buyer's mandate is prefilled from F5 and editable in whole ticks, open not above maximum. If the run ends without agreement the item becomes `no_agreement` and shows "No agreement. Another round needs the seller's approval, which is not part of this prototype."
10. Agreement makes the item `agreed_in_principle`. The buyer's approval makes it `awaiting_seller` and creates the offer on the seller's side. The seller's approval records "Deposit held (simulated)" and makes the deal `confirmed`. There is no decline.
11. On confirmation: identities are exchanged (organisation names, one contact each, the handover date and hub); the lot's pieces on offer fall by the pieces sold; the buyer's storage is recosted from the exact handover date; the seller's inbound leg is booked at the standard haulage rate; ledger lines are created; the project's secured quantities and avoided carbon update.
12. The handover date is the lot's exact available-from date. For a lot already in stock it is the deal date.
13. If the matcher is run again after a deal, lots that are no longer available are skipped and each requirement's count is reduced by the members already secured through confirmed deals (07 example B7 has the expected result).

**Logistics**

14. The logistics agent quotes each haulier for the leg from the hub to the project at `loads * (fixed + perKm * km)`. A haulier meets the dates if the demo date plus its notice days is on or before the delivery date. The delivery date is the requirement's need-by date. The agent proposes the cheapest haulier that meets the dates (ties: fewer notice days, then name). The booked price replaces the delivery estimate in the buyer's lines.

**Custody timeline**

15. Buyer's half: agreed (deal date), handover at hub (handover date), tested (14 days after handover, only if testing was selected), delivered (delivery date). An event is "done" if its date is on or before the demo date, otherwise "planned". The seller's half of the timeline is not built in this run.

## 5. The demo replay

`src/store/demo.ts` exports `runDemoStep(n)` for n = 1 to 12. Each call performs that step's "Does" actions through the same store actions the screens use. Step 1 passes the seeded sample photo through the same canvas pipeline a camera photo would take; the browser test instead uploads `e2e/fixtures/sample-photo.jpg` through the file input. `runDemoSteps(1, n)` runs them in order on a fresh seed.

- The replay test in Phase 2 calls the steps in order and asserts every "Must show" value from the store's selectors, formatted by the same formatting functions the screens use.
- "Set up to here" in the demo script panel resets to the seed, runs steps 1 to n minus 1, switches persona and opens the starting screen of step n.
- "Go" only switches persona and opens the starting screen of the step. It changes no data.
