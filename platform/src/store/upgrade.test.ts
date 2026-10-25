// A returning visitor's browser: data an earlier build left on its own key is carried over when it is of this
// version, or replaced and recorded for the notice; keys are versioned so an old tab and a new one never share
// one; Reset clears every key of the app; a failed sign-in explains missing accounts only when it should.
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setClockForTests } from '../sandbox/clock'
import { APP_PREFIX, clearAppKeys, legacyStateKeys, readKey, removeKey, SESSION_KEY, STATE_KEY, STATE_VERSION, stateKey, writeKey } from './storage'
import { clearUpgradeState, currentUpgradeNotice, dismissUpgradeNotice, editDistance, isCurrentStoredState, joinedAfterUpdate, looksLikeAccountTypo, sandboxWasUpdated, signInHintsApply, signInUpgradeHint, signUpEmailFrom, staleSessionHint, UPGRADE_DISMISSED_KEY, UPGRADE_NOTICE, UPGRADE_NOTICE_CARRIED, UPGRADE_SIGN_IN_HINT, UPGRADE_TITLE, UPGRADED_KEY, UPGRADE_HINT_DAYS, upgradeHintOpen, upgradeNoticeKind, upgradeNoticeShown, upgradeNoticeText, upgradeStoredState, updatedOn, wasUpgraded, WHATS_NEW_KEY } from './upgrade'
import { FORBIDDEN } from '../ui/testing'
import type { AppData } from './types'

const V1 = 'tallyard-platform-v1-state'
const v1Record = JSON.stringify({ state: { version: 1, world: { projects: {} }, users: {} }, version: 1 })
const v2Record = (tag: string) => JSON.stringify({ state: { version: STATE_VERSION, seededOn: tag }, version: STATE_VERSION })

function clean() {
  for (const k of [STATE_KEY, V1, UPGRADED_KEY, WHATS_NEW_KEY, UPGRADE_DISMISSED_KEY, SESSION_KEY]) removeKey('local', k)
}

beforeEach(() => {
  setClockForTests('2026-10-16T08:00:00.000Z')
  clean()
})
afterEach(() => clean())
afterAll(() => setClockForTests(null))

describe('storage keys', () => {
  it('keeps the data of each version under its own key, and the session under the same key as before', () => {
    expect(STATE_VERSION).toBe(2)
    expect(STATE_KEY).toBe('tallyard-platform-v2-state')
    expect(stateKey(3)).toBe('tallyard-platform-v3-state')
    expect(legacyStateKeys()).toEqual([V1])
    expect(SESSION_KEY).toBe('tallyard-platform-v1-session')
    expect(STATE_KEY.startsWith(APP_PREFIX) && SESSION_KEY.startsWith(APP_PREFIX)).toBe(true)
  })

  it('Reset clears the keys of every build of the app, and nothing else', () => {
    writeKey('local', V1, v1Record)
    writeKey('local', STATE_KEY, v2Record('x'))
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    writeKey('session', 'tallyard-platform-v1-reloaded', '1')
    writeKey('local', 'tallyard-v05-state', 'demo')
    writeKey('local', 'someone-else', 'keep')
    clearAppKeys()
    for (const k of [V1, STATE_KEY, UPGRADED_KEY]) expect(readKey('local', k)).toBeNull()
    expect(readKey('session', 'tallyard-platform-v1-reloaded')).toBeNull()
    expect(readKey('local', 'tallyard-v05-state')).toBe('demo')
    expect(readKey('local', 'someone-else')).toBe('keep')
    removeKey('local', 'tallyard-v05-state')
    removeKey('local', 'someone-else')
  })
})

describe('upgradeStoredState', () => {
  it('does nothing for a first visit', () => {
    expect(upgradeStoredState()).toBe('none')
    expect(wasUpgraded()).toBe(false)
    expect(upgradeNoticeShown()).toBe(false)
  })

  it('a version 1 sandbox on the old key is removed and the upgrade is recorded with today', () => {
    writeKey('local', V1, v1Record)
    expect(upgradeStoredState()).toBe('replaced')
    expect(readKey('local', V1)).toBeNull()
    expect(readKey('local', STATE_KEY)).toBeNull()
    expect(readKey('local', UPGRADED_KEY)).toBe('2026-10-16')
    expect(wasUpgraded()).toBe(true)
    expect(upgradeNoticeShown()).toBe(true)
  })

  it('an old tab writing again before anything was saved here keeps the first date and the closed notice closed', () => {
    writeKey('local', V1, v1Record)
    upgradeStoredState()
    dismissUpgradeNotice()
    setClockForTests('2026-10-18T08:00:00.000Z')
    writeKey('local', V1, v1Record)
    expect(upgradeStoredState()).toBe('replaced')
    expect(readKey('local', UPGRADED_KEY)).toBe('2026-10-16')
    expect(upgradeNoticeShown()).toBe(false)
  })

  it('an old tab writing beside a sandbox already in use here is cleared without a notice, and the sandbox is kept', () => {
    writeKey('local', STATE_KEY, v2Record('in use'))
    writeKey('local', V1, v1Record)
    expect(upgradeStoredState()).toBe('none')
    expect(readKey('local', V1)).toBeNull()
    expect(readKey('local', STATE_KEY)).toBe(v2Record('in use'))
    expect(wasUpgraded()).toBe(false)
  })

  it('a damaged record on the old key counts as an older sandbox', () => {
    writeKey('local', V1, '{ not json')
    expect(upgradeStoredState()).toBe('replaced')
    expect(readKey('local', V1)).toBeNull()
  })

  it('a sandbox of this version left on the old key is carried over, so no work on it is lost', () => {
    writeKey('local', V1, v2Record('mine'))
    expect(upgradeStoredState()).toBe('carried_over')
    expect(readKey('local', STATE_KEY)).toBe(v2Record('mine'))
    expect(readKey('local', V1)).toBeNull()
    expect(wasUpgraded()).toBe(false)
  })

  it('never overwrites data already on the current key', () => {
    writeKey('local', STATE_KEY, v2Record('current'))
    writeKey('local', V1, v2Record('older tab'))
    expect(upgradeStoredState()).toBe('none')
    expect(readKey('local', STATE_KEY)).toBe(v2Record('current'))
    expect(readKey('local', V1)).toBeNull()
  })

  it('closing the notice is remembered, and a reset forgets the upgrade', () => {
    writeKey('local', V1, v1Record)
    upgradeStoredState()
    dismissUpgradeNotice()
    expect(upgradeNoticeShown()).toBe(false)
    expect(wasUpgraded()).toBe(true)
    writeKey('local', V1, v1Record)
    clearUpgradeState()
    expect(wasUpgraded()).toBe(false)
    expect(readKey('local', UPGRADE_DISMISSED_KEY)).toBeNull()
    expect(readKey('local', V1)).toBeNull()
  })
})

describe('a sandbox carried over from the round 2 build deployed before this one', () => {
  it('is told what changed, without the line about earlier work, until the notice is closed', () => {
    writeKey('local', V1, v2Record('live round 2'))
    expect(upgradeStoredState()).toBe('carried_over')
    expect(readKey('local', WHATS_NEW_KEY)).toBe('2026-10-16')
    expect(wasUpgraded()).toBe(false)
    expect(sandboxWasUpdated()).toBe(true)
    expect(currentUpgradeNotice()).toBe('carried_over')
    expect(upgradeNoticeShown()).toBe(true)
    dismissUpgradeNotice()
    expect(currentUpgradeNotice()).toBeNull()
    expect(upgradeNoticeShown()).toBe(false)
  })

  it('a later old tab write beside it records nothing more, and Reset forgets it', () => {
    writeKey('local', V1, v2Record('live round 2'))
    upgradeStoredState()
    setClockForTests('2026-10-18T08:00:00.000Z')
    writeKey('local', V1, v1Record)
    expect(upgradeStoredState()).toBe('none')
    expect(readKey('local', WHATS_NEW_KEY)).toBe('2026-10-16')
    expect(wasUpgraded()).toBe(false)
    clearUpgradeState()
    expect(readKey('local', WHATS_NEW_KEY)).toBeNull()
    expect(sandboxWasUpdated()).toBe(false)
    expect(currentUpgradeNotice()).toBeNull()
  })

  it('a first visit records neither', () => {
    upgradeStoredState()
    expect(sandboxWasUpdated()).toBe(false)
    expect(currentUpgradeNotice()).toBeNull()
  })
})

describe('upgradeNoticeKind and its text', () => {
  it('a replaced sandbox wins over a carried one, and a closed notice stays closed', () => {
    expect(upgradeNoticeKind(true, false, false)).toBe('replaced')
    expect(upgradeNoticeKind(true, true, false)).toBe('replaced')
    expect(upgradeNoticeKind(false, true, false)).toBe('carried_over')
    expect(upgradeNoticeKind(false, false, false)).toBeNull()
    expect(upgradeNoticeKind(true, true, true)).toBeNull()
    expect(upgradeNoticeText('replaced')).toBe(UPGRADE_NOTICE)
    expect(upgradeNoticeText('carried_over')).toBe('The sandbox was updated on 16 October with the changes from the 14 October review.')
    expect(UPGRADE_NOTICE_CARRIED).not.toContain('back to the sample data')
  })
})

describe('isCurrentStoredState', () => {
  it('accepts only a record of this version', () => {
    expect(isCurrentStoredState(v2Record('x'))).toBe(true)
    expect(isCurrentStoredState(v1Record)).toBe(false)
    expect(isCurrentStoredState(JSON.stringify({ state: { version: 1 }, version: STATE_VERSION }))).toBe(false)
    expect(isCurrentStoredState('{ not json')).toBe(false)
    expect(isCurrentStoredState('null')).toBe(false)
    expect(isCurrentStoredState(null)).toBe(false)
  })
})

describe('signInUpgradeHint', () => {
  const state = { users: { u1: { email: 'Priya.Nair@studiooriel.example' } } } as unknown as AppData
  it('explains only for an email with no account, after an upgrade', () => {
    expect(signInUpgradeHint(state, 'jo@parkstudio.example', true)).toBe(true)
    expect(signInUpgradeHint(state, ' priya.nair@studiooriel.example ', true)).toBe(false)
    expect(signInUpgradeHint(state, 'jo@parkstudio.example', false)).toBe(false)
    expect(signInUpgradeHint(state, '  ', true)).toBe(false)
  })
})

describe('a mistyped email is not told its account is gone', () => {
  const state = { users: { u1: { email: 'priya.nair@studiooriel.example' }, u2: { email: 'jo.park@parkstudio.example' } } } as unknown as AppData

  it('editDistance counts single-letter edits', () => {
    expect(editDistance('', '')).toBe(0)
    expect(editDistance('abc', 'abc')).toBe(0)
    expect(editDistance('studiooriel.example', 'studiooriel.exampl')).toBe(1)
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('', 'abc')).toBe(3)
    // Two neighbouring letters swapped is one slip, not two.
    expect(editDistance('ostlea', 'ostlae')).toBe(1)
    expect(editDistance('jo.park', 'jo.prak')).toBe(1)
    expect(editDistance('fernbrook.example', 'tarnbrook.example')).toBe(2)
  })

  it('a sample domain, or nearly one, or nearly an account address, reads as a typo', () => {
    expect(looksLikeAccountTypo(state, 'priya.nair@studiooriel.exampl')).toBe(true)
    expect(looksLikeAccountTypo(state, 'priya.nar@studiooriel.example')).toBe(true)
    expect(looksLikeAccountTypo(state, 'someone@ostlae.example')).toBe(true)
    expect(looksLikeAccountTypo(state, 'someone@ostlea.example')).toBe(false)
    expect(looksLikeAccountTypo(state, 'jo.prak@parkstudio.example')).toBe(true)
    expect(looksLikeAccountTypo(state, 'jo@parkstudio.example')).toBe(false)
  })

  it('the hint skips a typo of a sample account but still explains an unknown address', () => {
    expect(signInUpgradeHint(state, 'priya.nair@studiooriel.exampl', true)).toBe(false)
    expect(signInUpgradeHint(state, 'PRIYA.NAIR@STUDIOORIEL.EXAMPL', true)).toBe(false)
    expect(signInUpgradeHint(state, 'jo@parkstudio.example', true)).toBe(true)
  })

  it('a teammate invited into a sample organisation in the older sandbox is told the account is gone', () => {
    expect(looksLikeAccountTypo(state, 'j@ostlea.example')).toBe(false)
    expect(signInUpgradeHint(state, 'j@ostlea.example', true)).toBe(true)
    expect(signInUpgradeHint(state, 'J@OSTLEA.EXAMPLE', true)).toBe(true)
  })

  it('an organisation whose domain is two letters from a sample one is another organisation, not a typo', () => {
    expect(looksLikeAccountTypo(state, 'rowan@fernbrook.example')).toBe(false)
    expect(signInUpgradeHint(state, 'rowan@fernbrook.example', true)).toBe(true)
  })

  it('a near miss of a whole account address is still a typo, even at a sample domain', () => {
    expect(signInUpgradeHint(state, 'priya.nar@studiooriel.example', true)).toBe(false)
    expect(signInUpgradeHint(state, 'priya.nair@studiorial.example', true)).toBe(false)
  })
})

describe('how long the sign-in page explains the update', () => {
  it('from the day this browser found it, for 30 days', () => {
    expect(UPGRADE_HINT_DAYS).toBe(30)
    expect(upgradeHintOpen(null, '2026-10-16')).toBe(false)
    expect(upgradeHintOpen('2026-10-16', '2026-10-16')).toBe(true)
    expect(upgradeHintOpen('2026-10-16', '2026-11-14')).toBe(true)
    expect(upgradeHintOpen('2026-10-16', '2026-11-15')).toBe(false)
    expect(upgradeHintOpen('2026-10-16', '2027-03-01')).toBe(false)
    // A date after today (a clock moved back) is not taken as open.
    expect(upgradeHintOpen('2026-10-18', '2026-10-16')).toBe(false)
  })

  it('reads the earlier of the recorded days, and ignores a damaged one', () => {
    expect(updatedOn()).toBeNull()
    writeKey('local', WHATS_NEW_KEY, '2026-10-17')
    expect(updatedOn()).toBe('2026-10-17')
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    expect(updatedOn()).toBe('2026-10-16')
    writeKey('local', UPGRADED_KEY, 'not a date')
    expect(updatedOn()).toBe('2026-10-17')
  })

  it('closes on the one clock, while the notice record stays', () => {
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    expect(signInHintsApply()).toBe(true)
    setClockForTests('2026-11-14T23:00:00.000Z')
    expect(signInHintsApply()).toBe(true)
    setClockForTests('2026-11-15T08:00:00.000Z')
    expect(signInHintsApply()).toBe(false)
    expect(sandboxWasUpdated()).toBe(true)
  })
})

describe('the notice and people who joined after the update', () => {
  const sample = { sample: true, createdAt: '2026-08-08T09:00:00.000Z' }
  const madeBefore = { sample: false, createdAt: '2026-10-15T09:00:00.000Z' }
  const madeThatDay = { sample: false, createdAt: '2026-10-16T11:00:00.000Z' }
  const madeAfter = { sample: false, createdAt: '2026-10-20T09:00:00.000Z' }

  it('joinedAfterUpdate holds only for an account of its own made on or after the recorded day', () => {
    expect(joinedAfterUpdate(madeThatDay, '2026-10-16')).toBe(true)
    expect(joinedAfterUpdate(madeAfter, '2026-10-16')).toBe(true)
    expect(joinedAfterUpdate(madeBefore, '2026-10-16')).toBe(false)
    expect(joinedAfterUpdate(sample, '2026-10-16')).toBe(false)
    expect(joinedAfterUpdate({ ...sample, createdAt: '2026-10-16T08:00:00.000Z' }, '2026-10-16')).toBe(false)
    expect(joinedAfterUpdate(madeAfter, null)).toBe(false)
    expect(joinedAfterUpdate(null, '2026-10-16')).toBe(false)
  })

  it('upgradeNoticeKind shows nothing to such a person', () => {
    expect(upgradeNoticeKind(true, false, false, true)).toBeNull()
    expect(upgradeNoticeKind(false, true, false, true)).toBeNull()
    expect(upgradeNoticeKind(true, false, false, false)).toBe('replaced')
  })

  it('currentUpgradeNotice reads it for the signed-in person', () => {
    writeKey('local', UPGRADED_KEY, '2026-10-16')
    expect(currentUpgradeNotice()).toBe('replaced')
    expect(currentUpgradeNotice(sample)).toBe('replaced')
    expect(currentUpgradeNotice(madeThatDay)).toBeNull()
    clean()
    writeKey('local', WHATS_NEW_KEY, '2026-10-16')
    expect(currentUpgradeNotice(madeBefore)).toBe('carried_over')
    expect(currentUpgradeNotice(madeAfter)).toBeNull()
  })
})

describe('staleSessionHint', () => {
  const state = { users: { usr_k4p9n2: { email: 'priya.nair@studiooriel.example' } } } as unknown as AppData
  it('explains a remembered sign-in to an account the updated sandbox no longer holds', () => {
    expect(staleSessionHint(state, 'usr_m4k2p9', true)).toBe(true)
    expect(staleSessionHint(state, 'usr_m4k2p9', false)).toBe(false)
    expect(staleSessionHint(state, 'usr_k4p9n2', true)).toBe(false)
    expect(staleSessionHint(state, null, true)).toBe(false)
  })
})

describe('signUpEmailFrom', () => {
  it('takes the typed address from the link state, and nothing else', () => {
    expect(signUpEmailFrom({ email: ' jo@parkstudio.example ' })).toBe('jo@parkstudio.example')
    expect(signUpEmailFrom({ email: 'not an email' })).toBe('')
    expect(signUpEmailFrom({ email: 3 })).toBe('')
    expect(signUpEmailFrom(null)).toBe('')
    expect(signUpEmailFrom(undefined)).toBe('')
    expect(signUpEmailFrom('jo@parkstudio.example')).toBe('')
  })
})

describe('copy', () => {
  it('reads plainly, with no forbidden characters', () => {
    for (const s of [UPGRADE_NOTICE, UPGRADE_NOTICE_CARRIED, UPGRADE_SIGN_IN_HINT, UPGRADE_TITLE]) expect(s).not.toMatch(FORBIDDEN)
    expect(UPGRADE_NOTICE).toBe('The sandbox was updated on 16 October with the changes from the 14 October review. Anything you changed before then is back to the sample data.')
  })
})
