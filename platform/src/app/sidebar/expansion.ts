// Which sidebar folders are open. A folder the person opens or closes stays that way. A folder opened only because
// the page being shown is inside it (a project's tabs while on that project) closes again once the person moves
// on, so a walk through several projects does not leave every one of them open.

export type Expansion = { open: string[]; auto: string[] }

/** The folders open on arriving at a page whose folders (outermost first) are `active`. */
export function expandFor(prev: Expansion, active: string[]): Expansion {
  const keep = new Set(active)
  const open = prev.open.filter((id) => keep.has(id) || !prev.auto.includes(id))
  const auto = prev.auto.filter((id) => keep.has(id))
  for (const id of active) {
    if (open.includes(id)) continue
    open.push(id)
    auto.push(id)
  }
  return { open, auto }
}

/** The person opens or closes a folder: from then on it is their choice, not an automatic one. */
export function toggleFolder(prev: Expansion, id: string): Expansion {
  const open = prev.open.includes(id) ? prev.open.filter((x) => x !== id) : [...prev.open, id]
  return { open, auto: prev.auto.filter((x) => x !== id) }
}

/** Opens a folder for the page the person is opening (its link was clicked): open until they move on. */
export function revealFolder(prev: Expansion, id: string): Expansion {
  if (prev.open.includes(id)) return prev
  return { open: [...prev.open, id], auto: [...prev.auto, id] }
}

/** Reads a stored value: the current shape, or the older plain list of open folders (all kept as chosen). */
export function parseExpansion(raw: string | null): Expansion {
  if (!raw) return { open: [], auto: [] }
  try {
    const v: unknown = JSON.parse(raw)
    if (Array.isArray(v)) return { open: v.filter((x): x is string => typeof x === 'string'), auto: [] }
    if (v && typeof v === 'object') {
      const o = v as { open?: unknown; auto?: unknown }
      const list = (x: unknown) => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : [])
      const open = list(o.open)
      return { open, auto: list(o.auto).filter((id) => open.includes(id)) }
    }
  } catch {
    // a damaged value: start closed
  }
  return { open: [], auto: [] }
}
