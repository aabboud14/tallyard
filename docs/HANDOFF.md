# Handoff

Rewritten on 8 October 2026 for version 1.0, so that a person or a fresh session with no memory of the build can continue it. Read this first, then `CLAUDE.md`, then `PLAN.md`, then `brief/09-V1-PRODUCT.md`.

## 1. What this is, in one paragraph

Tallyard is a clickable prototype of a marketplace for salvaged construction materials, with the workflow around it for each role on a project. It is client only: no backend, offline, one browser, sample data, a fixed demo date of 7 October 2026. Version 0.5 was a demo of the concept. Version 1.0 (`brief/09-V1-PRODUCT.md`, from two calls with a London architect, the domain partner) is a role-specific tool, architect first: each role gets its own interface, navigated project by project, and decision rights are fixed. The architect chooses on function, appearance and carbon; the asset owner approves, buys and controls what is visible; the architect never makes a deal. It is a marketplace and workflow tool, not an AI tool: the rule-based stand-ins keep their labels as quiet footnotes. Every company, person, building and address is fictional.

## 2. Where everything is

| Thing | Location |
|---|---|
| Repository | https://github.com/aabboud14/tallyard |
| Working branch | `claude/exciting-heisenberg-3cu7nb`, holds version 1.0 (see section 4) |
| Version 0.5 deploy | `main`, imported into Vercel from GitHub by the user. Believed live at https://tallyard-aabboud.vercel.app/ (inferred from Vercel's alias pattern, **not verified by the builder**) |
| Version 1.0 deploy | Vercel project `tallyard-v1`, meant to build the working branch so the version 0.5 site stays as it is. **Not created or opened by the builder**: the container cannot reach Vercel. Settings: import the repository, Production Branch `claude/exciting-heisenberg-3cu7nb`; `vercel.json` already sets framework Vite, `npm ci`, `npm run build` and output `dist`. If the page asks visitors to log in, switch off Deployment Protection for the demo. |
| Specification | `brief/09-V1-PRODUCT.md` governs version 1.0 (its section 13 overrides sections 1 to 12); `brief/01-BRIEF.md` to `08` are the version 0.5 spec and still hold where 09 is silent |
| Rules that survive a reset | `CLAUDE.md` (rules R1 to R8, commands, standing facts) |
| Progress and decisions | `PLAN.md`, `docs/DECISIONS.md`, `docs/EVIDENCE.md` |
| Presenter's script | `docs/DEMO_SCRIPT.md`; 34 screenshots in `docs/screens/` |

## 3. What exists and works (version 1.0)

The landing page groups the roles, architect first, with one line each. The persona switcher in the top bar changes role; the left rail is a folder tree built from the world and the persona. A screen that resolves a building, project or engagement from the URL checks access and shows "Not available to this role" when it fails.

| Role | Persona | Screens |
|---|---|---|
| Architect | Priya Nair, Studio Oriel | Marketplace: Browse (visual cards, typology chips, More filters, sort, the project picker with a fit tag per card), Shared with you (per project, behind the confidentiality terms), Saved. Listing detail: visual and dimensioned drawing, band, key figures, timeline strip, spec rows, guide price as a secondary line, Save, DXF and OBJ downloads, BIM family greyed. Projects (Merrowgate Wharf, Sallow Court, Ferrymoor Yard), each with Wish list, Spec sheet (print or save as PDF, spreadsheet) and Match schedule (version 2, greyed). New project. No deal, mandate, offer or negotiation anywhere. |
| Asset owner, client | Isla Brennan, Lantern Quay Developments | Merrowgate Wharf: Approvals (approve or decline each sent item with a note), Match schedule (advanced), Reuse plan with the package and negotiation, Deals with logistics and custody. |
| Site surveyor | Dana Kowalski, Tarnbrook Deconstruction | Clients as folders: Ostlea Estates with Tiverne House, Brackwater Estates with Harrowden Court. Per building: Inventory, item detail, Capture with Assist and expected availability. |
| Asset owner, selling | Tom Ashby, Ostlea Estates | Tiverne House only: Inventory, Priority with the five-step decision tree legend, Listings and visibility (Private, Shared privately with selected projects, Published to the marketplace, the blind sharing list). Offers and deals. Harrowden Court is out of reach, by rail and by URL. |
| Sustainability consultant | Marcus Lindqvist, Halewick Sustainability | Projects: Compliance (two workbooks and print), Wish list review (read only). Engagements: Durnley House waste and reuse with the bill import. |
| Platform operator | Platform operator, Tallyard | Ledger and model comparison, open only to the operator. |

Shared by every role: Assumptions (with the version 1.0 parameters as placeholders), About (what is real, simulated, rule-based and version 2, and the open questions), Reset demo data, and the demo script panel for presenters.

Under the screens: pure engines in `src/domain/engines` for typology, decision tree route, timeline fit, sustainability band, spec sheet, browse, wish list and geometry, beside the version 0.5 engines F1 to F14; the access model in `src/domain/access.ts`; the two privacy projections `toPublicListing` and `toBlindBuyer`, unchanged.

Verified on the last run (8 October 2026): `npm run check` green with 42 test files and 536 unit tests; `npm run e2e` 12 of 12 (6 in `http`, 6 in `single-file`); scan clean on 197 files; 34 screenshots looked at. The twelve-step replay still passes at store level and in the browser with every acceptance value; steps 5 to 7 and 9 now run as Isla. Details in `docs/EVIDENCE.md`.

## 4. Branch state: read this before touching anything

- `claude/exciting-heisenberg-3cu7nb` holds version 1.0 and is ahead of `main`: the brief 09 commits, the contract (`615ad22`), stage 1 (`db6b6bf`), stage 2 (`38d1fc9`), stage 3 (`d147a40`) and the final gate commit "Version 1.0: role-specific tool, architect first". It is pushed to `origin`.
- `main` holds finished version 0.5 (Tier 1), a `vercel.json`, the About concept section and the gap analysis. Version 1.0 has **not** been merged to `main`, and should not be without the user's explicit go-ahead.
- The version 0.5 contractor scaffold (Wrenlow Build, Ruth Adeyemi, `opportunity.ts`, `bidPack.ts`, the two placeholder screens, and Marcus's Tiverne House tabs) is removed on this branch; git history keeps it.
- Open risk carried from version 0.5: a Vercel screenshot once labelled a deployment built from the working branch as "Production" on the version 0.5 project. If that project builds this branch, the version 0.5 site now shows version 1.0. Check Project Settings, Git, Production Branch on the existing project, and keep it on `main`.
- The browser store is persisted at version 2 under the `tallyard-v05` prefix; a browser holding a version 0.5 world re-seeds instead of crashing.

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

## 8. Pending from the partner

Brief 09 section 12 and section 13.4. Do not build any of these until the material arrives; each replaces a placeholder named in brief 09 and listed on the About screen under open questions.

1. **The product name.** The partner says Tallyard is taken and will propose another. Rename then, in the one constant `PRODUCT_NAME`.
2. **The office's specification template.** Replaces the first-cut column set of the spec sheet and its spreadsheet.
3. **Screenshots of the tools the office uses today**, to align the architect's screens.
4. **The office's sustainability diagram.** Replaces the three-segment band and its placeholder thresholds (90% and 80% of the new product's carbon).
5. **The list of UK and London frameworks and the decision tree** the office works to. Replaces the five-step legend (L41) and the rule that assigns only reuse, downcycle and recycle.
6. **The sustainability consultant's workflow**, for the next call. The consultant's wish list review is read only and stops there on purpose.
7. **Whether the engineer or testing partner gets a role** in the spec sheet's growth through the stages.
8. **A life cycle assessment database and Environmental Product Declarations** as the carbon source: an integration, version 2 or later.
9. **Should the owner see which practice a shared project's architect is?** The owner's sharing list is blind for now.

Not from the partner but still open: timber joists have no recorded section size, so their geometry download is unavailable and says so.

Version 0.5 founder-note additions (the old section 8): the consultant listing for the developer and the contractor bid pack are superseded by brief 09; who holds title to arisings is an open question on the About screen; the inception targets view is not built (the consultant's review makes no comparison with targets, 13.12); presentation outputs are not started and need a decision first.

## 9. Known gaps and things not verified

- The live site has not been opened by the builder. The container cannot reach Vercel and the Vercel connector returned 403 for the project, so the URL, the Production branch and the current live content are unconfirmed. If the page asks visitors to log in, switch off Deployment Protection in the project settings for the demo.
- Brief quality floor items not formally checked: WCAG AA contrast (palette chosen to the brief, not measured), keyboard-only operation of every dialog and form, and real-device phone testing. The 390 px layout, 44 px touch targets and A4 print (a generated PDF with no clipped table) are tested.
- The workbooks were re-opened only by ExcelJS. No second reader (LibreOffice, openpyxl) was available.
- `npm install` reports 5 advisories in transitive dependencies; they are left alone as the brief instructs.
- The JavaScript bundle is one 1.5 MB chunk; the size warning is raised, not fixed.
- The single file `dist-single/index.html` is about 1.9 MB (1,960,368 bytes) and opens from disk.

## 10. How the user works

Wants plain language and short answers, often asks for just a link or a one-line summary, interrupts long work, and expects honesty about what was and was not verified. Prefers being told the next decision rather than being asked open questions.

## 11. First steps for the next session

1. Read `CLAUDE.md`, `PLAN.md`, `docs/DECISIONS.md`, then `brief/09-V1-PRODUCT.md` to its last line (section 13 overrides the rest).
2. Run `npm run check` and `npm run e2e` to confirm the starting state (536 unit tests; 12 end-to-end tests across two projects).
3. Ask the user whether the Vercel project `tallyard-v1` exists, which branch it builds, and what it shows; check the version 0.5 project still builds `main`.
4. Ask what the partner has sent (section 8) and replace only the placeholders that material covers, test first, one commit each.
5. Before anything goes to `main`, run the full gate and get the user's explicit go-ahead.
