# Round 2 follow-up: returning visitors and the old build (package upgrade)

From the recording audit of 16 October 2026. One line per note, then the existing test assertions changed.

## Notes

- R1, cross-tab loop (fixed): the persisted data now lives under a key named after its version (`tallyard-platform-v2-state`, from `stateKey(STATE_VERSION)` in `src/store/storage.ts`), so a tab of the 14 October build keeps writing its own `-v1-state` key and the two builds never reseed each other. A future version bump moves the key again by itself. The storage listener (`onStorageEvent` in `src/store/app.ts`) also rehydrates only for a record of this version, so a cleared, damaged or other-version value can never reseed a tab and be written back. Checked against the real 14 October build (built from 91b294c, both builds served on one origin): one storage event, the new tab's rename survived 3 s and a reload, the old tab kept its own rename in memory.
- R1, work wiped with no notice (fixed): `upgradeStoredState()` in the new `src/store/upgrade.ts` runs before the store first reads. A version 1 sandbox on the old key is removed and recorded (`tallyard-platform-v2-upgraded`, dated by the one clock). Every role's home shows a closable notice with the brief's text and "See what changed"; closing it is remembered per browser (`tallyard-platform-v2-upgrade-dismissed`). Decision: a sandbox already of version 2 on the old key (written by the round 2 build that was deployed before this fix, which kept the old key name) is carried over to the new key, not replaced, so work done on the live round 2 build is kept and no notice shows. Decision: when this build already has data, an old-key record is only an old tab's leftovers; it is cleared without a notice, because nothing here was lost. Reset clears the upgrade record too.
- R1, self-made accounts fail (fixed): a failed sign-in for an email with no account, after an upgrade, adds "The sandbox was updated on 16 October. Accounts made before then need to be created again." with a "Create your account again" link to sign-up (`signInUpgradeHint`). A known email with a wrong password, or a browser that was never upgraded, gets the plain message only.
- R1, nothing says what changed (fixed): new Help topic "Updated on 16 October" (`/app/help/updated`), from the pure selector `whatChangedView`. It lists the eleven round 2 changes (the ten the audit named plus clients accepting new projects). The viewer's own changes come first, each with a link checked by `routeAccess` to a page they can open (their first project or building by name, as the sidebar lists them, else the list page); the other workspaces' changes follow without links. On a phone the Help topic strip scrolls the open topic into view, so this fourth topic is never hidden off the edge.
- Incidental, old tabs never learn of a new build (fixed for every build from this one on): `NewVersionPrompt` (rendered beside the Toaster in `main.tsx`) checks the served index page when the person returns to the tab, and every ten minutes while it is in view, at most every 30 s. If its entry script differs from the running one, a bar says "A new version of Tallyard is available." with Reload and Not now. Production builds only. The 14 October build itself cannot be changed; its tab stops affecting the new one (above) and reloads into the new build on its next lazy page or reload.
- Incidental, the old tab's own work thrown away by the new tab (fixed): the new build never writes the old key, so the old tab's in-memory work is untouched while it stays open. The new build removes the old key on its next load; the old tab reloads into the new build anyway.

## Shared files touched (smallest change)

- `src/store/storage.ts`: `APP_PREFIX`, `STATE_VERSION` (moved here so the key can follow it; `app.ts` re-exports it), `stateKey`, `legacyStateKeys`; `clearAppKeys` matches `APP_PREFIX` so it clears every build's keys.
- `src/store/app.ts`: calls `upgradeStoredState()` before `create`, `resetSandbox` calls `clearUpgradeState()`, the storage listener is `onStorageEvent` with the version check.
- `src/features/home/Home.tsx`: renders `UpgradeNotice` above the role's home.
- `src/features/help/Help.tsx`: one topic entry, one branch, the active topic scrolled into view.
- `src/store/selectors/arch-breadcrumbs.ts`: `updated` in `HELP_TOPIC_LABELS`.
- `src/features/auth/SignInForm.tsx` (optional `errorHint`), `SignInPage.tsx`, `src/main.tsx`.

## Tests added

- `src/store/upgrade.test.ts`, `src/store/app.upgrade.test.ts` (jsdom: load over a version 1 sandbox, version 1 storage events change nothing, a version 2 event is picked up, Reset forgets the upgrade), `src/store/selectors/whatChanged.test.ts`, `src/app/version.test.ts`, `src/features/help/upgrade.screen.test.tsx`, `e2e/r2-upgrade.spec.ts` (returning visitor with the notice, Help and sign-in line at 390, 1024 and 1440; an old tab writing beside the new one; the new version bar).

## Existing test assertions changed

None. `src/store/app.test.ts` imports `STATE_KEY` and still passes unchanged: its keys now resolve to `tallyard-platform-v2-state`.
