// The sidebar's project menu: the order of the project folders (by name, under each client, or by recent activity)
// and a filter to one client. The choice is kept per person in the store (ui.navProjects); the arranging itself is
// the pure arrangeNavProjects, so this only shows the choice and passes it on.
import { ListFilter, X } from 'lucide-react'
import type { NavProjectOrder } from '../../store/types'
import type { NavProjectTools } from '../../store/selectors/nav'
import { useApp } from '../../store/app'
import { cx, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip } from '../../ui'

const ORDERS: { value: NavProjectOrder; label: string }[] = [
  { value: 'name', label: 'Name, A to Z' },
  { value: 'client', label: 'Client' },
  { value: 'recent', label: 'Recent activity' },
]

const ALL = 'all'

function isOrder(v: string): v is NavProjectOrder {
  return ORDERS.some((o) => o.value === v)
}

/** The menu button beside the Projects title. Shown only with two or more projects. */
export function ProjectsMenu({ tools }: { tools: NavProjectTools }) {
  const setView = useApp((s) => s.setNavProjectView)
  if (tools.total < 2) return null
  const filtered = tools.view.clientOrgId !== null
  const ordered = tools.view.order !== 'name'
  return (
    <DropdownMenu>
      <Tooltip content="Sort and filter projects" side="right">
        <DropdownMenuTrigger
          data-testid="nav-projects-menu"
          aria-label="Sort and filter projects"
          className={cx(
            'relative inline-flex size-6 shrink-0 items-center justify-center rounded text-faint outline-none transition-colors hover:bg-black/[0.05] hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-600 data-[state=open]:bg-black/[0.06] data-[state=open]:text-ink max-lg:size-11',
            (filtered || ordered) && 'text-ink-soft',
          )}
        >
          <ListFilter aria-hidden="true" className="size-3.5 max-lg:size-4" />
          {filtered || ordered ? <span aria-hidden="true" className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-brand-600 max-lg:right-2.5 max-lg:top-2.5" /> : null}
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="start" side="bottom" className="w-60">
        <DropdownMenuLabel>Order</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={tools.view.order} onValueChange={(v) => (isOrder(v) ? setView({ order: v }) : undefined)}>
          {ORDERS.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} data-testid={`nav-order-${o.value}`}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {tools.clients.length >= 2 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Client</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={tools.view.clientOrgId ?? ALL} onValueChange={(v) => setView({ clientOrgId: v === ALL ? null : v })}>
              <DropdownMenuRadioItem value={ALL} data-testid="nav-client-all">
                All clients
              </DropdownMenuRadioItem>
              {tools.clients.map((c) => (
                <DropdownMenuRadioItem key={c.orgId} value={c.orgId} data-testid={`nav-client-${c.orgId}`}>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="ml-auto pl-3 text-xs tabular-nums text-faint">{c.count}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The chip under the Projects title while a client filter is on: the client, a clear button and what is hidden. */
export function ClientFilterChip({ tools }: { tools: NavProjectTools }) {
  const setView = useApp((s) => s.setNavProjectView)
  const client = tools.view.clientOrgId === null ? null : tools.clients.find((c) => c.orgId === tools.view.clientOrgId)
  if (!client) return null
  return (
    <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-2" data-testid="nav-client-filter">
      <span className="inline-flex h-6 min-w-0 max-w-full items-center gap-1 rounded-[5px] bg-surface pl-2 pr-0.5 text-xs font-medium text-ink ring-1 ring-inset ring-line max-lg:h-11">
        <span className="min-w-0 truncate">{client.name}</span>
        <button
          type="button"
          onClick={() => setView({ clientOrgId: null })}
          aria-label="Show all clients"
          data-testid="nav-client-filter-clear"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted outline-none transition-colors hover:bg-black/[0.06] hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-brand-600 max-lg:size-11"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      </span>
      {tools.hidden > 0 ? <span className="text-2xs text-faint">{tools.hidden} more hidden</span> : null}
    </div>
  )
}
