// Keyboard shortcuts for the shell. A shortcut never fires while the person is typing in a field, except the
// palette shortcut with its modifier key.
import { useEffect, useRef } from 'react'

/** True on Apple platforms, where the palette shortcut reads Cmd K. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  const p = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? ''
  return /mac|iphone|ipad|ipod/i.test(p) || /Mac OS X/.test(navigator.userAgent)
}

/** The modifier key for hints: the command symbol on Apple platforms, otherwise "Ctrl". */
export function modKeyLabel(): string {
  return isApplePlatform() ? '⌘' : 'Ctrl'
}

export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable
}

type Options = { mod?: boolean; allowInInputs?: boolean; enabled?: boolean }

/** Calls `handler` when `key` is pressed (with Cmd or Ctrl when `mod`). */
export function useHotkey(key: string, handler: (e: KeyboardEvent) => void, { mod = false, allowInInputs = false, enabled = true }: Options = {}): void {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return
      const modDown = e.metaKey || e.ctrlKey
      if (mod !== modDown) return
      if (e.altKey) return
      if (!mod && !allowInInputs && isTypingTarget(e.target)) return
      ref.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, mod, allowInInputs, enabled])
}
