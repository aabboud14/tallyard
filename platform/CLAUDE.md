# CLAUDE.md, platform

This folder is a separate app: the Tallyard platform, a SaaS-style product you sign in to and work in. It is not the demo in the repository root and does not follow the root brief, its demo script, its persona switcher or its offline single-file rule. The root `CLAUDE.md` rules on the demo do not apply here except where this file repeats them.

Read `platform/BRIEF.md` to its last line before writing code. It is the spec.

## Rules

- P1 Real product feel. No demo script, no persona switcher in the chrome, no "prototype" banners. People sign in. A single "Sandbox" badge and the sign-in page say that data is sample data that stays in this browser.
- P2 All arithmetic lives in pure, tested functions in `src/domain/` or `src/store/`. Components format; they never calculate. Drawing coordinates inside SVG components are the only exception.
- P3 Privacy by construction. What an architect or client sees of a seller's material comes only from `toPublicListing`. What a seller sees of a buyer before a reservation is accepted comes only from `toBlindBuyer`. Tests prove it.
- P4 Honest numbers. Carbon, price guides, timeline checks and the sustainability band carry an "Indicative" marker with a link to Help, Methodology, which lists every factor with its source and status. No figure is presented as certified.
- P5 Fictional world only. Organisations, people, buildings and addresses come from `src/domain/reference/names.ts` plus any new fictional names you add there. No real company appears as an actor. Email addresses use the reserved `.example` domain.
- P6 Copy. British English, sentence case, plain words. No em dashes or en dashes anywhere, code comments included. No arrow, tick or comparison characters in UI text: use icons from `lucide-react` instead.
- P7 One clock. Read today's date only through `src/sandbox/clock.ts`. Dates are ISO strings; arithmetic in whole days, UTC.
- P8 Never weaken, skip or delete a test. Never special-case an input to make a test pass.
- P9 Quality bar: this is shown to architects and developers as a real product. Every screen has a considered empty state, sensible defaults, keyboard focus, 44px touch targets on phone-width layouts, and no horizontal scroll at 390, 1024 and 1440 px.

## Commands (run inside `platform/`)

```
npm run dev
npm run check      typecheck, lint, unit tests, build
npm run test       vitest
npm run e2e        build, then Playwright
```

Chromium for Playwright is pre-installed under `/opt/pw-browsers`; never run `playwright install`.

## Deploy

The user asked for this app to be deployed to Vercel (8 October 2026). The Vercel project is `tallyard-platform` with root directory `platform`. The lead session deploys it; build agents do not.
