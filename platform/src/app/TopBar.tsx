// The 56 px bar over every app page: the sidebar control, where you are, search, the sandbox badge, the inbox and
// the account menu.
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import type { NavModel } from '../store/selectors/nav'
import type { AppCrumb } from '../store/selectors/arch-breadcrumbs'
import { Breadcrumbs, IconButton, Kbd, SandboxBadge } from '../ui'
import { NotificationsMenu } from './NotificationsMenu'
import { AccountMenu } from './AccountMenu'
import { modKeyLabel } from './hotkeys'

type Props = {
  nav: NavModel
  crumbs: AppCrumb[]
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenMenu: () => void
  onOpenSearch: () => void
}

export function TopBar({ nav, crumbs, collapsed, onToggleCollapsed, onOpenMenu, onOpenSearch }: Props) {
  const navigate = useNavigate()
  // The badge is a plain link in the design system; inside the app it moves without reloading the page.
  const onBadgeClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a')
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    navigate('/app/settings/sandbox')
  }
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-line-soft bg-surface/95 px-2 backdrop-blur-md supports-[backdrop-filter]:bg-surface/85 sm:px-3 lg:static lg:bg-surface lg:px-3 print:hidden" data-testid="top-bar">
      <IconButton icon={Menu} label="Open menu" className="lg:hidden" onClick={onOpenMenu} data-testid="open-menu" />
      <IconButton icon={collapsed ? PanelLeftOpen : PanelLeftClose} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} size="sm" className="text-muted max-lg:hidden" onClick={onToggleCollapsed} data-testid="toggle-sidebar" />
      <span aria-hidden="true" className="mx-1 h-4 w-px bg-line max-lg:hidden" />
      <Breadcrumbs items={crumbs.map((c) => ({ label: c.label, href: c.href ?? undefined }))} className="min-w-0 flex-1 [&_ol]:text-[13.5px]" />
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={onOpenSearch}
          data-testid="search-trigger"
          aria-label="Search"
          aria-keyshortcuts="Meta+K Control+K"
          className="group hidden h-8 w-60 items-center gap-2 rounded-lg border border-line bg-page pl-2.5 pr-1.5 text-sm text-muted shadow-xs transition-colors hover:border-line-strong hover:bg-surface hover:text-ink-soft focus-visible:outline-2 focus-visible:outline-brand-600 md:flex xl:w-72"
        >
          <Search aria-hidden="true" className="size-3.5 text-faint group-hover:text-muted" />
          <span>Search</span>
          <span className="ml-auto flex items-center gap-0.5">
            <Kbd>{modKeyLabel()}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <IconButton icon={Search} label="Search" className="md:hidden" onClick={onOpenSearch} />
        <span onClick={onBadgeClick} className="mx-1 max-sm:hidden">
          <SandboxBadge href="/app/settings/sandbox" />
        </span>
        <NotificationsMenu />
        <span className="ml-0.5">
          <AccountMenu nav={nav} />
        </span>
      </div>
    </header>
  )
}
