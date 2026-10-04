# Decisions

One line per decision where the brief was silent or an instruction had to be reconciled.

- 2026-10-04. The brief files were moved from the repository root into `brief/` and `docs/OPEN_QUESTIONS.md`, as `START-HERE.md` describes, so that `CLAUDE.md` paths hold.
- 2026-10-04. The user asked for the build to be pushed to the working branch and deployed to Vercel. That overrides rule 6 of `01-BRIEF.md` section 0 and item 12 of the definition of done for this run; the deviation is recorded in `docs/EVIDENCE.md`.
- 2026-10-04. `@types/node` is pinned at 22.20.5 (the Node 22 line) rather than the template's 24 line, to match the Node 22 runtime here.
- 2026-10-04. `fake-indexeddb` and `jsdom` are added as dev dependencies for unit tests of the photo store and screens; neither ships in the app.
