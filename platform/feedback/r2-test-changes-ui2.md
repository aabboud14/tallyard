# Round 2 UI stage, Marketplace and material page (ui2): changed assertions

Every existing assertion changed in this stage, with the reason. No test was skipped, deleted or weakened (P8).

## src/app/app.test.tsx

1. "shell and Marketplace" > "checks the cards against a project named in the address"
   - Before: `byTestId('results-line').textContent` contains `Timeline checked against Merrowgate Wharf`.
   - After: `byTestId('checking-bar').textContent` contains `Checking against Merrowgate Wharf`.
   - Reason: `feedback/r2-design/marketplace-material.md` section 7.1 items 2 and 7, and BRIEF 14.1 ("Checking against becomes a visible strip"). The results line loses the "Timeline checked against" sentence, which moves to the checking strip as "Checking against {project}". The assertion still proves that a project named in the address is the one every card is checked against.

No other existing assertion changed. `e2e/journeys.spec.ts` is unchanged and passes as it stands.

## Shared files edited (not test assertions)

- `src/store/selectors/discover.ts`: `DiscoverView` gains `projectSketch` (the checked project's drawing for the strip) and `canCreateProject`. `materialView.keyFacts` now follows the design order (Quantity, Mass, Condition, Test status, Location, Collection point); availability has its own section on the page.
- `src/store/selectors/marketplace.ts`: new pure `checkingProjectSketch(state, viewer, projectId)`.
- Both are covered by the new `src/store/selectors/marketplace-checking.test.ts`. No `src/ui` component was changed.
