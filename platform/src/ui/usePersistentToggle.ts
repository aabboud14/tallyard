// Whether a panel is open, remembered per panel id in this browser. A per-viewer convenience, so it lives in
// browser storage under one key (a JSON map of id to open), never in the shared store. Every read and write is
// wrapped in try and catch: with storage blocked or full, the state is kept in memory for this session.
import { useCallback, useState } from 'react'

export const PANELS_STORAGE_KEY = 'tallyard-platform-v1-panels'

/** Fallback for this page when browser storage cannot be used. */
const memory = new Map<string, boolean>()

function readAll(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(PANELS_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) if (typeof v === 'boolean') out[k] = v
    return out
  } catch {
    return {}
  }
}

export function readPanel(id: string, fallback: boolean): boolean {
  const all = readAll()
  if (id in all) return all[id]
  return memory.get(id) ?? fallback
}

export function writePanel(id: string, open: boolean): void {
  memory.set(id, open)
  try {
    const all = readAll()
    all[id] = open
    window.localStorage.setItem(PANELS_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage is blocked or full: the in-memory value above keeps the panel as the person left it.
  }
}

/** [open, setOpen, toggle] for a panel id, starting from what this browser remembers or `defaultOpen`. */
export function usePersistentToggle(id: string, defaultOpen = false): [boolean, (open: boolean) => void, () => void] {
  const [open, setOpenState] = useState(() => readPanel(id, defaultOpen))
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      writePanel(id, next)
    },
    [id],
  )
  const toggle = useCallback(() => setOpen(!open), [setOpen, open])
  return [open, setOpen, toggle]
}
