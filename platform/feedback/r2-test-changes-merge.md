# Round 2 test changes, merge of streams X and Y

Each line is one changed assertion, with the spec change behind it. Assertions that were only added are not listed. Both streams' own changes are in `r2-test-changes-x.md` and `r2-test-changes-y.md`; these are the ones the merge needed because the two streams implement different notes on the same screens.

## Merge of r2-y onto r2-x

- `src/app/app.test.tsx`, material page, Priya: stream Y changed the `seller-line` text to 'Listed by a donor building owner in Central London'; stream X removed the line for architects. Kept X's assertion that Priya sees no `seller-line` and no `guide-price`. BRIEF 14.3 "The architect's material view has no price or seller line".
- `src/app/app.test.tsx`, "shows the client the seller line and the guide price" (added by X for Isla): `seller-line` expected 'Listed by an asset owner in Central London', now 'Listed by a donor building owner in Central London'. BRIEF 14.1 "The owner role reads Donor building owner" (owner-surveyor.md 14.4.1, public seller wording).
- `src/store/selectors/views.test.ts`, "shows public facts ...": Priya's `m.sellerLine` stays `null` (X); Isla's `isla.sellerLine` expected 'Listed by an asset owner in Central London', now 'Listed by a donor building owner in Central London'. Same two reasons as above. `isla.location.seller` stays 'Asset owner' (the stored type, unchanged by Y).
- `src/store/selectors/views.test.ts`, "builds each role sidebar with badges": Tom's and Dana's rows take Y's ('Donor buildings'; Home and Capture, then 'Not yet linked' and 'Add building'); Priya's and Marcus's take X's name order. Both streams' reasons stand (BRIEF 14.1 owner and surveyor sidebars; BRIEF 14.3 "The sidebar orders projects by name").
- `src/store/selectors/owner-surveyor.selectors.test.ts`, "gives the owner Donor buildings with Recovery plan, then New projects and the marketplace once it has one": Tom's main items expected `['Home', 'Discover']`, now `['Home', 'Marketplace']`. BRIEF 14.3 "Labels Discover ... become Marketplace" (shell-dashboards.md A3; owner-surveyor.md 14.4.8 named "the marketplace cluster's label").
- `src/store/selectors/projects-timeline.test.ts`, "the sidebar shows Project requests while one waits, and the route is the client's": after Isla accepts Corbel Yard, her projects expected `['Merrowgate Wharf', 'Corbel Yard']`, now `['Corbel Yard', 'Merrowgate Wharf']`. BRIEF 14.3 "The sidebar orders projects by name". The Project requests item still follows the project folders.
- `src/store/selectors/projects-timeline.test.ts`, "draws Merrowgate Wharf's whole programme for Priya": each material row `href` expected `/app/discover/${publicId}`, now `/app/marketplace/${publicId}?project=${MERROWGATE_ID}`. BRIEF 14.1 "Its address moves to /app/marketplace" (shell-dashboards.md A3: every href goes through `store/paths.ts`); the programme belongs to one project, so the material page opens checked against it, as every other project link to a material does.

Added, not changed: `src/domain/sketch.test.ts` (the frame from the recorded frame element), `src/store/selectors/homes.test.ts` (owner card kinds and New project cards; the planned stage on architect and consultant cards), and `/app/marketplace` route checks beside the `/app/discover` ones in `owner-surveyor.selectors.test.ts`.

## End-to-end journeys

No assertion changed. After both merges `npm run e2e` passes all four journeys in `e2e/journeys.spec.ts` as stream X left them (the Marketplace address and label, the old Discover redirect, the phone check).

## Merge of r2-z onto the X and Y merge

Stream Z's own changes are in `r2-test-changes-z.md`. These are the assertions the merge changed, because Z's Kilnworth Place, Sustainability tab and effectiveTargets meet X's name order and dashboards and Y's owner New projects.

- `src/store/selectors/views.test.ts`, "builds each role sidebar with badges": Isla's projects, Z's `['Merrowgate Wharf', 'Kilnworth Place']`, now `['Kilnworth Place', 'Merrowgate Wharf']`. BRIEF 14.3 "The sidebar orders projects by name". Because Merrowgate Wharf is no longer the first item, the test finds it by label instead of `items[0]` before checking Z's tab list and badges, which are unchanged. Priya's, Tom's, Dana's and Marcus's rows and Tom's Requests badge of 2 keep the X and Y merge's values.
- `src/store/selectors/views.test.ts`, "groups notifications by day with relative times and per-person read state": Tom's notification settings gain `'sustainability'` at the end. BRIEF 14.1 "A New project is a Project on which the owner organisation is the client"; as the client of its New project the owner gets the client's Sustainability and Requirements tabs, and Z's sustainability notifications go to the client organisation, so the owner can turn them off like the client (the same reasoning stream Y used for `sent_to_client`).
- `src/store/selectors/projects-timeline.test.ts`, "the sidebar shows Project requests while one waits, and the route is the client's": Isla's items, Z's `['Merrowgate Wharf', 'Kilnworth Place', 'Project requests']`, now `['Kilnworth Place', 'Merrowgate Wharf', 'Project requests']`, and after accepting, Z's `['Merrowgate Wharf', 'Kilnworth Place', 'Corbel Yard']` and X's `['Corbel Yard', 'Merrowgate Wharf']`, now `['Corbel Yard', 'Kilnworth Place', 'Merrowgate Wharf']`. BRIEF 14.3 "The sidebar orders projects by name" with BRIEF 14.2 Kilnworth Place seeded.
- `src/store/actions/owner.test.ts`, "publishes a lot, notifies architects whose projects it fits, and never names the owner": keeps Z's check that exactly Studio Oriel and Tessaly Architects hear of TH-07, with X's href `/app/marketplace/${publicId}` in place of Z's `/app/discover/${publicId}`. BRIEF 14.1 "Its address moves to /app/marketplace" (every href through `store/paths.ts`).
- `src/store/selectors/owner-surveyor.selectors.test.ts`, "appear in the list, the home and the options": the owner's architect options, `[Studio Oriel]`, now `[Studio Oriel, Tessaly Architects]`. BRIEF 14.2 seeds Tessaly Architects with Kilnworth Place, and BRIEF 14.1 lets owners appoint an architecture practice to a New project; Tessaly is one.
- `src/store/selectors/owner-surveyor.selectors.test.ts`, "gives the owner Donor buildings with Recovery plan, then New projects and the marketplace once it has one": the New project's tabs, `[..., 'Specification', 'Carbon']`, now `[..., 'Specification', 'Sustainability', 'Requirements']`. BRIEF 14.2 "Sustainability tab ... with /carbon redirecting there" and client-consultant.md 11 (the client's tabs); the owner is the client of its New project. Added route checks: the owner opens sustainability, requirements and carbon, and is refused the consultant's targets, certification, statement and compliance.
- `src/store/selectors/dashboard.test.ts`, "finds the next start on site, ties by name": over every seeded project the next start is now 'Kilnworth Place', not 'Ferrymoor Yard'. BRIEF 14.2 seeds Kilnworth Place, which starts on site first. Added: over Studio Oriel's projects it is still 'Ferrymoor Yard'.
- `src/store/selectors/homes.test.ts`, "reads each project against its targets": the Merrowgate card links, `['carbon', 'compliance']`, now `['sustainability', 'targets', 'certification']`. BRIEF 14.2 (Carbon becomes Sustainability) and client-consultant.md, open questions: "Show only Sustainability, Goals and targets and Certification on the consultant home cards. The sidebar folder shows all of them."
- `src/store/selectors/homes.test.ts`, same test: Sallow Court's content row, `no_target` and 'No target set', now `no_data` and 'No bill of materials yet' with a target of 20.0%; `targetsSet` 2 now 4 and `withTargets` 1 now 3 (`carbonTargetT` stays 150). BRIEF 14.2 "`effectiveTargets(state, projectId)` is the one source of project targets for every dashboard" and shell-dashboards.md E5 ("Targets are read through effectiveTargets"); client-consultant.md gives Sallow Court the 20% content default from the requirements that apply to it, as it does Ferrymoor Yard. Added: Sallow Court's carbon row is still `no_target`.

Code changes at the seams, not test changes: `home-consultant.ts` reads targets through `effectiveTargets` and links its cards to Sustainability, Goals and targets and Certification; Z's local thumbnail type in `client-dashboard.ts` is renamed `ClientThumb`, because X's `thumbsOf` takes shortlist rows and the client's cards also show earlier deals that have no listing; the `sustainability` notification kind lists owners among its roles; `playwright.config.ts` reads an optional `PW_PORT` so two checkouts can run journeys at once (default 4175).

### End-to-end journeys

No assertion changed. After the merge `npm run e2e` passes all four journeys in `e2e/journeys.spec.ts`.

## Merge of r2-w (design system) onto the X, Y and Z merge

No existing assertion changed in this merge. Three files conflicted:

- `src/domain/sketch.ts` and `src/domain/sketch.test.ts`: r2-w carried the copy of stream X's first version. The merged branch's later version wins (it adds `frameOfBuilding` and the optional `structure` from the X and Y merge) and is a strict superset of r2-w's, so r2-w's tests all stand and the frame element test is kept.
- `src/features/public/Landing.tsx`: the branch had only renamed labels in the old page (Marketplace, Donor buildings, Recovery plan, donor building owner); r2-w rewrote the page with the same words in `landingContent.ts`. Took r2-w's page and checked that no Discover, Priorities or asset owner wording is left.

The landing role heading in `src/features/public/public.test.tsx`, "names every role and the three steps", 'Asset owners', now 'Donor buildings', was changed identically on both sides before the merge (BRIEF 14.1 "The owner role reads Donor building owner"; r2-w's own commit records it), so git took it without a conflict.

Added, not changed: `src/domain/engines/chartScale.test.ts` (`niceMax`, `ticks`) and `src/domain/engines/metricState.test.ts` (`metricState`, `metricReading`, the state words), with every case in visual-qa.md section 7, plus r2-w's `charts.test.tsx`, `round2.test.tsx`, `massing.test.ts`, `tokens.test.ts` and its landing and sign-in tests.

Code at the seams: `MetricState` and the state words now live in `src/domain/engines/metricState.ts`; `src/ui/labels.ts` re-exports the type and builds `METRIC_STATE` from those words, so the domain and the tiles cannot drift. `src/app/AppShell.tsx` uses the `bg-canvas` token in place of `bg-[#f4f3f1]` (visual-qa.md section 4).

### End-to-end journeys

No assertion changed. After the merge `npm run e2e` passes all four journeys in `e2e/journeys.spec.ts`.

## Merge of the round 2 review fixes (Marketplace, projects, owner and surveyor) onto the look fixes

No existing assertion changed in these three merges; every test from both sides of each conflict is kept. The client and consultant fixes had no commit of their own yet and were not merged.

- r2-fix-marketplace: conflicts in `Discover.tsx`, `NewForProjectsRow.tsx`, `MaterialPage.tsx`, `store/selectors/discover.ts`, `ui/Badge.tsx` and `ui/Breadcrumbs.tsx`. Both branches had built Show all for New for your projects with the same test id; the look branch's feed and control stand, with the Marketplace branch's 44 px phone height and its reset on a change of project. Breadcrumbs: from sm the current page keeps its width and does not shrink (look test); on a phone the parent link keeps 44 px and the current page truncates (Marketplace e2e).
- r2-fix-projects: conflicts in `Sidebar.tsx`, `ProgrammeCard.tsx` and `Shortlist.tsx`, all class strings, resolved with both sides' classes. Two seams with the Marketplace fixes failed the gate and were fixed in code: `ProgrammeChart` takes a material `href` of string or null (a lot the viewer cannot open), and the new label-column link and checklist step link carry `focus-visible:outline-solid` (the look test).
- r2-fix-owner_surveyor: conflicts in `projects/Overview.tsx` (the appoint card and the projects branch's banner rule both kept) and `projects.screen.test.tsx` (both new describe blocks and both sets of imports kept).

### End-to-end journeys

No assertion changed. After the merges `npm run e2e` passes all 28 tests.
