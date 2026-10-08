// The sidebar: the organisation at the top, the role's sections with projects (or clients and buildings) as
// folders that expand, count badges, then Help and Settings. Collapses to icons; below 1024 px it is a drawer.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ChevronRight, ChevronsUpDown, Folder, FolderOpen, LogOut, Settings, UserPlus } from 'lucide-react'
import type { NavItem, NavModel } from '../store/selectors/nav'
import { isActive, NAV_ICONS } from './navIcons'
import { useSignOut } from './useSignOut'
import { Avatar, cx, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip } from '../ui'

function containsActive(pathname: string, item: NavItem): boolean {
  const path = item.href.split('?')[0]
  return pathname === path || pathname.startsWith(path + '/') || item.children.some((c) => containsActive(pathname, c))
}

const rowBase =
  'group/row relative flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-base outline-none transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 max-lg:h-10'
const rowIdle = 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
const rowActive = 'bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(28_25_23/0.06),0_0_0_1px_rgb(28_25_23/0.06)]'

function Count({ n, active }: { n: number; active?: boolean }) {
  return <span className={cx('ml-auto inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums', active ? 'bg-brand-600 text-white' : 'bg-brand-600/90 text-white')}>{n}</span>
}

function Soon() {
  return <span className="ml-auto inline-flex h-[18px] shrink-0 items-center rounded-full bg-subtle px-1.5 text-[11px] font-medium text-muted ring-1 ring-inset ring-line">Soon</span>
}

type RowProps = { item: NavItem; depth: number; parentHref: string | null; expanded: Set<string>; toggle: (id: string) => void; onNavigate?: () => void }

function NavRow({ item, depth, parentHref, expanded, toggle, onNavigate }: RowProps) {
  const { pathname, search } = useLocation()
  const hasChildren = item.children.length > 0
  const open = hasChildren && expanded.has(item.id)
  const active = !hasChildren && isActive(pathname, item.href, parentHref, search)
  const inside = hasChildren && containsActive(pathname, item)
  const Icon = item.icon ? (hasChildren && open && item.icon === 'Folder' ? FolderOpen : NAV_ICONS[item.icon]) : null
  const folderExact = hasChildren && pathname === item.href.split('?')[0]
  return (
    <li>
      <div className="relative flex items-center">
        <Link
          to={item.href}
          onClick={() => {
            if (hasChildren && !open) toggle(item.id)
            onNavigate?.()
          }}
          aria-current={active || folderExact ? 'page' : undefined}
          data-testid={`nav-${item.id}`}
          className={cx(rowBase, active ? rowActive : rowIdle, inside && !active && 'text-ink', hasChildren && 'pr-8', item.soon && 'text-muted')}
          style={depth > 0 && !Icon ? { paddingLeft: 10 } : undefined}
        >
          {Icon ? <Icon aria-hidden="true" className={cx('size-4 shrink-0', active || inside ? 'text-ink' : 'text-muted group-hover/row:text-ink-soft')} /> : null}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.soon ? <Soon /> : item.badge ? <Count n={item.badge} active={active} /> : null}
        </Link>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(item.id)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
            className="absolute right-1 inline-flex size-6 items-center justify-center rounded text-faint transition-colors hover:bg-black/[0.05] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-600 max-lg:size-9"
          >
            <ChevronRight aria-hidden="true" className={cx('size-3.5 transition-transform duration-150', open && 'rotate-90')} />
          </button>
        ) : null}
      </div>
      {hasChildren && open ? (
        <ul className="relative m-0 mb-1 ml-[17px] mt-0.5 list-none border-l border-line p-0 pl-2">
          {item.children.map((c) => (
            <NavRow key={c.id} item={c} depth={depth + 1} parentHref={item.href} expanded={expanded} toggle={toggle} onNavigate={onNavigate} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/** The icon-only rail: top-level items with tooltips. */
function RailRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { pathname, search } = useLocation()
  const active = item.children.length > 0 ? containsActive(pathname, item) : isActive(pathname, item.href, null, search)
  const Icon = item.icon ? NAV_ICONS[item.icon] : Folder
  return (
    <li>
      <Tooltip content={item.label} side="right">
        <Link
          to={item.href}
          onClick={onNavigate}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
          data-testid={`nav-${item.id}`}
          className={cx('relative mx-auto flex size-9 items-center justify-center rounded-md outline-none transition-colors focus-visible:outline-2 focus-visible:outline-brand-600', active ? rowActive : 'text-muted hover:bg-black/[0.04] hover:text-ink')}
        >
          <Icon aria-hidden="true" className="size-[18px]" />
          {item.badge ? <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-brand-600 ring-2 ring-subtle" /> : null}
        </Link>
      </Tooltip>
    </li>
  )
}

function OrgSwitcher({ nav, collapsed }: { nav: NavModel; collapsed: boolean }) {
  const navigate = useNavigate()
  const signOutNow = useSignOut()
  const trigger = (
    <DropdownMenuTrigger
      data-testid="org-switcher"
      className={cx(
        'flex min-w-0 items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:bg-black/[0.04] focus-visible:outline-2 focus-visible:outline-brand-600 data-[state=open]:bg-black/[0.05]',
        collapsed ? 'mx-auto size-10 justify-center' : 'h-11 w-full px-2',
      )}
      aria-label={`${nav.org.name}, ${nav.org.typeLabel}. Organisation menu`}
    >
      <Avatar name={nav.org.name} shape="square" size="md" decorative className="shadow-xs" />
      {collapsed ? null : (
        <>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-base font-semibold text-ink">{nav.org.name}</span>
            <span className="truncate text-xs text-muted">{nav.org.typeLabel}</span>
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-faint" />
        </>
      )}
    </DropdownMenuTrigger>
  )
  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organisation</DropdownMenuLabel>
        <div className="flex items-center gap-2.5 px-2 pb-2 pt-0.5">
          <Avatar name={nav.org.name} shape="square" size="md" decorative />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{nav.org.name}</div>
            <div className="truncate text-sm text-muted">{nav.org.typeLabel}</div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={Settings} onSelect={() => navigate('/app/settings/organisation')}>
          Organisation settings
        </DropdownMenuItem>
        <DropdownMenuItem icon={UserPlus} onSelect={() => navigate('/app/settings/team')}>
          Invite people
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={LogOut}
          onSelect={signOutNow}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function folderIds(items: NavItem[], pathname: string, out: string[] = []): string[] {
  for (const it of items) {
    if (it.children.length > 0 && containsActive(pathname, it)) {
      out.push(it.id)
      folderIds(it.children, pathname, out)
    }
  }
  return out
}

const EXPANDED_KEY = 'tallyard-platform-v1-nav-open'

/** Section titles that open the full list. */
const SECTION_LISTS: Record<string, string> = { projects: '/app/projects', buildings: '/app/buildings' }

function readExpanded(): Set<string> {
  try {
    const raw = sessionStorage.getItem(EXPANDED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function Sidebar({ nav, collapsed = false, onNavigate, footerExtra }: { nav: NavModel; collapsed?: boolean; onNavigate?: () => void; footerExtra?: ReactNode }) {
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = readExpanded()
    for (const id of folderIds(nav.sections.flatMap((x) => x.items), pathname)) s.add(id)
    return s
  })

  // Opening a page inside a folder opens the folder.
  const [seenPath, setSeenPath] = useState(pathname)
  if (seenPath !== pathname) {
    setSeenPath(pathname)
    const ids = folderIds(nav.sections.flatMap((x) => x.items), pathname)
    if (ids.some((id) => !expanded.has(id))) setExpanded(new Set([...expanded, ...ids]))
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(EXPANDED_KEY, JSON.stringify([...expanded]))
    } catch {
      // storage blocked: the folders simply start closed next time
    }
  }, [expanded])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="sidebar">
      <div className={cx('flex shrink-0 items-center', collapsed ? 'h-14 justify-center' : 'h-14 px-2')}>
        <OrgSwitcher nav={nav} collapsed={collapsed} />
      </div>
      <nav aria-label="Workspace" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4 pt-2 scrollbar-none">
        {nav.sections.map((section, i) => (
          <div key={section.id} className={cx(i > 0 && (collapsed ? 'mt-3 border-t border-line pt-3' : 'mt-5'))}>
            {section.title && !collapsed ? (
              SECTION_LISTS[section.id] ? (
                <Link
                  to={SECTION_LISTS[section.id]}
                  onClick={onNavigate}
                  aria-current={pathname === SECTION_LISTS[section.id] ? 'page' : undefined}
                  className={cx('group/title mb-1 flex h-6 items-center justify-between rounded px-2 text-xs font-medium outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600 max-lg:h-9', pathname === SECTION_LISTS[section.id] ? 'text-ink' : 'text-muted')}
                >
                  {section.title}
                  <span className="text-[11px] font-normal text-faint opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100">View all</span>
                </Link>
              ) : (
                <div className="mb-1 flex h-6 items-center px-2 text-xs font-medium text-muted">{section.title}</div>
              )
            ) : null}
            <ul className="m-0 flex list-none flex-col gap-px p-0">
              {section.items.map((item) =>
                collapsed ? <RailRow key={item.id} item={item} onNavigate={onNavigate} /> : <NavRow key={item.id} item={item} depth={0} parentHref={null} expanded={expanded} toggle={toggle} onNavigate={onNavigate} />,
              )}
            </ul>
          </div>
        ))}
      </nav>
      <div className={cx('shrink-0 border-t border-line px-2 py-2')}>
        {footerExtra}
        <ul className="m-0 flex list-none flex-col gap-px p-0">
          {nav.footer.map((item) => (collapsed ? <RailRow key={item.id} item={item} onNavigate={onNavigate} /> : <NavRow key={item.id} item={item} depth={0} parentHref={null} expanded={expanded} toggle={toggle} onNavigate={onNavigate} />))}
        </ul>
      </div>
    </div>
  )
}
