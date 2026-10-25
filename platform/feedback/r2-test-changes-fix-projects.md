# Round 2 test changes: projects review fixes (fix-projects)

Every existing assertion changed by the projects fixes after the 14 October review, with its reason (P8). No test was skipped, deleted or weakened.

## src/sandbox/seed-sustainability.test.ts

- "Isla's unread count stays at 1, and the history is in place": the Kilnworth Place expectation changes from one entry, Tessaly Architects 'added Lantern Quay Developments as the client on Kilnworth Place', to two entries, newest first: Lantern Quay Developments 'accepted the project as client' and Tessaly Architects 'asked to add Lantern Quay Developments as client'. A new line checks that no activity still reads 'added Lantern Quay Developments...'.
  - Reason: BRIEF 14.3, first item: a client is no longer added directly; the architect asks and the client accepts. The old seeded line described the direct add the partner asked to remove, and it was the collapsed Recent activity summary Isla saw on Kilnworth Place. The new wording matches the log text of decideClientLink.

## Added, not changed

- src/domain/engines/programme.test.ts: 'names the month at the left edge when the first tick has no label' (programmeAxis.startLabel). The existing tick label lists are unchanged; the start month is a separate field shown in the chart's label column.
- src/store/selectors/projects-timeline.test.ts: startLabel for the whole programme and from today; windowShort on the chart's material rows; the setup checklist's short step names, focusId and step text without a second 'Indicative'; a new case, 'leads with the waiting client once everything the architect can do is done'; requestsHref on the projects list for the client.
- src/store/selectors/projects-ui.test.ts: the requirements picker's markerNote; new cases for requirementsAfterMove and timeAgoStart.
- src/ui/round2.test.tsx: a new ProgrammeChart case, 'names the start month and links each material, with its window, outside the image'.
- src/features/projects/projects.screen.test.tsx: three new cases: the compact checklist with the waiting client folded in and 'Show all steps'; the full banner outside the checklist after a decline; editing project details to Hackney says which requirements go and offers 'Review requirements' with the new suggestions ticked.
