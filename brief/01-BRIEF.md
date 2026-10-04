# Build brief, file 1 of 7: what to build and how to work

Product: a marketplace for salvaged construction materials, prototype v0.5.
Working product name: **Tallyard** (a placeholder, held in one constant so it can be renamed in seconds).

## 0. Read this first

1. You are building a working, clickable prototype web app in this folder. The specification is the set of files in `brief/`. This file is the entry point and holds the rules, the scope, the way of working and the definition of done.
2. The other files:

| File | Holds | Read it |
|---|---|---|
| `02-DEMO-PATH.md` | People, the twelve demo steps as an acceptance table, state rules along the path | Phase 0, then Phases 2 and 5 to 7 |
| `03-ENGINES.md` | Domain primer, data model, calculation engines F1 to F14 | Phase 0, then Phases 1 and 2 |
| `04-PRIVACY-AND-SCREENS.md` | Privacy model and its tests, every screen, exports, fixed labels | Phase 0, then Phases 1 and 3 to 7 |
| `05-DESIGN-AND-TECH.md` | Design direction, technology, scripts, test tooling | Phase 0, then Phase 3 |
| `06-DATA.md` | Reference data, seed world, sample files | Phase 0, then Phases 1 and 2 |
| `07-EXAMPLES.md` | Worked examples. These are your tests | Phase 0, then Phases 1 and 2 |
| `08-TIER2.md` | Optional second run | Do not read until Tier 1 is finished and you are asked |

3. Each file fits in one read. If a read comes back truncated, keep reading from where it stopped until you reach the last line. In Phase 0 read files 01 to 07 once, in order. At the start of every later phase re-read the files listed for that phase in section 5. Do not work from memory of the brief.
4. `CLAUDE.md` in the project root is already written. It restates the rules that must survive a context reset. Keep it. Add to it, never remove from it.
5. Work without stopping to ask questions. Where the brief is silent, choose the simplest option that fits it, add one line to `docs/DECISIONS.md`, and carry on. Stop only if `npm install` cannot reach the registry, or if you would need credentials, a payment, or to change anything outside this folder. Installing packages and browser binaries into the usual user caches is allowed.
6. Do not deploy, publish, push to a remote, or send anything anywhere. Local git commits only.
7. Order of precedence when instructions conflict: section 2 of this file (rules), section 7 (definition of done), `07-EXAMPLES.md`, `06-DATA.md`, then everything else. Where a rule in section 2 appears to forbid something a later file requires, the later file wins and you add a line to `docs/DECISIONS.md`. A worked example and a formula never truly conflict: the examples were recomputed independently from the formulas, so where formula wording is ambiguous, the example shows the intended reading.

## 1. Context

### 1.1 The concept

A marketplace for salvaged construction materials, with the data and tools around it for reuse planning and sustainability reporting. It connects supply and demand for materials across the life of buildings:

- An asset owner surveys a building that is due to come down and lists what can be recovered.
- A design team working for a different developer finds those materials early in design, designs around their real dimensions, and reserves them.
- A sustainability consultant uses the same data from project inception through to certification, instead of retyping demolition bills into spreadsheets.
- Storage, testing and transport bridge the gap between the two programmes.

Five things make the concept specific. Build with them in mind:

1. **Structure and facade first.** In the founder's view, existing UK reuse platforms concentrate on fit-out items such as furniture and loose equipment. This product leads with the high-carbon parts of a building: steel frames, columns and beams, and facade elements. Fit-out is present but secondary.
2. **London first.** London planning policy already pushes developers towards reuse and requires them to report on it. According to the founder, similar rules apply in other UK cities and some European markets, and material cost and availability add a commercial reason. The reporting is done by hand in spreadsheets today.
3. **The timing gap.** The deconstruction programme of one building rarely lines up with the construction programme of another. Materials need somewhere to wait, and that costs money. Supply assessment, deconstruction timing, matching, and the cost and benefit of storage are the core of the model.
4. **Listings leak.** A material listing can reveal more than the material: that a building is coming down, when, who owns it, how much stock there is, and what is being bid. Some developers and investors want their pipelines kept private, above all while a deal is being underwritten. Tenant details and the owner's financial information are confidential.
5. **An AI layer.** In the product as conceived, AI categorises and ranks materials, prices stock dynamically, estimates embodied carbon where the seller has none, suggests what to recover first, and reads demolition bills, while AI agents negotiate and arrange transport. Version 0.5 stands in for each of those steps with transparent fixed rules, so that it runs offline, gives the same result every time and can be tested. Every stand-in is labelled as one.

The agreed starting wedge is compliance reporting: take in deconstruction data, calculate reuse rates and carbon figures, and produce the spreadsheets and reports that consultants submit to certification bodies and planning authorities.

### 1.2 Why this prototype exists

- It will be demonstrated to the founder of the concept, a London sustainability professional who knows this domain well and will notice wrong terminology, wrong units and implausible numbers.
- It may then be shown to developers, architects and sustainability consultants to test whether the idea holds. This prototype is the test instrument.
- It should provoke decisions that are still open: which business model, how much disclosure owners will accept, and whether the automated reports are trusted.
- The founder's own process notes for the compliance workflow were not available when this brief was written. The compliance content is reconstructed from public guidance and must be presented as something to validate, not as settled practice.

### 1.3 What a good result looks like

Someone opens one HTML file, picks a role, and follows the twelve demo steps in about ten minutes. Nothing breaks. The numbers add up and can be traced. A sustainability consultant recognises the outputs. An asset owner believes the privacy controls. Nobody is misled about what is real and what is simulated.

## 2. Rules that override everything else

- **R1. The demo path works.** All twelve steps in `02-DEMO-PATH.md` work end to end on fresh seed data and show the stated values. Depth on that path beats breadth elsewhere. Steps 10 and 11 (the compliance wedge) are never cut.
- **R2. Numbers are right and traceable.** All calculation lives in pure, tested functions (`03-ENGINES.md`). The worked examples in `07-EXAMPLES.md` are the tests. The UI never does arithmetic inline: it formats values that the domain functions return. Four headline figures offer a "How this is calculated" panel showing inputs, formula and factor sources, limited to what that viewer is allowed to see.
- **R3. Privacy by construction.** Everything a counterparty can see is built from a projection of the private record (`04-PRIVACY-AND-SCREENS.md`). Before a deal is confirmed, no figure shown to one side may be derived from the other side's private dates, limits, distances or quantities. The only exceptions are the offers an agent actually makes during a negotiation and the three-level market signal. Tests prove it.
- **R4. Honest labels.** The prototype says what it is. Sample data is marked as sample data. Factors are marked published, indicative or placeholder with their source. Each rule-based step that stands in for AI carries the label "Rule-based in this prototype. Stands in for an AI step." Each scripted agent carries "Simulated agent: scripted rules, no AI model". Nothing is presented as certified, as a compliant assessment, or as the output of an AI model. The fixed labels are listed in `04-PRIVACY-AND-SCREENS.md` section 6 and a test checks them.
- **R5. Self-contained and offline.** No network requests at runtime: no CDN fonts, no analytics, no APIs, no remote images. The app must work from the single file `dist-single/index.html` opened from disk.
- **R6. A fictional world with no invented claims.** Every company, person, building and address is fictional. Use the names in `06-DATA.md` and no others. Standards, schemes and publications may be named as sources. No real business or building appears as an actor. No logos, no testimonials, no market statistics, no competitor comparisons, no claims of savings beyond what the sample data computes.
- **R7. Copy rules.** British English ("tonnes", "storey", "programme", "colour"). Sentence case. Write as a practitioner would: plain words, no filler, no hype, no stock marketing phrases. No em dashes or en dashes anywhere in the UI, exports, docs or code comments: use commas, colons, brackets, or the word "to" for ranges. Write carbon units as "tCO2e" and "kgCO2e". Write life cycle modules with a hyphen: "A1-A3". Keep arrows, tick marks and comparison signs out of UI text (the bundled fonts do not have them): use words.
- **R8. Stay in scope.** Build what the brief asks for. No extra features, pages or settings. A control either works or is one of the three labelled stubs. Section 3 lists the features; `04-PRIVACY-AND-SCREENS.md` section 5 lists the screens that carry them, and both are in scope. Nothing beyond the two is built.
- **R9. No expected value is ever typed into implementation code.** Every figure on screen is computed by a domain function from the seed. Expected values belong in tests only.

## 3. Scope

### Tier 1: this run

Everything on the twelve-step demo path, plus the supporting screens below. Details are in files 02 to 07.

- App shell, landing page, role switcher, demo script panel (with "Go" and "Set up to here"), seed world, reset.
- Supply workspace: inventory, on-site capture with Assist, priority ranking, building disclosure settings, publishing with market preview and disclosure score, offers and deals with seller approval.
- Marketplace: browse and listing detail, built from the public projection.
- Project workspace: steel schedule matcher, reuse plan with the storage, testing and transport package, negotiation agent, logistics agent, buyer's custody timeline.
- Compliance: project dashboard (reused and recycled content by value, avoided carbon), demolition bill import with review, waste dashboard, two XLSX exports, and a print stylesheet on the project compliance screen.
- Operator: revenue ledger and business model comparison.
- Assumptions screen: read-only tables of every factor, price, fee, target and weight, with source and status.
- About screen: what is real, what is simulated, which AI step each rule stands in for, limits, and open questions for the founder.
- Three visible stubs, each a control that opens a short panel saying what the real feature would do and that it is not part of this prototype: "Import from a BIM model (IFC or Revit)" on the schedule matcher, "Recognise materials from a photo" on capture, "Read a PDF bill or archive drawing" on the bill import.

Deliberate limits inside Tier 1. Do not build these, and do not leave controls for them:

- The buying flow (plan, negotiate, deal, logistics) exists only for steel allocations produced by the matcher, and negotiation only for lots owned by Ostlea Estates. For any other seller the plan item shows "Seller not simulated in this prototype". Listings of other families can be browsed and opened, and show "Reserving this lot is not part of this prototype".
- No sealed manual offers, no direct collection route in the UI (the engine and tests cover it), no override for a blocked publication, no withdrawing a listing, no declining an offer, no seller-supplied carbon figure, no hidden-price option.
- Both importers accept the built-in sample only. No file upload, no pasted tables. The parsers are real and fully tested against the sample files.
- Assumptions and priority weights are read-only.
- Phone layout is required for Capture only. Other screens need to work from 1024 px wide.
- No project overview screen, no reuse narrative, no browse filters, and no seller-side custody timeline.

### Tier 2: a separate run

`08-TIER2.md`. When Tier 1 meets the definition of done, stop and report. Do not start Tier 2 unless asked.

### Not covered at all

List these on the About screen under "Not covered", one line each:

- A backend, user accounts, permissions, notifications, payments, deposits and escrow.
- Real AI model calls and real partner integrations.
- Maps, native mobile apps, other languages, dark mode.
- Material passports with QR codes or NFC tags, and digital twins.
- Requesting a survey or a testing visit from a partner.
- Storage owned by the platform (only partner storage is modelled).
- Comparisons with, or figures about, other reuse platforms.
- Rent premium and rental yield figures for sustainable buildings (unverified).
- Vacancy and future pipeline insights as a data product.

## 4. Environment

- Assume Node 20 or later, npm, git, a reachable npm registry and no sudo. If `npm install` fails because the registry cannot be reached, stop and say so.
- Never run an interactive command. Pass the flags that make a command non-interactive, or write the file by hand.
- Before anything else: `git init`, then commit `CLAUDE.md`, `brief/` and `docs/OPEN_QUESTIONS.md` as the first commit. Scaffold the app with `npm create vite@latest app -- --template react-ts < /dev/null` so it cannot prompt, then move the contents of `app/` into the project root and delete `app/`, so the brief files are never overwritten. If that command prompts, hangs or fails, write `package.json`, `index.html`, `tsconfig*.json`, `vite.config.ts` and `src/main.tsx` by hand and install the pinned list directly. Add a `.gitignore` (node_modules, dist, dist-single, test-results, playwright-report).
- Commit after every green step with a short message. Never use `--no-verify`. Never rewrite history.
- If subagents are available, use them where section 5 says so. If not, do the same review yourself from a fresh read of the named files.

## 5. Phases

Work through the phases in order. A phase is finished when its gate passes. Then commit, tick it off in `PLAN.md`, and re-read the files for the next phase.

| Phase | Re-read | Build | Gate |
|---|---|---|---|
| 0. Set up and plan | 01 to 07, once, in order | Git, scaffold, pinned dependencies, both builds, lint, unit test runner, Playwright with a found browser. A small tooling spike (05 section 2.6). `PLAN.md`: file tree, this phase list as a checklist, risks. | `npm run check` passes. The spike's end-to-end test passes against `dist/` over http and `dist-single/index.html` from disk with the network blocked, or the browser fallback in 05 is recorded. |
| 1. Domain | 03, 06, 07, and 04 sections 1 to 4 | Reference data, engines F1 to F10 and F12 to F14, both privacy projections, seed world, twin seed. No screens. | Every example in 07 has a passing unit test. Privacy tests P1, P2, P5a, P8 and P9 (04 section 4) pass. Tests pass under `TZ=UTC` and `TZ=Pacific/Auckland`. Then an independent review: a subagent with fresh context reads `src/domain` against 03, 06 and 07 and reports only deviations from the brief. Fix them. |
| 2. Store and demo replay | 02, 03, 04 section 1, 06 | The store, its actions, and `runDemoStep(n)` for n = 1 to 12 (02 section 5). No screens. | The replay test runs steps 1 to 12 on fresh seed and asserts every value in the acceptance table in 02, at store level. |
| 3. Shell and first slice | 04, 05 | `docs/DESIGN.md`, tokens, fonts, drawings, shell, role switcher, reset, the "How this is calculated" panel. One vertical slice: inventory, listings and privacy, marketplace browse and listing. | `npm run check` passes. End-to-end test covers demo steps 3 and 4 in both builds. Privacy tests P3, P5b and P7 pass for these screens. Screenshots taken, looked at, and fixed. |
| 4. Compliance wedge | 02 (steps 10, 11), 03 (F3, F4, F13), 04 sections 5.5 and 5.8, 06 (A6 to A8, C1), 07 (B3, B4, B12) | Project compliance dashboard, bill import with review, waste dashboard, both workbooks, print layout. | End-to-end test covers steps 10 and 11 on seed data (step 10 with the two seeded deals). Workbook tests re-open each file and check cell values, formulas and, for the buyer side, absence of private strings (P6). |
| 5. Marketplace path | 02, 03 (F5 to F9), 04 sections 3, 5.2 to 5.4, 07 (B5 to B9) | Capture, priority, schedule matcher, reuse plan and package, negotiation thread, offers and deals, logistics, custody timeline, narrative. Every screen calls the store actions from Phase 2. | End-to-end test runs steps 1 to 9 in order and asserts the acceptance values, then step 10 after the deal. Privacy tests P3 and P4 pass. |
| 6. Operator and shared | 01 section 3, 02 (step 12), 03 (F12), 04 sections 5.6, 5.7 and 6, 06 (A2, A9) | Ledger, model comparison, Assumptions, About, demo script panel with "Go" and "Set up to here", the three stubs. | End-to-end test covers step 12. The required-labels test (04 section 6) passes. |
| 7. Hardening | 01 section 7, 02 | Full end-to-end run of steps 1 to 12 in both builds. Layout checks. `npm run shots`. `README.md`, `docs/DEMO_SCRIPT.md`, `docs/EVIDENCE.md`. | Every item in section 7 is checked off in `docs/EVIDENCE.md` with the command that proves it. |

Then stop and give the final report (section 8).

**If the session ends before Phase 7.** Phase 4 is the designated stopping point: it carries the compliance wedge, which is the part the founder asked for first. Whenever a phase cannot be finished, stop at a green `npm run check`, write the remaining work into `PLAN.md` as a checklist, commit, and report. Never leave a failing check or a skipped test behind. This is a two to three session build; do not compress it by skipping tests.

## 6. Ways of working

- **Tests first.** Write the test from `07-EXAMPLES.md` before the function it tests. Tolerance is half a unit of the last digit shown in the example.
- **The example decides.** If your result differs from a worked example, your reading of the formula is wrong: re-read the formula's notes and the example's inputs. The examples were reproduced independently before this brief was issued. Only if you can show a full hand calculation that contradicts an example may you record it in `docs/OPEN_QUESTIONS.md` and mark that single test with `it.fails`. Never do this for a value in the demo acceptance table.
- **No special cases.** Tests contain expected values. Implementation code never branches on a particular input, tag or ID to produce one. A check that fails is fixed at its cause. Tests are not weakened, skipped or deleted.
- **Dates are calendar dates.** Store dates as ISO strings (`2027-03-15`), do arithmetic in whole days in UTC, and never build a date from local time. The demo date is fixed (05 section 2.5).
- **Commit on green.** A commit follows a green `npm run check`, never precedes one.
- **Stable selectors.** Give every figure the end-to-end tests assert a `data-testid` named after its acceptance-table row, so a layout change does not break a test.
- **End-to-end tests are deterministic.** Fixed demo date, seed data, no fixed waits, no retries. Under reduced motion, which the tests run with, the negotiation log renders at once, so tests assert it directly and never press "Skip". Skip exists for the live demo. A test that passes only on retry is a failing test.
- **Context resets.** Keep `PLAN.md` current: after each gate, write what is done, what is next and anything learned. After any reset or compaction, re-read `CLAUDE.md`, `PLAN.md`, `docs/DECISIONS.md` and the brief files for the current phase before writing code.
- **Fallbacks are counted, not felt.** If the same gate item fails three times in a row after genuine fixes, apply its fallback below, record it in `docs/EVIDENCE.md` under "Deviations", and move on:

| Item | Fallback |
|---|---|
| Animated negotiation thread | Show the full log at once as a table. The engine result is unchanged. |
| Logistics agent | Show the three quotes as a static table with the cheapest that meets the dates marked as booked. |
| Photo capture and storage | Keep the seeded sample photo only. Hide the photo input. |
| PDF check of the print layout | Keep the print stylesheet. Record that the PDF was not checked. |
| Single-file end-to-end project | Run the http project only and record that the single file was checked by hand with the smoke script. |
| A workbook sheet with formulas | Write that sheet's values without formulas and record it. |
| The XLSX sample bill | Parse the CSV twin of the same bill and record it. |
| No browser at all | The ladder in 05 section 2.4. |

Never cut: steps 10 and 11, the engine tests, the privacy tests, the honest labels.

## 7. Definition of done

Each item must be checkable by a command or a file. Record the proof in `docs/EVIDENCE.md`.

1. `npm run check` exits 0: typecheck, lint, unit tests, both builds, and the scan script (item 8).
2. Every worked example in `07-EXAMPLES.md` has a passing unit test. Number the rows of each table as you implement them (B1.1, B1.2 and so on), put the ID in the test name, and list ID against test name in `docs/EVIDENCE.md`.
3. The store-level replay test asserts every value in the acceptance table.
4. `npm run e2e` passes steps 1 to 12 in both Playwright projects (`dist/` over http, and `dist-single/index.html` from a `file://` URL with the network blocked), or the browser fallback is recorded.
5. Privacy tests P1 to P9 pass.
6. Both workbooks are re-read by a test that checks headline cells, that formulas are present with cached values, and that buyer-side files hold no private strings. If a second reader is available on the machine (LibreOffice or Python with openpyxl), open each file with it and record the result. If not, record "not independently opened".
7. The required-labels test passes: every fixed label in 04 section 6 appears where the table says.
8. `scripts/scan.mjs` finds, in `src/`, `e2e/`, `docs/`, `README.md` and the text of generated exports: no em dashes or en dashes; none of the tokens `lorem ipsum`, `TODO`, `FIXME`, `XXX`, `coming soon` or `your text here` outside `src/domain/reference/samples.ts`; and no organisation, person or building name outside the allowed list. The script reads one allow-list module, `src/domain/reference/names.ts`, holding the three groups in `06-DATA.md` section A11, and one deny-list of real company names you must not introduce. Test fixtures for the twin seed are exempt.
9. Layout: at 390 px wide, Capture has no horizontal page scroll and its touch targets are at least 44 px. At 1024 px and 1440 px no screen has horizontal page scroll. The project compliance screen prints to A4 PDF with no clipped table (checked through Playwright, or recorded as not checked).
10. "Reset demo data" restores the seed and clears stored photos, removing only this app's storage key and database.
11. `README.md` explains in a few lines how to run, build and demo. `docs/DEMO_SCRIPT.md` is a presenter's version of the acceptance table. `docs/OPEN_QUESTIONS.md`, `docs/DECISIONS.md` and `docs/EVIDENCE.md` exist and are current.
12. Nothing was deployed, pushed or sent anywhere.

## 8. Final report

Finish with a report in `docs/EVIDENCE.md` and in your final message: what was built; the exact commands run and their results; test counts; the list of screenshots; the size of the single-file build; every deviation from this brief and every fallback used; and how to run the demo. Show evidence. Do not claim something works unless a check you ran shows it.
