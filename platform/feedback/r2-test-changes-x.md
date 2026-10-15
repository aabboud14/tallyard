# Round 2 test changes, worktree x (marketplace engines)

Each line is one changed assertion. Reason for all four: BRIEF 14.3 "Availability text in the specification export reads 'Expected January to March 2027' instead of a quarter", recorded in `feedback/r2-design/marketplace-material.md` section 3.2 (quarter labels go; `availabilityText` returns `availabilityPhrase(...).text`).

- `src/domain/engines/specSheet.test.ts` line 28: `availabilityText(L-9F4CQQ)` expected `Available from Q1 2027`, now `Expected January to March 2027`.
- `src/domain/engines/specSheet.test.ts` line 29: `availabilityText(L-6DN4K3)` expected `Available from November 2026`, now `Expected November 2026`.
- `src/domain/engines/specSheet.test.ts` line 84: the Availability row of `specSheetRows(L-9F4CQQ)` expected `Available from Q1 2027`, now `Expected January to March 2027`.
- `src/store/selectors/views.test.ts` line 237: the publish draft preview `availabilityText` for TH-07 expected `Available from Q2 2027`, now `Expected April to June 2027` (confirmed by running).

## Shell and marketplace data layer (second pass in worktree x)

Each line is one changed assertion, with the spec change behind it. Assertions that were only added are not listed.

- `src/store/selectors/views.test.ts`, Discover "filters by typology ...": `discoverView(..., { sort: 'price' })` expecting `sort` `newest` and a price sort hint now runs as Isla instead of Priya. BRIEF 14.3 "the price sort is for clients" (marketplace-material.md 5.3).
- `src/store/selectors/views.test.ts`, same test: `discoverView(..., { sort: 'price', family: 'steel_section' }).sort` expecting `price` now runs as Isla instead of Priya (Priya now gets `newest`, asserted as an addition). Same reason.
- `src/store/selectors/views.test.ts`, "shows public facts ...": Priya's `m.sellerLine` expected `Listed by an asset owner in Central London`, now `null`; the old string is asserted for Isla. BRIEF 14.3 "The architect's material view has no price or seller line".
- `src/store/selectors/views.test.ts`, same test: Priya's `m.price.range` expected `£715 to £825 per tonne`, now `m.price` is `null`; the range is asserted for Isla. Same reason.
- `src/store/selectors/views.test.ts`, same test: `m.geometry` expected `{ dxf: true, obj: true, reason: null }`, now `{ dxf: true, obj: true, ifc: true, reason: null }`. BRIEF 14.1, the IFC4 download (marketplace-material.md 5.3).
- `src/store/selectors/views.test.ts`, architect home: `h.waitingOnClient` is now `h.waitingForApproval`, same expected projects. BRIEF 14.3 "Waiting on" becomes "Waiting for approval" (shell-dashboards.md E1 renames the field).
- `src/store/selectors/views.test.ts`, sidebar: Priya's titles expected `['Home', 'Discover', 'Saved']` and projects `Merrowgate Wharf, Sallow Court, Ferrymoor Yard`, now `['Home', 'Marketplace', 'Saved']` and `Ferrymoor Yard, Merrowgate Wharf, Sallow Court`. BRIEF 14.3 "Discover becomes Marketplace" and "The sidebar orders projects by name".
- `src/store/selectors/views.test.ts`, sidebar: Marcus's projects expected `Merrowgate Wharf, Sallow Court, Ferrymoor Yard`, now `Ferrymoor Yard, Merrowgate Wharf, Sallow Court`. BRIEF 14.3 "The sidebar orders projects by name".
- `src/store/selectors/views.test.ts`, command palette: `searchEntries(priya, 'discover')[0].href` expected `/app/discover`, now `/app/marketplace`. BRIEF 14.1, the Marketplace address moves (shell-dashboards.md A3).
- `src/store/selectors/views.test.ts`, command palette: the material hrefs `/app/discover/L-MNY55K` (present) and `/app/discover/L-DAXNV3` (absent) are now `/app/marketplace/...`. Same reason.
- `src/store/selectors/arch-selectors.test.ts`, checkingProjectFor "defaults to the first project the viewer works on" expected `MERROWGATE_ID`, now "defaults to no project" expecting `null`. BRIEF 14.3 "`checkingProjectFor` defaults to no project".
- `src/store/selectors/arch-selectors.test.ts`, Isla with `FERRYMOOR_ID` in the address expected `MERROWGATE_ID`, now `null`. Same reason.
- `src/store/selectors/arch-selectors.test.ts`, pageLocation: `/app/discover/L-9F4CQQ` crumbs expected `['Discover', ...]`, now `/app/marketplace/L-9F4CQQ` with `['Marketplace', ...]`; the old path is kept as a legacy check with the same crumbs. BRIEF 14.3 label rename and 14.1 address move.
- `src/store/selectors/arch-selectors.test.ts`, searchResults: material href expected `/app/discover/L-Q23X7N`, now `/app/marketplace/L-Q23X7N`. BRIEF 14.1 address move.
- `src/store/actions/owner.test.ts` line 33: the new-fit notification href expected `/app/discover/${publicId}`, now `/app/marketplace/${publicId}`. BRIEF 14.1 address move (shell-dashboards.md A3).
- `src/app/app.test.tsx`, helpers: `isActive('/app/discover/L-9F4CQQ', '/app/discover', null)` is now `isActive('/app/marketplace/L-9F4CQQ', '/app/marketplace', null)`, still true. Shell-dashboards.md A3.
- `src/app/app.test.tsx`, "lists the projects as folders ...": `results-line` expected to contain `Timeline checked against Merrowgate Wharf`, now expected not to (no project by default); the original sentence is asserted in a new test that opens `?project=` Merrowgate. BRIEF 14.3 "`checkingProjectFor` defaults to no project".
- `src/app/app.test.tsx`, the Marketplace screen tests open `/app/marketplace`, `/app/marketplace?tab=shared` and `/app/marketplace/L-9F4CQQ` instead of the `/app/discover` paths. BRIEF 14.1 address move.
- `src/app/app.test.tsx`, material page: Priya's `seller-line` expected `Listed by an asset owner in Central London`, now absent; the line is asserted for Isla in a new test. BRIEF 14.3 "The architect's material view has no price or seller line".
- `e2e/journeys.spec.ts`: `nav-discover` is now `nav-marketplace`, the material URL `**/app/marketplace/L-9F4CQQ**`, the new practice opens `/app/marketplace`, and the phone test is renamed "Marketplace and Capture fit a phone" with `/app/marketplace` paths. Shell-dashboards.md A3.
