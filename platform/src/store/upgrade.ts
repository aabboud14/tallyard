// A returning visitor whose browser holds a sandbox from an earlier build. That sandbox starts again from the
// sample data (BRIEF 14.2), so the visitor is told once, on the home dashboard and at sign-in, and pointed at what
// changed. A sandbox of the current version left on an earlier key (written by a build that kept every version
// under one key) is carried over instead, so no work done on it is lost; that browser is still told what changed,
// without the line about earlier work. Every read and write goes through the storage helpers, which never throw.
import { today } from '../sandbox/clock'
import type { AppData } from './types'
import { findUserByEmail } from './actions/auth'
import { isEmail, normaliseEmail, SAMPLE_ACCOUNTS } from '../sandbox/accounts'
import { APP_PREFIX, legacyStateKeys, readKey, removeKey, STATE_KEY, STATE_VERSION, writeKey } from './storage'

/** Set when an older sandbox was found and replaced; holds the day it was found. */
export const UPGRADED_KEY = `${APP_PREFIX}v${STATE_VERSION}-upgraded`
/**
 * Set when a sandbox of this version was carried over from an earlier key: the browser already opened the round 2
 * build deployed before this one, which replaced any older sandbox without a word. Holds the day it was found.
 */
export const WHATS_NEW_KEY = `${APP_PREFIX}v${STATE_VERSION}-whatsnew`
/** Set when the viewer closes the notice. */
export const UPGRADE_DISMISSED_KEY = `${APP_PREFIX}v${STATE_VERSION}-upgrade-dismissed`

/** The Help section that lists the changes, and its address. */
export const UPGRADE_TITLE = 'Updated on 16 October'
export const UPGRADE_HELP_TOPIC = 'updated'
export const UPGRADE_HELP_PATH = `/app/help/${UPGRADE_HELP_TOPIC}`

export const UPGRADE_NOTICE = 'The sandbox was updated on 16 October with the changes from the 14 October review. Anything you changed before then is back to the sample data.'
export const UPGRADE_SIGN_IN_HINT = 'The sandbox was updated on 16 October. Accounts made before then need to be created again.'

/** The notice for a sandbox carried over: nothing here was replaced, but the changes are still new to the viewer. */
export const UPGRADE_NOTICE_CARRIED = 'The sandbox was updated on 16 October with the changes from the 14 October review.'

export type UpgradeOutcome = 'none' | 'carried_over' | 'replaced'

function storedVersion(raw: string): number | null {
  try {
    const v = JSON.parse(raw) as { version?: unknown; state?: { version?: unknown } } | null
    if (!v || typeof v !== 'object') return null
    return typeof v.version === 'number' && v.state && v.state.version === v.version ? v.version : null
  } catch {
    return null
  }
}

/**
 * Looks for data an earlier build left on its own key, and clears it. When this build has no data yet, data of
 * the current version is carried over to the current key, and anything else is replaced by the sample sandbox
 * with the upgrade recorded for the notice. When this build already has data, an older key holds only what a tab
 * of the old build still open wrote since: it is cleared and nothing is recorded, because nothing here was lost.
 * Runs before the store first reads its key.
 */
export function upgradeStoredState(): UpgradeOutcome {
  let outcome: UpgradeOutcome = 'none'
  let current = readKey('local', STATE_KEY) !== null
  for (const key of legacyStateKeys()) {
    const raw = readKey('local', key)
    if (raw === null) continue
    removeKey('local', key)
    if (current) continue
    if (storedVersion(raw) === STATE_VERSION) {
      writeKey('local', STATE_KEY, raw)
      if (readKey('local', WHATS_NEW_KEY) === null) writeKey('local', WHATS_NEW_KEY, today())
      current = true
      outcome = 'carried_over'
    } else {
      if (readKey('local', UPGRADED_KEY) === null) writeKey('local', UPGRADED_KEY, today())
      outcome = 'replaced'
    }
  }
  return outcome
}

/** Whether this browser's sandbox replaced one from an earlier build. */
export function wasUpgraded(): boolean {
  return readKey('local', UPGRADED_KEY) !== null
}

/**
 * Whether this browser held a sandbox from before the 16 October update: one replaced here, or one carried over
 * from the round 2 build deployed before, which had already replaced any older sandbox. Accounts made in that
 * older sandbox are gone either way.
 */
export function sandboxWasUpdated(): boolean {
  return wasUpgraded() || readKey('local', WHATS_NEW_KEY) !== null
}

export type UpgradeNoticeKind = 'replaced' | 'carried_over'

/**
 * Which notice the home shows, if any. A replaced sandbox says the earlier changes are back to the sample data; a
 * carried over one only says what was updated, because its work was kept. Closed for good once closed.
 */
export function upgradeNoticeKind(replaced: boolean, carried: boolean, dismissed: boolean): UpgradeNoticeKind | null {
  if (dismissed) return null
  if (replaced) return 'replaced'
  return carried ? 'carried_over' : null
}

/** The notice's text for its kind. */
export function upgradeNoticeText(kind: UpgradeNoticeKind): string {
  return kind === 'replaced' ? UPGRADE_NOTICE : UPGRADE_NOTICE_CARRIED
}

/** The notice this browser's home shows now, read from storage. */
export function currentUpgradeNotice(): UpgradeNoticeKind | null {
  return upgradeNoticeKind(wasUpgraded(), readKey('local', WHATS_NEW_KEY) !== null, readKey('local', UPGRADE_DISMISSED_KEY) !== null)
}

/** Whether the home dashboard shows the upgrade notice: the sandbox was updated and the viewer has not closed it. */
export function upgradeNoticeShown(): boolean {
  return currentUpgradeNotice() !== null
}

export function dismissUpgradeNotice(): void {
  writeKey('local', UPGRADE_DISMISSED_KEY, today())
}

/** Forgets the upgrade, for a reset sandbox: everything is sample data again, so there is nothing to tell. */
export function clearUpgradeState(): void {
  removeKey('local', UPGRADED_KEY)
  removeKey('local', WHATS_NEW_KEY)
  removeKey('local', UPGRADE_DISMISSED_KEY)
  for (const key of legacyStateKeys()) removeKey('local', key)
}

/** How many single-letter edits apart two strings are (Levenshtein distance). */
export function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = row
  }
  return prev[b.length]
}

/** Up to this many letters wrong still reads as a mistyped address rather than another one. */
const TYPO_EDITS = 2

function domainOf(email: string): string {
  const e = normaliseEmail(email)
  return e.slice(e.lastIndexOf('@') + 1)
}

/**
 * Whether an email that matches no account looks like a mistyped one that does: its domain is a sample
 * organisation's, or nearly, or the whole address is nearly an account's. Such a person has made a typo, and
 * must not be told their account is gone.
 */
export function looksLikeAccountTypo(state: AppData, email: string): boolean {
  const e = normaliseEmail(email)
  const domain = domainOf(e)
  if (SAMPLE_ACCOUNTS.some((a) => editDistance(domainOf(a.email), domain) <= TYPO_EDITS)) return true
  return Object.values(state.users).some((u) => editDistance(normaliseEmail(u.email), e) <= TYPO_EDITS)
}

/**
 * Whether a failed sign-in should say that accounts made before the upgrade are gone: the sandbox was updated, no
 * account in it has this email, and the email is not a near miss of one that has. A known email with a wrong
 * password, or a mistyped one, gets the plain message only.
 */
export function signInUpgradeHint(state: AppData, email: string, upgraded: boolean): boolean {
  if (!upgraded || !email.trim()) return false
  return findUserByEmail(state, email) === null && !looksLikeAccountTypo(state, email)
}

/**
 * Whether the sign-in page explains, before any attempt, why a returning visitor was signed out: the sandbox was
 * updated and the remembered sign-in is to an account it no longer holds, one made in the older sandbox.
 */
export function staleSessionHint(state: AppData, sessionUserId: string | null, upgraded: boolean): boolean {
  return upgraded && sessionUserId !== null && !state.users[sessionUserId]
}

/** What sign-up starts with when the visitor comes from the sign-in hint: the address they typed, if it reads as one. */
export function signUpEmailFrom(value: unknown): string {
  if (!value || typeof value !== 'object' || !('email' in value)) return ''
  const email = (value as { email: unknown }).email
  return typeof email === 'string' && isEmail(email) ? email.trim() : ''
}

/** Whether a value written to the data key by another tab is one this build can read. */
export function isCurrentStoredState(raw: string | null): boolean {
  return raw !== null && storedVersion(raw) === STATE_VERSION
}
