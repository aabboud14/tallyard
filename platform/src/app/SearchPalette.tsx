// Global search: Cmd or Ctrl K opens a palette over the pages, projects, buildings and materials the person may
// open. Results come from the search selector; materials show their picture.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { Bell, Bookmark, Building2, CircleHelp, Compass, FileText, Folder, FolderPlus, House, Inbox, Package, Plus, Settings, Tag } from 'lucide-react'
import { useView } from '../store'
import { searchResults } from '../store/selectors/arch-search'
import { CommandPalette, MaterialImage, type CommandGroup } from '../ui'

const PAGE_ICONS: Record<string, LucideIcon> = {
  'page:home': House,
  'page:discover': Compass,
  'page:saved': Bookmark,
  'page:new-project': FolderPlus,
  'page:new-building': Plus,
  'page:requests': Inbox,
  'page:help': CircleHelp,
  'page:settings': Settings,
  'page:notifications': Bell,
}

const KIND_ICONS: Record<string, LucideIcon> = { page: FileText, project: Folder, building: Building2, material: Package, item: Tag }

export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const groups = useView(searchResults, query, 24)
  const commandGroups: CommandGroup[] = useMemo(
    () =>
      (groups ?? []).map((g) => ({
        heading: g.heading,
        items: g.results.map((r) => ({
          id: r.id,
          label: r.label,
          hint: r.sublabel,
          icon: PAGE_ICONS[r.id] ?? KIND_ICONS[r.kind],
          visual: r.thumb ? (
            <span className="block size-7 overflow-hidden rounded-md">
              <MaterialImage spec={r.thumb.spec} publicId={r.thumb.publicId} aspect="fill" />
            </span>
          ) : undefined,
          onSelect: () => navigate(r.href),
        })),
      })),
    [groups, navigate],
  )
  return (
    <CommandPalette
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery('')
      }}
      groups={commandGroups}
      query={query}
      onQueryChange={setQuery}
      filter={false}
      placeholder="Search materials, projects and pages"
      emptyText="Nothing matches that. Try a material, a project or a page."
    />
  )
}
