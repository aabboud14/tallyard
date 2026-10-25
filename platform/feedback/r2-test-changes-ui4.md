# Round 2, UI package 4 (donor buildings, new projects, surveyors, testing, contractors and share links): test changes

No existing assertion was changed, skipped or deleted. `src/app/app.test.tsx` and `e2e/journeys.spec.ts` are untouched.

New tests, all additive:
- `src/store/selectors/buildings-ui.test.ts`: the building drawing, the holds chart scale, the structure form, the Requests page tabs, the contractor's draft dates and the testing results form.
- `src/features/buildings/buildings.screen.test.tsx`, `src/features/capture/capture.screen.test.tsx`, `src/features/links/links.screen.test.tsx`, `src/features/requests/requests.screen.test.tsx`, `src/features/auth/signup-labels.test.tsx`: the screen tests of design 14.4.11.
- `e2e/r2-owner-surveyor.spec.ts`: the five journeys of design 14.4.11.

One harness setting changed: `vite.config.ts` sets `testTimeout` to 30 seconds. The heavier privacy and screen tests pass in two to three seconds alone but exceeded the default five seconds while several checkouts ran on the same machine. No assertion depends on it.
