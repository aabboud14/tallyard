# Round 2 notes for the UI stage

Collected from the data-layer streams and merges. Read with BRIEF section 14 and the designs in r2-design/.


## x2: view models, actions and placeholders

Placeholders: none

Not done (for the UI stage): 
- React screens were not redesigned (later UI stage): category folders, checking strip, NewForProjectsRow, availability slider, ModelViewer, IFC download button, dashboard tiles, CollapsiblePanel and ActivityPanel, sidebar ProjectsMenu, thumbnails, landing
- arch-new.ts and NewForProjectsView from shell-dashboards E2 were not created; BRIEF 14.2 makes newForProjectsFeed in marketplace.ts the single feed
- STATE_VERSION was not bumped to 2 (BRIEF 14.2). It was not in my brief and would collide with other worktrees. The new navProjects field is optional and filled in on rehydrate, so no bump is needed for this change
- Welcome-step copy on the architect home ('Send your shortlist for approval') was left for the UI stage because it belongs to the E1 layout, not the A2 rename table
- e2e was not run (not part of npm run check); only its selectors were updated
- docs/DECISIONS.md was not updated: the platform has no docs folder in this worktree. The spec changes are recorded in feedback/r2-test-changes-x.md

No placeholder pages were needed: the marketplace routes reuse the existing Discover and MaterialPage components.

View models ready for the UI:
- architectHome (src/store/selectors/architect.ts): metrics, projects[].sketch, materials, fits, fitTone, newFits, marketplaceHref, carbonByProject, carbonScaleMax, waitingForApproval[].card (may be null), activitySummary. newForProjects is kept but the home should no longer render the feed; ArchitectHome.tsx still shows it until you replace it.
- ownerDashboard, surveyorDashboard, consultantDashboard: in src/store/selectors/home-owner.ts, home-surveyor.ts and home-consultant.ts. ownerDashboard.requestThumbs is keyed by request id.
- discoverView adds landing, folders, familyChips, fitSummary, newForProjects (at most 4), sortOptions, availability and availableByLabel.
- materialView adds availability.phrase, availability.byProject, price (null unless client), sellerLine (null unless client), location.seller, geometry.ifc, model (a ModelGeometry for ModelViewer) and showPurchaseNote. geometryFile(state, viewer, id, 'ifc') returns the IFC file.
- NavItem.groupLabel and groupId mark the first project of each client group; use groupId for the nav-group-<orgId> test id. NavSection.tools for projects gives view, clients, hidden and total. Set the choice with useApp.getState().setNavProjectView(patch).

Interim component edits:
- MaterialPage: when no project is chosen, the fit-text list shows the fit against each project. Seller and price render only when present. The purchase note uses showPurchaseNote.
- Discover.tsx: the results line still says 'Choose a project to check each material against its start date.' when no project is set. The design moves that into the checking strip.
- Discover.tsx: the inner tab label is 'All listings', per BRIEF 14.1 and the task, not 'All materials' as shell-dashboards.md says.

Design conflicts:
- Marketplace folder family order follows FAMILY_IDS, as the rule says (curtain_wall, precast_cladding, stone_cladding, clay_brick). The design's example test listed the envelope families alphabetically.
- newForProjectsFeed with a project: cards are checked against that project; fitsProjects still lists every project the listing fits.
- buildingSketch accepts an optional use for when owners get a building purpose; without one, buildings draw as 'other'.


## y1: view models, actions and placeholders

Placeholders: src/features/projects/LinkRequests.tsx: LinkRequests page (PageHeader 'Project requests' with the line 'This page is being built.') and PendingLinkRequests, which renders nothing

Not done (for the UI stage): 
- All screens in design section H: ProgrammeChart, CollapsibleCard or CollapsiblePanel, SetupChecklist, ClientLinkBanner, ProgrammeCard, ProgrammeDialog, RequirementsCard, RequirementsDialog, RequirementsPicker, the real LinkRequests page, the new project dialog fields, the EditProjectDialog local authority dropdown, ProjectLayout, ProjectsList, Team and Shortlist changes, Help Version 2 item and methodology references section
- Screen tests (projects.screen.test.tsx) and the new e2e journey from section K
- Embedding PendingLinkRequests in ClientHome (client cluster)
- docs/DECISIONS.md not updated: it is outside platform/ and the commit was limited to platform/; the spec change is recorded in platform/feedback/r2-test-changes-y.md instead
- Deviation: Sallow Court stage 2 start moved to 2026-12-14 (was 2026-12-07) and stage 4 start to 2027-08-09 (was 2027-08-02); Ferrymoor Yard site start moved to 2027-04-05 (was 2027-03-01). In the one-day-shifted test sandbox the design's dates fell on the same days as private seller dates on OS-16, HC-03 and TH-09, which fails the string-based privacy test. Every seeded project keeps its stage on 7 October 2026 and reads 'On programme'
- Deviation: ProgrammeView.axis is a ProgrammeViewAxis ({ startText, endText, spanDays, ticks: { at, label, major }[] }) with no ISO dates, instead of the engine's ProgrammeAxis, because a first-of-month tick date (2027-05-01) matched a seller-private date in the buyer privacy test; the chart description uses month names
- Deviation: newProjectOptions carries no localAuthorities map; the dropdown reads the pure selector localAuthorityChoices(region), because a full list would put Tiverne House's and Harrowden Court's private local authorities (City of London, Ealing) into a buyer view model

View models to build from: projectOverview(state, viewer, projectId) now carries programme (ProgrammeView), requirements (ProjectRequirementsView), setup (ProjectSetup or null, architect only), link (ClientLinkView or null, architect only, null once accepted) and activityTotal; projectOverview().timeline and nextSteps are kept unchanged for compatibility. For the 'From today' range call programmeView(state, viewer, id, 'ahead'). ProgrammeView.axis has positions and labels only (startText, endText, spanDays, ticks of { at, label, major }); stage bands are contiguous (to(i) equals from(i+1)) and carry label, name, datesText, weeksText and state past, current or future; check carries { status, label, text } for the pill and its tooltip; source 'suggested' drives the 'Suggested dates' pill; materials rows give from, to, fit, fitLabel, windowText, storage and href; description is the chart's aria-label. programmeForm(state, viewer, projectId) gives the ProgrammeDialog's values (architect only); call programmeStages, suggestProgramme and validateProgramme from domain/engines/programme for live lengths, 'Suggest stage dates' and field errors; save with act.setProjectProgramme({ ribaStage, programme, startDate }) and offer Undo. For requirements use requirementChoices(region, localAuthority, selected) in forms (suggestedIds pre-tick) and act.setProjectRequirements(projectId, ids). For the local authority dropdown use localAuthorityChoices(region) => { options, allowsOther, london }: London regions accept only their listed options; elsewhere 'Another local authority' takes typed input. newProjectOptions adds today and typicalCompletionDays (540), and types now has 13 entries with 'other' last. NewProjectInput accepts projectTypeOther, siteStart, practicalCompletion, requirementIds and clientMessage; validateNewProject maps a too-soon or out-of-range site start to 'siteStart' when no siteStart is given, so the short form currently shows errors.siteStart on its date field. Client link: act.decideClientLink(projectId, 'accepted' | 'declined', note) and act.requestClientLink(projectId, { orgId } | { name }, message); asking the same organisation again after a decline is allowed. clientLinkRequests(state, viewer) => { pending, answered } feeds LinkRequests and PendingLinkRequests; the sidebar 'Project requests' item has id 'project-requests', icon 'Inbox' and a badge, and shows only while a request is pending. projectSetup steps carry action and secondary with intents edit_programme, keep_programme, requirements and change_client; 'keep_programme' should call setProjectProgramme with the current values. projectHeader adds siteStartText, completionText, plannedStageText and linkStatus, and leaves client avatars out until the client accepts. TeamSection.pending is true for a client that has not accepted, with members []. projectsListView rows add setup ({ done, total, nextText } or null) and linkStatus. methodologyView() adds a 'Programme suggestions' group and references (title, source, status 'Indicative summary'); show REQUIREMENTS_NOTE beside them. Once the Marketplace rename lands, switch the hrefs '/app/discover/:publicId' (programme material rows) and '/app/discover?project=' (setup 'Find materials') to the new path. Use CollapsiblePanel with id 'project-activity' for recent activity (BRIEF 14.2); there is no UiState.panels.


## y2: view models, actions and placeholders

Placeholders: src/features/capture/CapturePage.tsx (/app/capture), src/features/links/LinkPage.tsx (/app/links/:linkId), src/features/buildings/Testing.tsx (/app/buildings/:buildingId/testing), src/features/buildings/Availability.tsx (/app/buildings/:buildingId/availability)

Not done (for the UI stage): 
- Screen tests from design 14.4.11 (CapturePage, Requests Buildings tab, LinkPage, sign-up labels) and e2e/owner-surveyor.spec.ts. Both need the real screens, which belong to the UI stage.
- Real screens are left to the UI stage: capture page, link page, Testing and Availability tabs, NewBuildingDialog, StructureCard, ClaimDialog, ContractorCard, ShareLinks and the Requests Buildings tab.
- requestsView is unchanged. The Requests Buildings tab should read claimRowsForOwner.
- The Requests badge counts pending reservations plus pending claims only. The design's '+ client-linking pending approvals' is not counted, because owners never receive client link requests (BRIEF 14.2).
- I did not run npm run e2e. Two existing journeys assert text I renamed or changed and may fail: the Discover-to-material steps check the seller line ('Listed by an asset owner'), and the owner's Requests badge now reads 2 after the seeded confirmation, not 1.
- Root docs/DECISIONS.md and PLAN.md were not touched. They sit outside platform/, and the commit command only stages platform.

View models to build from (exported from src/store/selectors):
- captureTargets (picker groups; the default building is the person's last choice in ui.captureBuildingId, then the latest capture). Call useApp.setCaptureBuilding when the person picks a building.
- claimStateOf / claimStateFor, claimRowsForOwner, pendingClaimCount.
- availabilityView (contractor only).
- testingView and testingDraftOptions (noCompanyText carries the 'Send two requests' copy).
- shareLinksView, linkView (inactive, preview, terms or open; materialLinks says whether cards link to /app/discover/{publicId}), openedText.
- buildingOverview: structure (rows, summary, notes, canEdit, options), contractor, contractorOptions, testing.
- inventoryView: contractorText and contractorDiffers per row; contractorName, canApplyContractorDates and applyCount on the view.
- itemDetail(...).owner.dates; buildingsList: projects and unlinked; ownerHome: claims, newProjects, stats.donorBuildings, stats.newProjects, stats.claimsAwaiting; surveyorHome: unlinked, quickCapture, stats.unlinked.
- newBuildingOptions has mode 'owner' or 'surveyor', kinds, architects, projectTypes, stages and structure.
- BuildingRef gains claim, contractorName, isContractor and kindLabel. BuildingSide includes 'contractor'.

Actions in act.*: createSurveyBuilding, requestBuildingClaim, withdrawBuildingClaim, decideBuildingClaim, deleteSurveyBuilding, appointContractor, setContractorDates, applyContractorDates, requestTesting, recordTestingBooked, recordTestResults, cancelTesting, createShareLink, openShareLink, revokeShareLink, setBuildingStructure, createOwnerProject, appointProjectArchitect.

Things to know when building the screens:
- Use contractor date for a single item = act.setLotAvailability(lotId, item.contractorAvailableFrom).
- BuildingsList currently shows Add building to owners only. The surveyor's dialog should call createSurveyBuilding; the owner's existing dialog calls createBuilding. The surveyor rows list now excludes unconfirmed buildings, which are in v.unlinked.
- linkView never includes the owner's label for the link.
- An owner who is client of a New project gets the client workspace on that project (projectSide 'client'), plus Discover in its sidebar.
- Seed dates: two of the design's dates were moved so they do not coincide with buyers' programme dates and confuse the string-based privacy checks. Fennick's TH-11 month is stored as 2027-02-08 (still February 2027). Ambrey House's dismantling start is 2027-04-12 instead of 5 April.
- Privacy risk the UI stage should know about: in the sandbox, Studio Oriel is the only architecture practice. The owner's New project architect picker (from the design) therefore names it, so the owner can guess which practice is behind blind requests. newBuildingOptions is kept out of the owner privacy views for this reason.


## z1: view models, actions and placeholders

Placeholders: /app/projects/:id/sustainability: src/features/sustainability/Sustainability.tsx (PageHeader 'Sustainability' with 'This page is being built.', followed by the existing CarbonSection with test id project-carbon), /app/projects/:id/targets: src/features/sustainability/Targets.tsx (PageHeader 'Goals and targets', test id targets-page), /app/projects/:id/certification: src/features/sustainability/Certification.tsx (PageHeader 'Certification', test id certification-page), /app/projects/:id/requirements: src/features/sustainability/Requirements.tsx (PageHeader 'Planning and sustainability requirements', test id requirements-page), /app/projects/:id/statement: src/features/sustainability/Statement.tsx (PageHeader 'Circular economy statement', test id statement-page)

Not done (for the UI stage):
- No real screens: Sustainability (only its header plus the existing carbon section), Goals and targets, Certification, Requirements and the statement are placeholders. The client home rewrite, the approvals cost panel, the reservations summary cards, print.css and the full sustainability.screens.test.tsx were not built.
- Compliance.tsx and compliance/exports.ts were not switched to complianceWorkbook (Targets and Requirements sheets, certification table from tracked credits), so the exports.test.ts sheet-list change in the design is not made. The complianceWorkbook selector exists.
- Help.tsx methodology section and the getting-started lines from the design were not added
- e2e/sustainability.spec.ts not written, because it needs the real screens
- ConsultantHome.tsx still links to /carbon with the label 'Carbon'. The link works through the redirect. I left the file alone because the shell-dashboards stream owns it.
- docs/DECISIONS.md at the repository root was not updated, because the commit was limited to platform/. The spec changes are recorded in feedback/r2-test-changes-z.md.
- ThumbMaterial is defined locally in client-dashboard.ts as { publicId, family, typology }, because the dashboard thumbsOf helper does not exist in this worktree

Points where the code differs from the design:

1. Requirement ids. The dataset has no london-plan-si7, london-plan-si2 or borough-breeam. GOAL_DEFAULTS maps them instead:
   - content_by_value: gla-ces, then lp-si7 (20%, published)
   - upfront_carbon: gla-wlc, then lp-si2 (byType office 950, residential 850)
   - cd_diversion: lp-si7 (95%)
   - breeam: breeam-nc ('Excellent', indicative)
   The seed tracks lp-si7, lp-si2 and breeam-nc (at risk).

2. Field renames:
   - The at-risk list is requirements.atRiskItems, on sustainabilityView and on requirementsRollup. It is not atRisk, which is the count from TrackerSummary.
   - The requirements view model type is RequirementTrackRow, because RequirementRow already exists in selectors/requirements.ts.
   - RequirementsView adds locationText and outputs (the Output select options for that side; empty for the architect).
   - SustainabilityView adds targetsNote.

3. ClientProgramme has no iso, start or end dates. Ticks are { at, label } only, because the privacy test caught axis dates matching seller-private dates. Use todayText and the per-row texts: stageText, siteStartText, completionText, materialsFromText ('Programme not set' when there is no programme).

4. Kilnworth Place dates:
   - Materials needed from is 2027-02-26, not 2027-02-15. That date (and nearby candidates) matched private lot dates (TH-08 is available from 2027-02-15), which the privacy test flags.
   - Stage 6 follows from practical completion through programmeStages.

5. statementView gives the client no sections while the statement is a draft. The client reads it once it is sent.

6. Client to-dos also include requirement_at_risk. In the seed the order is approve (L-2MAC36, Due in 6 days), review_statement (Due in 13 days), requirement_at_risk (BREEAM New Construction, 9 days ago), reserve (L-NHZ32R).

7. Wording and seed copy:
   - The well-x01 seed note says 'from a shared lot', not 'from Tiverne House', which is a seller-private name.
   - The statement context section reads 'is an office scheme'.

8. docxParts adds word/_rels/document.xml.rels so Word applies the styles.

9. Other details:
   - Todo ids embed the project id and the publicId or requirement id, for test ids todo-{id}.
   - Approval cards carry cost (CostView, with savingText from f.saving).
   - ReservationRow carries carbon; reservationGroup(row) gives the summary group.
   - Use sel.reservationsView(...).summary and .caveat, and sel.approvalsView(...).finance and .caveat (FINANCE_CAVEAT).
   - certificationView defaults to breeam for an unknown scheme. matrix.included keys are `${creditId}:${publicId}`.
   - buildStatementDocx(docx) is in features/sustainability/statementExport.ts; download it with downloadBlob(new Blob([buf], { type: DOCX_MIME }), v.fileName).
   - hrefForReader maps /targets, /certification and /compliance to /sustainability for other sides, and /statement to /sustainability#statement for the client.


## Merge notes

Both streams are merged into claude/exciting-heisenberg-3cu7nb with --no-ff, in order. Nothing was pushed or deployed.

1. r2-x merged cleanly as 6783017. `npm run check` was green with no changes.
2. r2-y merged as 1847579, after nine files conflicted. Every conflict was resolved by keeping both sides' features and tests. The integration seam fixes went into the same commit.
3. 0618193 records the e2e result in platform/feedback/r2-test-changes-merge.md.

After the merges, `npm run check` (typecheck, oxlint, vitest, build) is green: 72 test files, 855 tests. `npm run e2e` passes all 4 journeys on port 4175. STATE_VERSION is 2, defined once.

What stream X's dashboards now take from stream Y:
- The owner dashboard labels each building card with its kind ("Donor building"). It also adds New project cards with a drawn thumbnail, the kind label and "Site start {date}".
- Building thumbnails take the frame from Y's recorded structure elements.
- Architect home project cards and consultant rows carry a planned stage worked out from the programme dates. The declared stage is still there.

Left for the UI stage, because the screens don't use these yet:
- Showing the kind label and New project cards on OwnerHome.
- Using the planned stage in the stage strip.
- Stream Y's placeholder pages: Capture, the share link page, Project requests, Testing and Availability.
- The client and consultant design (client-consultant.md), which neither stream built.


## Merge notes

Merged r2-z into claude/exciting-heisenberg-3cu7nb with git merge --no-ff. The merge commit is 4250271, with parents 0618193 and 05b9b78. Nothing was pushed or deployed, and /home/user/wt/w and r2-w were not touched.

There were 14 conflicted files. Each was resolved by keeping both sides. Then the seams were fixed:
- Stream Z's links go through src/store/paths.ts. No hard-coded /app/discover links are left outside the redirect and paths.ts.
- Z's 'sustainability' notification kind sits beside Y's four kinds in types, icons, the notification kit and the kind info.
- Owners are now listed in the roles for the 'sustainability' kind. This mirrors stream Y's 'sent_to_client', because an owner is the client of its own New project.
- An owner's New project gets the client tabs (Overview, Approvals, Reservations, Specification, Sustainability, Requirements). The owner can open /sustainability, /requirements and /carbon, and is refused the consultant's tabs. New assertions cover this.
- home-consultant.ts now reads targets through effectiveTargets. Its card links follow the client-consultant design's recommendation: Sustainability, Goals and targets and Certification only.
- X's architect home does not read targets, so it needed no change.
- Z's ThumbMaterial in client-dashboard.ts was not switched to X's thumbsOf, because that would not be a small change. thumbsOf takes shortlist rows, and the client cards also show earlier deals that have no listing. Instead the type is renamed ClientThumb so it no longer clashes with X's dashboard type.
- Kilnworth Place is added to the reference world before Y's owner and surveyor world. It works with Y's owner selectors and sharing, and the privacy tests pass. It sorts by name in X's sidebar.

The jszip dependency is consistent. package.json and the lockfile root both declare jszip 3.10.2, and node_modules/jszip in the lockfile is 3.10.2 with its nested readable-stream 2.x. "npm ci --dry-run --ignore-scripts" succeeded, and a real "npm ci --ignore-scripts" in a scratch copy installed jszip 3.10.2.

One addition beyond the brief: playwright.config.ts now reads an optional PW_PORT environment variable (default still 4175), so the end-to-end tests could run on the free port 4191 alongside the other checkout.

Nine existing assertions changed. Each comes from BRIEF 14.2 or 14.3 or a design, and each is logged with its reason in platform/feedback/r2-test-changes-merge.md under "Merge of r2-z onto the X and Y merge". No test was skipped, deleted or weakened.

Final results: "npm run check" passes (85 files, 983 tests, plus typecheck, lint and build). "npm run e2e" passes all 4 journeys on Chromium from /opt/pw-browsers.
