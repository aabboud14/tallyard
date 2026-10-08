// Media queries in React, for the few places a layout changes component (a popover on desktop, a sheet on a phone).
import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const m = window.matchMedia(query)
      m.addEventListener('change', onChange)
      return () => m.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  )
}

/** Phone width: below Tailwind's sm breakpoint. */
export function usePhone(): boolean {
  return useMediaQuery('(max-width: 639px)')
}
