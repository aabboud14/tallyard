// Icons for the sidebar's nav items, and which item is the current page.
import type { LucideIcon } from 'lucide-react'
import { Bell, Bookmark, Building2, CircleHelp, Compass, FileText, Folder, FolderPlus, House, Inbox, Plus, Recycle, Settings, Users } from 'lucide-react'
import type { NavIcon } from '../store/selectors/nav'

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  House,
  Compass,
  Bookmark,
  Folder,
  FolderPlus,
  Building2,
  Inbox,
  Users,
  Recycle,
  CircleHelp,
  Settings,
  Plus,
  Bell,
  FileText,
}

/**
 * Whether a nav item is the current page. A child that shares its folder's address is current only on it exactly.
 * An item whose address carries a query (an action such as "Add building") is current only with that same query.
 */
export function isActive(pathname: string, href: string, parentHref: string | null, search = ''): boolean {
  const [path, query] = href.split('?')
  if (query !== undefined) return pathname === path && new URLSearchParams(search).toString() === new URLSearchParams(query).toString()
  if (pathname === path) return true
  if (path === parentHref || path === '/app/home') return false
  return pathname.startsWith(path + '/')
}
