# PLAN

Tallyard v0.5 build plan. Phases from brief/01-BRIEF.md section 5.

## Phases

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

Version 1.0, in the order of brief 09 section 10: the store (wish list and project actions, createProject), the folder shell with every route of section 4 resolving and checking `canAccess`, then the role screens (architect first), then the end-to-end journeys of section 9 with P10 and P11, then screenshots. Update `src/test/boundaries.test.ts` when the new feature folders exist.

Earlier note: Tier 1 is complete and deployed from `main` through Vercel's GitHub import (see docs/HANDOFF.md). The working branch carries an unreleasable scaffold for five additions from the founder's notes; start from docs/HANDOFF.md section 8. Tier 2 (brief/08-TIER2.md) is only on request.
