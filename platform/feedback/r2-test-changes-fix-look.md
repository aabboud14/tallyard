# Round 2 test changes: look fixes (fix-look)

Every existing assertion changed in this package, with its reason (P8). No test was skipped, deleted or weakened.

## src/ui/ui.test.tsx

- The status pill text reads 'ShortlistedShortlistedWaiting for approvalApprovedDeclined' instead of '...Sent to clientApprovedDeclined'.
  - Reason: BRIEF 14.1 ("'Waiting on your client' becomes 'Waiting for approval' on every architect surface") and 14.3 ("Labels ... 'Waiting on' become ... 'Waiting for approval'"). The shortlist pill and board column were the last architect surfaces with the old name for the sent state.

## src/store/selectors/views.test.ts

- The shortlist board columns read `['Waiting for approval', 1]` instead of `['Sent to client', 1]`.
  - Reason: as above (BRIEF 14.1 and 14.3).

## src/store/selectors/dashboard-tiles.test.ts

- "counts targets met, below and waiting for a figure" becomes "counts targets on, near and off target and waiting for a figure, in the words of metricState". `targetsMetState` now takes the counts by metric state (`{ good, warning, critical, set }`) and words them as metricState does: 'All on target', '2 near target', '2 off target', '2 with no result yet'. The null case for no targets is unchanged.
- The consultant dashboard's `targetsState` is `{ state: 'critical', label: '2 off target' }` instead of `{ state: 'warning', label: '2 below target' }`.
  - Reason: visual-qa.md section 7 ("If the dashboards or consultant cluster defines targets, it uses this function and these words": On target, Near target, Off target, No target set) and BRIEF 14.2 (states from a pure function, each with an icon and a word). Both Merrowgate targets are more than 10% short, which metricState calls off target; the carbon tile and both meters already said 'Off target' in red while this tile said '2 below target' in amber.

## src/features/home/home.test.tsx

- The Merrowgate content meter's text reads '19.9%. Aim at least 25%. Off target' instead of '... Below target', and the targets tile contains '2 off target' instead of '2 below target'.
  - Reason: as for dashboard-tiles above (visual-qa.md section 7, BRIEF 14.2).
- The "every dashboard" table gains Isla (the client home), with its own tile ids and grid id; the grid check reads the grid and prefix from the table row. The four existing rows and their assertions are unchanged.
  - Reason: shell-dashboards.md D ("The client cluster uses ... ActivityPanel, with panelId 'home-activity-client'"). The client home now uses the shared panel, so the shared checks cover it.

## src/store/selectors/homes.test.ts

- Sallow Court's content `statusText` is 'No result yet' instead of 'No bill of materials yet'.
  - Reason: one phrase for a target with no figure yet across the app (visual-qa.md principle on consistent state words; the Sustainability tab and Goals and targets already say 'No result yet'). The status (`no_data`) is unchanged.

## src/store/selectors/client-dashboard.test.ts

- Isla's reuse aim is 0.25 instead of 0.2, and the test also checks the progress status is 'below'.
  - Reason: BRIEF 14.2 ("`effectiveTargets(state, projectId)` is the one source of project targets for every dashboard"). The tile read the fixed default (20%) while the tracking table on the same page read Merrowgate's 25% override.

## src/store/selectors/sustainability-screens.test.ts

- The client reuse tile is `{ state: 'critical', stateLabel: 'Recycled content off target', aimText: '25%' }` instead of `{ state: 'warning', stateLabel: 'Near target', aimText: '20%' }`, and the ring centre is '80%' instead of '100%'.
  - Reason: BRIEF 14.2 (as above), and the state line now names the figure it judges (recycled content, the line under the 2.4% reuse figure).

## src/features/sustainability/sustainability.screens.test.tsx

- The client home's collapsed activity check reads the shared panel (`activity-panel` with `data-open="false"` and `activity-toggle` with `aria-expanded="false"`) instead of the client's own `home-activity` panel with a hidden child.
  - Reason: shell-dashboards.md D (the client home uses ActivityPanel, whose test ids are `activity-panel` and `activity-toggle`).

## e2e/r2-dashboards.spec.ts

- "every dashboard fits phone, laptop and desktop, with Recent activity collapsed" no longer skips Isla: her four tiles are checked in `client-metrics`, and the activity panel checks run for all five.
  - Reason: shell-dashboards.md D, as above. This adds checks; none is removed.

## Added, not changed

- src/ui/look.test.tsx (new): every class string with `focus-visible:outline-2` also sets `focus-visible:outline-solid` (Tailwind 4's `outline-none` sets the outline style to none); no backdrop blur or gradient fill in the app; flat avatars; thumbnails drawn with meet on an extended ground, the left trees left out under swatches; the flange label set before its dimension line; breadcrumbs keep the current page.
- src/store/selectors/look.test.ts (new): one role name on sign-in and in the organisation switcher; the client reuse tile's aim and state words; no client subheading under a single client filter.
- src/store/selectors/nav-projects.test.ts: a new case for client order with one client filtered in.
- src/store/selectors/dashboard-tiles.test.ts: a new case for `targetStatusText` and new expectations for `targetsNear`, `targetsOff`, the card status texts and `targetsSetText`.
- src/domain/engines/finance.test.ts: a new case for `portfolioAim`.
- src/features/discover/marketplace.screen.test.tsx: a new case, the New for row shows four, then 'Show all {n}' with n the home's count, then 'Show fewer'.
- src/features/home/home.test.tsx: the consultant case also checks the Projects tile line.
- e2e/r2-look.spec.ts (new): Tab focus draws a solid 2 px outline on nav-home, nav-marketplace, nav-projects-menu, account-menu and activity-toggle; 44 px targets in the phone drawer; the Marketplace row reaches the home's count; at 1024 px the current crumb is whole and search is an icon; no backdrop filter with the palette open; the shortlist says 'Waiting for approval'; the client home's shared activity panel and reuse tile.
