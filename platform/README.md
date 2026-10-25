# Tallyard platform

The SaaS-style platform for reclaimed structural and facade materials: sign in, work project by project, by role. Spec in `BRIEF.md`, rules in `CLAUDE.md`.

Live: https://tallyard-platform.vercel.app/ (Vercel project `tallyard-platform`, root directory `platform`).

## Sample accounts

Every sample account uses the password `sandbox`; the sign-in page also has one-click cards. Sandbox data stays in the visitor's browser and can be reset in Settings, Sandbox.

| Person | Organisation | Role |
|---|---|---|
| Priya Nair | Studio Oriel | Architect |
| Isla Brennan | Lantern Quay Developments | Client (developer) |
| Tom Ashby | Ostlea Estates | Donor building owner |
| Dana Kowalski | Tarnbrook Deconstruction | Site surveyor |
| Marcus Lindqvist | Halewick Sustainability | Sustainability consultant |

## Round 2 (review of 14 October 2026)

The partner's notes are in `feedback/2026-10-14-review.md`; the decisions on each note are in `BRIEF.md` section 14 and the detailed designs in `feedback/r2-design/`. In short:

- Dashboards for every role with state-coloured metrics, drawn project and building thumbnails, and collapsible recent activity. A calmer, technical-drawing visual style and a reworked landing page.
- Discover is now the Marketplace (`/app/marketplace`; old links redirect). It opens on Structure, Envelope and Finishes folders, checks against no project by default, shows approximate availability with a month slider, and hides the guide price and seller details from architects. The material page leads with pictures and a spinnable 3D view, and adds an IFC4 download that opens in Revit.
- Projects have a RIBA Plan of Work programme with site start and practical completion, a programme chart with shortlisted materials against it, planning and sustainability requirements from the region and local authority, thirteen project types plus your own, a setup checklist, and client approval before a project reaches the client.
- Donor buildings: the owner role reads Donor building owner, Priorities is the Recovery plan, buildings are Donor buildings or New projects, share links can be revoked, and the structure is recorded element by element. Surveyors capture from a standalone page, add buildings before an appointment, and request testing; deconstruction contractors set availability dates.
- The developer home shows cost, saving, avoided carbon, reuse by value, certification tracking, a programme across projects and a to-do list. The consultant gets Goals and targets, Certification, the circular economy statement (export to Word) and a Sustainability tab.

Every assertion changed because the partner changed the product is listed with its reason in `feedback/r2-test-changes-*.md`.

## Run

```
npm ci
npm run dev
npm run check      typecheck, lint, unit tests, build
npm run e2e        build, then Playwright
```
