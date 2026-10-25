# Round 2 test changes: owner and surveyor fixes (fix-owner_surveyor)

Every existing assertion changed in this package, with its reason (P8). No test was skipped, deleted or weakened. New tests were added for each fix; they are listed at the end.

## The blind buyer line drops the quarter label

- `src/domain/privacy/privacy.test.ts`: `blindBuyerText` reads 'Design team, commercial project, Inner London East, needed April to June 2028' instead of '... needed by Q2 2028'. The key list `['needByQuarter', 'orgType', 'projectType', 'region']` is unchanged.
- `src/test/journeys.test.ts`, `src/store/actions/reservations.test.ts`, `src/store/actions/owner.test.ts`, `src/store/selectors/roles.test.ts`, `src/store/selectors/views.test.ts`: every blind buyer line reads the window in words ('needed January to March 2028', 'needed April to June 2027', 'needed January to March 2027', 'needed April to June 2028') instead of 'needed by Q1 2028' and so on.
  - Reason: BRIEF 14.3, last bullet: "Quarter labels go on every surface, the seller side included: the blind buyer line 'needed by Q2 2028' becomes 'needed April to June 2028'. It is the same three-month window, so `toBlindBuyer` discloses nothing more; its tests change to the new wording." The partner's review of 14 October asked for it, and the round 2 review found the seller side still showed quarters.

## Surveyor building folders in the sidebar list Overview first

- `src/store/selectors/owner-surveyor.selectors.test.ts`, "gives the surveyor Capture and the unconfirmed buildings": Ambrey House's children are `['Overview', 'Capture', 'Inventory', 'Testing']` instead of `['Capture', 'Inventory', 'Testing']`.
- Same file, "gives a contractor its Availability tab": the contractor's Tiverne House reads `['Overview', 'Availability']` instead of `['Availability']`, and Dana's reads `['Overview', 'Capture', 'Inventory', 'Testing', 'Availability']` instead of the same list without Overview.
  - Reason: owner-surveyor.md 14.4.8 says each surveyor building's children "follow its side", and 14.4.7 gives the surveyor side Overview, Capture, Inventory, Testing (plus Availability), and the contractor side Overview, Availability. The owner's folders already list Overview first. The round 2 review found the surveyor's folders left it out, although the Owner card, Delete building and the Structure card live only there.

## Decisions taken with these fixes

- `BlindBuyer.needByQuarter` keeps its name so the projection's field set is unchanged (the privacy tests pin it); it now holds the three-month window in words, from `needByWindowText` in `src/domain/privacy/blindBuyer.ts`.
- The owner's disclosure control reads 'Three-month window' and 'Month' (stored `TimingLevel` values unchanged), as marketplace-material.md's open questions recommend. The help line, the ListingEditor hint, the reset toast and the disclosure note 'Region and three-month window only.' follow.
- An owner's New project with no architect: the Team tab lists only the client and shows an 'Appoint an architect to start sourcing' card; the overview shows the same card at the top (owner-surveyor.md 14.4.9 section 4), a first next step 'Appoint an architect to start sourcing', 'Not appointed yet' for the architect in the details and the header, and the requirements card says 'Appoint an architect to choose which requirements apply.' The appoint dialog moved from BuildingsList into `features/projects/AppointArchitect.tsx`, shared by all three.
- The overview's Building card no longer repeats the structure summary; `buildingOverview.facts` keeps the Structure row as the design says, and the card reads the new `cardFacts`, which leaves it to the Structure card beside it.
- The surveyor home's Items captured counts the firm's items at buildings not yet linked and the last capture reads them too, with the sub-line 'including 2 at a building not yet linked'. Surveys open still counts appointments (as the dashboard tile test holds) and adds 'Plus 1 at a building not yet linked'.

## Tests added

- `owner-surveyor.selectors.test.ts`: no-architect header, team, next step and requirements, and their state after appointing; nobody else may appoint; the Building card's facts leave out the structure; the link page title and breadcrumb for the owner's preview.
- `projects.screen.test.tsx`: the appoint card on the overview and on Team, appointing from each.
- `homes.test.ts`: the surveyor home with the unlinked building's items, last capture and open survey.
- `buildings-ui.test.ts`: 'Facade', 'Facade 2', 'Facade 3' row labels in the structure editor.
- `privacy.test.ts`: the need-by window in words for each quarter, and no quarter label in the projection.
- `e2e/r2-owner-surveyor.spec.ts`: the no-architect project at 390, 1024 and 1440 px, appointing from the overview; the owner inventory with no horizontal scroll, in the page or in the table, at 1024, 1280 and 1440 px.
