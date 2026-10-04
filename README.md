# Tallyard

A clickable prototype of a marketplace for salvaged construction materials, version 0.5. Client only, offline, one browser, sample data. Everything a counterparty sees is built from a privacy projection, every figure comes from a tested domain function, and every rule that stands in for an AI step says so.

## Run

```
npm install
npm run dev            development server
npm run build          static site in dist/ (needs a server)
npm run build:single   one file, dist-single/index.html, opens from disk
npm run check          typecheck, lint, unit tests, both builds, scan
npm run e2e            builds, then Playwright in both projects
npm run shots          screenshots into docs/screens/
```

## Demo

Open `dist-single/index.html` (or the dev server), pick a persona, and follow the twelve steps in the demo script panel. "Go" opens a step's screen; "Set up to here" resets the data, replays the earlier steps and opens the screen. The presenter's version of the steps is in `docs/DEMO_SCRIPT.md`. The demo date is fixed at 7 October 2026.

## Where things are

- `brief/` the specification; `brief/01-BRIEF.md` is the entry point.
- `src/domain/` pure engines, projections, formats and the seed world; `src/domain/reference/` every factor, price and label with its source and status.
- `src/store/` state, actions, selectors and the demo replay.
- `src/features/` screens by workspace; `src/components/` drawings, charts, panels and the shell.
- `docs/` decisions, design plan, open questions, demo script, evidence and screenshots.
