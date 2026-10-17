# Recording audit follow-up: merge of the seven packages

The seven `r2f-*` branches were merged into the working branch in this order: owner, client_consultant, requirements, market, look, programme, upgrade. Each package's own notes and changed assertions are in its `r2f-<key>.md`. This file lists only what the merge itself changed.

## Changed assertions

- `src/features/buildings/audit-owner.screen.test.tsx`, "edits the region and local authority of Ambrey House": the test finds the region and local authority selects by `edit-building-region` and `edit-building-local-authority` instead of `edit-region` and `edit-local-authority`. The owner package (note 26) and the requirements package (major finding 1) both rebuilt the location fields of Edit building details. The merge keeps the requirements package's shared, grouped `RegionField` and `LocalAuthorityField`, which check that a listed authority sits in its region, plus the owner package's Postcode district field and its rule that the surveyor may edit a building her firm added. A select carries one test id, so the owner test uses the shared one. The steps and the values it checks (Inner London West, Wandsworth, the postcode field present, both saved) are unchanged.

No other assertion changed. The full unit suite (143 files, 1596 tests) and the 59 end-to-end journeys pass.

## Integration fixes

- Surveyor home survey steps (owner note inc-steps, look incidental): the owner package began a building the firm added itself with an open "Owner confirms" step; the look package renamed its first step "Added". The merged steps for such a building read Added (done), Owner confirms (current while the request waits), Capturing, Submitted. An appointed building keeps Appointed, Capturing, Submitted.
- Surveyor home tiles: the look package's first run (no buildings at all) leads with the first steps; otherwise the owner package's contractor tiles show for a firm that only dates buildings, and the survey tiles for every other firm.
- Steel illustrations (market note 10 and its UC fix, look note 1(e)): Marketplace cards draw the look package's end view to a common scale. The material page keeps the axonometric, with the market package's upright UC and plain stage, on its stage and on its gallery thumbnails, which preview the stage (a new `axo` option on `MaterialImage`).
- Architect home "{n} new materials fit" link: the look package's new card line uses the market package's `newFitsHref`, so it still lands on the New for {project} row.
- Client next steps (look note 23, client_consultant note C2): a consultancy asked to join and not yet answered now counts as on the team in `nextStepsEmptyFor`, so the client is not told to have one added; a declined consultancy does not count. This keeps the look test's intent now that a consultancy is only named once it joins.
- Consultant first run (look note 3, client_consultant note C2): the first step now says the project appears once the consultancy accepts the request, and the pending requests card sits above the first run.
- Project overview (programme note 19, client_consultant note 42): the programme card and the setup checklist lead every overview; the consultant's own overview section follows them, then the cards.
- Client link banner (programme note 19, market note 6, client_consultant note C3): the programme package's one-sentence inline banner with the market package's neutral envelope icon, and the client_consultant invite row below it.
- Sign-up (client_consultant note C3, upgrade minor finding): the form takes both the invited-email check and the email typed at sign-in.
- Sign-in and invites (owner note 28, client_consultant note C3): accepting an invite resolves contractor invites waiting for the email and tells the practice that asked that the new member can accept the project.

## Late commits merged after the usage limit

The first merge took the programme and upgrade branches at ae4297a and 150891b. Their final commits were merged afterwards in the same way: r2f-programme at 961d000 (the plot is a labelled group, so screen readers reach the stage band buttons) and r2f-upgrade at da275bf (date-proof upgrade test, sign-in hints that fit, the 30 day window, a checking link in Help, no notice for accounts made after the update). Both merged without conflicts and needed no integration fix. No assertion changed in the merge; the assertions those commits changed are logged in `r2f-programme.md` and `r2f-upgrade.md`. After them the full unit suite (143 files, 1610 tests) and the 60 end-to-end journeys pass.
