# PLAN

Tallyard v0.5 build plan. Phases from brief/01-BRIEF.md section 5.

## Phases

- [x] 0. Set up and plan: git, scaffold, pinned dependencies, both builds, lint, unit tests, Playwright, spike
- [ ] 1. Domain: reference data, engines F1 to F10 and F12 to F14, privacy projections, seed, twin seed
- [ ] 2. Store and demo replay
- [ ] 3. Shell and first slice: tokens, shell, role switcher, reset, panel, inventory, listings and privacy, browse, listing
- [ ] 4. Compliance wedge: project compliance, bill import, waste dashboard, both workbooks, print
- [ ] 5. Marketplace path: capture, priority, matcher, plan, negotiation, offers and deals, logistics, custody
- [ ] 6. Operator and shared: ledger, model comparison, assumptions, about, demo script panel, stubs
- [ ] 7. Hardening: full e2e, layout checks, screenshots, README, DEMO_SCRIPT, EVIDENCE

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

- Phase 0: scaffold, pinned dependencies, both builds, lint, vitest, Playwright with the pre-installed Chromium (ladder rung 1), spike passing in both projects, scan script, sample file builder, photo fixture builder.

## Next

Phase 1: domain engines and tests from brief/07-EXAMPLES.md.
