# Tallyard platform

The SaaS-style platform for reclaimed structural and facade materials: sign in, work project by project, by role. Spec in `BRIEF.md`, rules in `CLAUDE.md`.

Live: https://tallyard-platform.vercel.app/ (Vercel project `tallyard-platform`, root directory `platform`).

## Sample accounts

Every sample account uses the password `sandbox`; the sign-in page also has one-click cards. Sandbox data stays in the visitor's browser and can be reset in Settings, Sandbox.

| Person | Organisation | Role |
|---|---|---|
| Priya Nair | Studio Oriel | Architect |
| Isla Brennan | Lantern Quay Developments | Client (developer) |
| Tom Ashby | Ostlea Estates | Asset owner |
| Dana Kowalski | Tarnbrook Deconstruction | Site surveyor |
| Marcus Lindqvist | Halewick Sustainability | Sustainability consultant |

## Run

```
npm ci
npm run dev
npm run check      typecheck, lint, unit tests, build
npm run e2e        build, then Playwright
```
