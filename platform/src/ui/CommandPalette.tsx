// Command palette (presentational). The caller supplies groups of items and opens it with Cmd or Ctrl K.
// Typing filters; Up and Down move; Enter opens; Escape closes. A combobox with a listbox, so screen readers
// hear the active option.
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Dialog as D } from 'radix-ui'
import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowUp, CornerDownLeft, Search } from 'lucide-react'
import { Kbd } from './Kbd'

export type CommandItem = {
  id: string
  label: string
  /** Secondary text after the label, for example the project or the typology. */
  hint?: string
  icon?: LucideIcon
  /** A small visual in place of the icon, for example a material thumbnail or an avatar. */
  visual?: ReactNode
  keywords?: string[]
  /** Keys shown at the end of the row. */
  shortcut?: string[]
  onSelect: () => void
}

export type CommandGroup = { heading: string; items: CommandItem[] }

export type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandGroup[]
  /** Controlled query. Leave out to let the palette hold it. */
  query?: string
  onQueryChange?: (q: string) => void
  /** Filter items by the query (label, hint, keywords). Turn off when the caller filters. */
  filter?: boolean
  placeholder?: string
  emptyText?: string
}

function matches(item: CommandItem, q: string): boolean {
  if (!q) return true
  const hay = [item.label, item.hint ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

export function CommandPalette({ open, onOpenChange, groups, query, onQueryChange, filter = true, placeholder = 'Search materials, projects, buildings and pages', emptyText = 'No results. Try a different word.' }: CommandPaletteProps) {
  const [own, setOwn] = useState('')
  const [active, setActive] = useState(0)
  const q = query ?? own
  const setQ = (v: string) => {
    if (query === undefined) setOwn(v)
    onQueryChange?.(v)
    setActive(0)
  }
  const uid = useId().replace(/:/g, '')
  const listId = `cmd-list-${uid}`

  const visible = useMemo(() => groups.map((g) => ({ ...g, items: filter ? g.items.filter((it) => matches(it, q)) : g.items })).filter((g) => g.items.length > 0), [groups, q, filter])
  const flat = useMemo(() => visible.flatMap((g) => g.items), [visible])
  const activeIndex = flat.length === 0 ? -1 : Math.min(active, flat.length - 1)
  const activeItem = activeIndex >= 0 ? flat[activeIndex] : undefined
  const optionId = (id: string) => `cmd-opt-${uid}-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const activeId = activeItem ? optionId(activeItem.id) : undefined

  // Keep the active option in view as the keyboard moves through a long list.
  useEffect(() => {
    if (!activeId) return
    const el = document.getElementById(activeId)
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  function choose(item: CommandItem) {
    onOpenChange(false)
    setActive(0)
    if (query === undefined) setOwn('')
    item.onSelect()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (flat.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((activeIndex + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((activeIndex - 1 + flat.length) % flat.length)
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End' && e.ctrlKey) {
      e.preventDefault()
      setActive(flat.length - 1)
    } else if (e.key === 'Enter' && activeItem) {
      e.preventDefault()
      choose(activeItem)
    }
  }

  return (
    <D.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        setActive(0)
        if (!o && query === undefined) setOwn('')
      }}
    >
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[rgb(28_25_23/0.28)] backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <D.Content
          aria-describedby={undefined}
          data-testid="command-palette"
          className="fixed left-1/2 top-[max(12px,12vh)] z-50 flex max-h-[min(560px,80dvh)] w-[calc(100vw-24px)] max-w-[640px] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-overlay outline-none data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out"
        >
          <D.Title className="sr-only">Search</D.Title>
          <div className="flex items-center gap-3 border-b border-line-soft px-4">
            <Search aria-hidden="true" className="size-[18px] shrink-0 text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              role="combobox"
              aria-label="Search"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              className="h-14 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-faint max-sm:text-[16px]"
            />
            <Kbd className="max-sm:hidden">Esc</Kbd>
          </div>
          <div id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {visible.length === 0 ? (
              <div className="px-3 py-10 text-center text-base text-muted">{emptyText}</div>
            ) : (
              visible.map((g) => {
                const headingId = `cmd-h-${uid}-${g.heading.replace(/[^a-zA-Z0-9]/g, '')}`
                return (
                  <div key={g.heading} role="group" aria-labelledby={headingId} className="mb-1 last:mb-0">
                    <div id={headingId} className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted">
                      {g.heading}
                    </div>
                    {g.items.map((it) => {
                      const isActive = activeItem?.id === it.id
                      const Icon = it.icon
                      return (
                        <div
                          key={it.id}
                          id={optionId(it.id)}
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive || undefined}
                          onMouseMove={() => {
                            const i = flat.findIndex((f) => f.id === it.id)
                            if (i !== activeIndex) setActive(i)
                          }}
                          onClick={() => choose(it)}
                          className="flex min-h-10 cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 py-1.5 text-base text-ink data-[active]:bg-hover max-sm:min-h-11"
                        >
                          {it.visual ? (
                            <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md">{it.visual}</span>
                          ) : Icon ? (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line-soft bg-surface text-muted">
                              <Icon aria-hidden="true" className="size-4" />
                            </span>
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">
                            {it.label}
                            {it.hint ? <span className="ml-2 text-sm text-muted">{it.hint}</span> : null}
                          </span>
                          {it.shortcut ? (
                            <span className="flex shrink-0 gap-1">
                              {it.shortcut.map((k) => (
                                <Kbd key={k}>{k}</Kbd>
                              ))}
                            </span>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-line-soft bg-page/70 px-4 py-2.5 text-xs text-muted max-sm:hidden">
            <span className="flex items-center gap-1.5">
              <Kbd aria-label="Up">
                <ArrowUp aria-hidden="true" className="size-3" />
              </Kbd>
              <Kbd aria-label="Down">
                <ArrowDown aria-hidden="true" className="size-3" />
              </Kbd>
              to move
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd aria-label="Enter">
                <CornerDownLeft aria-hidden="true" className="size-3" />
              </Kbd>
              to open
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Esc</Kbd>
              to close
            </span>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
