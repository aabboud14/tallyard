# Build brief, file 5 of 7: design direction and technology

## 1. Design direction

The audience is construction and property professionals. The interface should feel like a precise working tool from their world: a survey drawing crossed with a stockyard ledger. This section overrides any general design skill or house style you may have loaded. Use such a skill only for craft (spacing, hierarchy, accessibility), never for palette, type or character.

- **Signature element: drawings from real dimensions.** Every listing and item leads with a technical drawing of the thing itself, generated as inline SVG from its dimensions. Steel sections are drawn as their true profile from depth, width, web and flange thickness, with dimension lines and the designation. All section drawings in one list share one scale, so a 610 beam is visibly larger than a 305 column. Panels, stone, bricks, floor panels and joists get simple dimensioned drawings in the same style. No stock photos and no decorative illustration. User photos appear only where they exist and the viewer is allowed to see them.
- **Second idea: privacy made visible.** In owner views, anything that never leaves the organisation carries the same mark: an oxide red rule, a small lock and the word "Private". Anything the market can see is unmarked. The market preview sits beside it. A user should be able to see the boundary without reading.
- **Palette** (start here; adjust only to meet contrast):
  - Paper `#F4F6F7` (background)
  - Ink `#14202B` (text)
  - Steel blue `#2C5E86` (primary actions, links, drawings)
  - Mill grey `#7B8A97` (rules and dimension lines; darken it for any text)
  - Survey yellow `#F4C20D` (tags and status markers only, always with ink text)
  - Oxide red `#A63A22` (private marking, blocking warnings)
  - Muted teal `#2E7D6B` (a target or aim that is met). Do not make green the brand colour.
- **Type:** Barlow Condensed (600) for section designations, tags and large figures. IBM Plex Sans (400, 500, 600) for interface and body. IBM Plex Mono (400) only for dimension text inside drawings. Tabular figures in tables (`font-variant-numeric: tabular-nums`; Barlow Condensed needs it).
- **Layout:** a dense, calm application layout. Tables where people compare, cards only for the marketplace grid. Left-aligned. Numbers right-aligned in tables with units in the column header. Capture is a single column for a phone.
- **Charts:** hand-built SVG. Bullet charts for targets and aims, one stacked horizontal bar for waste destinations, simple bars for ranking. No pie charts. No chart library.
- **Motion:** only where it explains a change (agent messages arriving, a figure updating after a deal). Respect reduced motion.
- **Avoid** the generic looks: cream background with a serif and a terracotta accent, near-black with an acid accent, identical rounded cards with soft shadows, gradient washes, all-caps eyebrow labels over headings, emoji as icons, leaf and globe imagery.
- **Quality floor:** WCAG AA contrast, visible keyboard focus, full keyboard operation of forms and dialogs, `lang="en-GB"`, the layout requirements in 01 section 7 item 9, a clean A4 print of the report.
- Before building screens, write a short design plan in `docs/DESIGN.md` (tokens, type scale, a layout sketch in ASCII, how the drawings work), check it against this section, then build. Look at your screenshots as you go and fix what looks wrong.

## 2. Technology

### 2.1 Stack

These versions were installed and proven to work together, including the single-file build opened from disk, on 4 October 2026. Pin exact versions. If one cannot be installed, use the nearest available and record it in `docs/DECISIONS.md`. When an API differs from what you expect, read the installed package's types. Do not work from memory.

| Purpose | Package and version |
|---|---|
| Build | `vite` 8.3.2, `@vitejs/plugin-react` 6.1.1 |
| UI | `react` and `react-dom` 19.3.0 |
| Language | `typescript` 7.0.2 (or the version the Vite template installs), strict |
| Routing | `react-router` 8.4.0 |
| State | `zustand` 5.0.15 |
| Styling | `tailwindcss` and `@tailwindcss/vite` 4.3.3 |
| Accessible primitives (dialog, popover, tabs) | `radix-ui` 1.6.7, styled to the design |
| Spreadsheets | `exceljs` 4.4.0 |
| CSV | `papaparse` 5.7.0 |
| Fonts | `@fontsource/barlow-condensed`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` 5.3.0 |
| Single file | `vite-plugin-singlefile` 2.3.3 |
| Unit tests | `vitest` 5.0.3 |
| End-to-end tests | `@playwright/test` 1.63.0 |
| Lint | `oxlint` 1.86.0 |

Keep dependencies to this list plus their type packages. No component kit that brings its own look. No chart library. No date library.

Things that are known to go wrong. Each line is a fix already found:

- **TypeScript.** Use the tsconfig the Vite template writes. Recent TypeScript rejects `baseUrl`, `moduleResolution: node` and `target: es5`, and loads no `@types` unless `types` lists them (`vite/client`, and `node` for config files).
- **Lint.** Use oxlint, as the Vite template does. Do not add typescript-eslint: it refuses to load with TypeScript 7. Turn React rules off for `e2e/`, `scripts/` and config files (Playwright's `use` callback is mistaken for a React hook).
- **Routing.** `createHashRouter` from `react-router`, and `RouterProvider` from `react-router/dom`. Do not install `react-router-dom`. Hash routes are what make the single file work from disk.
- **Storage.** Zustand's persist does not catch write errors. Wrap `localStorage` in an object whose `getItem`, `setItem` and `removeItem` each catch every exception and mirror to an in-memory `Map`, and probe it once at start. Pass `version` and a `migrate` that returns the seed. Do not gate rendering on hydration. Give the photo store (IndexedDB) the same in-memory fallback.
- **Shared storage on `file://`.** All local HTML files share one `localStorage` and one IndexedDB. Prefix the storage key and the database name with `tallyard-v05`. "Reset demo data" removes only that key and that database. Never call `localStorage.clear()`.
- **Photos.** `createImageBitmap(file)`, draw onto a canvas no larger than 1,280 px on the long edge with a white fill, `toBlob('image/jpeg', 0.8)`. This applies rotation and strips embedded metadata. Store the blob in IndexedDB.
- **Tailwind 4.** No config files. In the main stylesheet use `@import 'tailwindcss' source('..');` so it scans only the app, and define tokens in `@theme static { --color-*: initial; ... }` so unused tokens are still emitted. Tokens are CSS custom properties in one file.
- **Fonts.** Install the `@fontsource` packages but do not import their CSS (it inlines every subset twice). Write five `@font-face` rules that point at `@fontsource/<family>/files/<family>-latin-<weight>-normal.woff2`. The latin subset has no arrows, tick marks, comparison signs or subscript digits: keep them out of UI text (rule R7).
- **ExcelJS.** It never calculates: write every formula as `{ formula, result }`. Quote sheet names that contain spaces in formulas. Build dates with `Date.UTC`. Set `created` and `modified` yourself. On import, pass `await file.arrayBuffer()` to `load()`, read `value` and `result` rather than `text`, and skip merged cells that are not the top-left cell. In Node tests use `readFile`.
- **Vitest.** Set `include` to `src/**/*.test.{ts,tsx}` so it does not pick up `e2e/`. Import `defineConfig` from `vitest/config` if the test settings live in the Vite config.
- **npm advisories.** `npm install` reports advisories in transitive dependencies of ExcelJS. Record the count in `docs/EVIDENCE.md`. Do not run `npm audit fix --force`: it downgrades ExcelJS and the single-file plugin.

### 2.2 Structure

```
PLAN.md                phases as a checklist, what is done, what is next
src/domain/            pure logic: engines, privacy projections, formats, seed
src/domain/reference/  section table, families, waste codes, fees, policy references, labels, open questions
src/store/             state, actions, selectors, demo replay
src/features/          supply | market | project | compliance | operator | shared
src/components/        drawings, charts, tables, panels
src/test/              test helpers and the twin seed
docs/                  DECISIONS.md, DESIGN.md, OPEN_QUESTIONS.md, DEMO_SCRIPT.md, EVIDENCE.md, screens/
e2e/                   Playwright tests and fixtures
scripts/               scan.mjs, shots, fixture builders
```

Feature code calls store actions and selectors and formats what they return. It never calculates.

### 2.3 Scripts

- `npm run dev`
- `npm run build`: static site in `dist/` with `base: './'`. It must be served over http. It cannot be opened from disk (browsers block external module scripts on `file://`).
- `npm run build:single`: `vite build --mode single` with `vite-plugin-singlefile` at its defaults, output `dist-single/index.html` with JavaScript, CSS and fonts inlined. Keep `public/` empty (its files are not inlined; make the favicon a data URI). Generate the two sample files at build time into `src/domain/reference/samples.ts`, the workbook as a base64 string and the schedule as a CSV string, and decode them in memory. Do not import them as asset URLs and never `fetch` a neighbouring file: Vite emits assets above its inline limit as separate files, which the `dist/` build would then request at runtime and break R5. Expect about 2 MB. This is the file that opens from disk.
- `npm run test`: Vitest.
- `npm run e2e`: builds both targets, then runs one spec file in two Playwright projects: `dist/` behind `vite preview`, and `dist-single/index.html` through a `file://` URL with `offline: true`.
- `npm run shots`: the screenshots in 2.7 into `docs/screens/`.
- `npm run scan`: `scripts/scan.mjs` (01 section 7 item 8).
- `npm run check`: typecheck, lint, unit tests, both builds, scan.

### 2.4 Browser for end-to-end tests

Work down this ladder and stop at the first rung that works. Record which one in `docs/EVIDENCE.md`.

1. If `$PLAYWRIGHT_BROWSERS_PATH` is set and holds a Chromium, set `use.launchOptions.executablePath` to it (in the screenshot script too). A pre-installed browser may be older than the installed Playwright expects. That is fine: point at it.
2. `npx playwright install chromium`.
3. A system Chrome or Edge through `channel`.
4. No browser at all: rely on the store-level replay test plus component tests of each demo screen in Vitest with a DOM environment, and record every browser-only check in 01 section 7 as "not verified in a browser".

Playwright configuration: `retries: 0`, one worker, `locale: 'en-GB'`, `timezoneId: 'Europe/London'`, reduced motion on, traces kept on failure, a `webServer` that runs `vite preview` on a fixed port. Downloads need no setting: wait for the `download` event and save it. In the single-file project, fail the test if the page requests anything other than `file:`, `data:` or `blob:` URLs.

### 2.5 Constants

- `DEMO_TODAY = '2026-10-07'`. All date logic uses it, never the system clock, so the demo and the tests give the same numbers on any day.
- `PRODUCT_NAME = 'Tallyard'` in one place. Nothing else hard-codes it.
- `STORAGE_PREFIX = 'tallyard-v05'`.

### 2.6 The Phase 0 spike

Before building anything real, prove the tooling with a throwaway page and one end-to-end test that runs in both Playwright projects:

1. Two hash routes, navigation between them, reload on the second.
2. The three font families load (`document.fonts`), with no network request in the single-file project.
3. A persisted store survives reload.
4. ExcelJS writes a workbook with one formula and its cached result, the browser downloads it, and the test re-opens it in Node and finds both.
5. A photo fixture goes through the canvas path into IndexedDB and is shown again after reload, and the stored blob has no EXIF segment. Build the fixture in `scripts/make-photo-fixture.mjs` as a fixed byte array: a minimal JPEG with an APP1 EXIF marker. It does not have to be a pretty image, only a valid file with metadata to strip.

Delete the spike page when Phase 3 starts. Keep its tests if they still apply.

### 2.7 Screenshots

`npm run shots` captures, after `runDemoSteps(1, 12)`: at 1440 by 900, the landing page, Inventory, Priority, Listings and privacy with the market preview, Browse, the `L-9F4CQQ` listing, Match schedule results, the reuse plan package panel, the negotiation thread, Offers and deals, Deals with the custody timeline, project compliance, the waste dashboard, the bill review table, Ledger, Model comparison, Assumptions and About; at 390 by 844, Capture.
