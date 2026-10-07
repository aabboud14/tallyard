# Decisions

One line per decision where the brief was silent or an instruction had to be reconciled.

- 2026-10-04. The brief files were moved from the repository root into `brief/` and `docs/OPEN_QUESTIONS.md`, as `START-HERE.md` describes, so that `CLAUDE.md` paths hold.
- 2026-10-04. The user asked for the build to be pushed to the working branch and deployed to Vercel. That overrides rule 6 of `01-BRIEF.md` section 0 and item 12 of the definition of done for this run; the deviation is recorded in `docs/EVIDENCE.md`.
- 2026-10-04. `@types/node` is pinned at 22.20.5 (the Node 22 line) rather than the template's 24 line, to match the Node 22 runtime here.
- 2026-10-04. `fake-indexeddb` and `jsdom` are added as dev dependencies for unit tests of the photo store and screens; neither ships in the app.
- 2026-10-04. Reference rows for the transport margin and matching fee carry the status `candidate`, as 06 section A2 writes them, in addition to the three statuses 03 section 1 names. The Assumptions screen shows the word as given in 06.
- 2026-10-04. The market signal for a lot that is not in the snapshot adds the item's full captured quantity to supply, not only what is still on offer; the two agree for every seeded lot and for the demo path.
- 2026-10-04. Ledger lines render as statement rows (label and amount in one element) so each line reads as one phrase; L31 sits beside the transport margin.
- 2026-10-04. The About limits list has ten items, as 04 section 5.7 lists, including the trusted-operator line from section 3 rule 7.
- 2026-10-04. The contributions table's "Without reuse" row spans both columns; family lines follow in bill of materials order, then a Secured row.
- 2026-10-04. Cached results of the workbooks' SUM, intensity and share formulas are summed in the export module from the selectors' rows; every headline figure comes from the selectors.
- 2026-10-04. ExcelJS writes a default lastModifiedBy property; only creator and title are set by the app.
- 2026-10-04. The Embodied carbon sheet adds a Public ID column so each row traces to the Reused items sheet.
- 2026-10-04. The waste Summary carries the counted total, reused off site, recycled on site, landfill, intensity, hazardous and rows awaiting review as formulas over the other sheets.
- 2026-10-04. The content by value chart's scale is fixed at 30% so the 20% aim sits right of centre; the waste export button is disabled until a bill is loaded.
- 2026-10-04. The sample file builder only rebuilds when an output is missing (pass --force), because a fresh zip carries new timestamps and would churn git on every build.
- 2026-10-06. `vercel.json` and an `engines.node` of 22.x pin the Vercel build to the toolchain the project was built with. They do not change the app.
- 2026-10-07. Version 1.0 seed: Harrowden Court's strip-out start is 2027-06-14 and its clear-by date 2027-09-24, not 2027-06-07 and 2027-09-30, so that no lot private date equals Ferrymoor Yard's start date or the public Q3 2027 window end (either would fail P1 or P3 on correct output). Dismantling start 2027-07-05 is unchanged.
- 2026-10-07. Harrowden Court's address is 31 Brindle Road, London W13 (Ealing, Outer London West), with no tenants; the address is added to the allowed places. Its items are HC-01 to HC-03 with item IDs itm_v3gk7p, itm_f8nr2j, itm_u6dy4b and public IDs L-K3TB7D, L-P6HV2Q, L-X4NJ8G, outside both ID pools.
- 2026-10-07. Sallow Court (NW1, Camden) and Ferrymoor Yard (E9, Hackney) take both key dates equal to their start date, blind lines "Design team, hotel project" and "Design team, residential project", and placeholder hub distances. Halewick Sustainability is the consultant on all three seeded projects, so Marcus's project list holds three projects, Merrowgate Wharf among them.
- 2026-10-07. Merrowgate Wharf's teamPersonaIds are Isla, Priya, Marcus. At confirmation the buyer contact is the client's persona (looked up by clientOrgId, never teamPersonaIds[0]); the replay's step 8 expectation changes from "Priya Nair, Studio Oriel" to "Isla Brennan, Lantern Quay Developments" (brief 09 section 13.2). No other replay value changes.
- 2026-10-07. lotPrivateStrings adds the item's expected availability date in the four date formats (not the month name, which is a substring of public quarter windows); projectPrivateStrings adds the client and architect organisations and the start date. Both lists are de-duplicated.
- 2026-10-07. src/domain/access.ts grants by organisation, not by role: buildings to the owner and the appointed surveyor, projects to the architect, client and consultant organisations, engagements to the consultant and the owner. The operator gets none. clientsFor groups the surveyor's buildings by owning client for the rail. roleOf throws on an unknown organisation type.
- 2026-10-07. captureItem takes an optional expectedAvailableFrom, defaulting to the building's dismantling start, and the new lot's availableFrom copies it, so step 1 still gives 25 January 2027.
- 2026-10-07. The persist version goes to 2 and every older stored state is replaced by a fresh seed; the storage prefix stays tallyard-v05.
- 2026-10-07. Removed the contractor scaffold: Wrenlow Build, Ruth Adeyemi, the bid pack and design-team summary placeholder screens and routes, opportunity.ts and bidPack.ts. Marcus loses the two Tiverne House tabs; Isla gets Match schedule, Reuse plan and Deals on the existing routes until the shell is rebuilt.
- 2026-10-07. The twin seed also renames Harrowden Court and its owner, renames Isla, and moves every expected availability date and every project start date; the public projections stay identical.
- 2026-10-07. Sustainability band thresholds are 0.9 and 0.8 of the new product's carbon (brief 09 section 13.7), not the 0.8 and 0.5 of section 5.5; they live in `V1_ASSUMPTIONS` and show on the Assumptions screen as placeholders with the region hub distances.
- 2026-10-07. `timelineFit` takes `today` and `tightDays` rather than an Assumptions object, and `decisionTreeRoute` takes the family first, then the priority route, so both stay pure and easy to test.
- 2026-10-07. A sold listing's carbon share is 0 over 0 (null once stored); the band reads Not claimed and the avoided carbon text leaves the share out. The `PublicCarbon` type is unchanged.
- 2026-10-07. The listing text helpers (quantity, availability, price range, spec fields) moved from `ListingView.tsx` to `src/domain/engines/specSheet.ts` so the marketplace, wish list and exports share one wording.
- 2026-10-07. Until the folder shell lands, the listing screen treats Isla Brennan, like Priya, as acting for Merrowgate Wharf, so terms accepted for the project show its shared lots to the client too. The end-to-end steps 5 to 7 and 9 and the matcher part of the labels test now run as Isla.
