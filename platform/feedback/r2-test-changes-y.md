# Round 2 test changes, agent y (projects-timeline)

Existing assertions changed because the partner changed the product (BRIEF 14.3, first bullet; projects-timeline.md K). One line per assertion.

- `src/store/actions/projects.test.ts`, "builds a full project with an empty shortlist, reusing a developer client by name": the assertion that Lantern Quay Developments gets the notification titled 'Studio Oriel added you as client' is replaced by assertions that it is titled 'Studio Oriel asked to add you as client on Corbel Yard' with href '/app/projects/requests', that `clientLink.status` is 'pending', and that Corbel Yard is not in `projectsOfUser(isla)`. Reason: client linking now needs the client organisation's acceptance (review of 14 October 2026, "Client linking by architects should require approval"), so the project stays out of the client's workspace until accepted. Every other existing assertion is unchanged.
