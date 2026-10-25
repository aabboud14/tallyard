# Tallyard

A working prototype of a marketplace for salvaged construction materials, with the workflow around it for each role on a project. Version 1.0, architect first. Client only, offline, one browser, sample data, a fixed demo date of 7 October 2026. Every company, person and building is fictional.

Each role gets its own interface, navigated project by project. The architect browses, saves to wish lists, checks timing, exports spec sheets and geometry, and sends the list to the client. The client approves and buys. The surveyor captures, the selling owner decides what is visible and when, and the consultant reads the carbon and runs the compliance outputs. Everything a counterparty sees is built from a privacy projection, every figure comes from a tested domain function, and every rule that stands in for an AI step says so.

## Run

Node 22 and npm.

```
npm ci
npm run dev            development server
npm run build          static site in dist/ (needs a server)
npm run build:single   one file, dist-single/index.html, opens from disk
npm run check          typecheck, lint, unit tests, both builds, scan
npm run e2e            builds, then Playwright in both projects (http and single file)
npm run shots          screenshots into docs/screens/
```

## Demo

Open `dist-single/index.html` (or the dev server) and pick Priya Nair under "Start here". The presenter's script is `docs/DEMO_SCRIPT.md`: the architect-first role journeys, then the twelve steps with their values. The demo script panel in the top bar opens any step; "Set up to here" resets the data, replays the earlier steps and opens the screen. Reset demo data in the top bar restores the seed.

| Role | Persona |
|---|---|
| Architect | Priya Nair, Studio Oriel |
| Asset owner, client | Isla Brennan, Lantern Quay Developments |
| Site surveyor | Dana Kowalski, Tarnbrook Deconstruction |
| Asset owner, selling | Tom Ashby, Ostlea Estates |
| Sustainability consultant | Marcus Lindqvist, Halewick Sustainability |
| Platform operator | Tallyard |

## Where things are

- `brief/09-V1-PRODUCT.md` governs version 1.0 (its section 13 overrides the rest); `brief/01-BRIEF.md` to `08` are the version 0.5 spec.
- `src/domain/` pure engines, access, projections, formats and the seed world; `src/domain/reference/` every factor, price and label with its source and status.
- `src/store/` state, actions, selectors, view helpers and the demo replay.
- `src/app/` routes and the rail; `src/features/` screens by role; `src/components/` the shell, drawings, charts and the version 1.0 building blocks.
- `docs/` handoff, decisions, evidence, design plan, open questions, demo script and screenshots.
