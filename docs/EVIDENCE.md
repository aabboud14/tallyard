# Evidence

## Version 1.0

Run on 8 October 2026 on branch `claude/exciting-heisenberg-3cu7nb`, against `brief/09-V1-PRODUCT.md` (section 13 overrides sections 1 to 12). Node 22.22.0, npm 10.9.4, Playwright 1.63.0 with the pre-installed Chromium 1194.

### Commands and results

```
npm run check      typecheck ok; oxlint 0 errors (6 warnings, unchanged); vitest 42 files, 536 tests passed;
                   dist/ and dist-single/ built; scan 197 files clean
npm run e2e        builds both targets, then 12 passed in 59.4 s, no retries
                   http:        6 of 6 passed
                   single-file: 6 of 6 passed (dist-single/index.html over file://, offline)
npm run shots      34 screenshots into docs/screens/, each looked at
TZ=UTC and TZ=Pacific/Auckland npx vitest run src/domain/engines/timeline.test.ts   14 passed in each
```

### End-to-end tests (each from a fresh seed, run in both projects)

| Test | What it proves |
|---|---|
| `e2e/demo.spec.ts` steps 1 to 12 | The twelve-step replay on the version 1.0 routes and personas with every acceptance value; steps 5 to 7 and 9 run as Isla Brennan; the step 8 buyer contact is Isla Brennan, Lantern Quay Developments. Steps 10 and 11 run in full. |
| `e2e/demo.spec.ts` labels and privacy | L35 to L43 where brief 09 section 7 puts them, the three greyed stubs, L24 to L27 and L32, the timber geometry message; P3, P4, P5b (before and after terms) and P7 on the new routes; P11 on every architect route. |
| `e2e/demo.spec.ts` layout and reset | No horizontal scroll at 1024 and 1440 px on every route for every persona after the twelve steps; at 390 px capture, browse with the filter sheet and menu drawer, a listing and a wish list, with every control at least 44 px; reset removes only this app's storage. |
| `e2e/journeys.spec.ts` architect | Browse, sort checked against the domain sort, the five shared lots behind the terms, save, wish list, both geometry files (DXF with 12 vertices, L20 and L42, no lot private string), the spec workbook re-opened for P10, send to the client, P3, P7 and P11. |
| `e2e/journeys.spec.ts` client | Isla approves L-9F4CQQ with a note; Priya sees it approved and cannot remove it; the spec sheet lists it; Marcus's wish list review shows it. |
| `e2e/journeys.spec.ts` surveyor and owner | Dana's clients and Harrowden Court's three items; Tom cannot reach Harrowden Court from the rail or by URL; the decision tree routes with L41; capture at 390 px with the expected availability and L43 carried through to the inventory. |

Unit tests added for version 1.0 cover every engine of brief 09 section 5 (timeline fit under `TZ=UTC` and `TZ=Pacific/Auckland`), the access model, the wish list, project and sharing actions, the view selectors, P10 on the spec workbook, and a route sweep that renders every route for every seeded persona on the fresh seed and after the twelve steps (P11 for the architect, "Not available to this role" for routes outside a role).

### Screenshots (docs/screens)

01-landing, 02-inventory, 03-priority-decision-tree, 04-listings-and-visibility, 05-surveyor-harrowden-court, 06-browse, 07-listing-L-9F4CQQ, 08-shared-with-you, 09-wishlist-pending, 10-spec-sheet-draft, 11-match-schedule-version-2, 12-saved, 13-new-project, 14-approvals, 15-approvals-decided, 16-wishlist-decided, 17-spec-sheet-approved, 18-wishlist-review, 19-capture-390, 20-browse-390, 21-browse-filters-390, 22-listing-390, 23-wishlist-390, 24-match-schedule-client, 25-reuse-plan-package, 26-negotiation-thread, 27-deals-custody, 28-offers-and-deals, 29-project-compliance, 30-waste-dashboard, 31-ledger, 32-model-comparison, 33-assumptions, 34-about.

### Single-file build

`dist-single/index.html`: 1,960,368 bytes (about 1.9 MB), fonts, CSS and JavaScript inlined, opens from disk with the network blocked.

### Deviations

- No fallback from `brief/01-BRIEF.md` section 6 was used. No test was weakened or skipped; every changed expected value is one line in `docs/DECISIONS.md`.
- Pushed to the working branch only, at the user's request for this build. Nothing was deployed from this container and the Vercel project `tallyard-v1` was not opened by the builder.
- Second workbook reader: still none on the machine; the workbooks are re-opened by ExcelJS only.

## Version 0.5

Proof for each item of the definition of done (brief/01-BRIEF.md section 7), with the command that shows it. Run on 4 October 2026.

## Environment

- Node 22.22.0, npm 10.9.4, Chromium 1194 at `/opt/pw-browsers` (Playwright 1.63.0).
- `npm install` reported 5 advisories in transitive dependencies (2 moderate, 3 high). Not fixed with `--force`, per 05 section 2.1.
- Browser ladder: rung 1 (the pre-installed Chromium through `executablePath`).

## Definition of done

| Item | Proof |
|---|---|
| 1. `npm run check` exits 0 | typecheck, oxlint (warnings only, no errors), vitest 20 files 240 tests, `dist/`, `dist-single/`, scan 117 files clean. |
| 2. Every worked example has a passing unit test | See the table below. `npx vitest run`. |
| 3. Store-level replay asserts every acceptance value | `src/store/demo.test.ts`, 15 tests, including the three dashboard states of step 10 and the post-deal matcher. |
| 4. `npm run e2e` passes steps 1 to 12 in both projects | `e2e/demo.spec.ts`: 3 tests x 2 projects (`http` on dist/ behind vite preview, `single-file` on dist-single/index.html over file:// with offline on and a request guard), 6 passed. |
| 5. Privacy tests P1 to P9 | P1, P2, P5a, P8, P9 in `src/domain/privacy/privacy.test.ts` and `src/domain/engines/disclosure.test.ts`; P3, P4, P5b, P7 in `e2e/demo.spec.ts` (rendered main text and link targets, routes checked on every navigation); P6 in `src/features/compliance/exports.test.ts` and in the e2e download check. |
| 6. Workbooks re-read by a test | `src/features/compliance/exports.test.ts`: headline cells, formulas with cached results, no private strings. Second reader: Python with openpyxl was not available on this machine, LibreOffice neither, so "not independently opened". |
| 7. Required-labels test | `e2e/demo.spec.ts`: every label L1 to L34 is asserted by its `label-Lnn` test id on the screen 04 section 6 names (L20 also in the workbooks test). |
| 8. Scan | `npm run scan`: 117 files clean (dashes, filler tokens, names against `src/domain/reference/names.ts`). |
| 9. Layout | e2e: at 390 px Capture has no horizontal scroll and every control is at least 44 px; at 1024 and 1440 no screen scrolls horizontally; the compliance screen renders in print media at A4 width with no clipped table and `page.pdf()` produces a document. |
| 10. Reset | e2e: reset removes `tallyard-v05-photos` and restores the seed; a foreign localStorage key survives. |
| 11. Docs | `README.md`, `docs/DEMO_SCRIPT.md`, `docs/OPEN_QUESTIONS.md`, `docs/DECISIONS.md`, `docs/DESIGN.md`, this file. |
| 12. Nothing deployed, pushed or sent | Deviation: see below. |

## Example IDs against test names

| Table | Tests |
|---|---|
| B1 | `mass.test.ts`: B1.1 to B1.16 |
| B2 | `carbon.test.ts`: B2.1 to B2.12 |
| B3 | `billImport.test.ts`: B3.1 to B3.3 |
| B4 | `content.test.ts`: B4.1 to B4.3 |
| B5 | `pricing.test.ts`: B5.P1 to B5.P13, B5.14 boundaries, B5.15 seeded guides and signals, B5.16 TH-12, B5.17 snapshot, B5.18 mandates, B5.19 urgency, B5.20 buyer mandates |
| B6 | `priority.test.ts`: B6.1 to B6.14 |
| B7 | `matcher.test.ts`: B7.1 to B7.13 |
| B8 | `package.test.ts`: B8.1 to B8.10 |
| B9 | `negotiation.test.ts`: B9.N1 to B9.N10, B9.11, B9.12 |
| B10 | `disclosure.test.ts`: B10.1 to B10.13 (P9) |
| B11 | `revenue.test.ts`: B11.1 to B11.7 |
| B12 | `billImport.test.ts`: B12.1 to B12.9 |
| B13 | `assist.test.ts`: B13.1 to B13.13 |
| B14 | `format.test.ts`: B14.1 to B14.20 |
| B15 | `privacy.test.ts`: B15.1, B15.2, P1, P2, P5a, P8 |

## Commands and results

```
npm run check      typecheck ok; lint ok; 20 files, 240 tests; dist/ and dist-single/ built; scan 117 files clean
npm run e2e        6 passed (3 tests x 2 projects)
npm run shots      19 screenshots into docs/screens/
TZ=UTC npx vitest run; TZ=Pacific/Auckland npx vitest run   both 240 passed
```

## Screenshots (docs/screens)

01-landing, 02-inventory, 03-priority, 04-listings-and-privacy, 05-browse, 06-listing-L-9F4CQQ, 07-match-schedule, 08-reuse-plan-package, 09-negotiation-thread, 10-offers-and-deals, 11-deals-custody, 12-project-compliance, 13-waste-dashboard, 14-bill-review, 15-ledger, 16-model-comparison, 17-assumptions, 18-about, 19-capture-390.

## Single-file build

`dist-single/index.html`: 1,720,625 bytes (about 1.7 MB), fonts, CSS and JavaScript inlined, `public/` empty, favicon as a data URI.

## Deviations and fallbacks

- No fallback from 01 section 6 was used.
- Deployment: the user asked for a push to the working branch and a deployment to Vercel; the brief says not to deploy. Done at the user's request. The outcome is recorded at the end of this file.
- Second workbook reader: none available on the machine; recorded as "not independently opened".
- The compliance workbook's Embodied carbon sheet carries an extra Public ID column; the waste Summary carries extra formula rows (docs/DECISIONS.md).

## Deployment outcome

- Pushed to `origin/claude/exciting-heisenberg-3cu7nb`.
- Vercel: the connected Vercel account (team "Alex Abboud's projects", hobby plan) has no project, and the connector's authorisation returned 403 "You don't have permission to create a project" for both project creation and a first deployment. No deployment was made. Remedy: create a project for this repository in the Vercel dashboard (framework Vite, build `npm run build`, output `dist`), or re-authorise the Vercel connector with project creation allowed, then deploy again.

## Deployment outcome, updated

- The first deployment attempts from this session failed: the Vercel connector could not create a project (403) and the container cannot reach Vercel. The user then imported the GitHub repository in the Vercel dashboard. The first build failed only because the project's Output Directory was `build`; a `vercel.json` setting `dist` fixed it and the user confirmed the deployment worked.
- Not verified by the builder: the live URL and which branch Vercel treats as Production. See docs/HANDOFF.md sections 2, 4 and 9.
