# Round 2 test changes, UI stage: shell sidebar and dashboards (ui1)

No existing assertion was changed, skipped, deleted or weakened. The existing tests in `src/app/app.test.tsx`, `e2e/journeys.spec.ts`, `src/store/selectors/homes.test.ts` and `src/store/selectors/views.test.ts` pass unchanged.

To keep `homes.test.ts` as it is, the surveyor dashboard draws the firm's buildings not yet linked in a new field, `unlinkedExtras`, instead of adding them to `extras`, whose keys that test pins to the appointed buildings. The consultant's `targetsSet` keeps its meaning (targets that are set, with or without a figure); the new `targetsBelow` and `targetsWaiting` split the unmet ones.

New tests:
- `src/store/selectors/dashboard-tiles.test.ts`: the tile states (`fitState`, `waitingState`, `programmeState`, `targetState`, `targetsMetState`, `awaitingState`) and the new dashboard fields for the architect, owner, surveyor and consultant.
- `src/features/home/home.test.tsx`: every home through the real router (four tiles, named drawings, Recent activity collapsed with its summary, no forbidden characters, no seller-private string), plus each role's own sections.
- `src/app/sidebar/sidebar.test.tsx`: projects by name by default, client order with client subheadings, the client filter and its chip, the choice kept in the store, and the owner's and surveyor's round 2 nav items.
- `e2e/r2-dashboards.spec.ts`: every home at 390, 1024 and 1440 px with no horizontal scroll and Recent activity collapsed; the sidebar menu on a desktop and in the phone drawer (36 px button); the architect's "new materials fit" link into the Marketplace; the first-run welcome; the surveyor's Capture action.
