# Decisions

One line per decision where the brief was silent or an instruction had to be reconciled.

- 2026-10-04. The brief files were moved from the repository root into `brief/` and `docs/OPEN_QUESTIONS.md`, as `START-HERE.md` describes, so that `CLAUDE.md` paths hold.
- 2026-10-04. The user asked for the build to be pushed to the working branch and deployed to Vercel. That overrides rule 6 of `01-BRIEF.md` section 0 and item 12 of the definition of done for this run; the deviation is recorded in `docs/EVIDENCE.md`.
- 2026-10-04. `@types/node` is pinned at 22.20.5 (the Node 22 line) rather than the template's 24 line, to match the Node 22 runtime here.
- 2026-10-04. `fake-indexeddb` and `jsdom` are added as dev dependencies for unit tests of the photo store and screens; neither ships in the app.
- 2026-10-04. Reference rows for the transport margin and matching fee carry the status `candidate`, as 06 section A2 writes them, in addition to the three statuses 03 section 1 names. The Assumptions screen shows the word as given in 06.
- 2026-10-04. The market signal for a lot that is not in the snapshot adds the item's full captured quantity to supply, not only what is still on offer; the two agree for every seeded lot and for the demo path.
- 2026-10-04. Ledger lines render as statement rows (label and amount in one element) so each line reads as one phrase; L31 sits beside the transport margin.
- 2026-10-04. The About limits list has ten items, as 04 section 5.7 lists, including the trusted-operator line from section 3 rule 7.
- 2026-10-04. The contributions table's "Without reuse" row spans both columns; family lines follow in bill of materials order, then a Secured row.
- 2026-10-04. Cached results of the workbooks' SUM, intensity and share formulas are summed in the export module from the selectors' rows; every headline figure comes from the selectors.
- 2026-10-04. ExcelJS writes a default lastModifiedBy property; only creator and title are set by the app.
- 2026-10-04. The Embodied carbon sheet adds a Public ID column so each row traces to the Reused items sheet.
- 2026-10-04. The waste Summary carries the counted total, reused off site, recycled on site, landfill, intensity, hazardous and rows awaiting review as formulas over the other sheets.
- 2026-10-04. The content by value chart's scale is fixed at 30% so the 20% aim sits right of centre; the waste export button is disabled until a bill is loaded.
- 2026-10-04. The sample file builder only rebuilds when an output is missing (pass --force), because a fresh zip carries new timestamps and would churn git on every build.
- 2026-10-06. `vercel.json` and an `engines.node` of 22.x pin the Vercel build to the toolchain the project was built with. They do not change the app.
