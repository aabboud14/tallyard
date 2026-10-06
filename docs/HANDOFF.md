# Handoff

Written on 6 October 2026 so that a person or a fresh session with no memory of the build can continue it. Read this first, then `CLAUDE.md`, then `PLAN.md`.

## 1. What this is, in one paragraph

Tallyard is a clickable prototype of a marketplace for salvaged construction materials. It is client only: no backend, offline, one browser, sample data. It exists as a test instrument to show a London sustainability founder and then developers, architects and consultants, to find out whether the concept holds, which business model fits, and how much disclosure owners will accept. The brief says the fixed demo date, 7 October 2026, is the day of the follow-up meeting, so the priority is a stable, correct demo. Every company, person, building and address is fictional.

## 2. Where everything is

| Thing | Location |
|---|---|
| Repository | https://github.com/aabboud14/tallyard |
| Working branch | `claude/exciting-heisenberg-3cu7nb` (ahead of `main`, see section 4) |
| Deploy branch | `main` (Vercel imports it from GitHub; the user did the import in the Vercel dashboard) |
| Live URL | Believed to be https://tallyard-aabboud.vercel.app/ . **Not verified by the builder**: it was inferred from Vercel's alias pattern. Check the Deployments tab. |
| Specification | `brief/01-BRIEF.md` is the entry point; `brief/02` to `07` are the spec; `brief/08-TIER2.md` is the optional second run |
| Rules that survive a reset | `CLAUDE.md` (rules R1 to R8, commands, standing facts) |
| Progress and decisions | `PLAN.md`, `docs/DECISIONS.md`, `docs/EVIDENCE.md` |
| Founder's notes against the build | `docs/FOUNDER-NOTES-GAPS.md` |
| Presenter's script | `docs/DEMO_SCRIPT.md`; screenshots in `docs/screens/` |

## 3. What exists and works (Tier 1, complete)

All twelve demo steps in `brief/02-DEMO-PATH.md` run end to end on fresh seed data with the stated values. The five personas are Tom Ashby (asset owner), Dana Kowalski (surveyor), Priya Nair (architect for the buyer), Marcus Lindqvist (sustainability consultant) and the platform operator.

- Domain engines F1 to F14 (mass, carbon, price guidance, priority, schedule matching, package costs, negotiation, disclosure score, revenue and models, waste rates, content by value, bill import, capture parsing), all pure functions in `src/domain/`.
- Two privacy projections, `toPublicListing` and `toBlindBuyer`, so neither side sees the other's private figures before a deal is confirmed.
- Screens for supply, marketplace, project, compliance (with two XLSX exports and an A4 print layout), operator, assumptions and about.
- Three labelled stubs: BIM import, photo recognition, PDF bill reading.
- An About screen with a "The concept in full" section added from the founder's notes.

Verified on the last run: 20 unit test files with 240 tests passing; `npm run check` green; `npm run e2e` 6 passed (3 tests in each of two Playwright projects, including the single file opened from disk with the network blocked); scan clean; 19 screenshots. Every worked example in `brief/07-EXAMPLES.md` has a test, and `docs/EVIDENCE.md` maps them.

## 4. Branch state: read this before touching anything

`main` holds finished Tier 1, a `vercel.json`, the About concept section and the gap analysis.

The working branch has two further commits that are **not on `main`**:

1. A scaffold for five additions from the founder's notes (section 6). It adds a contractor persona (Ruth Adeyemi at Wrenlow Build), project targets, an `arisingsTitle` field on source buildings, two domain helpers that are written but untested and unused (`src/domain/engines/opportunity.ts`, `bidPack.ts`), two placeholder screens that only say "This screen is being built" (`src/features/compliance/Summary.tsx`, `src/features/contractor/BidPack.tsx`), their routes, and workspace tabs.
2. The About commit (also on `main`).

Unit tests and the end-to-end suite pass with the scaffold, but the branch is **not releasable**: a visitor who picks the new persona lands on a placeholder.

**Open risk.** The builder believed only `main` is the live site. A Vercel screenshot labelled a deployment built from the working branch as "Production". Until someone checks Project Settings, Git, Production Branch and the Deployments tab, assume the scaffold may already be live. If it is, either revert the scaffold commit on the branch or point Production at `main`.

## 5. How to run and verify

Node 22, npm. Chromium is pre-installed at `/opt/pw-browsers`; do not run `playwright install`.

```
npm ci
npm run check          typecheck, lint, unit tests, both builds, scan
npm run test           vitest
npm run e2e            builds both targets, makes the photo fixture, runs Playwright in both projects
npm run shots          screenshots into docs/screens/
npm run build:single   dist-single/index.html, the one file that opens from disk
```

Practical notes:

- `e2e/fixtures/sample-photo.jpg` is git-ignored and built by `scripts/make-photo-fixture.mjs`. A fresh clone running `npx playwright test` directly will fail until `npm run e2e` (or that script) has run.
- `scripts/make-samples.mjs` runs as a prebuild step and does nothing if its outputs exist (`--force` rebuilds). The generated `src/domain/reference/samples.ts` and the two sample files must stay committed, because the Vercel build depends on them.
- `scripts/dev/` is git-ignored. It held a local screenshot helper that will not exist in a fresh clone; recreate it with a few lines of Playwright if needed.
- The scan (`npm run scan`) fails on em or en dashes, filler tokens, and any organisation, person or building name not in `src/domain/reference/names.ts`. It also reads `docs/`, so this file obeys the same rules.
- The root font size is 15 px, so the Tailwind class `min-h-11` is only 41 px. Touch targets use `min-h-[44px]`.
- Test ids are the contract with the end-to-end spec: figures are named after acceptance-table rows and every fixed label has a `label-Lnn` id.

## 6. Architecture in brief

- `src/domain/` pure logic, no React. `engines/` (F1 to F14 and helpers), `privacy/` (projections and the private-strings lists the tests use), `reference/` (every factor, price and label with its source and status), `seed/` (the world and market snapshot), `format.ts` (the only place numbers become text), `dates.ts` (ISO strings, whole days, UTC).
- `src/store/` a Zustand store persisted under `tallyard-v05-state`, pure actions in `actions.ts`, derived views in `selectors.ts`, the demo replay in `demo.ts` (`runDemoStep(n)`, `runDemoSteps(from, to)`), and an IndexedDB photo store `tallyard-v05-photos`. Reset removes only these.
- `src/features/` screens by workspace; `src/components/` drawings, charts, panels, shell. Hash routing, so the single file works from disk.
- Standing rules that bite: the UI never calculates; buyer-facing data comes only from `toPublicListing`; seller-facing buyer data only from `toBlindBuyer`; the demo date is the constant `DEMO_TODAY`, never the clock; money is rounded to pence when each amount is created; no network at runtime.

## 7. Decisions, deviations and authorisations

- The brief and `CLAUDE.md` say never to push or deploy. The user explicitly asked for a push and a Vercel deployment in this session, so the build was pushed and deployed. That was an instruction in one session, not a standing change. A new session should ask again before pushing to `main`. The deviation is recorded in `docs/DECISIONS.md` and `docs/EVIDENCE.md`.
- `main` was fast-forwarded to the finished build on the strength of the user's Vercel import screenshot showing `main`, not on an explicit "merge it". The user then confirmed the deployment worked.
- Choices where the brief was silent are one line each in `docs/DECISIONS.md`. The two that matter most: reference rows for transport margin and matching fee carry the status `candidate`, as `brief/06-DATA.md` writes them; the sample file builder is idempotent to stop timestamp churn in git.
- No fallback from `brief/01-BRIEF.md` section 6 was used. No test was weakened or skipped.

## 8. Pending work: the five additions from the founder's notes

The user approved these ("go ahead and make the updates to the product"). Status of each, with a caution on the first.

1. **Consultant lists materials for the developer.** Partly scaffolded, **and the scaffold is wrong**: it adds Tiverne House inventory and capture tabs to Marcus's workspace. Marcus is the buyer-side consultant on Merrowgate Wharf, so this lets one person see both sides' private data, which the About screen lists as outside the model and which breaks the blind-until-confirmed design. Remove those two tabs and instead add a separate consultant persona who acts for the owner, with its own organisation, before building anything on this.
2. **Inception targets and a carbon opportunity view.** The seed has sample targets (25% content by value and 150 tCO2e) that are invented placeholders and must be labelled as such. `opportunity.ts` computes potential, secured and remaining carbon by bill line but has no test and no screen. Needs: tests first, a design-team summary screen at `/compliance/summary`, placeholder labelling.
3. **Who holds title to arisings.** The `arisingsTitle` field exists and is seeded, but nothing reads it, and the one line in the projection that uses it never fires. Needs a decision on what the screens should show. This is open question 12 for the founder.
4. **Contractor bid pack** (`brief/08-TIER2.md` section 5). The persona, organisation and allowed names exist; `handlingNotes` is written but untested; the screen is a placeholder; the XLSX export is not built. The spec: confirmed and planned reused items from public fields only, with expected delivery date, generated handling notes, the P427 line (L4), and an export carrying the caveat line (L20). Add privacy tests as for the buyer-side workbook.
5. **Presentation-ready outputs.** Not started. It needs a decision first, because slides are outside both tiers of the brief; the founder's notes ask for charts and a presentation at early design stages.

Rules for finishing them: write the test before the function, keep each addition behind green `npm run check` and `npm run e2e`, record decisions, and do not push to `main` until the demo path and all checks pass.

Tier 2 items not started: aggregated market insights (F11), file upload on both importers, browse filters, project overview, reuse narrative, "Jump here", listing spec sheet, owner audit workbook, editable assumptions.

## 9. Known gaps and things not verified

- The live site has not been opened by the builder. The container cannot reach Vercel and the Vercel connector returned 403 for the project, so the URL, the Production branch and the current live content are unconfirmed. If the page asks visitors to log in, switch off Deployment Protection in the project settings for the demo.
- Brief quality floor items not formally checked: WCAG AA contrast (palette chosen to the brief, not measured), keyboard-only operation of every dialog and form, and real-device phone testing. The 390 px layout, 44 px touch targets and A4 print (a generated PDF with no clipped table) are tested.
- The workbooks were re-opened only by ExcelJS. No second reader (LibreOffice, openpyxl) was available.
- `npm install` reports 5 advisories in transitive dependencies; they are left alone as the brief instructs.
- The JavaScript bundle is one 1.5 MB chunk; the size warning is raised, not fixed.
- The attached single file `dist-single/index.html` is about 1.7 MB and opens from disk.

## 10. How the user works

Wants plain language and short answers, often asks for just a link or a one-line summary, interrupts long work, and expects honesty about what was and was not verified. Prefers being told the next decision rather than being asked open questions.

## 11. First steps for the next session

1. Read `CLAUDE.md`, `PLAN.md`, `docs/DECISIONS.md`, then the brief files for whatever you are about to touch.
2. Ask the user to confirm which branch Vercel treats as Production and what the live site shows.
3. Run `npm run check` and `npm run e2e` to confirm the starting state.
4. Remove the Marcus tabs for Tiverne House, then build the five additions in the order in section 8, one commit each.
5. Before anything goes to `main`, run the full gate and get the user's explicit go-ahead.
