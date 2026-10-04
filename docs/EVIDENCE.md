# Evidence

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
