// The left rail: sections, folders that open and close, and nested links (brief/09-V1-PRODUCT.md sections 4 and 6.3).
// The folder holding the active screen is open; a version 2 entry is greyed with a "V2" tag but still opens its panel.
import { useState } from 'react'
import { Link } from 'react-router'
import { activeLeaf, holdsActive, type NavItem, type NavSection } from '../../app/nav'
import { Folder, FolderOpen } from '../v1'
import { cx } from '../ui'

type Ctx = { active: NavItem | null; isOpen: (item: NavItem, onlyFolder: boolean) => boolean; toggle: (item: NavItem, onlyFolder: boolean) => void; onNavigate?: () => void }

export function FolderNav({ sections, pathname, onNavigate, className }: { sections: NavSection[]; pathname: string; onNavigate?: () => void; className?: string }) {
  const active = activeLeaf(sections, pathname)
  const [toggled, setToggled] = useState<Record<string, boolean>>({})
  const [seenPath, setSeenPath] = useState(pathname)
  // On a route change, forget a manual close of the folders that now hold the active screen, so they open.
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    const next = { ...toggled }
    for (const item of folders(sections.flatMap((s) => s.items))) if (holdsActive(item, active)) delete next[item.testId]
    setToggled(next)
  }
  const ctx: Ctx = {
    active,
    isOpen: (item, onlyFolder) => toggled[item.testId] ?? (holdsActive(item, active) || onlyFolder),
    toggle: (item, onlyFolder) => setToggled((t) => ({ ...t, [item.testId]: !(t[item.testId] ?? (holdsActive(item, active) || onlyFolder)) })),
    onNavigate,
  }
  return (
    <nav aria-label="Workspace" className={cx('flex flex-col gap-5', className)} data-testid="folder-nav">
      {sections.map((s, i) => (
        <div key={s.title ?? 'section-' + i}>
          {s.title ? <h2 className="px-3 pb-1.5 text-xs font-medium tracking-wide text-mill-text">{s.title}</h2> : <div className="mx-3 mb-2 border-t border-rule-soft" aria-hidden="true" />}
          <Items items={s.items} ctx={ctx} depth={0} />
        </div>
      ))}
    </nav>
  )
}

function folders(items: NavItem[]): NavItem[] {
  return items.flatMap((i) => (i.children ? [i, ...folders(i.children)] : []))
}

function Items({ items, ctx, depth }: { items: NavItem[]; ctx: Ctx; depth: number }) {
  const onlyFolder = items.filter((i) => i.children).length === 1
  return (
    <ul className={cx('flex flex-col', depth > 0 && 'ml-[21px] border-l border-rule-soft pl-1.5')}>
      {items.map((item) => (
        <li key={item.testId}>{item.children ? <FolderRow item={item} ctx={ctx} depth={depth} onlyFolder={onlyFolder} /> : <LeafRow item={item} ctx={ctx} />}</li>
      ))}
    </ul>
  )
}

function FolderRow({ item, ctx, depth, onlyFolder }: { item: NavItem; ctx: Ctx; depth: number; onlyFolder: boolean }) {
  const open = ctx.isOpen(item, onlyFolder)
  const current = holdsActive(item, ctx.active)
  const listId = item.testId + '-items'
  return (
    <>
      <button
        type="button"
        className={cx('group flex min-h-[44px] w-full items-center gap-2 rounded-sm px-2 text-left text-sm transition-colors hover:bg-rule-soft', current ? 'font-semibold text-ink' : 'text-ink-soft hover:text-ink')}
        aria-expanded={open}
        aria-controls={listId}
        data-testid={item.testId}
        data-current={current ? 'true' : undefined}
        onClick={() => ctx.toggle(item, onlyFolder)}
      >
        <Chevron open={open} />
        {open ? <FolderOpen size={18} className={cx('shrink-0', current ? 'text-steel' : 'text-mill')} /> : <Folder size={18} className={cx('shrink-0', current ? 'text-steel' : 'text-mill')} />}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
      {open && item.children ? (
        <div id={listId}>
          <Items items={item.children} ctx={ctx} depth={depth + 1} />
        </div>
      ) : null}
    </>
  )
}

function LeafRow({ item, ctx }: { item: NavItem; ctx: Ctx }) {
  const active = ctx.active === item
  return (
    <Link
      to={item.to}
      onClick={ctx.onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-disabled={item.v2 ? 'true' : undefined}
      data-testid={item.testId}
      className={cx(
        'relative flex min-h-[44px] items-center gap-2 rounded-sm px-3 text-sm no-underline transition-colors',
        active ? 'bg-steel-tint font-medium text-ink before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full before:bg-steel' : item.v2 ? 'text-mill-text hover:bg-rule-soft' : 'text-ink-soft hover:bg-rule-soft hover:text-ink',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.v2 ? (
        <span className="shrink-0 rounded-sm border border-rule px-1 font-display text-xs leading-tight tracking-wide text-mill-text" data-testid={item.testId + '-v2'}>
          V2
        </span>
      ) : null}
    </Link>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false" className={cx('shrink-0 text-mill transition-transform', open && 'rotate-90')}>
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
