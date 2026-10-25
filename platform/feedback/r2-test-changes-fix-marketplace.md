# Round 2 review fixes, Marketplace and material page: changed assertions and decisions

Fixes for the marketplace area of the round 2 review (15 October 2026). No test was skipped, deleted or weakened (P8). New tests were added for every change; they are listed at the end.

## Changed assertions

1. `src/features/discover/marketplace.screen.test.tsx` > "checking strip" > "checks every card against the project chosen in the strip, with fit counts"
   - Before: `byTestId('category-structure').textContent` contains `11 in time for Merrowgate Wharf`.
   - After: `byTestId('category-fits-structure')` reads exactly `Merrowgate Wharf: 6 available now, 5 in time`, envelope `Merrowgate Wharf: 3 available now, 2 in time`, finishes `Merrowgate Wharf: 1 available now`.
2. `e2e/r2-marketplace.spec.ts` > "an architect browses by category ..."
   - Before: `category-structure` contains `in time for Merrowgate Wharf`.
   - After: `category-structure` contains `Merrowgate Wharf: 6 available now, 5 in time`.
   - Reason for both: review finding (major) "The figures disagree on screen". The folder line counted "available now" plus "in time" as "in time" (11), while the checking strip above it says "10 available now" and "7 in time", so the three folders added up to 17 "in time" against the strip's 7. The folders now use the strip's own words from one pure function (`fitSummaryParts` and `fitSummaryText` in `store/selectors/marketplace.ts`), and a unit test proves the folders add up to the strip for every project. This is a copy change to `marketplace-material.md` section 8 (`{n} in time for {project}`), made by the review, not recorded in BRIEF 14.3 or a design; it is flagged here for the lead. The new assertions are exact where the old ones were partial.

No other existing assertion changed. `fitsCount` keeps its meaning and its tests.

## Decisions

- Consultants and lots shared in confidence (review blocker). Of the two rules the review offered, the one applied keeps the stage 1 rule that a lot shared in confidence opens for the project's architect and client only (they accept the confidentiality terms; the consultant cannot). `views.test.ts` asserts it (`materialView(marcus, 'L-MNY55K')` is null), and changing that would have meant changing an existing assertion that no BRIEF 14.3 entry or design records. The dead ends are removed instead: a new `canOpenMaterial(state, viewer, publicId)` in `store/selectors/discover.ts` is the one rule, the programme chart rows (`programmeView(...).materials[].href`, now `string | null`) and the search index use it, so no consultant surface links such a lot, and Shared with you tells the consultant why it is empty (`DiscoverView.sharedNote`). If the lead prefers the other rule (consultants read such lots as public listings once the terms are accepted), it is a two-line change in `visibleLot` and `sharedGroups` plus that one assertion in `views.test.ts`, and needs a BRIEF 14.3 entry.
- The 3D view draws no shadow (visual-qa rule 2, no drop shadows on drawings). Faces are filled with the family tone lifted 60% towards paper (`faceFill`, `mixHex`, `PAPER_HEX` in `domain/engines/view3d.ts`) and outlined in ink hairlines (`var(--color-ink)`, 0.75 px, non-scaling). `projectMesh` still returns its `shadow` footprint, so the existing view3d test stands, but `ModelViewer` no longer draws it.
- The material page says each thing once. Key facts stay the short summary (with location and collection point). The Specification table keeps only rows not shown above it (`SHOWN_ABOVE_SPEC`): the material and dimensions, and the steel grade. That also removes the carbon, band and timeline figures that sat there without an Indicative marker (P4). The header line drops the location. "Location and collection" becomes a client-only "Seller" section. The specification export is unchanged.
- Timeline tick labels are thinned to every other month, quarter, half year or year so neighbouring labels are at least 9% of the strip apart, 1.7 times that after a label with a year (`TICK_LABEL_MIN_SHARE`, `YEAR_LABEL_FACTOR` in `domain/engines/timelineScale.ts`). The option defaults off, so the existing scale tests are unchanged; `TimelineStrip` turns it on.
- The checking strip no longer truncates the project name and date: from lg the row wraps, with the chips and the controls moving to a second line when they do not fit.
- Body text turns off Inter's contextual alternates (`'calt' 0`), so "457x191x67" reads with the stored letter x everywhere, as in search and the files.
- New for your projects shows four cards and a "Show all {n}" or "Show fewer" button (`new-for-projects-more`) when the feed holds more.
- When the project being checked cannot see the lot, the material page says "Not shared with {project}, so it cannot be checked against it." above the projects it is shared with.
- Phone touch targets: the file download buttons and the locked BIM family pill are 44 px, the breadcrumb parent link keeps at least 44 px, the strip's switch label is a 44 px row, and the Indicative link's hit area grows to 46 px. The phone search placeholder is "Search", and the typology tabs fit 390 px.

## Tests added

- `src/test/privacy.platform.test.ts`: a confidential lot opens for the architect and client only, and the consultant's programme chart and search do not link it; every material link on a programme chart or in search opens for the person it is shown to (fresh and busy sandboxes).
- `src/store/selectors/marketplace.test.ts`: folder fit counts in the strip's words add up to the strip; `fitSummaryParts` and `fitSummaryText`.
- `src/store/selectors/marketplace-checking.test.ts`: the specification keeps only rows not shown above it; `notSharedWith`; the New for your projects split.
- `src/domain/engines/view3d.test.ts`: `mixHex` and `faceFill`.
- `src/domain/engines/timelineScale.test.ts`: label spacing for strips of every length.
- `src/ui/round2.test.tsx`: the 3D view has ink hairlines, paper-toned fills and no shadow.
- `src/features/material/material.screen.test.tsx`: the specification says each thing once; the not-shared note; the client's Seller section.
- `src/features/discover/marketplace.screen.test.tsx`: Show all and Show fewer; the consultant's Shared with you note.
- `e2e/r2-marketplace.spec.ts`: the checking strip at 1024 and 1440 px; 44 px targets on the material page at 390 px; the consultant follows every programme link without a dead end.
