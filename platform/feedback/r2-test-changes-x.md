# Round 2 test changes, worktree x (marketplace engines)

Each line is one changed assertion. Reason for all four: BRIEF 14.3 "Availability text in the specification export reads 'Expected January to March 2027' instead of a quarter", recorded in `feedback/r2-design/marketplace-material.md` section 3.2 (quarter labels go; `availabilityText` returns `availabilityPhrase(...).text`).

- `src/domain/engines/specSheet.test.ts` line 28: `availabilityText(L-9F4CQQ)` expected `Available from Q1 2027`, now `Expected January to March 2027`.
- `src/domain/engines/specSheet.test.ts` line 29: `availabilityText(L-6DN4K3)` expected `Available from November 2026`, now `Expected November 2026`.
- `src/domain/engines/specSheet.test.ts` line 84: the Availability row of `specSheetRows(L-9F4CQQ)` expected `Available from Q1 2027`, now `Expected January to March 2027`.
- `src/store/selectors/views.test.ts` line 237: the publish draft preview `availabilityText` for TH-07 expected `Available from Q2 2027`, now `Expected April to June 2027` (confirmed by running).
