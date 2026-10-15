# Round 2 UI stage, package ui3 (project setup, programme, client approval and Help): test changes

No existing assertion was changed, skipped, weakened or deleted.

## Additions to shared test files

- `src/test/privacy.platform.test.ts`: `buyerViews` also scans `projectVisuals` (every project drawing for the person), and per project `changeClientOptions` and `projectVisual`. These are new view models the project screens read; the existing assertions run over them unchanged.

## New test files

- `src/store/selectors/projects-ui.test.ts`: the programme dialog's lengths and field errors (`programmeDraftView`), suggested stage dates (`suggestedStageStarts`), the requirements summary and card preview, the change client choices, the project drawings, and the Help methodology notes.
- `src/features/projects/projects.screen.test.tsx`: the overview led by the programme chart (8 stage bands, today labelled with the planned stage, the check pill), the collapsed recent activity, the From today range, read-only for the client; a new project's setup checklist, link banner, suggested dates and Keep these dates; the programme dialog's field errors; the requirements dialog; Team and the projects list while the client has not accepted; the shortlist banner with sending closed; the new project dialog (Other with its description, local authorities by region, the requirements picker, a full create, a date error on site start); Project requests (accept, decline with a note, empty state); Help, Version 2 and Methodology.
- `e2e/r2-projects.spec.ts`: a new project waits for the client to accept (design K): Priya creates Corbel Yard for Lantern Quay Developments, sees the banner, the setup checklist and the programme, confirms the suggested dates; Isla accepts on Project requests; the overview fits 390 px; Priya sees "Lantern Quay Developments accepted Corbel Yard".

## Unchanged and still green

- `e2e/journeys.spec.ts`: the new practice journey fills `project-start` on the short form, which is now labelled Site start; the materials date defaults to it, so the journey is unchanged.
- `src/app/app.test.tsx`: no change needed.
