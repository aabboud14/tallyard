// @vitest-environment jsdom
// The store and an older build in the same browser: a version 1 sandbox found when the app loads is replaced and
// recorded for the notice; a storage event from another tab is read only when it carries this version, so a tab
// of the old build open beside the new one never reseeds it or throws away its work.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const V1 = 'tallyard-platform-v1-state'
const V2 = 'tallyard-platform-v2-state'
const v1Record = JSON.stringify({ state: { version: 1, seededOn: '2026-10-14', world: { projects: {} }, users: {} }, version: 1 })

// vi.resetModules gives every test a fresh copy of the store and of the one clock it reads, so the clock is pinned
// on the copy the test's own imports load, never on one imported once at the top of the file.
beforeEach(async () => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.resetModules()
  const clock = await import('../sandbox/clock')
  clock.setClockForTests('2026-10-16T08:00:00.000Z')
})
afterAll(async () => {
  const clock = await import('../sandbox/clock')
  clock.setClockForTests(null)
})

describe('loading the app over an older sandbox', () => {
  it('replaces a version 1 sandbox, removes the old key and records the upgrade for the notice', async () => {
    window.localStorage.setItem(V1, v1Record)
    const { useApp, getData, STATE_VERSION } = await import('./app')
    await useApp.persist.rehydrate()
    const { upgradeNoticeShown } = await import('./upgrade')
    expect(window.localStorage.getItem(V1)).toBeNull()
    expect(window.localStorage.getItem('tallyard-platform-v2-upgraded')).toBe('2026-10-16')
    expect(upgradeNoticeShown()).toBe(true)
    expect(getData().version).toBe(STATE_VERSION)
    expect(Object.keys(getData().users)).toHaveLength(5)
    expect(getData().seededOn).toBe('2026-10-16')
  })

  it('a first visit shows no notice', async () => {
    await import('./app')
    const { upgradeNoticeShown } = await import('./upgrade')
    expect(upgradeNoticeShown()).toBe(false)
  })

  it('Reset forgets the upgrade', async () => {
    window.localStorage.setItem(V1, v1Record)
    const { useApp } = await import('./app')
    const { wasUpgraded } = await import('./upgrade')
    expect(wasUpgraded()).toBe(true)
    await useApp.getState().resetSandbox()
    expect(wasUpgraded()).toBe(false)
  })
})

describe('storage events from other tabs', () => {
  it('a version 1 write, on the old key or on this key, changes nothing here', async () => {
    const { useApp, getData, onStorageEvent } = await import('./app')
    await useApp.persist.rehydrate()
    useApp.getState().setUi({ sidebarCollapsed: true })
    const before = getData()
    // An old tab writes its own key: not this build's.
    window.localStorage.setItem(V1, v1Record)
    onStorageEvent({ key: V1, newValue: v1Record })
    // A version 1 record on this key (from any source) is not read either, so this tab never reseeds over it.
    onStorageEvent({ key: V2, newValue: v1Record })
    onStorageEvent({ key: V2, newValue: null })
    onStorageEvent({ key: V2, newValue: '{ not json' })
    await new Promise((r) => setTimeout(r, 0))
    expect(getData()).toEqual(before)
    expect(getData().ui.sidebarCollapsed).toBe(true)
    // Nothing was written back over the other tab's key.
    expect(window.localStorage.getItem(V1)).toBe(v1Record)
  })

  it('a write of this version from another tab is picked up', async () => {
    const { useApp, getData, onStorageEvent, STATE_VERSION } = await import('./app')
    await useApp.persist.rehydrate()
    const data = getData()
    expect(data.ui.sidebarCollapsed).toBe(false)
    const raw = JSON.stringify({ state: { ...data, ui: { ...data.ui, sidebarCollapsed: true } }, version: STATE_VERSION })
    window.localStorage.setItem(V2, raw)
    onStorageEvent({ key: V2, newValue: raw })
    await vi.waitFor(() => expect(getData().ui.sidebarCollapsed).toBe(true))
  })
})
