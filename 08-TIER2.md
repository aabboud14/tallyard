# Build brief, file 8 of 7: Tier 2, a separate run

Do not read or build any of this until Tier 1 meets the definition of done in `01-BRIEF.md` section 7 and you have been asked for Tier 2.

Everything in `01-BRIEF.md` still applies: the rules in section 2, the ways of working in section 6, the phase gate pattern, and the definition of done, extended with the items below. Re-read `01-BRIEF.md`, `02-DEMO-PATH.md` and `04-PRIVACY-AND-SCREENS.md` before starting, then build the items in this order. Stop after any item if quality on Tier 1 would suffer, and record where you stopped.

## 1. Market insights (operator)

One static seeded table, computed from a seeded contribution list, not from live state.

**F11, the aggregation rule.** A cell is shown only when at least 5 distinct principal organisations contribute to it (a principal is an asset owner or a developer client; a project team counts once) and no single one contributes more than 50% of the quantity. Otherwise it shows "Not enough data to show safely", the same message whether the cell has four contributors or none. Shown values are rounded to two significant figures. There are no row or column totals, because a total spanning a suppressed cell would give it away, and no free filters. The threshold is fixed at 5 and cannot be edited.

Seed: structural steel becoming available, tonnes, by region and quarter.

| Cell | Contributions | Expected |
|---|---|---|
| Central London, Q1 2027 | 120, 95, 80, 60, 45, 40 | 440 |
| Inner London East, Q1 2027 | 90, 60, 30, 20 | Not enough data to show safely |
| Outer London West, Q2 2027 | 350, 40, 35, 30, 25, 20 | Not enough data to show safely (one contributor holds 70%) |
| Inner London West, Q2 2027 | none | Not enough data to show safely |
| Central London, Q2 2027 | 150, 150, 100, 60, 37 | 500 |

Extra test: contributions 250, 100, 60, 50, 40 (the largest is exactly 50%) show as 500.

The screen carries: "Illustrative. Built from open listings only, aggregated across at least five organisations. This prototype does not build vacancy or pipeline insights."

## 2. The screens and inputs held back from Tier 1

In this order: file upload on both importers (CSV and XLSX for the bill, CSV for the schedule, with the schedule's columns matched by name: reference as `mark`, `ref` or `reference`; section; length; quantity as `qty`, `quantity`, `count` or `no`; grade; optional need-by); browse filters (family; for steel, section type, serial size and minimum length; region; availability); the project overview screen (project facts, RIBA stage, key dates, secured against planned, content by value against the 20% aim); the draft reuse narrative on an Outputs tab, one paragraph per secured family built only from public fields, with a copy button; the seller's half of the custody timeline (surveyed, listed, agreed, dismantled, received at hub); phone layout for Browse and the listing; and any workbook sheet left out of Tier 1.

## 3. "Jump here" in the demo script panel

Tier 1 already has `runDemoStep(n)` and "Set up to here". Add a per-step "Jump here" that resets, replays steps 1 to n, switches persona and opens the step's screen with the result already on it, so the presenter can start anywhere.

## 4. Printable spec sheet for a listing

A4 print layout, public projection fields only: drawing, title, specification table, quantity, mass, condition, test status, grade, era band, source type, seller type, location, availability, guide range and signal, carbon, public ID, and the caveat line L20. For a lot shared in confidence it carries "Shared in confidence with [project name]" and the terms line L7.

## 5. Contractor bid pack (new persona)

Add Ruth Adeyemi, estimator at Wrenlow Build, the main contractor on Merrowgate Wharf. Add both names to the allowed list in `06-DATA.md` section A11.

Her lens is one screen: the confirmed and planned reused items for the project, from public fields only, with specification, quantity, mass, test status, expected delivery date, handling notes generated from structured fields (for example "Lift from the hub; pieces up to 7.5 m; check bolt holes against the connection design") and the SCI P427 line L4. Exportable to XLSX with the same columns and the caveat line.

## 6. Data for a pre-demolition audit (owner side)

An XLSX for Tiverne House marked "Confidential, owner only" and "Data for an audit. The pre-demolition audit itself is carried out independently." Sheets:

- Materials: tag, family, description, structured specification, quantity, unit, mass, condition, recoverability, test status, location in building, estimated embodied carbon of the equivalent new product (A1-A3), recommended route from F6.
- Summary: totals by family and by building layer, mass recoverable against mass to recycle.

No prices, no net values, no reserves, no tenant names, no programme dates.

## 7. Editable assumptions and weights

Make the Assumptions screen editable, with "Restore defaults", and make the four priority weights editable on the Priority tab. Changes apply live everywhere. Values the engines treat as fixed stay read-only and say so: the aggregation threshold of 5, the disclosure bands, and the demo date. Re-run the full unit suite with the defaults restored as part of the gate, and add a test that editing a factor moves the figure that depends on it and nothing else.

## 8. Definition of done, Tier 2 additions

1. Everything in `01-BRIEF.md` section 7 still passes, with the defaults restored.
2. The F11 examples above pass as unit tests.
3. The bid pack and audit workbooks are re-read by a test that checks headline cells and, for the bid pack, absence of lot private strings.
4. The spec sheet and both new exports carry L20.
5. `npm run scan` still finds no disallowed name: Ruth Adeyemi and Wrenlow Build are added to the allowed list, nothing else.
6. Screenshots regenerated, including the three new screens.
