# Round 2 follow-up: look (dashboards, thumbnails and the landing page)

Closes the look package of the recording audit of 16 October 2026 against the review of 14 October. One line per note, then every existing assertion that changed (P8).

## Notes

- [1a] Fixed. `projectSketch` (domain/sketch.ts) gives a project whose shortlist shows no facade material (only steel, raised floors, or nothing yet) the facade typical of its use: office glass, residential brick, hotel stone, industrial precast, other brick. A new `facadeSource` field ('materials', 'use' or 'none') records where the facades came from, and the label says so ('... drawn from its shortlisted materials and a typical office facade'). Decision: the typical facade is drawn but never added to the swatches, so it is never shown as a shortlisted material. A unit test proves no seeded project draws as a blank box.
- [1b] Fixed. `visualFromRows` in project-visuals.ts is now the one way a project is drawn: the families of every live row on its shortlist, from the public cards, plus up to three swatches. The architect home uses it, and the client home now uses `projectVisual` instead of the card's deal thumbs. Merrowgate Wharf draws identically for Priya, Isla and Marcus, which a test proves. Decision: home-owner.ts, home-consultant.ts and the checking strip already build families the same way from the live rows. I left those files alone, because other packages own them, and covered them with the cross-role equality test.
- [1c] Fixed, improved on the proposal. The client project cards pass the swatches (`cardExtras[id].materials`). A fixed 4 by 3 aspect still left the building small in a tall column, so `ProjectThumbnail` gained a `fit` mode that crops the drawing to the building and scales it to fill the frame above the swatch band. The client card uses it at the card's full height from lg up, 16 by 10 above the card below lg, and 2 by 1 on phones.
- [1d] Fixed, improved on the proposal. The landing product shot no longer has fixed figures. A new `landingDashboard(today, now)` (store/selectors/landing.ts) runs the real seed and `architectHome` for Priya, so the shot's greeting, date, figures and drawings are what she sees after signing in to a fresh sandbox (7 shortlisted with 3, 2 and 2; 100.8 tCO2e; 2 waiting). It reads the clock through sandbox/clock.ts and is cached per hour. `SAMPLE_DASHBOARD` keeps only the frame (practice, person, main navigation); the made-up Saved count is gone.
- [1e] Fixed. A steel card now draws its member at a size that follows its depth: 64 board px at 150 mm and 140 px at 620 mm, with the profile kept to its own proportions. A UB 610 now stands about twice as tall as a UC 203. Each steel card also carries a flat, hatched end view at top left, drawn at one scale shared by all cards (0.1 px per mm) and labelled depth by width in mm. The detail view on the material page is unchanged. Decision: no photos, because listings have none and the design rules out faking them.
- [1f] Fixed. The landing page has a 'Maps to the frameworks you report against' row under the facts band. It lists RIBA Plan of Work, London Plan, BREEAM, LEED, WELL and UK Net Zero Carbon Buildings Standard as text only, with no logos or badges. The row is built in domain/reference/frameworks.ts from the RIBA stages and the requirement entries, and carries the caption 'Indicative summaries to check. Not affiliated with or endorsed by these bodies.' Every name was already in names.ts ALLOWED_SOURCES, so names.ts needed no change; a test checks this.
- [3] Polish done, plus first runs for every role.
  - (a) The surveyor home draws each building full width above its name on phones (`home-building-thumb-{id}`) and keeps the compact thumb from sm up.
  - (b) A client with no projects gets one welcome with three next steps (`client-projects-empty`) and recent activity. There are no zero tiles, no empty programme and no header-only tracking table. I made this an early return in ClientHome.tsx so the existing layout lines are untouched for the merge.
  - New architect: under the welcome, 'In the Marketplace now' shows the three categories with real stock and links into the Marketplace by type.
  - New consultant: the projects empty state is now a card with three next steps.
  - The owner and surveyor first runs already had actions and are unchanged.
  - Shared `FirstRunCard`.
  - (c) MetricTile colour rule left as BRIEF 14.2 decides.
- [23] Fixed.
  - (1) Architect home cards carry `setup` and `linkStatus`, and projects still setting up sort first.
  - A setup card is tinted like the checklist and shows the projects list pills (`home-setup-pill-{id}`, `home-link-pill-{id}`) and a brand next-step link (`home-setup-next-{id}`). The link replaces the empty fit and progress rows while nothing is shortlisted.
  - The Active projects tile now counts only projects the client has accepted. On programme and Next start judge only accepted projects with a confirmed programme, and a '1 setting up' pill sits on the tile.
  - (2) On a client's overview with nothing shortlisted, Next steps reads: 'Nothing is shortlisted yet. {architect} sends materials to you for approval as they shortlist them.' With no consultant, it adds a line and a 'See the team' link.
  - Decision: the link is not 'Add a sustainability consultant', because only the architect can set the consultant. The wording does not say 'setting up', because it also shows on Kilnworth Place at stage 4.
  - (3) Client cards read 'Office' with no trailing comma when no local authority is recorded (`clientPlaceText`). They show 'Being set up' while the programme is still suggested and nothing is shortlisted, and 'Nothing shortlisted yet' after that.
  - (4) Unit, screen and e2e tests added (e2e/r2f-look.spec.ts has the Corbel Yard journey).
- Incidental, '10 new materials fit' on every card: real. Each card now adds its own split by fit against that project, for example '5 available now, 4 in time, 1 tight' on Ferrymoor Yard. The count is unchanged.
- Incidental, landing mock fixed on 7 October with other figures: fixed by 1d.
- Incidental, Ambrey House shown as 'Appointed': fixed. A building the firm added itself starts at 'Added'.
- Incidental, 5 and 4 storey buildings drawn as cubes: fixed. Brick and stone faces now show a row of punched windows on every storey, so the storeys read.
- Incidental, the new architect's carbon tile reading '0.0% of the 0.0 tCO2e' with an empty ring: fixed. With nothing shortlisted, the carbon and shortlist tiles say so and drop the empty ring and donut.
- Incidental, Active projects and Next start counting unaccepted projects: fixed in 23(1).

## Existing assertions changed (P8)

- src/domain/sketch.test.ts, 'draws the seed projects and buildings from their records':
  - Merrowgate's label becomes 'Illustration of an office project, drawn from its shortlisted materials and a typical office facade' instead of '... drawn from its shortlisted materials'.
  - A project with no shortlist reads 'Illustration of an office project with a typical office facade' instead of 'Illustration of an office project'.
  - Reason: note 1(a) asks for the default facade to be marked as the project type's, not as a shortlisted material, and the accessible name is where a screen reader hears it. Merrowgate's shortlist is all steel, so its facade is now the typical one.

No other existing assertion changed; no test was skipped, deleted or weakened.
