// A returning visitor whose browser holds a sandbox from an earlier build. That sandbox starts again from the
// sample data (BRIEF 14.2), so the visitor is told once, on the home dashboard and at sign-in, and pointed at what
// changed. A sandbox of the current version left on an earlier key (written by a build that kept every version
// under one key) is carried over instead, so no work done on it is lost. Every read and write goes through the
// storage helpers, which never throw.
import { today } from '../sandbox/clock'
import type { AppData } from './types'
import { findUserByEmail } from './actions/auth'
import { APP_PREFIX, legacyStateKeys, readKey, removeKey, STATE_KEY, STATE_VERSION, writeKey } from './storage'

/** Set when an older sandbox was found and replaced; holds the day it was found. */
export const UPGRADED_KEY = `${APP_PREFIX}v${STATE_VERSION}-upgraded`
/** Set when the viewer closes the notice. */
export const UPGRADE_DISMISSED_KEY = `${APP_PREFIX}v${STATE_VERSION}-upgrade-dismissed`

/** The Help section that lists the changes, and its address. */
export const UPGRADE_TITLE = 'Updated on 16 October'
export const UPGRADE_HELP_TOPIC = 'updated'
export const UPGRADE_HELP_PATH = `/app/help/${UPGRADE_HELP_TOPIC}`

export const UPGRADE_NOTICE = 'The sandbox was updated on 16 October with the changes from the 14 October review. Anything you changed before then is back to the sample data.'
export const UPGRADE_SIGN_IN_HINT = 'The sandbox was updated on 16 October. Accounts made before then need to be created again.'

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

/** Whether the home dashboard shows the upgrade notice: an older sandbox was replaced and the viewer has not closed it. */
export function upgradeNoticeShown(): boolean {
  return wasUpgraded() && readKey('local', UPGRADE_DISMISSED_KEY) === null
}

export function dismissUpgradeNotice(): void {
  writeKey('local', UPGRADE_DISMISSED_KEY, today())
}

/** Forgets the upgrade, for a reset sandbox: everything is sample data again, so there is nothing to tell. */
export function clearUpgradeState(): void {
  removeKey('local', UPGRADED_KEY)
  removeKey('local', UPGRADE_DISMISSED_KEY)
  for (const key of legacyStateKeys()) removeKey('local', key)
}

/**
 * Whether a failed sign-in should say that accounts made before the upgrade are gone: the sandbox was upgraded
 * and no account in it has this email, so it may have been made in the old one. A known email with a wrong
 * password gets the plain message only.
 */
export function signInUpgradeHint(state: AppData, email: string, upgraded: boolean): boolean {
  if (!upgraded || !email.trim()) return false
  return findUserByEmail(state, email) === null
}

/** Whether a value written to the data key by another tab is one this build can read. */
export function isCurrentStoredState(raw: string | null): boolean {
  return raw !== null && storedVersion(raw) === STATE_VERSION
}
