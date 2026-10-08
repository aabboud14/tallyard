# PLAN

Tallyard build plan. Version 1.0 follows `brief/09-V1-PRODUCT.md` (section 13 overrides sections 1 to 12). Version 0.5 followed the phases of `brief/01-BRIEF.md` section 5.

## Version 1.0 stages

- [x] Brief 09 written from the two calls of 7 October 2026, reviewed, and resolved in section 13
- [x] Contract: shared types in `src/domain/v1types.ts` and the fixed labels L35 to L43
- [x] Stage 1: engines (typology, decision tree route, timeline fit, sustainability band, spec sheet, browse, wish list, geometry), access model, seed, privacy lists, `src/components/v1`
- [x] Stage 2: store actions and selectors, folder shell, route map, role and access gates
- [x] Stage 3: role screens for the architect, client, surveyor, selling owner and consultant
- [x] Stage 4: review fixes from the privacy, architect design and fidelity reviews
- [x] Stage 5: end-to-end journeys in both Playwright projects, 34 screenshots looked at, docs for version 1.0, final gate

## Version 0.5 phases

- [x] 0. Set up and plan: git, scaffold, pinned dependencies, both builds, lint, unit tests, Playwright, spike
- [x] 1. Domain: reference data, engines F1 to F10 and F12 to F14, privacy projections, seed, twin seed
- [x] 2. Store and demo replay
- [x] 3. Shell and first slice: tokens, shell, role switcher, reset, panel, inventory, listings and privacy, browse, listing
- [x] 4. Compliance wedge: project compliance, bill import, waste dashboard, both workbooks, print
- [x] 5. Marketplace path: capture, priority, matcher, plan, negotiation, offers and deals, logistics, custody
- [x] 6. Operator and shared: ledger, model comparison, assumptions, about, demo script panel, stubs
- [x] 7. Hardening: full e2e, layout checks, screenshots, README, DEMO_SCRIPT, EVIDENCE

## File tree (planned)

```
src/domain/            constants, dates, money, format, engines (F1..F14), privacy, seed
src/domain/reference/  sections, families, assumptions, waste codes, policy, labels, names, samples, openQuestions
src/store/             store, actions, selectors, demo replay, safeStorage, photoDb
src/features/          supply | market | project | compliance | operator | shared
src/components/        drawings, charts, tables, panels, shell
src/test/              twin seed, helpers
e2e/                   demo.spec.ts, spike.spec.ts, fixtures
scripts/               scan.mjs, make-samples.mjs, make-photo-fixture.mjs, shots
```

## Risks

- Worked examples depend on exact rounding order; write tests first and fix engines to the examples.
- Single-file build size and the fonts; keep public/ empty, inline everything.
- The matcher's processing order and tie rules.
- Privacy tests depend on rendered text; keep presenter controls outside main.

## Done

- Version 1.0, stage 5 (final gate): `npm run check` green (42 files, 536 unit tests, scan clean); `npm run e2e` 12 of 12 (6 in `http`, 6 in `single-file`); 34 screenshots regenerated and looked at, the old version 0.5 set removed; PLAN, DECISIONS, EVIDENCE, HANDOFF, DEMO_SCRIPT and README rewritten for version 1.0; package version 1.0.0.
- Version 1.0, stage 4: privacy fixes (new project form, operator routes, spec sheet labels, the architect's assumptions), architect design fixes (timber drawing, card wrapping, phone order, form errors, family filter, fit tags, carbon on cards, phone top bar) and fidelity fixes (quiet footnotes, PDF button, the surveyor's photo on the architect's screens, greyed stubs, L25 on approved rows). End-to-end suite rewritten: `e2e/demo.spec.ts` and `e2e/journeys.spec.ts`.
- Version 1.0, stage 3: the role screens. Architect: browse showroom with typology chips, filters sheet, sort and project picker; shared with you; saved; save popover; listing with visual, drawing, band, timeline and geometry downloads; wish list with tabs, notes, move and remove; spec sheet with print and spreadsheet export; new project; match schedule (version 2, greyed). Client: approvals, and match, plan and deals from the route. Surveyor and selling owner: capture with expected availability, inventory, item detail, priority with the decision tree legend, listings with the owner's sharing list, offers. Consultant: wish list review. Landing, About and the demo script panel for version 1.0. View helpers in `src/store/views` with tests; P11 route sweep for the architect; the theme gains white and buttons are 44 px tall at phone width.
- Version 1.0, stage 2: store actions and selectors for wish lists, projects, approvals, sharing and the spec sheet (`v1actions.ts`, `v1selectors.ts`, 47 tests); the folder shell with the route map of section 4, role and access gates, the rail per role, project home redirects, persona switcher by role, the landing grouped by role, titled placeholders for the new screens; every existing screen reads its building, project or engagement from the route; a route sweep test over every persona; e2e specs on the new routes.
- Version 1.0, stage 1 (brief/09-V1-PRODUCT.md): engines for typology, decision tree route, timeline fit, sustainability band, spec sheet, browse, wish list and geometry, test first; access model; seed with Isla Brennan, Harrowden Court, Sallow Court, Ferrymoor Yard and four wish lists; privacy lists extended; contractor scaffold removed; `src/components/v1` (swatch, band, timeline strip, chips, sheet, listing card, icons) with a gallery test; e2e personas moved to Isla for steps 5 to 9.
- Phase 4: project compliance dashboard, bill import with review, waste dashboard, both workbooks with formulas, A4 print layout, workbook tests including P6.
- Phase 7: e2e steps 1 to 12 green in both Playwright projects, privacy and label checks, layout checks, reset check, 19 screenshots, README, DEMO_SCRIPT, EVIDENCE.
- Phase 3: docs/DESIGN.md, tokens and fonts, shell with persona switcher, demo script panel, reset, error boundary, section and panel drawings, charts, How this is calculated, inventory, item detail, listings and privacy, browse, listing.
- Phase 5: capture with Assist, priority, match schedule with terms dialog, reuse plan with package panel and negotiation thread, offers and deals (seller), deals with logistics and custody (buyer).
- Phase 6: ledger, model comparison, assumptions, about, the three stubs, demo script panel.
- Phase 2: store, actions, selectors, runDemoStep(1..12), replay test asserting every acceptance-table value (15 tests).
- Phase 1: reference data, engines F1 to F10 and F12 to F14, projections, seed, twin seed; 208 unit tests from 07 pass under TZ=UTC and TZ=Pacific/Auckland; independent review found no formula or data deviation.
- Phase 0: scaffold, pinned dependencies, both builds, lint, vitest, Playwright with the pre-installed Chromium (ladder rung 1), spike passing in both projects, scan script, sample file builder, photo fixture builder.

## Next

1. Deploy the working branch as the Vercel project `tallyard-v1` (docs/HANDOFF.md section 2), open it, and check that `main` and the version 0.5 site are unchanged.
2. Wait for the partner's material (brief 09 section 12, docs/HANDOFF.md section 8): the product name, the office's specification template, the sustainability diagram, the frameworks list and the decision tree, and the consultant's workflow. Each replaces a placeholder named in brief 09.
3. Decide with the user whether and when version 1.0 goes to `main`. Nothing goes to `main` without an explicit go-ahead.
4. Version 2 items stay greyed until asked for: matching an uploaded BIM model or steel schedule against the whole marketplace, and the BIM family download.
