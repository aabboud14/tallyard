// The signed-in frame: the sidebar (a drawer below 1024 px), the top bar, the page in an inset panel, the command
// palette and a thin progress line while a page loads. Sets the tab title from where the person is.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { Outlet, useLocation, useNavigation, useNavigationType } from 'react-router'
import { PRODUCT_NAME } from '../domain/constants'
import { useApp, useView } from '../store'
import { navModel } from '../store/selectors/nav'
import { pageLocation } from '../store/selectors/arch-breadcrumbs'
import { DISCOVER_PARAM } from '../store/selectors/arch-discover'
import { cx, Logo, SandboxBadge, Sheet } from '../ui'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SearchPalette } from './SearchPalette'
import { AccessGate } from './guards'
import { useHotkey } from './hotkeys'
import { scrollMemory, scrollPlan } from './scrollMemory'
import './shell.css'

function NavProgress() {
  const navigation = useNavigation()
  if (navigation.state === 'idle') return null
  return (
    <div role="progressbar" aria-label="Loading page" className="pointer-events-none absolute inset-x-0 top-0 z-40 h-0.5 overflow-hidden">
      <div className="shell-progress h-full w-full bg-brand-600" />
    </div>
  )
}

/** The page scroller: the inset panel on a wide screen, the window on a narrow one. */
function scrollerTop(node: HTMLElement | null): number {
  return node && node.scrollHeight > node.clientHeight + 1 ? node.scrollTop : window.scrollY
}

function scrollPageTo(node: HTMLElement | null, top: number) {
  if (node && typeof node.scrollTo === 'function') node.scrollTo({ top })
  else if (node) node.scrollTop = top
  try {
    window.scrollTo({ top })
  } catch {
    // no window scrolling here (tests)
  }
}

/** Applies scrollPlan on each navigation (see scrollMemory.ts) and remembers each entry's position as it scrolls. */
function useScrollMemory(el: RefObject<HTMLElement | null>) {
  const location = useLocation()
  const type = useNavigationType()
  const active = useRef<{ key: string; pathname: string; search: string } | null>(null)

  // Positions are recorded as the person scrolls, so leaving a page keeps where they were on it, not where the
  // next page's shorter content clamped the scroller.
  useEffect(() => {
    const node = el.current
    const onScroll = () => {
      if (active.current) scrollMemory.record(active.current.key, scrollerTop(node))
    }
    node?.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      node?.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [el])

  useLayoutEffect(() => {
    const prev = active.current
    const node = el.current
    const plan = scrollPlan({ type, prev, next: { pathname: location.pathname, search: location.search, hash: location.hash }, saved: scrollMemory.saved(location.key) })
    // A replaced entry carries the position of the one it replaces.
    if (prev && type === 'REPLACE' && scrollMemory.saved(location.key) === undefined) scrollMemory.record(location.key, scrollMemory.saved(prev.key) ?? scrollerTop(node))
    active.current = { key: location.key, pathname: location.pathname, search: location.search }
    scrollMemory.planned(location.key, plan)
    if (plan.kind === 'keep') return
    let frame = 0
    let tries = 0
    const apply = () => {
      if (plan.kind === 'hash') {
        // A link to a section (for example #statement) lands on it. A page still loading scrolls there itself once ready.
        const target = document.getElementById(plan.id)
        if (target) {
          target.scrollIntoView({ block: 'start' })
          return
        }
        scrollPageTo(node, 0)
        return
      }
      const top = plan.kind === 'restore' ? plan.top : 0
      scrollPageTo(node, top)
      // Back to a long page: its content may still be filling in, so try again for a few frames until it fits.
      if (plan.kind === 'restore' && Math.abs(scrollerTop(node) - top) > 1 && tries++ < 20) frame = requestAnimationFrame(apply)
    }
    frame = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.pathname, location.search, location.hash, type, el])
}

export function AppShell() {
  const nav = useView(navModel)
  const location = useLocation()
  const where = useView(pageLocation, location.pathname, new URLSearchParams(location.search).get(DISCOVER_PARAM.projectId))
  const collapsed = useApp((s) => s.ui.sidebarCollapsed)
  const setUi = useApp((s) => s.setUi)
  const [drawer, setDrawer] = useState(false)
  const [palette, setPalette] = useState(false)
  const main = useRef<HTMLElement>(null)
  useScrollMemory(main)

  useHotkey(
    'k',
    (e) => {
      e.preventDefault()
      setPalette((o) => !o)
    },
    { mod: true },
  )
  useHotkey('[', () => setUi({ sidebarCollapsed: !collapsed }))

  useEffect(() => {
    if (where) document.title = `${where.title} · ${PRODUCT_NAME}`
  }, [where])

  if (!nav) return null
  const toggle = () => setUi({ sidebarCollapsed: !collapsed })

  return (
    <div className="min-h-dvh bg-canvas lg:flex lg:h-dvh lg:overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white" data-testid="app-shell" data-role={nav.role}>
      <a href="#main" className="sr-only z-[100] rounded-md bg-ink px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <aside aria-label="Sidebar" className={cx('hidden shrink-0 transition-[width] duration-200 ease-out lg:block print:hidden', collapsed ? 'w-[60px]' : 'w-[252px]')}>
        <Sidebar nav={nav} collapsed={collapsed} />
      </aside>
      <Sheet
        open={drawer}
        onOpenChange={setDrawer}
        side="left"
        title={<Logo size="sm" />}
        testId="nav-drawer"
        bodyClassName="p-0! bg-canvas"
      >
        <Sidebar
          nav={nav}
          onNavigate={() => setDrawer(false)}
          footerExtra={
            <div className="mb-2 px-2 sm:hidden">
              <SandboxBadge />
            </div>
          }
        />
      </Sheet>
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:min-h-0 lg:py-2 lg:pr-2 print:p-0">
        <div className="relative flex min-w-0 flex-1 flex-col bg-surface lg:min-h-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-line lg:shadow-[0_1px_3px_rgb(28_25_23/0.05)] print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
          <NavProgress />
          <TopBar nav={nav} crumbs={where?.crumbs ?? []} collapsed={collapsed} onToggleCollapsed={toggle} onOpenMenu={() => setDrawer(true)} onOpenSearch={() => setPalette(true)} />
          <main id="main" ref={main} tabIndex={-1} className="min-w-0 flex-1 outline-none lg:overflow-y-auto lg:overscroll-contain print:overflow-visible">
            <AccessGate>
              <Outlet />
            </AccessGate>
          </main>
        </div>
      </div>
      <SearchPalette open={palette} onOpenChange={setPalette} />
    </div>
  )
}
