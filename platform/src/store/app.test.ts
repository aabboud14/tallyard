import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { setClockForTests } from '../sandbox/clock'
import { useApp, getData, STATE_VERSION } from './app'
import { act } from './act'
import { acceptInvite, requestPasswordReset, resetPassword, signIn, signOut, signUp, switchAccount } from './session'
import { getSessionUserId } from './sessionId'
import { readKey, writeKey, SESSION_KEY, STATE_KEY } from './storage'
import { AUTH_ERRORS } from './actions/auth'
import { ERRORS, roleOfUser } from './access'
import { projectWishlist } from './lots'
import { U } from '../test/fixtures'
import { MERROWGATE_ID, ORG_IDS } from '../domain/seed/world'

beforeEach(async () => {
  setClockForTests('2026-10-08T10:00:00.000Z')
  signOut()
  await useApp.getState().resetSandbox()
})

afterAll(() => setClockForTests(null))

describe('sign-in', () => {
  it('signs in a sample account with the sandbox password, for this session only', async () => {
    const r = await signIn('Priya.Nair@studiooriel.example ', 'sandbox', false)
    expect(r.error).toBeNull()
    expect(getSessionUserId()).toBe(U.priya)
    expect(readKey('session', SESSION_KEY)).toBe(U.priya)
    expect(readKey('local', SESSION_KEY)).toBeNull()
  })

  it('remembers the session when asked', async () => {
    await signIn('tom.ashby@ostlea.example', 'sandbox', true)
    expect(readKey('local', SESSION_KEY)).toBe(U.tom)
    signOut()
    expect(getSessionUserId()).toBeNull()
    expect(readKey('local', SESSION_KEY)).toBeNull()
  })

  it('says only that the email and password do not match', async () => {
    expect((await signIn('priya.nair@studiooriel.example', 'Sandbox', true)).error).toBe('That email and password do not match.')
    expect((await signIn('nobody@nowhere.example', 'sandbox', true)).error).toBe('That email and password do not match.')
    expect(getSessionUserId()).toBeNull()
  })

  it('switches between sample accounts only', async () => {
    await signIn('priya.nair@studiooriel.example', 'sandbox', true)
    expect(switchAccount(U.isla).error).toBeNull()
    expect(getSessionUserId()).toBe(U.isla)
    expect(readKey('local', SESSION_KEY)).toBe(U.isla)
    expect(switchAccount('usr_nobody').error).toBe(AUTH_ERRORS.notSample)
  })
})

describe('sign-up, reset and invites', () => {
  it('signs up a new architecture practice and signs in', async () => {
    const r = await signUp({ name: 'Jo Park', email: 'jo@parkstudio.example', password: 'drawings1', orgName: 'Park Studio', orgType: 'Architect' })
    expect(r.error).toBeNull()
    const id = getSessionUserId()!
    const data = getData()
    expect(data.users[id].name).toBe('Jo Park')
    expect(data.users[id].passwordHash).not.toContain('drawings1')
    expect(roleOfUser(data, id)).toBe('architect')
    signOut()
    expect((await signIn('jo@parkstudio.example', 'drawings1', false)).error).toBeNull()
  })

  it('returns every field error at once', async () => {
    const r = await signUp({ name: '', email: 'x', password: 'short', orgName: '', orgType: '' })
    expect(Object.keys(r.fieldErrors).sort()).toEqual(['email', 'name', 'orgName', 'orgType', 'password'])
    expect(getSessionUserId()).toBeNull()
  })

  it('resets a password on the page, in the sandbox', async () => {
    expect(requestPasswordReset('nobody@x.example').error).toBe(AUTH_ERRORS.noAccount)
    expect(requestPasswordReset('tom.ashby@ostlea.example').error).toBeNull()
    expect((await resetPassword('tom.ashby@ostlea.example', 'short')).error).toBe(AUTH_ERRORS.password)
    expect((await resetPassword('tom.ashby@ostlea.example', 'new-secret-1')).error).toBeNull()
    signOut()
    expect((await signIn('tom.ashby@ostlea.example', 'sandbox', false)).error).toBe(AUTH_ERRORS.mismatch)
    expect((await signIn('tom.ashby@ostlea.example', 'new-secret-1', false)).error).toBeNull()
  })

  it('an invite link signs a new person straight into the organisation', async () => {
    await signIn('isla.brennan@lanternquay.example', 'sandbox', false)
    const inv = act.createInvite('ruth@lanternquay.example')
    expect(inv.ok).toBe(true)
    signOut()
    const r = await acceptInvite(inv.value!, { name: 'Ruth Calder', password: 'approvals1' })
    expect(r.error).toBeNull()
    const id = getSessionUserId()!
    expect(getData().users[id].orgId).toBe(ORG_IDS.lantern)
    expect(roleOfUser(getData(), id)).toBe('client')
  })
})

describe('the store', () => {
  it('runs actions as the signed-in person, persists, and undoes', async () => {
    expect(act.saveToProject('L-9F4CQQ', MERROWGATE_ID).error).toBe(ERRORS.signedOut)
    await signIn('priya.nair@studiooriel.example', 'sandbox', false)
    const before = getData()
    const r = act.saveToProject('L-9F4CQQ', MERROWGATE_ID)
    expect(r.ok).toBe(true)
    expect(projectWishlist(getData().world, MERROWGATE_ID)!.items.some((x) => x.publicId === 'L-9F4CQQ')).toBe(true)
    const stored = JSON.parse(readKey('local', STATE_KEY)!)
    expect(stored.version).toBe(STATE_VERSION)
    expect(stored.state.world.wishlists.wl_hp23zk.items.some((x: { publicId: string }) => x.publicId === 'L-9F4CQQ')).toBe(true)
    expect(Object.keys(stored.state)).not.toContain('run')
    r.undo()
    expect(getData().world).toBe(before.world)
    const failed = act.saveToProject('L-DAXNV3', MERROWGATE_ID)
    expect(failed.ok).toBe(false)
    expect(failed.error).toBe('This listing is not available.')
  })

  it('an undo never throws away later changes', async () => {
    await signIn('priya.nair@studiooriel.example', 'sandbox', false)
    const first = act.saveToProject('L-9F4CQQ', MERROWGATE_ID)
    act.saveToProject('L-9F4CQQ', null)
    first.undo()
    expect(projectWishlist(getData().world, MERROWGATE_ID)!.items.some((x) => x.publicId === 'L-9F4CQQ')).toBe(true)
  })

  it('reset restores the sample sandbox and signs out people who no longer exist', async () => {
    await signUp({ name: 'Jo Park', email: 'jo@parkstudio.example', password: 'drawings1', orgName: 'Park Studio', orgType: 'Architect' })
    expect(getSessionUserId()).not.toBeNull()
    await useApp.getState().resetSandbox()
    expect(getSessionUserId()).toBeNull()
    expect(Object.keys(getData().users)).toHaveLength(5)
    expect(getData().seededOn).toBe('2026-10-08')
  })

  it('a stored state from another version starts a fresh sandbox', async () => {
    useApp.setState({ seededOn: 'stale', users: {} })
    writeKey('local', STATE_KEY, JSON.stringify({ state: { version: 0, world: {} }, version: 0 }))
    await useApp.persist.rehydrate()
    expect(getData().version).toBe(STATE_VERSION)
    expect(getData().seededOn).toBe('2026-10-08')
    expect(Object.keys(getData().users)).toHaveLength(5)
    // A damaged record leaves the running sandbox as it is.
    writeKey('local', STATE_KEY, '{ not json')
    await expect(useApp.persist.rehydrate()).resolves.toBeUndefined()
    expect(Object.keys(getData().users)).toHaveLength(5)
  })
})
