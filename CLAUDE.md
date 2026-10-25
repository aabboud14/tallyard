# CLAUDE.md

Project: Tallyard, a clickable prototype of a marketplace for salvaged construction materials. Client only, offline, one browser.

## After any context reset, read these before writing code

1. `brief/01-BRIEF.md` (rules, scope, phases, definition of done)
2. `PLAN.md` (what is done, what is next)
3. `docs/DECISIONS.md`
4. The brief files listed for the current phase in `01-BRIEF.md` section 5
5. `brief/09-V1-PRODUCT.md`, the governing file for version 1.0. It wins over files 01 to 08 where they differ, and its section 13 wins over its sections 1 to 12. Under it, R6 reads `src/domain/reference/names.ts` as the allowed list.

Read each file to its last line. If a read is truncated, continue from where it stopped. Never work from memory of the brief.

## The rules, one line each

- R1 The twelve demo steps in `brief/02-DEMO-PATH.md` work end to end on fresh seed data, with the stated values. Steps 10 and 11 are never cut.
- R2 All arithmetic lives in pure tested functions in `src/domain/`. The UI formats; it never calculates.
- R3 Buyer-facing data comes only from `toPublicListing`. Seller-facing buyer data comes only from `toBlindBuyer`. No figure crosses before a deal is confirmed.
- R4 Label everything simulated, rule-based, indicative or placeholder. The fixed strings are in `brief/04-PRIVACY-AND-SCREENS.md` section 6.
- R5 No network at runtime. The single file must work from disk.
- R6 Only the fictional names in `brief/06-DATA.md` section A11.
- R7 British English, sentence case, plain words. No em dashes or en dashes anywhere. No arrows, tick marks or comparison signs in UI text.
- R8 Build only what the brief asks for.

## Precedence

`01-BRIEF.md` section 2, then section 7, then `07-EXAMPLES.md`, then `06-DATA.md`, then everything else. If a computed value differs from a worked example, the example shows the intended reading of the formula: fix the code.

## Commands

```
npm run dev
npm run check     typecheck, lint, unit tests, both builds, scan
npm run test      vitest
npm run e2e       builds, then Playwright in both projects
npm run shots     screenshots into docs/screens/
npm run scan      dashes, filler text, disallowed names
```

`dist-single/index.html` is the file that opens from disk. `dist/` needs a server.

## Standing facts

- Demo date is fixed: `DEMO_TODAY = '2026-10-07'`. Never read the system clock.
- Dates are ISO strings. Arithmetic in whole days, UTC. A month is 30 days in storage formulas.
- Money is rounded to pence when each amount is created; totals are sums of rounded amounts.
- Storage keys and the IndexedDB name are prefixed `tallyard-v05`. Reset removes only those.
- Never run an interactive command. Never push, deploy or send anything anywhere.
- Never weaken, skip or delete a test. Never special-case an input in implementation code to make one pass.
- Commit after every green gate. Keep `PLAN.md` and `docs/DECISIONS.md` current.

## If something fails three times

Use the fallback for that item in `01-BRIEF.md` section 6, record it in `docs/EVIDENCE.md` under "Deviations", and move on. Never fall back on steps 10 and 11, the engine tests, the privacy tests or the labels.

## The platform folder

`platform/` is a separate app, the SaaS-style platform, with its own rules in `platform/CLAUDE.md` and its spec in `platform/BRIEF.md`. Inside `platform/` those govern; the demo rules above (the demo path, the offline single file, the fixed demo date and the fixed label list) apply only to the demo in `src/`.
