# Evidence

Proof for each item of the definition of done (brief/01-BRIEF.md section 7). Filled in as phases complete.

## Environment

- Node 22.22.0, npm 10.9.4.
- `npm install` reported 5 advisories in transitive dependencies (2 moderate, 3 high). Not fixed with `--force`, per 05 section 2.1.

## Deviations

- Deployment: the user asked for a push and a Vercel deployment; the brief says not to deploy. Done at the user's request.

## Phase 0

- Browser ladder: rung 1. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` holds chromium-1194, which matches Playwright 1.63.0, so `executablePath` is set from it in `playwright.config.ts`.
- Spike (`e2e/spike.spec.ts`): passed in both projects, `http` (dist/ behind vite preview) and `single-file` (dist-single/index.html over file:// with offline on and a request guard).

## Phase 1

- `npx vitest run`: 17 files, 208 tests passed. Same under `TZ=UTC` and `TZ=Pacific/Auckland`.
- Independent review of `src/domain` against 03, 06 and 07 by a fresh-context agent: no formula, rounding, ordering, label or seed deviation; two notes recorded in `docs/DECISIONS.md`.

## Phase 2

- `npx vitest run src/store`: the replay test runs steps 1 to 12 on fresh seed and asserts every value in the acceptance table of 02 section 3, plus the three dashboard states for step 10 and the B7 post-deal matcher variant. 15 tests pass.
