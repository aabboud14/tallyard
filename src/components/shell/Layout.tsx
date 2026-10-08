// The version 1.0 shell: a calm top bar, the role's folder rail on the left, and the screen.
// At phone width the rail folds into a "Menu" button that opens a sheet. The landing page has no rail.
// The rail sits outside <main>, so the rendered privacy checks on the screen never read it.
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useStore } from '../../store/store'
import { PRODUCT_NAME, DEMO_TODAY } from '../../domain/constants'
import { LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'
import { railFor, roleTitle, trailFor } from '../../app/nav'
import { PersonaSwitcher } from './PersonaSwitcher'
import { DemoScriptPanel } from './DemoScriptPanel'
import { ResetButton } from './ResetButton'
import { FolderNav } from './FolderNav'
import { topControl, topControlActive } from './styles'
import { ErrorBoundary } from '../ErrorBoundary'
import { Menu, Sheet } from '../v1'
import { cx } from '../ui'

export function Layout() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      {isLanding ? (
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10" id="main">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      ) : (
        <Workspace />
      )}
      <footer className="border-t border-rule bg-panel px-4 py-2 text-xs text-mill-text print:hidden">Demo date: {formatDate(DEMO_TODAY)}</footer>
    </div>
  )
}

/** True below 640 px. */
function useIsPhone(): boolean {
  const query = '(max-width: 639px)'
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const m = window.matchMedia?.(query)
    if (!m) return
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

/** On a phone, inside a workspace with a rail, the shared links move into the Menu sheet so the bar stays two rows. */
function useSharedInMenu(): boolean {
  const phone = useIsPhone()
  const location = useLocation()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  return phone && location.pathname !== '/' && railFor(world, personaId).length > 0
}

function SharedNav({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Shared">
      <DemoScriptPanel />
      <TopLink to="/assumptions">Assumptions</TopLink>
      <TopLink to="/about">About</TopLink>
      <ResetButton />
    </nav>
  )
}

function TopBar() {
  const inMenu = useSharedInMenu()
  return (
    <header className="border-b border-rule bg-panel print:hidden">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 lg:flex-nowrap lg:px-6">
        <NavLink to="/" className="inline-flex min-h-[44px] items-center font-display text-2xl leading-none tracking-wide text-ink no-underline lg:min-h-9" data-testid="home-link">
          {PRODUCT_NAME}
        </NavLink>
        <span className="ml-auto rounded-sm border border-rule px-2 py-0.5 text-xs text-mill-text lg:order-last lg:ml-0" data-testid="label-L1">
          {LABELS.L1}
        </span>
        <div className="hidden h-6 border-l border-rule lg:block" aria-hidden="true" />
        <PersonaSwitcher />
        {inMenu ? null : <SharedNav className="-mx-2.5 flex w-full flex-wrap items-center gap-x-1 lg:mx-0 lg:ml-auto lg:w-auto" />}
      </div>
    </header>
  )
}

function TopLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => cx(topControl, isActive && topControlActive)}>
      {children}
    </NavLink>
  )
}

function Workspace() {
  const location = useLocation()
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const persona = world.personas[personaId]
  const org = persona ? world.orgs[persona.orgId] : undefined
  const sections = railFor(world, personaId)
  const trail = trailFor(sections, location.pathname)
  const sharedInMenu = useSharedInMenu()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(location.pathname)
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname)
    setMenuOpen(false)
  }
  const who = persona ? (
    <div className="px-3">
      <div className="truncate text-sm font-semibold text-ink" data-testid="rail-persona">
        {persona.name}
      </div>
      <div className="break-words text-xs text-mill-text" data-testid="rail-role">
        {org?.name}, {roleTitle(world, personaId)}
      </div>
    </div>
  ) : null
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {sections.length ? (
        <>
          <aside className="hidden w-64 shrink-0 border-r border-rule bg-panel lg:block print:hidden" aria-label="Workspace rail" data-testid="rail">
            <div className="sticky top-0 flex max-h-screen flex-col gap-5 overflow-y-auto px-2 py-4">
              {who}
              <FolderNav sections={sections} pathname={location.pathname} />
            </div>
          </aside>
          <div className="flex items-center gap-3 border-b border-rule bg-panel px-4 py-1 lg:hidden print:hidden">
            <button type="button" className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-sm border border-rule px-3 text-sm font-medium text-ink hover:bg-steel-tint" onClick={() => setMenuOpen(true)} data-testid="open-rail" aria-haspopup="dialog">
              <Menu />
              Menu
            </button>
            {trail.length ? (
              <span className="min-w-0 truncate text-sm text-mill-text" data-testid="rail-trail">
                {trail.join(', ')}
              </span>
            ) : null}
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen} title="Menu" testId="rail-sheet">
            <div className="-mx-2 flex flex-col gap-5">
              {who}
              <FolderNav sections={sections} pathname={location.pathname} onNavigate={() => setMenuOpen(false)} />
              {sharedInMenu ? <SharedNav className="flex flex-col items-start gap-1 border-t border-rule-soft px-1 pt-3" /> : null}
            </div>
          </Sheet>
        </>
      ) : null}
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6" id="main">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
