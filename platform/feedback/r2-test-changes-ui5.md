# Round 2 test changes: client and consultant screens (ui5)

Every existing assertion changed in this package, with its reason (P8). No test was skipped, deleted or weakened.

## src/features/compliance/exports.test.ts

- "holds the summary, bill of materials, reused items, mapping and assumptions with cached results" is renamed to "holds the summary, bill of materials, reused items, targets, requirements, mapping and assumptions with cached results". The expected sheet list gains 'Targets' and 'Requirements' before 'Certification mapping'.
  - Reason: client-consultant design sections 7.9 and 11 ("compliance/exports.test.ts: the sheet list adds 'Targets' and 'Requirements' before 'Certification mapping'"). The workbook is now built from the `complianceWorkbook` selector, so the certification mapping comes from the tracked credits.
- Both cases build the workbook from `complianceWorkbook(state, viewer, projectId)` (src/store/selectors/compliance-workbook.ts) in place of `complianceWorkbookModel` from roles-views.ts.
  - Reason: design 5.6 and 7.9 switch the compliance page and its export to the compliance workbook selector. The other expectations (the Summary formula, cached results, no seller-private string, no forbidden character) are unchanged.

## Added, not changed

- src/domain/engines/statement.test.ts: a new case, 'does not repeat "no result yet" for a goal without a result'. The targets section used to read "target 95%, now No result yet, no result yet." The existing expectation for a goal with a result is unchanged.
- src/features/sustainability/sustainability.screens.test.tsx (new, 16 cases): the client home, approvals and reservations figures, the Sustainability tab for the client, the architect and the consultant, the statement review from the client's side, the /carbon redirect, Requirements for the client and the architect, Goals and targets (override, reset, a refused value), Certification (scheme, view, suggestion, grid, targeted switch) and the statement (edit, send, Word download, consultant only).
- src/store/selectors/sustainability-screens.test.ts (new): the pure functions behind those screens.
- e2e/r2-sustainability.spec.ts (new): the journey from design section 11. Two steps differ from the design's wording because of the seed: WELL X01 is already at risk in the seed, so its status equals its suggestion and no "Use suggestion" button shows; Marcus uses the suggestion on X02 instead. L-NHZ32R is already in X07 by the rule, so in the By material grid he adds it to X01.
